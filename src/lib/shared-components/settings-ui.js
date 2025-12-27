/**
 * Settings UI for Universal Request Analyzer
 *
 * This module provides the UI for managing settings, feature flags, ACLs, and themes.
 */

// Import required dependencies
import settingsManager from "./settings-ui-coordinator.js";
import featureFlags from "../../config/feature-flags.js";
import aclManager from "../../auth/acl-manager.js";
import themeManager from "../ui/theme-manager.js";

/**
 * Initialize the settings UI
 */
export function initSettingsUI() {
  // Add settings tab if it doesn't exist
  if (!document.querySelector('.tab-btn[data-tab="settings"]')) {
    createSettingsTab();
  }

  // Initialize section visibility and load initial data
  loadSettingsData();
}

// Create settings tab
function createSettingsTab() {
  const tabsContainer = document.querySelector(".tabs");
  const settingsTabBtn = document.createElement("button");
  settingsTabBtn.className = "tab-btn";
  settingsTabBtn.setAttribute("data-tab", "settings");
  settingsTabBtn.innerHTML = '<i class="fas fa-cog"></i> Settings';
  tabsContainer.appendChild(settingsTabBtn);

  // Add click event
  settingsTabBtn.addEventListener("click", () => {
    switchToSettingsTab();
  });

  // Create settings content
  createSettingsContent();
}

// Switch to settings tab
function switchToSettingsTab() {
  // Update active tab button
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector('.tab-btn[data-tab="settings"]')
    .classList.add("active");

  // Update active tab content
  document
    .querySelectorAll(".tab-content")
    .forEach((content) => content.classList.remove("active"));
  document.getElementById("settings-tab").classList.add("active");
  //update settings section visibility
  // document.querySelector(".settings-section").classList.add("active");
  // Load settings data
  loadSettingsData();
}

// Load settings data into UI
async function loadSettingsData() {
  const allSettings = settingsManager.getAllSettings();

  // Update general settings
  updateGeneralSettings(allSettings.settings.general);

  // Update capture settings
  updateCaptureSettings(allSettings.settings.capture);

  // Update display settings
  updateDisplaySettings(allSettings.settings.display);

  // Update feature flags
  updateFeatureFlags(allSettings.featureFlags);

  // Update permissions
  updatePermissions(allSettings.acl);

  // Update theme settings
  updateThemeSettings(allSettings.theme);
}

// Update general settings section
function updateGeneralSettings(generalSettings) {
  document.getElementById("maxStoredRequests").value =
    generalSettings.maxStoredRequests;
  document.getElementById("autoStartCapture").checked =
    generalSettings.autoStartCapture;
  document.getElementById("showNotifications").checked =
    generalSettings.showNotifications;
  document.getElementById("confirmClearRequests").checked =
    generalSettings.confirmClearRequests;
  document.getElementById("defaultExportFormat").value =
    generalSettings.defaultExportFormat;
  document.getElementById("dateFormat").value = generalSettings.dateFormat;
  document.getElementById("timeZone").value = generalSettings.timeZone;
}

// Update capture settings section
function updateCaptureSettings(captureSettings) {
  document.getElementById("includeHeaders").checked =
    captureSettings.includeHeaders;
  document.getElementById("includeTiming").checked =
    captureSettings.includeTiming;
  document.getElementById("includeContent").checked =
    captureSettings.includeContent;
  document.getElementById("maxContentSize").value =
    captureSettings.maxContentSize;
  document.getElementById("captureWebSockets").checked =
    captureSettings.captureWebSockets;
  document.getElementById("captureServerSentEvents").checked =
    captureSettings.captureServerSentEvents;
}

// Update display settings section
function updateDisplaySettings(displaySettings) {
  document.getElementById("requestsPerPage").value =
    displaySettings.requestsPerPage;
  document.getElementById("expandedDetails").checked =
    displaySettings.expandedDetails;
  document.getElementById("showStatusColors").checked =
    displaySettings.showStatusColors;
  document.getElementById("showTimingBars").checked =
    displaySettings.showTimingBars;
  document.getElementById("defaultTab").value = displaySettings.defaultTab;

  // Update column order
  updateColumnOrder(displaySettings.columnOrder);
}

