import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { calculateExpectedLoan } from "../support/expected-loan";
import { parseInr } from "../support/money";
import { LoanWorld, type LoanInput } from "../support/world";

function readLoan(amount: string, rate: string, years: string): LoanInput {
  return {
    principal: Number(amount),
    annualPercent: Number(rate),
    years: Number(years),
  };
}

async function remember(world: LoanWorld, loan: LoanInput) {
  world.loan = loan;
  world.expected = calculateExpectedLoan(loan.principal, loan.annualPercent, loan.years);
  await world.attach(JSON.stringify({ input: loan, expected: world.expected }, null, 2), "application/json");
}

Given("I open the repayment report", async function (this: LoanWorld) {
  await this.report.open();
  await expect(this.report.root()).toHaveAttribute("data-ready", "true");
});

When(
  /^I calculate a loan of (\d+) at (\d+(?:\.\d+)?)% for (\d+) years$/,
  async function (this: LoanWorld, amount: string, rate: string, years: string) {
    await remember(this, readLoan(amount, rate, years));
    await this.report.calculate(this.loan!);
  },
);

When("I filter the schedule to interest-heavy years", async function (this: LoanWorld) {
  await this.report.filter("interest-heavy");
  await expect(this.report.filterStatus()).toContainText("interest-heavy");
});

When("I filter the schedule to principal-heavy years", async function (this: LoanWorld) {
  await this.report.filter("principal-heavy");
  await expect(this.report.filterStatus()).toContainText("principal-heavy");
});

Then("the report heading is visible", async function (this: LoanWorld) {
  await expect(this.report.heading()).toBeVisible();
});

Then("the monthly EMI matches the independent calculation", async function (this: LoanWorld) {
  if (!this.expected) throw new Error("Expected loan was not calculated");
  const emi = this.page.url().includes("report.html") ? this.report.emi() : this.dashboard.emi();
  await expect.poll(async () => parseInr(await emi.innerText())).toBe(this.expected!.emi);
});

Then("the interest and total payment match the independent calculation", async function (this: LoanWorld) {
  if (!this.expected) throw new Error("Expected loan was not calculated");
  await expect.poll(async () => parseInr(await this.report.totalInterest().innerText())).toBe(
    this.expected!.totalInterest,
  );
  await expect.poll(async () => parseInr(await this.report.totalPayment().innerText())).toBe(
    this.expected!.totalPayment,
  );
  await expect.poll(async () => parseInr(await this.report.principal().innerText())).toBe(
    this.expected!.principal,
  );
});

Then("the yearly chart is visible with non-zero bars", async function (this: LoanWorld) {
  if (!this.loan) throw new Error("Loan input was not recorded");
  const chart = this.report.yearlyChart();
  await expect(chart).toBeVisible();
  const summary = await this.report.chartSummary().innerText();
  const bars = summary.match(/(\d+) bars/);
  if (!bars) throw new Error(`Chart summary did not mention bars: ${summary}`);
  const count = Number(bars[1]);
  expect(count).toBe(this.loan.years);
  expect(count).toBeGreaterThan(0);

  const amount = summary.match(/Largest amount plotted is\s+(.+)$/);
  if (!amount) throw new Error(`Chart summary did not mention an amount: ${summary}`);
  const largest = parseInr(amount[1]);
  expect(largest).toBeGreaterThan(0);
  await expect(chart).toHaveAttribute("data-bars", String(count));
  await expect(chart).toHaveAttribute("data-max", String(largest));

  const rows = await this.report.scheduleRows().count();
  expect(rows).toBe(count);
});

async function eachVisibleYear(
  world: LoanWorld,
  compare: (principal: number, interest: number) => void,
) {
  const rows = world.report.scheduleRows();
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  const sample = [];
  for (let index = 0; index < count; index += 1) {
    const row = rows.nth(index);
    const principal = parseInr(await row.getByTestId("principal-paid").innerText());
    const interest = parseInr(await row.getByTestId("interest-paid").innerText());
    compare(principal, interest);
    sample.push({ principal, interest });
  }
  await world.attach(JSON.stringify(sample, null, 2), "application/json");
  return sample;
}

Then("every visible year paid more interest than principal", async function (this: LoanWorld) {
  await eachVisibleYear(this, (principal, interest) => {
    expect(interest).toBeGreaterThan(principal);
  });
});

Then("every visible year paid more principal than interest", async function (this: LoanWorld) {
  await eachVisibleYear(this, (principal, interest) => {
    expect(principal).toBeGreaterThan(interest);
  });
});

Then("the yearly chart shows the same number of bars as visible years", async function (this: LoanWorld) {
  const rows = await this.report.scheduleRows().count();
  expect(rows).toBeGreaterThan(0);
  const chart = this.report.yearlyChart();
  await expect(chart).toBeVisible();
  await expect(chart).toHaveAttribute("data-bars", String(rows));
  const max = Number(await chart.getAttribute("data-max"));
  expect(max).toBeGreaterThan(0);
  await expect(this.report.chartSummary()).toContainText(`${rows} bars`);
});

Then("the page has no uncaught errors", async function (this: LoanWorld) {
  expect(this.pageErrors, this.pageErrors.join("\n")).toEqual([]);
});
