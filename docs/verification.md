# Verification policy

"Verified" is not a badge we award ourselves. It is a claim about **evidence**, and every claim on this
site must be checkable by someone who does not trust us. This document defines what we mean, how a fact
gets there, and how it gets removed.

The short version: **we do not verify facts. We record where a fact came from, at what tier of evidence,
and on what date — and we make the check reproducible.**

---

## 1. Evidence tiers

Every published figure carries a tier. The tier is visible to the reader, not hidden in a tooltip.

| Tier | Name | What qualifies | May a *number* be published? |
|---|---|---|---|
| **A** | Primary, structured | Machine-readable record from the publishing agency itself — PSA OpenSTAT tables, DILG Full Disclosure filings (XLSX), DPWH contract API. Reconciles internally. | Yes, with source + retrieval date |
| **B** | Primary, document | Official document that a human must read: COA Annual Audit Report, signed ordinance, COMELEC proclamation, LGU resolution. Figures are transcribed and the page/paragraph is recorded. | Yes, marked *transcribed*, with locator |
| **C** | Official statement | The LGU or an agency says it in prose (press release, official page, official social post) with no underlying record. | Only as a quotation, attributed and dated |
| **D** | Secondary | News reporting, encyclopaedias, aggregator sites. | **No.** A lead to chase, never a citation for a number |
| **E** | Community | A resident submits a document or observation, pending maintainer review against a tier A/B source. | Not until promoted |

A lower tier does not mean wrong. It means *unchecked by us*. Tier D is where most civic data errors
come from — a figure repeated until it looks sourced.

**Rule:** a tier D source may send you looking. It may not appear next to a peso sign or a population
count.

---

## 2. What each tier requires in the repository

Tier A — the pipeline is the citation:

```json
{
  "tier": "A",
  "sourceId": "psa-openstat",
  "retrievedAt": "2026-11-02T…",
  "locator": "PO_2024/0041A6DTPH3.px"
}
```

Tier B — the document is the citation:

```json
{
  "tier": "B",
  "sourceId": "coa-aar-2024",
  "locator": "p. 42, Statement of Financial Position, line 'Total Assets'",
  "documentUrl": "https://…"
}
```

If you cannot fill `locator`, the claim is not tier B yet.

---

## 3. How a claim becomes verified

1. **State the claim precisely.** "Bauan's population is 94,016" is checkable. "Bauan has about 94k
   people" is not — which census, which date?
2. **Climb to the highest tier available.** Start at the agency that *produces* the record, not the one
   that repeats it.
3. **Record the locator and the retrieval date.** A URL alone rots; a table name or page number survives.
4. **Reproduce it.** For tier A, re-run the script and confirm the committed JSON is unchanged. For tier B,
   open the document at the locator and read the row yourself.
5. **Second pair of eyes.** Anything without a machine pipeline needs a reviewer who did not write it.
   That is what the pull request is for.
6. **Publish with the tier visible.** If the tier is B, the page says *transcribed from the COA report,
   page 42*.
7. **Log the change.** Every promotion, correction or withdrawal gets a dated entry in `CHANGELOG.md`.

### Reproducibility is the open-source superpower

A tier A claim is not "verified because a maintainer said so". It is verified because **anyone can run
the same script against the same public API and get the same bytes**. That is why generated data is
committed to the repository instead of fetched at build time: the diff *is* the audit trail. If PSA
revises a figure, the pull request shows the old value, the new value, and the date it changed.

This is also why tier A pipelines are allowed to **fail the build** rather than guess: a reconciliation
failure is information, and silently publishing a wrong total is worse than publishing nothing.

---

## 4. Where the missing Bauan records actually come from

| Claim | Tier today | Route to verification |
|---|---|---|
| Population, households, barangays | **A** | PSA OpenSTAT — done, reconciles |
| FDP financial filings | **A** (index) | DILG FDP portal — done |
| SRE revenue/expenditure | **A**, once extracted | Same XLSX, label-anchored, reconciled |
| DPWH contracts | **A** | BetterGov DPWH API, with a location gate |
| Officials (mayor, VM, councilors) | **D** | COMELEC 2025 proclamation / Certificate of Canvass; or Sangguniang Bayan records; or the Municipal Secretary's Directory of Officials. **Do not** use the DILG profile alone |
| Municipal poverty incidence | **D** | PSA Small Area Estimates release (2023), municipal sheet. PSA's public page blocks bots, so download the release manually and commit the PDF reference |
| Income class | **D** | DOF/BLGF income classification order for the year |
| Local (non-DPWH) projects | none | LGU project monitoring reports, Annual Investment Program, or FDP procurement forms |
| Ordinances / resolutions | none | Sangguniang Bayan records via the Municipal Secretary, or FOI |

### The formal routes

- **FOI.** Executive Order No. 2, s. 2016 covers all government offices under the Executive branch,
  including municipalities. File at [foi.gov.ph](https://www.foi.gov.ph) — agencies have 15 working days
  to respond. Ask for the *record*, not an explanation: "Directory of elective and appointive officials,
  CY 2025" beats "who is the mayor?".
- **Full Disclosure Policy.** DILG requires municipalities to post 14 statutory financial documents
  every quarter. That is why the FDP portal exists — requesting compliance is not adversarial, it is the
  policy working as designed.
- **COA.** Annual Audit Reports are published per LGU and contain audited financial statements. These are
  the tier B answer to "is the FDP figure right?".
- **PSA.** Provincial statistical offices answer data requests; OpenSTAT covers what the website hides.

### What we will not do

- Publish a name or a peso figure because it "seems right" or because several sites agree.
- Copy a figure from Wikipedia and label it verified because Wikipedia cites something.
- Mark a claim verified because the LGU said it in a Facebook post (that is tier C, and it says so).
- Treat "verified" as permanent. Records are verified *as of a date*, and the date is on the page.

---

## 5. Corrections

If a published figure is wrong:

1. Open an issue with the source that contradicts it.
2. We withdraw the figure first, then re-verify. **Withdrawal is not an admission of bad faith; leaving a
   known-wrong number up is.**
3. The correction is recorded in `CHANGELOG.md` with the date, the old value, the new value and the reason.

Trust in a civic portal is not built by being right every time. It is built by being visibly correctable.
