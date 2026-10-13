# Loanboard — theory, then the files

This is the document to read alongside the code. The README is how to run the project. This file is why it is shaped this way.

We built **Section A** of the Streamhub assessment: our own small loan app, Playwright tests for it, API calls against JSONPlaceholder, and the two SQL scenarios. Section B would have meant testing emicalculator.net itself. That site's charts and sliders are someone else's DOM, so the first failures would have been about their markup. Section A lets you see a failure and know whether it is the formula, the locator, or the test.

## How the pieces talk

```text
Feature file          the sentence a reviewer can read
    |
Step definition       the function that sentence calls
    |
Page object           the only place a selector is allowed to live
    |
Browser               Loanboard, at the host in .env
```

The test also keeps a second copy of the EMI rules in `tests/support/expected-loan.ts`. That copy is the oracle. It must not import `web/src/emi.ts`. If both sides called one function, a broken formula would return the same wrong number twice and the test would pass.

### Follow one scenario

Open these in order. This is the 25 lakh case on the report.

1. `tests/features/report.feature` — the sentence `When I calculate a loan of 2500000 at 10.0% for 10 years`.
2. `tests/steps/report.steps.ts` — the `When` that matches that sentence. It calls `calculateExpectedLoan(...)` **before** it touches the page, and stores the result on the Cucumber world.
3. `tests/pages/report.page.ts` — `calculate()` fills the three labelled fields and clicks Calculate. There is no assertion here.
4. `web/src/report.ts` — the form's submit handler. It reads the inputs and calls `calculateLoan`.
5. `web/src/emi.ts` — the formula and the month-by-month schedule.
6. Back in the step file, `Then the monthly EMI matches the independent calculation` reads the number on screen and compares it to `this.expected.emi`.

The feature file is the spec. The step is glue. The page object is UI knowledge. The app and the oracle are two implementations of one rule.

## Playwright

Playwright drives the browser and, separately, HTTP. Two habits matter more than the API surface.

**It waits for you.** `expect(locator).toBeVisible()` retries until the timeout. A fixed sleep waits even when the page was ready in 100ms, and it still fails when the page takes longer than the sleep. The suite does not sleep.

**Assertions belong next to the Then.** `report.page.ts` can tell you the EMI text. The step decides whether that text is the expected number. When a test fails, the failure is a sentence about the behaviour, not a click buried in a page class.

The browser is opened in `tests/support/hooks.ts` only for scenarios tagged `@ui`. API scenarios tagged `@api` get Playwright's request context and no browser. The host comes from `tests/support/env.ts`, which reads `.env`. Pages navigate with `page.goto("/report.html")`. Playwright prefixes `BASE_URL`.

## Cucumber

A feature file is not code. Cucumber matches each line to a step definition.

```gherkin
When I calculate a loan of 2500000 at 10.0% for 10 years
```

The definition is a regular expression, not a Cucumber `{float}` token:

```ts
When(/^I calculate a loan of (\d+) at (\d+(?:\.\d+)?)% for (\d+) years$/, ...)
```

`{float}` in Cucumber does not match a bare integer, so `10` and `10.0` would need two different tokens. The regex accepts both. Parentheses are also special: Cucumber treats `(USD)` in a step string as optional text, so a step written that way never binds. The broken-locator step says "Principal Amount in USD" in English, and the locator itself still searches for the label `Principal Amount (USD)`.

## Page objects and locators

`tests/pages/dashboard.page.ts` and `report.page.ts` are the resilient ones. `tests/pages/brittle.page.ts` is the set we left broken. Passing scenarios never call the brittle page.

Playwright locators, in the order we prefer:

| Prefer | Example in this repo | Survives |
| --- | --- | --- |
| Role | `getByRole("button", { name: "Calculate" })` | A CSS rewrite, as long as it is still a button named Calculate |
| Label | `getByLabel("Loan amount")` | Moving the input in the form |
| Test id | `getByTestId("monthly-emi")` | A copy change, because the id is not visible text |
| CSS or XPath | only in `brittle.page.ts` | Almost nothing |

A number input has the role **spinbutton**, not textbox. `getByLabel("Loan amount")` still finds it, because the label is the accessible name. The self-healing proof of concept looks for both roles so it does not miss the field.

`data-testid` is for values that are not a unique role: the EMI figure, the chart canvas, a cell inside a row. The chart is a canvas, so the accessible name is set in `web/src/charts.ts` (`role="img"` plus an `aria-label` that includes the amounts). The test checks that the canvas is visible **and** that those amounts are the ones the oracle computed. A visible empty canvas would fail.

## EMI, in numbers

```text
r = annualPercent / 12 / 100
n = years * 12
EMI = round( P * r * (1 + r)^n / ((1 + r)^n - 1) )
```

This is reducing balance, not flat interest. Each month, interest is charged on whatever principal is left.

| Loan | Rate | Years | EMI |
| --- | --- | --- | --- |
| 25,00,000 | 10% | 10 | 33,038 |
| 50,00,000 | 7.5% | 15 | 46,351 |