// Update column order list
function updateColumnOrder(columnOrder) {
  const container = document.querySelector(".column-order-container");
  if (!container) return;

  container.innerHTML = columnOrder
    .map(
      (column, index) => `
    <div class="column-order-item" data-column="${column}">
      <span class="column-name">${getColumnDisplayName(column)}</span>
      <div class="column-actions">
        ${
          index > 0
            ? `
          <button class="column-move-up" title="Move up">
            <i class="fas fa-arrow-up"></i>
          </button>
        `
            : ""
        }
        ${
          index < columnOrder.length - 1
            ? `
          <button class="column-move-down" title="Move down">
            <i class="fas fa-arrow-down"></i>
          </button>
        `
            : ""
        }
      </div>
    </div>
  `
    )
    .join("");

  // Add move handlers
  container.querySelectorAll(".column-move-up").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const item = e.target.closest(".column-order-item");
      const column = item.dataset.column;
      const currentIndex = columnOrder.indexOf(column);
      if (currentIndex > 0) {
        const newOrder = [...columnOrder];
        [newOrder[currentIndex - 1], newOrder[currentIndex]] = [
          newOrder[currentIndex],
          newOrder[currentIndex - 1],
        ];
        updateColumnOrder(newOrder);
        saveColumnOrder(newOrder);
      }
    });
  });

  container.querySelectorAll(".column-move-down").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const item = e.target.closest(".column-order-item");
      const column = item.dataset.column;
      const currentIndex = columnOrder.indexOf(column);
      if (currentIndex < columnOrder.length - 1) {
        const newOrder = [...columnOrder];
        [newOrder[currentIndex], newOrder[currentIndex + 1]] = [
          newOrder[currentIndex + 1],
          newOrder[currentIndex],
        ];
        updateColumnOrder(newOrder);
        saveColumnOrder(newOrder);
      }
    });
  });
}

// Get display name for column
function getColumnDisplayName(column) {
  const displayNames = {
    method: "Method",
    domain: "Domain",
    path: "Path",
    status: "Status",
    type: "Type",
    size: "Size",
    duration: "Duration",
    time: "Time",
  };
  return displayNames[column] || column;
}

// Save column order
async function saveColumnOrder(columnOrder) {
  const success = await settingsManager.updateSettings({
    display: {
      columnOrder,
    },
  });

  if (success) {
    showNotification("Column order updated successfully!");
  } else {
    showNotification("Failed to update column order", true);
  }
}

// Update feature flags section
function updateFeatureFlags(featureFlags) {
  const container = document.querySelector(".features-container");
  if (!container) return;

  container.innerHTML = "";
  Object.entries(featureFlags).forEach(([category, flags]) => {
    const categoryElement = createFeatureCategory(category, flags);
    container.appendChild(categoryElement);
  });
}

// Create feature category element
function createFeatureCategory(category, flags) {
  const div = document.createElement("div");
  div.className = "feature-category";
  div.innerHTML = `
    <h3>${category.charAt(0).toUpperCase() + category.slice(1)} Features</h3>
    <div class="feature-list">
      ${flags.map((flag) => createFeatureItem(flag)).join("")}
    </div>
  `;
  return div;
}

// Create feature item element
function createFeatureItem(flag) {
  return `
    <div class="feature-item">
      <div class="feature-header">
        <span class="feature-name">${flag.name}</span>
        <button class="feature-info-btn" title="More info">?</button>
      </div>
      <div class="feature-description">${flag.description}</div>
      <label class="toggle-switch">
        <input type="checkbox" data-feature="${flag.id}" ${
    flag.enabled ? "checked" : ""
  }>
        <span class="slider"></span>
      </label>
      ${
        flag.requiresPermission
          ? `
        <div class="feature-permission-notice">
          Requires additional permissions
        </div>
      `
          : ""
      }
    </div>
  `;
}

// Update permissions section
function updatePermissions(aclData) {
  // Update current role
  document.getElementById("currentRole").value = aclData.role;

  // Update permissions list
  const container = document.querySelector(".permissions-container");
  if (!container) return;

  container.innerHTML = "";
  Object.entries(aclData.permissions).forEach(([category, permissions]) => {
    const categoryElement = createPermissionCategory(category, permissions);
    container.appendChild(categoryElement);
  });
}

