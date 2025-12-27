/**
 * Feature Flags System for Universal Request Analyzer
 *
 * This module provides a centralized way to enable/disable features
 * and control access to functionality based on user permissions.
 */

// Default feature flags configuration
const DEFAULT_FEATURE_FLAGS = {
  // Core features
  captureRequests: true,
  filterRequests: true,
  exportData: true,
  statistics: true,
  visualization: true,

  // Online features (disabled by default for local testing)
  onlineSync: false,
  authentication: false,
  remoteStorage: false,
  cloudExport: false,
  teamSharing: false,

  // Advanced features
  requestModification: false,
  requestMocking: false,
  automatedTesting: false,
  performanceAlerts: false,
  customRules: false,

  // Experimental features
  aiAnalysis: false,
  predictiveAnalytics: false,
  securityScanning: false,
};

// Feature dependencies - features that require other features to be enabled
const FEATURE_DEPENDENCIES = {
  teamSharing: ['authentication', 'onlineSync'],
  cloudExport: ['authentication'],
  remoteStorage: ['authentication', 'onlineSync'],
  aiAnalysis: ['statistics'],
  predictiveAnalytics: ['statistics', 'aiAnalysis'],
  securityScanning: ['requestModification'],
};

// Feature permissions - minimum permission level required for each feature
const FEATURE_PERMISSIONS = {
  captureRequests: 'basic',
  filterRequests: 'basic',
  exportData: 'basic',
  statistics: 'basic',
  visualization: 'basic',

  onlineSync: 'standard',
  authentication: 'basic',
  remoteStorage: 'standard',
  cloudExport: 'standard',

  requestModification: 'advanced',
  requestMocking: 'advanced',
  automatedTesting: 'advanced',
  performanceAlerts: 'advanced',

  teamSharing: 'team',
  customRules: 'advanced',

  aiAnalysis: 'premium',
  predictiveAnalytics: 'premium',
  securityScanning: 'premium',
};

// Permission levels in order of increasing access
const PERMISSION_LEVELS = [
  'basic',
  'standard',
  'advanced',
  'team',
  'premium',
  'admin',
];

// Feature descriptions for UI display
const FEATURE_DESCRIPTIONS = {
  captureRequests: 'Capture and analyze network requests',
  filterRequests: 'Filter and search through captured requests',
  exportData: 'Export captured data to various formats',
  statistics: 'View statistics and analytics about captured requests',
  visualization: 'Visualize request data with charts and graphs',

  onlineSync: 'Synchronize data with online storage',
  authentication: 'User authentication and profiles',
  remoteStorage: 'Store captured data in the cloud',
  cloudExport: 'Export data directly to cloud storage services',
  teamSharing: 'Share captured data with team members',

  requestModification: 'Modify requests before they are sent',
  requestMocking: 'Create mock responses for requests',
  automatedTesting: 'Run automated tests on captured requests',
  performanceAlerts: 'Get alerts for performance issues',
  customRules: 'Create custom rules for request analysis',

  aiAnalysis: 'AI-powered analysis of request patterns',
  predictiveAnalytics: 'Predict future request patterns',
  securityScanning: 'Scan requests for security vulnerabilities',
};

// Feature categories for UI organization
const FEATURE_CATEGORIES = {
  core: [
    'captureRequests',
    'filterRequests',
    'exportData',
    'statistics',
    'visualization',
  ],
  online: [
    'onlineSync',
    'authentication',
    'remoteStorage',
    'cloudExport',
    'teamSharing',
  ],
  advanced: [
    'requestModification',
    'requestMocking',
    'automatedTesting',
    'performanceAlerts',
    'customRules',
  ],
  experimental: ['aiAnalysis', 'predictiveAnalytics', 'securityScanning'],
};

// Cross-browser API support (no localStorage fallback)
const browserAPI = globalThis.browser || globalThis.chrome;

/**
 * Feature flags manager class
 */
class FeatureFlagsManager {
  constructor() {
    this.flags = { ...DEFAULT_FEATURE_FLAGS };
    this.userPermissionLevel = 'basic';
    this.initialized = false;
    this.dependencyGraph = new Map();
    this.reverseGraph = new Map();
  }

