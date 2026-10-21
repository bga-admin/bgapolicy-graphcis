# Custom graphics generator

Open [custom-graphics.html](custom-graphics.html) directly in a browser. The snapshot generator also links to it in its header. This separate tool uses the snapshot palette, typography, chart marks, and source-note styling. It uses your supplied data; it does not fetch budget data.

## Enter and edit data

- Paste a copied Excel or Google Sheets range into a grid cell. Pasting begins at that cell and expands the table. At A1, include column headers. Existing cells outside the pasted range stay in place; use **Replace table with pasted data** to replace the whole dataset.
- Edit cells directly. Tab moves between inputs, up/down moves between rows, and Enter moves down (adding a row at the bottom). Use **+ Row**, **+ Series**, or the × controls to change the table's size.
- You can also paste CSV/TSV text or import a `.csv`/`.tsv` file. Quoted commas, line breaks, quotes, and tabs are supported. Maximum: 500 data rows and 20 value columns.
- The first row supplies column names, the first column supplies categories, and subsequent columns supply numeric series. A blank category is invalid if the row has values. Entirely empty rows are ignored.
- Dollars, thousands separators, percentages, and parentheses for negative amounts are accepted. Percentages use percent units: `25` and `25%` both mean 25%. Blank, `N/A`, and em/en dashes mean missing. Zero stays zero. Invalid values block exports and identify the row and column.

## Choose a visualization

| Type | Data behavior |
| --- | --- |
| Line / shaded area | One line per value column, in input order. Missing cells break the line. Shaded areas overlap; they are not stacked. |
| Grouped columns | One column per series within each category; supports negatives. |
| Stacked columns | Series stack within a category; positive and negative values stack separately. A missing component leaves a gap for the entire category. |
| 100% stacked columns | Each complete category is normalized to 100%; tooltips retain original values and add shares. Negative values are invalid. Zero-total categories have no stack. |
| Horizontal bars | One bar per series and category; supports negatives. Long labels wrap and the chart grows to show every category. |
| Scatter | First-column values are numeric X coordinates, each later column is a Y series. Row order does not change X spacing. |
| Donut | Uses only the first value column, one slice per category. Requires nonnegative values and a positive total. Tooltips include the value and share. |
| Data table | Displays all supplied series in a striped table graphic. |

Change the title, subtitle, axis titles, formatting, decimals, palette, plot height, source, notes, legend, and value labels in the left panel. Grouped, stacked, and 100% stacked columns have a **Column label angle** control: horizontal, ±30°, ±45°, ±60°, or vertical (±90°). The chart reserves space around rotated labels and saves the angle in projects and exports. Horizontal bars use X for values and Y for categories. Donut and table charts do not display axes. The 100% stacked axis always uses percentages; value formatting applies to raw tooltip values.

Use **Preview at phone width** to inspect scaling. Charts scale from their fixed SVG geometry, matching the snapshot exports; labels do not reflow at embed breakpoints. Dense charts may need fewer categories or separate graphics for comfortable phone reading.

## Export and embed

**Download HTML** creates one standalone page containing the frozen chart and inline tooltip code. It works offline and makes no API, font, or library requests. Upload the file to a host that serves HTML, enter its public URL in the generator, and copy the iframe code. The host must permit framing and inline scripts. The iframe has a fixed, editable height; check your final article at desktop and phone widths.

**Download interactive SVG** creates a standalone SVG containing native title fallbacks and scripted pointer/touch/keyboard tooltips. Open it directly, inline it in HTML, or use `<object type="image/svg+xml" data="your-chart.svg"></object>`. Browsers disable SVG scripts in `<img>` and CSS backgrounds. External-site security rules or sanitizers may remove scripts; use the HTML iframe for the most straightforward interactive embed.

