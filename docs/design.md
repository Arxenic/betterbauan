# Design notes

The site is meant to look like a public record that someone cared about — not like a startup landing
page and not like a generated dashboard. These are the rules behind it.

## References

- **[Public Sans](https://github.com/uswds/public-sans)** — drawn for US government services: plain,
  narrow, legible at small sizes. It remains the body face.
- **[Archivo](https://github.com/Omnibus-Type/Archivo)** and **Archivo Black** by Omnibus-Type (SIL Open
  Font License). A grotesque with a wide weight range for headlines and a single fat cut for the
  wordmark and cover. This is the display voice: magazine, not municipal memo.
- **[Newsreader](https://github.com/productiontype/Newsreader)** by Production Type (SIL Open Font
  License). Used only in italic, for standfirsts, pull quotes and captions. It is the one serif on the
  page, and it never sets body copy.
- **[The Pudding](https://pudding.cool/)** — the standard for data stories where motion carries meaning
  rather than decorating. The map's level change, the bars' rise and the year scrubber follow that
  discipline: one idea per gesture, and the ability to stop.

All fonts are installed from npm (`@fontsource*/*`) and bundled by Vite. There is no request to Google
Fonts or any font CDN at runtime.

## Colour

The palette is sampled from the municipal mark: the gold sun, the two green ridges, the blue sea, and
the red of the seal. White is the page, not a tint of it.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `paper` | `#FFFFFF` | `#080D0F` | Page background |
| `surface-soft` | `#F2F5F3` | `#0C1214` | Quiet panels, chart wells |
| `ink` | `#0A1114` | `#F3F7F5` | Text, active states |
| `ink-soft` | `#37464B` | `#B9C6C2` | Body copy |
| `muted` | `#6C7A7D` | `#8A9A96` | Labels, notes |
| `line` | `#DFE5E3` | `#1D2A2C` | Hairlines |
| `line-strong` | `#B7C2BF` | `#33443F` | Edges that need to hold a shape |
| `brand` | `#0E5537` | `#57C293` | Links, primary buttons, the town |
| `brand-deep` | `#083A26` | `#3FA97D` | Hover |
| `gold` | `#E8A317` | `#F3BE4F` | Sun, contract pins, the active rail mark |
| `sea` | `#0C5B87` | `#62B8E8` | Water, secondary data |
| `leaf` | `#2E7D46` | `#6FD196` | Hills, secondary marks |
| `accent` | `#C63A2E` | `#F0705F` | Seal red: warnings and caveats only |

Rules: gold is a data accent, never a background wash. Red is reserved for caveats. Green carries
structure. Panels are cool grey-green, never cream, and there are no gradients on text.

## Type and layout

- Display sizes use Archivo at 700–800 weight, tracking `-0.03em`, line height near `0.92`. The cover
  uses Archivo Black at `clamp(3.2rem, 10.4vw, 8.4rem)`; interior page titles use `display-xl`.
- Body is Public Sans at `0.9rem`–`1rem`, line height `1.6`.
- Standfirsts and pull quotes are Newsreader italic; captions may use it at small sizes.
- Numbers are tabular everywhere (`font-variant-numeric: tabular-nums`).
- Labels are `0.62rem`, uppercase, `0.2em` tracking, muted. They are a rhythm, not decoration.
- Layout uses hairline rules and generous margins instead of cards with shadows. Corners are square;
  the dock and pills are the only rounded objects.
- Navigation is a floating dark pill dock with four groups (Overview, Government, Transparency, About).
  Each opens a panel of its sections; below 860px the dock collapses to a Menu sheet. The page keeps
  exactly four top-level destinations, so the group, not the page, is the unit of navigation.

## Charts

`BarChart.astro` and `ColumnChart.astro` are server-rendered HTML and CSS. No chart library, no canvas,
no SVG text that screen readers cannot follow — every value is a real string in the document. Bars grow
once with a CSS keyframe and stop. Under `prefers-reduced-motion` they appear immediately.

## The 3D mark

The header and cover use a procedural three.js emblem rather than a bitmap of the seal. It is built from
the mark's own parts — gold sun and rays, two green ridges, the white municipal hall with its arched
portal and columns, a palm, three sea bands and terraces — so it scales cleanly, moves on pointer
parallax, and re-lights itself in dark mode. There is no texture download and no model file: the
geometry is generated at runtime from the same palette tokens as the page. `BauanMark.astro` is the flat
SVG fallback for the masthead and no-WebGL readers.

## Map

Three scales share one camera language: country, province, town. The town level is a **data landscape**:
each barangay is extruded to a chosen measure (population, households, contracts, contract value), and
the bars re-grow when the measure changes.

**The height is a statistic, not elevation.** A real relief model needs a digital elevation model; shipping
one would mean downloading terrain tiles at build time or calling a tile service at runtime. Neither is
acceptable here, so the map says what it is instead of pretending.

The town view also has a **year scrubber**. `scripts/build-map.mjs` stores, for every barangay, the count
and value of contracts dated in each year; choosing a year keeps only those pins and re-grows the town to
that year's own totals. The "All years" position is the reconciled whole, not a default that hides data.

Motion rules:

- One camera move at a time; a new level cancels the previous move.
- Auto-rotation stops on interaction and resumes only after nine seconds idle.
- `prefers-reduced-motion` disables the dolly, the rise, the beacon pulse and the pointer parallax.
- Pins are only plotted when DPWH's coordinate lands inside a barangay polygon. The rest are disclosed,
  never nudged onto the map.
- Contract pins are beacons (stem, emissive head, gold halo) rather than flat dots, so they remain legible
  above the tallest barangay.

## What would have needed the cloud, and did not

| Tempting default | Used instead |
| --- | --- |
| Mapbox / MapLibre tiles, OSM raster tiles | Committed GeoJSON, extruded locally |
| Google Fonts | `@fontsource-variable/*`, bundled |
| Geocoding a contract address | DPWH's own coordinates, verified against the boundary |
| Analytics or heatmap SaaS | Nothing; logs are not collected |
| A charting CDN | CSS bars, server-rendered |
| Elevation tiles (Mapzen, AWS Terrain) | Height encoded from published statistics |

No API key is present in the repository, and the deployed site makes no third-party request.
