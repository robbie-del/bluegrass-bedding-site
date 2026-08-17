/**
 * Inline <script> logic on the content pages: the segment gate, the three
 * Formspree forms, and the FAQ accordion.
 *
 * The form tests stub window.fetch — nothing here ever reaches Formspree.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPage } from './helpers/load-page.js';

const FORMSPREE = 'https://formspree.io/f/mgoqkpoj';

/** Replace the page's fetch with a stub and return the calls it recorded. */
function stubFetch(window, { ok = true } = {}) {
  const calls = [];
  window.fetch = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve({ ok });
  };
  return calls;
}

/** Submit a form and let the async handler settle. */
async function submit(window, form) {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 0));
}

describe('segment gate (index.html)', () => {
  it('opens on a first visit and locks page scroll', () => {
    const { document } = loadPage('index.html');
    expect(document.getElementById('segmentGate').classList.contains('active')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('stays closed for a returning visitor', () => {
    const { document } = loadPage('index.html', { storage: { bb_segment: 'racing' } });
    expect(document.getElementById('segmentGate').classList.contains('active')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('remembers the chosen segment and dismisses the gate', () => {
    const { window, document } = loadPage('index.html');
    window.localStorage.clear();

    window.chooseSegment('racing');

    expect(window.localStorage.getItem('bb_segment')).toBe('racing');
    expect(document.getElementById('segmentGate').style.opacity).toBe('0');
  });

  it('fully removes the gate and restores scrolling after the fade', async () => {
    // Real timers: the 300ms fade runs inside the jsdom realm, and faking timers
    // here would also fake the ones the test itself waits on.
    const { window, document } = loadPage('index.html');
    window.chooseSegment('racing');
    await new Promise((r) => setTimeout(r, 400));

    expect(document.getElementById('segmentGate').classList.contains('active')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('records the segment when the skip link is used', () => {
    const { window } = loadPage('index.html');
    window.localStorage.clear();
    window.chooseSegment('all');
    expect(window.localStorage.getItem('bb_segment')).toBe('all');
  });

  it('sets the segment from the show and boarding cards', () => {
    const { window, document } = loadPage('index.html');
    window.localStorage.clear();

    document.querySelector('a[href="show.html"].segment-card').click();
    expect(window.localStorage.getItem('bb_segment')).toBe('show');

    document.querySelector('a[href="boarding.html"].segment-card').click();
    expect(window.localStorage.getItem('bb_segment')).toBe('boarding');
  });
});

describe('order modal (index.html)', () => {
  it('preselects the product the visitor clicked', () => {
    const { window, document } = loadPage('index.html');
    // Stand in for the Bootstrap bundle, which is CDN-loaded and absent here.
    window.bootstrap = { Modal: class { show() {} } };

    const select = document.getElementById('productSelect');
    const option = select.options[select.options.length - 1].value;
    window.openOrderModal(option);

    expect(select.value).toBe(option);
  });

  it('reveals the bag-count field only for the individual-bags tier', () => {
    const { window, document } = loadPage('index.html');
    const tier = document.getElementById('tierSelect');
    const row = document.getElementById('bagCountRow');

    tier.value = 'Individual bags (less than 1 pallet)';
    tier.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(row.style.display).toBe('block');

    tier.value = tier.options[0].value;
    tier.dispatchEvent(new window.Event('change', { bubbles: true }));
    expect(row.style.display).toBe('none');
  });
});

describe.each([
  ['index.html', 'orderForm', 'orderSuccess'],
  ['contact.html', 'contactForm', 'contactSuccess'],
  ['quote.html', 'quoteForm', 'quoteSuccess'],
])('%s form', (page, formId, successId) => {
  let window;
  let document;
  let form;

  beforeEach(() => {
    ({ window, document } = loadPage(page));
    form = document.getElementById(formId);
  });

  it('posts to the Formspree endpoint', async () => {
    expect(form.getAttribute('action')).toBe(FORMSPREE);
    const calls = stubFetch(window);
    await submit(window, form);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(FORMSPREE);
  });

  it('sends a POST with FormData and asks for a JSON response', async () => {
    const calls = stubFetch(window);
    await submit(window, form);
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.body).toBeInstanceOf(window.FormData);
    expect(calls[0].init.headers.Accept).toBe('application/json');
  });

  it('prevents the browser from navigating away', async () => {
    stubFetch(window);
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('swaps the form for the success message on a successful submit', async () => {
    stubFetch(window, { ok: true });
    await submit(window, form);
    expect(form.style.display).toBe('none');
    expect(document.getElementById(successId).style.display).toBe('block');
  });

  it('keeps the form visible and alerts with the phone number on failure', async () => {
    stubFetch(window, { ok: false });
    const alerts = [];
    window.alert = (msg) => alerts.push(msg);

    await submit(window, form);

    expect(form.style.display).not.toBe('none');
    expect(document.getElementById(successId).style.display).not.toBe('block');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toContain('502-650-1208');
  });

  it('marks the required fields the business needs to act on the enquiry', () => {
    expect(form.querySelectorAll('[required]').length).toBeGreaterThan(0);
    expect(form.querySelector('input[type="email"], input[name*="mail" i]')).not.toBeNull();
  });
});

describe('FAQ accordion (faq.html)', () => {
  let document;
  let items;

  beforeEach(() => {
    ({ document } = loadPage('faq.html'));
    items = [...document.querySelectorAll('.faq-item')];
  });

  it('has questions, all closed to begin with', () => {
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.classList.contains('active'))).toBe(false);
  });

  it('opens the clicked question', () => {
    items[0].querySelector('.faq-question').click();
    expect(items[0].classList.contains('active')).toBe(true);
  });

  it('closes the open question when it is clicked again', () => {
    const q = items[0].querySelector('.faq-question');
    q.click();
    q.click();
    expect(items[0].classList.contains('active')).toBe(false);
  });

  it('keeps only one question open at a time', () => {
    items[0].querySelector('.faq-question').click();
    items[1].querySelector('.faq-question').click();

    expect(items[0].classList.contains('active')).toBe(false);
    expect(items[1].classList.contains('active')).toBe(true);
    expect(items.filter((i) => i.classList.contains('active'))).toHaveLength(1);
  });

  it('gives every question a visible answer element', () => {
    for (const item of items) {
      expect(item.querySelector('.faq-question').textContent.trim()).not.toBe('');
      expect(item.querySelector('.faq-answer')).not.toBeNull();
    }
  });
});
