# Budget Snapshot Graphics Generator Handoff

This file is a quick pickup note for continuing the one-page graphics generator work in another Codex environment.

## Main File

Work in:

`budgetsnapshot-worflow/budgetsnapshot-graphics-generator/department-appropriations-2011-2026-api-dropdown-v2.html`

The user wants the graphics built one-by-one in this same standalone HTML page, not as separate files. Keep it simple and follow the style/pattern already in that HTML.

## Source References

User-provided Google assets:

- Sheet: `https://docs.google.com/spreadsheets/d/1kMcy0V9L_BMSQVwJ_SUY4L68NAmzk5t5i-S4paDVHU4/edit?gid=0#gid=0`
- Doc: `https://docs.google.com/document/d/1xzyElNYB8JLYZ4Dr5ohtDqw_OCzPsLOwphQrDD6eBnM/edit?tab=t.0`

Local reference captures:

- `data/reference/copa-workbook.json`
- `data/reference/JbqNH.csv`
- `docs/output-inventory.md`

Important: the repo docs say workbook captures are inspection/reference only, not production numeric authority. The user currently understands that the actuals/encumbrances data probably came from FOIA/internal analysis and will ask the policy analyst for provenance/source.

## Current Page Structure

The HTML currently has nine graphic cards:

1. `Department Appropriation, Chicago City Budgets 2011–2026 (Proposed)`
   - Live Socrata API.
   - Dropdown department picker is loaded from 2026 Budget Recommendations Appropriations API.
   - Historical annual appropriations use pinned City dataset IDs.
   - COPA/IPRA matching has explicit alias handling.

2. `Department Local Fund Actuals, 2022–2024`
   - Intended chart: stacked columns.
   - Blue bottom = budget spent.
   - Pale top = budget unspent.
   - Formula when actuals data exists:
     - `actualSpend = actuals + encumbrances`
     - `budgetSpent = min(actualSpend, budget)`
     - `unspent = max(budget - actualSpend, 0)`
   - Local-fund budget rows still come from the City appropriations APIs.
   - Actuals/encumbrances now come from the embedded `LOCAL_ACTUALS_CSV`, copied from `Department Appropriations & Positions Over Time - Actuals.csv`.
   - If a selected department has no matching embedded actuals row, the chart falls back to budget-only state for that department.

3. `Department Budgeted Workforce, 2011–2026 (Proposed)`
   - Live Socrata API.
   - Uses pinned Positions and Salaries dataset IDs.
   - Simple bar chart.
   - Recent fix: `findPositionField()` must prefer per-row `budgeted_unit`, not `total_budgeted_unit`. Summing `total_budgeted_unit` made Treasurer 2025 wildly too high because that field can be repeated across rows.

4. `Department Vacancies`
   - Uses embedded `VACANCY_AGGREGATE_CSV`, copied from `Vacancies Over Time - MASTER vacancies.csv`.
   - The chart is pinned to February–September 2025.
   - Budgeted positions, persistent vacancies, and total monthly vacancies come from the aggregate extract.
   - Filled positions = budgeted positions - total vacancies.
   - Nonpersistent vacancies = total vacancies - persistent vacancies.
   - The live City Workforce Vacancies endpoint is still not used because the City overwrites old monthly data.

5. `Persistent Vacancies by Title`
   - Still unplugged for title-level rendering.
   - The aggregate vacancy CSV fills the monthly vacancies chart, but it does not contain title/division/section/subsection identities.
   - To populate this card, add row-level vacancy identities to `INTERNAL_VACANCY_ROWS` or add a separate persistent-vacancy-by-title dataset.
   - Renders a ranked horizontal bar chart of persistent vacancy counts by title, plus a details table.
   - When row-level data is available, persistent title counts are calculated from title/division/section/subsection vacancy identities present in every loaded month.

6. `Top 10 Largest Department Appropriations, 2026 Proposed Chicago Budget`
   - Live Socrata API.
   - Uses the 2026 Budget Recommendations Appropriations dataset already pinned in `PINNED`.
   - Groups selected-department rows by appropriation account/code, sums the 2026 proposed amount, sorts descending, and renders the top 10 as horizontal bars.
   - This is API-derived and should not need separate data unless the analyst wants to preserve a prior manual order instead of recalculating the current top 10.

7. `Budget Floor Graphic Placeholder`
   - Placeholder only.
   - Keeps the analysis order stable.
   - The budget-floor graphic likely needs manual or analyst-provided inputs and a verified formula before implementation.

8. `Net and Percent Position/FTE Changes, 2025 to 2026 (Proposed) Budgets`
   - Live Socrata API.
   - Uses the 2025 and 2026 Positions and Salaries datasets already pinned in `POSITION_PINNED`.
   - Compares title-code/title groups for the selected department and includes only changed titles.
   - Percent change is `net change / 2025 positions/FTEs`; new titles with no 2025 base show a blank percent.
   - This graphic should not need a separate data file unless the analyst wants to override the API-derived ordering or title mapping.

