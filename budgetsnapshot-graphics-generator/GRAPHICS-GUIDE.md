# How the Budget Snapshot Graphics Generator works

This guide describes the current implementation in [index.html](index.html), reviewed October 19, 2026. It covers every card in display order, including the unfinished ones. Examples labeled **COPA example** use the embedded data or the checked-in COPA export; examples labeled **Illustration** use made-up numbers to explain a calculation. This is a description of the code and saved data, not a fresh audit of the City APIs.

## Where the numbers come from

The generator combines three kinds of information:

| Source | Used for | How it updates |
| --- | --- | --- |
| City of Chicago budget APIs on `data.cityofchicago.org` | Appropriations, local-fund budgets, budgeted workforce, largest accounts, and year-to-year changes | Fetched in the browser; dataset rows are cached during the session |
| CSV text embedded inside `index.html` | Actuals/encumbrances, monthly vacancies, and budgets with estimated fringe | A saved snapshot; changing the separate CSV file alone does not update the generator |
| The graphic editors | Manual corrections to numbers and text | Temporary browser-session changes, included when exported |

The summary derives its starting values from the appropriation and workforce series. Inflation conversion factors are another fixed input inside the HTML.

For API data, the generator downloads rows in batches of up to 50,000 and filters them for the selected department. It tries department codes first, then names and conservative name normalization. Department 60 also matches predecessor IPRA code 56, the short names IPRA/COPA, and both full agency names so its history can include both agencies. This is matching logic, not an adjustment for changes in agency responsibilities.

The code accommodates changing field names across annual datasets. For appropriations it selects a numeric amount field favoring `ordinance`, or `recommend`/`proposed`, depending on the year and cycle. Each chart's **Data & API details** section helps identify the selected field, dataset, matched rows, and missing values.

### What the budget-cycle selector changes

- **2026 recommendation:** compares the 2025 ordinance with the 2026 recommendation. The historical series runs from 2011 through 2026.
- **2027 prep:** uses the 2026 ordinance as the latest available baseline. The current configuration has no 2027 recommendation connected, so 2027 comparison values are unknown and the change charts cannot build. This describes the configuration, not whether the City has since published data.

The fringe CSV, actuals years (2022–2025), and vacancy months (February–September 2025) remain fixed when the cycle changes.

## 1. Department Budget Summary

**What you see:** a table-style graphic summarizing appropriations and positions/FTEs: previous budget, current budget, net change, percent change, and annual growth rates. Export ID: `summary`.

**Source:** the already-loaded appropriation and workforce histories. It does not fetch an independent summary dataset.

**Calculations:**

```text
Net change = current − previous
Percent change = (current − previous) / previous
Year-to-year change = (this year − previous year) / previous year
Average annual rate = sum of year-to-year changes / number of annual changes
```

The nominal average annual rates use the arithmetic average of each year's percentage change. Their end year follows the selected proposal cycle's **previous ordinance year** (`activeCycle.previousYear`), which is also saved as `rateEndYear` in summary metadata:

| Proposal cycle | Average annual rate period | COPA period | Annual changes |
| --- | --- | --- | --- |
| 2026 recommendation | 2011–2025 | 2018–2025 | 14; COPA 7 |
| 2027 prep / proposal | 2011–2026 | 2018–2026 | 15; COPA 8 |

Every year in the period is required. Both appropriation and workforce averages include the latest ordinance and exclude the proposal year. For example, the 2027 cycle includes the 2026 **ordinance** values; the 2026 cycle excludes the 2026 **recommendations**. Future cycles advance the rate period through their configured `previousYear`; their historical datasets must also be connected. COPA starts in 2018 to avoid the IPRA/COPA transition. The heading and source note use the same end year as the calculation.

For example, budgets of 100 → 120 → 100 produce annual changes of +20% and −16.67%, averaging **+1.67%**. CAGR would be 0% because the endpoints are equal; the old endpoint-based calculation has been replaced.

The inflation-adjusted appropriations rate uses the **same arithmetic average and period** as the nominal rate, after applying the supplied dollar factors to each annual budget:

```text
Adjusted budget[year] = nominal budget[year] × factor[year]
Annual adjusted change = (adjusted budget[year] − adjusted budget[year − 1]) / adjusted budget[year − 1]
Inflation-adjusted rate = average of annual adjusted changes × 100
```

