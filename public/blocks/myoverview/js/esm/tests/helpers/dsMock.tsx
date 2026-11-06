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
 * Shared @moodlehq/design-system mock for the block's Jest suites.
 *
 * The design-system package is ESM-only, so Jest cannot require it; every test
 * that renders a tree containing DS components mocks it from this single file
 * so the mocked contract cannot drift between suites (each mock mirrors the
 * prop names the real component accepts, e.g. aria-label, not ariaLabel).
 *
 * Not a test file: the helpers directory is outside the tests glob.
 *
 * @copyright  2026 Kieran Gray <kieran@productised.com.au>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React from "react";

export const Button = (props: {label: string; disabled?: boolean; onClick: () => void; "data-action"?: string}) => (
    <button type="button" disabled={props.disabled} onClick={props.onClick} data-action={props["data-action"]}>
        {props.label}
    </button>
);

export const CloseButton = (props: {"aria-label"?: string; onClick?: () => void; className?: string}) => (
    <button type="button" aria-label={props["aria-label"]} onClick={props.onClick} className={props.className} />
);

export const FavouriteButton = (props: {"aria-label": string; selected?: boolean; onClick?: (e: unknown) => void}) => (
    <button type="button" aria-label={props["aria-label"]} aria-pressed={!!props.selected} onClick={props.onClick} />
);

// Mirrors the real DS contract the block relies on: the wrapper carries the
// label-variant modifier class, the 'title' variant renders the title line
// above the track, 'inline' renders the count beside it, and an explicit
// aria-label wins as the track's accessible name.
export const ProgressBar = (props: {
    value?: number; labelVariant?: string; title?: string; count?: string;
    "aria-label"?: string; className?: string;
}) => (
    <div className={`mds-progress-bar mds-progress-bar--label-${props.labelVariant} ${props.className ?? ""}`}>
        {props.labelVariant === "title" && <span className="mds-progress-bar-title">{props.title}</span>}
        <div role="progressbar" aria-label={props["aria-label"] ?? props.title} aria-valuenow={props.value} />
        {props.labelVariant === "inline" && <span className="mds-progress-bar-count">{props.count}</span>}
    </div>
);

// Mirrors the DS grouped-variant contract the block relies on: hides below two
// pages, disables prev/next at the bounds.
export const Pagination = (props: {
    totalPages: number; currentPage: number; onPageChange: (p: number) => void;
    ariaLabel?: string; previousPageLabel?: string; nextPageLabel?: string;
}) => (props.totalPages < 2 ? null : (
    <nav aria-label={props.ariaLabel}>
        <button
            type="button"
            className="mds-pagination__button mds-pagination__button--prev"
            disabled={props.currentPage <= 1}
            onClick={() => props.onPageChange(props.currentPage - 1)}
        >
            {props.previousPageLabel}
        </button>
        <button
            type="button"
            className="mds-pagination__button mds-pagination__button--next"
            disabled={props.currentPage >= props.totalPages}
            onClick={() => props.onPageChange(props.currentPage + 1)}
        >
            {props.nextPageLabel}
        </button>
    </nav>
));

// Mirrors the SearchInput contract the block relies on: a search field named by its
// (hidden) label, and a clear button, shown only while there is text, that reports an
// empty value through onChange like the real one's synthetic input event.
export const SearchInput = (props: {
    label: string; clearLabel: string; value: string; placeholder?: string; className?: string;
    onChange: (e: {target: {value: string}}) => void;
}) => (
    <div className={props.className}>
        <input
            type="search"
            aria-label={props.label}
            placeholder={props.placeholder}
            value={props.value}
            onChange={props.onChange}
        />
        {props.value !== "" && (
            <button type="button" aria-label={props.clearLabel} onClick={() => props.onChange({target: {value: ""}})} />
        )}
    </div>
);

export const Alert = (props: {type?: string; message: string; className?: string}) => (
    <div className={props.className} data-type={props.type}><span role="alert">{props.message}</span></div>
);

// The tooltip is presentational here: the trigger keeps its own accessible name.
export const Tooltip = (props: {label: string; className?: string; children: React.ReactElement}) => (
    <div className={props.className} data-tooltip={props.label}>{props.children}</div>
);

type TriggerProps = {
    label: string; "aria-label"?: string; iconOnly?: boolean; appearance?: string; className?: string;
    startIcon?: React.ReactElement; open?: boolean; onClick?: () => void; "aria-expanded"?: boolean;
};

export const DropdownTrigger = (props: TriggerProps) => (
    <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={props["aria-expanded"] ?? props.open}
        aria-label={props["aria-label"] ?? (props.iconOnly ? props.label : undefined)}
        data-appearance={props.appearance ?? "default"}
        className={props.className}
        onClick={props.onClick}
    >
        {props.startIcon}
        {!props.iconOnly && props.label}
    </button>
);

// Mirrors the parts of the Dropdown contract the block relies on: a custom trigger (or one built
// from label/startIcon/iconOnly) toggles a role="menu" through open/onOpenChange, and clicks on
// the root reach the caller's onClick.
export const Dropdown = (props: {
    label?: string; trigger?: React.ReactElement<TriggerProps>; iconOnly?: boolean; appearance?: string;
    startIcon?: React.ReactElement; open?: boolean; onOpenChange?: (open: boolean) => void;
    className?: string; onClick?: (e: React.MouseEvent) => void; children?: React.ReactNode;
}) => {
    const trigger = props.trigger ?? (
        <DropdownTrigger
            label={props.label ?? ""}
            iconOnly={props.iconOnly}
            appearance={props.appearance}
            startIcon={props.startIcon}
        />
    );
    return (
        <div className={`mds-dropdown ${props.className ?? ""}`} onClick={props.onClick}>
            {React.cloneElement(trigger, {
                "aria-expanded": !!props.open,
                onClick: () => props.onOpenChange?.(!props.open),
            })}
            {props.open && <div role="menu" className="mds-dropdown-menu">{props.children}</div>}
        </div>
    );
};

export const DropdownItemSelect = (props: {label: string; selected?: boolean; onClick?: () => void}) => (
    <button type="button" role="menuitemradio" aria-checked={!!props.selected} onClick={props.onClick}>
        {props.label}
    </button>
);

export const DropdownItemAction = (props: {label: string; startIcon?: React.ReactElement; onClick?: () => void}) => (
    <button type="button" role="menuitem" onClick={props.onClick}>{props.startIcon}{props.label}</button>
);

export const DropdownItemHeader = (props: {label: string}) => <div role="presentation">{props.label}</div>;

export const DropdownItemDivider = () => <div role="separator" />;
