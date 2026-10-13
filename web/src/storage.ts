export type LoanInput = {
  principal: number;
  annualPercent: number;
  years: number;
};

export const DEFAULT_INPUT: LoanInput = {
  principal: 2_500_000,
  annualPercent: 10,
  years: 10,
};

const STORAGE_KEY = "loanboard.input";

function isComplete(value: Partial<LoanInput>): value is LoanInput {
  return (
    typeof value.principal === "number" &&
    Number.isFinite(value.principal) &&
    typeof value.annualPercent === "number" &&
    Number.isFinite(value.annualPercent) &&
    typeof value.years === "number" &&
    Number.isFinite(value.years)
  );
}

export function inputFromSearch(search: string): LoanInput | undefined {
  const params = new URLSearchParams(search);
  if (!params.has("amount") && !params.has("rate") && !params.has("years")) {
    return undefined;
  }
  const candidate = {
    principal: Number(params.get("amount")),
    annualPercent: Number(params.get("rate")),
    years: Number(params.get("years")),
  };
  return isComplete(candidate) ? candidate : undefined;
}

export function loadInput(): LoanInput {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_INPUT };
  try {
    const parsed = JSON.parse(raw) as Partial<LoanInput>;
    return isComplete(parsed) ? parsed : { ...DEFAULT_INPUT };
  } catch {
    return { ...DEFAULT_INPUT };
  }
}

export function saveInput(input: LoanInput): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(input));
}

export function resolveInput(): LoanInput {
  return inputFromSearch(window.location.search) ?? loadInput();
}

export function writeQuery(input: LoanInput): void {
  const params = new URLSearchParams({
    amount: String(input.principal),
    rate: String(input.annualPercent),
    years: String(input.years),
  });
  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, "", next);
}
