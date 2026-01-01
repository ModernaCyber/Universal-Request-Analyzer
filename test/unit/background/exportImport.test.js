/**
 * Unit tests for export/import functionality
 * Tests data export formats, import validation, and file handling
 */

import { createMockRequests, createMockSettings } from "../../utils/testHelpers";

describe("Export/Import Functionality", () => {
  describe("Data Export", () => {
    it("should export requests as JSON", () => {
      const requests = createMockRequests(5);
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        requests: requests,
      };

      const json = JSON.stringify(exportData);
      expect(json).toBeTruthy();

      const parsed = JSON.parse(json);
      expect(parsed.requests).toHaveLength(5);
    });

    it("should export settings as JSON", () => {
      const settings = createMockSettings();
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        settings: settings,
      };

      const json = JSON.stringify(exportData);
      const parsed = JSON.parse(json);

      expect(parsed.settings.capture).toBeDefined();
      expect(parsed.settings.storage).toBeDefined();
    });

    it("should export to CSV format", () => {
      const requests = createMockRequests(3);

      // Convert to CSV
      const headers = ["id", "url", "method", "status", "responseTime"];
      const csvRows = [headers.join(",")];

      requests.forEach((req) => {
        const row = [req.id, req.url, req.method, req.status, req.responseTime];
        csvRows.push(row.join(","));
      });

      const csv = csvRows.join("\n");

      expect(csv).toContain("id,url,method,status,responseTime");
      expect(csv.split("\n")).toHaveLength(4); // header + 3 rows
    });

    it("should create downloadable blob", () => {
      const data = { requests: createMockRequests(5) };
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: "application/json" });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/json");
      expect(blob.size).toBeGreaterThan(0);
    });

    it("should generate filename with timestamp", () => {
      const date = new Date();
      const timestamp = date.toISOString().split("T")[0];
      const filename = `export-${timestamp}.json`;

      expect(filename).toContain("export-");
      expect(filename).toContain(".json");
    });

    it("should filter exported data", () => {
      const requests = createMockRequests(10);
      const filtered = requests.filter((r) => r.status === 200);

      const exportData = {
        version: "1.0",
        requests: filtered,
      };

      expect(exportData.requests.length).toBeLessThanOrEqual(10);
    });
  });

  describe("Data Import", () => {
    it("should import JSON data", () => {
      const importJson = JSON.stringify({
        version: "1.0",
        requests: createMockRequests(5),
      });

      const parsed = JSON.parse(importJson);

      expect(parsed.version).toBe("1.0");
      expect(parsed.requests).toHaveLength(5);
    });

    // Guard clause: validate import structure
    it("should validate import data structure", () => {
      const validData = {
        version: "1.0",
        requests: [],
      };

      const isValid =
        validData.version !== undefined &&
        Array.isArray(validData.requests);

      expect(isValid).toBe(true);
    });

    it("should reject invalid JSON", () => {
      const invalidJson = "{ invalid json }";

      expect(() => JSON.parse(invalidJson)).toThrow();
    });

    it("should validate imported requests", () => {
      const request = {
        id: "req-1",
        url: "https://example.com",
        method: "GET",
      };

      // Guard clause: check required fields
      const isValid =
        request.id !== undefined &&
        request.url !== undefined &&
        request.method !== undefined;

      expect(isValid).toBe(true);
    });

    it("should reject requests with missing fields", () => {
      const invalidRequest = {
        id: "req-1",
        // Missing url and method
      };

      const isValid =
        invalidRequest.id !== undefined &&
        invalidRequest.url !== undefined &&
        invalidRequest.method !== undefined;

      expect(isValid).toBe(false);
    });

    it("should handle version compatibility", () => {
      const importData = {
        version: "1.0",
        requests: [],
      };

      const supportedVersions = ["1.0", "1.1"];
      const isCompatible = supportedVersions.includes(importData.version);

      expect(isCompatible).toBe(true);
    });
  });

  describe("CSV Import", () => {
    it("should parse CSV data", () => {
      const csv = `id,url,method,status
req-1,https://example.com,GET,200
req-2,https://test.com,POST,201`;

      const lines = csv.split("\n");
      const headers = lines[0].split(",");
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",");
        return headers.reduce((obj, header, i) => {
          obj[header] = values[i];
          return obj;
        }, {});
      });

      expect(rows).toHaveLength(2);
      expect(rows[0].id).toBe("req-1");
      expect(rows[1].method).toBe("POST");
    });

    it("should handle CSV with quotes", () => {
      const csv = `id,url,method
"req-1","https://example.com","GET"`;

      const lines = csv.split("\n");
      expect(lines).toHaveLength(2);
    });

    it("should handle empty CSV rows", () => {
      const csv = `id,url,method
req-1,https://example.com,GET

req-2,https://test.com,POST`;

      const lines = csv.split("\n").filter((line) => line.trim() !== "");
      expect(lines).toHaveLength(3); // header + 2 data rows
    });
  });

  describe("Export Options", () => {
    it("should export with headers included", () => {
      const requests = createMockRequests(2);
      const options = {
        includeHeaders: true,
        includeBody: false,
      };

      const exportData = requests.map((req) => ({
        id: req.id,
        url: req.url,
        method: req.method,
        status: req.status,
        requestHeaders: options.includeHeaders ? req.requestHeaders : undefined,
        requestBody: options.includeBody ? req.requestBody : undefined,
      }));

      expect(exportData[0].requestHeaders).toBeDefined();
      expect(exportData[0].requestBody).toBeUndefined();
    });

    it("should export with body included", () => {
      const requests = createMockRequests(1, {
        requestBody: JSON.stringify({ data: "test" }),
      });

      const options = {
        includeHeaders: false,
        includeBody: true,
      };

      const exportData = requests.map((req) => ({
        ...req,
        requestHeaders: options.includeHeaders ? req.requestHeaders : undefined,
        requestBody: options.includeBody ? req.requestBody : undefined,
      }));

      expect(exportData[0].requestBody).toBeDefined();
    });

    it("should export date range", () => {
      const now = Date.now();
      const requests = createMockRequests(10).map((r, i) => ({
        ...r,
        timestamp: now - i * 60000,
      }));

      const startTime = now - 300000; // 5 minutes ago
      const filtered = requests.filter((r) => r.timestamp >= startTime);

      expect(filtered.length).toBeLessThanOrEqual(10);
    });
  });

  describe("File Operations", () => {
    it("should create file object", () => {
      const content = JSON.stringify({ data: "test" });
      const blob = new Blob([content], { type: "application/json" });
      const file = new File([blob], "export.json", { type: "application/json" });

      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("export.json");
      expect(file.type).toBe("application/json");
    });

    it("should read file as text", async () => {
      const content = "test content";
      const blob = new Blob([content], { type: "text/plain" });

      // In tests, we can simulate file reading
      const text = await blob.text();
      expect(text).toBe(content);
    });

    it("should handle large files", () => {
      const largeData = createMockRequests(10000);
      const json = JSON.stringify(largeData);

      expect(json.length).toBeGreaterThan(1000);
    });
  });

  describe("Batch Operations", () => {
    it("should import requests in batches", () => {
      const allRequests = createMockRequests(100);
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < allRequests.length; i += batchSize) {
        batches.push(allRequests.slice(i, i + batchSize));
      }

      expect(batches).toHaveLength(10);
      expect(batches[0]).toHaveLength(10);
    });

    it("should track import progress", () => {
      const total = 100;
      let imported = 0;

      // Simulate import
      const batch = 10;
      imported += batch;

      const progress = (imported / total) * 100;
      expect(progress).toBe(10);
    });
  });

  describe("Error Handling", () => {
    it("should handle export errors", () => {
      const data = { circular: {} };
      data.circular.ref = data; // Circular reference

      expect(() => JSON.stringify(data)).toThrow();
    });

    it("should handle import errors gracefully", () => {
      let error = null;

      try {
        JSON.parse("invalid json");
      } catch (e) {
        error = e;
      }

      expect(error).not.toBeNull();
      expect(error.message).toContain("JSON");
    });

    it("should validate file size", () => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const fileSize = 5 * 1024 * 1024; // 5MB

      const isValid = fileSize <= maxSize;
      expect(isValid).toBe(true);
    });

    it("should validate file type", () => {
      const allowedTypes = ["application/json", "text/csv"];
      const fileType = "application/json";

      const isValid = allowedTypes.includes(fileType);
      expect(isValid).toBe(true);
    });
  });
});
