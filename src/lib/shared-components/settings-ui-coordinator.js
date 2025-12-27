/**
 * Settings UI Coordinator for Universal Request Analyzer
 * 
 * This module wraps settings-manager-core and adds UI-specific functionality.
 * It coordinates between core settings, theme-manager, feature-flags, and acl-manager.
 * 
 * ⚠️ DO NOT import this in background/service worker contexts!
 * Use settings-manager-core.js instead.
 */

import settingsManagerCore from "./settings-manager-core.js";
import featureFlags from "../../config/feature-flags.js";
import aclManager from "../../auth/acl-manager.js";
import themeManager from "../ui/theme-manager.js"; // Updated path

/**
 * Settings UI Coordinator class
 * Extends core functionality with UI-specific features
 */
class SettingsUICoordinator {
  constructor() {
    this.core = settingsManagerCore;
    this.initialized = false;
  }

  /**
   * Set database manager (delegates to core)
   * @param {Object} dbManager - Database manager instance
   */
  setDatabaseManager(dbManager) {
    this.core.setDatabaseManager(dbManager);
  }

  /**
   * Initialize the UI coordinator
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      console.log("[SettingsUI] Initializing UI coordinator...");

      // Initialize core first
      await this.core.initialize();
      
      // Ensure settings are loaded and have default structure
      if (!this.core.settings || !this.core.settings.variables) {
        console.warn("[SettingsUI] Settings not fully loaded, applying defaults...");
        this.core.settings = this.core.settings || {};
        this.core.settings.variables = this.core.settings.variables || {
          enabled: true,
          autoDetect: true,
          list: []
        };
      }

      // Initialize feature flags
      await featureFlags.initialize({
        permissionLevel: "basic",
        initialFlags: {
          // Disable online features by default for testing
          onlineSync: false,
          authentication: false,
          remoteStorage: false,
          cloudExport: false,
          teamSharing: false,
        },
        onUpdate: this.handleFeatureFlagsUpdate.bind(this),
      });

      // Initialize ACL manager
      await aclManager.initialize({
        initialRole: "powerUser", // Use powerUser role for testing
        onUpdate: this.handleAclUpdate.bind(this),
      });

      // Initialize theme manager (only in browser context with document)
      if (typeof document !== "undefined") {
        // Get theme preference from core
        const themePreference = this.core.getThemePreference();
        
        await themeManager.initialize({
          initialTheme: themePreference,
          onUpdate: this.handleThemeUpdate.bind(this),
        });
      } else {
        console.warn("[SettingsUI] Document not available, skipping theme manager initialization");
      }

      this.initialized = true;

      console.log("[SettingsUI] Initialized successfully:", {
        coreSettings: this.core.getSettings(),
        featureFlags: featureFlags.flags,
        role: aclManager.currentRole,
        theme: typeof document !== "undefined" ? themeManager.currentTheme : "N/A (no document)",
      });
    } catch (error) {
      console.error("[SettingsUI] Error during initialization:", error);
      // Re-throw with more context
      const enhancedError = new Error(`Settings UI initialization failed: ${error.message}`);
      enhancedError.originalError = error;
      throw enhancedError;
    }
  }

  /**
   * Get all settings including UI-specific data
   * @returns {Object} All settings
   */
  getAllSettings() {
    return {
      settings: this.core.getSettings(),
      featureFlags: featureFlags.getFeatureInfo(),
      acl: {
        role: aclManager.currentRole,
        roles: aclManager.getRolesInfo(),
        permissions: aclManager.getPermissionsInfo(),
      },
      theme: {
        current: typeof document !== "undefined" ? themeManager.currentTheme : this.core.getThemePreference(),
        themes: typeof document !== "undefined" ? themeManager.getThemesInfo() : [],
      },
    };
  }

  /**
   * Get settings (delegates to core)
   * @returns {Object} Current settings
   */
  getSettings() {
    return this.core.getSettings();
  }

  /**
   * Update settings (delegates to core)
   * @param {Object} newSettings - New settings to apply
   * @returns {Promise<boolean>} Success status
   */
  async updateSettings(newSettings) {
    return await this.core.updateSettings(newSettings);
  }

  /**
   * Update feature flags
   * @param {Object} flags - Feature flags to update
   * @returns {Promise<boolean>} Success status
   */
  async updateFeatureFlags(flags) {
    return await featureFlags.updateFeatures(flags);
  }

  /**
   * Set user role
   * @param {string} role - Role to set
   * @returns {Promise<boolean>} Success status
   */
  async setRole(role) {
    return await aclManager.setRole(role);
  }

