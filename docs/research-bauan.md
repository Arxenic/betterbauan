# BetterBauan — research notes

**Subject:** Municipality of Bauan, Province of Batangas, Region IV-A (CALABARZON)
**Research date:** 2026-11-02
**Purpose:** establish what public data actually exists, where it lives, and which of it we are willing to publish.

Every claim below was checked against a live endpoint on the research date. Items marked **PENDING**
were not reachable or not yet parsed, and are recorded as gaps rather than filled in from memory.

---

## 1. Identity and codes

| Field | Value | Source |
|---|---|---|
| Official name | Municipality of Bauan (Bayan ng Bauan) | PSA / LGU |
| Province | Batangas | PSA |
| Region | IV-A CALABARZON | PSA |
| Congressional district | 2nd district of Batangas | COMELEC / Wikipedia |
| PSGC (10-digit) | `0401006000` | PSA PSGC |
| Barangay PSGC prefix | `04010060` + 2 digits (non-contiguous; see §4) | PSA |
| ZIP code | 4201 | PHLPost |
| Area code | +63 43 | |
| Founded | 3 May 1596 (ecclesiastical mission 1590; separate parish 12 May 1596) | LGU history, Wikipedia |
| Official website | `bauan.gov.ph` — **did not respond** (DNS resolves to 223.25.21.92, TCP connect timed out from research host) | live check |
| Distance | ~7 km from Batangas City, ~112 km from Manila | Wikipedia |

**Neighbours:** San Luis (N), San Pascual (E), Mabini (S/SW), Balayan Bay (W), Batangas Bay (SE).

> Because the official site is unreachable, the Internet Archive is the fallback for anything the LGU
> published there. That mirror has **not** been verified yet (CDX API timed out on the research date).

---

## 2. Verified datasets

### 2.1 Population and households — PSA OpenSTAT (PRIMARY, WORKS)

PSA's public web pages sit behind a bot challenge, but PSA's own statistical database answers as data.

- API base: `https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/1A`
- 2024 census table (barangay granularity): `PO_2024/0041A6DTPH3.px`
- Series table (2015 / 2020 / 2024 + land area + density): `PO_2024/0221A6DLPD0.px`
- Method: `POST` JSON query, `response.format = "csv"`

**Municipality (2024 POPCEN):**

| Measure | Value |
|---|---|
| Total population | **94,016** |
| Household population | 93,941 |
| Number of households | **24,688** |
| Land area | **51.49 km²** (PSA) |
| Population density | **1,826 / km²** |

**Series:**

| Census | Population |
|---|---|
| 2015 POPCEN | 91,297 |
| 2020 CPH | 90,819 |
| 2024 POPCEN | 94,016 |

**Reconciliation gate:** the 40 barangay populations sum to exactly 94,016 and the barangay household
counts sum to exactly 24,688. If a future fetch breaks either identity, the build must fail rather than
publish — that is the rule the peer project (`bettercalatagan`) enforces, and it is the right one.

**Two source conflicts found, both resolved in PSA's favour:**

1. **Land area.** PSA says 51.49 km². The widely repeated figure is 53.31 km². We publish PSA's number
   and show the discrepancy in a note, because our other PSA-derived figure (density) is computed from it.
2. **Barangay populations.** Wikipedia's Bauan table is headed "2024" but its per-barangay numbers do not
   match PSA's 2024 release (e.g. As-Is: Wikipedia 2,344 vs PSA 6,967; Manghinao Proper: 10,789 vs 7,068).
   Its percentages are computed against the 2020 total (90,819), which suggests the rows are 2020 figures
   under a 2024 heading. **Do not scrape Wikipedia for numbers.** Use the API.

### 2.2 Full Disclosure Policy filings — DILG FDP Portal (PRIMARY, WORKS)

The statutory transparency corpus for the municipality: 14 forms, quarterly/annual cadence, published as
spreadsheets.

- Portal: `https://fdpp.dilg.gov.ph/fdpp/report/index`
- Bauan filter keys: `region_filter=04`, `province_filter=010`, `lgu_filter=06`
- Download: `https://fdpp.dilg.gov.ph/fdpp/report/document-download?id=<fdppId>`
- Note: the portal serves an **incomplete TLS chain**. Node's `fetch` rejects it ("unable to verify the
  first certificate"); `curl -k` works, and the peer project ships the two intermediate CAs in `certs/`.
  For a repeatable pipeline, pin the intermediates rather than disabling verification.

**Inventory as of the research date: 300 filings, all 14 forms, CY2023–CY2026.**

