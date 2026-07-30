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
 * Empty and no-results states (MDL-88974, MDL-88975, MDL-88979).
 *
 * When zero-state data is supplied, renders the rich variant: an illustration,
 * a title, a small intro paragraph, and any contextual action links (Create /
 * Manage course). The server sends data only (variant, flags and URLs); the
 * copy is composed here from language strings. The intro
 * strings embed documentation links, so the resolved lang-string HTML (never
 * user input) is injected via dangerouslySetInnerHTML, exactly as the old
 * Mustache template rendered the same strings. When no zero-state is supplied
 * it falls back to a simple single-message variant.
 *
 * @module     block_myoverview/components/EmptyState
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {useEffect, useState} from "react";
import type {ZeroStateData} from "../types";
import {resolveZeroStateCopy} from "../strings";
import {useStrings} from "../state";

type EmptyVariant = "no-results" | "all-hidden";


type EmptyStateProps = {
    zerostate?: ZeroStateData | null;
    variant?: EmptyVariant;
    /** URL of the shared empty-state illustration (block_myoverview/pix/courses.svg). */
    illustrationurl: string;
};

/**
 * Render the empty / no-results state.
 *
 * All states share the same decorative illustration; it carries no meaning (the
 * title and text do), so it is exposed to assistive tech as empty (alt="").
 *
 * @param props The rich zero-state data, or a simple variant fallback.
 * @returns The empty-state element.
 */
export default function EmptyState({zerostate, variant, illustrationurl}: EmptyStateProps) {
    const strings = useStrings();

    // The zero-state copy resolves asynchronously (string fetch); the card renders its
    // stable parts immediately and the text fills in when ready (cached after first view).
    // The chain is several sequential getString calls, so it can outlive the component
    // (any query change unmounts it): the cancelled flag guards the setState.
    const [copyState, setCopyState] = useState<{title: string; intro: string} | null>(null);
    useEffect(() => {
        if (!zerostate) {
            return undefined;
        }
        let cancelled = false;
        resolveZeroStateCopy(zerostate)
            .then((copy) => {
                if (!cancelled) {
                    setCopyState(copy);
                }
                return null;
            })
            .catch((error) => {
                if (!cancelled) {
                    setCopyState(null);
                }
                window.console.error("[block_myoverview] Failed to resolve zero-state copy", error);
            });
        return () => {
            cancelled = true;
        };
    }, [zerostate]);

    const illustration = (
        <div className="courseoverview-empty__illustration" aria-hidden="true">
            <img src={illustrationurl} alt="" />
        </div>
    );

    if (zerostate) {
        const managelabel = zerostate.sitehascourses ? strings.managecourses : strings.managecategories;
        return (
            <div className="courseoverview-empty" data-variant="zerostate">
                {illustration}
                {copyState && (
                    <>
                        {/* H2 keeps a valid heading order after the page's h1 (axe heading-order);
                            the Figma "H6" look is applied through the courseoverview-empty__title
                            styles, not the tag. */}
                        <h2 className="courseoverview-empty__title">{copyState.title}</h2>
                        <p
                            className="courseoverview-empty__text"
                            dangerouslySetInnerHTML={{__html: copyState.intro}}
                        />
                    </>
                )}
                {zerostate.variant === "create" && (
                    <div className="courseoverview-empty__actions">
                        {zerostate.manageurl && (
                            <a className="btn btn-outline-primary" href={zerostate.manageurl}>
                                {managelabel}
                            </a>
                        )}
                        {zerostate.createurl && (
                            <a className="btn btn-primary" href={zerostate.createurl}>
                                {strings.createcourse}
                            </a>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // No-results is a rich state (title + text) shown when a search or filter matches
    // nothing, distinct from the genuine "not enrolled" zero-state (MDL-88974).
    if (variant === "no-results") {
        return (
            <div className="courseoverview-empty" data-variant="no-results">
                {illustration}
                <h2 className="courseoverview-empty__title">{strings.emptynoresultstitle}</h2>
                <p className="courseoverview-empty__text">{strings.emptynoresults}</p>
            </div>
        );
    }

    // All-hidden: the user HAS courses but has removed every one from view. Not a
    // zero-state (they are enrolled) and not a no-results state (no active query) —
    // the copy points them at the filter that restores their courses.
    return (
        <div className="courseoverview-empty" data-variant="all-hidden">
            {illustration}
            <h2 className="courseoverview-empty__title">{strings.emptyallhiddentitle}</h2>
            <p className="courseoverview-empty__text">{strings.emptyallhiddenintro}</p>
        </div>
    );
}
