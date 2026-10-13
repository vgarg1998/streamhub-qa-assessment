import type { Locator, Page } from "playwright";

export type LoanInput = {
  principal: number;
  annualPercent: number;
  years: number;
};

export class DashboardPage {
  constructor(private readonly page: Page) {}

  root(): Locator {
    return this.page.getByTestId("dashboard-root");
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: "Loan dashboard", level: 1 });
  }

  summary(): Locator {
    return this.page.getByTestId("desk-summary");
  }

  emi(): Locator {
    return this.page.getByTestId("monthly-emi");
  }

  totalInterest(): Locator {
    return this.page.getByTestId("total-interest");
  }

  totalPayment(): Locator {
    return this.page.getByTestId("total-payment");
  }

  principal(): Locator {
    return this.page.getByTestId("principal");
  }

  chart(): Locator {
    return this.page.getByTestId("payment-chart");
  }

  chartPrincipal(): Locator {
    return this.page.getByTestId("chart-principal");
  }

  chartInterest(): Locator {
    return this.page.getByTestId("chart-interest");
  }

  openReportLink(): Locator {
    return this.page.getByTestId("open-report");
  }

  async open(input: LoanInput): Promise<void> {
    const params = new URLSearchParams({
      amount: String(input.principal),
      rate: String(input.annualPercent),
      years: String(input.years),
    });
    await this.page.goto(`/?${params.toString()}`);
  }

  async openReport(): Promise<void> {
    await this.openReportLink().click();
  }
}