// Create permission category element
function createPermissionCategory(category, permissions) {
  const div = document.createElement("div");
  div.className = "permission-category";
  div.innerHTML = `
    <h4>${category.charAt(0).toUpperCase() + category.slice(1)} Permissions</h4>
    <div class="permission-list">
      ${permissions.map((perm) => createPermissionItem(perm)).join("")}
    </div>
  `;
  return div;
}

// Create permission item element
function createPermissionItem(permission) {
  return `
    <div class="permission-item">
      <div class="permission-header">
        <span class="permission-status ${
          permission.granted ? "has-permission" : "no-permission"
        }">
          ${permission.granted ? "✓" : "✗"}
        </span>
        <span class="permission-name">${permission.name}</span>
      </div>
      <div class="permission-description">${permission.description}</div>
    </div>
  `;
}

// Update theme settings
function updateThemeSettings(themeData) {
  // Update current theme selection
  document.getElementById("currentTheme").value = themeData.current;

  // Update theme cards
  const container = document.querySelector(".themes-container");
  if (!container) return;

  container.innerHTML = themeData.themes
    .map((theme) => createThemeCard(theme, themeData.current))
    .join("");
}

// Create theme card element
function createThemeCard(theme, currentTheme) {
  return `
    <div class="theme-card ${
      theme.id === currentTheme ? "current-theme" : ""
    }" data-theme-id="${theme.id}">
      <div class="theme-preview" style="background-color: ${
        theme.colors.background
      }">
        <div class="theme-preview-header" style="
          background-color: ${theme.colors.surface};
          color: ${theme.colors.text};
          border: 1px solid ${theme.colors.primary};">
          ${theme.name}
        </div>
      </div>
      <div class="theme-info">
        <div class="theme-name">${theme.name}</div>
        <div class="theme-description">${theme.description}</div>
      </div>
      <div class="theme-actions">
        <button class="theme-apply-btn" data-theme-id="${theme.id}"
          ${theme.id === currentTheme ? "disabled" : ""}>
          ${theme.id === currentTheme ? "Current Theme" : "Apply Theme"}
        </button>
      </div>
    </div>
  `;
}

// Handle settings changes
function handleSettingsChange(newSettings) {
  loadSettingsData();
}

// Add settings styles
function addSettingsStyles() {
  const styleElement = document.createElement("style");
  styleElement.textContent = `
    /* Add any additional dynamic styles here if needed */
  `;
  document.head.appendChild(styleElement);
}

// Create settings content
function createSettingsContent() {
  const tabsContent = document.querySelector(".tab-content").parentNode;
  const settingsTab = document.createElement("div");
  settingsTab.className = "tab-content";
  settingsTab.id = "settings-tab";

  settingsTab.innerHTML = `
    <div class="settings-container">
      <div class="settings-sidebar">
        <div class="settings-nav">
          <button class="settings-nav-item active" data-section="general">General</button>
          <button class="settings-nav-item" data-section="capture">Capture</button>
          <button class="settings-nav-item" data-section="display">Display</button>
          <button class="settings-nav-item" data-section="features">Features</button>
          <button class="settings-nav-item" data-section="permissions">Permissions</button>
          <button class="settings-nav-item" data-section="themes">Themes</button>
        </div>
        <div class="settings-actions">
          <button id="resetSettingsBtn" class="danger-btn">Reset All Settings</button>
        </div>
      </div>
      <div class="settings-content">
        <div class="settings-section active" data-section="general">
          ${createGeneralSettingsSection()}
        </div>
        <div class="settings-section" data-section="capture">
          ${createCaptureSettingsSection()}
        </div>
        <div class="settings-section" data-section="display">
          ${createDisplaySettingsSection()}
        </div>
        <div class="settings-section" data-section="features">
          ${createFeaturesSection()}
        </div>
        <div class="settings-section" data-section="permissions">
          ${createPermissionsSection()}
        </div>
        <div class="settings-section" data-section="themes">
          ${createThemesSection()}
        </div>
      </div>
    </div>
  `;

  tabsContent.appendChild(settingsTab);
  setupSettingsEventListeners();
}

