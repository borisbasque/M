// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * The edit bar: a floating bar pinned to the bottom of the page while the dashboard is being edited.
 *
 * On the left it says what is being edited. People who may also edit the default dashboard for all
 * users get a subtle design system Dropdown there to switch between the two; everyone else sees
 * plain text. On the right are the actions, Add block being the only primary one. People leave Edit
 * mode with the page's own Edit mode switch.
 *
 * @module     core_my/components/DashboardEditBar
 * @copyright  2026 Boris Basque <borisbasque@icloud.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React from 'react';
import {Button, Dropdown, DropdownItemSelect} from '@moodlehq/design-system';
import config from '@moodle/lms/core/config';
import type {DashboardIcons} from '../repository';
import type {DashboardLabels} from '../strings';
import Icon, {renderIcon} from './Icon';

interface DashboardEditBarProps {
    siteDefault: boolean;
    canEditDefault: boolean;
    canUndo: boolean;
    labels: DashboardLabels;
    icons: DashboardIcons;
    onReset: () => void;
    onUndo: () => void;
    onAdd: (trigger: HTMLElement) => void;
}

const DashboardEditBar = ({
    siteDefault,
    canEditDefault,
    canUndo,
    labels,
    icons,
    onReset,
    onUndo,
    onAdd,
}: DashboardEditBarProps) => {
    // Edit mode is kept in the session, so either page opens still in Edit mode.
    const goTo = (path: string) => {
        window.location.href = `${config.wwwroot}${path}`;
    };
    return <div className="core-my-dashboard-toolbar" data-region="dashboard-edit-bar">
        <div className="core-my-dashboard-toolbar__scope">
            <Icon markup={icons.edit} className="core-my-dashboard-toolbar__icon" />
            {canEditDefault ? <>
                <span className="core-my-dashboard-toolbar__label">{labels.editing}</span>
                <Dropdown
                    label={siteDefault ? labels.scopedefaultshort : labels.scopeownshort}
                    appearance="subtle"
                >
                    <DropdownItemSelect
                        label={labels.scopeownshort}
                        selected={!siteDefault}
                        onClick={() => siteDefault && goTo('/my/')}
                    />
                    <DropdownItemSelect
                        label={labels.scopedefaultshort}
                        selected={siteDefault}
                        onClick={() => !siteDefault && goTo('/my/indexsys.php')}
                    />
                </Dropdown>
            </> : <p className="core-my-dashboard-scope">{siteDefault ? labels.scopesitedefault : labels.scopeown}</p>}
        </div>
        <div className="core-my-dashboard-toolbar__actions">
            {!siteDefault && <Button
                variant="ghost"
                size="lg"
                label={labels.resettodefault}
                startIcon={renderIcon(icons.reset)}
                onClick={onReset}
            />}
            <Button
                variant="outline-secondary"
                size="lg"
                label={labels.undo}
                startIcon={renderIcon(icons.undo)}
                disabled={!canUndo}
                onClick={onUndo}
            />
            <span className="core-my-dashboard-toolbar__divider" aria-hidden="true" />
            <Button
                variant="primary"
                size="lg"
                data-action="add-block"
                label={labels.addblockshort}
                startIcon={renderIcon(icons.add)}
                onClick={event => onAdd(event.currentTarget)}
            />
        </div>
    </div>;
};

export default DashboardEditBar;
