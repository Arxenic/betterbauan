# Design notes

The site is meant to look like a public record that someone cared about — not like a startup landing
page and not like a generated dashboard. These are the rules behind it.

## References

- **[USWDS](https://designsystem.digital.gov/)** — the United States Web Design System, and its typeface
  **[Public Sans](https://github.com/uswds/public-sans)** (SIL Open Font License). Public Sans was drawn
  for government services: plain, narrow, legible at small sizes. It is the body face here.
- **[Fraunces](https://github.com/undercasetype/Fraunces)** by Undercase Type (SIL Open Font License).
  A variable serif with a warm, slightly wonky optical size. Used only for display: headlines, figures,
  barangay names. It gives the site a printed-matter voice that a system sans cannot.
- **[The Pudding](https://pudding.cool/)** — the standard for data stories where motion carries meaning
  rather than decorating. The map's level change and the bars' rise are borrowed from that discipline:
  one idea per gesture, and the ability to stop.

Both fonts are installed from npm (`@fontsource-variable/*`) and bundled by Vite. There is no request to
Google Fonts or any font CDN at runtime.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| `paper` | `#FFFFFF` | Page background. White, deliberately. |
| `surface-soft` | `#F7F5EF` | Quiet panels, chart wells |
| `ink` | `#121A1F` | Text, active states |
| `ink-soft` | `#3D4A50` | Body copy |
| `muted` | `#66737A` | Labels, notes |
| `line` | `#E6E2D9` | Hairlines |
| `line-strong` | `#CFC8BA` | Edges that need to hold a shape |
| `brand` | `#0E4A40` | Deep pine: links, primary buttons, bars |
| `brand-deep` | `#072E28` | Hover |
| `accent` | `#C2542D` | Vermilion: the highlighted place, the measured bar, the active rail mark |

Rules: vermilion is never used for body text or large fills, only for one thing at a time. Green carries
structure. The page is white; panels are cream; there are no gradients on text and no glassmorphism.

## Type and layout

- Display sizes use Fraunces with tight tracking (`-0.02em` to `-0.03em`) and a line height near `1`.
- Body is Public Sans at `0.9rem`–`1rem`, line height `1.6`.
- Numbers are tabular everywhere (`font-variant-numeric: tabular-nums`).
- Labels are `0.62rem`, uppercase, `0.14em` tracking, muted. They are a rhythm, not decoration.
- Layout uses hairline rules and generous margins instead of cards with shadows. Corners are square.
- The tab menu is not a segmented control. It is a numbered vertical rail (`01 / 02 / 03`) with a
  vermilion marker that moves with the selection.

## Charts

`BarChart.astro` and `ColumnChart.astro` are server-rendered HTML and CSS. No chart library, no canvas,
no SVG text that screen readers cannot follow — every value is a real string in the document. Bars grow
once with a CSS keyframe and stop. Under `prefers-reduced-motion` they appear immediately.

## Map

Three scales share one camera language: country, province, town. The town level is a **data landscape**:
each barangay is extruded to a chosen measure (population, households, contracts, contract value), and
the bars re-grow when the measure changes.

**The height is a statistic, not elevation.** A real relief model needs a digital elevation model; shipping
one would mean downloading terrain tiles at build time or calling a tile service at runtime. Neither is
acceptable here, so the map says what it is instead of pretending.

Motion rules:

- One camera move at a time; a new level cancels the previous move.
- Auto-rotation stops on interaction and resumes only after nine seconds idle.
- `prefers-reduced-motion` disables the dolly, the rise and the pulse.
- Pins are only plotted when DPWH's coordinate lands inside a barangay polygon. The rest are disclosed,
  never nudged onto the map.

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
