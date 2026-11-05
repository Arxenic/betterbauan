# The Bauan Assistant

The assistant is a scoped guide to the BetterBauan record. It is not the municipality, not a live
news service, and not a general-purpose chatbot. It is deliberately narrow: the fixed record in
[`api/chat.js`](../api/chat.js) is the only material it may use.

## What it can answer

- Population, households, land area, barangays and the municipal profile.
- The 2025–2028 mayor, vice mayor and council, labelled as tier C; the mayoral succession since 1998.
- The Sangguniang Kabataan section: 40 councils, the 10% fund rule, and the missing project ledger.
- The 3D map, the 108 contracts inside Bauan, the 91 placed beads, the 17 unplaced contracts, and the
  distinction between placed value and total value.
- Statutory filings, documents, culture and history.
- How to verify, correct or contribute a record.

It declines unrelated coding, homework, medical, legal, financial, electoral and campaign requests. If
the record does not contain an answer, it says so and points to the nearest page or named gap. It should
never invent a project, amount, official or source.

## Interface and mark

The panel follows the centred reference layout: a single question, suggestion pills, one composer and
a short privacy note. It is deliberately white and green rather than a dark chat surface, so it reads as
part of the record instead of a separate product.

The launcher is a small procedural three.js mascot, not the Sangguniang Bayan seal: a gold sun with leaf
rays, a cream barong and the public ledger above a blue-green wave. The sun and ridges come from the
municipal mark; the character is original to BetterBauan. Its head tracks the pointer.

A supplied GLB can replace the mascot without changing the panel. Put the file in `public/assets/`, then
set `data-model="/assets/your-file.glb"` on `[data-bot-canvas]` in
[`Assistant.astro`](../src/components/Assistant.astro). The loader scales the model, finds a node whose
name contains `head`, and turns that node toward the cursor; if no head node exists, it turns the whole
model.

## Architecture

```
browser
  │  POST /api/chat  (same-origin only; no key in the bundle)
  ▼
Vercel Edge Function  api/chat.js
  │  fixed RECORD + cleaned short history
  │  Authorization: Bearer $NYO_API_KEY
  ▼
NYO OpenAI-compatible gateway
  https://llm.nyolab.ai/api/public/v1/chat/completions
  model: glm-5.3-flash (upstream: zai-org/GLM-5.3-Flash)
  │  text/event-stream
  ▼
browser  assistant.ts  → panel, optional speech synthesis
```

The endpoint accepts only `POST`, keeps the last 10 user/assistant turns, truncates each turn to 1,800
characters, rejects conversations over 9,000 characters, caps output at 700 tokens and uses a low
temperature. It returns generic errors; upstream detail is not shown to the reader. Nothing is logged or
stored by this project.

## Environment

Set these in the Vercel project (Production, Preview and Development as needed). Never commit a real
key.

| Variable | Purpose | Required |
| --- | --- | --- |
| `NYO_API_KEY` | Server-side bearer token, begins `rk_live_` | Yes |
| `NYO_BASE_URL` | `https://llm.nyolab.ai/api/public/v1` | No; this default is in the function |
| `NYO_MODEL` | `glm-5.3-flash` | No; this default is in the function |

Locally, use `vercel dev` so `api/chat.js` is served. `astro dev` serves the static pages only, and the
assistant reports that it is not connected. Put the three variables in an ignored `.env.local` (copy
[`.env.example`](../.env.example)); the Vercel CLI loads it for local functions. Do not put the key in
`PUBLIC_*`, client code, a query string or a committed file.

## Voice and privacy

- **Text** is sent to `/api/chat`, then to NYO, only after the reader presses Send.
- **Speech input** uses the browser's Web Speech API after the reader presses the microphone. That API
  may send audio to the browser vendor's speech service; the behaviour is controlled by the browser, not
  by this site. If the API is unavailable, the microphone button is disabled and text still works.
- **Spoken replies** use `speechSynthesis`; the site does not upload audio for this.
- The site stores no chat, account or audio record. It sets no cookies and runs no analytics.
- The assistant is the only runtime cloud call. If a reader never opens it, the page makes no
  third-party request.

## Guardrails and limits

The fixed record makes the assistant auditable, but it is not a fact-checker. A model can still phrase
something imprecisely. Treat every answer as a pointer to a page, not as a new primary source. If an
answer conflicts with a page or a document, the page and the document win; send the correction through
the repository issue tracker.

The current roster is tier C because the COMELEC 2025 Certificate of Canvass and Proclamation has not
been obtained. The assistant is instructed to name **Wendah Katrina Rivera Dolor** as mayor and to
refuse substitutions, but the underlying roster still needs that primary record.
