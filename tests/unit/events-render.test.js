import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadEvents, fixture, flush } from './helpers/load-events.js';

/** Parse a returned HTML string so assertions run against real DOM. */
function dom(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

let bb;
beforeEach(() => {
  bb = loadEvents();
});

describe('eventCard', () => {
  const evt = {
    name: 'Redmond Equestrian Mini Trial',
    date: '2026-08-09',
    location: 'Champagne Run',
    role: 'Proud Sponsor',
    description: 'A one-day mini trial.',
    link: 'https://example.com/event',
    linkLabel: 'See the Announcement',
  };

  it('renders the name, formatted date, location and description', () => {
    const card = dom(bb.eventCard(evt, false));
    expect(card.querySelector('.event-name').textContent).toBe('Redmond Equestrian Mini Trial');
    expect(card.querySelector('.event-date').textContent).toContain('August 9, 2026');
    expect(card.querySelector('.event-location').textContent).toContain('Champagne Run');
    expect(card.querySelector('.event-desc').textContent).toBe('A one-day mini trial.');
  });

  it('marks past events with is-past', () => {
    expect(dom(bb.eventCard(evt, true)).querySelector('.event-card').className).toContain('is-past');
    expect(dom(bb.eventCard(evt, false)).querySelector('.event-card').className).not.toContain('is-past');
  });

  it('puts the role in a badge over the image when there is one', () => {
    const card = dom(bb.eventCard({ ...evt, image: 'assets/gallery/a.jpg' }, false));
    expect(card.querySelector('.event-card-img img').getAttribute('src')).toBe('assets/gallery/a.jpg');
    expect(card.querySelector('.event-role-badge').textContent).toBe('Proud Sponsor');
    expect(card.querySelector('.event-role-tag')).toBeNull();
  });

  it('falls back to an inline role tag when there is no image', () => {
    const card = dom(bb.eventCard(evt, false));
    expect(card.querySelector('.event-card-img')).toBeNull();
    expect(card.querySelector('.event-role-tag').textContent).toBe('Proud Sponsor');
  });

  it('uses the event name as image alt text', () => {
    const card = dom(bb.eventCard({ ...evt, image: 'a.jpg' }, false));
    expect(card.querySelector('img').getAttribute('alt')).toBe('Redmond Equestrian Mini Trial');
  });

  it('renders the link with a safe target and rel', () => {
    const link = dom(bb.eventCard(evt, false)).querySelector('.event-link');
    expect(link.getAttribute('href')).toBe('https://example.com/event');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).toContain('See the Announcement');
  });

  it('defaults the link label to "Event Details"', () => {
    const card = dom(bb.eventCard({ ...evt, linkLabel: undefined }, false));
    expect(card.querySelector('.event-link').textContent).toContain('Event Details');
  });

  it('drops a non-http link instead of rendering it', () => {
    const card = dom(bb.eventCard({ ...evt, link: 'javascript:alert(1)' }, false));
    expect(card.querySelector('.event-link')).toBeNull();
  });

  it('falls back to "Untitled Event" when the name is missing', () => {
    const card = dom(bb.eventCard({ date: '2026-08-09' }, false));
    expect(card.querySelector('.event-name').textContent).toBe('Untitled Event');
  });

  it('escapes CMS content rather than executing it', () => {
    const html = bb.eventCard(
      { name: '<img src=x onerror=alert(1)>', description: '</p><script>alert(2)</script>' },
      false,
    );
    expect(html).not.toContain('<script');
    // The payload survives as inert text, but must not become real elements.
    const node = dom(html);
    expect(node.querySelector('script')).toBeNull();
    expect(node.querySelector('img')).toBeNull();
    expect(node.querySelector('.event-name').textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('escapes a quote in the image path so it cannot break out of the attribute', () => {
    const html = bb.eventCard({ name: 'X', image: 'a.jpg" onload="alert(1)' }, false);
    expect(html).not.toContain('onload="alert(1)"');
    expect(dom(html).querySelector('img').getAttribute('onload')).toBeNull();
  });
});

describe('renderEvents', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 17, 9, 0, 0)); // 2026-08-17, local
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function render(events) {
    bb.__setData({ events });
    bb.renderEvents();
    return {
      upcoming: document.getElementById('bb-events-upcoming'),
      past: document.getElementById('bb-events-past'),
      pastSection: document.getElementById('bb-past-section'),
    };
  }

  it('splits events into upcoming and past around today', () => {
    const { upcoming, past } = render([
      { name: 'Future', date: '2026-09-01' },
      { name: 'Past', date: '2026-01-01' },
    ]);
    expect(upcoming.textContent).toContain('Future');
    expect(upcoming.textContent).not.toContain('Past');
    expect(past.textContent).toContain('Past');
  });

  it('keeps an event upcoming through the end of its last day', () => {
    // Multi-day event that started before today but ends today.
    const { upcoming } = render([{ name: 'Ends Today', date: '2026-08-15', endDate: '2026-08-17' }]);
    expect(upcoming.textContent).toContain('Ends Today');
  });

  it('keeps a single-day event upcoming on the day itself', () => {
    const { upcoming } = render([{ name: 'Today', date: '2026-08-17' }]);
    expect(upcoming.textContent).toContain('Today');
  });

  it('moves an event to past the day after it ends', () => {
    const { past } = render([{ name: 'Ended Yesterday', date: '2026-08-16' }]);
    expect(past.textContent).toContain('Ended Yesterday');
  });

  it('sorts upcoming events soonest first', () => {
    const { upcoming } = render([
      { name: 'Later', date: '2026-12-01' },
      { name: 'Sooner', date: '2026-09-01' },
    ]);
    const names = [...upcoming.querySelectorAll('.event-name')].map((n) => n.textContent);
    expect(names).toEqual(['Sooner', 'Later']);
  });

  it('sorts past events most recent first', () => {
    const { past } = render([
      { name: 'Older', date: '2020-01-01' },
      { name: 'Recent', date: '2026-07-01' },
    ]);
    const names = [...past.querySelectorAll('.event-name')].map((n) => n.textContent);
    expect(names).toEqual(['Recent', 'Older']);
  });

  it('skips entries with no name', () => {
    const { upcoming } = render([{ date: '2026-09-01' }, { name: 'Real', date: '2026-09-02' }]);
    expect(upcoming.querySelectorAll('.event-card')).toHaveLength(1);
  });

  it('shows an empty state when nothing is upcoming', () => {
    const { upcoming } = render([{ name: 'Past', date: '2020-01-01' }]);
    expect(upcoming.querySelector('.bb-empty')).not.toBeNull();
    expect(upcoming.textContent).toContain('Our next season is being scheduled');
  });

  it('keeps the past section hidden when there are no past events', () => {
    const { pastSection } = render([{ name: 'Future', date: '2026-09-01' }]);
    expect(pastSection.hidden).toBe(true);
  });

  it('reveals the past section once there is something in it', () => {
    const { pastSection } = render([{ name: 'Past', date: '2020-01-01' }]);
    expect(pastSection.hidden).toBe(false);
  });

  it('applies the widened column class for a single upcoming card', () => {
    const { upcoming } = render([{ name: 'Only', date: '2026-09-01' }]);
    expect(upcoming.firstElementChild.className).toBe('col-md-8 col-lg-5 d-flex');
  });

  it('does nothing when the events container is absent', () => {
    document.body.innerHTML = '';
    bb.__setData({ events: [{ name: 'X', date: '2026-09-01' }] });
    expect(() => bb.renderEvents()).not.toThrow();
  });
});

