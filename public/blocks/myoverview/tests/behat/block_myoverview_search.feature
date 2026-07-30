@block @block_myoverview @javascript
Feature: My overview block searching

  Background:
    Given the following config values are set as admin:
      | enablemycourses | 1 |
    And the following "users" exist:
      | username | firstname | lastname | email                | idnumber |
      | student1 | Student   | X        | student1@example.com | S1       |
      | student2 | Student   | Y        | student2@example.com | S2       |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 01    | C1       | 0        |
      | Course 02    | C2       | 0        |
      | Course 03    | C3       | 0        |
      | Course 04    | C4       | 0        |
      | Course 05    | C5       | 0        |
      | Course 06    | C6       | 0        |
      | Course 07    | C7       | 0        |
      | Course 08    | C8       | 0        |
      | Course 09    | C9       | 0        |
      | Course 10    | C10      | 0        |
      | Course 11    | C11      | 0        |
      | Course 12    | C12      | 0        |
      | Course 13    | C13      | 0        |
      | Fake example | Fake     | 0        |
    And the following "course enrolments" exist:
      | user | course | role |
      | student1 | C1 | student |
      | student1 | C2 | student |
      | student1 | C3 | student |
      | student1 | C4 | student |
      | student1 | C5 | student |
      | student1 | C6 | student |
      | student1 | C7 | student |
      | student1 | C8 | student |
      | student1 | C9 | student |
      | student1 | C10 | student |
      | student1 | C11 | student |
      | student1 | C12 | student |
      | student1 | C13 | student |

  Scenario: There is no search if I am not enrolled in any course
    When I am on the "My courses" page logged in as "student2"
    Then I should see "You're not enrolled in any courses." in the "Course overview" "block"
    And "Search courses" "field" should not exist in the "Course overview" "block"
    And I log out

  Scenario: Single page search
    Given I am on the "My courses" page logged in as "student1"
    And I set the field "Search courses" in the "Course overview" "block" to "Course 0"
    Then I should see "Course 01" in the "Course overview" "block"
    And I should not see "Course 13" in the "Course overview" "block"
    And I log out

  Scenario: Paginated search
    Given I am on the "My courses" page logged in as "student1"
    And I set the field "Search courses" in the "Course overview" "block" to "Course"
    And I should see "Course 01" in the "Course overview" "block"
    And I should not see "Course 13" in the "Course overview" "block"
    And I click on "Next page" "button" in the "Course overview" "block"
    And I wait until "Course 13" "text" exists
    Then I should see "Course 13" in the "Course overview" "block"
    And I should not see "Course 01" in the "Course overview" "block"

  Scenario: A search with no matches shows the no-results state, not the zero-state
    Given I am on the "My courses" page logged in as "student1"
    When I set the field "Search courses" in the "Course overview" "block" to "Nonexistent course zzz"
    Then I should see "No courses match your search" in the "Course overview" "block"
    And I should see "Try different keywords or clear your filters to see all courses." in the "Course overview" "block"
    And I should not see "You're not enrolled in any courses." in the "Course overview" "block"
    # The search field stays available so the user can recover from the empty result.
    And "Search courses" "field" should exist in the "Course overview" "block"
    And I log out

  Scenario: Searching overrides the active filter, and clearing the search restores it
    Given I am on the "My courses" page logged in as "student1"
    # Star a course and reload so the favourite is loaded from the server.
    And I click on "Star for Course 01" "button" in the "Course overview" "block"
    And I reload the page
    And I wait until "Course 01" "text" exists
    # Apply the Starred filter.
    And I click on "Grouping drop-down menu" "button" in the "Course overview" "block"
    And I click on "Starred" "button" in the ".courseoverview-menu__list" "css_element"
    And I should see "Course 01" in the "Course overview" "block"
    And I should not see "Course 03" in the "Course overview" "block"
    # A search overrides the grouping (as the pre-React block behaved): matches outside
    # the Starred filter appear while the search is active.
    When I set the field "Search courses" in the "Course overview" "block" to "Course 03"
    Then I should see "Course 03" in the "Course overview" "block"
    And I should not see "Course 01" in the "Course overview" "block"
    # Clearing the search restores the user's stored grouping.
    And I set the field "Search courses" in the "Course overview" "block" to ""
    And I wait until "Course 01" "text" exists
    And I should see "Course 01" in the "Course overview" "block"
    And I should not see "Course 03" in the "Course overview" "block"
    And I log out
