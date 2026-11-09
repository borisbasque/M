// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * What the dashboard shows outside edit mode when it has no blocks.
 *
 * People who can edit it get a way to start (turning on edit mode, where blocks are added) and,
 * on their own dashboard, to put back the site's default blocks. Everyone else gets a short note.
 * Figma: Dashboard empty state (V2).
 *
 * @module     core_my/components/DashboardEmpty
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Button} from '@moodlehq/design-system';
import type {DashboardIcons} from '../repository';
import type {DashboardLabels} from '../strings';
import {renderIcon} from './Icon';

interface DashboardEmptyProps {
    labels: DashboardLabels;
    icons: DashboardIcons;
    /** Whether this person can edit the dashboard. */
    canEdit: boolean;
    /** Turn on edit mode, when they can edit. */
    onCustomise?: () => void;
    /** Put back the site's default blocks, when it is their own dashboard. */
    onReset?: () => void;
}

const DashboardEmpty = ({labels, icons, canEdit, onCustomise, onReset}: DashboardEmptyProps) => (
    <section className="core-my-dashboard-empty" aria-labelledby="core-my-dashboard-empty-title">
        <span className="core-my-dashboard-empty__icon" aria-hidden="true">
            <i className="fa-solid fa-table-cells-large" />
        </span>
        <div className="core-my-dashboard-empty__text">
            <h2 id="core-my-dashboard-empty-title" className="core-my-dashboard-empty__title">{labels.emptytitle}</h2>
            <p className="core-my-dashboard-empty__description">
                {canEdit ? labels.emptydescription : labels.emptyreadonly}
            </p>
        </div>
        {canEdit && <div className="core-my-dashboard-empty__actions">
            {onCustomise && <Button
                variant="primary"
                size="lg"
                label={labels.customise}
                startIcon={renderIcon(icons.edit)}
                onClick={onCustomise}
            />}
            {onReset && <Button
                variant="outline-secondary"
                size="lg"
                label={labels.resettodefault}
                startIcon={renderIcon(icons.reset)}
                onClick={onReset}
            />}
        </div>}
    </section>
);

export default DashboardEmpty;
