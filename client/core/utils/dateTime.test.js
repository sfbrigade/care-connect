import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatTimeRemaining, formatTimeUntil, formatTime, formatCreatedAt } from './dateTime.js';

describe('dateTime utilities', () => {
  describe('formatTimeRemaining', () => {
    it('should return "Expired" for past dates', () => {
      const pastDate = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
      expect(formatTimeRemaining(pastDate)).toBe('Expired');
    });

    it('should format minutes correctly for less than 60 minutes', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 45); // 45 minutes from now
      const result = formatTimeRemaining(futureDate);
      expect(result).toMatch(/^\d+ mins$/);
      expect(result).toBe('45 mins');
    });

    it('should format hours and minutes correctly', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 150); // 2.5 hours from now
      const result = formatTimeRemaining(futureDate);
      expect(result).toBe('2h 30m');
    });

    it('should handle string dates', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 30).toISOString();
      const result = formatTimeRemaining(futureDate);
      expect(result).toMatch(/^\d+ mins$/);
    });
  });

  describe('formatTimeUntil', () => {
    it('should format time with "Until" prefix', () => {
      const date = new Date('2024-01-15T15:45:00');
      const result = formatTimeUntil(date);
      expect(result).toMatch(/^Until \d{1,2}:\d{2} (AM|PM)$/);
      expect(result).toBe('Until 3:45 PM');
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2024-01-15T00:00:00');
      const result = formatTimeUntil(date);
      expect(result).toBe('Until 12:00 AM');
    });

    it('should handle noon correctly', () => {
      const date = new Date('2024-01-15T12:00:00');
      const result = formatTimeUntil(date);
      expect(result).toBe('Until 12:00 PM');
    });

    it('should handle single digit minutes with padding', () => {
      const date = new Date('2024-01-15T09:05:00');
      const result = formatTimeUntil(date);
      expect(result).toBe('Until 9:05 AM');
    });

    it('should handle string dates', () => {
      const date = new Date('2024-01-15T14:30:00').toISOString();
      const result = formatTimeUntil(date);
      expect(result).toBe('Until 2:30 PM');
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      const date = new Date('2024-01-15T15:45:00');
      expect(formatTime(date)).toBe('3:45 PM');
    });

    it('should handle AM times correctly', () => {
      const date = new Date('2024-01-15T09:30:00');
      expect(formatTime(date)).toBe('9:30 AM');
    });

    it('should handle midnight correctly', () => {
      const date = new Date('2024-01-15T00:00:00');
      expect(formatTime(date)).toBe('12:00 AM');
    });

    it('should handle noon correctly', () => {
      const date = new Date('2024-01-15T12:00:00');
      expect(formatTime(date)).toBe('12:00 PM');
    });

    it('should handle string dates', () => {
      const date = new Date('2024-01-15T14:15:00').toISOString();
      expect(formatTime(date)).toBe('2:15 PM');
    });
  });

  describe('formatCreatedAt', () => {
    beforeEach(() => {
      // Mock Date.now() to have consistent test results
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for very recent dates', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);
      const recent = new Date('2024-01-15T12:00:00');
      expect(formatCreatedAt(recent)).toBe('Just now');
    });

    it('should format minutes ago correctly', () => {
      const now = new Date('2024-01-15T12:30:00');
      vi.setSystemTime(now);
      const past = new Date('2024-01-15T12:15:00');
      expect(formatCreatedAt(past)).toBe('15 minutes ago');
    });

    it('should format single minute correctly', () => {
      const now = new Date('2024-01-15T12:01:00');
      vi.setSystemTime(now);
      const past = new Date('2024-01-15T12:00:00');
      expect(formatCreatedAt(past)).toBe('1 minute ago');
    });

    it('should format hours ago correctly', () => {
      const now = new Date('2024-01-15T15:00:00');
      vi.setSystemTime(now);
      const past = new Date('2024-01-15T13:00:00');
      expect(formatCreatedAt(past)).toBe('2 hours ago');
    });

    it('should format single hour correctly', () => {
      const now = new Date('2024-01-15T13:00:00');
      vi.setSystemTime(now);
      const past = new Date('2024-01-15T12:00:00');
      expect(formatCreatedAt(past)).toBe('1 hour ago');
    });

    it('should return "Yesterday" for dates one day ago', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);
      const past = new Date('2024-01-14T12:00:00');
      expect(formatCreatedAt(past)).toBe('Yesterday');
    });

    it('should format days ago correctly', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);
      const past = new Date('2024-01-13T12:00:00');
      expect(formatCreatedAt(past)).toBe('2 days ago');
    });

    it('should format dates within same year correctly', () => {
      const now = new Date('2024-06-15T12:00:00');
      vi.setSystemTime(now);
      const past = new Date('2024-01-10T12:00:00');
      const result = formatCreatedAt(past);
      expect(result).toMatch(/^Jan \d+$/);
      expect(result).toBe('Jan 10');
    });

    it('should format dates from previous year correctly', () => {
      const now = new Date('2024-01-15T12:00:00');
      vi.setSystemTime(now);
      const past = new Date('2023-12-10T12:00:00');
      const result = formatCreatedAt(past);
      expect(result).toMatch(/^Dec \d+, \d{4}$/);
      expect(result).toBe('Dec 10, 2023');
    });

    it('should handle string dates', () => {
      const now = new Date('2024-01-15T12:30:00');
      vi.setSystemTime(now);
      const past = new Date('2024-01-15T12:15:00').toISOString();
      expect(formatCreatedAt(past)).toBe('15 minutes ago');
    });
  });
});

