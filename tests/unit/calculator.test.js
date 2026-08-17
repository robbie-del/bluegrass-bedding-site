/**
 * The straw-vs-shavings cost calculator.
 *
 * These figures are public savings claims, so the arithmetic is pinned here
 * rather than just smoke-tested. Constants under test (see AGENTS.md):
 *   30-day month · $45 per 8 yd³ dumpster haul · 75 muck tubs per haul
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPage, setValue, money } from './helpers/load-page.js';

const DAYS = 30;
const DUMP_COST = 45;
const TUBS_PER_DUMP = 75;
const COST_PER_TUB = DUMP_COST / TUBS_PER_DUMP;

let document;
let window;

beforeEach(() => {
  ({ document, window } = loadPage('straw-vs-shavings.html'));
});

const $ = (id) => document.getElementById(id);
const text = (id) => $(id).textContent;

/** Reproduce the page's own model, independently, for cross-checking. */
function expectedBarnMonthly({ init, day, price, stalls, includeDump = false }) {
  const dumpDay = includeDump ? day * COST_PER_TUB : 0;
  const perStallMonthly = (day * price + dumpDay) * DAYS;
  return perStallMonthly * stalls + init * price * stalls;
}

describe('defaults', () => {
  it('starts at the documented 20-stall barn', () => {
    expect($('sStalls').value).toBe('20');
    expect(text('vStalls')).toContain('20');
  });

  it('computes the pine total from the default inputs', () => {
    // 5 bags bed-down, 1 bag/day, $7.50/bag, 20 stalls
    const expected = expectedBarnMonthly({ init: 5, day: 1, price: 7.5, stalls: 20 });
    expect(money(text('pMon'))).toBe(Math.round(expected));
  });

  it('computes the straw total from the default inputs', () => {
    // 4 bales bed-down, 1 bale/day, $10.00/bale, 20 stalls
    const expected = expectedBarnMonthly({ init: 4, day: 1, price: 10, stalls: 20 });
    expect(money(text('sMon'))).toBe(Math.round(expected));
  });

  it('shows pine cheaper than straw out of the box', () => {
    expect(money(text('pMon'))).toBeLessThan(money(text('sMon')));
    expect(text('savH')).toBe('You Save with Bluegrass Bedding');
  });

  it('reports savings equal to the difference between the two totals', () => {
    const diff = money(text('sMon')) - money(text('pMon'));
    expect(money(text('savV'))).toBe(diff);
  });
});

describe('per-stall figures', () => {
  it('derives daily and monthly per-stall cost from usage and price', () => {
    expect(money(text('pPsDay'))).toBeCloseTo(1 * 7.5, 2);
    expect(money(text('pPsMon'))).toBeCloseTo(1 * 7.5 * DAYS, 2);
  });

  it('counts total units as usage x stalls x 30 days', () => {
    expect(text('pUnits')).toBe(`${(1 * 20 * DAYS).toLocaleString('en-US')} bags`);
    expect(text('sUnits')).toBe(`${(1 * 20 * DAYS).toLocaleString('en-US')} bales`);
  });

  it('charges the bed-down once per stall, not per day', () => {
    expect(money(text('pInitCost'))).toBe(Math.round(5 * 7.5 * 20));
  });
});

describe('reacting to input', () => {
  it('scales the barn total linearly with stall count', () => {
    const before = money(text('pMon'));
    setValue($('sStalls'), 40);
    expect(money(text('pMon'))).toBe(before * 2);
  });

  it('updates the stall label and pluralises it', () => {
    setValue($('sStalls'), 1);
    expect(text('vStalls')).toContain('1');
    expect($('vStalls').innerHTML).toContain('stall<');
    expect($('vStalls').innerHTML).not.toContain('stalls');

    setValue($('sStalls'), 2);
    expect($('vStalls').innerHTML).toContain('stalls');
  });

  it('pluralises bags and bales independently', () => {
    setValue($('pInit'), 1);
    expect($('vpInit').innerHTML).toContain('bag<');
    setValue($('pInit'), 3);
    expect($('vpInit').innerHTML).toContain('bags');

    setValue($('sInit'), 1);
    expect($('vsInit').innerHTML).toContain('bale<');
    setValue($('sInit'), 3);
    expect($('vsInit').innerHTML).toContain('bales');
  });

  it('recomputes when the pine price changes', () => {
    setValue($('pPrice'), 15);
    const expected = expectedBarnMonthly({ init: 5, day: 1, price: 15, stalls: 20 });
    expect(money(text('pMon'))).toBe(Math.round(expected));
  });

  it('recomputes when daily usage changes', () => {
    setValue($('pDay'), 2);
    const expected = expectedBarnMonthly({ init: 5, day: 2, price: 7.5, stalls: 20 });
    expect(money(text('pMon'))).toBe(Math.round(expected));
  });

  it('treats a blank or negative price as zero rather than NaN', () => {
    setValue($('pPrice'), '');
    expect(text('pMon')).not.toContain('NaN');
    expect(money(text('pMon'))).toBe(0);

    setValue($('pPrice'), -5);
    expect(money(text('pMon'))).toBe(0);
  });

  it('never renders NaN for non-numeric price input', () => {
    setValue($('sPrice'), 'abc');
    expect(text('sMon')).not.toContain('NaN');
    expect(text('savV')).not.toContain('NaN');
  });
});

