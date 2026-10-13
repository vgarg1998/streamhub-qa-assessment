/**
 * Test oracle for Loanboard.
 *
 * This is a separate copy of the rules in web/src/emi.ts. Scenarios must not
 * import the app: if both sides shared one function, a broken formula would
 * still look correct. The EMI constants below were worked from the closed
 * form before this schedule existed (25 lakh / 10% / 10 years = 33038,
 * 50 lakh / 7.5% / 15 years = 46351).
 */

export type ExpectedYear = {
  year: number;
  principalPaid: number;
  interestPaid: number;
  closingBalance: number;
};

export type ExpectedLoan = {
  principal: number;
  annualPercent: number;
  years: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  schedule: ExpectedYear[];
};

export function calculateExpectedLoan(
  principal: number,
  annualPercent: number,
  years: number,
): ExpectedLoan {
  const monthlyRate = annualPercent / 12 / 100;
  const months = years * 12;
  const emi = Math.round(
    (principal * monthlyRate * (1 + monthlyRate) ** months) /
      ((1 + monthlyRate) ** months - 1),
  );

  let balance = principal;
  const schedule: ExpectedYear[] = [];

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

const tenYear = calculateExpectedLoan(2_500_000, 10, 10);
const fifteenYear = calculateExpectedLoan(5_000_000, 7.5, 15);

if (tenYear.emi !== 33038 || fifteenYear.emi !== 46351) {
  throw new Error(
    `EMI oracle drifted from the closed form: ${tenYear.emi}, ${fifteenYear.emi}`,
  );
}

if (!(tenYear.schedule[0].interestPaid > tenYear.schedule[0].principalPaid)) {
  throw new Error("Expected the first year of the 25 lakh case to be interest-heavy");
}