| Proposal cycle | Both rate periods | COPA period | Dollar base | Factor table |
| --- | --- | --- | --- | --- |
| 2026 recommendation | 2011–2025 | 2018–2025 | 2024 dollars | `DOLLAR_2024_FACTORS` |
| 2027 prep / proposal | 2011–2026 | 2018–2026 | 2025 dollars | `DOLLAR_2025_FACTORS` |

Each `BUDGET_CYCLES` entry pins an `inflationYear`; `INFLATION_FACTORS_BY_YEAR` selects its table. This sets the dollar base independently of the rate period, which ends at `activeCycle.previousYear`. For the summary rate, years after the supplied factor table ends retain their nominal values (factor 1), matching the analyst's spreadsheet. Thus 2026 retains its nominal amount for the 2027 cycle, and 2025 retains its nominal amount for the 2026 cycle. The generator does not retrieve CPI. Missing factors within the supplied historical period remain unavailable rather than receiving this fallback.

The equivalent spreadsheet formula for the 2027 cycle, with 2011 in column B and 2026 in column Q, is `=ArrayFormula(AVERAGE((C2:Q2-B2:P2)/B2:P2))` for nominal appropriations and `=ArrayFormula(AVERAGE((C3:Q3-B3:P3)/B3:P3))` for adjusted appropriations. Proposed 2027 is excluded from both.

**Office of the Mayor example:** the supplied 2011–2026 nominal amounts give **10.8964386671%**, displayed as **10.9%**. The supplied rounded adjusted amounts give **8.5425675411%**, displayed as **8.5%**. The generator multiplies nominal amounts by the full supplied factors without rounding intermediate budgets, so its unrounded result can differ slightly from the rounded spreadsheet inputs.

Both rates require every annual budget and nonzero prior-year values. A zero final budget is valid; a zero intermediate budget prevents the next annual percentage change. Missing or invalid historical factors, missing budgets, or a period with no annual intervals produce an unavailable rate. Workforce has no inflation-adjusted rate. Manual summary rate overrides remain supported. Existing saved graphic exports and calculation previews retain their saved values until regenerated.

## 2. Department Appropriation Over Time

**What you see:** a line with shaded area showing annual department budgets, 2011–2026. Export ID: `appropriations`.

**Source:** each year's City appropriations dataset. In recommendation mode, 2011–2025 use ordinance datasets and 2026 uses recommendations. Prep mode substitutes the 2026 ordinance.

**Manipulation:** match the department, identify the annual appropriation amount field, and sum that field across every matched row. This includes all matching funds and accounts; the chart is not restricted to local funds. The **Inflation adjusted (year dollars)** switch changes the plotted history, axis, tooltips, and details table. The switch is off by default (nominal dollars). Adjusted values multiply each annual budget by its supplied factor in **2024 dollars for the 2026 proposal** or **2025 dollars for the 2027 proposal**, using the same supplied factors as the summary. The summary retains nominal amounts for years after the factor table ends; this chart leaves those years as gaps. Raw budgets and editor inputs remain nominal. The proposed-year point, connecting line segment, and shaded area are muted gray; ordinance years retain the blue treatment.

**Illustration:** three matched rows of $8 million, $2 million, and $500,000 become one annual point of **$10.5 million**.

Missing or unusable years remain gaps, and the line does not bridge them. The dollar axis starts at zero for every department; its upper limit adjusts to fit the largest annual budget. At least two usable years are required to draw this chart.

The adjusted view leaves years without a supplied factor as gaps and lists them below the chart. Currently the 2024-dollar table ends in 2024, so 2025–2026 are gaps for the 2026 proposal; the 2025-dollar table ends in 2025, so 2026 is a gap for the 2027 cycle. Factors are never assumed to be 1 for uncovered years. An adjusted view with fewer than two usable points can show individual points or only gaps.

**Export behavior:** Astro ZIPs automatically include both nominal and inflation-adjusted appropriation views, separate SVG files for each, and a working switch in the HTML fragment. The selected generator view is the default; standalone SVG downloads preserve that selected view. Adjusted tooltips include both adjusted and nominal amounts. Each view has its own accessibility IDs and metadata (`priceBasis`, `dollarBaseYear`, and `missingInflationFactorYears`). The shared script switches views and dismisses any open tooltip, without fetching or recalculating data. Missing factors remain gaps and are explained beside the adjusted chart.

