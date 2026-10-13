@ui
Feature: Repayment report
  Submitting the form must match an expected EMI computed in the test suite.
  The chart has to be on the page and plotted with amounts greater than zero.

  Scenario Outline: Submitted loan matches the reducing-balance formula
    Given I open the repayment report
    When I calculate a loan of <amount> at <rate>% for <years> years
    Then the report heading is visible
    And the monthly EMI matches the independent calculation
    And the interest and total payment match the independent calculation
    And the yearly chart is visible with non-zero bars
    And the page has no uncaught errors

    Examples:
      | amount  | rate | years |
      | 2500000 | 10.0 | 10    |
      | 5000000 | 7.5  | 15    |

  Scenario: Interest-heavy years are the early years of a 25 lakh loan
    Given I open the repayment report
    When I calculate a loan of 2500000 at 10.0% for 10 years
    And I filter the schedule to interest-heavy years
    Then every visible year paid more interest than principal
    And the yearly chart shows the same number of bars as visible years

  Scenario: Principal-heavy years are the later years of a 25 lakh loan
    Given I open the repayment report
    When I calculate a loan of 2500000 at 10.0% for 10 years
    And I filter the schedule to principal-heavy years
    Then every visible year paid more principal than interest
    And the yearly chart shows the same number of bars as visible years
