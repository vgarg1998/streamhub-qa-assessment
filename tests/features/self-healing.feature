@ui @self-healing
Feature: Intentionally broken locators
  These scenarios are expected to fail. The locators describe layout, a wrong
  name, or a chart library this app does not use. They stay broken.
  See docs/self-healing.md for detection, the prompt, and validation.

  Scenario: Positional CSS cannot see the monthly EMI
    Given I open the loan dashboard for 2500000 at 10.0% for 10 years
    Then a positional EMI locator is visible

  Scenario: An absolute XPath cannot see the payment chart
    Given I open the loan dashboard for 2500000 at 10.0% for 10 years
    Then an absolute XPath chart locator is visible

  Scenario: The calculate button is not named Submit EMI Now
    Given I open the repayment report
    Then a button named Submit EMI Now is visible

  Scenario: The loan amount field is not labelled in US dollars
    Given I open the repayment report
    Then a field labelled Principal Amount in USD is visible

  Scenario: The yearly chart is not a Highcharts rectangle
    Given I open the repayment report
    Then a Highcharts bar rectangle is visible