  /**
   * Set theme (applies via theme-manager AND saves preference to core)
   * @param {string} themeId - Theme ID to set
   * @returns {Promise<boolean>} Success status
   */
  async setTheme(themeId) {
    if (typeof document === "undefined") {
      console.warn("[SettingsUI] setTheme called without document - saving preference only");
      return await this.core.setThemePreference(themeId);
    }

    try {
      // Apply theme via theme-manager (DOM operations)
      const success = await themeManager.setTheme(themeId);
      
      // Save preference to core (database + storage)
      if (success) {
        await this.core.setThemePreference(themeId);
      }
      
      return success;
    } catch (error) {
      console.error("[SettingsUI] Failed to set theme:", error);
      return false;
    }
  }

  /**
   * Reset all settings to defaults
   * @returns {Promise<boolean>} Success status
   */
  async resetAllToDefaults() {
    try {
      // Reset core settings
      await this.core.resetAllToDefaults();

      // Reset feature flags, ACL, and theme
      await featureFlags.resetToDefaults();
      await aclManager.resetToDefaults();
      
      if (typeof document !== "undefined") {
        await themeManager.resetToDefaults();
      }

      return true;
    } catch (error) {
      console.error("[SettingsUI] Error resetting settings:", error);
      return false;
    }
  }

  /**
   * Export settings including UI-specific data
   * @returns {Object} Settings data for export
   */
  exportSettings() {
    const coreExport = this.core.exportSettings();
    
    return {
      ...coreExport,
      featureFlags: featureFlags.getFeatureInfo(),
      acl: {
        role: aclManager.currentRole,
        roles: aclManager.getRolesInfo(),
        permissions: aclManager.getPermissionsInfo(),
      },
      theme: {
        current: typeof document !== "undefined" ? themeManager.currentTheme : this.core.getThemePreference(),
        themes: typeof document !== "undefined" ? themeManager.getThemesInfo() : [],
      },
    };
  }

  /**
   * Import settings including UI-specific data
   * @param {Object} importData - Data to import
   * @returns {Promise<boolean>} Success status
   */
  async importSettings(importData) {
    try {
      // Import core settings
      await this.core.importSettings(importData);

      // Update feature flags if present
      if (importData.featureFlags) {
        await featureFlags.updateFeatures(importData.featureFlags);
      }

      // Update ACL if present
      if (importData.acl) {
        await aclManager.setRole(importData.acl.role);
      }

      // Update theme if present
      if (importData.theme && typeof document !== "undefined") {
        await this.setTheme(importData.theme.current);
      }

      return true;
    } catch (error) {
      console.error("[SettingsUI] Failed to import settings:", error);
      return false;
    }
  }

  /**
   * Handle feature flags update
   * @param {Object} flags - Updated feature flags
   */
  handleFeatureFlagsUpdate(flags) {
    console.log("[SettingsUI] Feature flags updated:", flags);
  }

  /**
   * Handle ACL update
   * @param {Object} aclData - Updated ACL data
   */
  handleAclUpdate(aclData) {
    console.log("[SettingsUI] ACL updated:", aclData);
  }

  /**
   * Handle theme update
   * @param {Object} themeData - Updated theme data
   */
  handleThemeUpdate(themeData) {
    console.log("[SettingsUI] Theme updated:", themeData);
    // Save theme preference to core
    if (themeData.theme) {
      this.core.setThemePreference(themeData.theme);
    }
  }

  // Delegate variable methods to core
  getVariables() {
    return this.core.getVariables();
  }

  async addVariable(variable) {
    return await this.core.addVariable(variable);
  }

  async updateVariable(id, updates) {
    return await this.core.updateVariable(id, updates);
  }

  async deleteVariable(id) {
    return await this.core.deleteVariable(id);
  }

  isValidVariableName(name) {
    return this.core.isValidVariableName(name);
  }

  substituteVariables(text) {
    return this.core.substituteVariables(text);
  }

  createVariablePlaceholders(text, patterns = []) {
    return this.core.createVariablePlaceholders(text, patterns);
  }

  // Delegate listener methods to core
  addSettingsListener(callback) {
    this.core.addSettingsListener(callback);
  }

  removeSettingsListener(callback) {
    this.core.removeSettingsListener(callback);
  }

  // Expose core for direct access if needed
  getCore() {
    return this.core;
  }
}

// Create and export singleton instance
const settingsUICoordinator = new SettingsUICoordinator();

export default settingsUICoordinator;
