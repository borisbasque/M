@block @block_myoverview @javascript
Feature: The my overview block allows users to favourite their courses
  In order to enable the my overview block in a course
  As a student
  I can add the my overview block to my dashboard

  Background:
    Given the following config values are set as admin:
      | enablemycourses | 1 |
    And the following "users" exist:
      | username | firstname | lastname | email                | idnumber |
      | student1 | Student   | X        | student1@example.com | S1       |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 1 | C1        | 0        |
      | Course 2 | C2        | 0        |
      | Course 3 | C3        | 0        |
      | Course 4 | C4        | 0        |
      | Course 5 | C5        | 0        |
    And the following "course enrolments" exist:
      | user | course | role |
      | student1 | C1 | student |
      | student1 | C2 | student |
      | student1 | C3 | student |
      | student1 | C4 | student |
      | student1 | C5 | student |

  Scenario: Favourite a course on a course card
    Given I am on the "My courses" page logged in as "student1"
    When I click on "Star for Course 2" "button" in the "Course overview" "block"
    And I reload the page
    Then "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]//button[@aria-pressed='true']" "xpath_element" should exist
    And "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 1')]//button[@aria-pressed='false']" "xpath_element" should exist
    And "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 3')]//button[@aria-pressed='false']" "xpath_element" should exist

  Scenario: Star a course and switch display to list
    Given I am on the "My courses" page logged in as "student1"
    When I click on "Star for Course 5" "button" in the "Course overview" "block"
    And I click on "View:" "button" in the "Course overview" "block"
    And I click on "List" "button" in the "Course overview" "block"
    Then "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 5')]//button[@aria-pressed='true']" "xpath_element" should exist
    And "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 1')]//button[@aria-pressed='false']" "xpath_element" should exist
    And "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 3')]//button[@aria-pressed='false']" "xpath_element" should exist

  Scenario: Star a course and switch display to summary
    Given I am on the "My courses" page logged in as "student1"
    When I click on "Star for Course 5" "button" in the "Course overview" "block"
    And I click on "View:" "button" in the "Course overview" "block"
    And I click on "Summary" "button" in the "Course overview" "block"
    Then "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 5')]//button[@aria-pressed='true']" "xpath_element" should exist
    And "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 1')]//button[@aria-pressed='false']" "xpath_element" should exist
    And "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 3')]//button[@aria-pressed='false']" "xpath_element" should exist
