@api
Feature: JSONPlaceholder post boundaries
  JSONPlaceholder is a mock. It stores nothing and it does not validate a post.
  These scenarios send the three bad payloads from the assessment and record
  the live contract: HTTP 201, a JSON body, and no server error.
  Asserting HTTP 400 would fail against the real service for the wrong reason.

  Scenario: An excessively long title does not cause a server error
    When I post a title that is 5000 characters long
    Then the post response is not a server failure
    And the created post echoes the submitted title

  Scenario: Special characters in the title do not cause a server error
    When I post a title containing unsupported special characters
    Then the post response is not a server failure
    And the created post echoes the submitted title

  Scenario: A missing userId does not cause a server error
    When I post a payload without a userId
    Then the post response is not a server failure
    And the created post has an id and no userId
