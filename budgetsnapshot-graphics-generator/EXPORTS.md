# Frozen graphics exports

For a chart-by-chart explanation of sources, calculations, and examples, see [How the generator works](GRAPHICS-GUIDE.md).

Open `index.html`, select a department and budget cycle, and wait for chart loading to finish. Review the charts and any missing-data warnings before exporting.

The default 2027 cycle loads departments and proposed appropriations from `pptx-hhw3` and positions and salaries from `t952-rj49`. Histories include 2027 recommendations; change charts and the summary compare them with the 2026 ordinance (`6694-f78c` and `v2t2-vajc`). The 2026 recommendation cycle retains its original sources. Vacancies, actuals, fringe estimates, and inflation factors retain their separately supplied reporting years.

Existing Astro graphics are frozen exports. To show 2027 recommendations on an article, review and export a new package, replace its configured graphics folder, and rebuild Astro.

Each exportable chart shows its WordPress marker as normal paragraph text, with a **Copy marker** button. Paste it into a regular WordPress Paragraph block; the clipboard contains plain text, without code formatting. Copying is enabled when the chart is ready to export.

Each rendered chart has two download options:

- **Download SVG:** the frozen chart with tooltip text, keyboard focus targets, native SVG title fallbacks, and export metadata.
- **Export for Astro (.zip):** one chart plus the shared tooltip script, styles, manifest, HTML fragment, and offline preview.

**Export all for Astro (.zip)** beside Reload data packages every available SVG chart for the selected department and cycle in one download. Failed, empty, and unavailable charts are excluded and recorded in the manifest. The budget summary is included. The 2025 Actual Spend, Local Funds graphic (`actual-spend-categories`) exports in the 2027 cycle when the selected department has FOIA data. Budget floor remains an unfinished placeholder.

Exports are disabled while data is loading. Switching departments or budget cycles clears old chart renders so exports cannot mix selections. Export does not fetch data; it freezes the current chart values, including missing-year gaps. It does not certify the analysis or mark a chart approved automatically.

For the appropriations history, Astro ZIPs automatically include **both nominal and inflation-adjusted views** and a working **Inflation adjusted (year dollars)** switch. The generator's selected view becomes the initial view. Each view has its own SVG (`appropriations-nominal.svg` and `appropriations-adjusted.svg`), accessibility IDs, tooltips, and metadata. `appropriations.svg` and the standalone **Download SVG** retain the selected view. Missing inflation factors stay gaps, with a note beside the adjusted chart. The CSV contains both nominal and adjusted amounts. No live data requests are needed.

## Try an export

1. Download either ZIP and extract it.
2. Open `<department>/<budget-cycle>/preview.html` in a browser.
3. Hover over a bar/point, focus it with Tab, or tap it. Escape dismisses the tooltip. Resize the browser to check the graphic scales.
4. Disconnect the network and reload the preview. Charts and tooltips use only the extracted files; they make no API requests and load no external fonts or libraries.

The package includes:

- `<chart-id>.svg`: finished SVG with frozen tooltip values.
- `<chart-id>.html`: inline SVG with its title and a self-contained CSV download link. Editorial source notes and warnings stay in the manifest.
- `budget-tooltips.js`: one shared interaction script, with pointer, keyboard, and touch support.
- `budget-graphics.css`: shared chart and tooltip styles.
- `manifest.json`: department, budget cycle/year, UTC export timestamp, graphic IDs, warnings, and unavailable charts.
- `preview.html` and `README.txt`.

The preview uses system fonts when Inter is unavailable. SVGs scale from the layout rendered at export time; they do not redraw/reflow their labels at mobile breakpoints. Review exports at the intended article width.

## Astro handoff

Suggested storage: `bga-budget-snapshots-astro/src/graphics/<department>/<budget-cycle>/`. This first step adds the exporter only. Automatic replacement of WordPress markers is not yet implemented.

For eventual integration, insert each SVG **inline** (the HTML fragments demonstrate the wrapper) and load the shared CSS and script once per article. An `<img src="chart.svg">` displays the graphic but does not allow the parent page's script to access tooltip targets. Native SVG titles remain a fallback without JavaScript when the SVG is inline.

Manifest entries provide suggested markers such as `[budget-graphic id="appropriations"]`. The Astro integration will need to resolve these against each article's department and budget cycle. Published pages should use the exported files, without the generator or City API fetching code.

## Departmental budgets with estimated fringe

