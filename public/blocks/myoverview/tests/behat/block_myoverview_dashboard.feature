@block @block_myoverview @javascript
Feature: The my overview block allows users to easily access their courses
  In order to enable the my overview block in a course
  As a student
  I can add the my overview block to my dashboard

  Background:
    Given the following config values are set as admin:
      | enablemycourses | 1 |
    And the following "users" exist:
      | username | firstname | lastname | email                | idnumber |
      | student1 | Student   | X        | student1@example.com | S1       |
    And the following "categories" exist:
      | name        | category | idnumber |
      | Category 1  | 0        | CAT1     |
    And the following "courses" exist:
      | fullname           | shortname | category | startdate                   | enddate                    |
      | Course 1 & < ' " > | C1        | 0        | ##1 month ago##             | ##15 days ago##            |
      | Course 2           | C2        | 0        | ##yesterday##               | ##tomorrow##               |
      | Course 3           | C3        | 0        | ##yesterday##               | ##tomorrow##               |
      | Course 4           | C4        | CAT1     | ##yesterday##               | ##tomorrow##               |
      | Course 5           | C5        | 0        | ##first day of next month## | ##last day of next month## |
    And the following "course enrolments" exist:
      | user | course | role |
      | student1 | C1 | student |
      | student1 | C2 | student |
      | student1 | C3 | student |
      | student1 | C4 | student |
      | student1 | C5 | student |

  Scenario: View past courses
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "Past" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 2" in the "Course overview" "block"
    And I should not see "Course 3" in the "Course overview" "block"
    And I should not see "Course 4" in the "Course overview" "block"
    And I should not see "Course 5" in the "Course overview" "block"
    And I hover over the "Course 1" button in the "Course overview" "block"
    And "Actions for course Course 1 & < ' \" >" "text" should be visible

  Scenario: View future courses
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "Future" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should see "Course 5" in the "Course overview" "block"
    And I should not see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 2" in the "Course overview" "block"
    And I should not see "Course 3" in the "Course overview" "block"
    And I should not see "Course 4" in the "Course overview" "block"

  Scenario: View inprogress courses
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "In progress" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should see "Course 2" in the "Course overview" "block"
    Then I should see "Course 3" in the "Course overview" "block"
    Then I should see "Course 4" in the "Course overview" "block"
    And I should not see "Course 1" in the "Course overview" "block"
    And I should not see "Course 5" in the "Course overview" "block"

  @accessibility
  Scenario: View all (except removed) courses
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should see "Course 2" in the "Course overview" "block"
    And I should see "Course 3" in the "Course overview" "block"
    And I should see "Course 4" in the "Course overview" "block"
    And I should see "Course 5" in the "Course overview" "block"
    And the "Course overview" "block" should meet accessibility standards with "best-practice" extra tests

  Scenario: View all (including removed from view) courses
    Given the following config values are set as admin:
      | config                            | value | plugin           |
      | displaygroupingallincludinghidden | 1     | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All (including removed from view)" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should see "Course 1 & < ' \" >" in the "Course overview" "block"
    Then I should see "Course 2" in the "Course overview" "block"
    Then I should see "Course 3" in the "Course overview" "block"
    Then I should see "Course 4" in the "Course overview" "block"
    Then I should see "Course 5" in the "Course overview" "block"

  Scenario: View inprogress courses - test persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "In progress" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then I should see "In progress" in the "Course overview" "block"
    Then I should see "Course 2" in the "Course overview" "block"
    Then I should see "Course 3" in the "Course overview" "block"
    Then I should see "Course 4" in the "Course overview" "block"
    And I should not see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 5" in the "Course overview" "block"

  Scenario: View all (except removed) courses - w/ persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then I should see "All courses" in the "Course overview" "block"
    Then I should see "Course 1 & < ' \" >" in the "Course overview" "block"
    Then I should see "Course 2" in the "Course overview" "block"
    Then I should see "Course 3" in the "Course overview" "block"
    Then I should see "Course 4" in the "Course overview" "block"
    Then I should see "Course 5" in the "Course overview" "block"

  Scenario: View past courses - w/ persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "Past" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then I should see "Past" in the "Course overview" "block"
    Then I should see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 2" in the "Course overview" "block"
    And I should not see "Course 3" in the "Course overview" "block"
    And I should not see "Course 4" in the "Course overview" "block"
    And I should not see "Course 5" in the "Course overview" "block"

  Scenario: View future courses - w/ persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "Future" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then I should see "Future" in the "Course overview" "block"
    Then I should see "Course 5" in the "Course overview" "block"
    And I should not see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 2" in the "Course overview" "block"
    And I should not see "Course 3" in the "Course overview" "block"
    And I should not see "Course 4" in the "Course overview" "block"

  Scenario: View favourite courses - w/ persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Star for Course 2" "button" in the "Course overview" "block"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "Starred" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then I should see "Starred" in the "Course overview" "block"
    And I should see "Course 2" in the "Course overview" "block"
    And I should not see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 3" in the "Course overview" "block"
    And I should not see "Course 4" in the "Course overview" "block"
    And I should not see "Course 5" in the "Course overview" "block"

  Scenario: List display persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    And I click on "List" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then ".block_myoverview .courseoverview-list--list" "css_element" should exist

  Scenario: Cards display persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    And I click on "List" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "View:" "button" in the "Course overview" "block"
    And I click on "Card" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then ".block_myoverview .courseoverview-list--card" "css_element" should exist

  Scenario: Summary display persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    And I click on "Summary" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then ".block_myoverview .courseoverview-list--summary" "css_element" should exist

  Scenario: Course name sort persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Sort:" "button" in the "Course overview" "block"
    And I click on "Course name" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then the "aria-label" attribute of "//button[contains(@aria-label, 'Sort:')]" "xpath_element" should contain "Course name"

  Scenario: Last accessed sort persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Sort:" "button" in the "Course overview" "block"
    And I click on "Last accessed" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then the "aria-label" attribute of "//button[contains(@aria-label, 'Sort:')]" "xpath_element" should contain "Last accessed"

  Scenario: Short name sort persistence
    Given I am on the "My courses" page logged in as "student1"
    When I click on "Sort:" "button" in the "Course overview" "block"
    Then I should not see "Short name" in the "Course overview" "block"
    When the following config values are set as admin:
      | config               | value |
      | courselistshortnames | 1     |
    And I reload the page
    And I click on "Sort:" "button" in the "Course overview" "block"
    And I click on "Short name" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then the "aria-label" attribute of "//button[contains(@aria-label, 'Sort:')]" "xpath_element" should contain "Short name"

  Scenario: Course start date sort persistence
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Sort:" "button" in the "Course overview" "block"
    And I click on "Course start date" "button" in the ".courseoverview-menu__list" "css_element"
    And I reload the page
    Then the "aria-label" attribute of "//button[contains(@aria-label, 'Sort:')]" "xpath_element" should contain "Course start date"

  Scenario: View inprogress courses with hide persistent functionality
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "In progress" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 2" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 2')]" "xpath_element"
    And I reload the page
    Then I should see "Course 3" in the "Course overview" "block"
    Then I should see "Course 4" in the "Course overview" "block"
    And I should not see "Course 2" in the "Course overview" "block"
    And I should not see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 5" in the "Course overview" "block"

  Scenario: View past courses with hide persistent functionality
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "Past" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 1" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 1')]" "xpath_element"
    And I reload the page
    Then I should not see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 2" in the "Course overview" "block"
    And I should not see "Course 3" in the "Course overview" "block"
    And I should not see "Course 4" in the "Course overview" "block"
    And I should not see "Course 5" in the "Course overview" "block"

  Scenario: View future courses with hide persistent functionality
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "Future" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 5" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 5')]" "xpath_element"
    And I reload the page
    Then I should not see "Course 5" in the "Course overview" "block"
    And I should not see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should not see "Course 2" in the "Course overview" "block"
    And I should not see "Course 3" in the "Course overview" "block"
    And I should not see "Course 4" in the "Course overview" "block"

  Scenario: View all (except hidden) courses with hide persistent functionality
    Given I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All courses" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 5" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 5')]" "xpath_element"
    And I reload the page
    Then I should not see "Course 5" in the "Course overview" "block"
    And I should see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should see "Course 2" in the "Course overview" "block"
    And I should see "Course 3" in the "Course overview" "block"
    And I should see "Course 4" in the "Course overview" "block"

  Scenario: View all (including removed from view) courses with hide persistent functionality
    Given the following config values are set as admin:
      | config                            | value | plugin           |
      | displaygroupingallincludinghidden | 1     | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    When I click on "All (including removed from view)" "button" in the ".courseoverview-menu__list" "css_element"
    And I click on "Actions for course Course 5" "button" in the "Course overview" "block"
    And I click on "Remove from view" "button" in the "//article[contains(concat(' ', normalize-space(@class), ' '), ' courseoverview-card ') and contains(.,'Course 5')]" "xpath_element"
    And I reload the page
    Then I should see "Course 5" in the "Course overview" "block"
    And I should see "Course 1 & < ' \" >" in the "Course overview" "block"
    And I should see "Course 2" in the "Course overview" "block"
    And I should see "Course 3" in the "Course overview" "block"
    And I should see "Course 4" in the "Course overview" "block"

  Scenario: Show course category in cards display
    Given the following config values are set as admin:
      | displaycategories | 1 | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    When I click on "Card" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should see "Category 1" in the "Course overview" "block"

  Scenario: Show course category in list display
    Given the following config values are set as admin:
      | displaycategories | 1 | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    When I click on "List" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should see "Category 1" in the "Course overview" "block"

  Scenario: Show course category in summary display with displaycategories on
    Given the following config values are set as admin:
      | displaycategories | 1 | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    When I click on "Summary" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should see "Category 1" in the "Course overview" "block"

  Scenario: Hide course category in cards display
    Given the following config values are set as admin:
      | displaycategories | 0 | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    When I click on "Card" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should not see "Category 1" in the "Course overview" "block"

  Scenario: Hide course category in list display
    Given the following config values are set as admin:
      | displaycategories | 0 | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    When I click on "List" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should not see "Category 1" in the "Course overview" "block"

  Scenario: Show course category in summary display with displaycategories off
    Given the following config values are set as admin:
      | displaycategories | 0 | block_myoverview |
    And I am on the "My courses" page logged in as "student1"
    And I click on "View:" "button" in the "Course overview" "block"
    When I click on "Summary" "button" in the ".courseoverview-menu__list" "css_element"
    Then I should not see "Category 1" in the "Course overview" "block"

  Scenario: Users with no permissions do not see any persistent CTA on the dashboard when enrolled in a course
    When I am on the "Homepage" page logged in as "student1"
    Then I should not see "Create course" in the "Course overview" "block"
    And I should not see "Manage courses" in the "Course overview" "block"
    And I should not see "Request course" in the "Course overview" "block"

  Scenario: Users with permissions to create and manage courses see persistent CTA when the block is in the drawer
    Given the following "blocks" exist:
      | blockname  | contextlevel | reference | pagetypepattern | defaultregion |
      | myoverview | System       | 1         | my-index        | side-post     |
    And the following "users" exist:
      | username | firstname | lastname | email               |
      | manager1 | Manager   | X        | manager@example.com |
    And the following "role assigns" exist:
      | user     | role    | contextlevel | reference |
      | manager1 | manager | System       |           |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | manager1 | C1     | manager |
    When I am on the "Homepage" page logged in as "manager1"
    Then "Manage courses" "link" should exist in the "Course overview" "block"
    And "Create course" "link" should exist in the "Course overview" "block"

  Scenario: Users with permissions to create and manage courses see persistent CTA on the dashboard
    Given the following "users" exist:
      | username | firstname | lastname | email               |
      | manager1 | Manager   | X        | manager@example.com |
    And the following "role assigns" exist:
      | user     | role    | contextlevel | reference |
      | manager1 | manager | System       |           |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | manager1 | C1     | manager |
    When I am on the "Homepage" page logged in as "manager1"
    Then "Manage courses" "link" should exist in the "Course overview" "block"
    And "Create course" "link" should exist in the "Course overview" "block"
    And I click on "Create course" "link" in the "Course overview" "block"
    And I should see "Add a new course"

  Scenario: Users with permissions to request a course see persistent request CTA on the dashboard
    Given the following config values are set as admin:
      | enablecourserequests | 1 |
    And the following "permission overrides" exist:
      | capability            | permission | role | contextlevel | reference |
      | moodle/course:request | Allow      | user | System       |           |
    When I am on the "Homepage" page logged in as "student1"
    Then "Request course" "link" should exist in the "Course overview" "block"

  Scenario: Users with permissions to create and manage courses see persistent CTA on the My courses page
    Given the following "users" exist:
      | username | firstname | lastname | email               |
      | manager1 | Manager   | X        | manager@example.com |
    And the following "role assigns" exist:
      | user     | role    | contextlevel | reference |
      | manager1 | manager | System       |           |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | manager1 | C1     | manager |
    When I am on the "My courses" page logged in as "manager1"
    Then "Manage courses" "link" should exist in the "Course overview" "block"
    And "Create course" "link" should exist in the "Course overview" "block"

  @accessibility
  Scenario: The My courses page must meet accessibility standards
    When I am on the "My courses" page logged in as "student1"
    Then the page should meet accessibility standards with "best-practice" extra tests
