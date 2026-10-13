import fs from "fs";
import path from "path";
import { chromium, type Locator, type Page } from "playwright";
import { BrittlePage } from "../pages/brittle.page";
import { env } from "../support/env";
import { parseInr } from "../support/money";

type Proposal = {
  code: string;
  locate: (page: Page) => Locator;
};

type Probe = {
  id: string;
  path: string;
  readyTestId: string;
  intent: string;
  brokenCode: string;
  broken: (page: BrittlePage) => Locator;
  propose: (snapshot: string) => Proposal;
  validate: (locator: Locator) => Promise<string>;
};

type ProbeResult = {
  id: string;
  detected: boolean;
  error?: string;
  proposal?: string;
  validation?: string;
  ok: boolean;
};

function headings(snapshot: string): Array<{ name: string; level: number }> {
  const found: Array<{ name: string; level: number }> = [];
  for (const match of snapshot.matchAll(/heading "([^"]+)" \[level=(\d+)\]/g)) {
    found.push({ name: match[1], level: Number(match[2]) });
  }
  return found;
}

function roleNames(snapshot: string, role: string): string[] {
  const pattern = new RegExp(`(?:^|\\n)\\s*- ${role} "([^"]+)"`, "g");
  return [...snapshot.matchAll(pattern)].map((match) => match[1]);
}

function requireOne(names: string[], description: string): string {
  if (names.length !== 1) {
    throw new Error(`${description}: expected 1 match, found ${names.length} (${names.join(" | ") || "none"})`);
  }
  return names[0];
}

function proposeEmi(snapshot: string): Proposal {
  const heading = headings(snapshot).find((item) => /monthly emi/i.test(item.name));
  if (!heading) throw new Error("Snapshot has no heading matching Monthly EMI");
  const code = `page.getByRole("heading", { name: ${JSON.stringify(heading.name)}, level: ${heading.level} }).locator("..").getByRole("paragraph")`;
  return {
    code,
    locate: (page) =>
      page
        .getByRole("heading", { name: heading.name, level: heading.level })
        .locator("..")
        .getByRole("paragraph"),
  };
}

function proposeNamed(
  snapshot: string,
  role: "button" | "spinbutton" | "textbox" | "img",
  pattern: RegExp,
): Proposal {
  const names = roleNames(snapshot, role).filter((name) => pattern.test(name));
  const name = requireOne(names, `${role} ${pattern}`);
  if (role === "button") {
    return {
      code: `page.getByRole("button", { name: ${JSON.stringify(name)} })`,
      locate: (page) => page.getByRole("button", { name }),
    };
  }
  if (role === "img") {
    return {
      code: `page.getByRole("img", { name: ${JSON.stringify(name)} })`,
      locate: (page) => page.getByRole("img", { name }),
    };
  }
  return {
    code: `page.getByLabel(${JSON.stringify(name)})`,
    locate: (page) => page.getByLabel(name),
  };
}

function proposeField(snapshot: string, pattern: RegExp): Proposal {
  const names = [...roleNames(snapshot, "spinbutton"), ...roleNames(snapshot, "textbox")].filter((name) =>
    pattern.test(name),
  );
  const name = requireOne(names, `field ${pattern}`);
  return {
    code: `page.getByLabel(${JSON.stringify(name)})`,
    locate: (page) => page.getByLabel(name),
  };
}

async function validateAmount(locator: Locator): Promise<string> {
  const count = await locator.count();
  if (count !== 1) throw new Error(`matched ${count} elements`);
  const text = (await locator.innerText()).trim();
  const amount = parseInr(text);
  if (!(amount > 0)) throw new Error(`amount was ${amount}`);
  return `one element, amount ${text}`;
}

async function validateEnabled(locator: Locator): Promise<string> {
  const count = await locator.count();
  if (count !== 1) throw new Error(`matched ${count} elements`);
  if (!(await locator.isEnabled())) throw new Error("element is disabled");
  return `one enabled element named ${(await locator.innerText()).trim()}`;
}

async function validateSingle(locator: Locator): Promise<string> {
  const count = await locator.count();
  if (count !== 1) throw new Error(`matched ${count} elements`);
  return "one element";
}

async function validateImage(locator: Locator): Promise<string> {
  const count = await locator.count();
  if (count !== 1) throw new Error(`matched ${count} elements`);
  if (!(await locator.isVisible())) throw new Error("image is not visible");
  const label = (await locator.getAttribute("aria-label")) ?? "";
  const numbers = [...label.matchAll(/\d+/g)].map((match) => Number(match[0]));
  if (!numbers.some((value) => value > 0)) {
    throw new Error(`accessible name has no positive number: ${label}`);
  }
  return `one visible image, ${label}`;
}

