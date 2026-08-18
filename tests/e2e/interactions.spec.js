import { test, expect } from '@playwright/test';
import { PAGES, skipSegmentGate, stubEventsData, blockThirdPartyEmbeds } from './helpers.js';

test.describe('segment gate', () => {
  test('greets a first-time visitor with the audience chooser', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#segmentGate')).toHaveClass(/active/);
    await expect(page.locator('#segmentGate')).toContainText('What kind of barn are you running?');
  });

  test('offers all three audiences plus a skip', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('#segmentGate .segment-card')).toHaveCount(3);
    await expect(page.locator('.segment-skip')).toBeVisible();
  });

  test('choosing racing dismisses the gate and remembers the choice', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.segment-card[onclick*="racing"]').click();

    await expect(page.locator('#segmentGate')).not.toHaveClass(/active/);
    expect(await page.evaluate(() => localStorage.getItem('bb_segment'))).toBe('racing');
  });

  test('does not reappear on the next visit', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.segment-skip').click();
    await expect(page.locator('#segmentGate')).not.toHaveClass(/active/);

    await page.reload();
    await expect(page.locator('#segmentGate')).not.toHaveClass(/active/);
  });

  test('the show card records its segment and navigates', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.segment-card[href="show.html"]').click();
    await expect(page).toHaveURL(/show(\.html)?$/);
    expect(await page.evaluate(() => localStorage.getItem('bb_segment'))).toBe('show');
  });

  test('restores scrolling once dismissed', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.segment-skip').click();
    await expect
      .poll(() => page.evaluate(() => document.body.style.overflow))
      .toBe('');
  });
});

test.describe('FAQ accordion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/faq.html');
  });

  test('starts fully collapsed', async ({ page }) => {
    await expect(page.locator('.faq-item.active')).toHaveCount(0);
    expect(await page.locator('.faq-item').count()).toBeGreaterThan(0);
  });

  test('opens a question and reveals its answer', async ({ page }) => {
    const first = page.locator('.faq-item').first();
    await first.locator('.faq-question').click();
    await expect(first).toHaveClass(/active/);
    await expect(first.locator('.faq-answer')).toBeVisible();
  });

  test('closes the question when clicked again', async ({ page }) => {
    const first = page.locator('.faq-item').first();
    await first.locator('.faq-question').click();
    await first.locator('.faq-question').click();
    await expect(first).not.toHaveClass(/active/);
  });

  test('keeps only one question open', async ({ page }) => {
    await page.locator('.faq-item').nth(0).locator('.faq-question').click();
    await page.locator('.faq-item').nth(1).locator('.faq-question').click();

    await expect(page.locator('.faq-item.active')).toHaveCount(1);
    await expect(page.locator('.faq-item').nth(1)).toHaveClass(/active/);
  });
});

test.describe('mobile', () => {
  test.skip(({ isMobile }) => !isMobile, 'mobile viewport only');

  test.beforeEach(async ({ page }) => {
    await skipSegmentGate(page);
    await stubEventsData(page);
    await blockThirdPartyEmbeds(page);
  });

  test('the burger opens and closes the nav', async ({ page }) => {
    await page.goto('/index.html');

    const menu = page.locator('#mainNav');
    await expect(menu).toBeHidden();

    await page.locator('.navbar-toggler').click();
    // Bootstrap animates via a transient .collapsing class; wait for it to settle
    // at .collapse.show before toggling again, or the second click is swallowed.
    await expect(menu).toHaveClass(/\bshow\b/);
    await expect(menu).not.toHaveClass(/collapsing/);
    await expect(page.locator('#mainNav a[href="products.html"]')).toBeVisible();

    await page.locator('.navbar-toggler').click();
    await expect(menu).not.toHaveClass(/\bshow\b/);
    await expect(menu).toBeHidden();
  });

  test('a nav link works from the burger menu', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('.navbar-toggler').click();
    await page.locator('#mainNav a[href="faq.html"]').click();
    await expect(page).toHaveURL(/faq(\.html)?$/);
  });

  for (const path of PAGES) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await page.goto(`/${path}`);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      // A pixel or two of rounding is fine; a real overflow is not.
      expect(overflow, `${path} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(2);
    });
  }

  test('the calculator is usable on a phone', async ({ page }) => {
    await page.goto('/straw-vs-shavings.html');
    await page.locator('#sStalls').fill('30');
    await expect(page.locator('#vStalls')).toContainText('30');
    await expect(page.locator('#pMon')).toBeVisible();
  });
});