describe('gallery cards', () => {
  it('normalises an Instagram permalink: strips the query, adds a trailing slash', () => {
    const html = bb.instagramCard({ url: 'https://www.instagram.com/p/ABC123?igsh=xyz' });
    const node = dom(html).querySelector('.instagram-media');
    expect(node.getAttribute('data-instgrm-permalink')).toBe('https://www.instagram.com/p/ABC123/');
  });

  it('leaves an already-normalised Instagram permalink alone', () => {
    const html = bb.instagramCard({ url: 'https://www.instagram.com/p/ABC123/' });
    expect(dom(html).querySelector('.instagram-media').getAttribute('data-instgrm-permalink'))
      .toBe('https://www.instagram.com/p/ABC123/');
  });

  it('renders a Facebook reel as a click-through card, not an embed', () => {
    const html = bb.facebookReelCard({
      url: 'https://www.facebook.com/share/r/1F5UwE9564/',
      caption: 'In the trailer',
      credit: 'Video: Stark Equine',
    });
    const node = dom(html);
    expect(node.querySelector('.gal-reel').getAttribute('href'))
      .toBe('https://www.facebook.com/share/r/1F5UwE9564/');
    expect(node.querySelector('.gal-fb')).toBeNull();
    expect(node.querySelector('.gal-caption').textContent).toBe('In the trailer');
    expect(node.querySelector('.gal-credit').textContent).toBe('Video: Stark Equine');
  });

  it('defaults a Facebook post card to 560px', () => {
    const node = dom(bb.facebookCard({ url: 'https://www.facebook.com/share/p/A/' }));
    expect(node.querySelector('.gal-fb').getAttribute('data-fb-height')).toBe('560');
  });

  it('honours a custom Facebook height inside the allowed range', () => {
    const node = dom(bb.facebookCard({ url: 'https://www.facebook.com/share/p/A/', height: 800 }));
    expect(node.querySelector('.gal-fb').getAttribute('data-fb-height')).toBe('800');
  });

  it.each([[10], [199], [1401], [0], ['tall'], [null]])(
    'clamps an out-of-range Facebook height (%s) back to 560',
    (height) => {
      const node = dom(bb.facebookCard({ url: 'https://www.facebook.com/share/p/A/', height }));
      expect(node.querySelector('.gal-fb').getAttribute('data-fb-height')).toBe('560');
    },
  );

  it('embeds YouTube through the nocookie domain', () => {
    const node = dom(bb.youtubeCard({ url: 'https://youtu.be/dQw4w9WgXcQ' }));
    expect(node.querySelector('iframe').getAttribute('src'))
      .toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('gives Shorts a vertical frame automatically', () => {
    const node = dom(bb.youtubeCard({ url: 'https://youtube.com/shorts/a_9w_u9LXMM' }));
    expect(node.querySelector('.gal-yt').className).toContain('is-vertical');
  });

  it('does not make a normal video vertical', () => {
    const node = dom(bb.youtubeCard({ url: 'https://youtu.be/dQw4w9WgXcQ' }));
    expect(node.querySelector('.gal-yt').className).not.toContain('is-vertical');
  });

  it('lets an explicit orientation override the Shorts default', () => {
    const node = dom(bb.youtubeCard({
      url: 'https://youtube.com/shorts/a_9w_u9LXMM',
      orientation: 'wide',
    }));
    expect(node.querySelector('.gal-yt').className).not.toContain('is-vertical');
  });

  it('renders nothing for a YouTube entry with no extractable id', () => {
    expect(bb.youtubeCard({ url: 'https://youtube.com/' })).toBe('');
  });

  it('gives a photo card an accessible label and lightbox index', () => {
    const node = dom(bb.photoCard({ src: 'a.jpg', caption: 'A horse' }, 3));
    const fig = node.querySelector('.gal-photo');
    expect(fig.getAttribute('data-photo-index')).toBe('3');
    expect(fig.getAttribute('role')).toBe('button');
    expect(fig.getAttribute('tabindex')).toBe('0');
    expect(fig.getAttribute('aria-label')).toBe('Enlarge photo: A horse');
    expect(node.querySelector('img').getAttribute('alt')).toBe('A horse');
  });

  it('falls back to generic alt text for an uncaptioned photo', () => {
    const node = dom(bb.photoCard({ src: 'a.jpg' }, 0));
    expect(node.querySelector('img').getAttribute('alt')).toBe('Bluegrass Bedding in use');
  });

  it('omits the caption block entirely when there is no metadata', () => {
    const node = dom(bb.photoCard({ src: 'a.jpg' }, 0));
    expect(node.querySelector('.gal-body')).toBeNull();
  });

  it('renders event tag and short date in gallery meta', () => {
    const node = dom(bb.galleryMeta({ event: 'Mini Trial', date: '2026-08-05' }));
    expect(node.querySelector('.gal-tag').textContent).toContain('Mini Trial');
    expect(node.querySelector('.gal-date').textContent).toBe('Aug 5, 2026');
  });

  it('returns nothing when there is no meta to show', () => {
    expect(bb.galleryMeta({})).toBe('');
  });

  it('escapes captions in every card type', () => {
    const evil = '<script>alert(1)</script>';
    const cards = [
      bb.photoCard({ src: 'a.jpg', caption: evil }, 0),
      bb.instagramCard({ url: 'https://instagram.com/p/A/', caption: evil }),
      bb.facebookCard({ url: 'https://facebook.com/share/p/A/', caption: evil }),
      bb.facebookReelCard({ url: 'https://facebook.com/reel/1', caption: evil }),
      bb.youtubeCard({ url: 'https://youtu.be/dQw4w9WgXcQ', caption: evil }),
    ];
    for (const html of cards) {
      expect(html).not.toContain('<script');
      expect(dom(html).querySelector('script')).toBeNull();
    }
  });
});

describe('renderGallery', () => {
  function render(gallery, filter = 'all') {
    bb.__setData({ gallery });
    bb.renderGallery(filter);
    return document.getElementById('bb-gallery-grid');
  }

  it('renders one card per usable entry', () => {
    const grid = render(fixture.gallery);
    expect(grid.querySelectorAll('.gal-card')).toHaveLength(5);
  });

  it('sorts newest first', () => {
    const grid = render([
      { type: 'photo', src: 'old.jpg', date: '2020-01-01' },
      { type: 'photo', src: 'new.jpg', date: '2026-01-01' },
    ]);
    const srcs = [...grid.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(srcs).toEqual(['new.jpg', 'old.jpg']);
  });

  it('pushes undated entries to the end', () => {
    const grid = render([
      { type: 'photo', src: 'undated.jpg' },
      { type: 'photo', src: 'dated.jpg', date: '2026-01-01' },
    ]);
    const srcs = [...grid.querySelectorAll('img')].map((i) => i.getAttribute('src'));
    expect(srcs).toEqual(['dated.jpg', 'undated.jpg']);
  });

  it('drops unusable entries silently', () => {
    const grid = render([
      { type: 'photo' },
      { type: 'youtube', url: 'https://youtube.com/' },
      { type: 'tiktok', url: 'https://tiktok.com/x' },
      { type: 'photo', src: 'good.jpg' },
    ]);
    expect(grid.querySelectorAll('.gal-card')).toHaveLength(1);
  });

  it('filters to a single category', () => {
    const grid = render(fixture.gallery, 'photo');
    expect(grid.querySelectorAll('.gal-photo')).toHaveLength(2);
    expect(grid.querySelectorAll('.gal-social')).toHaveLength(0);
  });

  it('treats Instagram and Facebook as one "social" bucket', () => {
    const grid = render(fixture.gallery, 'social');
    expect(grid.querySelectorAll('.gal-card')).toHaveLength(2);
  });

  it('narrows the grid for one or two items', () => {
    expect(render([{ type: 'photo', src: 'a.jpg' }]).className).toContain('gal-one');
    expect(render([
      { type: 'photo', src: 'a.jpg' },
      { type: 'photo', src: 'b.jpg' },
    ]).className).toContain('gal-two');
  });

  it('uses the plain grid class for three or more', () => {
    const grid = render(fixture.gallery);
    expect(grid.className).not.toContain('gal-one');
    expect(grid.className).not.toContain('gal-two');
  });

  it('shows a "filling up" empty state when the gallery is empty', () => {
    const grid = render([]);
    expect(grid.textContent).toContain('The gallery is filling up');
  });

  it('shows a filter-specific empty state when a filter matches nothing', () => {
    const grid = render([{ type: 'photo', src: 'a.jpg' }], 'video');
    expect(grid.textContent).toContain('Nothing here yet under that filter');
  });

  it('does nothing when the grid container is absent', () => {
    document.body.innerHTML = '';
    bb.__setData({ gallery: fixture.gallery });
    expect(() => bb.renderGallery('all')).not.toThrow();
  });
});

describe('setupFilters', () => {
  function setup(gallery) {
    bb.__setData({ gallery });
    bb.setupFilters();
    return document.getElementById('bb-gallery-filters');
  }

  it('offers All plus one button per category present', () => {
    const bar = setup(fixture.gallery);
    expect(bar.hidden).toBe(false);
    const labels = [...bar.querySelectorAll('.gal-filter')].map((b) => b.textContent);
    expect(labels).toEqual(['All', 'Photos', 'Video', 'Social Posts']);
  });

  it('stays hidden when there is nothing to filter between', () => {
    expect(setup([{ type: 'photo', src: 'a.jpg' }]).hidden).toBe(true);
    expect(setup([]).hidden).toBe(true);
  });

  it('only counts usable entries when deciding which buttons to show', () => {
    const bar = setup([
      { type: 'photo', src: 'a.jpg' },
      { type: 'youtube', url: 'https://youtube.com/' }, // unusable
    ]);
    expect(bar.hidden).toBe(true);
  });

  it('marks the clicked filter active and re-renders the grid', () => {
    const bar = setup(fixture.gallery);
    bar.querySelector('[data-filter="photo"]').click();

    const active = bar.querySelector('.gal-filter.active');
    expect(active.getAttribute('data-filter')).toBe('photo');
    expect(active.getAttribute('aria-pressed')).toBe('true');
    expect(bar.querySelector('[data-filter="all"]').getAttribute('aria-pressed')).toBe('false');
    expect(document.querySelectorAll('#bb-gallery-grid .gal-photo')).toHaveLength(2);
  });

  it('starts with All selected', () => {
    const bar = setup(fixture.gallery);
    expect(bar.querySelector('.gal-filter.active').getAttribute('data-filter')).toBe('all');
  });
});

describe('lightbox', () => {
  beforeEach(() => {
    bb.__setData({ gallery: fixture.gallery });
    bb.renderGallery('all');
    bb.setupLightbox();
  });

  const box = () => document.getElementById('bb-lightbox');
  const photos = () => document.querySelectorAll('#bb-gallery-grid .gal-photo');

  it('starts hidden', () => {
    expect(box().hidden).toBe(true);
  });

  it('opens on click and shows that photo', () => {
    photos()[0].click();
    expect(box().hidden).toBe(false);
    expect(box().querySelector('.lb-img').getAttribute('src')).toBe('assets/gallery/harley-stall.jpg');
    expect(box().querySelector('.lb-caption').textContent).toBe('First fixture photo');
    expect(box().querySelector('.lb-count').textContent).toBe('1 / 2');
  });

  it('shows credit, event and date together', () => {
    photos()[0].click();
    const credit = box().querySelector('.lb-credit').textContent;
    expect(credit).toContain('Photo: Fixture Stables');
    expect(credit).toContain('Far Future Championship');
    expect(credit).toContain('Jun 11, 2099');
  });

  it('hides the caption line for an uncaptioned photo', () => {
    bb.__setData({ gallery: [{ type: 'photo', src: 'a.jpg' }] });
    bb.renderGallery('all');
    document.querySelector('.gal-photo').click();
    expect(box().querySelector('.lb-caption').hidden).toBe(true);
  });

  it('opens on Enter and on Space', () => {
    for (const key of ['Enter', ' ']) {
      photos()[0].dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));
      expect(box().hidden).toBe(false);
      box().querySelector('.lb-close').click();
    }
  });

  it('closes on the close button, on Escape, and on backdrop click', () => {
    photos()[0].click();
    box().querySelector('.lb-close').click();
    expect(box().hidden).toBe(true);

    photos()[0].click();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(box().hidden).toBe(true);

    photos()[0].click();
    box().querySelector('.lb-stage').click();
    expect(box().hidden).toBe(true);
  });

  it('steps forward and wraps around', () => {
    photos()[0].click();
    box().querySelector('[data-dir="next"]').click();
    expect(box().querySelector('.lb-count').textContent).toBe('2 / 2');
    box().querySelector('[data-dir="next"]').click();
    expect(box().querySelector('.lb-count').textContent).toBe('1 / 2');
  });

  it('steps backward past the first photo to the last', () => {
    photos()[0].click();
    box().querySelector('[data-dir="prev"]').click();
    expect(box().querySelector('.lb-count').textContent).toBe('2 / 2');
  });

  it('navigates with the arrow keys', () => {
    photos()[0].click();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(box().querySelector('.lb-count').textContent).toBe('2 / 2');
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(box().querySelector('.lb-count').textContent).toBe('1 / 2');
  });

  it('ignores arrow keys while closed', () => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(box().hidden).toBe(true);
  });

  it('hides the nav arrows when there is only one photo', () => {
    bb.__setData({ gallery: [{ type: 'photo', src: 'a.jpg' }] });
    bb.renderGallery('all');
    document.querySelector('.gal-photo').click();
    expect([...box().querySelectorAll('.lb-nav')].every((b) => b.hidden)).toBe(true);
  });

  it('locks body scroll while open and releases it on close', () => {
    photos()[0].click();
    expect(document.body.classList.contains('lb-open')).toBe(true);
    box().querySelector('.lb-close').click();
    expect(document.body.classList.contains('lb-open')).toBe(false);
  });

  it('clears the image src on close so the old photo does not flash back', () => {
    photos()[0].click();
    box().querySelector('.lb-close').click();
    expect(box().querySelector('.lb-img').getAttribute('src')).toBeNull();
  });

  it('returns focus to the card that opened it', () => {
    const card = photos()[1];
    card.click();
    box().querySelector('.lb-close').click();
    expect(document.activeElement).toBe(card);
  });

  it('indexes the lightbox by photo position, skipping social cards', () => {
    // fixture order after sorting: photo, photo, youtube, facebook, instagram
    photos()[1].click();
    expect(box().querySelector('.lb-img').getAttribute('src')).toBe('assets/gallery/harley-pellets.jpg');
  });
});

