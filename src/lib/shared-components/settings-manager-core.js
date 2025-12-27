/**
 * Settings Manager Core for Universal Request Analyzer
 * 
 * This is a background-safe module with NO UI dependencies.
 * Can be safely imported in service workers.
 * Handles only core settings, database, and storage operations.
 */

// Cross-browser API support
const browserAPI = globalThis.browser || globalThis.chrome;

// Database config manager reference (will be injected)
let configSchemaManager = null;

/**
 * Settings manager core class (background-safe)
 */
class SettingsManagerCore {
  constructor() {
    this.initialized = false;
    this.settings = {
      general: {
        maxStoredRequests: 10000,
        autoStartCapture: true,
        showNotifications: true,
        confirmClearRequests: true,
        defaultExportFormat: "json",
        dateFormat: "yyyy-MM-dd HH:mm:ss",
        timeZone: "local",
        autoExport: false,
        autoExportInterval: 3600000, // 1 hour
        exportPath: "",
      },
      capture: {
        enabled: true,
        includeHeaders: true,
        includeTiming: true,
        includeContent: false,
        maxContentSize: 1024 * 1024,
        captureWebSockets: false,
        captureServerSentEvents: false,
        performanceMetrics: {
          enabled: false,
          samplingRate: 100,
          captureNavigationTiming: true,
          captureResourceTiming: true,
          captureServerTiming: false,
          captureCustomMetrics: false,
          retentionPeriod: 7 * 24 * 60 * 60 * 1000,
        },
        captureFilters: {
          includeDomains: [],
          excludeDomains: [],
          includeTypes: [
            "xmlhttprequest",
            "fetch",
            "script",
            "stylesheet",
            "image",
            "font",
            "other",
          ],
        },
      },
      display: {
        requestsPerPage: 50,
        expandedDetails: false,
        showStatusColors: true,
        showTimingBars: true,
        defaultTab: "requests",
        showCharts: true,
        enabledCharts: [
          "responseTime",
          "statusCodes",
          "domains",
          "requestTypes",
          "timeDistribution",
        ],
        columnOrder: [
          "method",
          "domain",
          "path",
          "status",
          "type",
          "size",
          "duration",
          "time",
        ],
      },
      advanced: {
        enableDebugMode: false,
        persistFilters: true,
        useCompression: true,
        backgroundMode: "persistent",
        syncInterval: 60,
        sqliteExport: {
          enabled: false,
          autoVacuum: true,
          vacuumInterval: 3600000,
        },
      },
      variables: {
        enabled: true,
        autoDetect: true,
        list: [],
      },
      // Store theme preference as string only (no DOM operations)
      theme: {
        current: "light", // 'light' | 'dark' | 'highContrast' | 'blue' | 'system'
      },
    };

    // Add event listeners for settings changes
    if (browserAPI && browserAPI.runtime) {
      browserAPI.runtime.onMessage.addListener(
        (message, sender, sendResponse) => {
          if (message.action === "settingsUpdated") {
            this.handleSettingsUpdate(message.settings);
            sendResponse({ success: true });
          }
        }
      );
    }
  }

  /**
   * Set database manager for config persistence
   * @param {Object} dbManager - Database manager instance with config access
   */
  setDatabaseManager(dbManager) {
    configSchemaManager = dbManager;
    console.log("[SettingsCore] Database manager injected");
  }

