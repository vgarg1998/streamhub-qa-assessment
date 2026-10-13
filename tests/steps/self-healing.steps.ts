import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { BrittlePage } from "../pages/brittle.page";
import { LoanWorld } from "../support/world";

function brittle(world: LoanWorld): BrittlePage {
  return new BrittlePage(world.page);
}

Then("a positional EMI locator is visible", async function (this: LoanWorld) {
  await expect(brittle(this).positionalEmi()).toBeVisible({ timeout: 2500 });
});

Then("an absolute XPath chart locator is visible", async function (this: LoanWorld) {
  await expect(brittle(this).absoluteXPathChart()).toBeVisible({ timeout: 2500 });
});

Then("a button named Submit EMI Now is visible", async function (this: LoanWorld) {
  await expect(brittle(this).submitEmiNowButton()).toBeVisible({ timeout: 2500 });
});

Then("a field labelled Principal Amount in USD is visible", async function (this: LoanWorld) {
  await expect(brittle(this).usdPrincipalField()).toBeVisible({ timeout: 2500 });
});

Then("a Highcharts bar rectangle is visible", async function (this: LoanWorld) {
  await expect(brittle(this).highchartsBars()).toBeVisible({ timeout: 2500 });
});
