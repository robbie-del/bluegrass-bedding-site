import { test, expect } from '@playwright/test';
import { PAGES, skipSegmentGate, collectPageErrors, stubEventsData, blockThirdPartyEmbeds } from './helpers.js';

/**
 * Both the dev server and Netlify serve "pretty" URLs, so a link to page.html can
 * land on /page or /page.html depending on the host.
 */
const urlFor = (file) => new RegExp(`/${file.replace('.html', '')}(\\.html)?$`);

/** Below the lg breakpoint the nav is collapsed behind the burger. */
async function openNav(page, isMobile) {
  if (!isMobile) return;
  await page.locator('.navbar-toggler').click();
  await expect(page.locator('#mainNav')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await skipSegmentGate(page);
  await stubEventsData(page);
  await blockThirdPartyEmbeds(page);
});

test.describe('every page loads', () => {
  for (const path of PAGES) {
    test(`${path} renders with a title, an h1 and a footer`, async ({ page }) => {
      const errors = collectPageErrors(page);

      const response = await page.goto(`/${path}`);
      expect(response.status()).toBe(200);

      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('footer.footer')).toBeVisible();

      expect(errors, `JS errors on ${path}`).toEqual([]);
    });
  }
});

test.describe('primary navigation', () => {
  const NAV = [
    ['Home', 'index.html'],
    ['Products', 'products.html'],
    ['Why It Matters', 'science.html'],
    ['Events', 'events.html'],
    ['FAQ', 'faq.html'],
    ['Contact', 'contact.html'],
  ];

  for (const path of PAGES) {
    test(`${path} shows the full nav`, async ({ page }) => {
      await page.goto(`/${path}`);
      for (const [label, href] of NAV) {
        await expect(
          page.locator(`.main-nav a.nav-link[href="${href}"]`),
          `${label} link missing on ${path}`,
        ).toHaveCount(1);
      }
      await expect(page.locator('.main-nav a[href="quote.html"]')).toHaveCount(1);
    });
  }

  for (const [label, href] of NAV.slice(1)) {
    test(`clicking ${label} navigates there`, async ({ page, isMobile }) => {
      await page.goto('/index.html');
      await openNav(page, isMobile);
      await page.locator(`.main-nav a.nav-link[href="${href}"]`).click();
      await expect(page).toHaveURL(urlFor(href));
      await expect(page.locator('h1')).toBeVisible();
    });
  }

  test('the quote CTA reaches the quote form', async ({ page, isMobile }) => {
    await page.goto('/index.html');
    await openNav(page, isMobile);
    await page.locator('.main-nav a[href="quote.html"]').click();
    await expect(page).toHaveURL(urlFor('quote.html'));
    await expect(page.locator('#quoteForm')).toBeVisible();
  });

  test('the logo returns home', async ({ page }) => {
    await page.goto('/contact.html');
    await page.locator('.navbar-brand').click();
    await expect(page).toHaveURL(/\/(index(\.html)?)?$/);
  });
});

test.describe('audience banner', () => {
  const AUDIENCES = [
    ['index.html', 'Thoroughbred Racing'],
    ['show.html', 'Show & Sport Horses'],
    ['boarding.html', 'Boarding & Training'],
  ];

  for (const [path, label] of AUDIENCES) {
    test(`${path} marks "${label}" as the active audience`, async ({ page }) => {
      await page.goto(`/${path}`);
      const active = page.locator('.aud-banner .aud-link.active');
      await expect(active).toHaveCount(1);
      await expect(active).toContainText(label);
    });
  }

  test('switches between audiences', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.aud-banner a[href="boarding.html"]').click();
    await expect(page).toHaveURL(urlFor('boarding.html'));
    await expect(page.locator('.aud-banner .aud-link.active')).toContainText('Boarding');
  });
});

test.describe('contact details', () => {
  for (const path of PAGES) {
    test(`${path} offers a click-to-call and an email link`, async ({ page }) => {
      await page.goto(`/${path}`);
      await expect(page.locator('a[href="tel:5026501208"]').first()).toBeVisible();
      await expect(page.locator('a[href="mailto:info@bluegrassbedding.com"]').first()).toHaveCount(1);
    });
  }
});

test.describe('stylesheet', () => {
  test('site.css is served and applied', async ({ page }) => {
    const response = await page.goto('/assets/site.css');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/css');
  });

  test('brand custom properties resolve on a live page', async ({ page }) => {
    await page.goto('/index.html');
    const gold = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(),
    );
    expect(gold.toLowerCase()).toBe('#c9a84c');
  });
});
