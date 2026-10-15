// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * A small stand-in for the design system Dropdown, for tests that mock @moodlehq/design-system.
 *
 * It keeps the parts the dashboard relies on: a menu button whose label is its accessible name,
 * controlled open state, menu and menuitem roles, submenus, aria-disabled items that ignore
 * clicks, the secondary description line, and Escape returning focus to the trigger. Keyboard
 * navigation between items is the design system's own and is not reproduced here.
 *
 * @copyright  2026 Kieran Gray
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useRef, useState} from 'react';

interface DropdownProps {
    label: string;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    className?: string;
    startIcon?: React.ReactElement;
    children?: React.ReactNode;
}

export const Dropdown = ({label, open, onOpenChange, className, startIcon, children}: DropdownProps) => {
    const [own, setOwn] = useState(false);
    const isOpen = open ?? own;
    const trigger = useRef<HTMLButtonElement>(null);
    const setOpen = (next: boolean) => {
        setOwn(next);
        onOpenChange?.(next);
    };
    return <div className={`mds-dropdown ${className ?? ''}`}>
        <button
            ref={trigger}
            type="button"
            className="mds-btn btn"
            aria-label={label}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            onClick={() => setOpen(!isOpen)}
        >{startIcon}</button>
        {isOpen && <div
            role="menu"
            className="mds-dropdown-menu"
            onKeyDown={event => {
                if (event.key === 'Escape') {
                    setOpen(false);
                    trigger.current?.focus();
                }
            }}
        >{children}</div>}
    </div>;
};

interface ActionProps extends React.HTMLAttributes<HTMLElement> {
    label: string;
    description?: string;
    disabled?: boolean;
    href?: string;
    variant?: string;
}

export const DropdownItemAction = ({label, description, disabled, href, variant: _variant, onClick, ...props}: ActionProps) => {
    const content = <>{label}{description && <span className="mds-dropdown-item__description">{description}</span>}</>;
    const click = (event: React.MouseEvent<HTMLElement>) => {
        if (disabled) {
            event.preventDefault();
            return;
        }
        onClick?.(event);
    };
    return href
        ? <a role="menuitem" href={disabled ? undefined : href} aria-disabled={disabled || undefined}
            {...props} onClick={click}>{content}</a>
        : <button type="button" role="menuitem" aria-disabled={disabled || undefined}
            {...props} onClick={click}>{content}</button>;
};

export const DropdownItemExpandable = ({label, children, ...props}: {label: string; children?: React.ReactNode}) => {
    const [open, setOpen] = useState(false);
    return <>
        <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={open}
            {...props} onClick={() => setOpen(!open)}>{label}</button>
        {open && <div role="menu" aria-label={label}>{children}</div>}
    </>;
};

export const DropdownItemDivider = () => <hr role="separator" />;
