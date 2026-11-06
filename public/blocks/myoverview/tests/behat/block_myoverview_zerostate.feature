@block @block_myoverview @javascript
Feature: Zero state on my overview block
  In order to know what should be the next step
  As a user
  I should see the proper information based on my capabilities

  Background:
    Given the following config values are set as admin:
      | enablemycourses | 1 |
    And the following "users" exist:
      | username | firstname | lastname | email                | idnumber |
      | user     | User      | X        | user@example.com     | U1       |
      | manager  | Manager   | X        | manager@example.com  | M1       |
    And the following "role assigns" exist:
      | user    | role    | contextlevel | reference |
      | manager | manager | System       |           |

  Scenario: Users with no permissions don't see any CTA
    Given I am on the "My courses" page logged in as "user"
    When I should see "You're not enrolled in any courses."
    Then I should see "Once you're enrolled in a course, it will appear here."
    And I should not see "Create course"
    And I should not see "Request course"

  Scenario: Users with permissions to request a course should see a Request course button
    Given the following config values are set as admin:
      | enablecourserequests | 1 |
    And the following "permission overrides" exist:
      | capability            | permission | role  | contextlevel | reference |
      | moodle/course:request | Allow      | user  | System       |           |
    When I am on the "My courses" page logged in as "user"
    Then I should see "Request your first course"
    And I should see "You don't have any courses yet. Request one to get started, it'll appear here once it's set up."
    And "Request course" "link" should exist in the "Course overview" "block"
    And I click on "Request course" "link" in the "Course overview" "block"
    And I should see "Details of the course"

  Scenario: Users with permissions to create a course when there is no course created
    Given I am on the "My courses" page logged in as "manager"
    When I should see "Create your first course"
    Then "Moodle documentation" "link" should exist
    And "Quickstart guide" "link" should exist
    And "Manage courses" "link" should not exist in the "Course overview" "block"
    And "Manage course categories" "link" should exist in the "Course overview" "block"
    And "Create course" "link" should exist in the "Course overview" "block"
    And I click on "Create course" "link" in the "Course overview" "block"
    And I should see "Add a new course"
    # Quickstart guide link should not be displayed when $CFG->coursecreationguide is empty.
    But the following config values are set as admin:
      | coursecreationguide | |
    And I am on the "My courses" page
    And "Moodle documentation" "link" should exist
    And "Quickstart guide" "link" should not exist

  Scenario: Users with permissions to create a course but is not enrolled in any existing course
    Given the following "course" exists:
      | fullname         | Course 1 |
      | shortname        | C1       |
    When I am on the "My courses" page logged in as "manager"
    Then I should see "You're not enrolled in any courses."
    Then I should see "Once you're enrolled in a course, it will appear here."
    And "Manage courses" "link" should exist in the "Course overview" "block"
    And "Create course" "link" should exist in the "Course overview" "block"
    And I click on "Create course" "link" in the "Course overview" "block"
    And I should see "Add a new course"
    And I am on the "My courses" page
    And I click on "Manage courses" "link" in the "Course overview" "block"
    And I should see "Course 1"

  Scenario: Users with permissions to create but not to manage courses and is not enrolled in any existing course
    Given the following "permission overrides" exist:
      | capability             | permission | role     | contextlevel | reference |
      | moodle/category:manage | Prohibit   | manager  | System       |           |
    And the following "course" exists:
      | fullname         | Course 1 |
      | shortname        | C1       |
    When I am on the "My courses" page logged in as "manager"
    Then I should see "You're not enrolled in any courses."
    Then I should not see "To view all courses on this sie, go to Manage courses"
    And "Manage courses" "link" should not exist in the "Course overview" "block"
    And "Create course" "link" should exist in the "Course overview" "block"
    And I click on "Create course" "link" in the "Course overview" "block"
    And I should see "Add a new course"

  @accessibility
  Scenario: Evaluate the accessibility of the My courses (zero state)
    When I am on the "My courses" page logged in as "manager"
    Then the page should meet accessibility standards with "best-practice" extra tests
