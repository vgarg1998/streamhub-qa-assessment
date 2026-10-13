import { renderPie } from "./charts";
import { calculateLoan } from "./emi";
import { formatInr } from "./format";
import { resolveInput } from "./storage";

const root = document.querySelector<HTMLElement>("[data-testid=dashboard-root]");
const error = document.querySelector<HTMLElement>("[data-testid=page-error]");

function text(testId: string, value: string) {
  const node = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!node) throw new Error(`Missing ${testId}`);
  node.textContent = value;
}

function carryQueryToReport() {
  const search = window.location.search;
  for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-nav=report], [data-testid=open-report]")) {
    link.href = `/report.html${search}`;
  }
}

if (!root || !error) {
  throw new Error("Dashboard shell is missing");
}

try {
  const input = resolveInput();
  const result = calculateLoan(input.principal, input.annualPercent, input.years);
  text(
    "desk-summary",
    `${formatInr(result.principal)} at ${result.annualPercent}% for ${result.years} years`,
  );
  text("monthly-emi", formatInr(result.emi));
  text("total-interest", formatInr(result.totalInterest));
  text("total-payment", formatInr(result.totalPayment));
  text("principal", formatInr(result.principal));
  text("chart-principal", formatInr(result.principal));
  text("chart-interest", formatInr(result.totalInterest));

  const canvas = document.querySelector<HTMLCanvasElement>("[data-testid=payment-chart]");
  if (!canvas) throw new Error("Missing payment chart");
  renderPie(canvas, result.principal, result.totalInterest);
  carryQueryToReport();
  root.setAttribute("data-ready", "true");
} catch (caught) {
  error.hidden = false;
  error.textContent = caught instanceof Error ? caught.message : "Could not load the dashboard";
  root.setAttribute("data-ready", "error");
}