Those two EMI figures are checked when the oracle module loads. They were computed from the closed form. If someone edits the rounding, the test process throws before a browser opens.

The schedule is a second step. For each month:

```text
interest = round(balance * r)
principal paid = EMI - interest
balance = balance - principal paid
```

The last month pays whatever principal is left, so the balance ends at 0. Rounding each month is why the 25 lakh loan's total interest is **14,64,500** and not **14,64,560**.

```text
33,038 × 120 − 25,00,000 = 14,64,560
sum of the rounded monthly interest = 14,64,500
difference = 60
```

The cards, the pie chart, and the oracle all use 14,64,500. The footnote on both pages says why. Year 1 of that loan pays more interest (2,43,097) than principal (1,53,359). Year 10 is the other way around. "Interest-heavy" means interest paid that year is greater than principal paid. A tie would be in neither filter. On this loan, 3 years are interest-heavy and 7 are principal-heavy.

The pie is principal versus total interest. The bars are one pair per visible year. Changing the filter changes the bars and the table. It does not change the EMI.

## The API, and the status we do not assert

JSONPlaceholder's `POST /posts` is a fake. It echoes the JSON and returns **201**, including when the title is 5,000 characters, when the title contains symbols and an emoji, and when `userId` is missing. The missing field is simply absent in the body. There is no 400.

`tests/features/posts.feature` says that in the feature description, so a reviewer sees the choice before the steps. The assertion is: status 201, content type JSON, an `id`, and status below 500. A server crash still fails the test. Saved bodies are in `reports/api/`.

## SQL

Both queries run against the schema in `sql/schema.sql` and the seed in `sql/seed.sql`. Screenshots of the schema and both results are in `sql/results/`.

### Round trip

A row `t1` is the payment. A row `t2` is a later payment in the opposite direction.

```text
t1.from = t2.to
t1.to   = t2.from
t2.time is after t1.time and at most 24 hours later
t2.amount is between 90% and 110% of t1.amount
```

"Within 10%" is written with integers so floating point does not decide a boundary:

```sql
t2.amount * 10 BETWEEN t1.amount * 9 AND t1.amount * 11
```

880 is exactly 110% of 800, so it matches. 3000 against 2000 does not. A return 24 hours later to the second matches. A return 24 hours and 1 minute later does not. Requiring `t2` to be strictly later means each pair is reported once, as first leg then return leg.

The seed also contains the non-matches (too late, too different in amount). If the query forgets the window or the 10% band, `npm run sql` fails instead of printing a plausible extra row.

### Streaks

"Three consecutive matches" means three matches **that player played**, in date order, each with 30 or more runs. It does not mean three calendar days. A 10 between a 31 and a 50 breaks the streak even if the matches are a few days apart.

Filtering to `runs >= 30` first, then looking for consecutive dates, is the mistake. Virat Kohli's 45, 32, 31, 10, 50, 40 would collapse into 45, 32, 31, 50, 40 and look like one streak of five. The 10 has to stay in the sequence long enough to break it.

The query in `sql/scenario2_streaks.sql`:

1. Number every match the player played: `match_seq`.
2. Keep the rows with `runs >= 30`, and number those too.
3. `island = match_seq - (row number among qualifying rows)`.

Walk Kohli. Match sequence 1, 2, 3 qualify, so island is `1-1`, `2-2`, `3-3`, all 0. Match 4 is the 10 and is dropped. Matches 5 and 6 qualify as qualifying-row numbers 4 and 5, so island is `5-4` and `6-5`, both 1. Island 0 has length 3 and starts 2024-03-22. Island 1 has length 2 and is discarded.

Suryakumar Yadav has two islands of length 3, so the result has two rows and two start dates. A score of exactly 30 counts, which is why Rishabh Pant's streak starts on a 30.

`npm run sql` expects exactly:

| Player | Streak started | Matches |
| --- | --- | --- |
| Virat Kohli | 2024-03-22 | 3 |
| Rishabh Pant | 2024-03-23 | 4 |
| Suryakumar Yadav | 2024-03-25 | 3 |
| Hardik Pandya | 2024-03-29 | 3 |
| Suryakumar Yadav | 2024-04-13 | 3 |

Rohit Sharma's 40 and 35 are only two in a row. Shubman Gill never reaches 30. Neither appears.

## Self-healing, the short version

The passing tests use role, label, and test id. Five other locators are deliberately the kind that rot: position, absolute XPath, a guessed button name, a guessed label, and a Highcharts selector. How a failure is detected, how the prompt is written, and what is checked before a fix would be applied is `docs/self-healing.md`. The proof of concept proposes replacements and does not save them into the suite.

## Check yourself

After reading, you should be able to say:

- Why the test's EMI function is a copy, not an import.
- Why 14,64,500 and 14,64,560 can both be "the interest" and which one the chart uses.
- Why JSONPlaceholder's 201 is the assertion, and a 500 would still fail.
- Why Kohli's 50 and 40 after the 10 are not part of the streak that started on 22 March.
- Which file you would edit if the Calculate button was renamed, and which file you would not.

If one of those is still fuzzy, say which. We change code after that, not before.
