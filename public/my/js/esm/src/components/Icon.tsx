// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

/**
 * A control icon rendered by the server through the theme's icon system.
 *
 * The markup comes from $OUTPUT->pix_icon() via the get_dashboard payload (see DashboardIcons in
 * repository.ts), so the theme's icon map decides which glyph is drawn; nothing here names a
 * FontAwesome class. The icon is always decorative: every control it appears in carries its own
 * accessible name.
 *
 * The element is always an <i>, because that is what the design system Button accepts as a
 * startIcon: it checks the React element's own type (an <i> or <svg>; anything else, including a
 * component that would render one, is dropped). That is why renderIcon() returns the element
 * itself rather than a component. The usual FontAwesome markup is a single <i> carrying the
 * glyph's classes, which becomes that element directly; any other icon system's markup (an
 * <img>, say) is rendered inside the <i>.
 *
 * @module     core_my/components/Icon
 * @copyright  2026 A K M Safat Shahin <safat.shahin@moodle.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import React from 'react';

interface IconProps {
    markup: string;
    className?: string;
}

const SINGLE_I_ELEMENT = /^\s*<i\b([^>]*)>\s*<\/i>\s*$/i;
const CLASS_ATTRIBUTE = /\bclass\s*=\s*"([^"]*)"/i;

/**
 * Build the <i> element for a server-rendered icon.
 *
 * @param markup The icon markup, as $OUTPUT->pix_icon() renders it.
 * @param className Extra class names for the element.
 * @return The icon element (always an <i>).
 */
export const renderIcon = (markup: string, className = ''): React.ReactElement<React.HTMLAttributes<HTMLElement>, 'i'> => {
    const single = SINGLE_I_ELEMENT.exec(markup);
    if (single) {
        const glyphClasses = CLASS_ATTRIBUTE.exec(single[1])?.[1] ?? '';
        return <i className={`core-my-dashboard-icon ${glyphClasses} ${className}`.trim()} aria-hidden="true" />;
    }
    return <i
        className={`core-my-dashboard-icon ${className}`.trim()}
        aria-hidden="true"
        dangerouslySetInnerHTML={{__html: markup}}
    />;
};

/** Component form of renderIcon(), for use outside the design system Button. */
const Icon = ({markup, className = ''}: IconProps) => renderIcon(markup, className);

export default Icon;
