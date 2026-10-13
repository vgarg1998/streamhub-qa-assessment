import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { Locator } from "playwright";
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

async function expectAmount(locator: Locator, amount: number): Promise<void> {
  await expect.poll(async () => parseInr(await locator.innerText())).toBe(amount);
}

Given(
  /^I open the loan dashboard for (\d+) at (\d+(?:\.\d+)?)% for (\d+) years$/,
  async function (this: LoanWorld, amount: string, rate: string, years: string) {
    this.loan = readLoan(amount, rate, years);
    this.expected = calculateExpectedLoan(
      this.loan.principal,
      this.loan.annualPercent,
      this.loan.years,
    );
    await this.dashboard.open(this.loan);
    await expect(this.dashboard.root()).toHaveAttribute("data-ready", "true");
  },
);

When("I open the repayment report from the dashboard", async function (this: LoanWorld) {
  await this.dashboard.openReport();
  await expect(this.report.root()).toHaveAttribute("data-ready", "true");
});

Then("the dashboard heading is visible", async function (this: LoanWorld) {
  await expect(this.dashboard.heading()).toBeVisible();
  await expect(this.dashboard.summary()).toContainText(`${this.loan?.years} years`);
});

Then(
  "the payment chart is visible with the principal and interest from that calculation",
  async function (this: LoanWorld) {
    if (!this.expected) throw new Error("Expected loan was not calculated");
    await expect(this.dashboard.chart()).toBeVisible();
    const principal = parseInr(await this.dashboard.chartPrincipal().innerText());
    const interest = parseInr(await this.dashboard.chartInterest().innerText());
    expect(principal).toBeGreaterThan(0);
    expect(interest).toBeGreaterThan(0);
    expect(principal).toBe(this.expected.principal);
    expect(interest).toBe(this.expected.totalInterest);
    await expect(this.dashboard.chart()).toHaveAttribute("data-principal", String(principal));
    await expect(this.dashboard.chart()).toHaveAttribute("data-interest", String(interest));
  },
);
