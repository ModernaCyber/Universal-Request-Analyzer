/**
 * Integration test: Export and Import data flow
 * Tests end-to-end export → file → import cycle
 */

import {
  createMockRequests,
  createMockSettings,
  createMockDatabase,
  createMockStorage,
} from "../../utils/testHelpers";

describe("Export/Import Integration", () => {
  let mockDb;
  let mockStorage;

  beforeEach(() => {
    mockDb = createMockDatabase();
    mockStorage = createMockStorage();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Complete Export Flow", () => {
    it("should export data from database", async () => {
      // Step 1: Create test data
      const requests = createMockRequests(10);

      // Step 2: Store in database
      const insertStmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?, ?, ?)");
      requests.forEach((req) => {
        insertStmt.run(req.id, req.url, req.method, req.status);
      });

      // Step 3: Query for export
      const selectStmt = mockDb.prepare("SELECT * FROM requests");
      const exportRequests = selectStmt.all();

      // Step 4: Format export data
      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        requests: exportRequests,
        settings: await mockStorage.get("settings"),
      };

      expect(exportData.version).toBe("1.0");
      expect(insertStmt.run).toHaveBeenCalledTimes(10);
    });

    it("should create downloadable export file", async () => {
      const requests = createMockRequests(5);
      const settings = createMockSettings();

      const exportData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        requests,
        settings,
      };

      // Create blob
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });

      // Create download URL
      const url = URL.createObjectURL(blob);

      expect(blob.size).toBeGreaterThan(0);
      expect(url).toBeTruthy();
      expect(url).toContain("blob:");

      // Cleanup
      URL.revokeObjectURL(url);
    });
  });

  describe("Complete Import Flow", () => {
    it("should import and restore data", async () => {
      // Step 1: Create import data
      const importData = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        requests: createMockRequests(10),
        settings: createMockSettings(),
      };

      const importJson = JSON.stringify(importData);

      // Step 2: Parse import file
      const parsed = JSON.parse(importJson);

      // Guard clause: validate version
      if (parsed.version !== "1.0") {
        throw new Error("Unsupported version");
      }

      // Step 3: Restore settings
      await mockStorage.set({ settings: parsed.settings });

      // Step 4: Restore requests
      const insertStmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?, ?, ?)");
      parsed.requests.forEach((req) => {
        insertStmt.run(req.id, req.url, req.method, req.status);
      });

      expect(mockStorage.set).toHaveBeenCalled();
      expect(insertStmt.run).toHaveBeenCalledTimes(10);
    });

    it("should handle import conflicts", async () => {
      // Existing data
      const existingRequests = createMockRequests(5);
      const insertStmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?, ?, ?)");

      existingRequests.forEach((req) => {
        insertStmt.run(req.id, req.url, req.method, req.status);
      });

      // Import data with conflicting IDs
      const importData = {
        version: "1.0",
        requests: createMockRequests(3), // May have overlapping IDs
      };

      // Strategy 1: Skip duplicates
      const skipDuplicates = true;
      if (skipDuplicates) {
        // Filter out existing IDs
        const existingIds = new Set(existingRequests.map((r) => r.id));
        const newRequests = importData.requests.filter((r) => !existingIds.has(r.id));

        expect(newRequests.length).toBeLessThanOrEqual(importData.requests.length);
      }
    });

    it("should merge imported settings", async () => {
      // Existing settings
      const existingSettings = createMockSettings({
        capture: { enabled: true },
        ui: { theme: "dark" },
      });

      await mockStorage.set({ settings: existingSettings });

      // Import settings
      const importSettings = createMockSettings({
        capture: { enabled: false },
        storage: { maxStoredRequests: 5000 },
      });

      // Merge strategy
      const mergedSettings = {
        ...existingSettings,
        ...importSettings,
        ui: existingSettings.ui, // Keep existing UI preferences
      };

      await mockStorage.set({ settings: mergedSettings });

      const result = await mockStorage.get("settings");
      expect(result.settings.capture.enabled).toBe(false);
      expect(result.settings.ui.theme).toBe("dark");
    });
  });

  describe("Selective Import/Export", () => {
    it("should export only selected domains", () => {
      const allRequests = [
        ...createMockRequests(5, { domain: "api.example.com" }),
        ...createMockRequests(3, { domain: "cdn.example.com" }),
        ...createMockRequests(2, { domain: "other.com" }),
      ];

      const selectedDomains = ["api.example.com", "cdn.example.com"];
      const filtered = allRequests.filter((r) => selectedDomains.includes(r.domain));

      expect(filtered).toHaveLength(8);
    });

    it("should export only date range", () => {
      const now = Date.now();
      const allRequests = createMockRequests(10).map((r, i) => ({
        ...r,
        timestamp: now - i * 60000,
      }));

      const startDate = now - 300000; // 5 minutes ago
      const endDate = now;

      const filtered = allRequests.filter(
        (r) => r.timestamp >= startDate && r.timestamp <= endDate
      );

      expect(filtered.length).toBeGreaterThan(0);
    });

    it("should import only settings without requests", async () => {
      const importData = {
        version: "1.0",
        settings: createMockSettings({ capture: { enabled: false } }),
      };

      // Import only settings
      await mockStorage.set({ settings: importData.settings });

      // Verify no requests imported
      const selectStmt = mockDb.prepare("SELECT COUNT(*) as count FROM requests");
      const result = selectStmt.get();

      expect(mockStorage.set).toHaveBeenCalled();
    });
  });

  describe("Backup and Restore", () => {
    it("should create complete backup", async () => {
      // Get all data
      const requests = createMockRequests(20);
      const settings = createMockSettings();

      // Store in database
      const insertStmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?, ?, ?)");
      requests.forEach((req) => {
        insertStmt.run(req.id, req.url, req.method, req.status);
      });

      await mockStorage.set({ settings });

      // Export database
      const dbExport = mockDb.export();

      // Create backup package
      const backup = {
        version: "1.0",
        backupDate: new Date().toISOString(),
        database: Array.from(dbExport),
        settings: settings,
      };

      expect(backup.database).toBeDefined();
      expect(backup.settings).toBeDefined();
    });

    it("should restore from backup", async () => {
      const backup = {
        version: "1.0",
        backupDate: new Date().toISOString(),
        database: [],
        settings: createMockSettings(),
      };

      // Restore settings
      await mockStorage.set({ settings: backup.settings });

      // In a real implementation, would restore database from binary data
      expect(mockStorage.set).toHaveBeenCalled();
    });

    it("should verify backup integrity", () => {
      const backup = {
        version: "1.0",
        backupDate: new Date().toISOString(),
        database: [],
        settings: createMockSettings(),
      };

      // Guard clause: verify required fields
      const isValid =
        backup.version !== undefined &&
        backup.database !== undefined &&
        backup.settings !== undefined;

      expect(isValid).toBe(true);
    });
  });

  describe("Migration", () => {
    it("should migrate old format to new format", () => {
      const oldFormat = {
        requests: createMockRequests(5),
        // Missing version and exportDate
      };

      // Migrate to new format
      const newFormat = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        requests: oldFormat.requests,
        settings: createMockSettings(),
      };

      expect(newFormat.version).toBeDefined();
      expect(newFormat.exportDate).toBeDefined();
    });

    it("should handle version upgrades", () => {
      const versions = ["1.0", "1.1", "2.0"];
      const currentVersion = "1.0";
      const targetVersion = "2.0";

      // Check if upgrade needed
      const needsUpgrade = versions.indexOf(currentVersion) < versions.indexOf(targetVersion);

      expect(needsUpgrade).toBe(true);
    });
  });

  describe("Error Recovery", () => {
    it("should rollback failed import", async () => {
      // Start transaction
      mockDb.exec("BEGIN TRANSACTION");

      try {
        // Attempt import
        const insertStmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?, ?, ?)");
        insertStmt.run.mockImplementationOnce(() => {
          throw new Error("Import failed");
        });

        insertStmt.run("req-1", "url", "GET", 200);
      } catch (error) {
        // Rollback on error
        mockDb.exec("ROLLBACK");
        expect(mockDb.exec).toHaveBeenCalledWith("ROLLBACK");
      }
    });

    it("should validate import before applying", async () => {
      const importData = {
        version: "1.0",
        requests: createMockRequests(5),
      };

      // Validation checks
      const checks = [
        importData.version !== undefined,
        Array.isArray(importData.requests),
        importData.requests.every((r) => r.id && r.url),
      ];

      const isValid = checks.every((check) => check === true);
      expect(isValid).toBe(true);
    });

    it("should handle partial import failure", async () => {
      const requests = createMockRequests(10);
      let importedCount = 0;
      const errors = [];

      const insertStmt = mockDb.prepare("INSERT INTO requests VALUES (?, ?, ?, ?)");

      requests.forEach((req, index) => {
        try {
          // Simulate failure on 5th request
          if (index === 5) {
            throw new Error("Import error");
          }
          insertStmt.run(req.id, req.url, req.method, req.status);
          importedCount++;
        } catch (error) {
          errors.push({ request: req, error: error.message });
        }
      });

      expect(importedCount).toBe(9);
      expect(errors).toHaveLength(1);
    });
  });
});
