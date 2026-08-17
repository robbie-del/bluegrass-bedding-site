/**
 * Form behaviour in a real browser.
 *
 * Every test here stubs the Formspree endpoint. Nothing in this file is allowed
 * to reach formspree.io — a live submission emails the business. See AGENTS.md.
 */
import { test, expect } from '@playwright/test';
import { stubFormspree, forbidLiveFormspree, skipSegmentGate, FORMSPREE } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await skipSegmentGate(page);
  await forbidLiveFormspree(page);
});

test.describe('quote form', () => {
  test('submits and swaps in the success message', async ({ page }) => {
    const { submissions } = await stubFormspree(page);
    await page.goto('/quote.html');

    await page.fill('#quote-name', 'Test Rider');
    await page.fill('#quote-facility', 'Test Barn');
    await page.fill('#quote-email', 'test@example.com');
    await page.fill('#quote-phone', '555-0100');
    await page.fill('#quote-delivery-address', '40026');
    await page.selectOption('#quote-product', { index: 1 });
    await page.selectOption('#quote-volume', { index: 1 });

    await page.click('#quoteForm button[type="submit"]');

    await expect(page.locator('#quoteSuccess')).toBeVisible();
    await expect(page.locator('#quoteForm')).toBeHidden();
    expect(submissions).toHaveLength(1);
    expect(submissions[0].method).toBe('POST');
  });

  test('sends the entered values to Formspree', async ({ page }) => {
    const { submissions } = await stubFormspree(page);
    await page.goto('/quote.html');

    await page.fill('#quote-name', 'Jane Trainer');
    await page.fill('#quote-facility', 'Champagne Run');
    await page.fill('#quote-email', 'jane@example.com');
    await page.fill('#quote-phone', '502-555-0199');
    await page.fill('#quote-delivery-address', '40026');
    await page.selectOption('#quote-product', { index: 1 });
    await page.selectOption('#quote-volume', { index: 1 });
    await page.click('#quoteForm button[type="submit"]');

    await expect(page.locator('#quoteSuccess')).toBeVisible();
    expect(submissions[0].body).toContain('Jane Trainer');
    expect(submissions[0].body).toContain('jane@example.com');
  });

  test('blocks submission when required fields are empty', async ({ page }) => {
    const { submissions } = await stubFormspree(page);
    await page.goto('/quote.html');

    await page.click('#quoteForm button[type="submit"]');

    expect(submissions).toHaveLength(0);
    await expect(page.locator('#quoteForm')).toBeVisible();
    await expect(page.locator('#quoteSuccess')).toBeHidden();
  });

  test('rejects a malformed email address', async ({ page }) => {
    const { submissions } = await stubFormspree(page);
    await page.goto('/quote.html');

    await page.fill('#quote-name', 'Test');
    await page.fill('#quote-facility', 'Barn');
    await page.fill('#quote-email', 'not-an-email');
    await page.fill('#quote-phone', '555-0100');
    await page.fill('#quote-delivery-address', '40026');
    await page.selectOption('#quote-product', { index: 1 });
    await page.selectOption('#quote-volume', { index: 1 });
    await page.click('#quoteForm button[type="submit"]');

    expect(submissions).toHaveLength(0);
    const valid = await page.locator('#quote-email').evaluate((el) => el.checkValidity());
    expect(valid).toBe(false);
  });

  test('warns the visitor when the submission fails', async ({ page }) => {
    await stubFormspree(page, { ok: false });
    await page.goto('/quote.html');

    const alerts = [];
    page.on('dialog', async (d) => {
      alerts.push(d.message());
      await d.dismiss();
    });

    await page.fill('#quote-name', 'Test');
    await page.fill('#quote-facility', 'Barn');
    await page.fill('#quote-email', 'test@example.com');
    await page.fill('#quote-phone', '555-0100');
    await page.fill('#quote-delivery-address', '40026');
    await page.selectOption('#quote-product', { index: 1 });
    await page.selectOption('#quote-volume', { index: 1 });
    await page.click('#quoteForm button[type="submit"]');

    await expect.poll(() => alerts.length).toBe(1);
    expect(alerts[0]).toContain('502-650-1208');
    await expect(page.locator('#quoteForm')).toBeVisible();
    await expect(page.locator('#quoteSuccess')).toBeHidden();
  });

  test('every label focuses its field when clicked', async ({ page }) => {
    await page.goto('/quote.html');
    for (const id of ['quote-name', 'quote-facility', 'quote-email', 'quote-phone']) {
      await page.locator(`label[for="${id}"]`).click();
      await expect(page.locator(`#${id}`)).toBeFocused();
    }
  });
});

test.describe('contact form', () => {
  test('submits and confirms', async ({ page }) => {
    const { submissions } = await stubFormspree(page);
    await page.goto('/contact.html');

    await page.fill('#contact-name', 'Test Rider');
    await page.fill('#contact-email', 'test@example.com');
    await page.selectOption('#contact-topic', { index: 1 });
    await page.fill('#contact-message', 'Please send pricing for 20 stalls.');
    await page.click('#contactForm button[type="submit"]');

    await expect(page.locator('#contactSuccess')).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(submissions[0].body).toContain('Please send pricing');
  });

  test('requires name, email, topic and message', async ({ page }) => {
    const { submissions } = await stubFormspree(page);
    await page.goto('/contact.html');
    await page.click('#contactForm button[type="submit"]');
    expect(submissions).toHaveLength(0);
  });

  test('treats facility and phone as optional', async ({ page }) => {
    await page.goto('/contact.html');
    for (const id of ['contact-facility', 'contact-phone']) {
      expect(await page.locator(`#${id}`).getAttribute('required')).toBeNull();
    }
  });
});

test.describe('order modal (home page)', () => {
  test('opens preselected with the chosen product', async ({ page }) => {
    await page.goto('/index.html');

    const trigger = page.locator('[onclick^="openOrderModal"]').first();
    const product = await trigger.evaluate(
      (el) => el.getAttribute('onclick').match(/openOrderModal\('([^']+)'\)/)[1],
    );
    await trigger.click();

    await expect(page.locator('#orderModal')).toBeVisible();
    await expect(page.locator('#productSelect')).toHaveValue(product);
  });

  test('reveals the bag count only for the individual-bags tier', async ({ page }) => {
    await page.goto('/index.html');
    await page.locator('[onclick^="openOrderModal"]').first().click();
    await expect(page.locator('#orderModal')).toBeVisible();

    await expect(page.locator('#bagCountRow')).toBeHidden();
    await page.selectOption('#tierSelect', 'Individual bags (less than 1 pallet)');
    await expect(page.locator('#bagCountRow')).toBeVisible();
  });

  test('submits the order and confirms', async ({ page }) => {
    const { submissions } = await stubFormspree(page);
    await page.goto('/index.html');
    await page.locator('[onclick^="openOrderModal"]').first().click();
    await expect(page.locator('#orderModal')).toBeVisible();

    await page.fill('#order-name', 'Test Rider');
    await page.fill('#order-email', 'test@example.com');
    await page.fill('#order-phone', '555-0100');
    await page.fill('#order-zip', '40026');
    await page.selectOption('#tierSelect', { index: 1 });
    await page.click('#orderForm button[type="submit"]');

    await expect(page.locator('#orderSuccess')).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(submissions[0].url ?? FORMSPREE).toBeTruthy();
  });
});
