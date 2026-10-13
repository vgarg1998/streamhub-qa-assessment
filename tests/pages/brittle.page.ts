import type { Locator, Page } from "playwright";

/**
 * Locators that are wrong on purpose. The passing scenarios never call these.
 * docs/self-healing.md explains how a failure here would be repaired.
 */
export class BrittlePage {
  constructor(private readonly page: Page) {}

  positionalEmi(): Locator {
    return this.page.locator("main > section:nth-child(4) > span.emi");
  }

  absoluteXPathChart(): Locator {
    return this.page.locator("xpath=/html/body/div[1]/main/section[2]/canvas");
  }

  submitEmiNowButton(): Locator {
    return this.page.getByRole("button", { name: "Submit EMI Now" });
  }

  usdPrincipalField(): Locator {
    return this.page.getByLabel("Principal Amount (USD)");
  }

  highchartsBars(): Locator {
    return this.page.locator(".highcharts-series-group rect");
  }
}