describe('renderSocialCta', () => {
  function render(social) {
    bb.__setData({ social });
    bb.renderSocialCta();
    return document.getElementById('bb-social-cta');
  }

  it('renders all three buttons when everything is configured', () => {
    const wrap = render(fixture.social);
    expect(wrap.querySelectorAll('a')).toHaveLength(3);
  });

  it('builds a mailto with a prefilled subject', () => {
    const wrap = render({ email: 'info@bluegrassbedding.com' });
    const href = wrap.querySelector('a').getAttribute('href');
    expect(href).toContain('mailto:info@bluegrassbedding.com');
    expect(href).toContain(encodeURIComponent('Photo for the Bluegrass Bedding gallery'));
  });

  it('omits a button when its URL is missing or not http(s)', () => {
    expect(render({ instagram: 'not-a-url', facebook: '' }).querySelectorAll('a')).toHaveLength(0);
  });

  it('opens social links safely in a new tab', () => {
    const link = render({ facebook: 'https://facebook.com/bluegrass.bedding' }).querySelector('a');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders nothing when social is empty', () => {
    expect(render({}).innerHTML).toBe('');
  });
});

describe('sizeFacebookEmbeds', () => {
  it('does nothing when there are no Facebook embeds', () => {
    document.body.innerHTML = '<div></div>';
    expect(() => bb.sizeFacebookEmbeds()).not.toThrow();
  });

  it('injects a sized plugin iframe once the column width is known', () => {
    document.body.innerHTML =
      '<div class="gal-fb" data-fb-href="https://www.facebook.com/share/p/A/" data-fb-height="560"></div>';
    const frame = document.querySelector('.gal-fb');
    frame.getBoundingClientRect = () => ({ width: 400 });

    bb.sizeFacebookEmbeds();

    const iframe = frame.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('width')).toBe('400');
    expect(iframe.getAttribute('src')).toContain(
      encodeURIComponent('https://www.facebook.com/share/p/A/'),
    );
    expect(frame.getAttribute('data-fb-width')).toBe('400');
  });

  it('clamps the plugin width to the 180–500px the embed supports', () => {
    document.body.innerHTML =
      '<div class="gal-fb" data-fb-href="https://x.test/p" data-fb-height="560"></div>';
    const frame = document.querySelector('.gal-fb');
    frame.getBoundingClientRect = () => ({ width: 1200 });
    bb.sizeFacebookEmbeds();
    expect(frame.getAttribute('data-fb-width')).toBe('500');
  });

  it('skips re-rendering an embed that is already at the right width', () => {
    document.body.innerHTML =
      '<div class="gal-fb" data-fb-href="https://x.test/p" data-fb-height="560"></div>';
    const frame = document.querySelector('.gal-fb');
    frame.getBoundingClientRect = () => ({ width: 400 });

    bb.sizeFacebookEmbeds();
    const first = frame.querySelector('iframe');
    bb.sizeFacebookEmbeds();
    expect(frame.querySelector('iframe')).toBe(first);
  });
});

describe('bootstrapping from events-data.json', () => {
  it('renders the page from fetched data', async () => {
    loadEvents({ data: fixture, bootstrap: true });
    await flush();
    expect(document.getElementById('bb-events-upcoming').textContent)
      .toContain('Far Future Championship');
    expect(document.querySelectorAll('#bb-gallery-grid .gal-card').length).toBeGreaterThan(0);
  });

  it('degrades to empty states when the fetch fails, without throwing', async () => {
    loadEvents({ fetchFails: true });
    await flush();
    expect(document.getElementById('bb-events-upcoming').textContent)
      .toContain('Our next season is being scheduled');
    expect(document.getElementById('bb-gallery-grid').textContent)
      .toContain('The gallery is filling up');
  });

  it('survives malformed data of the wrong shape', async () => {
    loadEvents({ data: { events: 'not an array', gallery: null, social: null }, bootstrap: true });
    await flush();
    expect(document.getElementById('bb-events-upcoming').textContent)
      .toContain('Our next season is being scheduled');
    expect(document.getElementById('bb-social-cta').innerHTML).toBe('');
  });
});