// Create general settings section HTML
function createGeneralSettingsSection() {
  return `
    <h2>General Settings</h2>
    <div class="settings-group">
      <div class="setting-item">
        <label for="maxStoredRequests">Maximum Stored Requests:</label>
        <input type="number" id="maxStoredRequests" min="100" max="100000" step="100">
      </div>
      <div class="setting-item">
        <label for="autoStartCapture">
          <input type="checkbox" id="autoStartCapture">
          Automatically start capturing requests
        </label>
      </div>
      <div class="setting-item">
        <label for="showNotifications">
          <input type="checkbox" id="showNotifications">
          Show notifications
        </label>
      </div>
      <div class="setting-item">
        <label for="confirmClearRequests">
          <input type="checkbox" id="confirmClearRequests">
          Confirm before clearing requests
        </label>
      </div>
      <div class="setting-item">
        <label for="defaultExportFormat">Default Export Format:</label>
        <select id="defaultExportFormat">
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
          <option value="sqlite">SQLite</option>
        </select>
      </div>
      <div class="setting-item">
        <label for="dateFormat">Date Format:</label>
        <select id="dateFormat">
          <option value="yyyy-MM-dd HH:mm:ss">yyyy-MM-dd HH:mm:ss</option>
          <option value="MM/dd/yyyy HH:mm:ss">MM/dd/yyyy HH:mm:ss</option>
          <option value="dd/MM/yyyy HH:mm:ss">dd/MM/yyyy HH:mm:ss</option>
        </select>
      </div>
      <div class="setting-item">
        <label for="timeZone">Time Zone:</label>
        <select id="timeZone">
          <option value="local">Local Time Zone</option>
          <option value="utc">UTC</option>
        </select>
      </div>
    </div>
    <div class="settings-actions">
      <button id="saveGeneralSettingsBtn" class="primary-btn">Save Changes</button>
    </div>
  `;
}

// Create capture settings section HTML
function createCaptureSettingsSection() {
  return `
    <h2>Capture Settings</h2>
    <div class="settings-group">
      <div class="setting-item">
        <label for="includeHeaders">
          <input type="checkbox" id="includeHeaders">
          Capture request and response headers
        </label>
      </div>
      <div class="setting-item">
        <label for="includeTiming">
          <input type="checkbox" id="includeTiming">
          Capture detailed timing information
        </label>
      </div>
      <div class="setting-item">
        <label for="includeContent">
          <input type="checkbox" id="includeContent">
          Capture request and response content
        </label>
      </div>
      <div class="setting-item">
        <label for="maxContentSize">Maximum Content Size (bytes):</label>
        <input type="number" id="maxContentSize" min="1024" max="10485760" step="1024">
      </div>
      <div class="setting-item">
        <label for="captureWebSockets">
          <input type="checkbox" id="captureWebSockets">
          Capture WebSocket connections
        </label>
      </div>
      <div class="setting-item">
        <label for="captureServerSentEvents">
          <input type="checkbox" id="captureServerSentEvents">
          Capture Server-Sent Events
        </label>
      </div>
    </div>
    <div class="settings-actions">
      <button id="saveCaptureSettingsBtn" class="primary-btn">Save Changes</button>
    </div>
  `;
}

// Create display settings section HTML
function createDisplaySettingsSection() {
  return `
    <h2>Display Settings</h2>
    <div class="settings-group">
      <div class="setting-item">
        <label for="requestsPerPage">Requests Per Page:</label>
        <select id="requestsPerPage">
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
      <div class="setting-item">
        <label for="expandedDetails">
          <input type="checkbox" id="expandedDetails">
          Show expanded details by default
        </label>
      </div>
      <div class="setting-item">
        <label for="showStatusColors">
          <input type="checkbox" id="showStatusColors">
          Show status code colors
        </label>
      </div>
      <div class="setting-item">
        <label for="showTimingBars">
          <input type="checkbox" id="showTimingBars">
          Show timing bars in details view
        </label>
      </div>
      <div class="setting-item">
        <label for="defaultTab">Default Tab:</label>
        <select id="defaultTab">
          <option value="requests">Requests</option>
          <option value="stats">Statistics</option>
          <option value="performance">Performance</option>
        </select>
      </div>
      <div class="setting-item">
        <label>Column Order:</label>
        <div class="column-order-container">
          <!-- Column order items will be added dynamically -->
        </div>
      </div>
    </div>
    <div class="settings-actions">
      <button id="saveDisplaySettingsBtn" class="primary-btn">Save Changes</button>
    </div>
  `;
}

