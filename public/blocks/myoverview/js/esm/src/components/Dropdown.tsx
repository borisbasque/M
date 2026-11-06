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
 * Built on the design system Dropdown, so the trigger, menu, keyboard support
 * (arrow keys, Home/End, typeahead, Escape returning focus to the trigger) and
 * the selected-item check all come from there. The trigger shows the emphasis
 * appearance when the current value is non-default (MDL-88972), and a design
 * system Tooltip names it on hover and focus. Options are mutually exclusive.
 *
 * @module     block_myoverview/components/Dropdown
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Fragment, useState} from "react";
import {
    Dropdown as MdsDropdown, DropdownItemDivider, DropdownItemHeader, DropdownItemSelect, DropdownTrigger, Tooltip,
} from "@moodlehq/design-system";
import {faIcon} from "@moodle/lms/block_myoverview/components/Icon";

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
    /** Emphasise the trigger (current value differs from default). */
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
    const [open, setOpen] = useState(false);
    const selected = options.find((o) => o.value === current);
    const name = triggerAriaLabel ?? label;

    const trigger = (
        <DropdownTrigger
            // Icon-only triggers take their accessible name from the label; the labelled
            // filter shows the selection and keeps the fuller name as its aria-label.
            label={showLabel ? selected?.label ?? label : name}
            // Spread rather than passed as undefined, which would clear the icon-only name.
            {...(showLabel ? {"aria-label": name} : {})}
            iconOnly={!showLabel}
            startIcon={icon ? faIcon(icon) : undefined}
            appearance={active ? "emphasis" : "default"}
            open={open}
            className={showLabel ? "courseoverview-dropdown__trigger--labelled" : undefined}
        />
    );

    return (
        <Tooltip label={tooltip ?? label} className={showLabel ? "courseoverview-dropdown--labelled" : undefined}>
            <MdsDropdown
                // Named here too, so the tooltip describes the trigger rather than relabelling it.
                label={label}
                className="courseoverview-dropdown"
                trigger={trigger}
                open={open}
                onOpenChange={setOpen}
                placement={align === "start" ? "bottom-start" : "bottom-end"}
            >
                {menuTitle && <DropdownItemHeader label={menuTitle} />}
                {options.map((opt, i) => {
                    const groupEnd = !!groupOf && i < options.length - 1
                        && groupOf(opt.value) !== groupOf(options[i + 1].value);
                    return (
                        <Fragment key={opt.value}>
                            <DropdownItemSelect
                                label={opt.label}
                                selected={opt.value === current}
                                startIcon={opt.icon ? faIcon(opt.icon) : undefined}
                                onClick={() => {
                                    onSelect(opt.value);
                                    setOpen(false);
                                }}
                            />
                            {groupEnd && <DropdownItemDivider />}
                        </Fragment>
                    );
                })}
            </MdsDropdown>
        </Tooltip>
    );
}