Hover, tap, or Tab to a chart mark to show its tooltip. Tooltips match the snapshot generator: a dark blue panel with a bold category heading, compact 18px main value, and 12px detail rows with bold labels and white values. All tooltip numbers use aligned lining figures, and numeric values stay intact when labels wrap. Stacked-column tooltips show the raw total and every component; 100% stacked tooltips also include each component’s percentage share. With **Show value labels** enabled, stacks show their total above the column and individual labels inside segments when space permits. Marks use the normal cursor. The second palette, **Blue, gold & plum**, uses a plum third series to distinguish it from the blue first series. Escape dismisses it. SVG metadata includes the configuration and numeric data. Exports use installed Synthese/Proxima Nova fonts, with Helvetica/Arial fallbacks. The editor loads the same optional Adobe font stylesheet as the snapshot generator.

**Download data CSV** preserves the supplied values, including blank cells, rather than exporting rounded display values. Text that looks like a spreadsheet formula is prefixed with an apostrophe to prevent execution when opened in spreadsheet software.

## Astro export

**Export for Astro (.zip)** downloads a package compatible with this repository's snapshot marker importer. Set an optional unique **Astro graphic ID**, using lowercase letters, numbers, and hyphens; otherwise the generator creates one from the title. Use **Copy graphic ID** for the ID alone, or **Copy marker** for the full story placeholder. The read-only **Story marker** field always matches the ID in the Astro export.

The ZIP contains a chart HTML fragment, interactive SVG, CSV, editable project JSON, `.astro` component, `manifest.json`, compatibility stylesheet/runtime files, standalone preview, and `README.txt`. It preserves the current chart settings, including label angles. The chart's tooltip script stays inside its SVG, so the custom graphic can coexist with the existing snapshot runtime. It adds no data panel or logo.

For a regular Astro page, copy the extracted chart folder into `src/graphics/`, import its `.astro` component in your page's frontmatter, and render it:

```astro
---
import CustomGraphic from '../graphics/custom-my-chart/custom-my-chart.astro';
---
<CustomGraphic />
```

Adjust the relative import path to your page's location. No framework integration or client data requests are needed.

For a snapshot article with no graphics folder yet, copy the chart folder into `bga-budget-snapshots-astro/src/graphics/`, set the article's `graphicsFolder` in `src/config/snapshots.js`, paste the manifest's `[budget-graphic id="..."]` marker into its own WordPress Paragraph block, and rebuild.

For an article that already has graphics, copy the new chart's `.html`, `.svg`, `.csv`, `.json`, and `.astro` files into the configured folder. Append the new manifest's single `graphics` entry to the existing manifest's `graphics` array. Keep the existing manifest metadata, other entries, `budget-graphics.css`, and `budget-tooltips.js`. Add the new marker paragraph and rebuild. Each graphic needs its own ID and appears once per article.

The [supplied department chart's Astro ZIP](previews/department-budget-share-change-astro.zip) is ready to use. Each ZIP includes instructions with the exact filenames, marker, and destination for that export.

## Save and reopen

The browser saves the current project locally when storage is available. File-URL storage behavior varies by browser. **Save project** downloads a JSON file containing settings and the grid; use **Open project** to continue editing it later. Keep this file as your editable original alongside published exports. Examples replace data and chart labels with clearly labeled illustrative values.

## Verification

Run from the repository root:

```sh
node budgetsnapshot-graphics-generator/tests/custom-graphics.test.mjs
```

The tests exercise CSV/TSV parsing, numeric validation, all nine SVG renderers, missing-data gaps, negative/zero values, scatter positioning, donut geometry, XML and HTML exports, formula protection, and long charts.

## Department budget-share chart

The [department budget-share example](previews/department-budget-share-change.html) contains the 39 supplied department values as horizontal percentage bars, including negative changes and rounded zeros. Open [its project JSON](previews/department-budget-share-change.json) with **Open project** in the generator to edit it. An [interactive SVG](previews/department-budget-share-change.svg) and [source CSV](tests/fixtures/department-budget-share-change.csv) are also included. The chart preserves the supplied percentage units and department order; no period or additional calculations are inferred.

The editor's export templates encode HTML tags that Live Server uses as injection points, so the VS Code live-reload script stays outside the generator JavaScript. Regression tests exercise live-reload injection and the supplied 39-department dataset through the editor and both exports.
