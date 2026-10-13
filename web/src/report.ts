import { renderBars } from "./charts";
import { calculateLoan, filterSchedule, type LoanResult, type ScheduleFilter } from "./emi";
import { formatInr } from "./format";
import { resolveInput, saveInput, writeQuery, type LoanInput } from "./storage";

const root = document.querySelector<HTMLElement>("[data-testid=report-root]");
const form = document.querySelector<HTMLFormElement>("#loan-form");
const error = document.querySelector<HTMLElement>("[data-testid=form-error]");
const filterSelect = document.querySelector<HTMLSelectElement>("#schedule-filter");
const amountInput = document.querySelector<HTMLInputElement>("#loan-amount");
const rateInput = document.querySelector<HTMLInputElement>("#interest-rate");
const yearsInput = document.querySelector<HTMLInputElement>("#tenure");
const tbody = document.querySelector<HTMLTableSectionElement>("[data-testid=schedule-body]");
const canvas = document.querySelector<HTMLCanvasElement>("[data-testid=yearly-chart]");
const status = document.querySelector<HTMLElement>("[data-testid=filter-status]");
const summary = document.querySelector<HTMLElement>("[data-testid=chart-summary]");
const empty = document.querySelector<HTMLElement>("[data-testid=empty-schedule]");

if (
  !root ||
  !form ||
  !error ||
  !filterSelect ||
  !amountInput ||
  !rateInput ||
  !yearsInput ||
  !tbody ||
  !canvas ||
  !status ||
  !summary ||
  !empty
) {
  throw new Error("Report shell is missing");
}

let current: LoanResult | undefined;

const filterLabels: Record<ScheduleFilter, string> = {
  all: "all years",
  "interest-heavy": "interest-heavy years",
  "principal-heavy": "principal-heavy years",
};

function readFilter(): ScheduleFilter {
  const value = filterSelect!.value;
  if (value === "interest-heavy" || value === "principal-heavy") return value;
  return "all";
}

function showError(message: string) {
  error!.hidden = false;
  error!.textContent = message;
}

function clearError() {
  error!.hidden = true;
  error!.textContent = "";
}

function text(testId: string, value: string) {
  const node = document.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
  if (!node) throw new Error(`Missing ${testId}`);
  node.textContent = value;
}

function moneyCell(value: number, testId: string): HTMLTableCellElement {
  const cell = document.createElement("td");
  cell.dataset.testid = testId;
  cell.textContent = formatInr(value);
  return cell;
}

function fillForm(input: LoanInput) {
  amountInput!.value = String(input.principal);
  rateInput!.value = String(input.annualPercent);
  yearsInput!.value = String(input.years);
}

function readForm(): LoanInput {
  return {
    principal: Math.round(Number(amountInput!.value)),
    annualPercent: Number(rateInput!.value),
    years: Number(yearsInput!.value),
  };
}

function renderSchedule() {
  if (!current) return;
  const filter = readFilter();
  const rows = filterSchedule(current.schedule, filter);
  tbody!.replaceChildren();

  for (const row of rows) {
    const tr = document.createElement("tr");
    const year = document.createElement("th");
    year.scope = "row";
    year.textContent = String(row.year);
    tr.append(
      year,
      moneyCell(row.principalPaid, "principal-paid"),
      moneyCell(row.interestPaid, "interest-paid"),
      moneyCell(row.closingBalance, "closing-balance"),
    );
    tbody!.append(tr);
  }

  status!.textContent = `Showing ${rows.length} ${filterLabels[filter]}.`;
  empty!.hidden = rows.length !== 0;

  const plotted = rows.flatMap((row) => [row.principalPaid, row.interestPaid]);
  const largest = plotted.length === 0 ? 0 : Math.max(...plotted);
  summary!.textContent =
    rows.length === 0
      ? "No years to plot."
      : `${rows.length} bars. Largest amount plotted is ${formatInr(largest)}.`;

  renderBars(canvas!, rows);
}

function renderHeadlines(result: LoanResult) {
  text("monthly-emi", formatInr(result.emi));
  text("total-interest", formatInr(result.totalInterest));
  text("total-payment", formatInr(result.totalPayment));
  text("principal", formatInr(result.principal));

  const dashboardLink = document.querySelector<HTMLAnchorElement>("[data-nav=dashboard]");
  if (!dashboardLink) return;
  const params = new URLSearchParams({
    amount: String(result.principal),
    rate: String(result.annualPercent),
    years: String(result.years),
  });
  dashboardLink.href = `/?${params.toString()}`;
}

function apply(input: LoanInput) {
  current = calculateLoan(input.principal, input.annualPercent, input.years);
  clearError();
  renderHeadlines(current);
  renderSchedule();
}

filterSelect.addEventListener("change", () => {
  renderSchedule();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    const input = readForm();
    saveInput(input);
    writeQuery(input);
    apply(input);
  } catch (caught) {
    showError(caught instanceof Error ? caught.message : "Could not calculate that loan");
  }
});

try {
  const input = resolveInput();
  fillForm(input);
  apply(input);
  root.setAttribute("data-ready", "true");
} catch (caught) {
  showError(caught instanceof Error ? caught.message : "Could not open the report");
  root.setAttribute("data-ready", "error");
}
