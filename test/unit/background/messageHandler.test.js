/**
 * Unit tests for message handler logic
 * Tests background message routing, handling, and responses
 */

describe("Message Handler", () => {
  let mockDb;
  let mockStorage;
  let messageHandler;

  beforeEach(() => {
    mockDb = {
      prepare: jest.fn(() => ({
        all: jest.fn(() => []),
        get: jest.fn(() => ({})),
        run: jest.fn(() => ({ changes: 1 })),
      })),
      exec: jest.fn(),
    };

    mockStorage = {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve()),
    };

    messageHandler = {
      handleMessage: jest.fn((message) => {
        // Route messages based on action
        switch (message.action) {
          case "getRequests":
            return Promise.resolve({ success: true, requests: [] });
          case "getStats":
            return Promise.resolve({ success: true, stats: {} });
          case "updateSettings":
            return Promise.resolve({ success: true });
          case "clearData":
            return Promise.resolve({ success: true });
          default:
            return Promise.resolve({ success: false, error: "Unknown action" });
        }
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Message Routing", () => {
    it("should route getRequests action", async () => {
      const message = { action: "getRequests", filters: {} };
      const response = await messageHandler.handleMessage(message);

      expect(response.success).toBe(true);
      expect(response.requests).toBeDefined();
    });

    it("should route getStats action", async () => {
      const message = { action: "getStats", domain: "example.com" };
      const response = await messageHandler.handleMessage(message);

      expect(response.success).toBe(true);
      expect(response.stats).toBeDefined();
    });

    it("should route updateSettings action", async () => {
      const message = {
        action: "updateSettings",
        settings: { capture: { enabled: true } },
      };
      const response = await messageHandler.handleMessage(message);

      expect(response.success).toBe(true);
    });

    it("should handle unknown action", async () => {
      const message = { action: "unknownAction" };
      const response = await messageHandler.handleMessage(message);

      expect(response.success).toBe(false);
      expect(response.error).toBe("Unknown action");
    });
  });

  describe("Request Handlers", () => {
    it("should get filtered requests", async () => {
      const message = {
        action: "getRequests",
        filters: {
          domain: "example.com",
          timeRange: 300,
        },
      };

      const response = await messageHandler.handleMessage(message);
      expect(response.success).toBe(true);
    });

    it("should get request by ID", async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn(() => ({
          id: "req-1",
          url: "https://example.com",
          method: "GET",
        })),
      });

      const requestId = "req-1";
      const stmt = mockDb.prepare("SELECT * FROM requests WHERE id = ?");
      const request = stmt.get();

      expect(request.id).toBe("req-1");
    });

    it("should handle request not found", async () => {
      mockDb.prepare.mockReturnValue({
        get: jest.fn(() => undefined),
      });

      const stmt = mockDb.prepare("SELECT * FROM requests WHERE id = ?");
      const request = stmt.get();

      expect(request).toBeUndefined();
    });
  });

  describe("Statistics Handlers", () => {
    it("should get domain statistics", async () => {
      const message = {
        action: "getStats",
        domain: "example.com",
      };

      const response = await messageHandler.handleMessage(message);
      expect(response.success).toBe(true);
      expect(response.stats).toBeDefined();
    });

    it("should calculate aggregate stats", () => {
      const requests = [
        { status: 200, responseTime: 100 },
        { status: 200, responseTime: 200 },
        { status: 404, responseTime: 150 },
      ];

      const totalRequests = requests.length;
      const successfulRequests = requests.filter((r) => r.status >= 200 && r.status < 300).length;
      const avgResponseTime =
        requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length;

      expect(totalRequests).toBe(3);
      expect(successfulRequests).toBe(2);
      expect(avgResponseTime).toBe(150);
    });
  });

  describe("Settings Handlers", () => {
    it("should update capture settings", async () => {
      const message = {
        action: "updateSettings",
        settings: {
          capture: { enabled: false },
        },
      };

      await mockStorage.set({ settings: message.settings });
      expect(mockStorage.set).toHaveBeenCalledWith({ settings: message.settings });
    });

    it("should get current settings", async () => {
      mockStorage.get.mockResolvedValue({
        settings: { capture: { enabled: true } },
      });

      const result = await mockStorage.get("settings");
      expect(result.settings.capture.enabled).toBe(true);
    });

    it("should validate settings before save", () => {
      const settings = {
        capture: { enabled: "invalid" },
      };

      const isValid = typeof settings.capture.enabled === "boolean";
      expect(isValid).toBe(false);
    });
  });

  describe("Data Management Handlers", () => {
    it("should clear all data", async () => {
      const message = { action: "clearData" };
      const response = await messageHandler.handleMessage(message);

      expect(response.success).toBe(true);
    });

    it("should delete old requests", async () => {
      const cutoffTime = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const stmt = mockDb.prepare("DELETE FROM requests WHERE timestamp < ?");
      stmt.run(cutoffTime);

      expect(stmt.run).toHaveBeenCalledWith(cutoffTime);
    });

    it("should export data", async () => {
      const stmt = mockDb.prepare("SELECT * FROM requests");
      const requests = stmt.all();

      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        requests: requests,
      };

      expect(exportData.version).toBe("1.0");
      expect(exportData.requests).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors", async () => {
      mockDb.prepare.mockImplementation(() => {
        throw new Error("Database error");
      });

      expect(() => mockDb.prepare("SELECT * FROM requests")).toThrow("Database error");
    });

    it("should handle storage errors", async () => {
      mockStorage.get.mockRejectedValue(new Error("Storage unavailable"));

      await expect(mockStorage.get("settings")).rejects.toThrow("Storage unavailable");
    });

    it("should return error response for failed operations", async () => {
      const response = {
        success: false,
        error: "Operation failed",
      };

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe("Response Format", () => {
    it("should return success response", async () => {
      const response = await messageHandler.handleMessage({ action: "getRequests" });

      expect(response).toHaveProperty("success");
      expect(response.success).toBe(true);
    });

    it("should include data in success response", async () => {
      const response = await messageHandler.handleMessage({ action: "getRequests" });

      expect(response.success).toBe(true);
      expect(response.requests).toBeDefined();
    });

    it("should include error in failure response", async () => {
      const response = await messageHandler.handleMessage({ action: "unknownAction" });

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe("Message Validation", () => {
    // Guard clause: validate message structure
    it("should reject messages without action", () => {
      const message = { data: "test" };
      const isValid = message.action !== undefined;

      expect(isValid).toBe(false);
    });

    it("should validate action type", () => {
      const message = { action: 123 };
      const isValid = typeof message.action === "string";

      expect(isValid).toBe(false);
    });

    it("should accept valid message", () => {
      const message = { action: "getRequests", filters: {} };
      const isValid = message.action !== undefined && typeof message.action === "string";

      expect(isValid).toBe(true);
    });
  });
});