const probes: Probe[] = [
  {
    id: "positional-emi",
    path: "/?amount=2500000&rate=10&years=10",
    readyTestId: "dashboard-root",
    intent: "The monthly EMI figure on the loan dashboard",
    brokenCode: 'page.locator("main > section:nth-child(4) > span.emi")',
    broken: (page) => page.positionalEmi(),
    propose: proposeEmi,
    validate: validateAmount,
  },
  {
    id: "absolute-xpath-chart",
    path: "/?amount=2500000&rate=10&years=10",
    readyTestId: "dashboard-root",
    intent: "The payment breakup chart",
    brokenCode: 'page.locator("xpath=/html/body/div[1]/main/section[2]/canvas")',
    broken: (page) => page.absoluteXPathChart(),
    propose: (snapshot) => proposeNamed(snapshot, "img", /payment breakup/i),
    validate: validateImage,
  },
  {
    id: "wrong-button-name",
    path: "/report.html",
    readyTestId: "report-root",
    intent: "The button that calculates the loan",
    brokenCode: 'page.getByRole("button", { name: "Submit EMI Now" })',
    broken: (page) => page.submitEmiNowButton(),
    propose: (snapshot) => proposeNamed(snapshot, "button", /calculate/i),
    validate: validateEnabled,
  },
  {
    id: "wrong-field-label",
    path: "/report.html",
    readyTestId: "report-root",
    intent: "The loan amount input",
    brokenCode: 'page.getByLabel("Principal Amount (USD)")',
    broken: (page) => page.usdPrincipalField(),
    propose: (snapshot) => proposeField(snapshot, /loan amount/i),
    validate: validateSingle,
  },
  {
    id: "highcharts-bars",
    path: "/report.html",
    readyTestId: "report-root",
    intent: "The yearly principal and interest chart",
    brokenCode: 'page.locator(".highcharts-series-group rect")',
    broken: (page) => page.highchartsBars(),
    propose: (snapshot) => proposeNamed(snapshot, "img", /yearly repayment/i),
    validate: validateImage,
  },
];

function promptFor(probe: Probe, error: string, snapshot: string): string {
  return [
    "You are repairing one Playwright locator.",
    "",
    `Intent: ${probe.intent}`,
    `Broken locator: ${probe.brokenCode}`,
    "",
    "Failure:",
    error.split("\n").slice(0, 12).join("\n"),
    "",
    "Accessibility snapshot:",
    snapshot,
    "",
    "Reply with one locator using getByRole, getByLabel, getByText, or getByTestId.",
    "It must match exactly one element.",
    "Do not weaken the assertion and do not edit the feature file.",
    "",
  ].join("\n");
}

async function runProbe(page: Page, probe: Probe): Promise<ProbeResult> {
  const target = new URL(probe.path, env.baseUrl).toString();
  await page.goto(target);
  await page.waitForFunction(
    (testId) => document.querySelector(`[data-testid="${testId}"]`)?.getAttribute("data-ready") === "true",
    probe.readyTestId,
  );

  const brittle = new BrittlePage(page);
  let error = "";
  try {
    await probe.broken(brittle).waitFor({ state: "visible", timeout: 2000 });
    return {
      id: probe.id,
      detected: false,
      error: "Broken locator matched an element, so there was nothing to heal.",
      ok: false,
    };
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }

  const snapshot = await page.locator("body").ariaSnapshot();
  fs.mkdirSync("reports/self-healing", { recursive: true });
  fs.writeFileSync(path.join("reports/self-healing", `${probe.id}.snapshot.txt`), snapshot);
  fs.writeFileSync(path.join("reports/self-healing", `${probe.id}.prompt.txt`), promptFor(probe, error, snapshot));

  try {
    const proposal = probe.propose(snapshot);
    const validation = await probe.validate(proposal.locate(page));
    return {
      id: probe.id,
      detected: true,
      error: error.split("\n")[0],
      proposal: proposal.code,
      validation,
      ok: true,
    };
  } catch (caught) {
    return {
      id: probe.id,
      detected: true,
      error: error.split("\n")[0],
      validation: caught instanceof Error ? caught.message : String(caught),
      ok: false,
    };
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL: env.baseUrl, viewport: { width: 1280, height: 900 } });
  const results: ProbeResult[] = [];
  try {
    for (const probe of probes) {
      results.push(await runProbe(page, probe));
    }
  } finally {
    await browser.close();
  }

  fs.mkdirSync("reports/self-healing", { recursive: true });
  fs.writeFileSync(path.join("reports/self-healing", "poc-result.json"), JSON.stringify(results, null, 2));
  const summary = results
    .map((result) => {
      const mark = result.ok ? "PASS" : "FAIL";
      return `${mark}  ${result.id}\n  proposal: ${result.proposal ?? "-"}\n  validation: ${result.validation ?? result.error}`;
    })
    .join("\n");
  fs.writeFileSync(path.join("reports/self-healing", "poc-result.txt"), summary);
  console.log(summary);
  if (results.some((result) => !result.ok)) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
