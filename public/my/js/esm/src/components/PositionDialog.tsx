// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * The Move and Resize dialogs: step a block one space at a time, with a live preview on the grid.
 *
 * @module     core_my/components/PositionDialog
 * @copyright  2026 Kieran Gray
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React, {useEffect, useId, useRef} from 'react';
import {Button} from '@moodlehq/design-system';

/** One step button: a direction, and why it can't be taken (if it can't). */
export interface PositionStep {
    key: string;
    label: string;
    icon: string;
    reason?: string;
}

interface PositionDialogProps {
    mode: 'move' | 'resize';
    heading: string;
    help: string;
    status: string;
    displaces: string;
    steps: PositionStep[];
    saveLabel: string;
    cancelLabel: string;
    onStep: (key: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

/**
 * A modal dialog of step buttons, so a block can be moved or resized without dragging, arrow keys
 * or precise pointing: voice control, switch access and screen reader users can all press buttons.
 *
 * A step that cannot be taken stays focusable but is marked aria-disabled, with its reason shown
 * and linked as its description, so focus is never lost when the step just taken was the last one
 * and everyone can find out why. The backdrop is clear so the grid behind shows the preview.
 */
const PositionDialog = ({
    mode,
    heading,
    help,
    status,
    displaces,
    steps,
    saveLabel,
    cancelLabel,
    onStep,
    onSave,
    onCancel,
}: PositionDialogProps) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const id = useId();

    useEffect(() => {
        const dialog = dialogRef.current;
        // A test DOM may not implement showModal(); the dialog is then just shown open.
        if (dialog && typeof dialog.showModal === 'function' && !dialog.open) {
            dialog.showModal();
        }
    }, []);

    return <dialog
        ref={dialogRef}
        className={`core-my-dashboard-position core-my-dashboard-position--${mode}`}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-help`}
        aria-modal="true"
        onCancel={event => {
            // Escape: put the block back, and let the parent close the dialog.
            event.preventDefault();
            onCancel();
        }}
    >
        <h2 id={`${id}-title`}>{heading}</h2>
        <p id={`${id}-help`}>{help}</p>
        <div className="core-my-dashboard-position__steps" role="group" aria-label={heading}>
            {steps.map(step => <div
                key={step.key}
                className={`core-my-dashboard-position__step core-my-dashboard-position__step--${step.key}`}
            >
                <button
                    type="button"
                    className="btn btn-secondary"
                    aria-disabled={step.reason ? true : undefined}
                    aria-describedby={step.reason ? `${id}-${step.key}-reason` : undefined}
                    data-step={step.key}
                    onClick={() => {
                        if (!step.reason) {
                            onStep(step.key);
                        }
                    }}
                >
                    <i className={`fa ${step.icon}`} aria-hidden="true" /> {step.label}
                </button>
                {step.reason && <span
                    id={`${id}-${step.key}-reason`}
                    className="core-my-dashboard-position__reason"
                >{step.reason}</span>}
            </div>)}
        </div>
        <div className="core-my-dashboard-position__status" role="status" aria-atomic="true">
            <p>{status}</p>
            {displaces && <p>{displaces}</p>}
        </div>
        <div className="core-my-dashboard-confirm__actions">
            <Button variant="secondary" label={cancelLabel} onClick={onCancel} />
            <Button variant="primary" label={saveLabel} onClick={onSave} />
        </div>
    </dialog>;
};

export default PositionDialog;
