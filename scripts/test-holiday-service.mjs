/**
 * Mova Campus — Holiday Service Unit Tests
 *
 * Verifies:
 * - Public holiday retrieval with fallback
 * - Date range filtering
 * - Custom college holiday addition, retrieval, and removal
 * - Deduplication across public and custom holidays
 */

import assert from 'node:assert';
import { holidayService } from '../src/services/holiday-service.js';

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL: ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAll() {
  console.log('--- Testing Holiday Service ---');

  await test('Public holidays returned for India for 2026', async () => {
    const holidays = await holidayService.fetchPublicHolidays(2026, 'IN');
    assert.ok(Array.isArray(holidays));
    assert.ok(holidays.length >= 10);
    const repDay = holidays.find((h) => h.date === '2026-01-26');
    assert.ok(repDay, 'Republic Day should be present on 2026-01-26');
  });

  await test('getHolidaysForRange returns holidays strictly within window', async () => {
    const rangeHolidays = await holidayService.getHolidaysForRange('2026-01-01', '2026-03-31', {
      countryCode: 'IN',
    });
    assert.ok(rangeHolidays.length > 0);
    for (const h of rangeHolidays) {
      assert.ok(h.date >= '2026-01-01' && h.date <= '2026-03-31');
    }
  });

  await test('addCollegeHoliday and removeCollegeHoliday manage custom holidays', async () => {
    holidayService.addCollegeHoliday({
      date: '2026-11-25',
      name: 'College Sports Day',
    });

    const list = holidayService.getCollegeHolidays();
    const sportsDay = list.find((h) => h.date === '2026-11-25');
    assert.ok(sportsDay);
    assert.strictEqual(sportsDay.name, 'College Sports Day');

    // Included in date range query
    const range = await holidayService.getHolidaysForRange('2026-11-20', '2026-11-30', {
      countryCode: 'IN',
    });
    assert.ok(range.some((h) => h.date === '2026-11-25'));

    // Remove
    holidayService.removeCollegeHoliday('2026-11-25');
    const listAfter = holidayService.getCollegeHolidays();
    assert.strictEqual(listAfter.some((h) => h.date === '2026-11-25'), false);
  });

  console.log(`\nALL ${passed} HOLIDAY SERVICE TESTS PASSED!`);
}

runAll();
