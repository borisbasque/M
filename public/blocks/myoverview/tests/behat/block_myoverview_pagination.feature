@block @block_myoverview @javascript
Feature: My overview block pagination

  Background:
    Given the following config values are set as admin:
      | enablemycourses | 1 |
    And the following "users" exist:
      | username | firstname | lastname | email                | idnumber |
      | student1 | Student   | X        | student1@example.com | S1       |
    And the following "courses" exist:
      | fullname | shortname | category |
      | Course 01 | C1       | 0        |
      | Course 02 | C2       | 0        |
      | Course 03 | C3       | 0        |
      | Course 04 | C4       | 0        |
      | Course 05 | C5       | 0        |
      | Course 06 | C6       | 0        |
      | Course 07 | C7       | 0        |
      | Course 08 | C8       | 0        |
      | Course 09 | C9       | 0        |
      | Course 10 | C10      | 0        |
      | Course 11 | C11      | 0        |
      | Course 12 | C12      | 0        |
      | Course 13 | C13      | 0        |
      | Course 14 | C14      | 0        |
      | Course 15 | C15      | 0        |
      | Course 16 | C16      | 0        |
      | Course 17 | C17      | 0        |
      | Course 18 | C18      | 0        |
      | Course 19 | C19      | 0        |
      | Course 20 | C20      | 0        |
      | Course 21 | C21      | 0        |
      | Course 22 | C22      | 0        |
      | Course 23 | C23      | 0        |
      | Course 24 | C24      | 0        |
      | Course 25 | C25      | 0        |

  Scenario: The pagination controls should be hidden if I am not enrolled in any courses
    When I am on the "My courses" page logged in as "student1"
    Then I should see "You're not enrolled in any courses." in the "Course overview" "block"
    And "Next page" "button" should not exist in the "Course overview" "block"
    And "Previous page" "button" should not exist in the "Course overview" "block"
    And I log out

  Scenario: The pagination controls should be hidden if I am enrolled in 9 courses or less
    Given the following "course enrolments" exist:
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
    When I am on the "My courses" page logged in as "student1"
    Then I should see "Course 01" in the "Course overview" "block"
    # The container-width tier class must be applied (the ResizeObserver drives the
    # multi-column card grid); its absence means the layout is stuck single-column.
    And ".block-myoverview.courseoverview-min-480" "css_element" should exist
    # Assert the LIVE computed layout, including reflow on a real window resize:
    # this exercises the ResizeObserver end-to-end (a detached observer freezes
    # the width tiers, which selector assertions alone cannot detect).
    And the course overview card grid should render "3" columns
    And I change window size to "mobile"
    And the course overview card grid should render "1" column
    And I change window size to "medium"
    And the course overview card grid should render "3" columns
    And "Next page" "button" should not exist in the "Course overview" "block"
    And "Previous page" "button" should not exist in the "Course overview" "block"
    And I log out

  Scenario: Previous page button should be disabled when on the first page of courses
    Given the following "course enrolments" exist:
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
    When I am on the "My courses" page logged in as "student1"
    And I wait until "Previous page" "button" exists
    Then the "Previous page" "button" should be disabled
    And the "Next page" "button" should be enabled
    And I log out

  Scenario: Next page button should be disabled when on the last page of courses
    Given the following "course enrolments" exist:
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
    When I am on the "My courses" page logged in as "student1"
    And I wait until "Next page" "button" exists
    And I click on "Next page" "button" in the "Course overview" "block"
    Then the "Next page" "button" should be disabled
    And the "Previous page" "button" should be enabled
    And I log out

  Scenario: Next and previous page buttons should both be enabled when not on last or first page of courses
    Given the following "course enrolments" exist:
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
      | student1 | C14 | student |
      | student1 | C15 | student |
      | student1 | C16 | student |
      | student1 | C17 | student |
      | student1 | C18 | student |
      | student1 | C19 | student |
      | student1 | C20 | student |
      | student1 | C21 | student |
      | student1 | C22 | student |
      | student1 | C23 | student |
      | student1 | C24 | student |
      | student1 | C25 | student |
    When I am on the "My courses" page logged in as "student1"
    And I wait until "Next page" "button" exists
    And I click on "Next page" "button" in the "Course overview" "block"
    Then the "Next page" "button" should be enabled
    And the "Previous page" "button" should be enabled
    And I should see "Course 10" in the "Course overview" "block"
    And I should see "Course 18" in the "Course overview" "block"
    But I should not see "Course 09" in the "Course overview" "block"
    And I should not see "Course 25" in the "Course overview" "block"
    And I log out

  Scenario: Pagination appears with a stored last-accessed sort preference
    # The last-accessed sort joins the user_lastaccess table (a different query shape
    # from the default title sort every other scenario uses), so pin that the paged
    # fetches and the previous/next controls work under it too.
    Given the following "course enrolments" exist:
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
    And the following "user preferences" exist:
      | user     | preference                                | value        |
      | student1 | block_myoverview_user_sort_preference     | lastaccessed |
    When I am on the "My courses" page logged in as "student1"
    And I wait until "Next page" "button" exists
    Then the "Next page" "button" should be enabled
    And I click on "Next page" "button" in the "Course overview" "block"
    And the "Next page" "button" should be disabled
    And I log out
