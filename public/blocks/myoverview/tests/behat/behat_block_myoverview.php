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

// NOTE: no MOODLE_INTERNAL test here, this file may be required by behat before including /config.php.

require_once(__DIR__ . '/../../../../lib/behat/behat_base.php');

use Behat\Mink\Exception\ExpectationException;

/**
 * Steps definitions for the course overview block.
 *
 * @package    block_myoverview
 * @category   test
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_block_myoverview extends behat_base {
    /**
     * Assert the rendered card grid's computed column count.
     *
     * The column count is driven by container-width tier classes a ResizeObserver
     * applies (Moodle's plugin CSS pipeline strips @container queries), so this
     * asserts the LIVE computed layout — a regression here (e.g. the observer
     * watching a detached node after a React remount) is invisible to selector
     * or text assertions.
     *
     * @Then /^the course overview card grid should render "(?P<count>\d+)" columns?$/
     * @param int $count The expected number of grid columns.
     */
    public function the_course_overview_card_grid_should_render_columns(int $count): void {
        // Wait until the grid exists and its computed column count settles on the
        // expectation (the ResizeObserver applies width classes asynchronously).
        $js = <<<'JS'
            (function() {
                const grid = document.querySelector('.block-myoverview .courseoverview-list--card');
                if (!grid) {
                    return 'no-grid';
                }
                return String(getComputedStyle(grid).gridTemplateColumns.split(' ').length);
            })()
JS;
        $expected = (string) $count;
        $this->spin(
            function () use ($js, $expected) {
                $actual = $this->evaluate_script($js);
                if ($actual !== $expected) {
                    throw new ExpectationException(
                        "Expected the card grid to render {$expected} columns, got '{$actual}'",
                        $this->getSession()
                    );
                }
                return true;
            }
        );
    }
}