// Create features section HTML
function createFeaturesSection() {
  return `
    <h2>Feature Flags</h2>
    <p class="settings-description">Enable or disable features based on your needs.</p>
    <div class="features-container">
      <!-- Feature categories will be added dynamically -->
    </div>
    <div class="settings-actions">
      <button id="saveFeatureSettingsBtn" class="primary-btn">Save Changes</button>
      <button id="resetFeatureSettingsBtn" class="secondary-btn">Reset to Defaults</button>
    </div>
  `;
}

// Create permissions section HTML
function createPermissionsSection() {
  return `
    <h2>Permissions</h2>
    <p class="settings-description">Manage roles and permissions for the extension.</p>
    <div class="setting-item">
      <label for="currentRole">Current Role:</label>
      <select id="currentRole">
        <!-- Roles will be added dynamically -->
      </select>
    </div>
    <div class="permissions-container">
      <!-- Permission categories will be added dynamically -->
    </div>
    <div class="settings-actions">
      <button id="savePermissionSettingsBtn" class="primary-btn">Save Changes</button>
      <button id="resetPermissionSettingsBtn" class="secondary-btn">Reset to Defaults</button>
    </div>
  `;
}

// Create themes section HTML
function createThemesSection() {
  return `
    <h2>Themes</h2>
    <p class="settings-description">Customize the appearance of the extension.</p>
    <div class="setting-item">
      <label for="currentTheme">Current Theme:</label>
      <select id="currentTheme">
        <option value="system">System Preference</option>
        <!-- Themes will be added dynamically -->
      </select>
    </div>
    <div class="themes-container">
      <!-- Theme cards will be added dynamically -->
    </div>
    <div class="settings-actions">
      <button id="saveThemeSettingsBtn" class="primary-btn">Save Changes</button>
      <button id="resetThemeSettingsBtn" class="secondary-btn">Reset to Defaults</button>
    </div>
  `;
}

// Setup event listeners for settings UI
function setupSettingsEventListeners() {
  // Settings navigation
  document.querySelectorAll(".settings-nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      // Update active nav item
      document
        .querySelectorAll(".settings-nav-item")
        .forEach((navItem) => navItem.classList.remove("active"));
      item.classList.add("active");

      // Update active section
      const section = item.getAttribute("data-section");
      document
        .querySelectorAll(".settings-section")
        .forEach((section) => section.classList.remove("active"));
      document
        .querySelector(`.settings-section[data-section="${section}"]`)
        .classList.add("active");
    });
  });

  // Save handlers
  setupSaveHandlers();
}

