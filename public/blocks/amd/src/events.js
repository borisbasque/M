// This file is part of Moodle - http://moodle.org/ //
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
 * Javascript events for the `core_block` subsystem.
 *
 * @module     core_block/events
 * @copyright  2021 Andrew Nicols <andrew@nicols.co.uk>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @since      4.0
 *
 * @example <caption>Example of listening to a block event.</caption>
 * import {eventTypes as blockEventTypes} from 'core_block/events';
 *
 * document.addEventListener(blockEventTypes.blockContentUpdated, e => {
 *     window.console.log(e.target); // The HTMLElement relating to the block whose content was updated.
 *     window.console.log(e.detail.instanceId); // The instanceId of the block that was updated.
 * });
 *
 * @example <caption>Example of a block reporting that its asynchronously loaded content is in place.</caption>
 * import {trackBlockContentLoading} from 'core_block/events';
 *
 * export const init = root => trackBlockContentLoading(root, fetchAndRenderContent(root));
 */

import {dispatchEvent} from 'core/event_dispatcher';
import Pending from 'core/pending';

/**
 * Events for `core_block`.
 *
 * @constant
 * @property {String} blockContentUpdated See {@link event:blockContentUpdated}
 */
export const eventTypes = {
    /**
     * An event triggered when the content of a block has changed.
     *
     * @event blockContentUpdated
     * @type {CustomEvent}
     * @property {HTMLElement} target The block element that was updated
     * @property {object} detail
     * @property {number} detail.instanceId The block instance id
     */
    blockContentUpdated: 'core_block/contentUpdated',

    /**
     * An event triggered once a block's asynchronously loaded content is in place, or has failed to
     * load. Fired by blocks that declare {@see block_base::has_async_content()}.
     *
     * @event blockContentLoaded
     * @type {CustomEvent}
     * @property {HTMLElement} target The element the block loaded its content into
     * @property {object} detail
     * @property {number|null} detail.instanceId The block instance id, where the page provides it
     * @property {string|null} detail.blockName The block name, e.g. myoverview, where the page provides it
     * @property {boolean} detail.failed Whether loading failed
     * @since 6.0
     */
    blockContentLoaded: 'core_block/contentLoaded',
};

/**
 * Trigger an event to indicate that the content of a block was updated.
 *
 * @method notifyBlockContentUpdated
 * @param {HTMLElement} element The HTMLElement containing the updated block.
 * @returns {CustomEvent}
 * @fires blockContentUpdated
 */
export const notifyBlockContentUpdated = element => dispatchEvent(
    eventTypes.blockContentUpdated,
    {
        instanceId: element.dataset.instanceId,
    },
    element
);

/**
 * Trigger an event to indicate that a block's asynchronously loaded content is in place.
 *
 * The instance id and block name come from the closest element carrying them: the standard block
 * markup and the flexible dashboard's tiles both provide `data-instance-id` and `data-block`.
 *
 * @method notifyBlockContentLoaded
 * @param {HTMLElement} element The element the block loaded its content into.
 * @param {boolean} [failed=false] Whether loading failed.
 * @returns {CustomEvent}
 * @fires blockContentLoaded
 * @since 6.0
 */
export const notifyBlockContentLoaded = (element, failed = false) => {
    const instance = element.closest('[data-instance-id]');
    const block = element.closest('[data-block]');
    return dispatchEvent(
        eventTypes.blockContentLoaded,
        {
            instanceId: instance ? Number(instance.dataset.instanceId) : null,
            blockName: block ? block.dataset.block : null,
            failed,
        },
        element
    );
};

/**
 * Report a block's asynchronous content loading, from start to finish.
 *
 * While the promise is outstanding the block is marked busy for assistive technology and a
 * `core/pending` key is held, so anything waiting for the page's JavaScript to settle (Behat
 * included) waits for the content too. When it settles - whether it succeeded or failed - the
 * busy state is cleared and {@link event:blockContentLoaded} is fired, so a page is never left
 * waiting on a block that will not finish.
 *
 * @method trackBlockContentLoading
 * @param {HTMLElement|jQuery} root The element the block loads its content into.
 * @param {Promise} loading Resolves once the content is in the document.
 * @returns {Promise} The same outcome as `loading`, so callers can keep chaining.
 * @since 6.0
 */
export const trackBlockContentLoading = (root, loading) => {
    // Blocks commonly hold their root as a jQuery object.
    const element = root && root.jquery ? root.get(0) : root;
    if (!element) {
        return Promise.resolve(loading);
    }
    const pending = new Pending('core_block/contentLoading');
    element.setAttribute('aria-busy', 'true');
    const finish = failed => {
        element.removeAttribute('aria-busy');
        notifyBlockContentLoaded(element, failed);
        pending.resolve();
    };
    return Promise.resolve(loading).then(
        result => {
            finish(false);
            return result;
        },
        error => {
            finish(true);
            throw error;
        }
    );
};