| Form | Filings | Cadence |
|---|---|---|
| Manpower Complement | 38 | quarterly |
| Report of Special Education Fund Utilization | 38 | quarterly |
| Trust Fund Utilization | 38 | quarterly |
| Local Disaster Risk Reduction and Management Fund Utilization | 38 | quarterly |
| Unliquidated Cash Advances | 38 | quarterly |
| Annual Gender and Development Accomplishment Report | 28 | annual |
| 20% of the National Tax Allotment Utilization | 14 | quarterly |
| Bid Results on Civil Works, Goods and Services, and Consulting Services | 14 | quarterly |
| Statement of Receipts and Expenditures (SRE) | 14 | quarterly |
| Statement of Indebtedness, Payments and Balances | 14 | quarterly |
| Quarterly Statement of Cash Flow | 14 | quarterly |
| Annual Budget Report | 4 | annual |
| Annual Procurement Plan | 4 | annual |
| Supplemental Procurement Plan | 4 | annual |

**Download verified:** SRE filing `id=264301` returned `200 OK`,
`Content-Type: application/vnd.ms-excel`,
`Content-Disposition: ...filename=REGION IV-A - CALABARZON BATANGAS BAUAN.xlsx`, 13,221 bytes.

That means the strongest dataset is obtainable: the SRE has fixed labels and four value columns
(Income/Target Budget Appropriation, General Fund, SEF, Total), so revenue and expenditure can be
extracted as numbers **with cell-level provenance**, not as a PDF to be re-typed.

Two engineering rules to copy from the peer project:

- **Stage → promote.** A scrape writes to staging; only reviewed/verified filings enter the published
  dataset. A portal outage must never delete a previously verified filing.
- **Reconcile or withhold.** If a filing's own totals do not add up, mark it unverified and do not publish
  its figures.

### 2.3 Infrastructure projects — DPWH via BetterGov API (PRIMARY, WORKS)

- API: `https://api.dpwh.bettergov.ph/projects?search=<query>&limit=100&page=<n>`
- Query `"Bauan, Batangas"` → **132 contracts**, 2016–2026, total contract value **₱2,052,432,051.43**

| Status | Contracts |
|---|---|
| Completed | 116 |
| On-Going | 13 |
| For Procurement | 3 |

| Year | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Contracts | 19 | 9 | 9 | 16 | 15 | 11 | 9 | 8 | 16 | 19 | 1 |

Top categories: Buildings and Facilities (38), Roads (35), Flood Control and Drainage (12),
Water Provision and Storage (7), Bridges (2).

**Caveat that must be handled in code:** a free-text search keyed on the place name is not a location
filter. The result set contains at least one coordinate outlier (latitude 14.644, ~100 km north of Bauan),
so the pipeline needs a **location gate** — accept a contract only if its description names a Bauan
barangay or its coordinates fall inside a Bauan bounding box, and record which test passed.

### 2.4 Poverty — PSA (PARTIAL)

- Full-year poverty tables via OpenSTAT: `https://openstat.psa.gov.ph/PXWeb/api/v1/en/DB/1F/FY`
- Tables go down to **province**, not municipality.
- Municipal small-area estimates exist but are published on `psa.gov.ph`, which returns **403** to
  non-browser clients (Cloudflare).
- A 4.95% (2023) municipal figure circulates via Wikipedia. **Unverified — do not publish until checked.**

Interim position: publish the Batangas and CALABARZON incidence with PSA's own precision measures,
clearly labelled as province/region, or omit municipal poverty entirely in v1.

### 2.5 LGU competitiveness index — DTI CMCI (PENDING)

`cmci.dti.gov.ph` responds, but the ranking URL is not `/rankings` (404). Endpoint discovery pending.
Bauan is a 1st-class municipality, so it would rank in DTI's "1st to 2nd Class Municipalities" category.
Optional for v1 — it is a composite index, not a transparency record.

### 2.6 Officials (PENDING VERIFICATION)

Currently available only from secondary sources (Wikipedia citing DILG/COMELEC):

| Office | Name |
|---|---|
| Mayor | Wendah Katrina R. Dolor |
| Vice Mayor | Jennelle Claresta Guenn Sandoval-Abante |
| Representative, 2nd District | Gerville R. Luistro |
| Councilors | Herminio M. Dolor, Neil P. Valdez, Jennelle Claresta Guenn S. Abante, Romel R. Basilan, Jesimel Jake O. Garcia, Josephine D. Gimeno, Michael T. Endaya, Marjorie Jelly A. Adel |
| Electorate (2025) | 60,835 |

