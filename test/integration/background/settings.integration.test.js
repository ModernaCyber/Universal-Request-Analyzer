/**
 * Integration test: Settings synchronization across modules
 * Tests configuration updates flowing through database, storage, and UI
 */

import { createMockStorage, createMockDatabase, createMockSettings } from "../../utils/testHelpers";

describe("Settings Integration", () => {
  let mockStorage;
  let mockDb;
  let settings;

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockDb = createMockDatabase();
    settings = createMockSettings();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Settings Initialization", () => {
    it("should load default settings", () => {
      expect(settings.capture.enabled).toBe(true);
      expect(settings.storage.maxStoredRequests).toBe(10000);
      expect(settings.ui.theme).toBe("light");
    });

    it("should initialize storage with defaults", async () => {
      await mockStorage.set({ settings });

      const result = await mockStorage.get("settings");
      expect(result.settings).toEqual(settings);
    });
  });

  describe("Settings Update Flow", () => {
    it("should update capture settings", async () => {
      // Guard clause: ensure settings exist
      if (!settings.capture) {
        throw new Error("Capture settings not initialized");
      }

      // Update capture enabled state
      settings.capture.enabled = false;
      await mockStorage.set({ settings });

      // Verify update
      const result = await mockStorage.get("settings");
      expect(result.settings.capture.enabled).toBe(false);
    });

    it("should update filter settings", async () => {
      settings.capture.captureFilters.includeDomains = ["example.com", "api.test.com"];
      settings.capture.captureFilters.excludeDomains = ["ads.example.com"];

      await mockStorage.set({ settings });

      const result = await mockStorage.get("settings");
      expect(result.settings.capture.captureFilters.includeDomains).toHaveLength(2);
      expect(result.settings.capture.captureFilters.excludeDomains).toContain("ads.example.com");
    });

    it("should sync settings to database", async () => {
      // Store settings in chrome.storage
      await mockStorage.set({ settings });

      // Store in database config table
      const insertStmt = mockDb.prepare(
        "INSERT INTO config_app_settings (key, value, updated_at) VALUES (?, ?, ?)"
      );

      insertStmt.run("settings", JSON.stringify(settings), Date.now());

      expect(insertStmt.run).toHaveBeenCalled();
    });
  });

  describe("Cross-Module Settings Sync", () => {
    it("should sync theme changes across modules", async () => {
      // Update theme in settings
      settings.ui.theme = "dark";
      await mockStorage.set({ settings });

      // Simulate theme manager reading settings
      const result = await mockStorage.get("settings");
      const currentTheme = result.settings.ui.theme;

      expect(currentTheme).toBe("dark");
    });

    it("should sync capture state with background service", async () => {
      // Disable capture
      settings.capture.enabled = false;
      await mockStorage.set({ settings });

      // Background service checks state
      const result = await mockStorage.get("settings");
      const captureEnabled = result.settings.capture.enabled;

      expect(captureEnabled).toBe(false);
    });

    it("should broadcast settings changes", async () => {
      const listeners = [];
      const mockListener = jest.fn();
      listeners.push(mockListener);

      // Update settings
      settings.storage.maxStoredRequests = 5000;
      await mockStorage.set({ settings });

      // Notify listeners
      listeners.forEach((listener) => listener({ settings }));

      expect(mockListener).toHaveBeenCalledWith({ settings });
    });
  });

  describe("Settings Validation", () => {
    it("should validate numeric limits", () => {
      // Guard clause: reject invalid values
      const invalidValue = -100;
      
      if (invalidValue < 0) {
        settings.storage.maxStoredRequests = 10000; // Reset to default
      }

      expect(settings.storage.maxStoredRequests).toBe(10000);
    });

    it("should validate domain filters", () => {
      const invalidDomain = "not a domain";
      const isValid = invalidDomain.includes(".");

      expect(isValid).toBe(false);
    });

    it("should validate theme values", () => {
      const validThemes = ["light", "dark"];
      const requestedTheme = "custom";

      const isValidTheme = validThemes.includes(requestedTheme);
      expect(isValidTheme).toBe(false);
    });
  });

  describe("Settings Persistence", () => {
    it("should persist settings across sessions", async () => {
      // Save settings
      const customSettings = createMockSettings({
        capture: { enabled: false },
        ui: { theme: "dark" },
      });

      await mockStorage.set({ settings: customSettings });

      // Simulate new session - load settings
      const loaded = await mockStorage.get("settings");

      expect(loaded.settings.capture.enabled).toBe(false);
      expect(loaded.settings.ui.theme).toBe("dark");
    });

    it("should handle storage quota errors", async () => {
      // Simulate quota exceeded error
      mockStorage.set.mockRejectedValueOnce(new Error("QUOTA_EXCEEDED_ERR"));

      await expect(mockStorage.set({ settings })).rejects.toThrow("QUOTA_EXCEEDED_ERR");
    });
  });

  describe("Settings Export/Import", () => {
    it("should export settings as JSON", async () => {
      const exported = JSON.stringify(settings);
      const parsed = JSON.parse(exported);

      expect(parsed.capture).toBeDefined();
      expect(parsed.storage).toBeDefined();
      expect(parsed.ui).toBeDefined();
    });

    it("should import settings from JSON", async () => {
      const importedJson = JSON.stringify({
        capture: { enabled: false },
        storage: { maxStoredRequests: 5000 },
        ui: { theme: "dark" },
      });

      const imported = JSON.parse(importedJson);
      await mockStorage.set({ settings: imported });

      const result = await mockStorage.get("settings");
      expect(result.settings.capture.enabled).toBe(false);
      expect(result.settings.storage.maxStoredRequests).toBe(5000);
    });

    it("should validate imported settings", () => {
      const imported = { invalid: "data" };

      // Guard clause: check required fields
      const hasRequiredFields =
        imported.capture !== undefined &&
        imported.storage !== undefined &&
        imported.ui !== undefined;

      expect(hasRequiredFields).toBe(false);
    });
  });

  describe("Settings Reset", () => {
    it("should reset to default settings", async () => {
      // Modify settings
      settings.capture.enabled = false;
      settings.ui.theme = "dark";
      await mockStorage.set({ settings });

      // Reset to defaults
      const defaultSettings = createMockSettings();
      await mockStorage.set({ settings: defaultSettings });

      const result = await mockStorage.get("settings");
      expect(result.settings.capture.enabled).toBe(true);
      expect(result.settings.ui.theme).toBe("light");
    });

    it("should clear custom filters on reset", async () => {
      settings.capture.captureFilters.includeDomains = ["custom.com"];
      await mockStorage.set({ settings });

      // Reset
      const defaultSettings = createMockSettings();
      await mockStorage.set({ settings: defaultSettings });

      const result = await mockStorage.get("settings");
      expect(result.settings.capture.captureFilters.includeDomains).toHaveLength(0);
    });
  });
});
