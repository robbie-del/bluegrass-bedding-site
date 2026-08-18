import { test, expect } from '@playwright/test';

const money = (text) => Number(String(text).replace(/[$,]/g, ''));

test.beforeEach(async ({ page }) => {
  await page.goto('/straw-vs-shavings.html');
});

test.describe('bedding cost calculator', () => {
  test('shows a populated comparison on load', async ({ page }) => {
    await expect(page.locator('#pMon')).not.toHaveText('');
    await expect(page.locator('#sMon')).not.toHaveText('');
    expect(money(await page.locator('#pMon').textContent())).toBeGreaterThan(0);
    expect(money(await page.locator('#sMon').textContent())).toBeGreaterThan(0);
  });

  test('starts with pine cheaper and a positive saving', async ({ page }) => {
    expect(money(await page.locator('#pMon').textContent()))
      .toBeLessThan(money(await page.locator('#sMon').textContent()));
    await expect(page.locator('#savH')).toHaveText('You Save with Bluegrass Bedding');
    expect(money(await page.locator('#savV').textContent())).toBeGreaterThan(0);
  });

  test('recalculates as the stall slider moves', async ({ page }) => {
    const before = money(await page.locator('#pMon').textContent());

    await page.locator('#sStalls').fill('40');
    await expect(page.locator('#vStalls')).toContainText('40');

    expect(money(await page.locator('#pMon').textContent())).toBe(before * 2);
  });

  test('recalculates when a price is typed', async ({ page }) => {
    const before = money(await page.locator('#sMon').textContent());
    await page.locator('#sPrice').fill('20');
    await expect
      .poll(async () => money(await page.locator('#sMon').textContent()))
      .toBeGreaterThan(before);
  });

  test('adding waste removal raises the pine total only', async ({ page }) => {
    const pineBefore = money(await page.locator('#pMon').textContent());
    const strawBefore = money(await page.locator('#sMon').textContent());

    // The checkbox itself is visually hidden; the visible control is the slider.
    await page.locator('label.switch .slider-sw').click();
    await expect(page.locator('#pDump')).toBeChecked();

    expect(money(await page.locator('#pMon').textContent())).toBeGreaterThan(pineBefore);
    expect(money(await page.locator('#sMon').textContent())).toBe(strawBefore);
    await expect(page.locator('#pMonSub')).toContainText('dumpster');
    await expect(page.locator('#pDumpNote')).toContainText('dumpsters/mo');
  });

  test('flips the panel when pine is priced above straw', async ({ page }) => {
    await page.locator('#pPrice').fill('60');
    await expect(page.locator('#savings')).toHaveClass(/flip/);
    await expect(page.locator('#savH')).toHaveText('Pine Costs More With These Inputs');
    await expect(page.locator('#savV')).toContainText('/ month more');
  });

  test('never displays NaN for empty or nonsense input', async ({ page }) => {
    for (const value of ['', '0', '-5']) {
      await page.locator('#pPrice').fill(value);
      await expect(page.locator('#pMon')).not.toContainText('NaN');
      await expect(page.locator('#savV')).not.toContainText('NaN');
    }
  });

  test('states an annual figure and a percentage', async ({ page }) => {
    await expect(page.locator('#savS')).toContainText('/year');
    await expect(page.locator('#savS')).toContainText('% less');
  });

  test('keeps per-stall and unit figures in step with the barn total', async ({ page }) => {
    await page.locator('#sStalls').fill('10');
    await page.locator('#pDay').fill('2');

    await expect(page.locator('#pUnits')).toHaveText('600 bags'); // 2 x 10 x 30
    expect(money(await page.locator('#pPsDay').textContent())).toBeCloseTo(15, 2);
  });
});
