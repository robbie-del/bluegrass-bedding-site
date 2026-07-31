/* ============================================================
   Bluegrass Bedding — Events & Gallery renderer
   Reads BB_EVENTS / BB_GALLERY / BB_SOCIAL from events-data.js
   and builds the Events page. No editing needed here — add
   content in assets/events-data.js instead.
   ============================================================ */
(function () {
  'use strict';

  var events  = (typeof BB_EVENTS  !== 'undefined' && Array.isArray(BB_EVENTS))  ? BB_EVENTS.slice()  : [];
  var gallery = (typeof BB_GALLERY !== 'undefined' && Array.isArray(BB_GALLERY)) ? BB_GALLERY.slice() : [];
  var social  = (typeof BB_SOCIAL  !== 'undefined' && BB_SOCIAL) ? BB_SOCIAL : {};

  /* ---------- helpers ---------- */

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // "2026-05-06" -> Date at local noon (noon avoids the UTC-parse day-shift)
  function parseDate(value) {
    if (!value) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value).trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

  function formatRange(startStr, endStr) {
    var start = parseDate(startStr);
    if (!start) return esc(startStr || '');
    var end = parseDate(endStr);
    if (!end || end.getTime() <= start.getTime()) {
      return MONTHS[start.getMonth()] + ' ' + start.getDate() + ', ' + start.getFullYear();
    }
    if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
      return MONTHS[start.getMonth()] + ' ' + start.getDate() + '–' + end.getDate() + ', ' + end.getFullYear();
    }
    if (start.getFullYear() === end.getFullYear()) {
      return MONTHS[start.getMonth()] + ' ' + start.getDate() + ' – ' +
             MONTHS[end.getMonth()] + ' ' + end.getDate() + ', ' + end.getFullYear();
    }
    return MONTHS[start.getMonth()] + ' ' + start.getDate() + ', ' + start.getFullYear() + ' – ' +
           MONTHS[end.getMonth()] + ' ' + end.getDate() + ', ' + end.getFullYear();
  }

  function formatShort(dateStr) {
    var d = parseDate(dateStr);
    if (!d) return '';
    return MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // An event stays "upcoming" through the end of its last day.
  function endOfEvent(evt) {
    var d = parseDate(evt.endDate) || parseDate(evt.date);
    return d ? d.getTime() : 0;
  }

  function isHttpUrl(value) {
    return typeof value === 'string' && /^https?:\/\//i.test(value.trim());
  }

  /* ---------- events ---------- */

  function eventCard(evt, isPast) {
    var parts = [];
    parts.push('<div class="event-card' + (isPast ? ' is-past' : '') + '">');

    if (evt.image) {
      parts.push(
        '<div class="event-card-img">' +
          '<img src="' + esc(evt.image) + '" alt="' + esc(evt.name || 'Event') + '" loading="lazy">' +
          (evt.role ? '<span class="event-role-badge">' + esc(evt.role) + '</span>' : '') +
        '</div>'
      );
    }

    parts.push('<div class="event-card-body">');
    if (!evt.image && evt.role) {
      parts.push('<span class="event-role-tag">' + esc(evt.role) + '</span>');
    }
    parts.push('<div class="event-date"><i class="fas fa-calendar-day"></i>' + formatRange(evt.date, evt.endDate) + '</div>');
    parts.push('<h3 class="event-name">' + esc(evt.name || 'Untitled Event') + '</h3>');
    if (evt.location) {
      parts.push('<div class="event-location"><i class="fas fa-map-marker-alt"></i>' + esc(evt.location) + '</div>');
    }
    if (evt.description) {
      parts.push('<p class="event-desc">' + esc(evt.description) + '</p>');
    }
    if (isHttpUrl(evt.link)) {
      parts.push(
        '<a class="event-link" href="' + esc(evt.link) + '" target="_blank" rel="noopener noreferrer">' +
        esc(evt.linkLabel || 'Event Details') + '<i class="fas fa-arrow-right"></i></a>'
      );
    }
    parts.push('</div></div>');
    return parts.join('');
  }

  function renderEvents() {
    var upcomingWrap = document.getElementById('bb-events-upcoming');
    var pastWrap     = document.getElementById('bb-events-past');
    var pastSection  = document.getElementById('bb-past-section');
    if (!upcomingWrap) return;

    var todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    var cutoff = todayStart.getTime();

    var upcoming = [], past = [];
    events.forEach(function (evt) {
      if (!evt || !evt.name) return;
      (endOfEvent(evt) >= cutoff ? upcoming : past).push(evt);
    });

    upcoming.sort(function (a, b) { return (parseDate(a.date) || 0) - (parseDate(b.date) || 0); });
    past.sort(function (a, b) { return (parseDate(b.date) || 0) - (parseDate(a.date) || 0); });

    if (!upcoming.length) {
      upcomingWrap.innerHTML =
        '<div class="col-12"><div class="bb-empty">' +
          '<i class="fas fa-calendar-day"></i>' +
          '<h4>Our next season is being scheduled</h4>' +
          '<p>We sponsor shows, sales, and benefit events across Kentucky and beyond. ' +
          'Check back soon, or <a href="contact.html">get in touch</a> about sponsoring yours.</p>' +
        '</div></div>';
    } else {
      upcomingWrap.innerHTML = upcoming.map(function (evt) {
        return '<div class="col-md-6 col-lg-4 d-flex">' + eventCard(evt, false) + '</div>';
      }).join('');
    }

    if (past.length && pastWrap && pastSection) {
      pastWrap.innerHTML = past.map(function (evt) {
        return '<div class="col-md-6 col-lg-4 d-flex">' + eventCard(evt, true) + '</div>';
      }).join('');
      pastSection.hidden = false;
    }
  }

  /* ---------- gallery ---------- */

  var photoItems = [];   // photos only, in render order — drives the lightbox

  function galleryMeta(item) {
    var bits = [];
    if (item.event) bits.push('<span class="gal-tag"><i class="fas fa-award"></i>' + esc(item.event) + '</span>');
    if (item.date)  bits.push('<span class="gal-date">' + formatShort(item.date) + '</span>');
    return bits.length ? '<div class="gal-meta">' + bits.join('') + '</div>' : '';
  }

  function photoCard(item, photoIndex) {
    return '' +
      '<figure class="gal-card gal-photo" data-photo-index="' + photoIndex + '" tabindex="0" role="button" ' +
        'aria-label="Enlarge photo' + (item.caption ? ': ' + esc(item.caption) : '') + '">' +
        '<div class="gal-photo-frame">' +
          '<img src="' + esc(item.src) + '" alt="' + esc(item.caption || 'Bluegrass Bedding in use') + '" loading="lazy">' +
          '<span class="gal-zoom"><i class="fas fa-expand"></i></span>' +
        '</div>' +
        (item.caption || item.credit || item.event || item.date ?
          '<figcaption class="gal-body">' +
            (item.caption ? '<p class="gal-caption">' + esc(item.caption) + '</p>' : '') +
            (item.credit ? '<p class="gal-credit">' + esc(item.credit) + '</p>' : '') +
            galleryMeta(item) +
          '</figcaption>' : '') +
      '</figure>';
  }

  function instagramCard(item) {
    var url = item.url.trim().split('?')[0];
    if (url.charAt(url.length - 1) !== '/') url += '/';
    return '' +
      '<div class="gal-card gal-social">' +
        '<div class="gal-embed">' +
          '<blockquote class="instagram-media" data-instgrm-captioned ' +
            'data-instgrm-permalink="' + esc(url) + '" data-instgrm-version="14" ' +
            'style="background:#FFF;border:0;margin:0;padding:0;width:100%;">' +
            '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">View this post on Instagram</a>' +
          '</blockquote>' +
        '</div>' +
        '<div class="gal-body">' +
          (item.caption ? '<p class="gal-caption">' + esc(item.caption) + '</p>' : '') +
          '<a class="gal-source" href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' +
            '<i class="fab fa-instagram"></i>View on Instagram</a>' +
          galleryMeta(item) +
        '</div>' +
      '</div>';
  }

  function facebookCard(item) {
    var height = parseInt(item.height, 10);
    if (!height || height < 200 || height > 1400) height = 560;
    return '' +
      '<div class="gal-card gal-social">' +
        '<div class="gal-embed gal-fb" data-fb-href="' + esc(item.url.trim()) + '" data-fb-height="' + height + '" ' +
          'style="height:' + height + 'px;"></div>' +
        '<div class="gal-body">' +
          (item.caption ? '<p class="gal-caption">' + esc(item.caption) + '</p>' : '') +
          '<a class="gal-source" href="' + esc(item.url.trim()) + '" target="_blank" rel="noopener noreferrer">' +
            '<i class="fab fa-facebook"></i>View on Facebook</a>' +
          galleryMeta(item) +
        '</div>' +
      '</div>';
  }

  // Facebook's plugin renders at a fixed pixel width, so it has to be told
  // the column width. Measured once the grid is laid out, and again on resize.
  function sizeFacebookEmbeds() {
    var frames = document.querySelectorAll('.gal-fb');
    if (!frames.length) return;
    var width = Math.round(frames[0].getBoundingClientRect().width);
    if (!width) return;
    width = Math.max(180, Math.min(500, width));

    Array.prototype.forEach.call(frames, function (frame) {
      if (frame.getAttribute('data-fb-width') === String(width)) return;
      frame.setAttribute('data-fb-width', String(width));
      var src = 'https://www.facebook.com/plugins/post.php?href=' +
        encodeURIComponent(frame.getAttribute('data-fb-href')) +
        '&show_text=true&width=' + width + '&height=' + frame.getAttribute('data-fb-height');
      frame.innerHTML = '<iframe src="' + esc(src) + '" width="' + width + '" ' +
        'height="' + esc(frame.getAttribute('data-fb-height')) + '" style="border:none;overflow:hidden;" ' +
        'scrolling="no" frameborder="0" allowfullscreen="true" loading="lazy" ' +
        'allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" ' +
        'title="Facebook post"></iframe>';
    });
  }

  var instagramScriptLoaded = false;
  function processInstagramEmbeds() {
    if (!document.querySelector('.instagram-media')) return;
    if (window.instgrm && window.instgrm.Embeds) {
      window.instgrm.Embeds.process();
      return;
    }
    if (instagramScriptLoaded) return;
    instagramScriptLoaded = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.instagram.com/embed.js';
    document.body.appendChild(script);
  }

  function renderGallery(filter) {
    var grid = document.getElementById('bb-gallery-grid');
    if (!grid) return;

    var visible = gallery.filter(function (item) {
      if (!item || !item.type) return false;
      if (item.type === 'photo' && !item.src) return false;
      if ((item.type === 'instagram' || item.type === 'facebook') && !isHttpUrl(item.url)) return false;
      if (filter === 'photo')  return item.type === 'photo';
      if (filter === 'social') return item.type === 'instagram' || item.type === 'facebook';
      return true;
    });

    // Newest first; entries without a date keep their order at the end.
    visible.sort(function (a, b) {
      var da = parseDate(a.date), db = parseDate(b.date);
      if (da && db) return db - da;
      if (da) return -1;
      if (db) return 1;
      return 0;
    });

    photoItems = [];
    if (!visible.length) {
      grid.innerHTML =
        '<div class="bb-empty">' +
          '<i class="fas fa-camera-retro"></i>' +
          '<h4>' + (gallery.length ? 'Nothing here yet under that filter' : 'The gallery is filling up') + '</h4>' +
          '<p>Horses on Bluegrass Bedding, straight from the barn aisle. ' +
          'Send us your photos and we\'ll feature them here.</p>' +
        '</div>';
      return;
    }

    grid.innerHTML = visible.map(function (item) {
      if (item.type === 'photo') {
        photoItems.push(item);
        return photoCard(item, photoItems.length - 1);
      }
      if (item.type === 'instagram') return instagramCard(item);
      if (item.type === 'facebook')  return facebookCard(item);
      return '';
    }).join('');

    sizeFacebookEmbeds();
    processInstagramEmbeds();
  }

  function setupFilters() {
    var bar = document.getElementById('bb-gallery-filters');
    if (!bar) return;

    var hasPhoto  = gallery.some(function (i) { return i && i.type === 'photo'; });
    var hasSocial = gallery.some(function (i) { return i && (i.type === 'instagram' || i.type === 'facebook'); });

    // Only worth showing the filter bar when there is a real mix to filter.
    if (!hasPhoto || !hasSocial) { bar.hidden = true; return; }
    bar.hidden = false;

    bar.addEventListener('click', function (e) {
      var btn = e.target.closest('.gal-filter');
      if (!btn || !bar.contains(btn)) return;
      Array.prototype.forEach.call(bar.querySelectorAll('.gal-filter'), function (b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
      });
      renderGallery(btn.getAttribute('data-filter'));
    });
  }

  /* ---------- lightbox ---------- */

  function setupLightbox() {
    var box = document.getElementById('bb-lightbox');
    var grid = document.getElementById('bb-gallery-grid');
    if (!box || !grid) return;

    var imgEl     = box.querySelector('.lb-img');
    var captionEl = box.querySelector('.lb-caption');
    var creditEl  = box.querySelector('.lb-credit');
    var current   = 0;
    var lastFocus = null;

    function show(index) {
      if (!photoItems.length) return;
      current = (index + photoItems.length) % photoItems.length;
      var item = photoItems[current];
      imgEl.src = item.src;
      imgEl.alt = item.caption || 'Bluegrass Bedding in use';
      captionEl.textContent = item.caption || '';
      captionEl.hidden = !item.caption;
      var credit = [item.credit, item.event, item.date ? formatShort(item.date) : ''].filter(Boolean).join('  ·  ');
      creditEl.textContent = credit;
      creditEl.hidden = !credit;
      box.querySelector('.lb-count').textContent = (current + 1) + ' / ' + photoItems.length;
      box.querySelectorAll('.lb-nav').forEach(function (b) { b.hidden = photoItems.length < 2; });
    }

    function open(index, trigger) {
      lastFocus = trigger || null;
      show(index);
      box.hidden = false;
      document.body.classList.add('lb-open');
      box.querySelector('.lb-close').focus();
    }

    function close() {
      box.hidden = true;
      document.body.classList.remove('lb-open');
      imgEl.removeAttribute('src');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    grid.addEventListener('click', function (e) {
      var card = e.target.closest('.gal-photo');
      if (card) open(parseInt(card.getAttribute('data-photo-index'), 10) || 0, card);
    });

    grid.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var card = e.target.closest('.gal-photo');
      if (!card) return;
      e.preventDefault();
      open(parseInt(card.getAttribute('data-photo-index'), 10) || 0, card);
    });

    box.addEventListener('click', function (e) {
      if (e.target.closest('.lb-close') || e.target === box || e.target.classList.contains('lb-stage')) return close();
      var nav = e.target.closest('.lb-nav');
      if (nav) show(current + (nav.getAttribute('data-dir') === 'next' ? 1 : -1));
    });

    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(current + 1);
      else if (e.key === 'ArrowLeft') show(current - 1);
    });
  }

  /* ---------- social CTA ---------- */

  function renderSocialCta() {
    var wrap = document.getElementById('bb-social-cta');
    if (!wrap) return;
    var buttons = [];
    if (isHttpUrl(social.instagram)) {
      buttons.push('<a class="btn-outline-white" href="' + esc(social.instagram) + '" target="_blank" rel="noopener noreferrer">' +
        '<i class="fab fa-instagram me-2"></i>Instagram</a>');
    }
    if (isHttpUrl(social.facebook)) {
      buttons.push('<a class="btn-outline-white" href="' + esc(social.facebook) + '" target="_blank" rel="noopener noreferrer">' +
        '<i class="fab fa-facebook me-2"></i>Facebook</a>');
    }
    if (social.email) {
      buttons.push('<a class="btn-primary-gold" href="mailto:' + esc(social.email) +
        '?subject=' + encodeURIComponent('Photo for the Bluegrass Bedding gallery') + '">Send Us a Photo</a>');
    }
    wrap.innerHTML = buttons.join('');
  }

  /* ---------- boot ---------- */

  function init() {
    renderEvents();
    setupFilters();
    setupLightbox();
    renderGallery('all');
    renderSocialCta();

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sizeFacebookEmbeds, 250);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