9. `Net and Percent Appropriation Changes, 2025 to 2026 (Proposed) Budgets`
   - Live Socrata API.
   - Uses the 2025 and 2026 appropriations datasets already pinned in `PINNED`.
   - Compares appropriation account/code groups for the selected department and includes only changed accounts.
   - Percent change is `net change / 2025 budgeted`; new accounts with no 2025 base show a blank percent.
   - This is currently the newest/bottom card per user request.
   - This graphic should not need a separate data file unless the analyst wants to override the API-derived ordering or account mapping.

Known skipped/blocked next item:

- `2024 Actual Spend` likely needs a separate actuals/encumbrances dataset and account/category mapping. Do not substitute 2024 appropriations for actual spend.

## Pinned Dataset IDs

Appropriations IDs in the HTML:

```js
const PINNED={
  2011:'drv3-jzqp',
  2012:'8ix6-nb7q',
  2013:'b24i-nwag',
  2014:'ub6s-xy6e',
  2015:'qnek-cfpp',
  2016:'36y7-5nnf',
  2018:'6g7p-xnsy',
  2019:'h9rt-tsn7',
  2020:'fyin-2vyd',
  2021:'6tbx-h7y2',
  2022:'2cr6-8u6w',
  2023:'xbjh-7zvh',
  2024:'x394-e874',
  2025:'t59y-fr3k',
  2026:'axxr-vais'
};
```

Positions IDs in the HTML:

```js
const POSITION_PINNED={
  2011:'g398-fhbm',
  2012:'4n2t-us8h',
  2013:'78az-bt2s',
  2014:'etzw-ycze',
  2015:'f338-e9ns',
  2016:'ipsp-k4xh',
  2017:'vcfx-7p4u',
  2018:'9d7d-7f2b',
  2019:'7zkb-yr4j',
  2020:'txys-725h',
  2021:'gcwx-xm5a',
  2022:'v2mx-icwv',
  2023:'pkjy-hzin',
  2024:'jeta-egyx',
  2025:'2bp7-w85v',
  2026:'wd4x-2xf8'
};
```

## Local Funds Actuals Values From Sheet

These are in the Google Sheet / local capture, but their upstream source is not identified:

| Year | Local-fund budget | Actuals | Encumbrances | Actuals + encumbrances |
| --- | ---: | ---: | ---: | ---: |
| 2022 | `$14,728,193` | `$12,356,720` | `$8,062` | `$12,364,782` |
| 2023 | `$15,036,021` | `$13,475,679` | `$66,194` | `$13,541,873` |
| 2024 | `$16,756,984` | `$14,545,850` | `$4,397` | `$14,550,247` |

The workbook formulas are:

- `Actuals plus Encumbrances` = `Actuals + Encumbrances`
- `Budget Spent` = `IF(actualSpend < budget, actualSpend, budget)`
- `Budget Unspent` = `IF(actualSpend < budget, budget - actualSpend, 0)`
- `Percent Spent` = `Budget Spent / Budget`

Known issue: current public City appropriations APIs do not expose actuals/encumbrances fields. The local-fund actuals chart is therefore API-derived for budgets only; actuals/encumbrances come from the embedded BGA extract.

## Tooltip / Label Fixes

COPA/IPRA labels were adjusted:

- Say `COPA` only when API department names contain `Civilian Office` or `COPA`.
- Say `IPRA` only when names contain `Independent Police Review` or `IPRA`.
- Otherwise use `IPRA/COPA`.

This avoids incorrectly labeling COPA years as IPRA when the department name is ambiguous or absent.

## Validation Command

Use this quick syntax check after editing:

```bash
node -e "const fs=require('fs');const html=fs.readFileSync('/workspaces/budgetsnapshot-worflow/budgetsnapshot-graphics-generator/department-appropriations-2011-2026-api-dropdown-v2.html','utf8');const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);for(const s of scripts)new Function(s);console.log('inline scripts parse ok:',scripts.length);"
```

This has been passing after the latest edits.

## Suggested Next Steps

1. Re-open the HTML in a browser and test a few departments:
   - COPA/IPRA
   - Treasurer’s Office
   - City Clerk
   - Police

2. Check the local-fund actuals chart and monthly vacancies chart against the supplied CSVs for a few departments. Both are now embedded in the HTML.

3. Check workforce totals against the sheet/document. If still off, inspect whether some rows require the fuller normalization from `src/normalize/positions.ts`:
   - Annual controlled positions count as units.
   - Monthly non-controlled rows should divide by 12.
   - Hourly non-controlled rows should divide by 2080.

4. Add row-level vacancy identities or a persistent-vacancy-by-title dataset if the persistent-vacancies-by-title card should populate.

5. Keep future graphics as additional cards in the same HTML unless the user explicitly asks to split files.
