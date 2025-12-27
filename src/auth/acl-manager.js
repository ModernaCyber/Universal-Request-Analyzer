/**
 * Access Control List (ACL) Manager for Universal Request Analyzer
 *
 * This module provides role-based access control and permission management.
 */

import featureFlags from '../config/feature-flags.js';

// Cross-browser API support (no localStorage fallback)
const browserAPI = globalThis.browser || globalThis.chrome;

// Default roles and their permissions
const DEFAULT_ROLES = {
  guest: {
    description: 'Limited access with basic functionality',
    permissionLevel: 'basic',
    permissions: ['view:requests', 'capture:requests', 'filter:requests', 'export:local'],
  },
  user: {
    description: 'Standard user with access to most features',
    permissionLevel: 'standard',
    permissions: [
      'view:requests',
      'capture:requests',
      'filter:requests',
      'export:local',
      'view:statistics',
      'view:visualization',
      'clear:requests',
      'config:basic',
    ],
  },
  powerUser: {
    description: 'Advanced user with access to all local features',
    permissionLevel: 'advanced',
    permissions: [
      'view:requests',
      'capture:requests',
      'filter:requests',
      'export:local',
      'view:statistics',
      'view:visualization',
      'clear:requests',
      'config:basic',
      'config:advanced',
      'modify:requests',
      'mock:responses',
    ],
  },
  teamMember: {
    description: 'Team member with sharing capabilities',
    permissionLevel: 'team',
    permissions: [
      'view:requests',
      'capture:requests',
      'filter:requests',
      'export:local',
      'export:cloud',
      'view:statistics',
      'view:visualization',
      'clear:requests',
      'config:basic',
      'config:advanced',
      'share:team',
      'sync:cloud',
    ],
  },
  admin: {
    description: 'Administrator with full access',
    permissionLevel: 'admin',
    permissions: [
      'view:requests',
      'capture:requests',
      'filter:requests',
      'export:local',
      'export:cloud',
      'view:statistics',
      'view:visualization',
      'clear:requests',
      'config:basic',
      'config:advanced',
      'modify:requests',
      'mock:responses',
      'share:team',
      'sync:cloud',
      'manage:users',
      'manage:roles',
      'view:logs',
      'config:system',
    ],
  },
};

// Permission descriptions for UI display
const PERMISSION_DESCRIPTIONS = {
  'view:requests': 'View captured network requests',
  'capture:requests': 'Capture new network requests',
  'filter:requests': 'Filter and search through requests',
  'export:local': 'Export data to local files',
  'export:cloud': 'Export data to cloud storage',
  'view:statistics': 'View request statistics and analytics',
  'view:visualization': 'View data visualizations and charts',
  'clear:requests': 'Clear captured request data',
  'config:basic': 'Configure basic settings',
  'config:advanced': 'Configure advanced settings',
  'modify:requests': 'Modify requests before they are sent',
  'mock:responses': 'Create mock responses for requests',
  'share:team': 'Share data with team members',
  'sync:cloud': 'Synchronize data with cloud storage',
  'manage:users': 'Manage user accounts',
  'manage:roles': 'Manage roles and permissions',
  'view:logs': 'View system logs',
  'config:system': 'Configure system-wide settings',
};

/**
 * ACL Manager class
 */
class ACLManager {
  constructor() {
    this.roles = { ...DEFAULT_ROLES };
    this.currentRole = 'user'; // Default role
    this.currentUser = null;
    this.initialized = false;
    this.customPermissions = []; // Additional permissions for current user
  }

