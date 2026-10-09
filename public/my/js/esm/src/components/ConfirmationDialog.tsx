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

const ConfirmationDialog = ({
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm,
    onCancel,
}: ConfirmationDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const id = useId();

    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);

    // Named and described by its own heading and message, so screen readers announce both on opening.
    return <dialog
        ref={dialogRef}
        className="core-my-dashboard-confirm"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        onCancel={onCancel}
    >
        <h2 id={`${id}-title`}>{title}</h2>
        <p id={`${id}-message`}>{message}</p>
        <div className="core-my-dashboard-confirm__actions">
            <Button variant="secondary" label={cancelLabel} onClick={onCancel} />
            <Button variant="danger" label={confirmLabel} onClick={onConfirm} />
        </div>
    </dialog>;
};

export default ConfirmationDialog;