Select a department to view its 2018–2027 stacked chart: departmental appropriations + calculated full-time fringe + estimated part-time fringe. The chart uses an embedded snapshot of `departmental fringe by year - master.csv`, matched by department number. The CSV snapshot must be updated in `index.html` when the source file changes. Its years and figures remain the same across budget cycles.

CSV departments are included in the department picker, even if absent from the current City API. If the API department list fails, the picker falls back to CSV departments and the fringe chart remains usable. Absent years remain gaps. The editor can fill a missing year once all three component amounts are entered.

Use the chart's **Download SVG** or **Export for Astro (.zip)** button to extract an individual department graphic, or **Download all for Astro (.zip)** to include it with the other completed graphics for the selected department. Its export ID is `estimated-fringe`. Tooltips and the data table include each component and their total.

## Budget summary

The summary has its own Edit summary, Download SVG, Export for Astro, and Copy marker controls. Use `[budget-graphic id="summary"]` in a WordPress Paragraph block after installing its export.

Edit previous/current budgets and annual rates directly. Net and percent changes recalculate automatically. Enter rates as percentages (5 means 5%); negative rates are supported. Blank values remain unknown, and percent change from a zero baseline is undefined. Summary edits do not change the historical charts. Explicit summary overrides survive later appropriation/workforce edits; other summary fields follow those charts. Edits reset on reload or department/cycle changes.

Summary ZIP exports contain `summary.svg`, `summary.html`, and `summary.json`. JSON includes the department, budget cycle, comparison years, raw budgets, changes, and annual rates. Rates ending in `Pct` use percent units; the `percent` change field uses a ratio (0.05 means 5%). Sources, warnings, and edit status remain in the manifest.

Astro's three hero metrics now prefer `summary.json` from the configured graphics folder. They use the approved numeric budgets and recompute changes; labels show the summary's comparison year rather than the outer folder year. Department and cycle must match the manifest. Older exports without summary data fall back to the WordPress comparison table. If that table was removed, copy a fresh export including summary.json and rebuild to restore the metrics.

## 2026 persistent vacancies (2027 cycle)

Select **2027 budget proposal** to build Persistent Vacancies by Title from the embedded January–September 2026 CSV. Counts are summed by title for the selected department, including all funds. Export ID: `persistent-vacancies`. The monthly `vacancies` graphic uses `2026 Vacancies Over Time - MASTER vacancies.csv` for the same cycle: January–September 2026, one year behind the 2027 snapshot. Blank October–December columns are omitted; missing department-month values remain gaps. The 2026 recommendation cycle continues to use its existing 2025 sources.


## Data downloads

Each available graphic has **Download data (CSV)**. The dashboard also has **Download all data (.xlsx)**: one Excel workbook for the current department and budget cycle, with one data sheet per available graphic. Budget floor and charts without usable data are excluded. Downloads are disabled while loading.

Downloads use the current edited values, retain full numeric precision, identify percentages in percent units, and leave missing values blank. Real zeros remain zero. Persistent-vacancy graphics and downloads include every title. Appropriation downloads always include the year, nominal appropriation, inflation factor, and inflation-adjusted appropriation, with the dollar year in the headings. The inflation toggle does not change these download columns. Downloads contain only chart labels and values; sources, snapshot metadata, editing flags, and About sheets are omitted.

Astro ZIPs contain a CSV beside each graphic and name it in the manifest. Exported HTML includes a **Download data (CSV)** link that embeds the same frozen data, so public pages and offline previews need no API or extra script for downloads. Re-export and replace existing graphics packages to add these links to already published graphics; older exports remain compatible. Public pages offer per-graphic downloads; the combined workbook is a dashboard control.

## Departmental fund comparison

The **Fund Comparison** table compares the selected department’s prior-year ordinance with the current budget cycle’s proposed appropriations. In the 2027 cycle, it compares the 2026 ordinance (`6694-f78c`) with the 2027 recommendations (`pptx-hhw3`). Rows are summed by fund code and sorted by proposed amount; fund codes are omitted from the displayed table and CSV.

Columns show fund name, budgeted amount, proposed amount, net change, percent change from the budgeted amount, and share of all proposed departmental funds. A fund absent from one year counts as $0 only after both department-years load successfully. New positive allocations with a zero baseline display **New Fund**. Removed allocations show −100.0%; zero-to-zero changes and shares with a zero total are unavailable.

Use **Edit graphic** to adjust fund names or amounts; changes and all fund shares recalculate together. Download SVG, CSV, individual Astro ZIP, and all-graphics exports are supported. Export ID: `fund-comparison`. The table switches to stacked fund details on narrow screens.