  /**
   * Initialize the settings manager core
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log("[SettingsCore] Initializing...");
      
      // Load saved settings from storage first (fast)
      const data = await this.loadFromStorage();

      // If database is available, load from there as source of truth
      if (configSchemaManager) {
        try {
          const dbSettings = await this.loadFromDatabase();
          if (dbSettings && Object.keys(dbSettings).length > 0) {
            // Database is source of truth, merge with defaults
            this.settings = this.mergeSettings(this.settings, dbSettings);
            // Sync to storage for content script access
            await this.saveToStorage();
            console.log("[SettingsCore] Loaded from database and synced to storage");
          } else if (data && data.settings) {
            // No DB settings yet, use storage
            this.settings = this.mergeSettings(this.settings, data.settings);
          }
        } catch (dbError) {
          console.warn("[SettingsCore] Failed to load from database, using storage:", dbError);
          if (data && data.settings) {
            this.settings = this.mergeSettings(this.settings, data.settings);
          }
        }
      } else {
        // No database available, use storage only
        if (data && data.settings) {
          this.settings = this.mergeSettings(this.settings, data.settings);
        }
      }

      this.initialized = true;

      // Save the merged settings
      await this.saveToStorage();

      console.log("[SettingsCore] Initialized successfully");
    } catch (error) {
      console.error("[SettingsCore] Error during initialization:", error);
    }
  }

  /**
   * Load settings from storage
   * @returns {Promise<Object>}
   */
  async loadFromStorage() {
    if (!browserAPI || !browserAPI.storage) {
      return null;
    }

    return new Promise((resolve) => {
      browserAPI.storage.local.get("settings", (data) => {
        resolve(data.settings || null);
      });
    });
  }

  /**
   * Load settings from database config tables
   * @returns {Promise<Object|null>}
   */
  async loadFromDatabase() {
    if (!configSchemaManager) {
      return null;
    }

    try {
      const settings = {
        capture: {},
        general: {},
        display: {},
        advanced: {},
        variables: {
          enabled: true,
          autoDetect: true,
          list: [],
        },
        theme: {
          current: "light",
        },
      };

      // Load capture settings
      const captureSettings = await configSchemaManager.getSettingsByCategory(
        "capture"
      );
      if (captureSettings && Object.keys(captureSettings).length > 0) {
        settings.capture = captureSettings;
      }

      // Load general settings
      const generalSettings = await configSchemaManager.getSettingsByCategory(
        "general"
      );
      if (generalSettings && Object.keys(generalSettings).length > 0) {
        settings.general = generalSettings;
      }

      // Load display settings
      const displaySettings = await configSchemaManager.getSettingsByCategory(
        "display"
      );
      if (displaySettings && Object.keys(displaySettings).length > 0) {
        settings.display = displaySettings;
      }

      // Load advanced settings
      const advancedSettings = await configSchemaManager.getSettingsByCategory(
        "advanced"
      );
      if (advancedSettings && Object.keys(advancedSettings).length > 0) {
        settings.advanced = advancedSettings;
      }

      // Load variables settings
      const variablesSettings = await configSchemaManager.getSettingsByCategory(
        "variables"
      );
      if (variablesSettings && Object.keys(variablesSettings).length > 0) {
        settings.variables = variablesSettings;
      }

      // Load theme preference (string only)
      const themeSettings = await configSchemaManager.getSettingsByCategory(
        "theme"
      );
      if (themeSettings && Object.keys(themeSettings).length > 0) {
        settings.theme = themeSettings;
      }

      return settings;
    } catch (error) {
      console.error("[SettingsCore] Failed to load from database:", error);
      return null;
    }
  }

  /**
   * Save settings to storage
   * @returns {Promise<void>}
   */
  async saveToStorage() {
    if (!browserAPI || !browserAPI.storage) {
      return;
    }

    // Save to storage (for content script access)
    await new Promise((resolve) => {
      browserAPI.storage.local.set(
        {
          settings: {
            settings: this.settings,
            timestamp: Date.now(),
          },
        },
        resolve
      );
    });

    // Also save to database (source of truth)
    await this.saveToDatabase();
  }

  /**
   * Save settings to database config tables
   * @returns {Promise<void>}
   */
  async saveToDatabase() {
    if (!configSchemaManager) {
      return;
    }

    try {
      // Save each category of settings to database
      for (const [category, values] of Object.entries(this.settings)) {
        if (typeof values === "object" && values !== null) {
          for (const [key, value] of Object.entries(values)) {
            const fullKey = `${category}.${key}`;
            await configSchemaManager.setAppSetting(fullKey, value, {
              category,
              description: `${category} setting: ${key}`,
            });
          }
        }
      }
      console.log("[SettingsCore] Settings saved to database");
    } catch (error) {
      console.error("[SettingsCore] Failed to save to database:", error);
    }
  }

