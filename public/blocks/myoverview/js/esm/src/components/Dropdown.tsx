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

/**
 * Generic single-select toolbar dropdown (used for filter, sort and layout).
 *
 * Shows a tooltip (title) and an active-state class when the current value is
 * non-default (MDL-88972). Opens on click, closes on outside click or Escape,
 * and returns focus to the trigger. Options are mutually exclusive.
 *
 * Keyboard: ArrowDown/ArrowUp move focus between items; Home/End jump to
 * first/last; Escape closes and returns focus to trigger; Tab closes.
 *
 * @module     block_myoverview/components/Dropdown
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useDismissableMenu} from "../hooks/useDismissableMenu";
import {useDismissableTooltip} from "../hooks/useDismissableTooltip";
import Icon from "@moodle/lms/block_myoverview/components/Icon";

export type DropdownOption<T extends string> = {
    value: T;
    label: string;
    icon?: string;
};


type DropdownProps<T extends string> = {
    /** Trigger tooltip / accessible name for the menu. */
    label: string;
    /** Override for the trigger button's aria-label (e.g. include current selection). */
    triggerAriaLabel?: string;
    /** Leading icon on the trigger. Omitted for the labelled filter, which relies on its text. */
    icon?: string;
    options: DropdownOption<T>[];
    current: T;
    onSelect: (value: T) => void;
    /** Highlight the trigger as active (current value differs from default). */
    active: boolean;
    /** When true, show the selected option's label on the trigger (filter). */
    showLabel?: boolean;
    /** Optional heading shown at the top of the open menu (Figma group label). */
    menuTitle?: string;
    /** Short hover tooltip on the trigger; defaults to `label` when omitted. */
    tooltip?: string;
    /**
     * Optional grouping function. When supplied, a divider is drawn after any
     * item whose group differs from the next item's group (Figma menu grouping).
     */
    groupOf?: (value: T) => string;
    /**
     * Horizontal anchor for the open menu. "end" (default) aligns the menu to the
     * trigger's right edge; "start" aligns to the left edge — used for the filter
     * button so its menu stays on-screen in the narrow block drawer.
     */
    align?: "start" | "end";
};


/**
 * Render a labelled or icon-only single-select dropdown.
 *
 * @param props Dropdown configuration.
 * @returns The dropdown element.
 */
export default function Dropdown<T extends string>({
    label, triggerAriaLabel, icon, options, current, onSelect, active, showLabel = false, menuTitle,
    tooltip, groupOf, align = "end",
}: DropdownProps<T>) {
    const {open, setOpen, containerRef, triggerRef, menuRef, handleMenuKeyDown} =
        useDismissableMenu("menuitemradio");
    const {tooltipAttr, tooltipTriggerProps} = useDismissableTooltip();
    const selected = options.find((o) => o.value === current);

    return (
        <div
            className={`courseoverview-dropdown${showLabel ? " courseoverview-dropdown--labelled" : ""}`}
            ref={containerRef}
        >
            <button
                type="button"
                ref={triggerRef}
                className={`courseoverview-toolbtn${active ? " is-active" : ""}`
                    + `${showLabel ? " courseoverview-toolbtn--labelled" : ""}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label={triggerAriaLabel ?? label}
                data-tooltip={tooltipAttr(tooltip ?? label)}
                onClick={() => setOpen((v) => !v)}
                {...tooltipTriggerProps}
            >
                {icon && <Icon name={icon} />}
                {showLabel && <span className="courseoverview-toolbtn__label">{selected?.label ?? label}</span>}
                {showLabel && <Icon name="chevron-down" className="courseoverview-toolbtn__caret" />}
            </button>
            {open && (
                <div
                    className={`courseoverview-menu__list${align === "start" ? " courseoverview-menu__list--start" : ""}`}
                    role="menu"
                    aria-label={label}
                    ref={menuRef}
                    onKeyDown={handleMenuKeyDown}
                >
                    {menuTitle && (
                        <div className="courseoverview-menu__group-label" aria-hidden="true">{menuTitle}</div>
                    )}
                    <div role="group" aria-label={menuTitle ?? label}>
                        {options.map((opt, i) => {
                            const groupEnd = !!groupOf && i < options.length - 1
                                && groupOf(opt.value) !== groupOf(options[i + 1].value);
                            return (
                            <button
                                key={opt.value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={opt.value === current}
                                className={`courseoverview-menu__item${opt.value === current ? " is-selected" : ""}`
                                    + `${groupEnd ? " courseoverview-menu__item--group-end" : ""}`}
                                onClick={() => {
                                    onSelect(opt.value);
                                    setOpen(false);
                                    triggerRef.current?.focus();
                                }}
                            >
                                {opt.icon && <Icon name={opt.icon} className="courseoverview-menu__icon" />}
                                {opt.label}
                                {opt.value === current && <Icon name="check" className="courseoverview-menu__check" />}
                            </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
