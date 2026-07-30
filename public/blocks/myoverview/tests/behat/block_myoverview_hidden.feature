@block @block_myoverview @javascript
Feature: The my overview block allows users to hide their courses
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

  Scenario: Test hide toggle functionality
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I reload the page
    Then I should not see "Course 2" in the "Course overview" "block"

  Scenario: Test hide toggle functionality w/ favorites
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Star for Course 2" "button" in the "Course overview" "block"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    When I reload the page
    And I should not see "Course 2" in the "Course overview" "block"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "Starred" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should not see "Course 2" in the "Course overview" "block"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "Removed from view" "button" in the ".courseoverview-menu__list" "css_element"
    And I should see "Course 2" in the "Course overview" "block"

  Scenario: Test show toggle functionality
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "Removed from view" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Restore to view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I reload the page
    And I should not see "Course 2" in the "Course overview" "block"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then I should see "Course 2" in the "Course overview" "block"

  Scenario: Test star and unstar functionality
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Star for Course 2" "button" in the "Course overview" "block"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "Removed from view" "button" in the ".courseoverview-menu__list" "css_element"
    And I should see "Course 2" in the "Course overview" "block"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Restore to view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    When I reload the page
    Then I should not see "Course 2" in the "Course overview" "block"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I should see "Course 2" in the "Course overview" "block"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "Starred" "button" in the ".courseoverview-menu__list" "css_element"
    And I should see "Course 2" in the "Course overview" "block"

  Scenario: Test a course is hidden directly with "All" courses
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    Then I should not see "Course 2" in the "Course overview" "block"

  Scenario: Test a course is never hidden with "All (including removed from view)" courses
    Given the following config values are set as admin:
      | config                            | value | plugin           |
      | displaygroupingallincludinghidden | 1     | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All (including removed from view)" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    Then I should see "Course 2" in the "Course overview" "block"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I should not see "Remove from view" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I should see "Restore to view" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I click on "Restore to view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I should see "Course 2" in the "Course overview" "block"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I should see "Remove from view" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I should not see "Restore to view" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"

  Scenario: A user who has removed every course from view can still reach the filter to restore them
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Actions for course Course 1" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 1')]" "xpath_element"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I click on "Actions for course Course 3" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 3')]" "xpath_element"
    And I click on "Actions for course Course 4" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 4')]" "xpath_element"
    And I click on "Actions for course Course 5" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 5')]" "xpath_element"
    When I reload the page
    Then I should see "All your courses are removed from view" in the "Course overview" "block"
    And "Grouping drop-down menu" "button" should exist in the "Course overview" "block"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "Removed from view" "button" in the ".courseoverview-menu__list" "css_element"
    And I should see "Course 1" in the "Course overview" "block"
    And I click on "Actions for course Course 1" "button" in the "Course overview" "block"
    And I click on "Restore to view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 1')]" "xpath_element"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I should see "Course 1" in the "Course overview" "block"
