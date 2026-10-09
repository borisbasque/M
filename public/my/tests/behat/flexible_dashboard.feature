@core @core_my
Feature: Arrange dashboard blocks in a responsive grid
  In order to make my dashboard useful at different sizes
  As a user
  I need to move, resize, add and remove dashboard blocks

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
    And I log in as "student1"

  @javascript
  Scenario: Move, resize, add and remove blocks with accessible controls
    When I turn editing mode on
    Then "Open block drawer" "button" should not exist
    # A click without dragging picks the block up; the keyboard then moves it.
    And I click on "Move Course overview block" "button" in the "Course overview" "block"
    Then I should see "Course overview picked up" in the ".core-toast" "css_element"
    And I press the down key
    And I press the enter key
    Then I should see "Item moved to row"
    And I should not see "Course overview picked up"
    # Keyboard activation uses the arrow keys alone: there are no on-screen direction buttons.
    When I click on "Resize block" "button" in the "Course overview" "block"
    And I press the escape key
    And I press the space key
    Then "Up" "button" should not exist in the "Course overview" "block"
    And I press the down key
    And I press the enter key
    Then I should see "Item resized to"
    When I click on "Add a block" "button" in the ".core-my-dashboard-toolbar" "css_element"
    And I set the field "Search blocks" to "Online"
    And I click on "Insert" "button" in the "Add a block" "dialogue"
    Then "Online users" "block" should exist
    # A block added from the toolbar is picked up, ready to move.
    And I should see "Online users picked up" in the ".core-toast" "css_element"
    And I press the escape key
    When I click on "Delete Online users block" "button" in the "Online users" "block"
    Then "Online users" "block" should not be visible
    And I should see "Online users removed." in the ".core-toast" "css_element"
    When I click on "Undo" "button" in the ".core-toast" "css_element"
    Then "Online users" "block" should be visible
    When I click on "Delete Online users block" "button" in the "Online users" "block"
    And I press the ctrl z key
    Then "Online users" "block" should be visible

  @javascript
  Scenario: A removed block is gone for good once its toast has closed
    When I turn editing mode on
    And I click on "Delete Course overview block" "button" in the "Course overview" "block"
    And I click on "Close" "button" in the ".core-toast" "css_element"
    And I reload the page
    Then "Course overview" "block" should not exist

  @javascript
  Scenario: Add a block from the block browser into the space picked for it
    When I turn editing mode on
    And I click on "Add a block" "button" in the ".core-my-dashboard-toolbar" "css_element"
    Then I should see "Your block will go in the first free space" in the "Add a block" "dialogue"
    And I should see "Shows a cloud of the tags used across the site." in the "Add a block" "dialogue"
    And I set the field "Search blocks" to "zzz"
    And I should see "No blocks match \"zzz\"." in the "Add a block" "dialogue"
    # In a search field, the first Escape clears the search and the second closes the browser.
    And I press the escape key
    And I press the escape key
    Then "Add a block" "dialogue" should not exist

  @javascript
  Scenario: Drag the dedicated handles to move and resize a block
    When I turn editing mode on
    And I drag ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-handle--move" "css_element" and I drop it in ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-tile__content" "css_element"
    Then I should see "Item moved to row"
    When I hover ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-handle--resize" "css_element"
    And I drag ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-handle--resize" "css_element" and I drop it in ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-tile__content" "css_element"
    Then I should see "Item resized to"

  @javascript
  Scenario: A block cannot be resized below its own declared minimum
    # The Calendar declares a 1 column by 4 row minimum and starts 5 rows tall.
    When I turn editing mode on
    And I click on "Resize block" "button" in the "Calendar" "block"
    And I press the up key
    And I press the up key
    Then I should see "Minimum block size reached: 1 × 4."
    And I press the enter key
    And I should see "Item resized to 1 columns by 4 rows."
    And the "calendar_month" dashboard block should be "4" rows tall
    # The pointer route stops at the same limit.
    When I drag the "calendar_month" dashboard block's resize handle up by "3" rows
    Then the "calendar_month" dashboard block should be "4" rows tall
    # A block that declares nothing stops at the default minimum instead, so the drag itself works.
    When I drag the "timeline" dashboard block's resize handle up by "3" rows
    Then the "timeline" dashboard block should be "2" rows tall

  @javascript
  Scenario: Move a block into an adjacent free column
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    And dragging the "recentlyaccesseditems" dashboard block into an adjacent free column persists

  @javascript
  Scenario: A block picked up with a click can be put in the empty row below the last block
    When I turn editing mode on
    Then putting the "Calendar" dashboard block in the empty row at the bottom moves it there
    And I should see "Item moved to row"
    And "Up" "button" should not exist

  @javascript
  Scenario: Resize follows the pointer and previews its snap target
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    And the mouse resize preview follows the pointer before snapping to a grid cell

  @javascript
  Scenario: Bumped blocks ease into their new grid position
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    And blocks bumped by a pointer resize ease into their new grid position

  @javascript
  Scenario: Growing a block into a row neighbour pushes it sideways, not to the row start
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    And resizing the Course overview block into its row neighbour pushes it right

  @javascript
  Scenario: Growing a block into a column neighbour pushes it downwards, not to the grid start
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    And resizing the Calendar block into its column neighbour pushes it down

  @javascript
  Scenario: Calendar renders compactly in its narrow default column
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    And the Calendar block renders compact day cells

  @javascript
  Scenario: Reflow the grid from six columns down to one
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    When I change viewport size to "900x1000"
    Then "[data-columns='2']" "css_element" should exist
    When I change viewport size to "600x900"
    Then "[data-columns='1']" "css_element" should exist

  @javascript
  Scenario: A user without the site-default capability sees no scope switch CTA
    When I turn editing mode on
    Then I should see "Editing your dashboard"
    And "Switch to editing the default dashboard for all users" "link" should not exist
    When I turn editing mode off
    Then I should not see "Editing your dashboard"

  @javascript
  Scenario: The block actions menu is capped at Configure, Permissions and Check permissions
    Given I log out
    And I log in as "admin"
    When I turn editing mode on
    And I click on "More actions for Course overview" "button" in the "Course overview" "block"
    # Course overview has no fields of its own to edit - with the where-this-block-appears
    # fields hidden on the dashboard, Configure would otherwise open an empty modal.
    Then I should not see "Configure Course overview block" in the ".core-my-dashboard-block-actions__menu" "css_element"
    And I should see "Manage permissions" in the ".core-my-dashboard-block-actions__menu" "css_element"
    And I should see "Check permissions" in the ".core-my-dashboard-block-actions__menu" "css_element"
    And I should not see "Move Course overview block" in the ".core-my-dashboard-block-actions__menu" "css_element"
    And I should not see "Delete Course overview block" in the ".core-my-dashboard-block-actions__menu" "css_element"
    And "Hide Course overview block" "button" should not exist
    And the block actions menu sits to the right of the delete control
    # A block with fields of its own, like Text, still offers Configure.
    When I click on "Add a block" "button" in the ".core-my-dashboard-toolbar" "css_element"
    And I set the field "Search blocks" to "Text"
    And I click on "Insert" "button" in the "Add a block" "dialogue"
    And I press the escape key
    And I click on ".core-my-dashboard-block-actions__trigger" "css_element" in the ".core-my-dashboard-tile[data-block='html']" "css_element"
    Then I should see "Configure (new text block) block" in the ".core-my-dashboard-block-actions__menu" "css_element"

  @javascript
  Scenario: An administrator can switch between their own dashboard and the site default while editing
    Given I log out
    And I log in as "admin"
    And I visit "/my/index.php"
    When I turn editing mode on
    Then I should see "Editing your dashboard"
    And I click on "Switch to editing the default dashboard for all users" "link"
    Then I should see "Editing the default dashboard for all users"
    And I should see "Switch to editing your dashboard"
    When I click on "Switch to editing your dashboard" "link"
    Then I should see "Editing your dashboard"

  @javascript
  Scenario: Blocks open at the height of their content
    Given the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
      | Course 2 | C2        |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
    When I change viewport size to "2600x1200"
    And I reload the page
    # Two course cards fit in one row of cards: shorter than the old fixed 5 rows, well short of the cap.
    Then the "myoverview" dashboard block should be between "3" and "4" rows tall
    # "No recent items" needs about two rows; the 48px tile header (the same in both modes) can tip it into a third.
    And the "recentlyaccesseditems" dashboard block should be between "2" and "3" rows tall
    # Never below the calendar's declared 4-row minimum.
    And the "calendar_month" dashboard block should be between "4" and "6" rows tall

  @javascript
  Scenario: A block with more content than fits opens at the cap and scrolls
    Given the following "courses" exist:
      | fullname  | shortname |
      | Course 1  | C1        |
      | Course 2  | C2        |
      | Course 3  | C3        |
      | Course 4  | C4        |
      | Course 5  | C5        |
      | Course 6  | C6        |
      | Course 7  | C7        |
      | Course 8  | C8        |
      | Course 9  | C9        |
      | Course 10 | C10       |
      | Course 11 | C11       |
      | Course 12 | C12       |
    And the following "course enrolments" exist:
      | user     | course | role    |
      | student1 | C1     | student |
      | student1 | C2     | student |
      | student1 | C3     | student |
      | student1 | C4     | student |
      | student1 | C5     | student |
      | student1 | C6     | student |
      | student1 | C7     | student |
      | student1 | C8     | student |
      | student1 | C9     | student |
      | student1 | C10    | student |
      | student1 | C11    | student |
      | student1 | C12    | student |
    When I change viewport size to "2600x1200"
    And I reload the page
    Then the "myoverview" dashboard block should be "8" rows tall

  @javascript
  Scenario: A resized block keeps its size until the dashboard is reset
    When I change viewport size to "2600x1200"
    And I reload the page
    And I turn editing mode on
    And I click on "Resize block" "button" in the "Timeline" "block"
    And I press the down key
    And I press the down key
    And I press the down key
    And I press the enter key
    And I should see "Item resized to"
    And the "timeline" dashboard block should be between "5" and "7" rows tall
    And I reload the page
    Then the "timeline" dashboard block should be between "5" and "7" rows tall
    When I click on "Reset page to default" "button" in the ".core-my-dashboard-toolbar" "css_element"
    And I click on "Confirm" "button" in the "Reset dashboard" "dialogue"
    Then the "timeline" dashboard block should be between "2" and "4" rows tall

