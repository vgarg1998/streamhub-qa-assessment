export type YearRow = {
  year: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
};

export type LoanResult = {
  principal: number;
  annualPercent: number;
  years: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  schedule: YearRow[];
};

export type ScheduleFilter = "all" | "interest-heavy" | "principal-heavy";

/**
 * Reducing-balance EMI.
 *
 * monthlyRate = annualPercent / 12 / 100
 * months = years * 12
 * EMI = round(P * r * (1 + r)^n / ((1 + r)^n - 1))
 *
 * The schedule then walks month by month. Interest each month is rounded to
 * the nearest rupee, and the final month pays whatever principal is left so
 * the balance ends at zero. That rounding is why total interest can differ
 * by a few rupees from EMI × months − principal.
 */
export function calculateLoan(
  principal: number,
  annualPercent: number,
  years: number,
): LoanResult {
  if (!Number.isFinite(principal) || principal <= 0) {
    throw new Error("Loan amount must be greater than zero");
  }
  if (!Number.isFinite(annualPercent) || annualPercent <= 0) {
    throw new Error("Interest rate must be greater than zero");
  }
  if (!Number.isInteger(years) || years <= 0 || years > 40) {
    throw new Error("Tenure must be a whole number of years from 1 to 40");
  }

  const monthlyRate = annualPercent / 12 / 100;
  const months = years * 12;
  const emi = Math.round(
    (principal * monthlyRate * (1 + monthlyRate) ** months) /
      ((1 + monthlyRate) ** months - 1),
  );

  let balance = principal;
  const schedule: YearRow[] = [];

  for (let year = 1; year <= years; year += 1) {
    let principalPaid = 0;
    let interestPaid = 0;

    for (let month = 1; month <= 12; month += 1) {
      const isLastMonth = year === years && month === 12;
      const interest = Math.round(balance * monthlyRate);
      let principalComponent = emi - interest;
      if (principalComponent < 0) principalComponent = 0;
      if (isLastMonth || principalComponent > balance) {
        principalComponent = balance;
      }
      balance -= principalComponent;
      principalPaid += principalComponent;
      interestPaid += interest;
    }

    schedule.push({
      year,
      principalPaid,
      interestPaid,
      closingBalance: balance,
    });
  }

  const principalPaidTotal = schedule.reduce((sum, row) => sum + row.principalPaid, 0);
  if (principalPaidTotal !== principal || balance !== 0) {
    throw new Error("Schedule did not repay the principal exactly");
  }

  const totalInterest = schedule.reduce((sum, row) => sum + row.interestPaid, 0);

  return {
    principal,
    annualPercent,
    years,
    emi,
    totalInterest,
    totalPayment: principal + totalInterest,
    schedule,
  };
}

export function filterSchedule(schedule: YearRow[], filter: ScheduleFilter): YearRow[] {
  if (filter === "interest-heavy") {
    return schedule.filter((row) => row.interestPaid > row.principalPaid);
  }
  if (filter === "principal-heavy") {
    return schedule.filter((row) => row.principalPaid > row.interestPaid);
  }
  return schedule;
}
