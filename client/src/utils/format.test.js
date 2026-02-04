import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DateTime, Settings } from 'luxon';
import {
    formatAddress,
    formatTimeRemaining,
    formatTimeUntil,
    formatTime,
    formatCreatedAt,
    calculateAge,
    formatDob,
    formatInputDob,
    formatDateTime,
} from './format';

describe('format utils', () => {
    // Mock system time for deterministic tests
    const MOCK_NOW = '2023-05-15T12:00:00.000Z';

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(MOCK_NOW));
        // Also set Luxon's default zone to ensure consistent local time formatting if needed
        // Assuming the app runs in specific timezone or we want to test relative logic primarily
        Settings.defaultZone = 'UTC';
    });

    afterEach(() => {
        vi.useRealTimers();
        Settings.defaultZone = 'system';
    });

    describe('formatAddress', () => {
        it('formats a complete address correctly', () => {
            const address = {
                addressLine1: '123 Main St',
                addressLine2: 'Apt 4B',
                city: 'Metropolis',
                state: 'NY',
                postalCode: '10001',
            };
            expect(formatAddress(address)).toBe('123 Main St, Apt 4B, Metropolis, NY 10001');
        });

        it('handles missing optional fields', () => {
            const address = {
                addressLine1: '123 Main St',
                city: 'Metropolis',
                state: 'NY',
            };
            expect(formatAddress(address)).toBe('123 Main St, Metropolis, NY');
        });

        it('handles minimal address', () => {
            const address = {
                addressLine1: '123 Main St',
            };
            expect(formatAddress(address)).toBe('123 Main St');
        });

        it('returns empty string components if addressLine1 is missing', () => {
            // Though typically addressLine1 is required, checking robustness
            expect(formatAddress({})).toBe('');
        });
    });

    describe('formatTimeRemaining', () => {
        it('returns "Expired" when time has passed', () => {
            // 1 minute ago
            const expiresAt = DateTime.now().minus({ minutes: 1 }).toISO();
            expect(formatTimeRemaining(expiresAt)).toBe('Expired');
        });

        it('returns "Expired" when time is exactly now', () => {
            // Exact same time (or very close) - considering < now check
            // If code uses < now, exact equality might technically not be "Expired" depending on ms,
            // but let's test slightly past.
            const expiresAt = DateTime.now().minus({ milliseconds: 1 }).toISO();
            expect(formatTimeRemaining(expiresAt)).toBe('Expired');
        });

        it('formats remaining time correctly (hours and minutes)', () => {
            // 1 hour and 30 minutes from now
            const expiresAt = DateTime.now().plus({ hours: 1, minutes: 30 }).toISO();
            // Expected logic: expires.diff(now, ['hours', 'minutes']).toFormat('h:mm')
            // 1 hour 30 mins -> "1:30"
            expect(formatTimeRemaining(expiresAt)).toBe('1:30');
        });

        it('formats remaining time correctly (minutes only)', () => {
            // 45 minutes from now
            const expiresAt = DateTime.now().plus({ minutes: 45 }).toISO();
            // 0 hours, 45 mins -> "0:45"
            expect(formatTimeRemaining(expiresAt)).toBe('0:45');
        });

        it('formats remaining time correctly (single digit minutes)', () => {
            // 1 hour and 5 minutes from now
            const expiresAt = DateTime.now().plus({ hours: 1, minutes: 5 }).toISO();
            // 1 hour 05 mins -> "1:05"
            expect(formatTimeRemaining(expiresAt)).toBe('1:05');
        });
    });

    describe('formatTimeUntil', () => {
        it('formats with "Until" prefix', () => {
            const expiresAt = DateTime.now().plus({ hours: 2 }).toISO();
            // 12:00 + 2h = 14:00 -> 2:00 PM (using default locale usually, but we set UTC)
            // Luxon toLocaleString(DateTime.TIME_SIMPLE) output depends on locale.
            // With UTC, 14:00 is 2:00 PM.
            const result = formatTimeUntil(expiresAt);
            expect(result).toMatch(/^Until \d{1,2}:\d{2}\s?[AP]M$/);
        });
    });

    describe('formatTime', () => {
        it('formats time string correctly', () => {
            const date = '2023-05-15T14:30:00.000Z';
            // Should be 2:30 PM
            const result = formatTime(date);
            // Matching generic time format to avoid locale strictness issues in test environment
            expect(result).toMatch(/2:30\s?PM/);
        });
    });

    describe('formatCreatedAt', () => {
        it('formats relative time', () => {
            const createdAt = DateTime.now().minus({ hours: 2 }).toISO();
            expect(formatCreatedAt(createdAt)).toBe('2 hours ago'); // "2 hours ago"
        });
    });

    describe('calculateAge', () => {
        it('calculates correct age', () => {
            // Born 20 years ago
            const dob = DateTime.now().minus({ years: 20 }).toISODate();
            expect(calculateAge(dob)).toBe(20);
        });

        it('calculates age taking months into account (not yet birthday)', () => {
            // Born 20 years ago, but next month (so actually 19)
            const dob = DateTime.now().minus({ years: 20 }).plus({ months: 1 }).toISODate();
            expect(calculateAge(dob)).toBe(19);
        });

        it('returns null for missing dob', () => {
            expect(calculateAge(null)).toBeNull();
        });
    });

    describe('formatDob', () => {
        it('formats date of birth', () => {
            const dob = '1990-01-01';
            // DATE_SHORT usually M/d/yyyy or similar depending on locale
            const result = formatDob(dob);
            expect(result).toMatch(/1\/1\/1990|01\/01\/1990/);
        });

        it('returns null for missing dob', () => {
            expect(formatDob(null)).toBeNull();
        });
    });

    describe('formatInputDob', () => {
        it('formats empty value', () => {
            expect(formatInputDob('')).toBe('');
            expect(formatInputDob(null)).toBe('');
        });

        it('removes non-digit characters', () => {
            expect(formatInputDob('12a34')).toBe('12/34');
        });

        it('formats partial dates (month)', () => {
            expect(formatInputDob('1')).toBe('1');
            expect(formatInputDob('12')).toBe('12');
        });

        it('formats partial dates (day)', () => {
            expect(formatInputDob('123')).toBe('12/3');
            expect(formatInputDob('1234')).toBe('12/34');
        });

        it('formats complete dates', () => {
            expect(formatInputDob('12345678')).toBe('12/34/5678');
        });

        it('truncates extra characters', () => {
            expect(formatInputDob('123456789')).toBe('12/34/5678');
        });
    });

    describe('formatDateTime', () => {
        it('formats date and time', () => {
            const date = '2023-05-15T14:30:00.000Z';
            const result = formatDateTime(date);
            // Expect something like "5/15/2023, 2:30 PM"
            expect(result).toMatch(/5\/15\/2023, 2:30\s?PM/);
        });

        it('returns TBD for null date', () => {
            expect(formatDateTime(null)).toBe('TBD');
        });
    });
});
