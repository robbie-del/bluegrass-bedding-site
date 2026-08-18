import { describe, it, expect, beforeEach } from 'vitest';
import { loadEvents } from './helpers/load-events.js';

let bb;
beforeEach(() => {
  bb = loadEvents();
});

describe('esc', () => {
  it('escapes every HTML-significant character', () => {
    expect(bb.esc(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('escapes the ampersand first so entities are not double-broken', () => {
    expect(bb.esc('&lt;')).toBe('&amp;lt;');
  });

  it('neutralises a script tag from CMS content', () => {
    const out = bb.esc('<script>alert(1)</script>');
    expect(out).not.toContain('<script');
    expect(out).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('renders null and undefined as an empty string, not "null"', () => {
    expect(bb.esc(null)).toBe('');
    expect(bb.esc(undefined)).toBe('');
  });

  it('stringifies non-string input', () => {
    expect(bb.esc(42)).toBe('42');
    expect(bb.esc(0)).toBe('0');
    expect(bb.esc(false)).toBe('false');
  });
});

describe('parseDate', () => {
  it('parses a YYYY-MM-DD string at local noon', () => {
    const d = bb.parseDate('2026-05-06');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // zero-based: May
    expect(d.getDate()).toBe(6);
    expect(d.getHours()).toBe(12);
  });

  it('does not shift the day in any timezone (the reason noon is used)', () => {
    // A UTC-midnight parse would land on the 5th for western offsets.
    expect(bb.parseDate('2026-01-01').getDate()).toBe(1);
    expect(bb.parseDate('2026-12-31').getDate()).toBe(31);
  });

  it('tolerates surrounding whitespace', () => {
    expect(bb.parseDate('  2026-05-06 \n').getDate()).toBe(6);
  });

  it('rejects anything that is not exactly YYYY-MM-DD', () => {
    for (const bad of ['', '2026-5-6', '05/06/2026', '2026-05-06T00:00:00Z', 'soon', 'null']) {
      expect(bb.parseDate(bad)).toBeNull();
    }
  });

  it('rejects null, undefined and non-strings that cannot match', () => {
    expect(bb.parseDate(null)).toBeNull();
    expect(bb.parseDate(undefined)).toBeNull();
    expect(bb.parseDate(0)).toBeNull();
    expect(bb.parseDate({})).toBeNull();
  });

  it('returns null for a well-formed but impossible date', () => {
    // JS rolls 2026-02-31 over into March, so the guard is the format, not validity.
    // What must never happen is a NaN Date escaping.
    const d = bb.parseDate('2026-02-31');
    expect(d === null || !Number.isNaN(d.getTime())).toBe(true);
  });
});

describe('formatRange', () => {
  it('formats a single-day event', () => {
    expect(bb.formatRange('2026-05-06')).toBe('May 6, 2026');
  });

  it('collapses a range inside one month to "May 6–8, 2026"', () => {
    expect(bb.formatRange('2026-05-06', '2026-05-08')).toBe('May 6–8, 2026');
  });

  it('spells out both months when the range crosses a month', () => {
    expect(bb.formatRange('2026-05-30', '2026-06-02')).toBe('May 30 – June 2, 2026');
  });

  it('includes both years when the range crosses a year', () => {
    expect(bb.formatRange('2026-12-30', '2027-01-02')).toBe(
      'December 30, 2026 – January 2, 2027',
    );
  });

  it('ignores an end date that is not after the start', () => {
    expect(bb.formatRange('2026-05-06', '2026-05-06')).toBe('May 6, 2026');
    expect(bb.formatRange('2026-05-06', '2026-05-01')).toBe('May 6, 2026');
  });

  it('ignores an unparseable end date', () => {
    expect(bb.formatRange('2026-05-06', 'whenever')).toBe('May 6, 2026');
  });

  it('escapes an unparseable start date rather than dropping it', () => {
    expect(bb.formatRange('TBA')).toBe('TBA');
    expect(bb.formatRange('<b>TBA</b>')).toBe('&lt;b&gt;TBA&lt;/b&gt;');
  });

  it('returns an empty string when there is no start date at all', () => {
    expect(bb.formatRange(null)).toBe('');
    expect(bb.formatRange('')).toBe('');
  });
});

describe('formatShort', () => {
  it('abbreviates the month to three letters', () => {
    expect(bb.formatShort('2026-08-05')).toBe('Aug 5, 2026');
    expect(bb.formatShort('2026-09-01')).toBe('Sep 1, 2026');
  });

  it('returns an empty string for an unparseable date', () => {
    expect(bb.formatShort('nope')).toBe('');
    expect(bb.formatShort(null)).toBe('');
  });
});

describe('endOfEvent', () => {
  it('prefers endDate over date', () => {
    const evt = { date: '2026-05-06', endDate: '2026-05-08' };
    expect(bb.endOfEvent(evt)).toBe(bb.parseDate('2026-05-08').getTime());
  });

  it('falls back to date when there is no endDate', () => {
    expect(bb.endOfEvent({ date: '2026-05-06' })).toBe(bb.parseDate('2026-05-06').getTime());
  });

  it('falls back to date when endDate is unparseable', () => {
    const evt = { date: '2026-05-06', endDate: 'later' };
    expect(bb.endOfEvent(evt)).toBe(bb.parseDate('2026-05-06').getTime());
  });

  it('returns 0 when nothing is parseable, sorting the event into the past', () => {
    expect(bb.endOfEvent({})).toBe(0);
    expect(bb.endOfEvent({ date: 'TBA' })).toBe(0);
  });
});

describe('isHttpUrl', () => {
  it('accepts http and https, case-insensitively, with whitespace', () => {
    expect(bb.isHttpUrl('https://example.com')).toBe(true);
    expect(bb.isHttpUrl('http://example.com')).toBe(true);
    expect(bb.isHttpUrl('HTTPS://EXAMPLE.COM')).toBe(true);
    expect(bb.isHttpUrl('  https://example.com  ')).toBe(true);
  });

  it('rejects javascript: and data: URLs', () => {
    expect(bb.isHttpUrl('javascript:alert(1)')).toBe(false);
    expect(bb.isHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('rejects relative paths, mailto, and non-strings', () => {
    expect(bb.isHttpUrl('/products.html')).toBe(false);
    expect(bb.isHttpUrl('mailto:info@bluegrassbedding.com')).toBe(false);
    expect(bb.isHttpUrl('')).toBe(false);
    expect(bb.isHttpUrl(null)).toBe(false);
    expect(bb.isHttpUrl(undefined)).toBe(false);
    expect(bb.isHttpUrl(123)).toBe(false);
  });
});

describe('colClass', () => {
  it('widens and centres a single card', () => {
    expect(bb.colClass(1)).toBe('col-md-8 col-lg-5 d-flex');
  });

  it('uses a half-width pair for two cards', () => {
    expect(bb.colClass(2)).toBe('col-md-6 col-lg-5 d-flex');
  });

  it('falls back to thirds for three or more', () => {
    expect(bb.colClass(3)).toBe('col-md-6 col-lg-4 d-flex');
    expect(bb.colClass(12)).toBe('col-md-6 col-lg-4 d-flex');
  });
});

describe('categoryOf', () => {
  it('maps each supported type to its filter bucket', () => {
    expect(bb.categoryOf('photo')).toBe('photo');
    expect(bb.categoryOf('youtube')).toBe('video');
    expect(bb.categoryOf('instagram')).toBe('social');
    expect(bb.categoryOf('facebook')).toBe('social');
  });

  it('returns null for unknown or missing types', () => {
    expect(bb.categoryOf('tiktok')).toBeNull();
    expect(bb.categoryOf('')).toBeNull();
    expect(bb.categoryOf(undefined)).toBeNull();
  });
});

describe('youtubeId', () => {
  it.each([
    ['https://youtube.com/shorts/a_9w_u9LXMM', 'a_9w_u9LXMM'],
    ['https://www.youtube.com/shorts/a_9w_u9LXMM', 'a_9w_u9LXMM'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extracts the id from %s', (url, id) => {
    expect(bb.youtubeId(url)).toBe(id);
  });

  it('ignores trailing query strings and fragments', () => {
    expect(bb.youtubeId('https://youtu.be/dQw4w9WgXcQ?t=42')).toBe('dQw4w9WgXcQ');
  });

  it('returns null for non-YouTube and malformed URLs', () => {
    expect(bb.youtubeId('https://vimeo.com/12345678')).toBeNull();
    expect(bb.youtubeId('https://example.com')).toBeNull();
    expect(bb.youtubeId('')).toBeNull();
    expect(bb.youtubeId(null)).toBeNull();
  });

  it('rejects an id shorter than six characters', () => {
    expect(bb.youtubeId('https://youtu.be/abc')).toBeNull();
  });
});

describe('isFacebookReel', () => {
  it('detects both reel URL shapes Facebook hands out', () => {
    expect(bb.isFacebookReel('https://www.facebook.com/share/r/1F5UwE9564/')).toBe(true);
    expect(bb.isFacebookReel('https://www.facebook.com/reel/123456')).toBe(true);
    expect(bb.isFacebookReel('https://FACEBOOK.COM/REEL/123456')).toBe(true);
  });

  it('does not treat an ordinary post as a reel', () => {
    expect(bb.isFacebookReel('https://www.facebook.com/share/p/1Jmf315tEZ/')).toBe(false);
    expect(bb.isFacebookReel('https://www.facebook.com/bluegrass.bedding')).toBe(false);
  });

  it('handles non-strings without throwing', () => {
    expect(bb.isFacebookReel(null)).toBe(false);
    expect(bb.isFacebookReel(undefined)).toBe(false);
  });
});

describe('isUsable', () => {
  it('accepts a photo with a src', () => {
    expect(bb.isUsable({ type: 'photo', src: 'assets/gallery/a.jpg' })).toBe(true);
  });

  it('rejects a photo with no src (it would render an empty card)', () => {
    expect(bb.isUsable({ type: 'photo' })).toBe(false);
    expect(bb.isUsable({ type: 'photo', src: '' })).toBe(false);
  });

  it('requires an http(s) url for social and video entries', () => {
    expect(bb.isUsable({ type: 'instagram', url: 'https://instagram.com/p/A1/' })).toBe(true);
    expect(bb.isUsable({ type: 'instagram', url: 'not-a-url' })).toBe(false);
    expect(bb.isUsable({ type: 'facebook' })).toBe(false);
  });

  it('rejects a YouTube entry whose URL yields no video id', () => {
    expect(bb.isUsable({ type: 'youtube', url: 'https://youtube.com/' })).toBe(false);
    expect(bb.isUsable({ type: 'youtube', url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe(true);
  });

  it('rejects unknown types, null, and undefined', () => {
    expect(bb.isUsable({ type: 'tiktok', url: 'https://tiktok.com/x' })).toBe(false);
    expect(bb.isUsable(null)).toBe(false);
    expect(bb.isUsable(undefined)).toBe(false);
    expect(bb.isUsable({})).toBe(false);
  });
});
