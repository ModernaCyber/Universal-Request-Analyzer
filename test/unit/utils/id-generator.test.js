/**
 * Unit tests for ID generator utilities
 * Tests isolated ID generation functions with various formats
 */

import {
  generateId,
  generateUuid,
  generateShortId,
  generateSequentialId,
  generateTimestampId,
} from "../../../src/background/utils/id-generator";

describe("id-generator", () => {
  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it("should generate string IDs", () => {
      const id = generateId();
      expect(typeof id).toBe("string");
    });

    it("should generate IDs with expected format", () => {
      const id = generateId();
      // Should be base36 timestamp + base36 random
      expect(id).toMatch(/^[0-9a-z]+$/);
    });
  });

  describe("generateUuid", () => {
    it("should generate valid UUID v4", () => {
      const uuid = generateUuid();

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate unique UUIDs", () => {
      const uuid1 = generateUuid();
      const uuid2 = generateUuid();

      expect(uuid1).not.toBe(uuid2);
    });

    it("should have version 4 indicator", () => {
      const uuid = generateUuid();
      // 4th section should start with '4'
      const parts = uuid.split("-");
      expect(parts[2][0]).toBe("4");
    });

    it("should have correct variant bits", () => {
      const uuid = generateUuid();
      const parts = uuid.split("-");
      // 5th section should start with 8, 9, a, or b
      expect(["8", "9", "a", "b"]).toContain(parts[3][0]);
    });
  });

  describe("generateShortId", () => {
    it("should generate ID with default length", () => {
      const id = generateShortId();
      expect(id.length).toBe(8);
    });

    it("should generate ID with custom length", () => {
      const id = generateShortId(16);
      expect(id.length).toBe(16);
    });

    it("should only contain alphanumeric characters", () => {
      const id = generateShortId(20);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });

    it("should generate unique short IDs", () => {
      const id1 = generateShortId(10);
      const id2 = generateShortId(10);

      expect(id1).not.toBe(id2);
    });

    // Guard clause: handle edge cases
    it("should handle zero length", () => {
      const id = generateShortId(0);
      expect(id).toBe("");
    });
  });

  describe("generateSequentialId", () => {
    it("should generate ID with prefix and counter", () => {
      const id = generateSequentialId("req", 42);
      expect(id).toBe("req-000042");
    });

    it("should pad counter to 6 digits", () => {
      expect(generateSequentialId("test", 1)).toBe("test-000001");
      expect(generateSequentialId("test", 999)).toBe("test-000999");
      expect(generateSequentialId("test", 123456)).toBe("test-123456");
    });

    it("should handle large counters", () => {
      const id = generateSequentialId("evt", 1234567);
      expect(id).toBe("evt-1234567");
    });

    it("should work with different prefixes", () => {
      expect(generateSequentialId("REQ", 1)).toBe("REQ-000001");
      expect(generateSequentialId("usr", 100)).toBe("usr-000100");
    });
  });

  describe("generateTimestampId", () => {
    it("should generate ID with timestamp component", () => {
      const before = Date.now();
      const id = generateTimestampId();
      const after = Date.now();

      const [timestamp] = id.split("-");
      const timestampNum = parseInt(timestamp, 10);

      expect(timestampNum).toBeGreaterThanOrEqual(before);
      expect(timestampNum).toBeLessThanOrEqual(after);
    });

    it("should have format timestamp-random", () => {
      const id = generateTimestampId();
      expect(id).toMatch(/^\d+-\d+$/);
    });

    it("should generate unique IDs", () => {
      const id1 = generateTimestampId();
      const id2 = generateTimestampId();

      expect(id1).not.toBe(id2);
    });

    it("should have random component less than 10000", () => {
      const id = generateTimestampId();
      const [, random] = id.split("-");
      const randomNum = parseInt(random, 10);

      expect(randomNum).toBeGreaterThanOrEqual(0);
      expect(randomNum).toBeLessThan(10000);
    });
  });
});
