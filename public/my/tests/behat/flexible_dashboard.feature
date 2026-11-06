@core @core_my
Feature: Arrange dashboard blocks in a responsive grid
  In order to make my dashboard useful at different sizes
  As a user
  I need to move, resize, add and remove dashboard blocks

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | student1 | Student   | 1        | student1@example.com |
      | student2 | Student   | 2        | student2@example.com |
    And I log in as "student1"

  @javascript
  Scenario: Move, resize, add and remove blocks with accessible controls
    When I turn editing mode on
    Then "Open block drawer" "button" should not exist
    And I click on "Move Course overview block" "button" in the "Course overview" "block"
    And I click on "Down" "button" in the "Course overview" "block"
    And I click on "Move Course overview block" "button" in the "Course overview" "block"
    Then I should see "Item moved to row"
    When I click on "Resize block" "button" in the "Course overview" "block"
    Then "Up" "button" should exist in the "Course overview" "block"
    And the resize directional controls are centred on the active resize handle
    And I press the down key
    And I press the enter key
    Then I should see "Item resized to"
    When I click on "Add block" "button"
    And I click on "[data-blockname='online_users'] button" "css_element" in the "Add blocks" "dialogue"
    Then "Online users" "block" should exist
    When I click on "Actions for Online users" "button"
    And I click on "Delete Online users block" "button"
    Then "Online users" "block" should not exist

  @javascript
  Scenario: Drag the dedicated handles to move and resize a block
    When I turn editing mode on
    And I drag ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-handle--move" "css_element" and I drop it in ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-tile__content" "css_element"
    Then I should see "Item moved to row"
    When I hover ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-handle--resize" "css_element"
    And I drag ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-handle--resize" "css_element" and I drop it in ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-tile__content" "css_element"
    Then I should see "Item resized to"

  @javascript
  Scenario: Move a block into an adjacent free column
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    And dragging the "recentlyaccesseditems" dashboard block into an adjacent free column persists

  @javascript
  Scenario: Resize follows the pointer and previews its snap target
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    And keyboard activation starts a resize without on-screen direction controls
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
  Scenario: Reflow the grid from six columns down through four and two to one
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    When I change viewport size to "1400x1000"
    Then "[data-columns='4']" "css_element" should exist
    When I change viewport size to "900x1000"
    Then "[data-columns='2']" "css_element" should exist
    When I change viewport size to "600x900"
    Then "[data-columns='1']" "css_element" should exist

  @javascript
  Scenario: The column count follows the grid region's own width, not the viewport's
    When I turn editing mode on
    And I change viewport size to "2600x1000"
    Then "[data-columns='6']" "css_element" should exist
    When I constrain the dashboard grid region to 1000 pixels wide
    Then the viewport should be at least 2600 pixels wide
    And "[data-columns='4']" "css_element" should exist
    When I constrain the dashboard grid region to 800 pixels wide
    Then "[data-columns='2']" "css_element" should exist
    When I constrain the dashboard grid region to 500 pixels wide
    Then "[data-columns='1']" "css_element" should exist

  @javascript @accessibility
  Scenario: The add blocks modal and the reset confirmation are accessible while open
    When I turn editing mode on
    And I click on "Add block" "button"
    Then "Add blocks" "dialogue" should exist
    And the page should meet accessibility standards
    # Some blocks' own content (the calendar's month heading, for one) does not follow the
    # best-practice heading order, so that extra check is scoped to the modal.
    And the "Add blocks" "dialogue" should meet accessibility standards with "best-practice" extra tests
    When I click on "Close" "button" in the "Add blocks" "dialogue"
    And I click on "Reset to default" "button"
    Then "Reset dashboard" "dialogue" should exist
    And the page should meet accessibility standards
    And the "Reset dashboard" "dialogue" should meet accessibility standards with "best-practice" extra tests
    When I click on "Cancel" "button" in the "Reset dashboard" "dialogue"
    Then "Course overview" "block" should exist

  @javascript
  Scenario: Script in a trusted Text block runs on the dashboard, as it did on the classic dashboard
    # A user's own dashboard is private to them, so the Text block allows script there (see
    # block_html::content_is_trusted()); the grid must run it even though it injects block content.
    Given the dashboard of "student2" has a text block "Script block" containing "<p id='script-target'>before</p><script>document.getElementById('script-target').textContent = 'after';</script>"
    And I log out
    When I log in as "student2"
    Then I should see "after" in the "Script block" "block"
    And I should not see "before" in the "Script block" "block"

  @javascript
  Scenario: A block title is shown as the block formats it
    Given the dashboard of "student2" has a text block "Tom & Jerry" containing "<p>Cartoons</p>"
    And I log out
    When I log in as "student2"
    Then I should see "Tom & Jerry" in the ".core-my-dashboard-tile[data-block='html'] .core-my-dashboard-tile__title" "css_element"
    And I should not see "&amp;" in the ".core-my-dashboard-tile[data-block='html'] .core-my-dashboard-tile__title" "css_element"
    And "Tom & Jerry" "block" should exist

  @javascript
  Scenario: The scope being edited is named while editing
    When I turn editing mode on
    Then I should see "Editing your dashboard"
    When I turn editing mode off
    Then I should not see "Editing your dashboard"

  @javascript
  Scenario: Each block keeps its standard actions menu
    Given I log out
    And I log in as "admin"
    When I turn editing mode on
    And I click on "Actions for Course overview" "button"
    # The menu has the block's own actions, as on every other page, in the design system Dropdown.
    # Only Move is left out: the grid's handle repositions a tile directly, and the classic region
    # picker has no regions here.
    Then "Configure Course overview block" "link" should exist
    And "Hide Course overview block" "link" should exist
    And "Manage permissions" "link" should exist
    And "Check permissions" "link" should exist
    And "Delete Course overview block" "button" should exist
    And "Move Course overview block" "link" should not exist
    # The menu drops down over the tile beneath, so an item has to be really clickable, not just
    # present: a covered item fails this step.
    When I click on "Check permissions" "link"
    Then I should see "Check permissions in"
    And I visit "/my/index.php"
    # A block with fields of its own, like Text, is added through its own form, from the add blocks
    # modal, as on every other page - but with the where-this-block-appears fields hidden, since
    # the grid owns its position here; the same goes for Configure later.
    When I click on "Add block" "button"
    And I click on "[data-blockname='html'] button" "css_element" in the "Add blocks" "dialogue"
    Then "Add Text block" "dialogue" should exist
    And "Default region" "field" should not exist in the "Add Text block" "dialogue"
    And "Region" "field" should not exist in the "Add Text block" "dialogue"
    When I set the following fields in the "Add Text block" "dialogue" to these values:
      | Text block title | Notes            |
      | Content          | Things to follow |
    And I click on "Save changes" "button" in the "Add Text block" "dialogue"
    Then I should see "Things to follow" in the "Notes" "block"
    When I click on "Actions for Notes" "button"
    And I click on "Configure Notes block" "link"
    Then "Configure Notes block" "dialogue" should exist
    And "Region" "field" should not exist in the "Configure Notes block" "dialogue"

  @javascript
  Scenario: A block hidden through its standard menu keeps its place in the grid
    When I turn editing mode on
    And I click on "Actions for Timeline" "button"
    And I click on "Hide Timeline block" "link"
    Then ".core-my-dashboard-tile--hidden[data-block='timeline']" "css_element" should exist
    And I click on "Actions for Timeline" "button"
    And "Show Timeline block" "link" should exist
    When I turn editing mode off
    Then "Timeline" "block" should not exist
    And "Course overview" "block" should exist
    And "Calendar" "block" should exist
