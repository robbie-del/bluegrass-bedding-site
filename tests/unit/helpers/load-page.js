/**
 * Loads a real page from the repo into an isolated jsdom window with its inline
 * <script> blocks executed, so the inline page logic can be unit tested without
 * being extracted out of the HTML.
 *
 * External subresources (Bootstrap, Font Awesome, Google Fonts) are deliberately
 * NOT fetched — jsdom only loads them when `resources: "usable"` is set, and it
 * is not. Unit tests never touch the network.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');

export function readPage(name) {
  return readFileSync(resolve(ROOT, name), 'utf8');
}

/**
 * @param {string} name  Page filename, e.g. 'straw-vs-shavings.html'
 * @param {object} [options]
 * @param {string} [options.url]      Origin for the jsdom window (enables localStorage).
 * @param {object} [options.storage]  localStorage entries seeded *before* the page's
 *                                    scripts run — each jsdom window has its own
 *                                    storage, so it cannot be set from outside after
 *                                    the fact.
 * @returns {{ dom: JSDOM, window: Window, document: Document }}
 */
export function loadPage(name, { url = 'https://bluegrassbedding.com/', storage } = {}) {
  // Forward console output but drop jsdom's "Not implemented: navigation" notices,
  // which fire whenever a test clicks a link or submits a form.
  const virtualConsole = new VirtualConsole().forwardTo(console, { jsdomErrors: 'none' });

  const dom = new JSDOM(readPage(name), {
    url: url + name,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      if (storage) {
        for (const [key, value] of Object.entries(storage)) {
          window.localStorage.setItem(key, value);
        }
      }
    },
  });
  return { dom, window: dom.window, document: dom.window.document };
}

/** Set an input's value and fire the event the page listens for. */
export function setValue(el, value, eventName = 'input') {
  el.value = String(value);
  el.dispatchEvent(new el.ownerDocument.defaultView.Event(eventName, { bubbles: true }));
}

/** Strip "$" and thousands separators so a rendered figure can be compared numerically. */
export function money(text) {
  return Number(String(text).replace(/[$,]/g, ''));
}
