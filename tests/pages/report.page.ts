import type { Locator, Page } from "playwright";
import type { LoanInput } from "./dashboard.page";

export class ReportPage {
  constructor(private readonly page: Page) {}

  root(): Locator {
    return this.page.getByTestId("report-root");
  }

  heading(): Locator {
    return this.page.getByRole("heading", { name: "Repayment report", level: 1 });
  }

  amount(): Locator {
    return this.page.getByLabel("Loan amount");
  }

  rate(): Locator {
    return this.page.getByLabel("Annual interest rate");
  }

  years(): Locator {
    return this.page.getByLabel("Tenure in years");
  }

  calculateButton(): Locator {
    return this.page.getByRole("button", { name: "Calculate" });
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

  yearlyChart(): Locator {
    return this.page.getByTestId("yearly-chart");
  }

  chartSummary(): Locator {
    return this.page.getByTestId("chart-summary");
  }

  filterStatus(): Locator {
    return this.page.getByTestId("filter-status");
  }

  scheduleRows(): Locator {
    return this.page.getByTestId("schedule-body").getByRole("row");
  }

  async open(): Promise<void> {
    await this.page.goto("/report.html");
  }

  async calculate(input: LoanInput): Promise<void> {
    await this.amount().fill(String(input.principal));
    await this.rate().fill(String(input.annualPercent));
    await this.years().fill(String(input.years));
    await this.calculateButton().click();
  }

  async filter(value: "interest-heavy" | "principal-heavy"): Promise<void> {
    await this.page.getByLabel("Schedule filter").selectOption(value);
  }
}
