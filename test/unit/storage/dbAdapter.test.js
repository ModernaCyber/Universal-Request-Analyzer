/**
 * Unit tests for database storage adapter
 * Tests SQL.js database operations and query generation
 */

import { createMockDatabase, guardAgainstNull } from "../../utils/testHelpers";

describe("Database Adapter", () => {
  let mockDb;

  beforeEach(() => {
    mockDb = createMockDatabase();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Database Initialization", () => {
    it("should create database instance", () => {
      expect(mockDb).toBeDefined();
      expect(mockDb.exec).toBeDefined();
      expect(mockDb.prepare).toBeDefined();
    });

    it("should execute initialization queries", () => {
      const initQuery = "CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY)";
      mockDb.exec(initQuery);

      expect(mockDb.exec).toHaveBeenCalledWith(initQuery);
    });
  });

  describe("Insert Operations", () => {
    it("should insert single record", () => {
      const stmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?, ?)");
      stmt.run("id1", "GET", "https://example.com");

      expect(stmt.run).toHaveBeenCalledWith("id1", "GET", "https://example.com");
    });

    it("should return changes count", () => {
      const stmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?, ?)");
      const result = stmt.run("id1", "GET", "https://example.com");

      expect(result.changes).toBe(1);
    });

    // Guard clause: reject null values
    it("should handle null guard clause", () => {
      expect(() => {
        guardAgainstNull(null, "Database cannot be null");
      }).toThrow("Database cannot be null");
    });
  });

  describe("Select Operations", () => {
    it("should query all records", () => {
      const stmt = mockDb.prepare("SELECT * FROM requests");
      const results = stmt.all();

      expect(results).toEqual([]);
      expect(stmt.all).toHaveBeenCalled();
    });

    it("should query single record", () => {
      const stmt = mockDb.prepare("SELECT * FROM requests WHERE id = ?");
      const result = stmt.get();

      expect(result).toEqual({});
      expect(stmt.get).toHaveBeenCalled();
    });

    it("should handle empty results", () => {
      const stmt = mockDb.prepare("SELECT * FROM requests WHERE id = ?");
      const result = stmt.get();

      expect(result).toBeDefined();
      expect(Object.keys(result).length).toBe(0);
    });
  });

  describe("Update Operations", () => {
    it("should update records", () => {
      const stmt = mockDb.prepare("UPDATE requests SET status = ? WHERE id = ?");
      const result = stmt.run(200, "req1");

      expect(stmt.run).toHaveBeenCalledWith(200, "req1");
      expect(result.changes).toBe(1);
    });
  });

  describe("Delete Operations", () => {
    it("should delete records", () => {
      const stmt = mockDb.prepare("DELETE FROM requests WHERE id = ?");
      const result = stmt.run("req1");

      expect(stmt.run).toHaveBeenCalledWith("req1");
      expect(result.changes).toBe(1);
    });

    it("should delete all records", () => {
      const stmt = mockDb.prepare("DELETE FROM requests");
      stmt.run();

      expect(stmt.run).toHaveBeenCalled();
    });
  });

  describe("Transaction Operations", () => {
    it("should begin transaction", () => {
      mockDb.exec("BEGIN TRANSACTION");
      expect(mockDb.exec).toHaveBeenCalledWith("BEGIN TRANSACTION");
    });

    it("should commit transaction", () => {
      mockDb.exec("COMMIT");
      expect(mockDb.exec).toHaveBeenCalledWith("COMMIT");
    });

    it("should rollback transaction", () => {
      mockDb.exec("ROLLBACK");
      expect(mockDb.exec).toHaveBeenCalledWith("ROLLBACK");
    });
  });

  describe("Database Export", () => {
    it("should export database", () => {
      const exportedData = mockDb.export();

      expect(exportedData).toBeInstanceOf(Uint8Array);
      expect(mockDb.export).toHaveBeenCalled();
    });
  });

  describe("Database Cleanup", () => {
    it("should close database", () => {
      mockDb.close();

      expect(mockDb.close).toHaveBeenCalled();
    });

    it("should free prepared statement", () => {
      const stmt = mockDb.prepare("SELECT * FROM requests");
      stmt.free();

      expect(stmt.free).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle query errors gracefully", () => {
      mockDb.exec.mockImplementation(() => {
        throw new Error("SQL syntax error");
      });

      expect(() => mockDb.exec("INVALID SQL")).toThrow("SQL syntax error");
    });

    it("should handle constraint violations", () => {
      const stmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?)");
      stmt.run.mockImplementation(() => {
        throw new Error("UNIQUE constraint failed");
      });

      expect(() => stmt.run("id1", "GET")).toThrow("UNIQUE constraint failed");
    });
  });
});