The DILG LGU profile (`lgu201.dilg.gov.ph`) did not respond, and the official municipal site is down.
**These names stay unpublished until confirmed against a primary source** (COMELEC proclamation, Official
Gazette, or the Sangguniang Bayan's own records). A wrong mayor's name destroys the credibility of every
other number on the site — the asymmetry is total.

### 2.7 Fiscal summary (UNVERIFIED SECONDARY)

Wikipedia reports 2024 revenue ₱571.6M, expenditure ₱204.7M, assets ₱2,358M, liabilities ₱817.6M, and
1st municipal income class. Treat as a *hypothesis to check*, not data: the SRE and Annual Budget Report
on the FDP portal are the authoritative versions, and they are downloadable. Do not seed the site with
these numbers.

---

## 3. What we publish in v1, and what we refuse to

**Publish (all machine-derived, all reconciling):**

1. Population, households, land area, density — PSA OpenSTAT, 2015/2020/2024.
2. All 40 barangays: PSGC, name, 2024 population, households, share of municipal total.
3. DPWH contracts located in Bauan: description, category, budget, contractor, dates, status, source year.
4. FDP filing index: form, period, direct download link, posting date — for all 300 filings.
5. SRE figures: revenue and expenditure line items from the most recent verified filing, plus a
   multi-year trend, each carrying sheet + cell provenance.
6. A sources page listing every endpoint, what it supports, and the retrieval date.

**Withhold until sourced:** officials, municipal poverty incidence, local (non-DPWH) projects, ordinances
and resolutions, hotlines, business permits and fees, income class.

**Never:** invent a figure, fill a gap with an estimate, or present the site as official.

---

## 4. Barangay dataset (PSA 2024 POPCEN, verified)

Municipal total: 94,016 population / 24,688 households. Barangay PSGCs are `04010060NN`; suffixes
017, 027, 040 and 043 are unassigned, which is why there are 40 and not 44.

| PSGC | Barangay | Population | Households |
|---|---|---|---|
| 0401006001 | Alagao | 2,531 | 580 |
| 0401006002 | Aplaya | 7,386 | 1,987 |
| 0401006003 | As-Is | 6,967 | 1,817 |
| 0401006004 | Bagong Silang | 541 | 172 |
| 0401006005 | Baguilawa | 1,555 | 371 |
| 0401006006 | Balayong | 2,505 | 722 |
| 0401006007 | Barangay I (Poblacion) | 4,265 | 1,115 |
| 0401006008 | Barangay II (Poblacion) | 2,743 | 774 |
| 0401006009 | Barangay III (Poblacion) | 456 | 118 |
| 0401006010 | Barangay IV (Poblacion) | 2,623 | 696 |
| 0401006011 | Bolo | 4,776 | 1,320 |
| 0401006012 | Colvo | 500 | 141 |
| 0401006013 | Cupang | 2,217 | 646 |
| 0401006014 | Durungao | 1,744 | 469 |
| 0401006015 | Gulibay | 1,323 | 337 |
| 0401006016 | Inicbulan | 4,133 | 1,056 |
| 0401006018 | Locloc | 1,332 | 347 |
| 0401006019 | Magalang-Galang | 316 | 88 |
| 0401006020 | Malindig | 443 | 108 |
| 0401006021 | Manalupong | 1,367 | 311 |
| 0401006022 | Manghinao Proper | 7,068 | 1,831 |
| 0401006023 | Manghinao Uno | 2,821 | 757 |
| 0401006024 | New Danglayan | 1,453 | 344 |
| 0401006025 | Orense | 843 | 197 |
| 0401006026 | Pitugo | 960 | 289 |
| 0401006028 | Rizal | 913 | 227 |
| 0401006029 | Sampaguita | 574 | 148 |
| 0401006030 | San Agustin | 1,200 | 289 |
| 0401006031 | San Andres Proper | 2,604 | 642 |
| 0401006032 | San Andres Uno | 625 | 174 |
| 0401006033 | San Diego | 588 | 151 |
| 0401006034 | San Miguel | 1,502 | 439 |
| 0401006035 | San Pablo | 823 | 218 |
| 0401006036 | San Pedro | 2,801 | 763 |
| 0401006037 | San Roque | 6,494 | 1,740 |
| 0401006038 | San Teodoro | 1,722 | 455 |
| 0401006039 | San Vicente | 819 | 191 |
| 0401006041 | Santa Maria | 4,706 | 1,222 |
| 0401006042 | Santo Domingo | 2,788 | 702 |
| 0401006044 | Sinala | 2,989 | 734 |

Note on naming: PSA writes **Manalupong**; the barangay is widely written *Manalupang*. Publish PSA's
spelling and note the variant, rather than silently "fixing" the authority.

---

## 5. Refresh model

| Dataset | Cadence | Trigger |
|---|---|---|
| PSA population | per census release | manual, with reconciliation gate |
| FDP filings index | quarterly (Q1–Q4) | scheduled scrape → staging → review → promote |
| SRE extraction | quarterly | follows the index; reconcile before publishing |
| DPWH contracts | monthly | scheduled; refuse to shrink the committed set on a source outage |

The peer project refuses to write fewer records than the committed dataset holds. That single rule
prevents an outage from silently deleting public records — adopt it.

---

## 6. Open questions

1. Is `bauan.gov.ph` permanently offline, or geo/IP-restricted? Determines whether we can cite it at all.
2. Internet Archive capture of `bauan.gov.ph` — unverified (CDX timed out). Worth one retry before
   deciding whether a "Documents" archive section is possible.
3. Primary source for officials — COMELEC 2025 proclamation vs. Sangguniang Bayan records.
4. CMCI ranking endpoint.
5. Whether the Sangguniang Bayan publishes ordinances/resolutions anywhere machine-readable. Currently
   assumed not; v1 ships an empty state rather than a guess.
