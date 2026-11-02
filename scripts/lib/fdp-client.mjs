/**
 * Minimal HTTPS client for the DILG Full Disclosure Policy Portal.
 *
 * The portal serves an incomplete TLS chain: the leaf certificate is sent, but
 * the issuing intermediate ("GlobalSign GCC R46 OV TLS CA 2025") is not. Browsers
 * paper over this by fetching the intermediate themselves; Node does not, so
 * `fetch()` fails with "unable to verify the first certificate".
 *
 * Rather than disabling verification or shipping a stale copy of a CA, this
 * client asks the leaf certificate where its issuer lives (the AIA "CA Issuers"
 * field) and fetches it.
 *
 * That lookup is over plain HTTP, so the returned certificate is not trusted on
 * its own: it must actually verify the leaf we were just served. A substituted
 * certificate cannot, so it is rejected. If any step fails, the request fails —
 * there is no fallback to an unverified connection.
 */
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { X509Certificate } from 'node:crypto';

const HOST = 'fdpp.dilg.gov.ph';
const USER_AGENT =
  'BetterBauan/0.1 (civic transparency project; +https://github.com/Arxenic/betterbauan)';

/** @type {string[] | undefined} */
let cachedCa;

/** @param {Buffer} der */
function derToPem(der) {
  const body = der.toString('base64').match(/.{1,64}/g)?.join('\n') ?? '';
  return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----\n`;
}

/**
 * GET a URL as a buffer, over whichever protocol it names.
 * @param {string} url
 * @returns {Promise<Buffer>}
 */
function getRaw(url) {
  const transport = url.startsWith('http:') ? http : https;
  return new Promise((resolve, reject) => {
    const request = transport.get(
      url,
      { headers: { 'user-agent': USER_AGENT }, timeout: 20_000 },
      (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          if (response.statusCode !== 200) {
            reject(new Error(`${url} -> HTTP ${response.statusCode}`));
            return;
          }
          resolve(Buffer.concat(chunks));
        });
      }
    );
    request.on('error', reject);
    request.on('timeout', () => request.destroy(new Error(`${url} timed out`)));
  });
}

/**
 * Fetch the intermediate certificate named by the leaf's AIA extension, and
 * prove that it actually issued the leaf before trusting it.
 * @returns {Promise<string>} PEM-encoded certificate
 */
async function discoverIntermediate() {
  /** @type {X509Certificate | undefined} */
  let leaf;

  await new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: HOST, port: 443, servername: HOST, rejectUnauthorized: false },
      () => {
        leaf = socket.getPeerX509Certificate();
        socket.end();
        resolve(undefined);
      }
    );
    socket.on('error', reject);
  });

  if (!leaf) throw new Error('no leaf certificate presented');

  const url = leaf.infoAccess?.match(/CA Issuers\s*-\s*URI:(\S+)/)?.[1];
  if (!url) throw new Error('leaf certificate advertises no CA Issuers URL');

  const body = await getRaw(url);
  const text = body.toString('utf8');
  const candidate = new X509Certificate(text.includes('BEGIN CERTIFICATE') ? text : derToPem(body));

  if (!leaf.checkIssued(candidate) || !leaf.verify(candidate.publicKey)) {
    throw new Error('intermediate fetched from the AIA URL did not issue the leaf certificate');
  }

  return candidate.toString();
}

async function caBundle() {
  if (!cachedCa) {
    const intermediate = await discoverIntermediate();
    cachedCa = [...tls.rootCertificates, intermediate];
  }
  return cachedCa;
}

/**
 * @param {string} pathAndQuery path beginning with "/"
 * @param {{ binary?: boolean, redirects?: number }} [options]
 * @returns {Promise<Buffer>}
 */
export async function get(pathAndQuery, options = {}) {
  const { binary = false, redirects = 3 } = options;
  const ca = await caBundle();

  return new Promise((resolve, reject) => {
    const request = https.get(
      `https://${HOST}${pathAndQuery}`,
      {
        ca,
        headers: {
          'user-agent': USER_AGENT,
          accept: binary ? '*/*' : 'text/html',
          'accept-encoding': 'identity',
        },
        timeout: 60_000,
      },
      (response) => {
        const { statusCode = 0, headers } = response;

        if (statusCode >= 300 && statusCode < 400 && headers.location && redirects > 0) {
          response.resume();
          const target = new URL(headers.location, `https://${HOST}`);
          resolve(get(`${target.pathname}${target.search}`, { binary, redirects: redirects - 1 }));
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          if (statusCode !== 200) {
            reject(new Error(`GET ${pathAndQuery} -> HTTP ${statusCode}`));
            return;
          }
          resolve(Buffer.concat(chunks));
        });
      }
    );

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy(new Error(`GET ${pathAndQuery} timed out`));
    });
  });
}

/** @param {string} pathAndQuery */
export async function getText(pathAndQuery) {
  return (await get(pathAndQuery)).toString('utf8');
}

export const downloadUrl = (/** @type {string | number} */ id) =>
  `/fdpp/report/document-download?id=${id}`;
