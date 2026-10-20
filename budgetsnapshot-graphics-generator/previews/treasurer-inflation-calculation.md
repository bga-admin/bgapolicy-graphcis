# City Treasurer’s Office: inflation-adjusted rate calculation

Audit of the current generator, October 19, 2026. This reproduces the **2026 recommendation** cycle, which uses **2011–2024** budgets and the supplied **2024-dollar** factors. Updated after the analyst specified the endpoint formula with the starting budget in the denominator.

**Current result: 8.8570093168%, displayed as 8.9%.**

```text
(($6,272,699 − $2,915,620.6713880682) / $2,915,620.6713880682) / 13
= 0.08857009316841918
= 8.8570093168%
```

The generator now uses this formula for the inflation-adjusted rate. The ordinary nominal average annual rates retain their existing formula. The earlier 7.2% result averaged the annual percentage changes instead. Dollar rounding is for display; the denominator uses the full-precision starting adjusted budget.

## Inputs

The annual City appropriations APIs were queried for department number **28**, also checking department descriptions containing “TREASUR.” All returned rows matched department 28. The generator’s actual `loadYear`, `findAmountField`, `departmentMatch`, `averageAnnualChange`, and summary functions were run against these fetched rows. `loadYear` sums the selected appropriation amount across all matched funds and accounts; it uses budget ordinance amounts, not actual expenditure, salaries alone, or estimated fringe.

| Year | Ordinance budget | Factor to 2024 dollars | Adjusted budget (nearest dollar) | Annual adjusted change | Matched rows | City dataset |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 2011 | $2,181,879 | 1.336288892 | $2,915,621 | — | 22 | [drv3-jzqp](https://data.cityofchicago.org/d/drv3-jzqp) |
| 2012 | $2,377,149 | 1.316299182 | $3,129,039 | +7.319835% | 20 | [8ix6-nb7q](https://data.cityofchicago.org/d/8ix6-nb7q) |
| 2013 | $2,414,890 | 1.301409517 | $3,142,761 | +0.438523% | 20 | [b24i-nwag](https://data.cityofchicago.org/d/b24i-nwag) |
| 2014 | $2,497,474 | 1.279063151 | $3,194,427 | +1.643973% | 19 | [ub6s-xy6e](https://data.cityofchicago.org/d/ub6s-xy6e) |
| 2015 | $2,528,177 | 1.282858924 | $3,243,294 | +1.529772% | 20 | [qnek-cfpp](https://data.cityofchicago.org/d/qnek-cfpp) |
| 2016 | $4,188,955 | 1.274411039 | $5,338,450 | +64.599626% | 38 | [36y7-5nnf](https://data.cityofchicago.org/d/36y7-5nnf) |
| 2017 | $4,071,831 | 1.250904281 | $5,093,471 | −4.588966% | 41 | [7jem-9wyw](https://data.cityofchicago.org/d/7jem-9wyw) |
| 2018 | $4,161,578 | 1.229354749 | $5,116,056 | +0.443408% | 42 | [6g7p-xnsy](https://data.cityofchicago.org/d/6g7p-xnsy) |
| 2019 | $4,134,722 | 1.211641879 | $5,009,802 | −2.076861% | 40 | [h9rt-tsn7](https://data.cityofchicago.org/d/h9rt-tsn7) |
| 2020 | $4,124,036 | 1.198267131 | $4,941,697 | −1.359446% | 41 | [fyin-2vyd](https://data.cityofchicago.org/d/fyin-2vyd) |
| 2021 | $4,040,902 | 1.149772387 | $4,646,118 | −5.981331% | 40 | [6tbx-h7y2](https://data.cityofchicago.org/d/6tbx-h7y2) |
| 2022 | $4,806,567 | 1.069027203 | $5,138,351 | +10.594509% | 34 | [2cr6-8u6w](https://data.cityofchicago.org/d/2cr6-8u6w) |
| 2023 | $5,712,960 | 1.034607895 | $5,910,674 | +15.030555% | 34 | [xbjh-7zvh](https://data.cityofchicago.org/d/xbjh-7zvh) |
| 2024 | $6,272,699 | 1.000000000 | $6,272,699 | +6.124945% | 36 | [x394-e874](https://data.cityofchicago.org/d/x394-e874) |

The amount field is `amount` in 2011, `appropriation_ordinance` in 2013, and `_ordinance_amount_` in the other listed years. Calculations retain full precision; displayed dollar amounts and annual percentages above are rounded.

## Previous method: average of annual percentage changes

For every year:

```text
adjusted budget = ordinance budget × that year's inflation factor
annual change = (adjusted budget / previous adjusted budget − 1) × 100
rate = sum of the 13 annual changes / 13
```

For example, 2011 is `$2,181,879 × 1.336288892 = $2,915,620.6713880682`. The 2012 change is `(3129039.2841921183 / 2915620.6713880682 − 1) × 100 = 7.3198346719%`.

The thirteen annual changes sum to **93.7185414220 percentage points**. Dividing by **13** gives **7.2091185709%**, displayed as **7.2%**. The 2016 increase of **64.5996259618%** is included as one of these annual changes.

## Current formula: total adjusted growth divided by 13

```text
2011 budget in 2024 dollars = $2,181,879 × 1.336288892
                            = $2,915,620.6713880682
2024 budget in 2024 dollars = $6,272,699 × 1
                            = $6,272,699
Number of annual intervals = 2024 − 2011 = 13
Total adjusted growth      = ($6,272,699 / $2,915,620.6713880682 − 1) × 100
                            = 115.1411211189%
Total growth / 13          = 115.1411211189% / 13
                            = 8.8570093168%
                            ≈ 8.9%
```

This matches the expected number using the same starting and ending budgets and supplied inflation factors. It divides the total percentage growth evenly across 13 years. It does not average the individual annual percentage changes. A compound annual rate would be a third calculation, **6.0703763553%**.

The current generator uses the starting adjusted budget as the denominator, producing 8.9%. It retains full precision in calculations and rounds position/FTE counts and displayed dollar amounts only for presentation.

[Download the full-precision audit inputs as CSV](treasurer-inflation-calculation.csv).
