import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

export const FORMSPREE = 'https://formspree.io/f/mgoqkpoj';

export const PAGES = [
  'index.html',
  'products.html',
  'science.html',
  'events.html',
  'faq.html',
  'contact.html',
  'quote.html',
  'show.html',
  'boarding.html',
  'straw-vs-shavings.html',
];

export const eventsFixture = JSON.parse(
  readFileSync(resolve(ROOT, 'tests/fixtures/events-data.json'), 'utf8'),
);

/**
 * Intercept the Formspree endpoint and fulfil it locally.
 *
 * Every test that can submit a form MUST call this. A real submission emails
 * info@bluegrassbedding.com — see AGENTS.md.
 *
 * @returns {{ submissions: Array<Record<string, string>> }} captured payloads
 */
export async function stubFormspree(page, { ok = true } = {}) {
  const submissions = [];

  await page.route(`${FORMSPREE}**`, async (route) => {
    const request = route.request();
    submissions.push({
      method: request.method(),
      body: request.postData() || '',
    });
    await route.fulfill({
      status: ok ? 200 : 500,
      contentType: 'application/json',
      body: JSON.stringify(ok ? { ok: true } : { error: 'stubbed failure' }),
    });
  });

  return { submissions };
}

/**
 * Fail the test if anything reaches Formspree that was not stubbed. Belt and
 * braces against a future test forgetting stubFormspree().
 */
export async function forbidLiveFormspree(page) {
  await page.route('https://formspree.io/**', (route) => {
    throw new Error(`Test attempted a live Formspree request: ${route.request().url()}`);
  });
}

/** Serve the deterministic fixture in place of the live CMS content. */
export async function stubEventsData(page, data = eventsFixture) {
  await page.route('**/assets/events-data.json*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data),
    }),
  );
}

/**
 * Block third-party embeds (Facebook plugin, Instagram embed.js, YouTube
 * iframes). They are outside our control and make tests slow and flaky.
 */
export async function blockThirdPartyEmbeds(page) {
  await page.route(
    /https:\/\/(www\.)?(facebook\.com\/plugins|instagram\.com\/embed|youtube-nocookie\.com|youtube\.com)/,
    (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }),
  );
}

/** Dismiss the first-visit audience chooser on index.html. */
export async function skipSegmentGate(page) {
  await page.addInitScript(() => window.localStorage.setItem('bb_segment', 'racing'));
}

/** Collect console errors and page exceptions for a test to assert on. */
export function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // Blocked third-party embeds and CDN noise are expected in this environment.
    if (/facebook|instagram|youtube|fonts\.g|jsdelivr|cdnjs|favicon|ERR_/i.test(text)) return;
    errors.push(text);
  });
  return errors;
}
