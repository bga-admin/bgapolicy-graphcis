# 2027 overview graphics generator

Open [the overview tool](previews/2027-overview/index.html) in a browser or Live Server. It follows the original budget graphics generator’s card layout and styling, with the shared custom SVG renderer, interactive tooltips, editable data and labels, phone-width previews, and HTML, SVG, CSV, project JSON, and Astro ZIP exports.

## What belongs in the article

The [supplied Google Doc](https://docs.google.com/document/d/1KQJNAFdP5T6ss7lpLsHyYHZibGrzLt0MUhHLpuau1kg/edit) contains **19 embedded charts plus its summary table**. The default tool view and [Astro ZIP](previews/2027-overview/2027-overview-astro.zip) contain these **20 graphics in document order**. See the [complete document comparison](previews/2027-overview/comparison.md).

The [supplied workbook](https://docs.google.com/spreadsheets/d/1UptHjS1gPGtrTo7ykcTWx4EhFrhnuWTQBW930NBUM9M/edit) contains four charts absent from the article: the separate inflation-adjusted appropriation history and three department-share donuts. These remain available under **Additional workbook charts** and are excluded from the default export. Their existing folders and story IDs still work.

The first pass missed two article items, now included:

- **Snapshot: Appropriation & Staffing Changes from 2026 Budget**, the mixed-unit summary from `bloc`. Currency, position counts, percentages, and N/A cells retain their proper formats. Summary growth rates remain the analyst-supplied values.
- **Departmental Net Overspend (Local Funds), 2022-2025**, with the original CPD, CFD, and CCHR legend labels. This chart links to a different workbook that returns `PERMISSION_DENIED`. Its historical values were recovered from the chart image embedded in the accessible Doc. All three 2025 amounts were independently verified by aggregating budgets, actuals, and encumbrances in the checked-in `2025 FOIA response actuals.xlsx - formatted.csv`. CPD’s 2025 overrun is $145,766,930. Years without visible CFD/CCHR marks remain blank, rather than inferred as zero.

Chart titles and series labels follow their sources. Funding-source percentages use horizontal stacked bars, matching the article’s embedded chart and keeping department names horizontal. The generator’s supported chart types and brand palette provide the other layouts.

## Edit and export

- Open **Edit graphic** on a card to change its title, subtitle, source, note, numeric values, or first-row legend labels. Paste a spreadsheet range into the existing table. Invalid numbers identify the cell and block exports.
- **Download SVG**, **Download HTML**, **Export for Astro**, **Download data**, **Copy marker**, and **Save graphic project** apply to the current edited graphic.
- **Include in Astro export** controls the bulk export. Optional workbook charts start unchecked. Filtering the view does not change export selection.
- **Save project** saves all chart edits, visibility choices, and the selected price basis. **Open project** restores that file or an individual overview chart project. Browser storage also retains edits when available. Use **Reset this graphic** to restore its source settings.
- **Preview at phone width** constrains every chart to 375px. SVG geometry scales like the original generator; long department charts still need review at the article’s final width.

The **Total City of Chicago Appropriations, Original and Inflation-adjusted (2025 CPI-U Chicago)** chart has the original generator’s price switch. It starts with **Total Appropriations**; switching selects **Total Appropriations in 2025 Dollars**. Both series retain their source legend titles. Edits retain both columns. Standalone HTML and Astro exports include a functioning switch and both views. SVG downloads contain the currently selected view; Astro ZIPs also contain separate original and adjusted SVGs.

Paste each `[budget-graphic id="overview-2027-…"]` marker into its own WordPress Paragraph block. The exports are installed under `bga-budget-snapshots-astro/src/graphics/2027/budget-overview/`; the existing importer discovers their ID-named folders. No `snapshots.js` change is needed. The [catalog](../bga-budget-snapshots-astro/src/graphics/2027/budget-overview/catalog.json) records source chart IDs, sections, optional status, and markers. This work does not edit Google files or publish an article.

## Source and calculation notes

The frozen October 21, 2026 inputs are [workbook values](data/2027-overview-source.json), [document chart references in order](data/2027-overview-article.json), and [embedded overspend chart values and provenance](data/2027-overview-overspend.json). Exact source amounts drive the graphics. Fractional percentages are converted to percentage units; budget-share differences are labeled percentage points.

1. **Inflation:** supplied adjusted values end in 2025. The price switch leaves 2026–2027 blank in the adjusted view and explains the missing factors. No new CPI factors are inferred. The optional adjusted history uses a corrected 2011–2025 title.
2. **Citywide persistent vacancies:** the source divides by filled positions (about 8.2%). The share of budgeted full-time positions is `2,489 / 34,232 = 7.3%`, which the exported note explains. Overall average vacancies remain 11.2%.
3. **Departmental vacancy percentages:** the source column labeled nonpersistent vacancies contains total September vacancies. Its summed percentage therefore double-counts persistent vacancies. The export uses disjoint persistent and nonpersistent counts from `dept sept vacan` with budgeted positions from `dept pct vacan`, retaining the original legend labels. DOIT is 22.9% persistent plus 7.6% nonpersistent, totaling 30.6%.
4. **CDBG:** blank exact-value cells for 2026–2027 correspond to explicit zeros in the same tab’s rounded block following its merger into grants. Only those two cells use the supplied zeros.
5. **Department funding:** absent fund categories count as zero, and each row’s components reconcile to its supplied total. Finance General stays included because it appears in the source chart.
6. **Actuals:** citywide spend includes encumbrances and shows the workbook’s 86.6% average. The article’s 87.5% departmental average is not substituted. The overspend comparison follows the embedded article chart; underlying source totals can differ by a few dollars due to source rounding.

## Rebuild and verify

```sh
node budgetsnapshot-graphics-generator/build-2027-overview.mjs
node --test budgetsnapshot-graphics-generator/tests/2027-overview.test.mjs budgetsnapshot-graphics-generator/tests/overview-editor.test.mjs
```

The builder uses frozen local inputs and the shared renderer; it makes no network requests. It writes a self-contained overview tool from `overview-tool-template.html`, the original generator’s styles, and `overview-graphics-core.js`. It also refreshes the installed exports, comparison, catalog, and default article ZIP. Refresh connected source values intentionally before rebuilding if the analysis changes.