### Recovered IPRA history

Verified against the public City APIs on October 15, 2026. The missing appropriation years use department number 56 and the name `IPRA`. The amount field was already readable; the generator needed the historical department match.

| Year | Ordinance appropriations | Dataset | API amount field |
| --- | ---: | --- | --- |
| 2012 | $7,869,091 | [8ix6-nb7q](https://data.cityofchicago.org/d/8ix6-nb7q) | `_ordinance_amount_` |
| 2013 | $8,293,094 | [b24i-nwag](https://data.cityofchicago.org/d/b24i-nwag) | `appropriation_ordinance` |
| 2014 | $8,293,507 | [ub6s-xy6e](https://data.cityofchicago.org/d/ub6s-xy6e) | `_ordinance_amount_` |
| 2015 | $8,452,010 | [qnek-cfpp](https://data.cityofchicago.org/d/qnek-cfpp) | `_ordinance_amount_` |
| 2016 | $8,460,483 | [36y7-5nnf](https://data.cityofchicago.org/d/36y7-5nnf) | `_ordinance_amount_` |

The same matching correction restores workforce for 2012–2016. Supporting the plural `total_budgeted_units` field also restores 2011 workforce. Verified totals are 97, 99, 99, 99, 98, and 97 positions/FTEs for 2011–2016, respectively. The test fixture in `tests/fixtures/ipra-history.json` retains the relevant API fields from matching rows and records each source dataset. These are calculated chart totals, not manually substituted values.

## 3. Departmental Budgets with Estimated Fringe

**What you see:** stacked annual bars for 2018–2027: departmental appropriations, calculated full-time fringe, and estimated part-time fringe. Export ID: `estimated-fringe`.

**Source:** `DEPARTMENT_FRINGE_CSV`, embedded from [departmental fringe by year - master.csv](departmental%20fringe%20by%20year%20-%20master.csv). Rows match by department number and year. This chart takes even its appropriation component from the CSV rather than the live appropriation chart.

**Manipulation:** strip currency formatting and add the three supplied components:

```text
Total = departmental appropriations + full-time fringe + part-time fringe
```

The generator does not estimate benefit rates or calculate fringe from salaries. Those calculations happened upstream of the supplied CSV.

**COPA example:** the CSV's 2027 row contains $16,978,005 in appropriations, $11,129,911 in full-time fringe, and $0 in part-time fringe. The stack totals **$28,107,916**. Display labels may round dollars. Rows marked Proposed in the CSV use gray shades; the supplied 2027 rows are proposed and 2026 rows are ordinance. Switching cycles does not replace this CSV snapshot.

All three components must be present and valid to use a year; a missing component leaves a gap. These values stay the same across cycles and use the ordinance/proposed status supplied in the CSV.

## 4. Department Local Fund Actuals

**What you see:** stacked bars for 2022–2025, with blue for budget spent and pale blue for budget unspent. Export ID: `local-funds`.

**Sources:** local-fund budgets come from annual City appropriations APIs. Actuals and encumbrances come from `LOCAL_ACTUALS_CSV`, embedded from [Department Appropriations & Positions Over Time - Actuals.csv](Department%20Appropriations%20%26%20Positions%20Over%20Time%20-%20Actuals.csv). The underlying provenance of that BGA extract is not established by the generator.

**Manipulation:** after matching the department, include API rows whose `fund_type` says local. If that field is absent, accept fund descriptions containing “Corporate Fund” or “Local.” Sum their budget amounts. Match the actuals extract by code, with a normalized-name fallback.

```text
Actual spend = actuals + encumbrances
Budget spent = min(actual spend, budget)
Budget unspent = max(budget − actual spend, 0)
```

On initial load, the code prefers the extract's precomputed “Actual & Encumb” value when it is nonzero; otherwise it adds the components. Editing the chart recalculates the sum from actuals and encumbrances.

**COPA example:** the 2024 extract has $14,545,850 in actuals and $4,397 in encumbrances, totaling **$14,550,247**. Against a $16,756,984 local-fund budget, the chart shows **$2,206,737 unspent**, or about **86.8% spent**.

“Spent” here includes encumbrances—committed funds as well as actual expenditures. The blue stack is capped at the budget, but the displayed percentage uses uncapped actual spend divided by budget, so it can exceed 100%.

If no actuals row matches, the chart shows budget-only information; the pale bar does not establish that nothing was spent. Also, blank or unparseable numeric cells inside a matched CSV row become zero during parsing, so they are not reliably distinguished from true zero actuals.

## 5. Department Budgeted Workforce

**What you see:** stacked annual bars combining budgeted positions and full-time equivalents (FTEs), 2011–2026. The colored stacks and legend distinguish annual positions, monthly positions, hourly positions, monthly FTEs, and hourly FTEs. The proposed year uses a distinct gray shade for each component. Component counts remain available in the tooltips and data table. Export ID: `workforce`.

**Source:** City Positions and Salaries datasets, with ordinance/recommendation selection following the budget cycle.

**Manipulation:** each matched row contributes to one of five components. For schemas containing units and position-control information, the code uses the following rules:

| Row type | Contribution |
| --- | --- |
| Annual, position controlled | Budgeted units as annual positions |
| Annual, not position controlled | Zero |
| Monthly, position controlled | Budgeted units as monthly positions |
| Hourly, position controlled | Budgeted units as hourly positions |
| Monthly, not position controlled | Budgeted units ÷ 12 as monthly FTEs |
| Hourly, not position controlled | Budgeted units ÷ 2,080 as hourly FTEs |

The total adds all five components. With no control value, the unit-based branch treats the quantity as annual positions; unknown unit labels also fall back to annual positions. Older schemas use a numeric position/FTE field selected by the code. This is why simply summing a field without inspecting the annual schema can give a different answer.

**Illustration:** 10 controlled annual positions, 24 noncontrolled monthly units, and 1,040 noncontrolled hourly units contribute **10 + 2 + 0.5 = 12.5 positions/FTEs**.

Position/FTE counts display as whole numbers in charts, tooltips, details tables, the summary, and position-change graphics. Calculations, editor inputs, and exported numeric data retain fractional values; percentages keep their existing precision. Components and totals round independently, so displayed components can differ from a displayed total by rounding.

This measures authorized budget capacity, not actual employees. It combines position counts and FTEs according to these rules, so it should not be read as a headcount survey.

## 6. Department Vacancies

**What you see:** monthly stacked bars showing filled positions, persistent vacancies, and other vacancies. The 2026 snapshot uses February–September 2025; the 2027 snapshot uses January–September 2026. Export ID: `vacancies`.

**Source:** `VACANCY_AGGREGATE_CSV`, embedded from [Vacancies Over Time - MASTER vacancies.csv](Vacancies%20Over%20Time%20-%20MASTER%20vacancies.csv). The standalone CSV has additional later-month columns; the embedded chart snapshot stops at September. The generator does not fetch the live City vacancy endpoint.

**2027 cycle source:** `VACANCY_AGGREGATE_2026_CSV`, embedded from `2026 Vacancies Over Time - MASTER vacancies.csv`. Vacancy data is one year behind the snapshot year. Match by department code and use 2026 budgeted annual positions, supplied persistent counts, and monthly vacancy totals. Only months with supplied data are included; blank October–December columns are omitted. A blank cell within the reporting period remains missing for that department; a supplied zero remains zero. The average uses available months only. COPA has 150 budgeted positions and 20 persistent vacancies: January has 30 total vacancies (120 filled, 20 persistent, 10 other; 20.0% vacant); September has 35 (115 filled, 20 persistent, 15 other; 23.3% vacant). Replace the embedded CSV snapshot when the file changes.

**Manipulation:** use the extract's fixed reporting-year budgeted annual-position count and supplied persistent-vacancy count, then calculate each month:

```text
Persistent = min(supplied persistent count, month's vacancies)
Other vacancies = max(month's vacancies − persistent, 0)
Filled = max(budgeted positions − month's vacancies, 0)
Vacancy rate = month's vacancies / budgeted positions
```

The reported average vacancy rate is the arithmetic mean of available monthly rates (eight months in 2025; nine in 2026). Persistence is supplied by the aggregate file; this path does not independently establish which positions remained vacant.

**COPA example:** the embedded row has 154 budgeted positions and 13 persistent vacancies. February has 22 total vacancies, yielding **132 filled + 13 persistent + 9 other vacant**, with a vacancy rate of **14.3%**. September has 30 vacancies, yielding **124 + 13 + 17**, or **19.5% vacant**.

The denominator comes from the vacancy extract, independently of the workforce chart. Legacy 2025 blank numeric aggregate cells are parsed as zero; 2026 blanks remain missing.

## 7. Persistent Vacancies by Title

**What you would see:** ranked horizontal bars of persistent vacancy counts by job title, with a details table. Export ID: `persistent-vacancies`.

**2027 cycle:** uses an embedded snapshot of `2026 Vacancies Over Time - Persistent Vacancies Jan-Sept.csv` (January–September 2026). Match by department code, sum the supplied `PERSISTENT VACANCIES` counts by title across all funds and organizational units, and rank descending. `COMBO CODES` counts vacancy identities separately from vacant positions. COPA has 20 persistent vacancies across 14 identities; Investigator-COPA contributes 5. The CSV supplies the persistence analysis; the generator does not reconstruct monthly persistence. The chart shows every title in one ranked block and grows vertically to fit; the public export needs no pagination. Existing SVG/ZIP exports, tooltips, and editing apply. Update the embedded `PERSISTENT_VACANCIES_2026_CSV` when replacing the source file.

The separate 2026 MASTER vacancies extract supplies the monthly chart for the 2027 cycle.

**2026 cycle status:** unavailable with the embedded aggregate source. That file supplies counts but no title identities, and `INTERNAL_VACANCY_ROWS` is currently empty. An aggregate match takes precedence, so simply adding detailed rows for that same department would also require changing the source-selection logic.

**Implemented calculation for detailed rows:** identify a vacancy group by division, section, subsection, and title; require it to have vacancies in every configured month; take its smallest monthly vacancy count; then add persistent counts by title and sort descending.

**Illustration:** an investigator group with 3 vacancies in February, 2 in March, and at least 2 in every remaining month contributes **2 persistent vacancies**. A group missing from one month contributes none.

This infers persistence within organizational/title groups. It does not track a uniquely identified individual job slot throughout the period.

## 8. Top 10 Largest Department Appropriations

**What you see:** horizontal bars ranking the selected department's largest appropriation accounts in the latest available budget. Export ID: `largest-appropriations`.

**Source:** the latest year's City appropriations API: 2026 recommendations in recommendation mode, 2026 ordinance in prep mode.

**Manipulation:** group matched department rows by **account code plus normalized account label**, sum their amounts across funds and organizational subdivisions, retain positive totals, sort largest first, and take the first 10. Fewer than 10 positive groups produce fewer bars. Bars remain blue for both the proposed budget and the ordinance baseline.

**Illustration:** three rows for the same code and normalized “Salaries” label containing $6 million, $3 million, and $1 million become one **$10 million** bar. The chart ranks that total against the other account groups.

This ranks accounts within one department. Distinct normalized labels can split the same account code into separate groups.

## 9. Budget Floor

**Current status:** a placeholder with no connected source, implemented formula, or export. The floor's inputs and methodology still need to be supplied.

**Illustration only:** a future graphic might compare a department budget with a required minimum. The current generator makes no such calculation and defines no rule for that minimum.

## 10. Net and Percent Position/FTE Changes

**What you see:** horizontal bars of net changes by job title, accompanied by percent changes. Export ID: `position-changes`.

**Source:** the previous and current Positions and Salaries datasets—2025 ordinance and 2026 recommendation in recommendation mode.

**Manipulation:** apply the workforce normalization from card 5, then group by department code, title code, and normalized title text. Compare the union of groups in both years, treating an absent group in an otherwise loaded year as zero.

```text
Net = current positions/FTEs − previous positions/FTEs
Percent = net / previous positions/FTEs
```

Retain changes larger than `0.000000001` in absolute value and sort by signed net change, largest increases first. This is not a ranking by absolute size.

**Illustration:** a title going from 10 to 8 shows **−2 and −20%**. A new title going from 0 to 3 shows **+3**, with no defined percent change. A removed title going from 4 to 0 shows **−4 and −100%**.

A changed title code or normalized title name can appear as a removal and an addition rather than a matched title. There is no manual crosswalk for renamed titles. This chart is unavailable in the configured 2027 prep cycle.

## 11. 2025 Actual Spend, Local Funds

**What you see:** horizontal stacked bars of 2025 actual spending and unspent budget by appropriation category, largest actual spending first. Blue represents actual spending and pale blue represents unspent budget. Each row shows the budgeted total and unspent amount; a dark tick marks the budget. The title is **2025 Actual Spend, Local Funds**. Export ID: `actual-spend-categories`. It is available in the **2027 prep / proposal cycle**; the 2026 cycle shows an availability note and does not export this card.

**Source:** the 703 rows in the supplied [2025 FOIA response actuals.xlsx - formatted.csv](2025%20FOIA%20response%20actuals.xlsx%20-%20formatted.csv), embedded as `ACTUAL_SPEND_2025_CSV`. This chart does not need a live API request. The standalone CSV and embedded snapshot must be updated together when new data is supplied.

**Manipulation:** match **Department Number**, group by **Appropriation Account (100s range)**, and sum the **ACTUAL** column across all funds present in this supplied local-funds extract. Labels use **APPR. DESCRIPTION**. The chart uses all of those supplied funds, including enterprise and special-purpose funds, rather than restricting to Corporate Fund 100. It does not independently classify funds through an API. Category `0` (Personal Services) is a valid category.

Actual spend excludes encumbrances. **Unspent = max(budget − actuals, 0)**, so this unspent amount includes encumbered funds; it does not mean those funds are uncommitted. Tooltips and the data table show actual spending, budgeted totals, and unspent amounts. They omit encumbrances, account codes, fund codes, source variance, and calculation explanations. The source fields remain available internally for audit and export metadata. For ordinary nonnegative values, the actual-spend and unspent segments add up to the budgeted total. Overspending remains visible as actual spending extending beyond the budget tick, with zero unspent and an explicit over-budget tooltip amount. An unknown budget leaves the actual-spend bar visible without an unspent segment. Negative actuals are shown left of zero, and the budget tick remains explicit. Dashes parse as zero; parentheses parse as negative amounts; blank or invalid numeric values remain unknown. A category with an unknown actual amount has no bar. Negative actuals draw to the left of zero; zero spending remains a valid value. Departments absent from the extract remain unavailable, rather than showing zero spending.

**COPA example:** six categories total **$14,214,591 in actual spending**. Personal Services is **$13,065,031**; Contract Services is **$604,494**, with **$1,680** in encumbrances shown separately. The contract-services budget is **$1,004,605**, so its stack shows **$604,494 actual spend + $400,111 unspent**; the latter includes the separately reported $1,680 in encumbrances. Open the [COPA actual-spend preview](previews/copa-2025-actual-spend.html).

The graphic supports session edits to category labels, budgets, and actuals, plus SVG and Astro ZIP exports with frozen tooltips and numeric metadata. Source variance remains the original supplied value when other fields are edited. Changing departments or budget cycles clears the chart and its editor. Future cycles need an explicitly configured actual-spend year and a matching supplied dataset.

## 12. Net and Percent Appropriation Changes

**What you see:** horizontal bars of dollar changes by appropriation account, with percent changes. Export ID: `appropriation-changes`.

**Source:** the previous and current appropriations datasets—2025 ordinance and 2026 recommendation in recommendation mode.

**Manipulation:** group each year's department rows by the **Appropriation Account** identifier (`appropriation_account` in the City API), summing across funds and subdivisions. Match that identifier across years, allowing numeric padding differences such as `0005` and `5`. Display **Appropriation Account Description** (`appropriation_account_description`), preferring the current year's description and using the previous year's for removed accounts. Legacy account-code field aliases remain supported; a missing account identifier stops the comparison rather than matching on descriptions. Compare all groups present in either year, treating an absent group as zero:

```text
Net = current appropriation − previous appropriation
Percent = net / previous appropriation
```

Retain changes greater than $0.49 in absolute value and sort by signed net change, largest increases first. Unlike the top-10 graphic, this includes all qualifying changed groups and can include reductions or negative amounts.

**Illustration:** an account rising from $200,000 to $250,000 shows **+$50,000 and +25%**. A new account has no defined percentage; a fully removed positive account shows −100%.

Name and spelling changes do not split an account when its code stays the same. New codes and codes that drop out remain additions and removals. Descriptions are display labels only and never the matching key; different codes with identical descriptions remain separate accounts. This chart is unavailable in the configured 2027 prep cycle.

## What editing and exporting do

The editors change the current graphic's values and text in memory. Derived values recalculate: fringe totals, workforce totals, spent/unspent amounts, vacancy rates, and net/percent changes. Missing years can also receive manual values.

Editing the appropriation or workforce history refreshes the summary, except fields explicitly overridden in the summary retain those overrides. Editing the summary does not change the histories. Other cards remain independent: changing an annual appropriation does not update account rankings or the appropriation-change chart.

Edits reset on reload or department/cycle changes. They do not update City APIs or the source CSVs. Export before leaving the selection to preserve the edited result.

Exports freeze the current SVG and tooltip values. ZIPs include chart HTML, shared styling and tooltip code, a manifest, and an offline preview; the summary also includes `summary.json`. They make no fresh data requests. Unavailable charts are skipped; the two unfinished placeholders are listed as unsupported. Source notes, warnings, and edit status remain in the manifest rather than the article's chart fragment. See [EXPORTS.md](EXPORTS.md) for the workflow.

### How the active summary.json reaches Astro

The file at `bga-budget-snapshots-astro/src/graphics/2027/ipra-copa/2026-recommendation/summary.json` is a **saved export**, not an input used by the live generator. Its actual comparison is 2025 versus proposed 2026, despite the outer `2027` folder.

Astro loads that JSON, checks its department and cycle against the manifest, and uses the numeric budgets to build the article's three hero metrics. It recomputes changes from `previous` and `current`, rather than trusting saved `net` and `percent` fields. Editing only this JSON therefore changes those hero metrics after a rebuild, but does not redraw the separately saved summary SVG or other graphics.

In the JSON, `percent: 0.045819...` means **4.5819…%**. Fields ending in `Pct` already use percentage units: `averageRatePct: 1.83145...` means **1.83145…%**. Labels use the JSON's comparison years.

Article paragraphs such as `[budget-graphic id="appropriations"]` are replaced by exported inline graphics using the article's configured graphics folder. The published graphics use these frozen files.

## Source lookup and code map

The current API pins below are configuration recorded in the code, not a live catalog verification. Dataset pages follow `https://data.cityofchicago.org/d/<dataset-id>`; JSON requests use `/resource/<dataset-id>.json` on the same host.

| Year | Appropriations | Positions and Salaries |
| --- | --- | --- |
| 2011 | `drv3-jzqp` | `g398-fhbm` |
| 2012 | `8ix6-nb7q` | `4n2t-us8h` |
| 2013 | `b24i-nwag` | `78az-bt2s` |
| 2014 | `ub6s-xy6e` | `etzw-ycze` |
| 2015 | `qnek-cfpp` | `f338-e9ns` |
| 2016 | `36y7-5nnf` | `ipsp-k4xh` |
| 2017 | Exact City catalog title lookup | `vcfx-7p4u` |
| 2018 | `6g7p-xnsy` | `9d7d-7f2b` |
| 2019 | `h9rt-tsn7` | `7zkb-yr4j` |
| 2020 | `fyin-2vyd` | `txys-725h` |
| 2021 | `6tbx-h7y2` | `gcwx-xm5a` |
| 2022 | `2cr6-8u6w` | `v2mx-icwv` |
| 2023 | `xbjh-7zvh` | `pkjy-hzin` |
| 2024 | `x394-e874` | `jeta-egyx` |
| 2025 | `t59y-fr3k` | `2bp7-w85v` |
| 2026 recommendation | `axxr-vais` | `wd4x-2xf8` |
| 2026 ordinance | `6694-f78c` | `v2t2-vajc` |

Useful names to search within `index.html`:

| To inspect | Code |
| --- | --- |
| Cycle/year and inflation settings | `BUDGET_CYCLES`, `PINNED`, `POSITION_PINNED`, `DOLLAR_2025_FACTORS` |
| Department matching | `departmentMatch`, `departmentCoreName` |
| Summary and rates | `renderSummaryTable`, `averageAnnualChange`, `summaryRows` |
| Annual appropriations | `loadYear` |
| Fringe CSV and sums | `DEPARTMENT_FRINGE_CSV`, `fringeRowsFromCsv`, `fringeForDepartment` |
| Local-fund classification and actuals | `isLocalFundRow`, `localActualsRows`, `loadLocalFundsYear` |
| Workforce normalization | `positionContribution`, `loadWorkforceYear` |
| Monthly/title vacancies | `loadVacancies`, `vacancyIdentity`, `buildPersistentVacancies` |
| Largest accounts | `loadLargestAppropriations` |
| Change charts | `loadPositionChanges`, `loadAppropriationChanges` |
| Manual edits | `EDITOR_CONFIGS`, `normalizeEditedData`, `redrawEditedGraphic` |
| Frozen packages | `frozenGraphic`, `exportForAstro` |

Astro's integration is in `bga-budget-snapshots-astro/src/lib/graphics.js` (`insertBudgetGraphics`, `loadBudgetSummary`) and `src/lib/transform.js` (`deriveSummaryMetrics`).

### Snapshot titles and source years

The 2027 cycle is labeled **2027 budget proposal**. Titles follow the 2026 naming style: `[Department] Budget Summary`, `[Department] Appropriation, Chicago City Budgets 2011–2027 (Proposed)`, `[Department] Budgeted Workforce, 2011–2027 (Proposed)`, and `[Department] Top 10 Largest Appropriations, 2027 proposed`. The page title is **2027 Budget Proposal**. These editorial titles do not change the underlying source years, dataset selection, calculations, colors, axis labels, or source notes: budget history currently ends with the 2026 ordinance, vacancy graphics cover 2026, and local fund actuals end in 2025. Source-year labels remain in historical graphics and data details.


## Data downloads

Each available graphic has **Download data (CSV)**. The dashboard also has **Download all data (.xlsx)**: one Excel workbook for the current department and budget cycle, with one data sheet per available graphic. Budget floor and charts without usable data are excluded. Downloads are disabled while loading.

Downloads use the current edited values, retain full numeric precision, identify percentages in percent units, and leave missing values blank. Real zeros remain zero. Persistent-vacancy graphics and downloads include every title. Appropriation downloads always include the year, nominal appropriation, inflation factor, and inflation-adjusted appropriation, with the dollar year in the headings. The inflation toggle does not change these download columns. Downloads contain only chart labels and values; sources, snapshot metadata, editing flags, and About sheets are omitted.

Astro ZIPs contain a CSV beside each graphic and name it in the manifest. Exported HTML includes a **Download data (CSV)** link that embeds the same frozen data, so public pages and offline previews need no API or extra script for downloads. Re-export and replace existing graphics packages to add these links to already published graphics; older exports remain compatible. Public pages offer per-graphic downloads; the combined workbook is a dashboard control.

## Departmental Fund Comparison

**What you see:** a fund table for the selected department and budget cycle, with budgeted and proposed amounts, dollar and percent changes, and each fund’s share of proposed departmental funds. Export ID: `fund-comparison`. Fund codes are used internally to match rows, but are omitted from the display and CSV.

**Source:** the prior-year ordinance and current-year recommendation appropriations APIs, using the same department matching and amount selection as the other appropriation graphics. For the 2027 cycle these are [2026 ordinance](https://data.cityofchicago.org/d/6694-f78c) and [2027 recommendations](https://data.cityofchicago.org/d/pptx-hhw3). All appropriation accounts and fund types are included.

**Calculation:** sum each year’s department appropriation rows by fund code. Net = proposed − budgeted; percent change = net ÷ budgeted; recommended share = fund proposal ÷ total departmental proposal. Rows sort by proposed amount. A missing fund counts as zero only when department rows load in both years; missing departments or invalid fund amounts produce an error instead of a zero comparison. New positive allocations show “New Fund” when their baseline is zero. Amounts retain full precision in downloads; displayed percentages round to one decimal.

**Mayor example:** verified against the City APIs on October 23, 2026. The 2026 budget totals $16,419,712 and the 2027 proposal totals $18,265,651, an increase of $1,845,939 (11.2%). Corporate Fund amounts are $11,410,168 and $12,562,589. Sewer Fund funding rises from $0 to $81,437, while Coronavirus Local Fiscal Recovery funding falls from $169,000 to $0. The seven-fund comparison is covered by the retained API fixture in `tests/fixtures/mayor-funds-2026-2027.json`.