describe('waste-removal toggle', () => {
  const toggle = () => {
    $('pDump').checked = true;
    $('pDump').dispatchEvent(new window.Event('change', { bubbles: true }));
  };

  it('is off by default and excludes dumpster cost', () => {
    expect($('pDump').checked).toBe(false);
    expect(text('pMonSub')).toBe('ongoing + initial bed-down');
  });

  it('adds the per-tub haul cost to the pine total when enabled', () => {
    const before = money(text('pMon'));
    toggle();
    const after = money(text('pMon'));
    expect(after).toBeGreaterThan(before);

    const expected = expectedBarnMonthly({
      init: 5, day: 1, price: 7.5, stalls: 20, includeDump: true,
    });
    expect(after).toBe(Math.round(expected));
  });

  it('adds exactly $45 per 75 muck tubs', () => {
    const before = money(text('pMon'));
    toggle();
    // 1 bag/day x 20 stalls x 30 days = 600 tubs = 8 hauls = $360
    expect(money(text('pMon')) - before).toBe(Math.round(600 * COST_PER_TUB));
  });

  it('notes the tub and haul counts, and that straw disposal is excluded', () => {
    toggle();
    const note = text('pDumpNote');
    expect(note).toContain('600');
    expect(note).toContain('8.0');
    expect(note).toContain('$45');
    expect(note.toLowerCase()).toContain('straw waste removal is handled separately');
  });

  it('leaves the straw total untouched', () => {
    const before = money(text('sMon'));
    toggle();
    expect(money(text('sMon'))).toBe(before);
  });

  it('mentions the dumpster in the pine subtitle', () => {
    toggle();
    expect(text('pMonSub')).toBe('ongoing + initial bed-down + dumpster');
  });
});

describe('savings panel', () => {
  it('annualises the monthly saving and states a percentage', () => {
    const monthly = money(text('savV'));
    expect($('savS').innerHTML).toContain(
      `$${(monthly * 12).toLocaleString('en-US')}`,
    );
    expect($('savS').innerHTML).toMatch(/\d+% less/);
  });

  it('flips to a "pine costs more" state when pine is priced above straw', () => {
    setValue($('pPrice'), 50);
    expect($('savings').className).toContain('flip');
    expect(text('savH')).toBe('Pine Costs More With These Inputs');
    expect($('savS').textContent).toContain('Adjust the inputs');
  });

  it('reports the shortfall as a positive number when pine costs more', () => {
    setValue($('pPrice'), 50);
    // Rendered as "$4,000 / month more" — take the figure ahead of the suffix.
    expect(money($('savV').textContent.split('/')[0])).toBeGreaterThan(0);
    expect($('savV').textContent).toContain('/ month more');
  });

  it('flips back when the inputs make pine cheaper again', () => {
    setValue($('pPrice'), 50);
    expect($('savings').className).toContain('flip');
    setValue($('pPrice'), 7.5);
    expect($('savings').className).not.toContain('flip');
    expect(text('savH')).toBe('You Save with Bluegrass Bedding');
  });

  it('does not divide by zero when straw is free', () => {
    setValue($('sPrice'), 0);
    expect(text('savV')).not.toContain('NaN');
    expect($('savS').innerHTML).not.toContain('NaN');
  });
});

describe('slider fill', () => {
  it('sets the fill percentage custom property from the value', () => {
    setValue($('sStalls'), 100); // min 1, max 100 -> 100%
    expect($('sStalls').style.getPropertyValue('--pct')).toBe('100%');
    setValue($('sStalls'), 1);
    expect($('sStalls').style.getPropertyValue('--pct')).toBe('0%');
  });
});

describe('structured data', () => {
  it('ships valid JSON-LD', () => {
    const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
    expect(blocks.length).toBeGreaterThan(0);
    for (const block of blocks) {
      expect(() => JSON.parse(block.textContent)).not.toThrow();
    }
  });

  it('declares the calculator, the organization, and an FAQ page', () => {
    const types = document
      .querySelectorAll('script[type="application/ld+json"]')
      .values()
      .flatMap((b) => {
        const parsed = JSON.parse(b.textContent);
        return Array.isArray(parsed) ? parsed : [parsed];
      })
      .map((entry) => entry['@type'])
      .toArray();
    expect(types).toContain('WebApplication');
    expect(types).toContain('Organization');
    expect(types).toContain('FAQPage');
  });
});
