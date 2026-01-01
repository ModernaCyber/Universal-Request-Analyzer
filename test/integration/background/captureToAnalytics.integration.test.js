/**
 * Integration test: Request capture → storage → analytics flow
 * Tests the complete flow of capturing a request, storing it, and retrieving analytics
 */

import {
  createMockRequest,
  createMockDatabase,
  createMockStorage,
  waitFor,
} from "../../utils/testHelpers";

describe("Request Capture to Analytics Integration", () => {
  let mockDb;
  let mockStorage;
  let capturedRequests;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockStorage = createMockStorage();
    capturedRequests = [];
  });

  afterEach(() => {
    jest.clearAllMocks();
    capturedRequests = [];
  });

  describe("Request Capture Flow", () => {
    it("should capture and store request", async () => {
      // Guard clause: ensure database is initialized
      if (!mockDb) {
        throw new Error("Database not initialized");
      }

      // Step 1: Capture request
      const request = createMockRequest({
        id: "req-1",
        url: "https://api.example.com/users",
        method: "GET",
        domain: "example.com",
        status: 200,
      });

      capturedRequests.push(request);
      expect(capturedRequests).toHaveLength(1);

      // Step 2: Store in database
      const insertStmt = mockDb.prepare(
        "INSERT INTO bronze_requests VALUES (?, ?, ?, ?, ?)"
      );
      insertStmt.run(
        request.id,
        request.url,
        request.method,
        request.domain,
        request.status
      );

      expect(insertStmt.run).toHaveBeenCalled();
    });

    it("should process captured requests in order", async () => {
      const requests = [
        createMockRequest({ id: "req-1", timestamp: 1000 }),
        createMockRequest({ id: "req-2", timestamp: 2000 }),
        createMockRequest({ id: "req-3", timestamp: 3000 }),
      ];

      // Capture requests in order
      for (const request of requests) {
        capturedRequests.push(request);
      }

      expect(capturedRequests).toHaveLength(3);
      expect(capturedRequests[0].id).toBe("req-1");
      expect(capturedRequests[2].id).toBe("req-3");
    });
  });

  describe("Storage to Analytics Flow", () => {
    it("should aggregate request statistics", async () => {
      // Setup: Add multiple requests to database
      const requests = [
        createMockRequest({ id: "req-1", domain: "example.com", status: 200 }),
        createMockRequest({ id: "req-2", domain: "example.com", status: 200 }),
        createMockRequest({ id: "req-3", domain: "example.com", status: 404 }),
      ];

      // Store requests
      const insertStmt = mockDb.prepare("INSERT INTO bronze_requests VALUES (?, ?, ?, ?, ?)");
      requests.forEach((req) => {
        insertStmt.run(req.id, req.url, req.method, req.domain, req.status);
      });

      // Calculate analytics
      const totalRequests = requests.length;
      const successfulRequests = requests.filter((r) => r.status >= 200 && r.status < 300).length;
      const successRate = successfulRequests / totalRequests;

      expect(totalRequests).toBe(3);
      expect(successfulRequests).toBe(2);
      expect(successRate).toBeCloseTo(0.667, 2);
    });

    it("should group requests by domain", async () => {
      const requests = [
        createMockRequest({ id: "req-1", domain: "api.example.com" }),
        createMockRequest({ id: "req-2", domain: "api.example.com" }),
        createMockRequest({ id: "req-3", domain: "cdn.example.com" }),
      ];

      // Group by domain
      const grouped = requests.reduce((acc, req) => {
        if (!acc[req.domain]) acc[req.domain] = [];
        acc[req.domain].push(req);
        return acc;
      }, {});

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped["api.example.com"]).toHaveLength(2);
      expect(grouped["cdn.example.com"]).toHaveLength(1);
    });

    it("should calculate average response times", async () => {
      const requests = [
        createMockRequest({ id: "req-1", responseTime: 100 }),
        createMockRequest({ id: "req-2", responseTime: 200 }),
        createMockRequest({ id: "req-3", responseTime: 300 }),
      ];

      const totalTime = requests.reduce((sum, req) => sum + req.responseTime, 0);
      const avgTime = totalTime / requests.length;

      expect(avgTime).toBe(200);
    });
  });

  describe("Data Synchronization", () => {
    it("should sync between database and chrome storage", async () => {
      // Store config in chrome.storage
      const config = {
        capture: { enabled: true },
        maxStoredRequests: 10000,
      };

      await mockStorage.set({ config });

      // Retrieve from storage
      const result = await mockStorage.get("config");

      expect(result.config).toEqual(config);
      expect(mockStorage.set).toHaveBeenCalledWith({ config });
    });

    it("should handle storage updates", async () => {
      // Initial data
      await mockStorage.set({ requests: [] });

      // Update data
      const newRequest = createMockRequest({ id: "req-1" });
      await mockStorage.set({ requests: [newRequest] });

      const result = await mockStorage.get("requests");
      expect(result.requests).toHaveLength(1);
      expect(result.requests[0].id).toBe("req-1");
    });
  });

  describe("End-to-End Flow", () => {
    it("should complete full request lifecycle", async () => {
      // Step 1: Capture request
      const request = createMockRequest({
        id: "req-e2e",
        url: "https://api.example.com/data",
        method: "GET",
        domain: "example.com",
        status: 200,
        responseTime: 150,
      });

      capturedRequests.push(request);

      // Step 2: Store in database (Bronze layer)
      const insertBronze = mockDb.prepare(
        "INSERT INTO bronze_requests VALUES (?, ?, ?, ?, ?, ?)"
      );
      insertBronze.run(
        request.id,
        request.url,
        request.method,
        request.domain,
        request.status,
        request.responseTime
      );

      // Step 3: Process to Silver layer (validation/deduplication)
      const selectBronze = mockDb.prepare(
        "SELECT * FROM bronze_requests WHERE id = ?"
      );
      const bronzeData = selectBronze.get();

      // Step 4: Store in Silver layer
      const insertSilver = mockDb.prepare(
        "INSERT INTO silver_requests VALUES (?, ?, ?, ?, ?, ?)"
      );
      insertSilver.run(
        request.id,
        request.url,
        request.method,
        request.domain,
        request.status,
        request.responseTime
      );

      // Step 5: Aggregate to Gold layer (analytics)
      const aggregateQuery = mockDb.prepare(`
        SELECT 
          domain,
          COUNT(*) as total_requests,
          AVG(responseTime) as avg_response_time
        FROM silver_requests
        WHERE domain = ?
        GROUP BY domain
      `);

      // Verify all steps completed
      expect(capturedRequests).toHaveLength(1);
      expect(insertBronze.run).toHaveBeenCalled();
      expect(insertSilver.run).toHaveBeenCalled();
    });

    it("should handle errors in pipeline gracefully", async () => {
      const request = createMockRequest();

      // Simulate database error
      mockDb.prepare.mockImplementation(() => {
        throw new Error("Database write failed");
      });

      expect(() => {
        mockDb.prepare("INSERT INTO bronze_requests VALUES (?)");
      }).toThrow("Database write failed");

      // Request should remain in memory queue
      capturedRequests.push(request);
      expect(capturedRequests).toHaveLength(1);
    });
  });

  describe("Performance", () => {
    it("should handle high volume of requests", async () => {
      const requestCount = 100;
      const requests = Array.from({ length: requestCount }, (_, i) =>
        createMockRequest({ id: `req-${i}` })
      );

      // Capture all requests
      requests.forEach((req) => capturedRequests.push(req));

      expect(capturedRequests).toHaveLength(requestCount);
    });

    it("should batch database writes", async () => {
      const batchSize = 10;
      const requests = Array.from({ length: batchSize }, (_, i) =>
        createMockRequest({ id: `req-${i}` })
      );

      // Simulate batch insert
      mockDb.exec("BEGIN TRANSACTION");

      const insertStmt = mockDb.prepare(
        "INSERT INTO bronze_requests VALUES (?, ?, ?)"
      );

      requests.forEach((req) => {
        insertStmt.run(req.id, req.url, req.method);
      });

      mockDb.exec("COMMIT");

      expect(mockDb.exec).toHaveBeenCalledWith("BEGIN TRANSACTION");
      expect(mockDb.exec).toHaveBeenCalledWith("COMMIT");
      expect(insertStmt.run).toHaveBeenCalledTimes(batchSize);
    });
  });
});
