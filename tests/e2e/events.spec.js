import { test, expect } from '@playwright/test';
import { stubEventsData, blockThirdPartyEmbeds, eventsFixture } from './helpers.js';

test.beforeEach(async ({ page }) => {
  await blockThirdPartyEmbeds(page);
});

test.describe('events', () => {
  test.beforeEach(async ({ page }) => {
    await stubEventsData(page);
    await page.goto('/events.html');
  });

  test('lists the upcoming events, soonest first', async ({ page }) => {
    const cards = page.locator('#bb-events-upcoming .event-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('Far Future Championship');
    await expect(cards.nth(1)).toContainText('Second Far Future Show');
  });

  test('formats a multi-day range on one line', async ({ page }) => {
    await expect(page.locator('#bb-events-upcoming .event-date').first())
      .toContainText('June 10–12, 2099');
  });

  test('shows the sponsor badge', async ({ page }) => {
    await expect(page.locator('#bb-events-upcoming').first())
      .toContainText('Official Bedding Sponsor');
  });

  test('reveals past events in their own section', async ({ page }) => {
    await expect(page.locator('#bb-past-section')).toBeVisible();
    await expect(page.locator('#bb-events-past .event-card')).toHaveCount(1);
    await expect(page.locator('#bb-events-past')).toContainText('Long Past Benefit Sale');
  });

  test('links out to the event safely', async ({ page }) => {
    const link = page.locator('#bb-events-upcoming .event-link').first();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

test.describe('events empty state', () => {
  test('invites sponsorship when nothing is scheduled', async ({ page }) => {
    await stubEventsData(page, { events: [], gallery: [], social: {} });
    await page.goto('/events.html');

    await expect(page.locator('#bb-events-upcoming')).toContainText(
      'Our next season is being scheduled',
    );
    await expect(page.locator('#bb-past-section')).toBeHidden();
  });

  test('survives an unreachable data file', async ({ page }) => {
    await page.route('**/assets/events-data.json*', (route) => route.abort());
    await page.goto('/events.html');

    await expect(page.locator('#bb-events-upcoming')).toContainText(
      'Our next season is being scheduled',
    );
    await expect(page.locator('#bb-gallery-grid')).toContainText('The gallery is filling up');
  });
});

test.describe('gallery', () => {
  test.beforeEach(async ({ page }) => {
    await stubEventsData(page);
    await page.goto('/events.html');
  });

  test('renders a card for every usable entry', async ({ page }) => {
    await expect(page.locator('#bb-gallery-grid .gal-card')).toHaveCount(
      eventsFixture.gallery.length,
    );
  });

  test('offers filters for the categories present', async ({ page }) => {
    const filters = page.locator('#bb-gallery-filters .gal-filter');
    await expect(page.locator('#bb-gallery-filters')).toBeVisible();
    await expect(filters).toHaveCount(4);
    await expect(filters.first()).toHaveText('All');
  });

  test('filtering to Photos shows only photos', async ({ page }) => {
    await page.click('#bb-gallery-filters [data-filter="photo"]');
    await expect(page.locator('#bb-gallery-grid .gal-photo')).toHaveCount(2);
    await expect(page.locator('#bb-gallery-grid .gal-social')).toHaveCount(0);
    await expect(page.locator('[data-filter="photo"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('returning to All restores every card', async ({ page }) => {
    await page.click('#bb-gallery-filters [data-filter="photo"]');
    await page.click('#bb-gallery-filters [data-filter="all"]');
    await expect(page.locator('#bb-gallery-grid .gal-card')).toHaveCount(
      eventsFixture.gallery.length,
    );
  });

  test('loads the real gallery images', async ({ page }) => {
    const broken = await page.locator('#bb-gallery-grid img').evaluateAll((imgs) =>
      imgs.filter((img) => !img.complete || img.naturalWidth === 0).map((img) => img.src),
    );
    expect(broken).toEqual([]);
  });
});

test.describe('lightbox', () => {
  test.beforeEach(async ({ page }) => {
    await stubEventsData(page);
    await page.goto('/events.html');
  });

  test('opens on click with the right photo and counter', async ({ page }) => {
    await page.locator('#bb-gallery-grid .gal-photo').first().click();

    const box = page.locator('#bb-lightbox');
    await expect(box).toBeVisible();
    await expect(box.locator('.lb-count')).toHaveText('1 / 2');
    await expect(box.locator('.lb-caption')).toHaveText('First fixture photo');
  });

  test('opens from the keyboard', async ({ page }) => {
    await page.locator('#bb-gallery-grid .gal-photo').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#bb-lightbox')).toBeVisible();
  });

  test('moves through photos with the arrow keys and wraps', async ({ page }) => {
    await page.locator('#bb-gallery-grid .gal-photo').first().click();
    const count = page.locator('#bb-lightbox .lb-count');

    await page.keyboard.press('ArrowRight');
    await expect(count).toHaveText('2 / 2');
    await page.keyboard.press('ArrowRight');
    await expect(count).toHaveText('1 / 2');
    await page.keyboard.press('ArrowLeft');
    await expect(count).toHaveText('2 / 2');
  });

  test('closes with Escape and returns focus to the card', async ({ page }) => {
    const card = page.locator('#bb-gallery-grid .gal-photo').first();
    await card.click();
    await page.keyboard.press('Escape');

    await expect(page.locator('#bb-lightbox')).toBeHidden();
    await expect(card).toBeFocused();
  });

  test('closes with the close button', async ({ page }) => {
    await page.locator('#bb-gallery-grid .gal-photo').first().click();
    await page.locator('#bb-lightbox .lb-close').click();
    await expect(page.locator('#bb-lightbox')).toBeHidden();
  });

  test('locks the page behind the lightbox', async ({ page }) => {
    await page.locator('#bb-gallery-grid .gal-photo').first().click();
    await expect(page.locator('body')).toHaveClass(/lb-open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).not.toHaveClass(/lb-open/);
  });
});

test.describe('social call to action', () => {
  test('renders the configured buttons', async ({ page }) => {
    await stubEventsData(page);
    await page.goto('/events.html');

    const cta = page.locator('#bb-social-cta a');
    await expect(cta).toHaveCount(3);
    await expect(page.locator('#bb-social-cta a[href^="mailto:"]')).toHaveCount(1);
  });

  test('hides buttons that are not configured', async ({ page }) => {
    await stubEventsData(page, {
      events: [],
      gallery: [],
      social: { instagram: 'https://www.instagram.com/bluegrass.bedding/' },
    });
    await page.goto('/events.html');
    await expect(page.locator('#bb-social-cta a')).toHaveCount(1);
  });
});