  /**
   * Initialize the ACL manager
   * @param {Object} options - Initialization options
   * @param {string} options.initialRole - Initial role to use
   * @param {Object} options.userData - User data if authenticated
   * @param {Function} options.onUpdate - Callback when permissions change
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    try {
      // Load saved ACL data from storage
      const data = await this.loadFromStorage();

      if (data) {
        if (data.roles) {
          this.roles = { ...DEFAULT_ROLES, ...data.roles };
        }

        if (data.currentRole) {
          this.currentRole = data.currentRole;
        }

        if (data.customPermissions) {
          this.customPermissions = data.customPermissions;
        }
      }

      // Override with initial role if provided
      if (options.initialRole && this.roles[options.initialRole]) {
        this.currentRole = options.initialRole;
      }

      // Set user data if provided
      if (options.userData) {
        this.currentUser = options.userData;

        // If user has a role specified, use it
        if (this.currentUser.role && this.roles[this.currentUser.role]) {
          this.currentRole = this.currentUser.role;
        }

        // If user has custom permissions, use them
        if (this.currentUser.permissions) {
          this.customPermissions = this.currentUser.permissions;
        }
      }

      // Store callback
      this.onUpdateCallback = options.onUpdate;

      // Update feature flags with permission level
      await featureFlags.setPermissionLevel(this.getPermissionLevel());

      this.initialized = true;

      // Save the current state
      await this.saveToStorage();

      console.log('ACL manager initialized:', {
        currentRole: this.currentRole,
        permissionLevel: this.getPermissionLevel(),
        permissions: this.getAllPermissions(),
      });
    } catch (error) {
      console.error('Error initializing ACL manager:', error);
      // Fall back to defaults
      this.roles = { ...DEFAULT_ROLES };
      this.currentRole = 'user';
      this.customPermissions = [];
      this.initialized = true;
    }
  }

  /**
   * Load ACL data from storage
   * @returns {Promise<Object>}
   */
  async loadFromStorage() {
    return new Promise((resolve) => {
      if (!browserAPI || !browserAPI.storage) {
        console.warn("[ACLManager] Browser storage API not available");
        resolve(null);
        return;
      }

      browserAPI.storage.local.get('aclData', (data) => {
        resolve(data.aclData || null);
      });
    });
  }

  /**
   * Save ACL data to storage
   * @returns {Promise<void>}
   */
  async saveToStorage() {
    return new Promise((resolve) => {
      if (!browserAPI || !browserAPI.storage) {
        console.warn("[ACLManager] Browser storage API not available, data not persisted");
        resolve();
        return;
      }

      browserAPI.storage.local.set(
        {
          aclData: {
            roles: this.roles,
            currentRole: this.currentRole,
            customPermissions: this.customPermissions,
            timestamp: Date.now(),
          },
        },
        resolve,
      );
    });
  }

  /**
   * Get the current permission level
   * @returns {string} - Permission level
   */
  getPermissionLevel() {
    return this.roles[this.currentRole]?.permissionLevel || 'basic';
  }

  /**
   * Get all permissions for the current role and user
   * @returns {string[]} - Array of permission strings
   */
  getAllPermissions() {
    const rolePermissions = this.roles[this.currentRole]?.permissions || [];
    return [...new Set([...rolePermissions, ...this.customPermissions])];
  }

  /**
   * Check if the current user has a specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} - Whether the user has the permission
   */
  hasPermission(permission) {
    if (!this.initialized) {
      console.warn('ACL manager not initialized, using default permissions');
      return DEFAULT_ROLES.user.permissions.includes(permission);
    }

    return this.getAllPermissions().includes(permission);
  }

  /**
   * Check if the current user has all of the specified permissions
   * @param {string[]} permissions - Permissions to check
   * @returns {boolean} - Whether the user has all permissions
   */
  hasAllPermissions(permissions) {
    return permissions.every((permission) => this.hasPermission(permission));
  }

  /**
   * Check if the current user has any of the specified permissions
   * @param {string[]} permissions - Permissions to check
   * @returns {boolean} - Whether the user has any of the permissions
   */
  hasAnyPermission(permissions) {
    return permissions.some((permission) => this.hasPermission(permission));
  }