  /**
   * Merge settings objects
   * @param {Object} defaultSettings - Default settings
   * @param {Object} userSettings - User settings
   * @returns {Object} - Merged settings
   */
  mergeSettings(defaultSettings, userSettings) {
    const result = { ...defaultSettings };

    for (const [category, values] of Object.entries(userSettings)) {
      if (
        typeof values === "object" &&
        values !== null &&
        category in defaultSettings
      ) {
        result[category] = { ...defaultSettings[category], ...values };
      }
    }

    return result;
  }

  /**
   * Get all settings
   * @returns {Object} - All settings
   */
  getAllSettings() {
    return {
      settings: this.settings,
    };
  }

  /**
   * Get settings
   * @returns {Object} Current settings object
   */
  getSettings() {
    return this.settings;
  }

  /**
   * Update settings with persistence and synchronization
   * @param {Object} newSettings - New settings to apply
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async updateSettings(newSettings) {
    try {
      this.settings = this.mergeSettings(this.settings, newSettings);
      await this.saveToStorage();
      await this.broadcastSettingsUpdate(this.settings);
      this.notifySettingsListeners();
      return true;
    } catch (error) {
      console.error("[SettingsCore] Failed to update settings:", error);
      return false;
    }
  }

  /**
   * Broadcast settings update to all extension views
   * @param {Object} settings - Updated settings
   * @returns {Promise<void>}
   */
  async broadcastSettingsUpdate(settings) {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      await chrome.runtime.sendMessage({
        action: "settingsUpdated",
        settings: settings,
      });
    }
  }

  /**
   * Handle settings update from other views
   * @param {Object} settings - Updated settings
   */
  handleSettingsUpdate(settings) {
    this.settings = this.mergeSettings(this.settings, settings);
    this.notifySettingsListeners();
  }

  // Add settings change listener
  addSettingsListener(callback) {
    if (!this.settingsListeners) {
      this.settingsListeners = new Set();
    }
    this.settingsListeners.add(callback);
  }

  // Remove settings change listener
  removeSettingsListener(callback) {
    if (this.settingsListeners) {
      this.settingsListeners.delete(callback);
    }
  }

  // Notify all settings listeners
  notifySettingsListeners() {
    if (this.settingsListeners) {
      this.settingsListeners.forEach((callback) => {
        try {
          callback(this.settings);
        } catch (error) {
          console.error("[SettingsCore] Error in settings listener:", error);
        }
      });
    }
  }

  /**
   * Reset all settings to defaults
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async resetAllToDefaults() {
    try {
      // Reset settings
      this.settings = {
        general: {
          maxStoredRequests: 10000,
          autoStartCapture: true,
          showNotifications: true,
          confirmClearRequests: true,
          defaultExportFormat: "json",
          dateFormat: "yyyy-MM-dd HH:mm:ss",
          timeZone: "local",
          autoExport: false,
          autoExportInterval: 3600000,
          exportPath: "",
        },
        capture: {
          enabled: true,
          includeHeaders: true,
          includeTiming: true,
          includeContent: false,
          maxContentSize: 1024 * 1024,
          captureWebSockets: false,
          captureServerSentEvents: false,
          performanceMetrics: {
            enabled: false,
            samplingRate: 100,
            captureNavigationTiming: true,
            captureResourceTiming: true,
            captureServerTiming: false,
            captureCustomMetrics: false,
            retentionPeriod: 7 * 24 * 60 * 60 * 1000,
          },
          captureFilters: {
            includeDomains: [],
            excludeDomains: [],
            includeTypes: [
              "xmlhttprequest",
              "fetch",
              "script",
              "stylesheet",
              "image",
              "font",
              "other",
            ],
          },
        },
        display: {
          requestsPerPage: 50,
          expandedDetails: false,
          showStatusColors: true,
          showTimingBars: true,
          defaultTab: "requests",
          showCharts: true,
          enabledCharts: [
            "responseTime",
            "statusCodes",
            "domains",
            "requestTypes",
            "timeDistribution",
          ],
          columnOrder: [
            "method",
            "domain",
            "path",
            "status",
            "type",
            "size",
            "duration",
            "time",
          ],
        },
        advanced: {
          enableDebugMode: false,
          persistFilters: true,
          useCompression: true,
          backgroundMode: "persistent",
          syncInterval: 60,
          sqliteExport: {
            enabled: false,
            autoVacuum: true,
            vacuumInterval: 3600000,
          },
        },
        theme: {
          current: "light",
        },
      };

      // Save settings
      await this.saveToStorage();

      return true;
    } catch (error) {
      console.error("[SettingsCore] Error resetting settings:", error);
      return false;
    }
  }

  /**
   * Export settings to a file
   * @returns {Object} Settings data for export
   */
  exportSettings() {
    const exportData = {
      settings: this.settings,
      exportMeta: {
        version: chrome.runtime.getManifest().version,
        timestamp: Date.now(),
      },
    };
    return exportData;
  }

  /**
   * Import settings from exported data
   * @param {Object} importData - Data to import
   * @returns {Promise<boolean>} Whether the import was successful
   */
  async importSettings(importData) {
    try {
      // Validate import data
      if (!this.validateImportData(importData)) {
        throw new Error("Invalid import data format");
      }

      // Update settings
      this.settings = this.mergeSettings(this.settings, importData.settings);

      // Save to storage
      await this.saveToStorage();

      // Broadcast update
      await this.broadcastSettingsUpdate(this.settings);

      // Notify listeners
      this.notifySettingsListeners();

      return true;
    } catch (error) {
      console.error("[SettingsCore] Failed to import settings:", error);
      return false;
    }
  }

  /**
   * Validate import data format
   * @param {Object} data - Data to validate
   * @returns {boolean} Whether the data is valid
   */
  validateImportData(data) {
    // Check if required properties exist
    if (!data || !data.settings || !data.exportMeta) {
      return false;
    }

    // Check version compatibility
    const currentVersion = chrome.runtime.getManifest().version;
    const importVersion = data.exportMeta.version;

    // Simple version comparison
    if (currentVersion !== importVersion) {
      console.warn(
        `[SettingsCore] Version mismatch: current=${currentVersion}, import=${importVersion}`
      );
    }

    // Validate settings structure
    const requiredSections = ["general", "capture", "display", "advanced"];
    return requiredSections.every(
      (section) =>
        typeof data.settings[section] === "object" &&
        data.settings[section] !== null
    );
  }

  /**
   * Get all variables
   * @returns {Array} List of variables
   */
  getVariables() {
    return this.settings.variables?.list || [];
  }

  /**
   * Add a new variable
   * @param {Object} variable - Variable object { name, value, description }
   * @returns {Promise<boolean>} Success status
   */
  async addVariable(variable) {
    try {
      if (!variable.name || !this.isValidVariableName(variable.name)) {
        throw new Error(
          "Invalid variable name. Use alphanumeric characters and underscores only."
        );
      }

      // Check for duplicates
      const existingIndex = this.settings.variables.list.findIndex(
        (v) => v.name === variable.name
      );

      if (existingIndex !== -1) {
        throw new Error(`Variable "${variable.name}" already exists`);
      }

      const newVariable = {
        id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: variable.name,
        value: variable.value || "",
        description: variable.description || "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      this.settings.variables.list.push(newVariable);

      await this.saveToStorage();
      await this.broadcastSettingsUpdate(this.settings);

      return true;
    } catch (error) {
      console.error("[SettingsCore] Failed to add variable:", error);
      throw error;
    }
  }

  /**
   * Update an existing variable
   * @param {string} id - Variable ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>} Success status
   */
  async updateVariable(id, updates) {
    try {
      const index = this.settings.variables.list.findIndex((v) => v.id === id);

      if (index === -1) {
        throw new Error(`Variable with ID "${id}" not found`);
      }

      // If changing name, validate and check for duplicates
      if (
        updates.name &&
        updates.name !== this.settings.variables.list[index].name
      ) {
        if (!this.isValidVariableName(updates.name)) {
          throw new Error("Invalid variable name");
        }

        const duplicate = this.settings.variables.list.find(
          (v) => v.name === updates.name && v.id !== id
        );

        if (duplicate) {
          throw new Error(`Variable "${updates.name}" already exists`);
        }
      }

      this.settings.variables.list[index] = {
        ...this.settings.variables.list[index],
        ...updates,
        updatedAt: Date.now(),
      };

      await this.saveToStorage();
      await this.broadcastSettingsUpdate(this.settings);

      return true;
    } catch (error) {
      console.error("[SettingsCore] Failed to update variable:", error);
      throw error;
    }
  }

  /**
   * Delete a variable
   * @param {string} id - Variable ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteVariable(id) {
    try {
      const index = this.settings.variables.list.findIndex((v) => v.id === id);

      if (index === -1) {
        throw new Error(`Variable with ID "${id}" not found`);
      }

      this.settings.variables.list.splice(index, 1);

      await this.saveToStorage();
      await this.broadcastSettingsUpdate(this.settings);

      return true;
    } catch (error) {
      console.error("[SettingsCore] Failed to delete variable:", error);
      throw error;
    }
  }

  /**
   * Validate variable name format
   * @param {string} name - Variable name to validate
   * @returns {boolean} Whether the name is valid
   */
  isValidVariableName(name) {
    // Allow alphanumeric characters and underscores, must start with letter or underscore
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name);
  }

  /**
   * Substitute variables in text
   * @param {string} text - Text containing ${VAR_NAME} placeholders
   * @returns {string} Text with variables substituted
   */
  substituteVariables(text) {
    if (!text) return text;

    let result = text;
    const variables = this.getVariables();

    variables.forEach((variable) => {
      const placeholder = `\${${variable.name}}`;
      const regex = new RegExp(
        placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "g"
      );
      result = result.replace(regex, variable.value);
    });

    return result;
  }

  /**
   * Detect and create variable placeholders in text
   * @param {string} text - Text to analyze
   * @param {Array} patterns - Patterns to detect { regex, variableName }
   * @returns {string} Text with sensitive values replaced by ${VAR_NAME}
   */
  createVariablePlaceholders(text, patterns = []) {
    if (!text) return text;

    let result = text;
    const variables = this.getVariables();

    // Replace known variable values with placeholders
    variables.forEach((variable) => {
      if (variable.value && variable.value.length > 0) {
        const escaped = variable.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "g");
        result = result.replace(regex, `\${${variable.name}}`);
      }
    });

    // Apply custom patterns
    patterns.forEach((pattern) => {
      result = result.replace(pattern.regex, (match) => {
        return `\${${pattern.variableName}}`;
      });
    });

    return result;
  }

  /**
   * Get theme preference (string only, no DOM operations)
   * @returns {string} Current theme ID
   */
  getThemePreference() {
    return this.settings.theme?.current || "light";
  }

  /**
   * Set theme preference (string only, no DOM operations)
   * Background saves preference; UI applies it via theme-manager
   * @param {string} themeId - Theme ID to set
   * @returns {Promise<boolean>} Success status
   */
  async setThemePreference(themeId) {
    try {
      this.settings.theme = { current: themeId };
      await this.saveToStorage();
      await this.broadcastSettingsUpdate(this.settings);
      return true;
    } catch (error) {
      console.error("[SettingsCore] Failed to set theme preference:", error);
      return false;
    }
  }
}

// Create and export singleton instance
const settingsManagerCore = new SettingsManagerCore();

export default settingsManagerCore;
