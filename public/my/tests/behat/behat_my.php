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

require_once(__DIR__ . '/../../../lib/behat/behat_base.php');

/**
 * Steps definitions related to the dashboard.
 *
 * @package    core_my
 * @category   test
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_my extends behat_base {
    /**
     * Add a block to the dashboard through the block browser, leaving it where it lands.
     *
     * Opens the browser from the toolbar, finds the block by name, inserts it and puts down the
     * newly added block, which arrives picked up ready to move.
     *
     * @When /^I add the "(?P<blockname_string>(?:[^"]|\\")*)" block to the dashboard$/
     * @param string $blockname The block's name, as listed in the browser.
     */
    public function i_add_the_block_to_the_dashboard(string $blockname): void {
        $this->execute('behat_general::i_click_on_in_the', [
            get_string('addblock'), 'button', '.core-my-dashboard-toolbar', 'css_element',
        ]);
        $this->execute('behat_forms::i_set_the_field_to', [get_string('browsersearch', 'my'), $blockname]);
        $this->execute('behat_general::i_click_on_in_the', [
            get_string('browserinsert', 'my'), 'button', get_string('addblock'), 'dialogue',
        ]);
        $this->execute('behat_general::i_press_named_key', ['', 'escape']);
    }

    /**
     * Re-run a script until its result satisfies a condition, rather than sleeping a fixed time.
     *
     * The editor's pointer and keyboard steps dispatch synthetic events and then read the DOM that
     * React re-renders in response; how long that takes varies with machine load. This polls (via
     * spin()) until the condition holds, and on timeout returns the last result so the calling
     * step's own assertion still reports what it actually saw.
     *
     * @param string $script JavaScript returning the value to check.
     * @param callable $condition Receives the script's result; returns true once it is as expected.
     * @return mixed The script's last result.
     */
    protected function spin_until_script(string $script, callable $condition): mixed {
        try {
            return $this->spin(
                function () use ($script, $condition): array|false {
                    $value = $this->evaluate_script($script);
                    // Wrapped, because spin() needs a truthy return and the value itself may be falsy.
                    return $condition($value) ? ['value' => $value] : false;
                },
                [],
                behat_base::get_reduced_timeout(),
                null,
                true,
            )['value'];
        } catch (Exception $exception) {
            return $this->evaluate_script($script);
        }
    }

    /**
     * Assert that the page-level dashboard editing switch is off.
     *
     * @Then the dashboard edit mode switch should be off
     */
    public function dashboard_edit_mode_switch_should_be_off(): void {
        $this->spin(
            function ($context): bool {
                return $context->evaluate_script(<<<'JS'
                    return document.querySelector('input[name="setmode"]')?.checked === false;
                JS);
            },
            false,
            5,
            new \Exception('The dashboard edit mode switch is still on after resetting the dashboard.')
        );
    }

    /**
     * Drag a dashboard block one column into free grid space and verify its saved position.
     *
     * @Then dragging the :block dashboard block into an adjacent free column persists
     * @param string $block Block name.
     */
    public function dragging_dashboard_block_into_an_adjacent_free_column_persists(string $block): void {
        $drag = $this->evaluate_script(<<<JS
            return (() => {
                const tile = document.querySelector('.core-my-dashboard-tile[data-block="{$block}"]');
                const handle = tile?.querySelector('.core-my-dashboard-handle--move');
                const grid = document.querySelector('.core-my-dashboard-grid');
                if (!tile || !handle || !grid) {
                    return null;
                }
                const tilerect = tile.getBoundingClientRect();
                const handlerect = handle.getBoundingClientRect();
                const gridrect = grid.getBoundingClientRect();
                const columns = Number(grid.dataset.columns);
                const gap = parseFloat(getComputedStyle(grid).gap);
                const stride = (gridrect.width - gap * (columns - 1)) / columns + gap;
                const column = Number(getComputedStyle(tile).gridColumnStart);
                const span = Number(getComputedStyle(tile).gridColumnEnd.replace('span ', ''));
                const direction = column + span <= columns ? 1 : -1;
                if (direction < 0 && column <= 1) {
                    return {error: 'The fixture does not have an adjacent free column.'};
                }
                const x = handlerect.left + handlerect.width / 2;
                const y = handlerect.top + handlerect.height / 2;
                const pointer = (type, clientx, buttons) => new PointerEvent(type, {
                    bubbles: true,
                    button: 0,
                    buttons,
                    clientX: clientx,
                    clientY: y,
                    isPrimary: true,
                    pointerId: 3,
                    pointerType: 'mouse',
                });
                handle.dispatchEvent(pointer('pointerdown', x, 1));
                window.dispatchEvent(pointer('pointermove', x + direction * stride * 0.75, 1));
                return {column, expected: column + direction, x, y, stride, direction};
            })();
        JS);

        if ($drag === null || isset($drag['error'])) {
            throw new \Exception($drag['error'] ?? 'The dashboard move handle was not found.');
        }

        $preview = $this->spin_until_script(<<<JS
            return (() => {
                const tile = document.querySelector('.core-my-dashboard-tile[data-block="{$block}"]');
                return {
                    dragging: tile?.classList.contains('core-my-dashboard-tile--pointer-dragging'),
                    transform: tile?.style.transform,
                };
            })();
        JS, static fn($preview): bool => !empty($preview['dragging']) && !empty($preview['transform']));
        if (empty($preview['dragging']) || empty($preview['transform'])) {
            throw new \Exception('Dashboard move did not produce a fluid drag preview: ' . json_encode($preview));
        }
        $this->evaluate_script(<<<JS
            window.dispatchEvent(new PointerEvent('pointerup', {
                bubbles: true,
                button: 0,
                buttons: 0,
                clientX: {$drag['x']} + {$drag['direction']} * {$drag['stride']} * 0.75,
                clientY: {$drag['y']},
                isPrimary: true,
                pointerId: 3,
                pointerType: 'mouse',
            }));
            return true;
        JS);
        // The pointerup commits through a web service call; wait for the tile to land rather than
        // for a fixed time.
        $actual = (int) $this->spin_until_script(<<<JS
            return getComputedStyle(document.querySelector('.core-my-dashboard-tile[data-block="{$block}"]')).gridColumnStart;
        JS, static fn($column): bool => (int) $column === $drag['expected']);
        if ($actual !== $drag['expected']) {
            throw new \Exception("Dashboard block '{$block}' starts in grid column '{$actual}', expected '{$drag['expected']}'.");
        }
    }

    /**
     * Assert that keyboard activation exposes the discrete resize controls.
     *
     * @Then keyboard activation shows resize directional controls
     */
    public function keyboard_activation_shows_resize_directional_controls(): void {
        $activated = $this->evaluate_script(<<<'JS'
            return (() => {
                const handle = document.querySelector(
                    ".core-my-dashboard-tile[data-block='calendar_month'] .core-my-dashboard-handle--resize"
                );
                if (!handle) {
                    return null;
                }
                handle.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'Enter'}));
                return true;
            })();
        JS);

        if ($activated === null) {
            throw new \Exception('The Calendar resize handle was not found.');
        }

        $controls = $this->spin_until_script(<<<'JS'
            return document.querySelectorAll('.core-my-grid-controls__direction').length;
        JS, static fn($controls): bool => $controls === 4);
        $this->evaluate_script(<<<'JS'
            document.querySelector(".core-my-dashboard-tile[data-block='calendar_month'] .core-my-dashboard-handle--resize")
                ?.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true, key: 'Escape'}));
            return true;
        JS);

        if ($controls !== 4) {
            throw new \Exception('Keyboard activation did not show all resize directional controls.');
        }
    }

    /**
     * Assert that a pointer resize stays fluid until it crosses a grid-cell threshold.
     *
     * @Then the mouse resize preview follows the pointer before snapping to a grid cell
     */
    public function mouse_resize_preview_follows_the_pointer(): void {
        $start = $this->evaluate_script(<<<'JS'
            return (() => {
                const tile = document.querySelector(".core-my-dashboard-tile[data-block='calendar_month']");
                const handle = tile?.querySelector('.core-my-dashboard-handle--resize');
                const grid = document.querySelector('.core-my-dashboard-grid');
                if (!tile || !handle || !grid) {
                    return null;
                }

                const tilerect = tile.getBoundingClientRect();
                const gridrect = grid.getBoundingClientRect();
                const columns = Number(grid.dataset.columns);
                const gap = parseFloat(getComputedStyle(grid).gap);
                const cellwidth = (gridrect.width - gap * (columns - 1)) / columns;
                const pointer = (type, x) => new PointerEvent(type, {
                    bubbles: true,
                    button: 0,
                    buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
                    clientX: x,
                    clientY: tilerect.bottom - 20,
                    isPrimary: true,
                    pointerId: 1,
                    pointerType: 'mouse',
                });
                const x = tilerect.right - 20;
                handle.dispatchEvent(pointer('pointerdown', x));
                window.dispatchEvent(pointer('pointermove', x + (cellwidth + gap) * 0.4));
                return {x, y: tilerect.bottom - 20, stride: cellwidth + gap, width: tilerect.width};
            })();
        JS);

        if ($start === null) {
            throw new \Exception('The Calendar resize handle was not found.');
        }

        $beforethreshold = $this->spin_until_script(<<<'JS'
            return (() => {
                const tile = document.querySelector(".core-my-dashboard-tile[data-block='calendar_month']");
                return {
                    dragging: tile?.classList.contains('core-my-dashboard-tile--pointer-dragging'),
                    width: parseFloat(tile?.style.width || '0'),
                    prospective: document.querySelectorAll('.core-my-grid-cell--prospective').length,
                    controls: document.querySelectorAll('.core-my-grid-controls__direction').length,
                };
            })();
        JS, static fn($value): bool => $value['dragging'] && $value['width'] > $start['width']
                && $value['prospective'] === 0 && $value['controls'] === 0);

        if (
            !$beforethreshold['dragging'] || $beforethreshold['width'] <= $start['width'] ||
                $beforethreshold['prospective'] !== 0 || $beforethreshold['controls'] !== 0
        ) {
            throw new \Exception('Resize did not remain fluid below the grid-cell threshold: ' .
                json_encode($beforethreshold));
        }

        $this->evaluate_script(<<<JS
            window.dispatchEvent(new PointerEvent('pointermove', {
                bubbles: true,
                buttons: 1,
                clientX: {$start['x']} + {$start['stride']} * 0.6,
                clientY: {$start['y']},
                isPrimary: true,
                pointerId: 1,
                pointerType: 'mouse',
            }));
            return true;
        JS);
        $afterthreshold = $this->spin_until_script(<<<'JS'
            return {
                prospective: document.querySelectorAll('.core-my-grid-cell--prospective').length,
                controls: document.querySelectorAll('.core-my-grid-controls__direction').length,
            };
        JS, static fn($value): bool => $value['prospective'] !== 0 && $value['controls'] === 0);
        $this->evaluate_script(<<<'JS'
            window.dispatchEvent(new PointerEvent('pointercancel', {
                bubbles: true,
                pointerId: 1,
                pointerType: 'mouse',
            }));
            return true;
        JS);

        if ($afterthreshold['prospective'] === 0 || $afterthreshold['controls'] !== 0) {
            throw new \Exception('Pointer resize controls or snap preview are incorrect after crossing the threshold: ' .
                json_encode($afterthreshold));
        }

        // Shrink a multi-column block: the Calendar starts at the one-column minimum in the default
        // layout, so it can never preview narrower and would fail this check for the right reason.
        $shrinkstart = $this->evaluate_script(<<<'JS'
            return (() => {
                const tile = document.querySelector(".core-my-dashboard-tile[data-block='myoverview']");
                const handle = tile?.querySelector('.core-my-dashboard-handle--resize');
                const grid = document.querySelector('.core-my-dashboard-grid');
                if (!tile || !handle || !grid) {
                    return null;
                }

                const tilerect = tile.getBoundingClientRect();
                const gridrect = grid.getBoundingClientRect();
                const columns = Number(grid.dataset.columns);
                const gap = parseFloat(getComputedStyle(grid).gap);
                const stride = (gridrect.width - gap * (columns - 1)) / columns + gap;
                const x = tilerect.right - 20;
                const y = tilerect.bottom - 20;
                const pointer = (type, clientx) => new PointerEvent(type, {
                    bubbles: true,
                    buttons: 1,
                    clientX: clientx,
                    clientY: y,
                    isPrimary: true,
                    pointerId: 2,
                    pointerType: 'mouse',
                });
                handle.dispatchEvent(pointer('pointerdown', x));
                window.dispatchEvent(pointer('pointermove', x - stride * 0.4));
                return {width: tilerect.width};
            })();
        JS);

        if ($shrinkstart === null) {
            throw new \Exception('The Course overview resize handle was not found for the shrink preview.');
        }

        $shrinkpreview = $this->spin_until_script(<<<'JS'
            return (() => {
                const tile = document.querySelector(".core-my-dashboard-tile[data-block='myoverview']");
                return {
                    width: parseFloat(tile?.style.width || '0'),
                    prospective: document.querySelectorAll('.core-my-grid-cell--prospective').length,
                };
            })();
        JS, static fn($value): bool => $value['width'] < $shrinkstart['width'] && $value['prospective'] !== 0);
        $this->evaluate_script(<<<'JS'
            window.dispatchEvent(new PointerEvent('pointercancel', {
                bubbles: true,
                pointerId: 2,
                pointerType: 'mouse',
            }));
            return true;
        JS);

        if ($shrinkpreview['width'] >= $shrinkstart['width'] || $shrinkpreview['prospective'] === 0) {
            throw new \Exception('Resize did not show its occupied cells while shrinking below the snap threshold: ' .
                json_encode($shrinkpreview));
        }
    }

    /**
     * Assert that a pointer resize eases blocks that are displaced by its new grid footprint.
     *
     * @Then blocks bumped by a pointer resize ease into their new grid position
     */
    public function bumped_blocks_ease_into_their_new_grid_position(): void {
        // A resize handle only ever grows a tile rightwards from its fixed left edge, so the
        // tile needs real content in the way of that growth to produce a bump. With the default
        // layout's empty margin columns, Calendar (anchored hard against the grid's right edge)
        // has no room left to grow into and would never collide with anything. Course overview
        // starts with room to spare before the Calendar column, so growing it is guaranteed to
        // collide with, and bump, its row neighbour.
        $start = $this->evaluate_script(<<<'JS'
            return (() => {
                const tile = document.querySelector(".core-my-dashboard-tile[data-block='myoverview']");
                const handle = tile?.querySelector('.core-my-dashboard-handle--resize');
                const grid = document.querySelector('.core-my-dashboard-grid');
                if (!tile || !handle || !grid) {
                    return null;
                }
                const tileRect = tile.getBoundingClientRect();
                const gridRect = grid.getBoundingClientRect();
                const columns = Number(grid.dataset.columns);
                const gap = parseFloat(getComputedStyle(grid).gap);
                const stride = (gridRect.width - gap * (columns - 1)) / columns + gap;
                const x = tileRect.right - 20;
                const y = tileRect.bottom - 20;
                const pointer = (type, clientX, buttons) => new PointerEvent(type, {
                    bubbles: true,
                    button: 0,
                    buttons,
                    clientX,
                    clientY: y,
                    isPrimary: true,
                    pointerId: 4,
                    pointerType: 'mouse',
                });
                handle.dispatchEvent(pointer('pointerdown', x, 1));
                window.dispatchEvent(pointer('pointermove', x + stride * 0.75, 1));
                return {x, y};
            })();
        JS);

        if ($start === null) {
            throw new \Exception('The Course overview resize handle was not found.');
        }

        $animation = $this->spin_until_script(<<<'JS'
            return (() => {
                const tile = document.querySelector('.core-my-dashboard-tile[data-bumped="true"]');
                if (!tile) {
                    return null;
                }
                return {
                    animations: tile.getAnimations().map(animation => ({
                        duration: animation.effect?.getTiming().duration,
                        state: animation.playState,
                    })),
                };
            })();
        JS, static fn($value): bool => $value !== null && array_filter(
                $value['animations'],
                fn(array $animation): bool => $animation['duration'] === 180 && $animation['state'] !== 'finished'
            ));
        if (
            $animation === null ||
            !array_filter(
                $animation['animations'],
                fn(array $animation): bool => $animation['duration'] === 180 && $animation['state'] !== 'finished'
            )
        ) {
            throw new \Exception('A bumped dashboard tile did not run its position easing animation: ' .
                json_encode($animation));
        }

        $returning = $this->evaluate_script(<<<JS
            return (() => {
                const tile = document.querySelector('.core-my-dashboard-tile[data-bumped="true"]');
                const grid = document.querySelector('.core-my-dashboard-grid');
                const handle = document.querySelector(
                    ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-handle--resize"
                );
                if (!tile || !grid || !handle) {
                    return null;
                }
                const gridRect = grid.getBoundingClientRect();
                const columns = Number(grid.dataset.columns);
                const gap = parseFloat(getComputedStyle(grid).gap);
                const stride = (gridRect.width - gap * (columns - 1)) / columns + gap;
                window.dispatchEvent(new PointerEvent('pointermove', {
                    bubbles: true,
                    buttons: 1,
                    clientX: {$start['x']} + stride * 0.4,
                    clientY: {$start['y']},
                    isPrimary: true,
                    pointerId: 4,
                    pointerType: 'mouse',
                }));
                return {block: tile.dataset.block};
            })();
        JS);
        if ($returning === null) {
            throw new \Exception('The bumped dashboard tile did not remain available for the return animation.');
        }
        $returnanimation = $this->spin_until_script(<<<JS
            return (() => {
                const tile = document.querySelector('.core-my-dashboard-tile[data-block="{$returning['block']}"]');
                if (!tile) {
                    return null;
                }
                return tile.getAnimations().map(animation => ({
                    duration: animation.effect?.getTiming().duration,
                    state: animation.playState,
                }));
            })();
        JS, static fn($value): bool => $value !== null && array_filter(
                $value,
                fn(array $animation): bool => $animation['duration'] === 180 && $animation['state'] !== 'finished'
            ));
        $this->evaluate_script(<<<JS
            window.dispatchEvent(new PointerEvent('pointercancel', {
                bubbles: true,
                pointerId: 4,
                pointerType: 'mouse',
                clientX: {$start['x']},
                clientY: {$start['y']},
            }));
            return true;
        JS);
        if (
            $returnanimation === null ||
            !array_filter(
                $returnanimation,
                fn(array $animation): bool => $animation['duration'] === 180 && $animation['state'] !== 'finished'
            )
        ) {
            throw new \Exception('A returning dashboard tile did not run its position easing animation: ' .
                json_encode($returnanimation));
        }
    }

    /**
     * Assert that the four resize controls are centred around their active handle.
     *
     * @Then the resize directional controls are centred on the active resize handle
     */
    public function resize_directional_controls_are_centred(): void {
        $geometry = $this->evaluate_script(<<<'JS'
            return (() => {
                const handle = document.querySelector('.core-my-dashboard-handle--resize[aria-pressed="true"]');
                const controls = handle?.closest('.core-my-dashboard-handle-wrapper')?.querySelector('.core-my-grid-controls');
                if (!handle || !controls) {
                    return null;
                }

                const centre = rect => ({x: rect.left + rect.width / 2, y: rect.top + rect.height / 2});
                const handlecentre = centre(handle.getBoundingClientRect());
                const directions = ['up', 'left', 'right', 'down'];
                const offsets = Object.fromEntries(directions.map(direction => {
                    const control = controls.querySelector(`.core-my-grid-controls__direction--${direction}`);
                    const controlcentre = centre(control.getBoundingClientRect());
                    const iconrect = control.querySelector('i').getBoundingClientRect();
                    return [direction, {
                        x: controlcentre.x - handlecentre.x,
                        y: controlcentre.y - handlecentre.y,
                        iconwidth: iconrect.width,
                        iconheight: iconrect.height,
                        controlwidth: control.getBoundingClientRect().width,
                        controlheight: control.getBoundingClientRect().height,
                    }];
                }));

                return {offsets};
            })();
        JS);

        if ($geometry === null) {
            throw new \Exception('The active resize handle or its directional controls were not found.');
        }

        $offsets = $geometry['offsets'];
        $tolerance = 1;
        if (
            abs($offsets['up']['x']) > $tolerance || abs($offsets['down']['x']) > $tolerance ||
                abs($offsets['left']['y']) > $tolerance || abs($offsets['right']['y']) > $tolerance
        ) {
            throw new \Exception('Resize directional controls are not centred: ' . json_encode($offsets));
        }

        foreach ($offsets as $offset) {
            if (
                abs($offset['iconwidth'] - $offset['controlwidth']) > $tolerance ||
                    abs($offset['iconheight'] - $offset['controlheight']) > $tolerance
            ) {
                throw new \Exception('Resize directional icons do not fill their controls: ' . json_encode($offsets));
            }
        }
    }

    /**
     * Assert that growing a block into a row neighbour pushes that neighbour sideways into free
     * grid space, rather than relocating it to the start of the row.
     *
     * The default dashboard fixture fills the row with no free column, so the Calendar block is
     * first shrunk by one column to reproduce the "one empty column at the row's end" layout the
     * bug report was raised against, before Course overview is grown into it.
     *
     * @Then resizing the Course overview block into its row neighbour pushes it right
     */
    public function resizing_into_row_neighbour_pushes_it_right(): void {
        $this->execute('behat_general::i_click_on_in_the', ['Resize block', 'button', 'Calendar', 'block']);
        $this->execute('behat_general::i_click_on_in_the', ['Left', 'button', 'Calendar', 'block']);
        $this->execute('behat_general::i_click_on_in_the', ['Resize block', 'button', 'Calendar', 'block']);

        $result = $this->keyboard_resize_and_capture_bumped_tile('Course overview', 'myoverview', 'Right');
        if ($result['block'] !== 'calendar_month') {
            throw new \Exception('Expected the Calendar block to be pushed: ' . json_encode($result));
        }
        if ($result['before']['row'] !== $result['after']['row']) {
            throw new \Exception('The pushed row neighbour changed row instead of staying in place: ' .
                json_encode($result));
        }
        if ($result['after']['column'] <= $result['before']['column']) {
            throw new \Exception('The pushed row neighbour did not move further right into free space: ' .
                json_encode($result));
        }
    }

    /**
     * Assert that growing a block into a column neighbour pushes that neighbour downwards into
     * free grid space, rather than relocating it to the start of the grid.
     *
     * @Then resizing the Calendar block into its column neighbour pushes it down
     */
    public function resizing_into_column_neighbour_pushes_it_down(): void {
        $result = $this->keyboard_resize_and_capture_bumped_tile('Calendar', 'calendar_month', 'Down');
        if ($result['block'] !== 'recentlyaccesseditems') {
            throw new \Exception('Expected the Recently accessed items block to be pushed: ' . json_encode($result));
        }
        if ($result['before']['column'] !== $result['after']['column']) {
            throw new \Exception('The pushed column neighbour changed column instead of staying in place: ' .
                json_encode($result));
        }
        if ($result['after']['row'] <= $result['before']['row']) {
            throw new \Exception('The pushed column neighbour did not move further down into free space: ' .
                json_encode($result));
        }
    }

    /**
     * Assert that Calendar's day cells render at their intended compact height when the block's
     * tile is narrow, rather than the full-page calendar view's much taller day cell.
     *
     * Boost's full calendar view sets a fixed, tall day-cell height via a rule scoped to
     * "#region-main .maincalendar .calendarwrapper td > div". Legacy block regions never
     * rendered inside #region-main, so that rule never reached block content; the dashboard grid
     * does render inside #region-main, so without an explicit override the leaked rule forces a
     * tall day cell and a scrolling month grid regardless of how narrow the tile actually is.
     *
     * @Then the Calendar block renders compact day cells
     */
    public function the_calendar_block_renders_compact_day_cells(): void {
        $result = $this->evaluate_script(<<<'JS'
            return (() => {
                const tile = document.querySelector(".core-my-dashboard-tile[data-block='calendar_month']");
                const content = tile?.querySelector('.core-my-dashboard-tile__content');
                const day = content?.querySelector('.calendartable.calendarmonth td:not(.dayblank) > div');
                if (!tile || !content || !day) {
                    return null;
                }
                return {
                    tilewidth: tile.getBoundingClientRect().width,
                    dayheight: day.getBoundingClientRect().height,
                    scrollheight: content.scrollHeight,
                    clientheight: content.clientHeight,
                };
            })();
        JS);

        if ($result === null) {
            throw new \Exception('Could not find a Calendar day cell to measure.');
        }
        // A compact day cell is a small fraction of the leaked full-page height (previously
        // observed around 166px); comfortably below that without pinning to an exact pixel value.
        // This intentionally does not also assert zero scroll: Calendar's own toolbar (course
        // filter, "New event" button) can still exceed a narrow tile's default row allocation
        // even once day cells are compact, which is a separate density question, not this leak.
        if ($result['dayheight'] >= 60) {
            throw new \Exception('Calendar day cells are not rendering at their compact height: ' .
                json_encode($result));
        }
    }

    /**
     * Assert the block actions menu trigger sits to the right of the tile's discrete delete
     * button, matching the control ordering used on every other block-bearing page in LMS.
     *
     * @Then the block actions menu sits to the right of the delete control
     */
    public function the_block_actions_menu_sits_to_the_right_of_the_delete_control(): void {
        $result = $this->evaluate_script(<<<'JS'
            return (() => {
                const actions = document.querySelector(
                    ".core-my-dashboard-tile[data-block='myoverview'] .core-my-dashboard-tile__actions"
                );
                const remove = actions?.querySelector('.core-my-dashboard-remove');
                const menu = actions?.querySelector('.core-my-dashboard-block-actions__trigger');
                if (!remove || !menu) {
                    return null;
                }
                return {
                    removeleft: remove.getBoundingClientRect().left,
                    menuleft: menu.getBoundingClientRect().left,
                };
            })();
        JS);

        if ($result === null) {
            throw new \Exception('Could not find both the delete control and the block actions menu trigger.');
        }
        if ($result['menuleft'] <= $result['removeleft']) {
            throw new \Exception('The block actions menu trigger is not to the right of the delete control: ' .
                json_encode($result));
        }
    }

    /**
     * Grow a block by one grid cell in the given direction, using the same discrete-control click
     * sequence as the existing accessible-controls scenario (activate, direction, activate again
     * to commit), and capture the grid position of whichever other tile moved as a result.
     *
     * The pointer-only "bumped" marker used for the FLIP-easing animation is not set for
     * keyboard-origin interactions, so the displaced tile is identified by diffing positions
     * instead.
     *
     * @param string $blocklabel Human-readable block title, as used in "in the ... block" steps.
     * @param string $blockname Internal block name (data-block attribute value) of the resized block.
     * @param string $direction One of 'Right' or 'Down'.
     * @return array Displaced block name plus its before/after {column, row}.
     */
    protected function keyboard_resize_and_capture_bumped_tile(
        string $blocklabel,
        string $blockname,
        string $direction
    ): array {
        $before = $this->read_dashboard_tile_positions();

        $this->execute('behat_general::i_click_on_in_the', ['Resize block', 'button', $blocklabel, 'block']);
        $this->execute('behat_general::i_click_on_in_the', [$direction, 'button', $blocklabel, 'block']);
        $this->execute('behat_general::i_click_on_in_the', ['Resize block', 'button', $blocklabel, 'block']);

        $after = $this->read_dashboard_tile_positions();
        $displaced = null;
        foreach ($before as $name => $position) {
            if ($name !== $blockname && $position !== ($after[$name] ?? null)) {
                $displaced = $name;
                break;
            }
        }

        if ($displaced === null) {
            throw new \Exception('No other dashboard tile moved as a result of the resize: ' .
                json_encode(['before' => $before, 'after' => $after]));
        }

        return [
            'block' => $displaced,
            'before' => $before[$displaced],
            'after' => $after[$displaced],
        ];
    }

    /**
     * Read the current grid column/row of every dashboard tile.
     *
     * @return array Map of block name to {column, row}.
     */
    protected function read_dashboard_tile_positions(): array {
        return $this->evaluate_script(<<<'JS'
            return Object.fromEntries(
                Array.from(document.querySelectorAll('.core-my-dashboard-tile[data-block]')).map(candidate => {
                    const style = getComputedStyle(candidate);
                    return [candidate.dataset.block, {
                        column: Number(style.gridColumnStart),
                        row: Number(style.gridRowStart),
                    }];
                })
            );
        JS);
    }

    /**
     * Drag a block's resize handle upwards by a number of rows with the pointer, and release.
     *
     * @When I drag the :block dashboard block's resize handle up by :rows rows
     * @param string $block Block name, e.g. calendar_month.
     * @param int $rows Rows to drag by.
     */
    public function i_drag_the_dashboard_blocks_resize_handle_up(string $block, int $rows): void {
        $started = $this->evaluate_script(<<<JS
            return (() => {
                const tile = document.querySelector('.core-my-dashboard-tile[data-block="{$block}"]');
                const handle = tile?.querySelector('.core-my-dashboard-handle--resize');
                const grid = document.querySelector('.core-my-dashboard-grid');
                if (!tile || !handle || !grid) {
                    return false;
                }
                const style = getComputedStyle(grid);
                const stride = parseFloat(style.gridAutoRows) + parseFloat(style.rowGap);
                const rect = handle.getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;
                const pointer = (type, clienty, buttons) => new PointerEvent(type, {
                    bubbles: true, button: 0, buttons, clientX: x, clientY: clienty,
                    isPrimary: true, pointerId: 7, pointerType: 'mouse',
                });
                handle.dispatchEvent(pointer('pointerdown', y, 1));
                window.dispatchEvent(pointer('pointermove', y - {$rows} * stride, 1));
                window.__dashboardDragRelease = () => window.dispatchEvent(pointer('pointerup', y - {$rows} * stride, 0));
                return true;
            })();
        JS);
        if (!$started) {
            throw new \Exception("The {$block} dashboard block's resize handle was not found.");
        }
        $this->wait_for_pending_js();
        $this->execute_script('window.__dashboardDragRelease();');
        $this->wait_for_pending_js();
    }

    /**
     * Assert a dashboard block's rendered row span.
     *
     * @Then the :block dashboard block should be :rows rows tall
     * @param string $block Block name, e.g. calendar_month.
     * @param int $rows Expected row span.
     */
    public function the_dashboard_block_should_be_rows_tall(string $block, int $rows): void {
        $script = <<<JS
            return getComputedStyle(document.querySelector('.core-my-dashboard-tile[data-block="{$block}"]')).gridRowEnd;
        JS;
        $actual = $this->spin_until_script($script, static fn($value): bool => $value === "span {$rows}");
        if ($actual !== "span {$rows}") {
            throw new \Exception("The {$block} dashboard block spans '{$actual}', expected 'span {$rows}'.");
        }
    }

    /**
     * Assert a dashboard block's rendered row span is within a range.
     *
     * @Then the :block dashboard block should be between :min and :max rows tall
     * @param string $block Block name, e.g. myoverview.
     * @param int $min Fewest rows expected.
     * @param int $max Most rows expected.
     */
    public function the_dashboard_block_should_be_between_rows_tall(string $block, int $min, int $max): void {
        $script = <<<JS
            return getComputedStyle(document.querySelector('.core-my-dashboard-tile[data-block="{$block}"]')).gridRowEnd;
        JS;
        $inrange = static function ($value) use ($min, $max): bool {
            $rows = (int) str_replace('span ', '', (string) $value);
            return $rows >= $min && $rows <= $max;
        };
        $actual = $this->spin_until_script($script, $inrange);
        if (!$inrange($actual)) {
            throw new \Exception("The {$block} dashboard block spans '{$actual}', expected {$min} to {$max} rows.");
        }
    }
}