  /**
   * Set the current role
   * @param {string} role - Role to set
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async setRole(role) {
    if (!this.roles[role]) {
      console.error(`Invalid role: ${role}`);
      return false;
    }

    this.currentRole = role;

    // Update feature flags with new permission level
    await featureFlags.setPermissionLevel(this.getPermissionLevel());

    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        role: this.currentRole,
        permissionLevel: this.getPermissionLevel(),
        permissions: this.getAllPermissions(),
      });
    }

    return true;
  }

  /**
   * Add a custom permission for the current user
   * @param {string} permission - Permission to add
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async addCustomPermission(permission) {
    if (!this.customPermissions.includes(permission)) {
      this.customPermissions.push(permission);
      await this.saveToStorage();

      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          role: this.currentRole,
          permissionLevel: this.getPermissionLevel(),
          permissions: this.getAllPermissions(),
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Remove a custom permission from the current user
   * @param {string} permission - Permission to remove
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async removeCustomPermission(permission) {
    const index = this.customPermissions.indexOf(permission);
    if (index !== -1) {
      this.customPermissions.splice(index, 1);
      await this.saveToStorage();

      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          role: this.currentRole,
          permissionLevel: this.getPermissionLevel(),
          permissions: this.getAllPermissions(),
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Set custom permissions for the current user
   * @param {string[]} permissions - Permissions to set
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async setCustomPermissions(permissions) {
    this.customPermissions = [...permissions];
    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        role: this.currentRole,
        permissionLevel: this.getPermissionLevel(),
        permissions: this.getAllPermissions(),
      });
    }

    return true;
  }

  /**
   * Add a new role or update an existing one
   * @param {string} roleName - Name of the role
   * @param {Object} roleData - Role data
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async addOrUpdateRole(roleName, roleData) {
    if (!roleName || typeof roleData !== 'object') {
      console.error('Invalid role data');
      return false;
    }

    this.roles[roleName] = {
      description: roleData.description || '',
      permissionLevel: roleData.permissionLevel || 'basic',
      permissions: roleData.permissions || [],
    };

    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        role: this.currentRole,
        permissionLevel: this.getPermissionLevel(),
        permissions: this.getAllPermissions(),
      });
    }

    return true;
  }

  /**
   * Remove a role
   * @param {string} roleName - Name of the role to remove
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async removeRole(roleName) {
    if (roleName in DEFAULT_ROLES) {
      console.error('Cannot remove default role');
      return false;
    }

    if (this.roles[roleName]) {
      delete this.roles[roleName];

      // If current role was removed, fall back to 'user'
      if (this.currentRole === roleName) {
        this.currentRole = 'user';
        await featureFlags.setPermissionLevel(this.getPermissionLevel());
      }

      await this.saveToStorage();

      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          role: this.currentRole,
          permissionLevel: this.getPermissionLevel(),
          permissions: this.getAllPermissions(),
        });
      }

      return true;
    }

    return false;
  }

  /**
   * Reset to default roles
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  async resetToDefaults() {
    this.roles = { ...DEFAULT_ROLES };
    this.currentRole = 'user';
    this.customPermissions = [];

    await featureFlags.setPermissionLevel(this.getPermissionLevel());
    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        role: this.currentRole,
        permissionLevel: this.getPermissionLevel(),
        permissions: this.getAllPermissions(),
      });
    }

    return true;
  }

  /**
   * Get all roles information for UI display
   * @returns {Object} - Roles information
   */
  getRolesInfo() {
    const result = {};

    for (const [roleName, roleData] of Object.entries(this.roles)) {
      result[roleName] = {
        name: roleName.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        description: roleData.description || '',
        permissionLevel: roleData.permissionLevel || 'basic',
        permissions: roleData.permissions || [],
        isCurrentRole: roleName === this.currentRole,
        isDefaultRole: roleName in DEFAULT_ROLES,
      };
    }

    return result;
  }

  /**
   * Get all permissions information for UI display
   * @returns {Object} - Permissions information
   */
  getPermissionsInfo() {
    const result = {};
    const allPermissions = new Set();

    // Collect all permissions from all roles
    for (const roleData of Object.values(this.roles)) {
      for (const permission of roleData.permissions) {
        allPermissions.add(permission);
      }
    }

    // Add custom permissions
    for (const permission of this.customPermissions) {
      allPermissions.add(permission);
    }

    // Create permission info objects
    for (const permission of allPermissions) {
      const [category, action] = permission.split(':');

      if (!result[category]) {
        result[category] = [];
      }

      result[category].push({
        id: permission,
        action: action,
        description: PERMISSION_DESCRIPTIONS[permission] || permission,
        hasPermission: this.hasPermission(permission),
        isCustom: this.customPermissions.includes(permission),
      });
    }

    return result;
  }
}

// Create and export singleton instance
const aclManager = new ACLManager();

export default aclManager;

