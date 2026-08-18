/**
 * Structural invariants that must hold on every page.
 *
 * Each page is standalone and repeats its own nav, top bar, and footer, so these
 * guard the thing that actually breaks: one page drifting out of sync with the
 * other nine. See AGENTS.md.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { loadPage, readPage } from './helpers/load-page.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const PAGES = readdirSync(ROOT).filter((f) => f.endsWith('.html')).sort();

const PHONE = '502-650-1208';
const EMAIL = 'info@bluegrassbedding.com';

const NAV_LINKS = [
  ['index.html', 'Home'],
  ['products.html', 'Products'],
  ['science.html', 'Why It Matters'],
  ['events.html', 'Events'],
  ['faq.html', 'FAQ'],
  ['contact.html', 'Contact'],
];

it('finds all ten pages', () => {
  expect(PAGES).toEqual([
    'boarding.html',
    'contact.html',
    'events.html',
    'faq.html',
    'index.html',
    'products.html',
    'quote.html',
    'science.html',
    'show.html',
    'straw-vs-shavings.html',
  ]);
});

describe.each(PAGES)('%s', (page) => {
  const { document } = loadPage(page);

  it('declares its language and character set', () => {
    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.querySelector('meta[charset]')).not.toBeNull();
  });

  it('is responsive', () => {
    const viewport = document.querySelector('meta[name="viewport"]');
    expect(viewport).not.toBeNull();
    expect(viewport.getAttribute('content')).toContain('width=device-width');
  });

  it('has a non-empty title', () => {
    expect(document.title.trim().length).toBeGreaterThan(0);
  });

  it('has a meta description', () => {
    const desc = document.querySelector('meta[name="description"]');
    expect(desc).not.toBeNull();
    expect(desc.getAttribute('content').trim().length).toBeGreaterThan(0);
  });

  it('loads the shared stylesheet', () => {
    expect(document.querySelector('link[href="assets/site.css"]')).not.toBeNull();
  });

  it('carries the full primary navigation', () => {
    for (const [href, label] of NAV_LINKS) {
      const link = document.querySelector(`.main-nav a.nav-link[href="${href}"]`);
      expect(link, `${page} is missing the ${label} nav link`).not.toBeNull();
      expect(link.textContent.trim()).toBe(label);
    }
  });

  it('offers the quote call-to-action in the nav', () => {
    expect(document.querySelector('.main-nav a[href="quote.html"]')).not.toBeNull();
  });

  it('shows the phone number and email in the top bar', () => {
    expect(document.querySelector(`a[href="tel:5026501208"]`)).not.toBeNull();
    expect(document.querySelector(`a[href="mailto:${EMAIL}"]`)).not.toBeNull();
    expect(document.querySelector('.top-bar').textContent).toContain(PHONE);
  });

  it('has a footer', () => {
    expect(document.querySelector('footer.footer')).not.toBeNull();
  });

  it('gives every image alt text', () => {
    for (const img of document.querySelectorAll('img')) {
      expect(
        img.getAttribute('alt'),
        `<img src="${img.getAttribute('src')}"> on ${page} has no alt attribute`,
      ).not.toBeNull();
    }
  });

  it('gives every link either text or an accessible label', () => {
    for (const a of document.querySelectorAll('a')) {
      const labelled =
        a.textContent.trim().length > 0 ||
        a.getAttribute('aria-label') ||
        a.querySelector('img[alt]:not([alt=""])') ||
        a.querySelector('i.fas, i.fab, i.far'); // icon-only link
      expect(labelled, `An empty link on ${page}: ${a.outerHTML.slice(0, 90)}`).toBeTruthy();
    }
  });

  it('opens every external link safely', () => {
    for (const a of document.querySelectorAll('a[target="_blank"]')) {
      expect(
        a.getAttribute('rel') || '',
        `${a.getAttribute('href')} on ${page} opens a new tab without rel="noopener"`,
      ).toContain('noopener');
    }
  });

  it('points every internal link at a page that exists', () => {
    for (const a of document.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) continue;
      const target = href.split('#')[0].split('?')[0];
      if (!target) continue;
      expect(
        existsSync(resolve(ROOT, target)),
        `${page} links to ${target}, which does not exist`,
      ).toBe(true);
    }
  });

  it('references only asset files that exist', () => {
    for (const el of document.querySelectorAll('img[src], link[href], script[src]')) {
      const src = el.getAttribute('src') || el.getAttribute('href');
      if (!src || /^(https?:|data:|#|\/\/)/i.test(src)) continue;
      expect(existsSync(resolve(ROOT, src)), `${page} references missing asset ${src}`).toBe(true);
    }
  });

  it('has exactly one h1', () => {
    expect(document.querySelectorAll('h1')).toHaveLength(1);
  });

  it('does not leak a TODO or placeholder into production copy', () => {
    const body = document.body.textContent;
    expect(body).not.toMatch(/lorem ipsum/i);
    expect(body).not.toMatch(/\bTODO\b/);
    expect(body).not.toMatch(/\bFIXME\b/);
  });
});

describe('contact details are consistent site-wide', () => {
  it.each(PAGES)('%s uses no other phone number', (page) => {
    const numbers = readPage(page).match(/\b\d{3}-\d{3}-\d{4}\b/g) || [];
    for (const n of numbers) expect(n).toBe(PHONE);
  });

  it.each(PAGES)('%s uses no other bluegrassbedding.com address', (page) => {
    const emails = readPage(page).match(/[\w.+-]+@bluegrassbedding\.com/g) || [];
    for (const e of emails) expect(e).toBe(EMAIL);
  });
});

describe('forms', () => {
  it.each([
    ['index.html', 'orderForm'],
    ['contact.html', 'contactForm'],
    ['quote.html', 'quoteForm'],
  ])('%s posts to the shared Formspree endpoint', (page, formId) => {
    const { document } = loadPage(page);
    const form = document.getElementById(formId);
    expect(form.getAttribute('action')).toBe('https://formspree.io/f/mgoqkpoj');
    expect((form.getAttribute('method') || 'post').toLowerCase()).toBe('post');
  });

  it.each([
    ['index.html', 'orderForm'],
    ['contact.html', 'contactForm'],
    ['quote.html', 'quoteForm'],
  ])('%s associates a real label with every field', (page, formId) => {
    // A placeholder is not a label: it disappears on focus and is not reliably
    // announced by screen readers. Every field needs for/id, a wrapping <label>,
    // or an explicit aria-label.
    const { document } = loadPage(page);
    for (const field of document.querySelectorAll(`#${formId} input, #${formId} select, #${formId} textarea`)) {
      if (field.type === 'hidden' || field.type === 'submit') continue;
      const labelled =
        field.getAttribute('aria-label') ||
        (field.id && document.querySelector(`label[for="${field.id}"]`)) ||
        field.closest('label');
      expect(
        labelled,
        `${field.name || field.id} on ${page} has no associated <label>`,
      ).toBeTruthy();
    }
  });
});

describe('events page', () => {
  const { document } = loadPage('events.html');

  it('loads the renderer', () => {
    expect(document.querySelector('script[src="assets/events.js"]')).not.toBeNull();
  });

  it('provides every container the renderer writes into', () => {
    for (const id of [
      'bb-events-upcoming',
      'bb-events-past',
      'bb-past-section',
      'bb-gallery-grid',
      'bb-gallery-filters',
      'bb-social-cta',
      'bb-lightbox',
    ]) {
      expect(document.getElementById(id), `#${id} is missing from events.html`).not.toBeNull();
    }
  });

  it('gives the lightbox the parts the script queries', () => {
    const box = document.getElementById('bb-lightbox');
    for (const sel of ['.lb-img', '.lb-caption', '.lb-credit', '.lb-close', '.lb-count', '.lb-nav', '.lb-stage']) {
      expect(box.querySelector(sel), `${sel} is missing from the lightbox`).not.toBeNull();
    }
  });

  it('marks the lightbox as a modal dialog', () => {
    const box = document.getElementById('bb-lightbox');
    expect(box.getAttribute('role')).toBe('dialog');
    expect(box.getAttribute('aria-modal')).toBe('true');
    expect(box.hasAttribute('hidden')).toBe(true);
  });
});

describe('events-data.json', () => {
  const data = JSON.parse(readPage('assets/events-data.json'));

  it('has the shape events.js expects', () => {
    expect(Array.isArray(data.events)).toBe(true);
    expect(Array.isArray(data.gallery)).toBe(true);
    expect(typeof data.social).toBe('object');
  });

  it('gives every event a name and an ISO date', () => {
    for (const evt of data.events) {
      expect(evt.name, 'an event has no name').toBeTruthy();
      expect(evt.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (evt.endDate) expect(evt.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('gives every gallery entry a type the renderer understands', () => {
    for (const item of data.gallery) {
      expect(['photo', 'instagram', 'facebook', 'youtube']).toContain(item.type);
      if (item.type === 'photo') {
        expect(item.src).toBeTruthy();
        expect(existsSync(resolve(ROOT, item.src)), `missing gallery image ${item.src}`).toBe(true);
      } else {
        expect(item.url).toMatch(/^https?:\/\//);
      }
      if (item.date) expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('keeps every field declared in the Pages CMS schema', () => {
    // A field present in the data but missing from .pages.yml gets dropped on the
    // next CMS save, which is how the Redmond entry was lost (commit 15af534).
    const schema = readPage('.pages.yml');
    const used = new Set();
    for (const evt of data.events) Object.keys(evt).forEach((k) => used.add(k));
    for (const item of data.gallery) Object.keys(item).forEach((k) => used.add(k));
    for (const key of used) {
      expect(schema, `.pages.yml does not declare "${key}"`).toContain(`name: ${key}`);
    }
  });
});
