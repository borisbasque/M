<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace core_my\local;

use core_block\grid_size;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\CoversMethod;
use PHPUnit\Framework\Attributes\DataProvider;

/**
 * Tests for resolving blocks' optional grid size declarations (MDL-89639).
 *
 * @package    core_my
 * @category   test
 * @copyright  2026 Moodle Pty Ltd
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
#[CoversMethod(dashboard::class, 'get_minimum_size')]
#[CoversMethod(dashboard::class, 'get_preferred_size')]
#[CoversMethod(\block_base::class, 'get_grid_minimum_size')]
#[CoversMethod(\block_base::class, 'get_grid_preferred_size')]
#[CoversClass(grid_size::class)]
final class block_size_test extends \advanced_testcase {
    #[\Override]
    public static function setUpBeforeClass(): void {
        global $CFG;
        require_once($CFG->dirroot . '/blocks/moodleblock.class.php');
        parent::setUpBeforeClass();
    }

    /**
     * Build a block that declares the given sizes, or throws while declaring its minimum.
     *
     * @param grid_size|null $minimum Declared minimum.
     * @param grid_size|null $preferred Declared preferred size.
     * @param \Throwable|null $throws Thrown from the minimum declaration instead of returning.
     * @param int|null $maximum Declared maximum rows.
     * @return \block_base
     */
    private function block(
        ?grid_size $minimum = null,
        ?grid_size $preferred = null,
        ?\Throwable $throws = null,
        ?int $maximum = null,
    ): \block_base {
        return new class ($minimum, $preferred, $throws, $maximum) extends \block_base {
            /**
             * Create the block.
             *
             * @param grid_size|null $minimum Declared minimum.
             * @param grid_size|null $preferred Declared preferred size.
             * @param \Throwable|null $throws Thrown from the minimum declaration.
             * @param int|null $maximum Declared maximum rows.
             */
            public function __construct(
                /** @var grid_size|null Declared minimum. */
                private ?grid_size $minimum,
                /** @var grid_size|null Declared preferred size. */
                private ?grid_size $preferred,
                /** @var \Throwable|null Thrown from the minimum declaration. */
                private ?\Throwable $throws,
                /** @var int|null Declared maximum rows. */
                private ?int $maximum,
            ) {
                parent::__construct();
            }

            /**
             * Set the block's title, as every block's init() must.
             */
            public function init() {
                $this->title = 'Grid size fixture';
            }

            #[\Override]
            public function get_grid_minimum_size(): ?grid_size {
                if ($this->throws) {
                    throw $this->throws;
                }
                return $this->minimum;
            }

            #[\Override]
            public function get_grid_preferred_size(): ?grid_size {
                return $this->preferred;
            }

            #[\Override]
            public function get_grid_maximum_rows(): ?int {
                return $this->maximum;
            }
        };
    }

    /**
     * A block that declares nothing gets the defaults, silently, and the base class declares nothing.
     */
    public function test_a_block_declaring_nothing_gets_the_defaults(): void {
        $this->resetAfterTest();
        $block = block_instance('html');

        $this->assertNull($block->get_grid_minimum_size());
        $this->assertNull($block->get_grid_preferred_size());
        $this->assertNull($block->get_grid_maximum_rows());
        $this->assertSame(dashboard::AUTO_ROWS_CAP, dashboard::get_maximum_rows($block));
        $this->assertSame(dashboard::get_minimum_size(), dashboard::get_minimum_size($block));
        $this->assertSame(['columns' => 2, 'rows' => 2], dashboard::get_minimum_size($block));
        // A block declaring no preferred height follows its content.
        $this->assertSame(
            ['columns' => dashboard::CONTENT_COLUMNS, 'rows' => null],
            dashboard::get_preferred_size($block),
        );
        $this->assertDebuggingNotCalled();
    }

    /**
     * Valid declarations are used as given, and the preferred size defaults around a declared minimum.
     *
     * @param grid_size|null $minimum Declared minimum.
     * @param grid_size|null $preferred Declared preferred size.
     * @param array $expectedminimum Resolved minimum.
     * @param array $expectedpreferred Resolved preferred size.
     */
    #[DataProvider('valid_declaration_provider')]
    public function test_valid_declarations_are_used(
        ?grid_size $minimum,
        ?grid_size $preferred,
        array $expectedminimum,
        array $expectedpreferred,
    ): void {
        $block = $this->block($minimum, $preferred);

        $this->assertSame($expectedminimum, dashboard::get_minimum_size($block));
        $this->assertSame($expectedpreferred, dashboard::get_preferred_size($block));
        $this->assertDebuggingNotCalled();
    }

    /**
     * Data provider for test_valid_declarations_are_used.
     *
     * @return array
     */
    public static function valid_declaration_provider(): array {
        return [
            'minimum only: the default width, following the content' => [
                new grid_size(2, 4), null, ['columns' => 2, 'rows' => 4], ['columns' => dashboard::CONTENT_COLUMNS, 'rows' => null],
            ],
            'minimum without rows: the default minimum height applies' => [
                new grid_size(2), null, ['columns' => 2, 'rows' => 2], ['columns' => dashboard::CONTENT_COLUMNS, 'rows' => null],
            ],
            'minimum and preferred' => [
                new grid_size(1, 4), new grid_size(2, 6), ['columns' => 1, 'rows' => 4], ['columns' => 2, 'rows' => 6],
            ],
            'preferred only' => [
                null, new grid_size(4, 5), ['columns' => 2, 'rows' => 2], ['columns' => 4, 'rows' => 5],
            ],
            'preferred height left to the content' => [
                new grid_size(1, 3), new grid_size(2), ['columns' => 1, 'rows' => 3], ['columns' => 2, 'rows' => null],
            ],
            'the full grid width and the tallest declarable minimum' => [
                new grid_size(grid_size::MAX_COLUMNS, grid_size::MAX_ROWS), null,
                ['columns' => grid_size::MAX_COLUMNS, 'rows' => grid_size::MAX_ROWS],
                ['columns' => grid_size::MAX_COLUMNS, 'rows' => null],
            ],
        ];
    }

    /**
     * An unusable minimum falls back to the default with a developer warning, not an error.
     *
     * @param grid_size $minimum Declared minimum.
     */
    #[DataProvider('invalid_minimum_provider')]
    public function test_an_invalid_minimum_falls_back_with_a_developer_warning(grid_size $minimum): void {
        $block = $this->block($minimum);

        $this->assertSame(dashboard::get_minimum_size(), dashboard::get_minimum_size($block));
        $this->assertDebuggingCalled(null, DEBUG_DEVELOPER);
    }

    /**
     * Data provider for test_an_invalid_minimum_falls_back_with_a_developer_warning.
     *
     * @return array
     */
    public static function invalid_minimum_provider(): array {
        return [
            'zero columns' => [new grid_size(0, 3)],
            'negative columns' => [new grid_size(-1, 3)],
            'wider than the grid' => [new grid_size(grid_size::MAX_COLUMNS + 1, 3)],
            'zero rows' => [new grid_size(1, 0)],
            'taller than allowed' => [new grid_size(1, grid_size::MAX_ROWS + 1)],
        ];
    }

    /**
     * An unusable preferred size falls back to the default placement with a developer warning.
     */
    public function test_an_invalid_preferred_size_falls_back_with_a_developer_warning(): void {
        $block = $this->block(null, new grid_size(0, 5));

        $this->assertSame(['columns' => dashboard::CONTENT_COLUMNS, 'rows' => null], dashboard::get_preferred_size($block));
        $this->assertDebuggingCalled(null, DEBUG_DEVELOPER);
    }

    /**
     * A preferred size smaller than the minimum is raised to it, with a developer warning.
     */
    public function test_a_preferred_size_below_the_minimum_is_raised_to_it(): void {
        $block = $this->block(new grid_size(2, 4), new grid_size(1, 3));

        $this->assertSame(['columns' => 2, 'rows' => 4], dashboard::get_preferred_size($block));
        $this->assertDebuggingCalled(null, DEBUG_DEVELOPER);
    }

    /**
     * A declaration that throws (e.g. a non-integer span) never stops the dashboard rendering.
     */
    public function test_a_declaration_that_throws_falls_back_with_a_developer_warning(): void {
        $block = $this->block(null, null, new \TypeError('grid_size::__construct(): Argument #1 must be of type int'));

        $this->assertSame(dashboard::get_minimum_size(), dashboard::get_minimum_size($block));
        $this->assertDebuggingCalled(null, DEBUG_DEVELOPER);
    }

    /**
     * A declared maximum is used; no maximum resolves to null; one below the minimum is raised to it.
     */
    public function test_a_declared_maximum_is_used(): void {
        $this->assertSame(10, dashboard::get_maximum_rows($this->block(null, null, null, 10)));
        $this->assertNull(dashboard::get_maximum_rows($this->block(null, null, null, grid_size::NO_MAXIMUM_ROWS)));
        $this->assertSame(4, dashboard::get_maximum_rows($this->block(new grid_size(1, 4), null, null, 3)));
        $this->assertDebuggingNotCalled();
    }

    /**
     * An unusable maximum falls back to the default, with a developer warning.
     */
    public function test_an_invalid_maximum_falls_back_with_a_developer_warning(): void {
        $this->assertSame(dashboard::AUTO_ROWS_CAP, dashboard::get_maximum_rows($this->block(null, null, null, -2)));
        $this->assertDebuggingCalled(null, DEBUG_DEVELOPER);
    }

    /**
     * Course overview declares no maximum: it shows a page of courses at a time.
     */
    public function test_course_overview_declares_no_maximum(): void {
        $this->resetAfterTest();

        $this->assertNull(dashboard::get_maximum_rows(block_instance('myoverview')));
        $this->assertDebuggingNotCalled();
    }

    /**
     * The calendar declares the minimum it needs to show a whole month.
     */
    public function test_the_calendar_declares_its_minimum(): void {
        $this->resetAfterTest();

        $this->assertSame(['columns' => 2, 'rows' => 4], dashboard::get_minimum_size(block_instance('calendar_month')));
        $this->assertDebuggingNotCalled();
    }
}
