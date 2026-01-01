/**
 * Unit tests for shared helper utilities
 * Tests formatting functions for bytes, duration, timestamps
 */

import {
  formatBytes,
  formatDuration,
  formatTimestamp,
  formatRelativeTime,
  debounce,
} from "../../../src/lib/utils/helpers";

describe("helpers", () => {
  describe("formatBytes", () => {
    // Guard clause: handle invalid inputs
    it("should return '0 Bytes' for zero", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
    });

    it("should return 'N/A' for falsy values", () => {
      expect(formatBytes(null)).toBe("N/A");
      expect(formatBytes(undefined)).toBe("N/A");
    });

    it("should format bytes correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(1073741824)).toBe("1 GB");
    });

    it("should respect decimal places", () => {
      expect(formatBytes(1536, 0)).toBe("2 KB");
      expect(formatBytes(1536, 1)).toBe("1.5 KB");
      expect(formatBytes(1536, 3)).toBe("1.5 KB");
    });

    it("should handle small byte counts", () => {
      expect(formatBytes(100)).toBe("100 Bytes");
      expect(formatBytes(999)).toBe("999 Bytes");
    });
  });

  describe("formatDuration", () => {
    // Guard clause: handle invalid inputs
    it("should return 'N/A' for falsy non-zero values", () => {
      expect(formatDuration(null)).toBe("N/A");
      expect(formatDuration(undefined)).toBe("N/A");
    });

    it("should handle zero duration", () => {
      expect(formatDuration(0)).toBe("< 1ms");
    });

    it("should format milliseconds", () => {
      expect(formatDuration(0.5)).toBe("< 1ms");
      expect(formatDuration(1)).toBe("1ms");
      expect(formatDuration(123)).toBe("123ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    it("should format seconds", () => {
      expect(formatDuration(1000)).toBe("1.00s");
      expect(formatDuration(2500)).toBe("2.50s");
      expect(formatDuration(59999)).toBe("60.00s");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(60000)).toBe("1m 0s");
      expect(formatDuration(90000)).toBe("1m 30s");
      expect(formatDuration(3599999)).toBe("59m 59s");
    });

    it("should format hours and minutes", () => {
      expect(formatDuration(3600000)).toBe("1h 0m");
      expect(formatDuration(5400000)).toBe("1h 30m");
      expect(formatDuration(7200000)).toBe("2h 0m");
    });
  });

  describe("formatTimestamp", () => {
    // Guard clause: handle invalid input
    it("should return 'N/A' for falsy values", () => {
      expect(formatTimestamp(null)).toBe("N/A");
      expect(formatTimestamp(undefined)).toBe("N/A");
    });

    it("should format full timestamp", () => {
      const timestamp = new Date("2024-01-15T10:30:00").getTime();
      const result = formatTimestamp(timestamp, "full");
      
      expect(result).toContain("2024");
      expect(result).toContain("15");
    });

    it("should format date only", () => {
      const timestamp = new Date("2024-01-15T10:30:00").getTime();
      const result = formatTimestamp(timestamp, "date");
      
      expect(result).toContain("2024");
      expect(result).not.toMatch(/\d{1,2}:\d{2}/); // No time
    });

    it("should format time only", () => {
      const timestamp = new Date("2024-01-15T10:30:00").getTime();
      const result = formatTimestamp(timestamp, "time");
      
      expect(result).toMatch(/\d{1,2}:\d{2}/); // Has time
    });

    it("should format short format", () => {
      const timestamp = new Date("2024-01-15T10:30:00").getTime();
      const result = formatTimestamp(timestamp, "short");
      
      expect(result).toBeTruthy();
      expect(result).toContain("15");
    });
  });

  describe("formatRelativeTime", () => {
    // Guard clause: handle invalid input
    it("should return 'N/A' for falsy values", () => {
      expect(formatRelativeTime(null)).toBe("N/A");
      expect(formatRelativeTime(undefined)).toBe("N/A");
    });

    it("should return 'just now' for recent timestamps", () => {
      const now = Date.now();
      expect(formatRelativeTime(now)).toBe("just now");
      expect(formatRelativeTime(now - 30000)).toBe("just now");
    });

    it("should format minutes ago", () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 60000)).toBe("1 minute ago");
      expect(formatRelativeTime(now - 120000)).toBe("2 minutes ago");
      expect(formatRelativeTime(now - 1800000)).toBe("30 minutes ago");
    });

    it("should format hours ago", () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 3600000)).toBe("1 hour ago");
      expect(formatRelativeTime(now - 7200000)).toBe("2 hours ago");
    });

    it("should format days ago", () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 86400000)).toBe("1 day ago");
      expect(formatRelativeTime(now - 172800000)).toBe("2 days ago");
    });

    it("should fall back to formatted date for old timestamps", () => {
      const oldTimestamp = Date.now() - 86400000 * 31; // 31 days ago
      const result = formatRelativeTime(oldTimestamp);
      
      // Should not be relative format
      expect(result).not.toContain("ago");
    });
  });

  describe("debounce", () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    it("should delay function execution", () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it("should cancel previous calls", () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      debouncedFunc();
      debouncedFunc();

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it("should pass arguments to function", () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc("arg1", "arg2");

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should reset delay on subsequent calls", () => {
      const func = jest.fn();
      const debouncedFunc = debounce(func, 100);

      debouncedFunc();
      jest.advanceTimersByTime(50);

      debouncedFunc();
      jest.advanceTimersByTime(50);

      // Should not have been called yet
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      // Now it should be called
      expect(func).toHaveBeenCalledTimes(1);
    });
  });
});
