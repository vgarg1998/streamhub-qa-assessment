import fs from "fs";
import path from "path";
import { After, Before, setDefaultTimeout, Status } from "@cucumber/cucumber";
import { chromium, request } from "playwright";
import { env } from "./env";
import { LoanWorld } from "./world";

setDefaultTimeout(30_000);

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

Before({ tags: "@ui" }, async function (this: LoanWorld) {
  this.pageErrors = [];
  this.browser = await chromium.launch({ headless: process.env.HEADED !== "1" });
  this.context = await this.browser.newContext({
    baseURL: env.baseUrl,
    viewport: { width: 1280, height: 900 },
  });
  this.page = await this.context.newPage();
  this.page.setDefaultTimeout(15_000);
  this.page.on("pageerror", (error) => {
    this.pageErrors.push(error.message);
  });
});

After({ tags: "@ui" }, async function (this: LoanWorld, scenario) {
  try {
    if (!this.page) return;
    const broken = scenario.pickle.tags.some((tag) => tag.name === "@self-healing");
    const dir = broken ? "reports/self-healing/screenshots" : "reports/screenshots";
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${slug(scenario.pickle.name)}-${scenario.pickle.id.slice(0, 8)}.png`);
    const png = await this.page.screenshot({ path: file, fullPage: true });
    if (scenario.result?.status === Status.FAILED) {
      await this.attach(png, "image/png");
    }
  } finally {
    await this.page?.close();
    await this.context?.close();
    await this.browser?.close();
  }
});

Before({ tags: "@api" }, async function (this: LoanWorld) {
  this.api = await request.newContext({
    baseURL: env.apiBaseUrl,
    timeout: 20_000,
  });
});

After({ tags: "@api" }, async function (this: LoanWorld) {
  await this.api?.dispose();
});
