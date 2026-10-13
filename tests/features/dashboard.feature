@ui
Feature: Loan dashboard
  The dashboard is the summary view. The numbers come from the same
  reducing-balance schedule as the repayment report. The expected EMI is
  computed again in the test oracle, not read back from the app.

  Scenario: The dashboard loads a 25 lakh loan and a non-zero breakup chart
    Given I open the loan dashboard for 2500000 at 10.0% for 10 years
    Then the dashboard heading is visible
    And the monthly EMI matches the independent calculation
    And the payment chart is visible with the principal and interest from that calculation
    And the page has no uncaught errors

  Scenario: The dashboard opens the repayment report
    Given I open the loan dashboard for 2500000 at 10.0% for 10 years
    When I open the repayment report from the dashboard
    Then the report heading is visible
    And the page has no uncaught errors