// Setup save handlers for all settings sections
function setupSaveHandlers() {
  // General settings
  document
    .getElementById("saveGeneralSettingsBtn")
    .addEventListener("click", async () => {
      const settings = {
        maxStoredRequests: parseInt(
          document.getElementById("maxStoredRequests").value
        ),
        autoStartCapture: document.getElementById("autoStartCapture").checked,
        showNotifications: document.getElementById("showNotifications").checked,
        confirmClearRequests: document.getElementById("confirmClearRequests")
          .checked,
        defaultExportFormat: document.getElementById("defaultExportFormat")
          .value,
        dateFormat: document.getElementById("dateFormat").value,
        timeZone: document.getElementById("timeZone").value,
      };

      const success = await settingsManager.updateSettings({
        general: settings,
      });
      if (success) {
        showNotification("General settings saved successfully!");
      } else {
        showNotification("Failed to save general settings", true);
      }
    });

  // Capture settings
  document
    .getElementById("saveCaptureSettingsBtn")
    .addEventListener("click", async () => {
      const settings = {
        includeHeaders: document.getElementById("includeHeaders").checked,
        includeTiming: document.getElementById("includeTiming").checked,
        includeContent: document.getElementById("includeContent").checked,
        maxContentSize: parseInt(
          document.getElementById("maxContentSize").value
        ),
        captureWebSockets: document.getElementById("captureWebSockets").checked,
        captureServerSentEvents: document.getElementById(
          "captureServerSentEvents"
        ).checked,
      };

      const success = await settingsManager.updateSettings({
        capture: settings,
      });
      if (success) {
        showNotification("Capture settings saved successfully!");
      } else {
        showNotification("Failed to save capture settings", true);
      }
    });

  // Display settings
  document
    .getElementById("saveDisplaySettingsBtn")
    .addEventListener("click", async () => {
      const settings = {
        requestsPerPage: parseInt(
          document.getElementById("requestsPerPage").value
        ),
        expandedDetails: document.getElementById("expandedDetails").checked,
        showStatusColors: document.getElementById("showStatusColors").checked,
        showTimingBars: document.getElementById("showTimingBars").checked,
        defaultTab: document.getElementById("defaultTab").value,
        columnOrder: Array.from(
          document.querySelectorAll(".column-order-item")
        ).map((item) => item.dataset.column),
      };

      const success = await settingsManager.updateSettings({
        display: settings,
      });
      if (success) {
        showNotification("Display settings saved successfully!");
      } else {
        showNotification("Failed to save display settings", true);
      }
    });

  // Feature settings
  document
    .getElementById("saveFeatureSettingsBtn")
    .addEventListener("click", async () => {
      const featureElements = document.querySelectorAll("[data-feature]");
      const flags = {};
      featureElements.forEach((element) => {
        flags[element.dataset.feature] = element.checked;
      });

      const success = await featureFlags.updateFeatures(flags);
      if (success) {
        showNotification("Feature settings saved successfully!");
      } else {
        showNotification("Failed to save feature settings", true);
      }
    });

  // Reset feature settings
  document
    .getElementById("resetFeatureSettingsBtn")
    .addEventListener("click", async () => {
      if (
        confirm("Are you sure you want to reset feature settings to defaults?")
      ) {
        const success = await featureFlags.resetToDefaults();
        if (success) {
          updateFeatureFlags(featureFlags.getFeatureInfo());
          showNotification("Feature settings reset to defaults!");
        } else {
          showNotification("Failed to reset feature settings", true);
        }
      }
    });

  // Permission settings
  document
    .getElementById("savePermissionSettingsBtn")
    .addEventListener("click", async () => {
      const role = document.getElementById("currentRole").value;
      const success = await aclManager.setRole(role);
      if (success) {
        showNotification("Permission settings saved successfully!");
      } else {
        showNotification("Failed to save permission settings", true);
      }
    });

  // Reset permission settings
  document
    .getElementById("resetPermissionSettingsBtn")
    .addEventListener("click", async () => {
      if (
        confirm(
          "Are you sure you want to reset permission settings to defaults?"
        )
      ) {
        const success = await aclManager.resetToDefaults();
        if (success) {
          updatePermissions({
            role: aclManager.currentRole,
            permissions: aclManager.getPermissionsInfo(),
          });
          showNotification("Permission settings reset to defaults!");
        } else {
          showNotification("Failed to reset permission settings", true);
        }
      }
    });

  // Theme settings
  document
    .getElementById("saveThemeSettingsBtn")
    .addEventListener("click", async () => {
      const themeId = document.getElementById("currentTheme").value;
      const success = await themeManager.setTheme(themeId);
      if (success) {
        showNotification("Theme settings saved successfully!");
      } else {
        showNotification("Failed to save theme settings", true);
      }
    });

  // Reset theme settings
  document
    .getElementById("resetThemeSettingsBtn")
    .addEventListener("click", async () => {
      if (
        confirm("Are you sure you want to reset theme settings to defaults?")
      ) {
        const success = await themeManager.resetToDefaults();
        if (success) {
          updateThemeSettings({
            current: themeManager.currentTheme,
            themes: themeManager.getThemesInfo(),
          });
          showNotification("Theme settings reset to defaults!");
        } else {
          showNotification("Failed to reset theme settings", true);
        }
      }
    });

  // Reset all settings
  document
    .getElementById("resetSettingsBtn")
    .addEventListener("click", async () => {
      if (
        confirm(
          "Are you sure you want to reset all settings to defaults? This cannot be undone."
        )
      ) {
        const success = await settingsManager.resetAllToDefaults();
        if (success) {
          loadSettingsData();
          showNotification("All settings reset to defaults!");
        } else {
          showNotification("Failed to reset settings", true);
        }
      }
    });
}

// Show notification
function showNotification(message, isError = false) {
  const notification = document.createElement("div");
  notification.className = `notification${isError ? " error" : ""}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  // Remove notification after 3 seconds
  setTimeout(() => {
    notification.classList.add("fade-out");
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}
