/**
 * Mova Campus — Holiday Service
 *
 * Provides national and state public holidays for future attendance predictions.
 * - Integrates with Nager.Date API (free, open, no auth required).
 * - Includes robust built-in fallback calendar for India (2025–2027) so predictions
 *   work reliably offline or during network constraints.
 * - Supports adding and managing custom college-specific holidays.
 * - Caches holiday lists in-memory for instant response.
 */

import { logger } from '../utils/logger.js';

// Built-in Indian National Gazetted Holidays (Fallback & Baseline)
const BUILT_IN_HOLIDAYS_IN = [
  // 2025
  { date: '2025-01-26', name: 'Republic Day', type: 'national' },
  { date: '2025-03-14', name: 'Holi', type: 'national' },
  { date: '2025-03-31', name: 'Eid-ul-Fitr', type: 'national' },
  { date: '2025-04-18', name: 'Good Friday', type: 'national' },
  { date: '2025-05-12', name: 'Buddha Purnima', type: 'national' },
  { date: '2025-06-07', name: 'Bakrid / Eid-ul-Adha', type: 'national' },
  { date: '2025-08-15', name: 'Independence Day', type: 'national' },
  { date: '2025-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national' },
  { date: '2025-10-21', name: 'Dussehra', type: 'national' },
  { date: '2025-11-01', name: 'Diwali', type: 'national' },
  { date: '2025-11-05', name: 'Guru Nanak Jayanti', type: 'national' },
  { date: '2025-12-25', name: 'Christmas Day', type: 'national' },

  // 2026
  { date: '2026-01-26', name: 'Republic Day', type: 'national' },
  { date: '2026-02-15', name: 'Maha Shivratri', type: 'national' },
  { date: '2026-03-04', name: 'Holi', type: 'national' },
  { date: '2026-03-21', name: 'Eid-ul-Fitr', type: 'national' },
  { date: '2026-03-31', name: 'Mahavir Jayanti', type: 'national' },
  { date: '2026-04-03', name: 'Good Friday', type: 'national' },
  { date: '2026-05-01', name: 'Buddha Purnima', type: 'national' },
  { date: '2026-05-27', name: 'Bakrid / Eid-ul-Adha', type: 'national' },
  { date: '2026-06-26', name: 'Muharram', type: 'national' },
  { date: '2026-08-15', name: 'Independence Day', type: 'national' },
  { date: '2026-08-26', name: 'Milad-un-Nabi', type: 'national' },
  { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national' },
  { date: '2026-10-20', name: 'Dussehra', type: 'national' },
  { date: '2026-11-08', name: 'Diwali', type: 'national' },
  { date: '2026-11-24', name: 'Guru Nanak Jayanti', type: 'national' },
  { date: '2026-12-25', name: 'Christmas Day', type: 'national' },

  // 2027
  { date: '2027-01-26', name: 'Republic Day', type: 'national' },
  { date: '2027-03-10', name: 'Eid-ul-Fitr', type: 'national' },
  { date: '2027-03-22', name: 'Holi', type: 'national' },
  { date: '2027-03-26', name: 'Good Friday', type: 'national' },
  { date: '2027-05-17', name: 'Bakrid / Eid-ul-Adha', type: 'national' },
  { date: '2027-08-15', name: 'Independence Day', type: 'national' },
  { date: '2027-10-02', name: 'Mahatma Gandhi Jayanti', type: 'national' },
  { date: '2027-10-29', name: 'Diwali', type: 'national' },
  { date: '2027-12-25', name: 'Christmas Day', type: 'national' },
];

class HolidayService {
  constructor() {
    this.cache = new Map();
    this.collegeHolidays = [];
  }

  /**
   * Fetches public holidays for a given year and country code.
   *
   * @param {number} year
   * @param {string} [countryCode='IN']
   * @returns {Promise<Array<{ date: string, name: string, type: string }>>}
   */
  async fetchPublicHolidays(year, countryCode = 'IN') {
    const key = `${countryCode}-${year}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    // Try fetching from Nager.Date API
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 4000) : null;

      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
        { signal: controller?.signal }
      );

      if (timeoutId) clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map((item) => ({
            date: item.date,
            name: item.localName || item.name,
            type: 'public',
            countryCode,
          }));
          this.cache.set(key, formatted);
          return formatted;
        }
      }
    } catch (err) {
      logger.info(`Online holiday fetch failed for ${key}, using built-in calendar fallback.`);
    }

    // Built-in fallback
    const fallback = BUILT_IN_HOLIDAYS_IN.filter((h) => h.date.startsWith(String(year)));
    this.cache.set(key, fallback);
    return fallback;
  }

  /**
   * Returns all holidays (public + college-specific) in a date range [startDate, endDate].
   *
   * @param {string} startDate - YYYY-MM-DD
   * @param {string} endDate   - YYYY-MM-DD
   * @param {object} [options]
   * @param {string} [options.countryCode='IN']
   * @param {Array<object>} [options.customHolidays=[]]
   * @returns {Promise<Array<{ date: string, name: string, type: string }>>}
   */
  async getHolidaysForRange(startDate, endDate, options = {}) {
    if (!startDate || !endDate || startDate > endDate) return [];

    const countryCode = options.countryCode || 'IN';
    const startYear = parseInt(startDate.slice(0, 4), 10);
    const endYear = parseInt(endDate.slice(0, 4), 10);

    const holidayList = [];

    for (let year = startYear; year <= endYear; year++) {
      const yearHolidays = await this.fetchPublicHolidays(year, countryCode);
      holidayList.push(...yearHolidays);
    }

    // Include instance college holidays & passed custom holidays
    const allCustom = [...this.collegeHolidays, ...(options.customHolidays || [])];
    holidayList.push(...allCustom);

    // Filter within [startDate, endDate] and deduplicate by date
    const dateMap = new Map();
    for (const h of holidayList) {
      if (h.date >= startDate && h.date <= endDate) {
        if (!dateMap.has(h.date)) {
          dateMap.set(h.date, h);
        }
      }
    }

    return Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Adds a college-specific holiday.
   *
   * @param {{ date: string, name: string }} holiday
   */
  addCollegeHoliday(holiday) {
    if (!holiday || !holiday.date) return;
    this.removeCollegeHoliday(holiday.date);
    this.collegeHolidays.push({
      date: holiday.date,
      name: holiday.name || 'College Holiday',
      type: 'college',
    });
  }

  /**
   * Removes a college-specific holiday by date.
   *
   * @param {string} date
   */
  removeCollegeHoliday(date) {
    this.collegeHolidays = this.collegeHolidays.filter((h) => h.date !== date);
  }

  /**
   * Returns all configured college-specific holidays.
   */
  getCollegeHolidays() {
    return [...this.collegeHolidays];
  }

  /**
   * Sets the list of college holidays (e.g. from local storage).
   */
  setCollegeHolidays(holidays = []) {
    this.collegeHolidays = Array.isArray(holidays) ? [...holidays] : [];
  }
}

export const holidayService = new HolidayService();
