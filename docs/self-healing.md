# Self-healing locators

Five locators in `tests/pages/brittle.page.ts` are wrong on purpose. `tests/features/self-healing.feature` calls them. They stay broken. This note is how a failure becomes a candidate fix, and why the candidate is not applied automatically.

`npm test` excludes the tag `@self-healing`, so the real suite stays green. `npm run test:self-healing` runs only those five scenarios and exits non-zero. That is the detection run.

## The broken locators

| Scenario | Locator | Why it cannot work |
| --- | --- | --- |
| Positional EMI | `main > section:nth-child(4) > span.emi` | Describes a layout this page does not have |
| Payment chart | `xpath=/html/body/div[1]/main/section[2]/canvas` | Absolute path from a different document shape |
| Calculate | `getByRole("button", { name: "Submit EMI Now" })` | The button's accessible name is Calculate |
| Loan amount | `getByLabel("Principal Amount (USD)")` | The label is Loan amount |
| Yearly chart | `.highcharts-series-group rect` | The chart is Chart.js on a canvas, not Highcharts |

The Given step of each scenario passes. The page loaded. Only the Then step fails, which is the signal that the locator is the problem.

## 1. Detection

Playwright's web-first assertion retries, then fails with the locator and the reason. From the self-healing run:

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('main > section:nth-child(4) > span.emi')
Expected: visible
Timeout: 2500ms
Error: element(s) not found
```

The same shape appears for the other four: `element(s) not found`, with the locator printed in the error. The After hook writes a full-page screenshot under `reports/self-healing/screenshots/` and attaches it to `reports/self-healing/cucumber-report.html`.

A healer should treat these as the only automatic inputs:

- the step name, which says what the user was trying to see
- the error text, which names the broken locator
- the screenshot and the accessibility snapshot of the page that did load

It should not treat a failing EMI assertion as a locator problem. If `getByTestId("monthly-emi")` is visible but the number is wrong, the formula is wrong. Healing the locator would hide that.

## 2. Prompt

`npm run heal:poc` writes one prompt per failure to `reports/self-healing/*.prompt.txt`. The prompt is small on purpose. A prompt that says "fix the test" invites a weaker assertion.

The positional-EMI prompt is the failure above, the intent "The monthly EMI figure on the loan dashboard", the broken locator, and the accessibility snapshot. The instruction at the end is:

```text
Reply with one locator using getByRole, getByLabel, getByText, or getByTestId.
It must match exactly one element.
Do not weaken the assertion and do not edit the feature file.
```

The snapshot is the accessibility tree, not a raw HTML dump. It contains `heading "Monthly EMI" [level=2]` and the paragraph under it. That is enough to propose a role locator. It is also enough to refuse a proposal that is not in the snapshot.

## 3. Validation before applying

The proof of concept in `tests/self-heal/poc.ts` does not edit source. For each broken locator it:

1. Confirms the broken locator does **not** match. If it did, there is nothing to heal and the probe fails.
2. Reads `body`'s accessibility snapshot and writes the prompt.
3. Proposes one locator from names that are actually in that snapshot. The proposer is a stand-in for the model that would answer the prompt. It only emits a locator when the snapshot contains a single heading, button, field, or image that matches the intent.
4. Checks the proposal on the live page before anyone would paste it into `brittle.page.ts`.

The checks from the last run (`reports/self-healing/poc-result.txt`):

| Probe | Proposal | Check |
| --- | --- | --- |
| positional-emi | heading "Monthly EMI", then the paragraph in that card | exactly one element, text ₹33,038 |
| absolute-xpath-chart | `getByRole("img", { name: "Payment breakup chart..." })` | exactly one visible image whose name contains a positive amount |
| wrong-button-name | `getByRole("button", { name: "Calculate" })` | exactly one enabled button |
| wrong-field-label | `getByLabel("Loan amount")` | exactly one field |
| highcharts-bars | `getByRole("img", { name: "Yearly repayment chart..." })` | exactly one visible image, bar count and amount in the name are non-zero |

"Exactly one" matters. A locator that matches the first of three buttons is how a healed test clicks the wrong control and still goes green.

The amount check matters too. A locator that finds a visible paragraph of "—" would be unique and still useless. The EMI proposal has to parse as a number greater than zero. The chart proposal has to carry a positive number in its accessible name.

Only after those checks would a human replace the broken locator and re-run the scenario. The broken file is still the file that `npm run test:self-healing` executes.

## What the proof of concept is

The proposer reads the snapshot locally. It does not call a remote model. Replacing that function with a model that answers the saved prompt does not change detection or validation. Those two stages are the ones that stop a confident, wrong locator from landing in the suite.
