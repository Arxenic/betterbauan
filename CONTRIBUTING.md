# Contributing

Two kinds of contribution matter here: **corrections** and **data**. Code is welcome too, but a wrong
figure left standing is worse than a missing feature.

## Reporting an error

Open an issue: https://github.com/Arxenic/betterbauan/issues

Include:

- the page and the exact figure or sentence;
- the document that contradicts it — a scan, a link, or a page reference;
- the date you read that document.

A report is triaged the same way a record is: source first, then the fix. If the source is a primary
record, the figure is corrected. If it is a secondary source, the report becomes a lead, and the figure
stays until a primary record is in hand.

## Contributing data

A dataset belongs on the site only if it clears the three gates in
[`docs/verification.md`](docs/verification.md):

1. **Provenance** — tier A (machine-readable, published by the producing agency) or tier B (a primary
   document, transcribed with a page reference).
2. **Reconciliation** — internal consistency, enforced in code. If a total does not match its parts, the
   build fails.
3. **Withdrawal first** — a challenged figure comes down before it is re-checked.

### Adding a pipeline

1. Add `scripts/fetch-<dataset>.mjs`. Follow the existing scripts: read only, no scraping of secondary
   sources, deterministic output, `schemaVersion`, `source`, `retrievedAt`, `summary`.
2. Refuse to write an empty dataset over a populated one.
3. Write to `src/data/generated/<dataset>.json` and commit the output.
4. Register the source in `src/data/sources.ts` with its tier and what it is allowed to support.
5. Add the page or section, with an `<EvidenceNote />` naming the source and locator.
6. Add the npm script to `package.json` (`data:<dataset>`).

### Style

- TypeScript in `src/`, ESM in `scripts/`. No new runtime dependencies without a reason.
- Prefer plain HTML and small inline scripts over a client framework. The site ships no hydration.
- Comments explain *why*, not what.
- Every table gets a `<caption>` (may be `sr-only`) and numeric cells use tabular numerals.

## What will be rejected

- A figure with no primary source, however plausible.
- A "fix" that changes a dataset by hand rather than by its pipeline.
- Officials, poverty incidence or ordinances sourced from Wikipedia, news reports or social media.
- Any personal data about private individuals.
- Analytics, trackers, or anything that phones home from the browser.

## Licence

By contributing you agree that code is licensed under MIT and written content under CC BY 4.0, as described
in [`LICENSE`](LICENSE) and [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md).