  /**
   * Build dependency graph
   */
  buildDependencyGraph() {
    this.dependencyGraph.clear();
    this.reverseGraph.clear();

    for (const [feature, dependencies] of Object.entries(
      FEATURE_DEPENDENCIES
    )) {
      this.dependencyGraph.set(feature, new Set(dependencies));

      // Build reverse graph for quick dependent lookup
      dependencies.forEach((dep) => {
        if (!this.reverseGraph.has(dep)) {
          this.reverseGraph.set(dep, new Set());
        }
        this.reverseGraph.get(dep).add(feature);
      });
    }
  }

  /**
   * Check for circular dependencies
   * @param {string} feature - Feature to check
   * @param {Set} visited - Set of visited features
   * @param {Set} path - Current path of features
   * @returns {boolean} - Whether a circular dependency is detected
   */
  detectCircularDependencies(feature, visited = new Set(), path = new Set()) {
    if (path.has(feature)) {
      const cycle = [...path, feature].join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    if (visited.has(feature)) return false;
    visited.add(feature);
    path.add(feature);

    const dependencies = this.dependencyGraph.get(feature) || new Set();
    for (const dep of dependencies) {
      if (this.detectCircularDependencies(dep, visited, path)) {
        return true;
      }
    }

    path.delete(feature);
    return false;
  }

  /**
   * Validate flags to ensure dependencies and permissions are respected
   */
  validateFlags() {
    // Build dependency graph if not built
    if (this.dependencyGraph.size === 0) {
      this.buildDependencyGraph();
    }

    // Check for circular dependencies
    for (const feature of this.dependencyGraph.keys()) {
      this.detectCircularDependencies(feature);
    }

    let changed;
    do {
      changed = false;

      // Disable features the user doesn't have permission for
      for (const [feature, permission] of Object.entries(FEATURE_PERMISSIONS)) {
        if (this.flags[feature] && !this.hasPermission(feature)) {
          console.log(`Disabling ${feature} due to insufficient permissions`);
          this.flags[feature] = false;
          changed = true;
        }
      }

      // Enable required dependencies
      for (const [feature, dependencies] of this.dependencyGraph) {
        if (this.flags[feature]) {
          for (const dep of dependencies) {
            if (!this.flags[dep]) {
              console.log(`Enabling dependency: ${dep} for ${feature}`);
              this.flags[dep] = true;
              changed = true;
            }
          }
        }
      }

      // Disable dependent features when dependencies are disabled
      for (const [feature, dependents] of this.reverseGraph) {
        if (!this.flags[feature]) {
          for (const dependent of dependents) {
            if (this.flags[dependent]) {
              console.log(
                `Disabling ${dependent} because dependency ${feature} is disabled`
              );
              this.flags[dependent] = false;
              changed = true;
            }
          }
        }
      }
    } while (changed);
  }

  /**
   * Initialize the feature flags system
   * @param {Object} options - Initialization options
   * @param {string} options.permissionLevel - User permission level
   * @param {Object} options.initialFlags - Initial feature flag values
   * @param {Function} options.onUpdate - Callback when flags are updated
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    // Set user permission level
    if (options.permissionLevel) {
      this.userPermissionLevel = options.permissionLevel;
    }

    // Load saved flags from storage
    try {
      const data = await this.loadFromStorage();
      if (data && data.flags) {
        this.flags = { ...DEFAULT_FEATURE_FLAGS, ...data.flags };
      }

      // Override with initial flags if provided
      if (options.initialFlags) {
        this.flags = { ...this.flags, ...options.initialFlags };
      }

      // Store callback
      this.onUpdateCallback = options.onUpdate;

      // Validate dependencies and permissions
      this.validateFlags();

      this.initialized = true;

      // Save the validated flags
      await this.saveToStorage();

      console.log('Feature flags initialized:', this.flags);
    } catch (error) {
      console.error('Error initializing feature flags:', error);
      // Fall back to defaults
      this.flags = { ...DEFAULT_FEATURE_FLAGS };
      if (options.initialFlags) {
        this.flags = { ...this.flags, ...options.initialFlags };
      }
      this.initialized = true;
    }
  }

  /**
   * Load feature flags from storage
   * @returns {Promise<Object>}
   */
  async loadFromStorage() {
    return new Promise((resolve) => {
      if (!browserAPI || !browserAPI.storage) {
        console.warn("[FeatureFlags] Browser storage API not available");
        resolve({});
        return;
      }

      browserAPI.storage.local.get('featureFlags', (data) => {
        resolve(data.featureFlags || {});
      });
    });
  }

  /**
   * Save feature flags to storage
   * @returns {Promise<void>}
   */
  async saveToStorage() {
    return new Promise((resolve) => {
      if (!browserAPI || !browserAPI.storage) {
        console.warn("[FeatureFlags] Browser storage API not available, flags not persisted");
        resolve();
        return;
      }

      browserAPI.storage.local.set(
        { featureFlags: { flags: this.flags, timestamp: Date.now() } },
        resolve
      );
    });
  }

  /**
   * Check if a feature is enabled
   * @param {string} featureName - Name of the feature to check
   * @returns {boolean} - Whether the feature is enabled
   */
  isEnabled(featureName) {
    if (!this.initialized) {
      console.warn('Feature flags not initialized, using defaults');
      return DEFAULT_FEATURE_FLAGS[featureName] || false;
    }

    return this.flags[featureName] || false;
  }

  /**
   * Enable a feature
   * @param {string} featureName - Name of the feature to enable
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async enableFeature(featureName) {
    if (!this.hasPermission(featureName)) {
      console.warn(`User does not have permission to enable ${featureName}`);
      return false;
    }

    this.flags[featureName] = true;

    // Enable dependencies
    if (FEATURE_DEPENDENCIES[featureName]) {
      for (const dependency of FEATURE_DEPENDENCIES[featureName]) {
        if (!this.flags[dependency]) {
          console.log(`Enabling dependency: ${dependency} for ${featureName}`);
          this.flags[dependency] = true;
        }
      }
    }

    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.flags);
    }

    return true;
  }

  /**
   * Disable a feature
   * @param {string} featureName - Name of the feature to disable
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async disableFeature(featureName) {
    this.flags[featureName] = false;

    // Disable dependent features
    for (const [feature, dependencies] of Object.entries(
      FEATURE_DEPENDENCIES
    )) {
      if (dependencies.includes(featureName) && this.flags[feature]) {
        console.log(
          `Disabling dependent feature: ${feature} because ${featureName} was disabled`
        );
        this.flags[feature] = false;
      }
    }

    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.flags);
    }

    return true;
  }

  /**
   * Update multiple features at once
   * @param {Object} updates - Object with feature names as keys and boolean values
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async updateFeatures(updates) {
    let changed = false;

    for (const [feature, enabled] of Object.entries(updates)) {
      if (enabled && !this.hasPermission(feature)) {
        console.warn(`User does not have permission to enable ${feature}`);
        continue;
      }

      if (this.flags[feature] !== enabled) {
        this.flags[feature] = enabled;
        changed = true;
      }
    }

    if (changed) {
      this.validateFlags();
      await this.saveToStorage();

      if (this.onUpdateCallback) {
        this.onUpdateCallback(this.flags);
      }
    }

    return changed;
  }

  /**
   * Check if user has permission for a feature
   * @param {string} featureName - Name of the feature to check
   * @returns {boolean} - Whether the user has permission
   */
  hasPermission(featureName) {
    const requiredLevel = FEATURE_PERMISSIONS[featureName] || 'admin';
    const userLevelIndex = PERMISSION_LEVELS.indexOf(this.userPermissionLevel);
    const requiredLevelIndex = PERMISSION_LEVELS.indexOf(requiredLevel);

    return userLevelIndex >= requiredLevelIndex;
  }

  /**
   * Set user permission level
   * @param {string} level - New permission level
   * @returns {Promise<void>}
   */
  async setPermissionLevel(level) {
    if (!PERMISSION_LEVELS.includes(level)) {
      console.error(`Invalid permission level: ${level}`);
      return;
    }

    this.userPermissionLevel = level;
    this.validateFlags();
    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.flags);
    }
  }

  /**
   * Get all feature information for UI display
   * @returns {Object} - Feature information organized by category
   */
  getFeatureInfo() {
    const result = {};

    for (const [category, features] of Object.entries(FEATURE_CATEGORIES)) {
      result[category] = features.map((feature) => ({
        id: feature,
        name: feature
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase()),
        description: FEATURE_DESCRIPTIONS[feature] || '',
        enabled: this.flags[feature] || false,
        hasPermission: this.hasPermission(feature),
        requiredPermission: FEATURE_PERMISSIONS[feature] || 'admin',
        dependencies: FEATURE_DEPENDENCIES[feature] || [],
      }));
    }

    return result;
  }

  /**
   * Reset all feature flags to defaults
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    this.flags = { ...DEFAULT_FEATURE_FLAGS };
    this.validateFlags();
    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.flags);
    }
  }
}

// Create and export singleton instance
const featureFlags = new FeatureFlagsManager();

export default featureFlags;
