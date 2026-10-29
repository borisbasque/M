// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * Replaceable confirmation dialog built with Moodle Design System controls.
 *
 * @module     core_my/components/ConfirmationDialog
 * @copyright  2026 Matt Porritt <matt.porritt@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useEffect, useId, useRef} from 'react';
import {Button} from '@moodlehq/design-system';

interface ConfirmationDialogProps {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
}

// The design system has no modal or dialog component yet (raised on MDL-89740), so the shell is
// the native <dialog>, named by its heading and described by its message for assistive technology,
// with MDS buttons inside.
const ConfirmationDialog = ({
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
}: ConfirmationDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const headingId = useId();
    const messageId = useId();

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    return <dialog
        ref={dialogRef}
        className="core-my-dashboard-confirm"
        aria-labelledby={headingId}
        aria-describedby={messageId}
        onCancel={onCancel}
    >
        <h2 id={headingId}>{title}</h2>
        <p id={messageId}>{message}</p>
        <div className="core-my-dashboard-confirm__actions">
            <Button variant="secondary" label={cancelLabel} onClick={onCancel} />
            <Button variant="primary" label={confirmLabel} onClick={onConfirm} />
        </div>
    </dialog>;
};

export default ConfirmationDialog;
