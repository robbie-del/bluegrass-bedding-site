/**
 * Test harness for assets/events.js.
 *
 * events.js is a browser IIFE, not a module, so it can't be imported. This
 * evaluates the real file inside the jsdom window with the test-export flag set,
 * which makes its internals reachable via window.__bbEvents. fetch() is always
 * stubbed so no unit test ever touches the network.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../..');

const EVENTS_JS = readFileSync(resolve(ROOT, 'assets/events.js'), 'utf8');

export const fixture = JSON.parse(
  readFileSync(resolve(ROOT, 'tests/fixtures/events-data.json'), 'utf8'),
);

/** The container markup events.js renders into, mirroring events.html. */
export const EVENTS_PAGE_MARKUP = `
  <div class="row" id="bb-events-upcoming"></div>
  <section id="bb-past-section" hidden>
    <div class="row" id="bb-events-past"></div>
  </section>
  <div class="gal-filters" id="bb-gallery-filters" hidden></div>
  <div class="gal-grid" id="bb-gallery-grid"></div>
  <div class="d-flex" id="bb-social-cta"></div>
  <div class="lb-backdrop" id="bb-lightbox" role="dialog" aria-modal="true" hidden>
    <div class="lb-bar">
      <span class="lb-count"></span>
      <button type="button" class="lb-close">close</button>
    </div>
    <div class="lb-stage">
      <button type="button" class="lb-nav" data-dir="prev">prev</button>
      <img class="lb-img" alt="">
      <button type="button" class="lb-nav" data-dir="next">next</button>
    </div>
    <div class="lb-info">
      <p class="lb-caption" hidden></p>
      <p class="lb-credit" hidden></p>
    </div>
  </div>
`;

/**
 * Evaluate events.js against the current jsdom document.
 *
 * By default the fetch stub never settles, so events.js does not self-bootstrap and
 * tests can drive the renderers explicitly without an async render racing them.
 * Pass `bootstrap: true` to exercise the real load path.
 *
 * @param {object}  [options]
 * @param {object}  [options.data]       Data the stubbed fetch resolves with.
 * @param {boolean} [options.bootstrap]  Let the fetch settle and the page render itself.
 * @param {boolean} [options.fetchFails] Make the stubbed fetch reject instead.
 * @param {boolean} [options.markup]     Insert the events-page containers first.
 * @returns {object} window.__bbEvents
 */
export function loadEvents({
  data = fixture,
  bootstrap = false,
  fetchFails = false,
  markup = true,
} = {}) {
  if (markup) document.body.innerHTML = EVENTS_PAGE_MARKUP;

  window.__BB_EXPOSE_INTERNALS__ = true;
  if (fetchFails) {
    window.fetch = () => Promise.reject(new Error('network disabled in unit tests'));
  } else if (bootstrap) {
    window.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
  } else {
    window.fetch = () => new Promise(() => {});
  }

  // Deliberately evaluating a browser IIFE against the jsdom window.
  new Function(EVENTS_JS)();

  return window.__bbEvents;
}

/** Let the promise chain inside events.js settle. */
export const flush = () => new Promise((r) => setTimeout(r, 0));
