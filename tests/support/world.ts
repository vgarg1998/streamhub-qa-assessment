import { setWorldConstructor, World, type IWorldOptions } from "@cucumber/cucumber";
import type { APIRequestContext, Browser, BrowserContext, Page } from "playwright";
import type { ExpectedLoan } from "./expected-loan";
import { DashboardPage } from "../pages/dashboard.page";
import { ReportPage } from "../pages/report.page";

export type LoanInput = {
  principal: number;
  annualPercent: number;
  years: number;
};

export type PostBody = {
  id?: number;
  title?: string;
  body?: string;
  userId?: number;
};

export class LoanWorld extends World {
  browser?: Browser;
  context?: BrowserContext;
  page!: Page;
  api?: APIRequestContext;
  pageErrors: string[] = [];
  loan?: LoanInput;
  expected?: ExpectedLoan;
  lastStatus?: number;
  lastContentType?: string;
  lastBody?: PostBody;
  lastPayload?: { title?: string; body?: string; userId?: number };

  private dashboardPage?: DashboardPage;
  private reportPage?: ReportPage;

  constructor(options: IWorldOptions) {
    super(options);
  }

  get dashboard(): DashboardPage {
    if (!this.page) throw new Error("No browser page. Tag the scenario @ui.");
    return (this.dashboardPage ??= new DashboardPage(this.page));
  }

  get report(): ReportPage {
    if (!this.page) throw new Error("No browser page. Tag the scenario @ui.");
    return (this.reportPage ??= new ReportPage(this.page));
  }
}

setWorldConstructor(LoanWorld);
