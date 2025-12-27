// Import necessary modules
import "../components/dashboard.js";
import "../components/analytics.js"; // Analytics features available through Dashboard
import "../components/alerts.js";
import "../components/runners.js";
import "../components/auto-export.js";
import "../components/capture-filters.js";
import "../components/capture-settings.js";
import "../../lib/shared-components/chart-components.js";
import "../../lib/shared-components/chart-renderer.js";
import "../../lib/shared-components/data-filter-panel.js";
import {
  initializeDataManagement,
  updateDatabaseSizeDisplay,
} from "./data-management.js";
import "../../lib/shared-components/data-loader.js";
// Removed unused import: renderDataPurge - Data Retention section is now in HTML
import "../../lib/shared-components/data-visualization.js";
import "../components/export-db.js";
import "../../lib/shared-components/export-panel.js";
import "../../lib/shared-components/filters.js";
import "../../lib/shared-components/notifications.js";
import "../../lib/shared-components/performance-monitor.js";
import settingsManager from "../../lib/shared-components/settings-ui-coordinator.js";
import "../../lib/shared-components/settings-ui.js";
import "../../lib/shared-components/tab-manager.js";
import "../components/visualization.js";
import "../../auth/acl-manager.js";
import "../../config/feature-flags.js";
import themeManager from "../../lib/ui/theme-manager.js";
import "../../lib/chart.min.js";
import variablesManager from "./variables-manager.js";

// Configure Chart.js date adapter using date-fns
import { format, parseISO } from "date-fns";

// Register a minimal date adapter for Chart.js
if (window.Chart) {
  window.Chart._adapters._date.override({
    formats: function () {
      return {
        datetime: "MMM d, yyyy, HH:mm:ss",
        millisecond: "HH:mm:ss.SSS",
        second: "HH:mm:ss",
        minute: "HH:mm",
        hour: "HH:mm",
        day: "MMM d",
        week: "MMM d",
        month: "MMM yyyy",
        quarter: "MMM yyyy",
        year: "yyyy",
      };
    },
    parse: function (value) {
      if (value === null || value === undefined) return null;
      if (typeof value === "number") return value;
      if (value instanceof Date) return value.getTime();
      return new Date(value).getTime();
    },
    format: function (time, fmt) {
      try {
        return format(new Date(time), fmt);
      } catch (e) {
        return String(time);
      }
    },
    add: function (time, amount, unit) {
      const date = new Date(time);
      switch (unit) {
        case "millisecond":
          date.setMilliseconds(date.getMilliseconds() + amount);
          break;
        case "second":
          date.setSeconds(date.getSeconds() + amount);
          break;
        case "minute":
          date.setMinutes(date.getMinutes() + amount);
          break;
        case "hour":
          date.setHours(date.getHours() + amount);
          break;
        case "day":
          date.setDate(date.getDate() + amount);
          break;
        case "week":
          date.setDate(date.getDate() + amount * 7);
          break;
        case "month":
          date.setMonth(date.getMonth() + amount);
          break;
        case "quarter":
          date.setMonth(date.getMonth() + amount * 3);
          break;
        case "year":
          date.setFullYear(date.getFullYear() + amount);
          break;
      }
      return date.getTime();
    },
    diff: function (max, min, unit) {
      const diff = max - min;
      switch (unit) {
        case "millisecond":
          return diff;
        case "second":
          return diff / 1000;
        case "minute":
          return diff / 60000;
        case "hour":
          return diff / 3600000;
        case "day":
          return diff / 86400000;
        case "week":
          return diff / 604800000;
        case "month":
          return diff / 2628000000;
        case "quarter":
          return diff / 7884000000;
        case "year":
          return diff / 31536000000;
      }
      return diff;
    },
    startOf: function (time, unit) {
      const date = new Date(time);
      switch (unit) {
        case "second":
          date.setMilliseconds(0);
          break;
        case "minute":
          date.setSeconds(0, 0);
          break;
        case "hour":
          date.setMinutes(0, 0, 0);
          break;
        case "day":
          date.setHours(0, 0, 0, 0);
          break;
        case "week":
          date.setHours(0, 0, 0, 0);
          date.setDate(date.getDate() - date.getDay());
          break;
        case "month":
          date.setDate(1);
          date.setHours(0, 0, 0, 0);
          break;
        case "quarter":
          date.setMonth(Math.floor(date.getMonth() / 3) * 3, 1);
          date.setHours(0, 0, 0, 0);
          break;
        case "year":
          date.setMonth(0, 1);
          date.setHours(0, 0, 0, 0);
          break;
      }
      return date.getTime();
    },
    endOf: function (time, unit) {
      return this.startOf(this.add(time, 1, unit), unit) - 1;
    },
  });
}

// Constants
const DEFAULT_EXPORT_FORMAT = "json";
const DEFAULT_TIME_RANGE = 300; // 5 minutes in seconds
const POPULAR_API_PATTERNS = [
  "https://api.github.com/*",
  "https://*.googleapis.com/*",
  "https://api.twitter.com/*",
  "https://graph.facebook.com/*",
  "https://api.stripe.com/*",
  "https://*.amazonaws.com/*",
];

// DOM elements - will be initialized in DOMContentLoaded
let captureEnabled;
let maxStoredRequests;
let captureTypeCheckboxes;
let includeDomains;
let excludeDomains;
let autoExport;
let exportFormat;
let exportInterval;
let exportPath;
let plotEnabled;
let plotTypeCheckboxes;
let saveBtn;
let resetBtn;
let exportDbBtn;
let clearDbBtn;
let notification;
let dbTotalRequests;
let dbSize;
let lastExport;
let exportSettingsBtn;
let importSettingsBtn;
let importSettingsFile;
let currentThemeSelect;
let themesContainer;
let saveThemeBtn;
let resetThemeBtn;

// Load when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Options page: DOM loaded, initializing...");

    // Initialize DOM elements first
    captureEnabled = document.getElementById("captureEnabled");
    maxStoredRequests = document.getElementById("maxStoredRequests");
    captureTypeCheckboxes = document.querySelectorAll(
      'input[name="captureType"]'
    );
    includeDomains = document.getElementById("includeDomains");
    excludeDomains = document.getElementById("excludeDomains");
    autoExport = document.getElementById("autoExport");
    exportFormat = document.getElementById("exportFormat");
    exportInterval = document.getElementById("exportInterval");
    exportPath = document.getElementById("exportPath");
    plotEnabled = document.getElementById("plotEnabled");
    plotTypeCheckboxes = document.querySelectorAll('input[name="plotType"]');
    saveBtn = document.getElementById("saveBtn");
    resetBtn = document.getElementById("resetBtn");
    exportDbBtn = document.getElementById("exportDbBtn");
    clearDbBtn = document.getElementById("clearDbBtn");
    notification = document.getElementById("notification");
    dbTotalRequests = document.getElementById("dbTotalRequests");
    dbSize = document.getElementById("dbSize");
    lastExport = document.getElementById("lastExport");
    exportSettingsBtn = document.getElementById("exportSettingsBtn");
    importSettingsBtn = document.getElementById("importSettingsBtn");
    importSettingsFile = document.getElementById("importSettingsFile");
    currentThemeSelect = document.getElementById("currentTheme");
    themesContainer = document.querySelector(".themes-container");
    saveThemeBtn = document.getElementById("saveThemeBtn");
    resetThemeBtn = document.getElementById("resetThemeBtn");

    console.log("Options page: DOM elements initialized");

    // Initialize settings manager
    console.log("Options page: Initializing settings manager...");
    await settingsManager.initialize();
    console.log("Options page: Settings manager initialized");

    // Initialize theme manager
    console.log("Options page: Initializing theme manager...");
    const currentTheme =
      settingsManager.getAllSettings()?.theme?.current || "light";
    await themeManager.initialize({
      initialTheme: currentTheme,
      onUpdate: handleThemeUpdate,
    });
    console.log("Options page: Theme manager initialized");

    // Load initial settings
    console.log("Options page: Loading options...");
    await loadOptions();
    console.log("Options page: Options loaded");

    // Load profiles list
    console.log("Options page: Loading profiles...");
    await renderProfilesList();
    console.log("Options page: Profiles loaded");

    // Add settings change listener
    settingsManager.addSettingsListener(handleSettingsChange);

    // Initialize data purge component - REMOVED to prevent duplicate section
    // The Data Retention section is already in options.html

    // Set up tab navigation
    console.log("Options page: Setting up tab navigation...");
    setupTabNavigation();

    // Render theme options
    console.log("Options page: Rendering theme options...");
    renderThemeOptions();

    // Initialize variables manager
    console.log("Options page: Initializing variables manager...");
    await variablesManager.initialize();
    console.log("Options page: Variables manager initialized");

    // Setup event listeners for buttons
    console.log("Options page: Setting up event listeners...");
    setupEventListeners();

    // Initialize advanced tab
    console.log("Options page: Initializing advanced tab...");
    initializeAdvancedTab();

    // Initialize Analytics features (accessible from Dashboard)
    console.log("Options page: Initializing analytics features...");
    await initializeAnalytics();

    // Initialize Alerts component
    console.log("Options page: Initializing alerts...");
    await initializeAlerts();

    console.log("Options page: Initialization complete!");
  } catch (error) {
    console.error("Error initializing options:", error);
    console.error("Error stack:", error.stack);
    
    // Check if it's an extension context invalidated error
    if (error.message?.includes("Extension context invalidated")) {
      console.warn("Extension context was invalidated during initialization. This usually happens after an extension reload.");
      showNotification("Extension was reloaded. Please refresh this page.", true);
    } else {
      showNotification("Failed to initialize options: " + error.message, true);
    }
  }
});

// Load options from storage
async function loadOptions() {
  try {
    const allSettings = settingsManager.getAllSettings();
    const settings = allSettings.settings;

    // Update capture settings - with null checks
    if (captureEnabled)
      captureEnabled.checked = settings?.capture?.enabled ?? true;
    if (maxStoredRequests)
      maxStoredRequests.value = settings?.general?.maxStoredRequests ?? 10000;

    // Update capture types
    if (captureTypeCheckboxes && captureTypeCheckboxes.length > 0) {
      const includeTypes =
        settings?.capture?.captureFilters?.includeTypes || [];
      captureTypeCheckboxes.forEach((checkbox) => {
        checkbox.checked = includeTypes.includes(checkbox.value);
      });
    }

    // Update domains
    if (includeDomains) {
      const defaultInclude = ["github.com", "api.github.com"];
      const savedInclude =
        settings?.capture?.captureFilters?.includeDomains || [];
      // Use saved settings if available, otherwise use defaults
      includeDomains.value = (
        savedInclude.length > 0 ? savedInclude : defaultInclude
      ).join(", ");
    }
    if (excludeDomains) {
      const defaultExclude = [
        "chrome://*",
        "edge://*",
        "about:*",
        "chrome-extension://*",
        "moz-extension://*",
      ];
      const savedExclude =
        settings?.capture?.captureFilters?.excludeDomains || [];
      // Use saved settings if available, otherwise use defaults
      excludeDomains.value = (
        savedExclude.length > 0 ? savedExclude : defaultExclude
      ).join(", ");
    }

    // Update export settings
    if (autoExport) autoExport.checked = settings?.general?.autoExport ?? false;
    if (exportFormat)
      exportFormat.value = settings?.general?.defaultExportFormat || "json";
    if (exportInterval)
      exportInterval.value =
        (settings?.general?.autoExportInterval || 3600000) / 60000; // Convert to minutes
    if (exportPath) exportPath.value = settings?.general?.exportPath || "";

    // Update visualization settings
    if (plotEnabled)
      plotEnabled.checked = settings?.display?.showCharts ?? true;
    if (plotTypeCheckboxes && plotTypeCheckboxes.length > 0) {
      const enabledCharts = settings?.display?.enabledCharts || [];
      plotTypeCheckboxes.forEach((checkbox) => {
        checkbox.checked = enabledCharts.includes(checkbox.value);
      });
    }

    // Update theme settings
    if (currentThemeSelect && themeManager) {
      currentThemeSelect.value = themeManager.currentTheme || "light";
      renderThemeCards();
    }

    // Load database info
    await loadDatabaseInfo();
    if (typeof loadSqliteExportToggle === "function") {
      loadSqliteExportToggle();
    }
  } catch (error) {
    console.error("Error in loadOptions:", error);
    showNotification("Error loading some settings: " + error.message, true);
  }
}

// Load database information
async function loadDatabaseInfo() {
  try {
    // Skip if elements don't exist
    if (!dbTotalRequests && !dbSize && !lastExport) {
      console.log("Database info elements not found, skipping...");
      return;
    }

    const response = await chrome.runtime.sendMessage({
      action: "getDashboardStats",
      timeRange: 86400,
    });

    if (response && response.success && response.stats) {
      const stats = response.stats;

      if (dbTotalRequests) {
        dbTotalRequests.textContent = stats.totalRequests || 0;
      }

      // Estimate database size
      const totalRecords =
        (stats.layerCounts?.bronze || 0) +
        (stats.layerCounts?.silver || 0) +
        (stats.layerCounts?.gold || 0);
      const estimatedSize = Math.round(totalRecords * 0.5); // ~0.5KB per record

      if (dbSize) {
        dbSize.textContent =
          estimatedSize < 1024
            ? `${estimatedSize} KB`
            : `${(estimatedSize / 1024).toFixed(2)} MB`;
      }

      if (lastExport) {
        // Get last export time from storage
        const result = await chrome.storage.local.get("lastExportTime");
        if (result.lastExportTime) {
          lastExport.textContent = new Date(
            result.lastExportTime
          ).toLocaleString();
        } else {
          lastExport.textContent = "Never";
        }
      }
    }
  } catch (error) {
    console.error("Failed to load database info:", error);
  }
}

// Placeholder for SQLite export toggle (if needed by other components)
function loadSqliteExportToggle() {
  console.log("loadSqliteExportToggle called");
  // Implementation can be added here if needed
}

// Handle settings changes from other views
function handleSettingsChange(newSettings) {
  // Update UI elements with new settings
  captureEnabled.checked = newSettings.capture.enabled;
  maxStoredRequests.value = newSettings.general.maxStoredRequests;

  // Update theme UI if needed
  if (
    newSettings.theme &&
    newSettings.theme.current !== currentThemeSelect.value
  ) {
    currentThemeSelect.value = newSettings.theme.current;
    renderThemeCards();
  }
}

// Handle theme updates
function handleThemeUpdate(themeData) {
  currentThemeSelect.value = themeData.theme;
  renderThemeCards();
}

// Save options to storage
async function saveOptions() {
  const newSettings = {
    capture: {
      enabled: captureEnabled.checked,
      captureFilters: {
        includeTypes: Array.from(captureTypeCheckboxes)
          .filter((checkbox) => checkbox.checked)
          .map((checkbox) => checkbox.value),
        includeDomains: includeDomains.value
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d),
        excludeDomains: excludeDomains.value
          .split(",")
          .map((d) => d.trim())
          .filter((d) => d),
      },
    },
    general: {
      maxStoredRequests: Number.parseInt(maxStoredRequests.value, 10),
      autoExport: autoExport.checked,
      defaultExportFormat: exportFormat.value,
      autoExportInterval: Number.parseInt(exportInterval.value, 10) * 60000,
      exportPath: exportPath.value.trim(),
    },
    display: {
      showCharts: plotEnabled.checked,
      enabledCharts: Array.from(plotTypeCheckboxes)
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => checkbox.value),
    },
    theme: {
      current: themeManager.currentTheme,
    },
  };

  const success = await settingsManager.updateSettings(newSettings);
  if (success) {
    showNotification("Options saved successfully!");
  } else {
    showNotification("Error saving options", true);
  }
}

// Reset options to defaults
async function resetOptions() {
  const success = await settingsManager.resetAllToDefaults();
  if (success) {
    await loadOptions();
    showNotification("Options reset to defaults!");
  } else {
    showNotification("Error resetting options", true);
  }
}

// Show export preview before downloading
async function showExportPreview() {
  try {
    const exportData = settingsManager.exportSettings();
    const exportString = JSON.stringify(exportData, null, 2);
    const sizeInBytes = new Blob([exportString]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);

    // Count sections and settings
    const sections = Object.keys(exportData);
    let totalSettings = 0;
    const sectionCounts = {};

    for (const [section, content] of Object.entries(exportData)) {
      const count = Object.keys(content || {}).length;
      sectionCounts[section] = count;
      totalSettings += count;
    }

    // Show modal
    const modal = document.getElementById("exportPreviewModal");
    const sectionsCount = document.getElementById("exportSectionsCount");
    const settingsCount = document.getElementById("exportSettingsCount");
    const fileSize = document.getElementById("exportFileSize");
    const sectionsList = document.getElementById("exportSectionsList");
    const previewContent = document.getElementById("exportPreviewContent");
    const downloadBtn = document.getElementById("confirmExport");

    sectionsCount.textContent = sections.length;
    settingsCount.textContent = totalSettings;
    fileSize.textContent = `${sizeInKB} KB`;

    // Populate sections list
    sectionsList.innerHTML = sections
      .map(
        (section) =>
          `<div class="section-item">
            <span class="section-name">${section}</span>
            <span class="section-count">${sectionCounts[section]} settings</span>
          </div>`
      )
      .join("");

    // Show preview (first 50 lines)
    const lines = exportString.split("\n").slice(0, 50);
    const preview =
      lines.join("\n") + (exportString.split("\n").length > 50 ? "\n..." : "");
    previewContent.textContent = preview;

    modal.style.display = "block";

    // Return promise that resolves when user clicks download
    return new Promise((resolve) => {
      const handleDownload = () => {
        cleanup();
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        resolve(false);
      };

      const cleanup = () => {
        downloadBtn.removeEventListener("click", handleDownload);
        modal
          .querySelector(".close")
          .removeEventListener("click", handleCancel);
        document
          .getElementById("cancelExport")
          .removeEventListener("click", handleCancel);
        modal.style.display = "none";
      };

      downloadBtn.addEventListener("click", handleDownload);
      modal.querySelector(".close").addEventListener("click", handleCancel);
      document
        .getElementById("cancelExport")
        .addEventListener("click", handleCancel);
    });
  } catch (error) {
    console.error("Export preview error:", error);
    showNotification("Failed to generate export preview", true);
    return false;
  }
}

// Export settings to file
async function exportSettings() {
  // Show preview first
  const proceed = await showExportPreview();

  if (!proceed) {
    showNotification("Export cancelled");
    return;
  }

  const exportData = settingsManager.exportSettings();
  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `request-analyzer-settings-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification("Settings exported successfully!");
}

// Validate import data
function validateImportData(data) {
  const errors = [];
  const warnings = [];

  // Basic structure validation
  if (!data || typeof data !== "object") {
    errors.push("Invalid settings file format");
    return { valid: false, errors, warnings };
  }

  // Handle both flat structure and nested settings structure (from exportSettings)
  const settingsData = data.settings || data;

  // Check for at least one valid section
  const knownSections = [
    "general",
    "capture",
    "filters",
    "export",
    "themes",
    "retention",
    "monitoring",
    "display",
    "theme",
  ];
  const hasSections = knownSections.some((section) => settingsData[section]);
  if (!hasSections) {
    errors.push("No recognized settings sections found");
  }

  // Validate capture settings if present
  if (settingsData.capture) {
    const maxStored = settingsData.capture.maxStoredRequests;
    if (
      maxStored !== undefined &&
      (typeof maxStored !== "number" || maxStored < 100 || maxStored > 1000000)
    ) {
      errors.push(
        `Invalid maxStoredRequests: ${maxStored} (must be 100-1,000,000)`
      );
    }
  }

  // Validate filters if present
  if (settingsData.filters) {
    if (settingsData.filters.urlPattern) {
      try {
        new RegExp(settingsData.filters.urlPattern);
      } catch (e) {
        errors.push(`Invalid URL pattern regex: ${e.message}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Calculate diff between current and imported settings
function calculateSettingsDiff(current, imported) {
  const changes = [];

  // Handle nested settings structure (from exportSettings)
  const currentSettings = current.settings || current;
  const importedSettings = imported.settings || imported;

  for (const [section, sectionData] of Object.entries(importedSettings)) {
    if (!currentSettings[section] || typeof sectionData !== "object") continue;

    for (const [key, newValue] of Object.entries(sectionData)) {
      const oldValue = currentSettings[section][key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          section,
          key,
          oldValue: formatValue(oldValue),
          newValue: formatValue(newValue),
        });
      }
    }
  }

  return changes;
}

// Format value for display
function formatValue(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object")
    return JSON.stringify(value, null, 2).substring(0, 100) + "...";
  if (typeof value === "string" && value.length > 50)
    return value.substring(0, 50) + "...";
  return String(value);
}

// Show import preview modal
// originalImportData: The raw imported JSON (may have nested structure from exportSettings)
// dataToImport: Extracted/prepared settings to import (flat structure)
// currentData: Current settings from exportSettings() (nested structure)
function showImportPreview(
  originalImportData,
  dataToImport,
  currentData,
  isSelective
) {
  const modal = document.getElementById("importPreviewModal");
  const validationStatus = document.getElementById("importValidationStatus");
  const summary = document.getElementById("importSummary");
  const errorsDiv = document.getElementById("importErrors");
  const warningsDiv = document.getElementById("importWarnings");
  const changesDiv = document.getElementById("importChanges");
  const noChangesDiv = document.getElementById("importNoChanges");
  const applyBtn = document.getElementById("applyImportBtn");

  // Show modal
  modal.style.display = "flex";

  // Reset state
  summary.style.display = "none";
  errorsDiv.style.display = "none";
  warningsDiv.style.display = "none";
  changesDiv.style.display = "none";
  noChangesDiv.style.display = "none";
  applyBtn.disabled = true;

  // Validate
  setTimeout(() => {
    // Validate the original import data (handles both flat and nested structures)
    const validation = validateImportData(originalImportData);

    // Calculate changes between current and what will be imported
    // Wrap dataToImport in settings structure to match currentData format
    const importDataForDiff = { settings: dataToImport };
    const changes = calculateSettingsDiff(currentData, importDataForDiff);
    const sections = [...new Set(changes.map((c) => c.section))];

    // Update validation status
    validationStatus.innerHTML = validation.valid
      ? '<div class="validation-item"><i class="fas fa-check-circle text-success"></i><span>Validation successful</span></div>'
      : '<div class="validation-item"><i class="fas fa-times-circle text-danger"></i><span>Validation failed</span></div>';

    // Show summary
    summary.style.display = "block";
    document.getElementById("previewSectionsCount").textContent =
      sections.length;
    document.getElementById("previewChangesCount").textContent = changes.length;
    document.getElementById("previewValidation").innerHTML = validation.valid
      ? '<i class="fas fa-check-circle text-success"></i> Valid'
      : '<i class="fas fa-times-circle text-danger"></i> Invalid';

    // Show errors if any
    if (validation.errors.length > 0) {
      errorsDiv.style.display = "block";
      const errorsList = document.getElementById("importErrorsList");
      errorsList.innerHTML = validation.errors
        .map((e) => `<li>${e}</li>`)
        .join("");
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      warningsDiv.style.display = "block";
      const warningsList = document.getElementById("importWarningsList");
      warningsList.innerHTML = validation.warnings
        .map((w) => `<li>${w}</li>`)
        .join("");
    }

    // Show changes or no changes message
    if (changes.length === 0) {
      noChangesDiv.style.display = "block";
    } else {
      changesDiv.style.display = "block";
      const changesBody = document.getElementById("importChangesBody");
      changesBody.innerHTML = changes
        .map(
          (change) => `
        <tr>
          <td><strong>${change.section}</strong></td>
          <td>${change.key}</td>
          <td><span class="change-value old">${change.oldValue}</span></td>
          <td><span class="change-value new">${change.newValue}</span></td>
        </tr>
      `
        )
        .join("");
    }

    // Enable apply button if validation passed
    if (validation.valid && changes.length > 0) {
      applyBtn.disabled = false;
    }
  }, 500);

  return new Promise((resolve) => {
    applyBtn.onclick = () => {
      modal.style.display = "none";
      resolve(true);
    };

    const cancelBtn = document.getElementById("cancelImportBtn");
    cancelBtn.onclick = () => {
      modal.style.display = "none";
      resolve(false);
    };

    const closeBtn = modal.querySelector(".modal-close");
    closeBtn.onclick = () => {
      modal.style.display = "none";
      resolve(false);
    };
  });
}

// Import settings from file (updated with preview)
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Check selective import option
  const selectiveImport = document.getElementById("selectiveImport");
  const isSelective = selectiveImport && selectiveImport.checked;

  try {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const importData = JSON.parse(e.target.result);

        // Get current settings
        const currentData = settingsManager.exportSettings();

        // Extract settings from nested structure if present (exported via exportSettings)
        // This allows importing files exported with exportSettings() which has nested structure
        const settingsToImport = importData.settings || importData;

        // Handle selective import data preparation
        let dataToImport = settingsToImport;
        if (isSelective) {
          const selectedSections = Array.from(
            document.querySelectorAll('input[name="importSection"]:checked')
          ).map((cb) => cb.value);

          if (selectedSections.length === 0) {
            showNotification("No sections selected for import", true);
            event.target.value = "";
            return;
          }

          // Merge: keep current data, override only selected sections
          dataToImport = { ...currentData.settings };
          selectedSections.forEach((section) => {
            if (settingsToImport[section]) {
              dataToImport[section] = settingsToImport[section];
            }
          });
        }

        // Show preview and wait for user decision
        // Pass original importData for validation (handles nested structure)
        // Pass extracted dataToImport for diff comparison
        const proceed = await showImportPreview(
          importData,
          dataToImport,
          currentData,
          isSelective
        );

        if (!proceed) {
          showNotification("Import cancelled");
          event.target.value = "";
          return;
        }

        // Create automatic backup before import
        showNotification("Creating backup before import...");
        const backup = settingsManager.exportSettings();
        const backupBlob = new Blob([JSON.stringify(backup, null, 2)], {
          type: "application/json",
        });
        const backupUrl = URL.createObjectURL(backupBlob);
        const backupLink = document.createElement("a");
        backupLink.href = backupUrl;
        backupLink.download = `ura-backup-before-import-${Date.now()}.json`;
        backupLink.click();
        URL.revokeObjectURL(backupUrl);

        // Apply import
        showNotification("Applying settings...");
        const success = await settingsManager.importSettings(dataToImport);

        if (success) {
          await loadOptions(); // Reload UI with new settings
          showNotification(
            "Settings imported successfully! Backup saved to downloads."
          );
        } else {
          showNotification("Failed to import settings", true);
        }
      } catch (error) {
        console.error("Import error:", error);
        showNotification(`Invalid settings file: ${error.message}`, true);
      }
    };
    reader.readAsText(file);
  } catch (error) {
    console.error("File read error:", error);
    showNotification("Failed to read settings file", true);
  }

  // Clear the file input for future imports
  event.target.value = "";
}

// ===============================================
// Settings Profiles Management
// ===============================================

const PROFILES_KEY = "settingsProfiles";

// Load profiles from storage
async function loadProfiles() {
  try {
    const result = await chrome.storage.local.get(PROFILES_KEY);
    return result[PROFILES_KEY] || [];
  } catch (error) {
    console.error("Failed to load profiles:", error);
    return [];
  }
}

// Save profiles to storage
async function saveProfiles(profiles) {
  try {
    await chrome.storage.local.set({ [PROFILES_KEY]: profiles });
    return true;
  } catch (error) {
    console.error("Failed to save profiles:", error);
    return false;
  }
}

// Save current settings as a profile
async function saveCurrentAsProfile(name, description = "") {
  try {
    const currentSettings = settingsManager.exportSettings();
    const profiles = await loadProfiles();

    const newProfile = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description.trim(),
      settings: currentSettings,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    profiles.push(newProfile);
    const success = await saveProfiles(profiles);

    if (success) {
      await renderProfilesList();
      showNotification(`Profile "${name}" saved successfully!`);
    } else {
      showNotification("Failed to save profile", true);
    }

    return success;
  } catch (error) {
    console.error("Save profile error:", error);
    showNotification("Failed to save profile", true);
    return false;
  }
}

// Load a profile
async function loadProfile(profileId) {
  try {
    const profiles = await loadProfiles();
    const profile = profiles.find((p) => p.id === profileId);

    if (!profile) {
      showNotification("Profile not found", true);
      return false;
    }

    // Show confirmation
    const confirmed = confirm(
      `Load profile "${profile.name}"?\n\n` +
        `This will replace your current settings.\n` +
        `A backup will be created automatically.`
    );

    if (!confirmed) return false;

    // Create backup
    const backup = settingsManager.exportSettings();
    const backupBlob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const backupUrl = URL.createObjectURL(backupBlob);
    const backupLink = document.createElement("a");
    backupLink.href = backupUrl;
    backupLink.download = `ura-backup-${Date.now()}.json`;
    backupLink.click();
    URL.revokeObjectURL(backupUrl);

    // Apply profile settings
    showNotification("Loading profile...");
    const success = await settingsManager.importSettings(profile.settings);

    if (success) {
      await loadOptions();
      showNotification(`Profile "${profile.name}" loaded successfully!`);
    } else {
      showNotification("Failed to load profile", true);
    }

    return success;
  } catch (error) {
    console.error("Load profile error:", error);
    showNotification("Failed to load profile", true);
    return false;
  }
}

// Delete a profile
async function deleteProfile(profileId) {
  try {
    const profiles = await loadProfiles();
    const profile = profiles.find((p) => p.id === profileId);

    if (!profile) {
      showNotification("Profile not found", true);
      return false;
    }

    const confirmed = confirm(
      `Delete profile "${profile.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return false;

    const updatedProfiles = profiles.filter((p) => p.id !== profileId);
    const success = await saveProfiles(updatedProfiles);

    if (success) {
      await renderProfilesList();
      showNotification(`Profile "${profile.name}" deleted`);
    } else {
      showNotification("Failed to delete profile", true);
    }

    return success;
  } catch (error) {
    console.error("Delete profile error:", error);
    showNotification("Failed to delete profile", true);
    return false;
  }
}

// Rename a profile
async function renameProfile(profileId, newName, newDescription) {
  try {
    const profiles = await loadProfiles();
    const profile = profiles.find((p) => p.id === profileId);

    if (!profile) {
      showNotification("Profile not found", true);
      return false;
    }

    profile.name = newName.trim();
    profile.description = newDescription.trim();
    profile.updatedAt = Date.now();

    const success = await saveProfiles(profiles);

    if (success) {
      await renderProfilesList();
      showNotification("Profile updated successfully!");
    } else {
      showNotification("Failed to update profile", true);
    }

    return success;
  } catch (error) {
    console.error("Rename profile error:", error);
    showNotification("Failed to update profile", true);
    return false;
  }
}

// Render profiles list in quick load section
async function renderProfilesList() {
  const container = document.getElementById("profilesList");
  if (!container) return;

  const profiles = await loadProfiles();

  if (profiles.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-layer-group fa-3x"></i>
        <p>No profiles saved yet</p>
        <p class="help-text">Click "Save Current as Profile" to create your first profile</p>
      </div>
    `;
    return;
  }

  container.innerHTML = profiles
    .map(
      (profile) => `
    <div class="profile-card" data-id="${profile.id}">
      <div class="profile-header">
        <div class="profile-info">
          <h4 class="profile-name">${escapeHtml(profile.name)}</h4>
          ${
            profile.description
              ? `<p class="profile-description">${escapeHtml(
                  profile.description
                )}</p>`
              : ""
          }
        </div>
        <div class="profile-meta">
          <span class="profile-date">${new Date(
            profile.createdAt
          ).toLocaleDateString()}</span>
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn-primary btn-sm load-profile" data-id="${profile.id}">
          <i class="fas fa-download"></i> Load
        </button>
        <button class="btn-secondary btn-sm show-manage-profiles">
          <i class="fas fa-cog"></i> Manage
        </button>
      </div>
    </div>
  `
    )
    .join("");

  // Add event listeners
  container.querySelectorAll(".load-profile").forEach((btn) => {
    btn.addEventListener("click", () => {
      const profileId = btn.getAttribute("data-id");
      loadProfile(profileId);
    });
  });

  // Event delegation for "Manage" buttons
  container.querySelectorAll(".show-manage-profiles").forEach((btn) => {
    btn.addEventListener("click", () => {
      showManageProfiles();
    });
  });
}

// Helper to escape HTML
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Show save profile modal
function showSaveProfileModal() {
  const modal = document.getElementById("saveProfileModal");
  const nameInput = document.getElementById("profileName");
  const descriptionInput = document.getElementById("profileDescription");

  nameInput.value = "";
  descriptionInput.value = "";
  modal.style.display = "block";

  const confirmBtn = document.getElementById("confirmSaveProfile");
  const cancelBtn = document.getElementById("cancelSaveProfile");
  const closeBtn = modal.querySelector(".close");

  const handleSave = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      showNotification("Profile name is required", true);
      return;
    }

    const description = descriptionInput.value.trim();
    const success = await saveCurrentAsProfile(name, description);

    if (success) {
      modal.style.display = "none";
    }
  };

  const handleClose = () => {
    modal.style.display = "none";
  };

  confirmBtn.onclick = handleSave;
  cancelBtn.onclick = handleClose;
  closeBtn.onclick = handleClose;
}

// Show manage profiles modal
async function showManageProfiles() {
  const modal = document.getElementById("manageProfilesModal");
  const listContainer = document.getElementById("manageProfilesList");

  const profiles = await loadProfiles();

  if (profiles.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-layer-group fa-3x"></i>
        <p>No profiles to manage</p>
      </div>
    `;
  } else {
    listContainer.innerHTML = profiles
      .map(
        (profile) => `
      <div class="manage-profile-item" data-id="${profile.id}">
        <div class="profile-details">
          <h4>${escapeHtml(profile.name)}</h4>
          ${
            profile.description
              ? `<p class="description">${escapeHtml(profile.description)}</p>`
              : ""
          }
          <div class="meta">
            <span><i class="fas fa-calendar"></i> Created: ${new Date(
              profile.createdAt
            ).toLocaleDateString()}</span>
            <span><i class="fas fa-clock"></i> Updated: ${new Date(
              profile.updatedAt
            ).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="profile-manage-actions">
          <button class="btn-primary btn-sm profile-action-btn" data-action="load" data-profile-id="${
            profile.id
          }">
            <i class="fas fa-download"></i> Load
          </button>
          <button class="btn-secondary btn-sm profile-action-btn" data-action="export" data-profile-id="${
            profile.id
          }">
            <i class="fas fa-file-export"></i> Export
          </button>
          <button class="btn-danger btn-sm profile-action-btn" data-action="delete" data-profile-id="${
            profile.id
          }">
            <i class="fas fa-trash"></i> Delete
          </button>
        </div>
      </div>
    `
      )
      .join("");
  }

  modal.style.display = "block";

  const closeBtn = document.getElementById("closeManageProfiles");
  const modalCloseBtn = modal.querySelector(".close");

  const handleClose = () => {
    modal.style.display = "none";
  };

  closeBtn.onclick = handleClose;
  modalCloseBtn.onclick = handleClose;

  // Event delegation for profile action buttons (load, export, delete)
  listContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".profile-action-btn");
    if (!btn) return;

    const action = btn.getAttribute("data-action");
    const profileId = btn.getAttribute("data-profile-id");

    if (action === "load") {
      loadProfile(profileId);
      modal.style.display = "none";
    } else if (action === "export") {
      exportProfile(profileId);
    } else if (action === "delete") {
      deleteProfile(profileId);
    }
  });
}

// Export a profile to file
async function exportProfile(profileId) {
  try {
    const profiles = await loadProfiles();
    const profile = profiles.find((p) => p.id === profileId);

    if (!profile) {
      showNotification("Profile not found", true);
      return;
    }

    const blob = new Blob([JSON.stringify(profile, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ura-profile-${profile.name.replace(
      /[^a-z0-9]/gi,
      "-"
    )}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification(`Profile "${profile.name}" exported!`);
  } catch (error) {
    console.error("Export profile error:", error);
    showNotification("Failed to export profile", true);
  }
}

// Make functions globally available for inline event handlers
window.loadProfile = loadProfile;
window.deleteProfile = deleteProfile;
window.showManageProfiles = showManageProfiles;
window.exportProfile = exportProfile;

// Selective import toggle
const selectiveImportCheckbox = document.getElementById("selectiveImport");
const selectiveImportOptions = document.getElementById(
  "selectiveImportOptions"
);

if (selectiveImportCheckbox && selectiveImportOptions) {
  selectiveImportCheckbox.addEventListener("change", () => {
    selectiveImportOptions.style.display = selectiveImportCheckbox.checked
      ? "block"
      : "none";
  });
}

// Render theme options
function renderThemeOptions() {
  // Handle theme selection change
  currentThemeSelect.addEventListener("change", async (e) => {
    const themeId = e.target.value;
    await themeManager.setTheme(themeId);

    // Also save to settingsManager immediately so it persists on reload
    await settingsManager.updateSettings({
      theme: {
        current: themeId,
      },
    });

    renderThemeCards();
  });

  // Handle theme save
  saveThemeBtn.addEventListener("click", async () => {
    const success = await settingsManager.updateSettings({
      theme: {
        current: themeManager.currentTheme,
      },
    });

    if (success) {
      showNotification("Theme settings saved successfully!");
    } else {
      showNotification("Error saving theme settings", true);
    }
  });

  // Handle theme reset
  resetThemeBtn.addEventListener("click", async () => {
    if (confirm("Are you sure you want to reset theme settings to defaults?")) {
      await themeManager.resetToDefaults();
      currentThemeSelect.value = themeManager.currentTheme;
      renderThemeCards();
      showNotification("Theme settings reset to defaults!");
    }
  });

  // Initial render of theme cards
  renderThemeCards();
}

// Render theme preview cards
function renderThemeCards() {
  const themes = themeManager.getThemesInfo();
  themesContainer.innerHTML = themes
    .map(
      (theme) => `
    <div class="theme-card ${
      theme.isCurrentTheme ? "current-theme" : ""
    }" data-theme-id="${theme.id}">
      <div class="theme-preview" style="background-color: ${
        theme.previewColors.background
      }">
        <div class="theme-preview-header" style="
          background-color: ${theme.previewColors.surface};
          color: ${theme.previewColors.text};
          border: 1px solid ${theme.previewColors.primary};">
          ${theme.name}
        </div>
      </div>
      <div class="theme-info">
        <div class="theme-name">${theme.name}</div>
        <div class="theme-description">${theme.description}</div>
      </div>
      <div class="theme-actions">
        <button class="theme-apply-btn" data-theme-id="${theme.id}"
          ${theme.isCurrentTheme ? "disabled" : ""}>
          ${theme.isCurrentTheme ? "Current Theme" : "Apply Theme"}
        </button>
      </div>
    </div>
  `
    )
    .join("");

  // Add theme card click handlers
  document.querySelectorAll(".theme-apply-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const themeId = e.target.dataset.themeId;
      await themeManager.setTheme(themeId);
      currentThemeSelect.value = themeId;
      renderThemeCards();
      showNotification(
        `${themeManager.themes[themeId].name} theme applied successfully!`
      );
    });
  });
}

// Setup tab navigation
function setupTabNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const tabContents = document.querySelectorAll(".tab-content");
  const pageTitle = document.getElementById("pageTitle");

  console.log(
    `Found ${navItems.length} nav items and ${tabContents.length} tab contents`
  );

  // Tab titles mapping
  const tabTitles = {
    dashboard: "Dashboard",
    runners: "Request Runners",
    general: "General Settings",
    monitoring: "Monitoring",
    filters: "Filters",
    export: "Export Settings",
    retention: "Data Retention",
    security: "Security Settings",
    themes: "Themes",
    advanced: "Advanced Tools",
  };

  navItems.forEach((item, index) => {
    const tabName = item.dataset.tab;
    console.log(`Nav item ${index}: ${tabName}`);

    item.addEventListener("click", () => {
      const tab = item.dataset.tab;
      console.log(`Tab clicked: ${tab}`);

      // Remove active class from all items and contents
      navItems.forEach((i) => i.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      // Add active class to clicked item and corresponding content
      item.classList.add("active");
      const content = document.getElementById(tab);
      if (content) {
        content.classList.add("active");
        console.log(`Activated content for: ${tab}`);
      } else {
        console.error(`No content found for tab: ${tab}`);
      }

      // Update page title
      if (pageTitle && tabTitles[tab]) {
        pageTitle.textContent = tabTitles[tab];
      }
    });
  });

  // Also support old tab-button class for backwards compatibility
  const oldTabs = document.querySelectorAll(".tab-button");
  oldTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const tabId = tab.dataset.tab;

      // Update active button
      oldTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      // Update active content
      tabContents.forEach((c) => c.classList.remove("active"));
      const content = document.getElementById(tabId);
      if (content) {
        content.classList.add("active");
      }
    });
  });
}

// Show notification
function showNotification(message, isError = false) {
  notification.textContent = message;
  notification.className = "notification" + (isError ? " error" : "");
  notification.classList.add("visible");

  setTimeout(() => {
    notification.classList.remove("visible");
  }, 5000);
}

// Setup event listeners for all buttons and controls
function setupEventListeners() {
  // Save and Reset buttons
  if (saveBtn) {
    saveBtn.addEventListener("click", saveOptions);
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", resetOptions);
  }

  // Database buttons
  if (exportDbBtn) {
    exportDbBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage(
        {
          action: "exportDatabase",
          format: exportFormat?.value || DEFAULT_EXPORT_FORMAT,
          filename: `database-export-${new Date().toISOString().slice(0, 10)}.${
            exportFormat?.value || DEFAULT_EXPORT_FORMAT
          }`,
        },
        (response) => {
          if (response && response.success) {
            showNotification("Database exported successfully!");
            if (lastExport)
              lastExport.textContent = new Date().toLocaleString();
          } else {
            showNotification("Failed to export database", true);
          }
        }
      );
    });
  }

  if (clearDbBtn) {
    clearDbBtn.addEventListener("click", async () => {
      // Enhanced confirmation with database info
      const response = await chrome.runtime.sendMessage({
        action: "getDatabaseSize",
      });
      const records = response?.records || 0;
      const sizeMB = response?.size
        ? (response.size / (1024 * 1024)).toFixed(2)
        : "0";

      const confirmed = confirm(
        `⚠️ WARNING: Clear All Database Records?\n\n` +
          `This will permanently delete:\n` +
          `- ${records.toLocaleString()} records\n` +
          `- ${sizeMB} MB of data\n\n` +
          `This action cannot be undone!\n\n` +
          `Are you sure?`
      );

      if (!confirmed) return;

      // Second confirmation for large databases
      if (records > 10000) {
        const doubleConfirm = confirm(
          `⚠️ FINAL CONFIRMATION\n\n` +
            `You are about to delete ${records.toLocaleString()} records.\n\n` +
            `This is your last chance to cancel.`
        );

        if (!doubleConfirm) return;
      }

      chrome.runtime.sendMessage({ action: "clearDatabase" }, (response) => {
        if (response && response.success) {
          showNotification("Database cleared successfully!");
          loadDatabaseInfo();
          updateDatabaseSizeDisplay();
        } else {
          showNotification("Failed to clear database", true);
        }
      });
    });
  }

  // Import/export settings
  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener("click", exportSettings);
  }
  if (importSettingsBtn && importSettingsFile) {
    importSettingsBtn.addEventListener("click", () =>
      importSettingsFile.click()
    );
    importSettingsFile.addEventListener("change", importSettings);
  }

  // Settings profiles
  const saveProfileBtn = document.getElementById("saveProfile");
  const manageProfilesBtn = document.getElementById("manageProfiles");

  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", showSaveProfileModal);
  }
  if (manageProfilesBtn) {
    manageProfilesBtn.addEventListener("click", showManageProfiles);
  }

  // Save All button
  const saveAllBtn = document.getElementById("saveAllBtn");
  if (saveAllBtn) {
    saveAllBtn.addEventListener("click", saveOptions);
  }

  // Theme buttons
  if (saveThemeBtn) {
    saveThemeBtn.addEventListener("click", async () => {
      if (currentThemeSelect && themeManager) {
        const selectedTheme = currentThemeSelect.value;
        await themeManager.setTheme(selectedTheme);
        showNotification("Theme saved successfully!");
      }
    });
  }

  if (resetThemeBtn) {
    resetThemeBtn.addEventListener("click", async () => {
      if (themeManager) {
        await themeManager.setTheme("light");
        if (currentThemeSelect) currentThemeSelect.value = "light";
        showNotification("Theme reset to default!");
      }
    });
  }

  // Preset buttons for storage
  const presetButtons = document.querySelectorAll(".preset-btn");
  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.value;
      if (maxStoredRequests && value) {
        maxStoredRequests.value = value;
        updateStorageUsageDisplay();
      }
    });
  });

  // Site tracking buttons
  const validateSitesBtn = document.getElementById("validateSitesBtn");
  if (validateSitesBtn) {
    validateSitesBtn.addEventListener("click", validateTrackingSites);
  }

  const addCurrentSiteBtn = document.getElementById("addCurrentSiteBtn");
  if (addCurrentSiteBtn) {
    addCurrentSiteBtn.addEventListener("click", addCurrentSiteToTracking);
  }

  // Site preset buttons
  const sitePresetButtons = document.querySelectorAll(".site-preset-btn");
  sitePresetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      handleSitePreset(preset);
    });
  });

  // Update storage display when max changes
  if (maxStoredRequests) {
    maxStoredRequests.addEventListener("change", updateStorageUsageDisplay);
  }

  // Filter modal buttons
  const dashboardFilterToggle = document.getElementById(
    "dashboardFilterToggle"
  );
  const dashboardFilterModal = document.getElementById("dashboardFilterModal");
  if (dashboardFilterToggle && dashboardFilterModal) {
    // Set up domain change listener for modal
    const modalDomain = document.getElementById("dashboardModalDomainFilter");
    const modalPage = document.getElementById("dashboardModalPageFilter");

    if (modalDomain && modalPage) {
      modalDomain.addEventListener("change", async function () {
        const selectedDomain = modalDomain.value;

        // Clear and disable page filter if "all" selected
        if (!selectedDomain || selectedDomain === "all") {
          modalPage.innerHTML =
            '<option value="">All Pages (Aggregated)</option>';
          modalPage.disabled = true;
          return;
        }

        // Load pages for selected domain
        modalPage.disabled = false;
        modalPage.innerHTML = '<option value="">Loading pages...</option>';

        try {
          const response = await chrome.runtime.sendMessage({
            action: "getPagesByDomain",
            domain: selectedDomain,
            timeRange: 604800, // Last 7 days
          });

          // Reset with default option
          modalPage.innerHTML =
            '<option value="">All Pages (Aggregated)</option>';

          if (
            response &&
            response.success &&
            response.pages &&
            response.pages.length > 0
          ) {
            response.pages.forEach((pageObj) => {
              const pageUrl = pageObj.pageUrl;
              if (pageUrl) {
                const option = document.createElement("option");
                option.value = pageUrl;
                try {
                  const url = new URL(pageUrl);
                  const displayPath = url.pathname + url.search || "/";
                  option.textContent = `${displayPath} (${pageObj.requestCount} req)`;
                } catch (e) {
                  option.textContent = `${pageUrl} (${pageObj.requestCount} req)`;
                }
                modalPage.appendChild(option);
              }
            });
          }
        } catch (error) {
          console.error("Failed to load pages:", error);
          modalPage.innerHTML = '<option value="">Error loading pages</option>';
        }
      });
    }

    dashboardFilterToggle.addEventListener("click", async function () {
      // Sync current filter values to modal
      const currentDomain =
        document.getElementById("dashboardDomainFilter")?.value || "all";
      const currentPage =
        document.getElementById("dashboardPageFilter")?.value || "";
      const currentType =
        document.getElementById("dashboardRequestTypeFilter")?.value || "";

      const modalDomain = document.getElementById("dashboardModalDomainFilter");
      const modalPage = document.getElementById("dashboardModalPageFilter");
      const modalType = document.getElementById(
        "dashboardModalRequestTypeFilter"
      );

      if (modalDomain) modalDomain.value = currentDomain;
      if (modalPage) modalPage.value = currentPage;
      if (modalType) modalType.value = currentType;

      // Trigger domain change to load pages
      if (modalDomain && currentDomain && currentDomain !== "all") {
        modalDomain.dispatchEvent(new Event("change"));
      }

      dashboardFilterModal.style.display = "flex";
    });

    // Close modal button
    const dashboardModalClose =
      dashboardFilterModal.querySelector(".modal-close");
    if (dashboardModalClose) {
      dashboardModalClose.addEventListener("click", () => {
        dashboardFilterModal.style.display = "none";
      });
    }

    // Cancel button
    const cancelDashboardFiltersBtn = document.getElementById(
      "cancelDashboardFiltersBtn"
    );
    if (cancelDashboardFiltersBtn) {
      cancelDashboardFiltersBtn.addEventListener("click", () => {
        dashboardFilterModal.style.display = "none";
      });
    }

    // Apply filters button
    const applyDashboardFiltersBtn = document.getElementById(
      "applyDashboardFiltersBtn"
    );
    if (applyDashboardFiltersBtn) {
      applyDashboardFiltersBtn.addEventListener("click", () => {
        // Copy modal values back to actual filters
        const modalDomain = document.getElementById(
          "dashboardModalDomainFilter"
        );
        const modalPage = document.getElementById("dashboardModalPageFilter");
        const modalType = document.getElementById(
          "dashboardModalRequestTypeFilter"
        );

        const actualDomain = document.getElementById("dashboardDomainFilter");
        const actualPage = document.getElementById("dashboardPageFilter");
        const actualType = document.getElementById(
          "dashboardRequestTypeFilter"
        );

        if (modalDomain && actualDomain) actualDomain.value = modalDomain.value;
        if (modalPage && actualPage) actualPage.value = modalPage.value;
        if (modalType && actualType) actualType.value = modalType.value;

        // Trigger change events to refresh dashboard
        if (actualDomain) actualDomain.dispatchEvent(new Event("change"));

        dashboardFilterModal.style.display = "none";
      });
    }

    // Close on background click
    dashboardFilterModal.addEventListener("click", (e) => {
      if (e.target === dashboardFilterModal) {
        dashboardFilterModal.style.display = "none";
      }
    });
  }

  const analyticsFilterToggle = document.getElementById(
    "analyticsFilterToggle"
  );
  const analyticsFilterModal = document.getElementById("analyticsFilterModal");
  if (analyticsFilterToggle && analyticsFilterModal) {
    analyticsFilterToggle.addEventListener("click", function () {
      // Sync current filter values to modal
      const currentDomain =
        document.getElementById("analyticsDomainFilter")?.value || "all";
      const currentPage =
        document.getElementById("analyticsPageFilter")?.value || "";
      const currentType =
        document.getElementById("analyticsRequestTypeFilter")?.value || "";

      const modalDomain = document.getElementById("analyticsModalDomainFilter");
      const modalPage = document.getElementById("analyticsModalPageFilter");
      const modalType = document.getElementById(
        "analyticsModalRequestTypeFilter"
      );

      if (modalDomain) modalDomain.value = currentDomain;
      if (modalPage) modalPage.value = currentPage;
      if (modalType) modalType.value = currentType;

      analyticsFilterModal.style.display = "flex";
    });

    // Close modal button
    const analyticsModalClose =
      analyticsFilterModal.querySelector(".modal-close");
    if (analyticsModalClose) {
      analyticsModalClose.addEventListener("click", () => {
        analyticsFilterModal.style.display = "none";
      });
    }

    // Cancel button
    const cancelAnalyticsFiltersBtn = document.getElementById(
      "cancelAnalyticsFiltersBtn"
    );
    if (cancelAnalyticsFiltersBtn) {
      cancelAnalyticsFiltersBtn.addEventListener("click", () => {
        analyticsFilterModal.style.display = "none";
      });
    }

    // Apply filters button
    const applyAnalyticsFiltersBtn = document.getElementById(
      "applyAnalyticsFiltersBtn"
    );
    if (applyAnalyticsFiltersBtn) {
      applyAnalyticsFiltersBtn.addEventListener("click", () => {
        // Copy modal values back to actual filters
        const modalDomain = document.getElementById(
          "analyticsModalDomainFilter"
        );
        const modalPage = document.getElementById("analyticsModalPageFilter");
        const modalType = document.getElementById(
          "analyticsModalRequestTypeFilter"
        );

        const actualDomain = document.getElementById("analyticsDomainFilter");
        const actualPage = document.getElementById("analyticsPageFilter");
        const actualType = document.getElementById(
          "analyticsRequestTypeFilter"
        );

        if (modalDomain && actualDomain) actualDomain.value = modalDomain.value;
        if (modalPage && actualPage) actualPage.value = modalPage.value;
        if (modalType && actualType) actualType.value = modalType.value;

        // Trigger change events to refresh analytics
        if (actualDomain) actualDomain.dispatchEvent(new Event("change"));

        analyticsFilterModal.style.display = "none";
      });
    }

    // Close on background click
    analyticsFilterModal.addEventListener("click", (e) => {
      if (e.target === analyticsFilterModal) {
        analyticsFilterModal.style.display = "none";
      }
    });
  }

  // Data Management Features
  initializeDataManagement(showNotification);

  // Add validation to domain inputs
  const includeDomains = document.getElementById("includeDomains");
  if (includeDomains) {
    includeDomains.addEventListener("blur", () =>
      validateDomainList(includeDomains)
    );
  }

  const excludeDomains = document.getElementById("excludeDomains");
  if (excludeDomains) {
    excludeDomains.addEventListener("blur", () =>
      validateDomainList(excludeDomains)
    );
  }
}

// Helper function to update storage usage display
function updateStorageUsageDisplay() {
  const currentCount = parseInt(
    document.getElementById("currentStorageCount")?.textContent || "0"
  );
  const maxCount = parseInt(maxStoredRequests?.value || 10000);
  const maxDisplay = document.getElementById("maxStorageDisplay");
  const usageBarFill = document.getElementById("usageBarFill");

  if (maxDisplay) {
    maxDisplay.textContent = maxCount.toLocaleString();
  }

  if (usageBarFill) {
    const percentage = (currentCount / maxCount) * 100;
    usageBarFill.style.width = `${Math.min(percentage, 100)}%`;

    // Color coding
    if (percentage > 90) {
      usageBarFill.style.backgroundColor = "#e53e3e";
    } else if (percentage > 75) {
      usageBarFill.style.backgroundColor = "#ed8936";
    } else {
      usageBarFill.style.backgroundColor = "#667eea";
    }
  }
}

// Helper functions for site tracking
function validateTrackingSites() {
  const trackingSites = document.getElementById("trackingSites");
  const validationResult = document.getElementById("sitesValidationResult");

  if (!trackingSites || !validationResult) return;

  const sites = trackingSites.value.split("\n").filter((s) => s.trim());

  if (sites.length === 0) {
    validationResult.textContent = "No sites to validate";
    validationResult.style.color = "#999";
    return;
  }

  // Simple validation - check for basic URL patterns
  let valid = 0;
  let invalid = 0;

  sites.forEach((site) => {
    const trimmed = site.trim();
    // Check if it's a regex pattern
    if (trimmed.startsWith("/") && trimmed.endsWith("/")) {
      valid++;
    }
    // Check if it contains wildcard or looks like a URL
    else if (
      trimmed.includes("*") ||
      trimmed.includes("://") ||
      trimmed.includes(".")
    ) {
      valid++;
    } else {
      invalid++;
    }
  });

  if (invalid === 0) {
    validationResult.textContent = `✓ All ${valid} patterns are valid`;
    validationResult.style.color = "#48bb78";
  } else {
    validationResult.textContent = `⚠ ${valid} valid, ${invalid} may be invalid`;
    validationResult.style.color = "#ed8936";
  }
}

async function addCurrentSiteToTracking() {
  const trackingSites = document.getElementById("trackingSites");
  if (!trackingSites) return;

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      const sitePattern = `${url.protocol}//${url.hostname}/*`;

      const current = trackingSites.value.trim();
      if (current) {
        trackingSites.value = current + "\n" + sitePattern;
      } else {
        trackingSites.value = sitePattern;
      }

      showNotification(`Added: ${sitePattern}`);
      validateTrackingSites();
    }
  } catch (error) {
    console.error("Failed to add current site:", error);
    showNotification("Failed to add current site", true);
  }
}

function handleSitePreset(preset) {
  const trackingSites = document.getElementById("trackingSites");
  if (!trackingSites) return;

  switch (preset) {
    case "current":
      addCurrentSiteToTracking();
      break;
    case "popular":
      trackingSites.value = POPULAR_API_PATTERNS.join("\n");
      validateTrackingSites();
      showNotification("Added popular API patterns");
      break;
    case "clear":
      if (confirm("Clear all tracking sites?")) {
        trackingSites.value = "";
        validateTrackingSites();
        showNotification("Tracking sites cleared");
      }
      break;
  }
}

// Advanced Tab Functionality
function initializeAdvancedTab() {
  // Execute Query
  const executeQueryBtn = document.getElementById("executeQueryBtn");
  const clearQueryBtn = document.getElementById("clearQueryBtn");
  const advancedQuery = document.getElementById("advancedQuery");
  const queryResult = document.getElementById("queryResult");

  if (executeQueryBtn) {
    executeQueryBtn.addEventListener("click", async () => {
      const query = advancedQuery?.value?.trim();
      if (!query) {
        showNotification("Please enter a query", true);
        return;
      }

      try {
        const response = await chrome.runtime.sendMessage({
          action: "executeDirectQuery",
          query: query,
        });

        if (response.success && queryResult) {
          displayQueryResult(response.data, queryResult);
          showNotification("Query executed successfully");
          // Save to query history
          await saveQueryToHistory(query, true, null);
        } else {
          if (queryResult) {
            queryResult.innerHTML = `<p style="color: red;">Error: ${
              response.error || "Query failed"
            }</p>`;
          }
          showNotification(
            "Query failed: " + (response.error || "Unknown error"),
            true
          );
          // Save failed query to history
          await saveQueryToHistory(
            query,
            false,
            response.error || "Unknown error"
          );
        }
      } catch (error) {
        console.error("Query execution error:", error);
        if (queryResult) {
          queryResult.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
        showNotification("Query execution failed", true);
        // Save failed query to history
        await saveQueryToHistory(query, false, error.message);
      }
    });
  }

  if (clearQueryBtn && advancedQuery && queryResult) {
    clearQueryBtn.addEventListener("click", () => {
      advancedQuery.value = "";
      queryResult.innerHTML =
        '<p class="placeholder">Execute a query to see results...</p>';
    });
  }

  // Inspect Schema
  const inspectSchemaBtn = document.getElementById("inspectSchemaBtn");
  if (inspectSchemaBtn) {
    inspectSchemaBtn.addEventListener("click", async () => {
      const query =
        "SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name";
      if (advancedQuery) advancedQuery.value = query;

      try {
        const response = await chrome.runtime.sendMessage({
          action: "executeDirectQuery",
          query: query,
        });

        if (response.success && queryResult) {
          displayQueryResult(response.data, queryResult);
          showNotification("Schema loaded successfully");
        }
      } catch (error) {
        showNotification("Failed to load schema", true);
      }
    });
  }

  // View Logs
  const viewLogsBtn = document.getElementById("viewLogsBtn");
  if (viewLogsBtn) {
    viewLogsBtn.addEventListener("click", () => {
      console.log("=== Universal Request Analyzer Debug Info ===");
      console.log("Extension version: 1.0.0");
      console.log("Current time:", new Date().toISOString());
      showNotification("Check browser console for logs");
    });
  }

  // Test Connection
  const testConnectionBtn = document.getElementById("testConnectionBtn");
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener("click", async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: "ping",
        });

        if (response && response.success) {
          showNotification("✓ Background script connection successful");
        } else {
          showNotification("⚠ Background script not responding properly", true);
        }
      } catch (error) {
        showNotification("✗ Failed to connect to background script", true);
      }
    });
  }

  // Force Processing
  const forceProcessBtn = document.getElementById("forceProcessBtn");
  if (forceProcessBtn) {
    forceProcessBtn.addEventListener("click", async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: "processToSilver",
        });

        if (response && response.success) {
          showNotification(
            `Processed ${response.processed || 0} records to Silver layer`
          );
          await loadAdvancedStats();
        } else {
          showNotification("Processing failed", true);
        }
      } catch (error) {
        showNotification("Failed to trigger processing", true);
      }
    });
  }

  // Export Raw DB
  const exportRawDbBtn = document.getElementById("exportRawDbBtn");
  if (exportRawDbBtn) {
    exportRawDbBtn.addEventListener(
      "click",
      async () => {
        try {
          const response = await chrome.runtime.sendMessage({
            action: "exportDatabase",
            format: "sqlite",
          });

          if (response && response.success) {
            showNotification("Database export initiated");
          } else {
            showNotification("Export failed", true);
          }
        } catch (error) {
          showNotification("Failed to export database", true);
        }
      },
      { once: true }
    );
  }

  // Import Database
  const importDbBtn = document.getElementById("importDbBtn");
  const importDbFile = document.getElementById("importDbFile");

  if (importDbBtn && importDbFile) {
    importDbBtn.addEventListener(
      "click",
      () => {
        importDbFile.click();
      },
      { once: false }
    );

    importDbFile.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (
        !confirm(
          "⚠️ WARNING: This will replace your current database!\n\n" +
            "A backup will be created automatically before import.\n\n" +
            "Continue with import?"
        )
      ) {
        importDbFile.value = "";
        return;
      }

      try {
        showNotification("Creating backup before import...");

        // Create backup first
        const backupResponse = await chrome.runtime.sendMessage({
          action: "createBackup",
        });

        if (!backupResponse || !backupResponse.success) {
          showNotification("Backup failed. Import cancelled.", true);
          importDbFile.value = "";
          return;
        }

        showNotification("Reading database file...");

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Send to background
        const response = await chrome.runtime.sendMessage({
          action: "importDatabase",
          data: Array.from(uint8Array),
        });

        if (response && response.success) {
          showNotification("Database imported successfully! Reloading...");
          setTimeout(() => window.location.reload(), 1500);
        } else {
          showNotification(
            "Import failed: " + (response?.error || "Unknown error"),
            true
          );
        }
      } catch (error) {
        console.error("Import error:", error);
        showNotification("Failed to import database: " + error.message, true);
      } finally {
        importDbFile.value = "";
      }
    });
  }

  // Reset Database
  const resetDatabaseBtn = document.getElementById("resetDatabaseBtn");
  if (resetDatabaseBtn) {
    resetDatabaseBtn.addEventListener("click", async () => {
      if (
        confirm(
          "⚠️ WARNING: This will delete ALL data and cannot be undone!\n\nAre you sure you want to reset the database?"
        )
      ) {
        if (confirm("This is your last chance. Really reset the database?")) {
          try {
            const response = await chrome.runtime.sendMessage({
              action: "resetDatabase",
            });

            if (response && response.success) {
              showNotification("Database reset successfully");
              await loadAdvancedStats();
            } else {
              showNotification("Reset failed", true);
            }
          } catch (error) {
            showNotification("Failed to reset database", true);
          }
        }
      }
    });
  }

  // Clear Cache
  const clearCacheBtn = document.getElementById("clearCacheBtn");
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener("click", async () => {
      if (confirm("Clear extension cache and reload?")) {
        try {
          await chrome.storage.local.clear();
          showNotification("Cache cleared. Reloading...");
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error) {
          showNotification("Failed to clear cache", true);
        }
      }
    });
  }

  // Load advanced stats
  loadAdvancedStats();

  // Initialize database tables listing
  loadDatabaseTables();

  // Initialize query history
  loadQueryHistory();

  // Clear history button
  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", async () => {
      if (confirm("Clear all query history?")) {
        await chrome.storage.local.set({ queryHistory: [] });
        loadQueryHistory();
        showNotification("Query history cleared");
      }
    });
  }
}

// Display query result in table format
function displayQueryResult(data, container) {
  // Handle new data format (array of objects)
  if (Array.isArray(data)) {
    if (data.length === 0) {
      container.innerHTML = '<p class="placeholder">No results (0 rows)</p>';
      return;
    }

    // Get columns from first object
    const columns = Object.keys(data[0]);

    let html = "<table><thead><tr>";
    columns.forEach((col) => {
      html += `<th>${col}</th>`;
    });
    html += "</tr></thead><tbody>";

    data.forEach((row) => {
      html += "<tr>";
      columns.forEach((col) => {
        const displayValue =
          row[col] === null || row[col] === undefined ? "NULL" : row[col];
        html += `<td>${displayValue}</td>`;
      });
      html += "</tr>";
    });

    html += "</tbody></table>";
    html += `<p style="margin-top: 10px; color: #666; font-size: 12px;">Returned ${data.length} row(s)</p>`;
    container.innerHTML = html;
    return;
  }

  // Fallback: Handle old result format (for backward compatibility)
  if (!data || !data[0]) {
    container.innerHTML = '<p class="placeholder">No results</p>';
    return;
  }

  const resultData = data[0];
  if (
    !resultData.columns ||
    !resultData.values ||
    resultData.values.length === 0
  ) {
    container.innerHTML = '<p class="placeholder">No results</p>';
    return;
  }

  let html = "<table><thead><tr>";
  resultData.columns.forEach((col) => {
    html += `<th>${col}</th>`;
  });
  html += "</tr></thead><tbody>";

  resultData.values.forEach((row) => {
    html += "<tr>";
    row.forEach((cell) => {
      const displayValue = cell === null ? "NULL" : cell;
      html += `<td>${displayValue}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  html += `<p style="margin-top: 10px; color: #666; font-size: 12px;">Returned ${resultData.values.length} row(s)</p>`;
  container.innerHTML = html;
}

// Load advanced statistics
async function loadAdvancedStats() {
  try {
    const response = await chrome.runtime.sendMessage({
      action: "getDashboardStats",
      timeRange: 86400, // 24 hours
    });

    if (response && response.success && response.stats) {
      const stats = response.stats;

      // Update layer counts
      const bronzeCount = document.getElementById("advancedBronzeCount");
      const silverCount = document.getElementById("advancedSilverCount");
      const goldCount = document.getElementById("advancedGoldCount");

      if (bronzeCount) bronzeCount.textContent = stats.layerCounts?.bronze || 0;
      if (silverCount) silverCount.textContent = stats.layerCounts?.silver || 0;
      if (goldCount) goldCount.textContent = stats.layerCounts?.gold || 0;

      // Estimate database size (rough estimate)
      const totalRecords =
        (stats.layerCounts?.bronze || 0) +
        (stats.layerCounts?.silver || 0) +
        (stats.layerCounts?.gold || 0);
      const estimatedSize = Math.round(totalRecords * 0.5); // ~0.5KB per record
      const dbSizeEl = document.getElementById("advancedDbSize");
      if (dbSizeEl) {
        dbSizeEl.textContent =
          estimatedSize < 1024
            ? `${estimatedSize} KB`
            : `${(estimatedSize / 1024).toFixed(2)} MB`;
      }
    }
  } catch (error) {
    console.error("Failed to load advanced stats:", error);
  }
}

// Load database tables with counts
async function loadDatabaseTables() {
  const tablesListContainer = document.getElementById("tablesListContainer");
  if (!tablesListContainer) return;

  try {
    // Query to get all tables
    const response = await chrome.runtime.sendMessage({
      action: "executeDirectQuery",
      query: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    });

    if (response.success && response.data && response.data.length > 0) {
      // Extract table names from data array
      const tables = response.data.map((row) => row.name);

      if (tables.length === 0) {
        tablesListContainer.innerHTML =
          '<p class="placeholder">No tables found</p>';
        return;
      }

      // Get count for each table
      const tableData = [];
      for (const tableName of tables) {
        // Validate table name to prevent SQL injection
        if (
          !tableName ||
          typeof tableName !== "string" ||
          !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)
        ) {
          console.warn(`Invalid table name: ${tableName}`);
          continue;
        }

        try {
          const countResponse = await chrome.runtime.sendMessage({
            action: "executeDirectQuery",
            query: `SELECT COUNT(*) as count FROM ${tableName}`,
          });

          const count =
            (countResponse.success && countResponse.data[0]?.count) || 0;
          tableData.push({ name: tableName, count });
        } catch (error) {
          console.error(`Error getting count for ${tableName}:`, error);
          tableData.push({ name: tableName, count: 0 });
        }
      }

      // Render table items
      let html = "";
      tableData.forEach((table) => {
        html += `
          <div class="table-item" data-table="${table.name}">
            <div class="table-item-name">
              <i class="fas fa-table"></i>
              ${table.name}
            </div>
            <div class="table-item-count">${table.count} records</div>
          </div>
        `;
      });
      tablesListContainer.innerHTML = html;

      // Add click handlers
      const tableItems = tablesListContainer.querySelectorAll(".table-item");
      tableItems.forEach((item) => {
        item.addEventListener("click", async () => {
          // Remove selected class from all
          tableItems.forEach((i) => i.classList.remove("selected"));
          // Add selected class to clicked item
          item.classList.add("selected");

          const tableName = item.dataset.table;
          await loadTablePreview(tableName);
        });
      });
    } else {
      tablesListContainer.innerHTML =
        '<p class="placeholder">Error loading tables</p>';
    }
  } catch (error) {
    console.error("Error loading database tables:", error);
    tablesListContainer.innerHTML =
      '<p class="placeholder">Error loading tables</p>';
  }
}

// Load preview of a table (first 5 records)
async function loadTablePreview(tableName) {
  const tablePreviewContainer = document.getElementById(
    "tablePreviewContainer"
  );
  if (!tablePreviewContainer) return;

  // Validate table name to prevent SQL injection
  if (
    !tableName ||
    typeof tableName !== "string" ||
    !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)
  ) {
    tablePreviewContainer.innerHTML =
      '<p class="placeholder">Invalid table name</p>';
    return;
  }

  try {
    tablePreviewContainer.innerHTML = '<p class="placeholder">Loading...</p>';

    const response = await chrome.runtime.sendMessage({
      action: "executeDirectQuery",
      query: `SELECT * FROM ${tableName} LIMIT 5`,
    });

    if (response.success && response.data && response.data.length > 0) {
      // Data is already in array of objects format
      const columns = Object.keys(response.data[0]);

      if (columns.length === 0) {
        tablePreviewContainer.innerHTML = `<p class="placeholder">Table "${tableName}" is empty</p>`;
        return;
      }

      let html = `<h4 style="margin: 0 0 10px 0; color: #667eea;">Preview: ${tableName} (${response.data.length} records)</h4>`;
      html += "<table><thead><tr>";
      columns.forEach((col) => {
        html += `<th>${col}</th>`;
      });
      html += "</tr></thead><tbody>";

      response.data.forEach((row) => {
        html += "<tr>";
        columns.forEach((col) => {
          let displayValue = row[col];
          if (displayValue === null || displayValue === undefined) {
            displayValue = '<em style="color: #999;">NULL</em>';
          } else if (
            typeof displayValue === "string" &&
            displayValue.length > 100
          ) {
            displayValue = displayValue.substring(0, 100) + "...";
          }
          html += `<td>${displayValue}</td>`;
        });
        html += "</tr>";
      });

      html += "</tbody></table>";
      tablePreviewContainer.innerHTML = html;
    } else {
      tablePreviewContainer.innerHTML = `<p class="placeholder">Error loading preview for "${tableName}"</p>`;
    }
  } catch (error) {
    console.error("Error loading table preview:", error);
    tablePreviewContainer.innerHTML = `<p class="placeholder">Error loading preview</p>`;
  }
}

// Save query to history
async function saveQueryToHistory(query, success, error) {
  try {
    const result = await chrome.storage.local.get("queryHistory");
    const history = result.queryHistory || [];

    // Add new query at the beginning
    history.unshift({
      query,
      success,
      error,
      timestamp: Date.now(),
    });

    // Keep only last 50 queries
    const trimmedHistory = history.slice(0, 50);

    await chrome.storage.local.set({ queryHistory: trimmedHistory });

    // Reload history display
    await loadQueryHistory();
  } catch (error) {
    console.error("Error saving query to history:", error);
  }
}

// Load and display query history
async function loadQueryHistory() {
  const queryHistoryContainer = document.getElementById(
    "queryHistoryContainer"
  );
  if (!queryHistoryContainer) return;

  try {
    const result = await chrome.storage.local.get("queryHistory");
    const history = result.queryHistory || [];

    if (history.length === 0) {
      queryHistoryContainer.innerHTML =
        '<p class="placeholder">No query history yet. Execute queries to see them here.</p>';
      return;
    }

    let html = "";
    history.forEach((item, index) => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleString();
      const statusClass = item.success ? "success" : "error";
      const statusText = item.success ? "Success" : "Error";

      html += `
        <div class="query-history-item" data-index="${index}">
          <div class="query-history-header">
            <span class="query-history-time">${timeStr}</span>
            <span class="query-history-status ${statusClass}">${statusText}</span>
          </div>
          <div class="query-history-query">${item.query}</div>
          ${
            item.error
              ? `<div style="color: #f44336; font-size: 11px; margin-top: 4px;">${item.error}</div>`
              : ""
          }
        </div>
      `;
    });

    queryHistoryContainer.innerHTML = html;

    // Add click handlers to load query
    const items = queryHistoryContainer.querySelectorAll(".query-history-item");
    items.forEach((item) => {
      item.addEventListener("click", () => {
        const index = parseInt(item.dataset.index);
        const query = history[index].query;
        const advancedQuery = document.getElementById("advancedQuery");
        if (advancedQuery) {
          advancedQuery.value = query;
          showNotification("Query loaded from history");
        }
      });
    });
  } catch (error) {
    console.error("Error loading query history:", error);
    queryHistoryContainer.innerHTML =
      '<p class="placeholder">Error loading query history</p>';
  }
}

// New Features Implementation

// Dashboard Auto-refresh
let dashboardRefreshInterval = null;

function initializeDashboard() {
  const autoRefreshCheckbox = document.getElementById("dashboardAutoRefresh");

  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        startDashboardAutoRefresh();
      } else {
        stopDashboardAutoRefresh();
      }
    });

    // Start if checked
    if (autoRefreshCheckbox.checked) {
      startDashboardAutoRefresh();
    }
  }
}

function startDashboardAutoRefresh() {
  // Clear existing interval
  stopDashboardAutoRefresh();

  // Set new interval (30 seconds)
  dashboardRefreshInterval = setInterval(() => {
    loadDashboardData();
  }, 30000);
}

function stopDashboardAutoRefresh() {
  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = null;
  }
}

async function loadDashboardData() {
  const loadingEl = document.getElementById("dashboardLoading");
  if (loadingEl) loadingEl.style.display = "block";

  try {
    // Load dashboard stats
    await loadAdvancedStats();

    // Update dashboard metrics if the component is available
    // The dashboard component will handle its own rendering
  } catch (error) {
    console.error("Failed to load dashboard data:", error);
    showNotification("Failed to load dashboard data", true);
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
  }
}

// Storage Usage Indicator
async function updateStorageUsage() {
  const currentCount = document.getElementById("currentStorageCount");
  const maxDisplay = document.getElementById("maxStorageDisplay");
  const usageBarFill = document.getElementById("usageBarFill");
  const maxInput = document.getElementById("maxStoredRequests");

  if (!currentCount || !maxDisplay || !usageBarFill || !maxInput) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: "getDashboardStats",
      timeRange: 86400,
    });

    if (response && response.success && response.stats) {
      const current = response.stats.layerCounts?.bronze || 0;
      const max = parseInt(maxInput.value) || 10000;
      const percentage = (current / max) * 100;

      currentCount.textContent = current.toLocaleString();
      maxDisplay.textContent = max.toLocaleString();
      usageBarFill.style.width = `${Math.min(percentage, 100)}%`;

      // Update capture status indicator
      const captureStatus = document.getElementById("captureStatus");
      const captureEnabled = document.getElementById("captureEnabled");
      if (captureStatus && captureEnabled) {
        if (captureEnabled.checked) {
          captureStatus.className = "status-indicator active";
          captureStatus.title = "Capture is active";
        } else {
          captureStatus.className = "status-indicator inactive";
          captureStatus.title = "Capture is disabled";
        }
      }
    }
  } catch (error) {
    console.error("Failed to update storage usage:", error);
  }
}

// Preset Buttons
document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const value = parseInt(btn.dataset.value);
    const maxInput = document.getElementById("maxStoredRequests");
    if (maxInput) {
      maxInput.value = value;
      updateStorageUsage();
    }
  });
});

// Filter Presets
document.querySelectorAll(".filter-preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const preset = btn.dataset.preset;
    const checkboxes = document.querySelectorAll('input[name="captureType"]');
    const includeDomains = document.getElementById("includeDomains");
    const excludeDomains = document.getElementById("excludeDomains");
    const statusFilters = document.querySelectorAll(
      'input[name="statusFilter"]'
    );
    const urlPattern = document.getElementById("urlPattern");
    const minResponseTime = document.getElementById("minResponseTime");
    const maxResponseTime = document.getElementById("maxResponseTime");
    const minSize = document.getElementById("minSize");
    const maxSize = document.getElementById("maxSize");

    if (preset === "api") {
      // API Only: XHR and Fetch only
      checkboxes.forEach((cb) => {
        cb.checked = cb.value === "xmlhttprequest" || cb.value === "fetch";
      });
      if (includeDomains) includeDomains.value = "";
      if (excludeDomains) excludeDomains.value = "";
      if (urlPattern) urlPattern.value = "";
      statusFilters.forEach((cb) => (cb.checked = true));
      if (minResponseTime) minResponseTime.value = "";
      if (maxResponseTime) maxResponseTime.value = "";
      if (minSize) minSize.value = "";
      if (maxSize) maxSize.value = "";
    } else if (preset === "noImages") {
      // No Images/Fonts: Everything except images and fonts
      checkboxes.forEach((cb) => {
        cb.checked = cb.value !== "image" && cb.value !== "font";
      });
      if (excludeDomains) excludeDomains.value = "";
      if (urlPattern) urlPattern.value = "";
      statusFilters.forEach((cb) => (cb.checked = true));
    } else if (preset === "errors") {
      // Errors Only: Only 4xx and 5xx
      checkboxes.forEach((cb) => (cb.checked = true));
      statusFilters.forEach((cb) => {
        cb.checked = cb.value === "4xx" || cb.value === "5xx";
      });
      if (urlPattern) urlPattern.value = "";
      if (minResponseTime) minResponseTime.value = "";
    } else if (preset === "slow") {
      // Slow Requests: Response time > 1000ms
      checkboxes.forEach((cb) => (cb.checked = true));
      statusFilters.forEach((cb) => (cb.checked = true));
      if (minResponseTime) minResponseTime.value = "1000";
      if (maxResponseTime) maxResponseTime.value = "";
      if (urlPattern) urlPattern.value = "";
    } else if (preset === "all") {
      // Capture All
      checkboxes.forEach((cb) => (cb.checked = true));
      statusFilters.forEach((cb) => (cb.checked = true));
      if (includeDomains) includeDomains.value = "";
      if (excludeDomains) excludeDomains.value = "";
      if (urlPattern) urlPattern.value = "";
      if (minResponseTime) minResponseTime.value = "";
      if (maxResponseTime) maxResponseTime.value = "";
      if (minSize) minSize.value = "";
      if (maxSize) maxSize.value = "";
    }

    showNotification(`Applied "${preset}" filter preset`);
    updateActiveFiltersSummary();

    // Auto-apply if enabled
    const autoApply = document.getElementById("autoApplyFilters");
    if (autoApply && autoApply.checked) {
      applyFiltersToVisualizations();
    }
  });
});

// Advanced Filter Functions
function updateActiveFiltersSummary() {
  const summaryEl = document.getElementById("activeFiltersSummary");
  if (!summaryEl) return;

  const filters = collectActiveFilters();

  if (filters.length === 0) {
    summaryEl.innerHTML =
      '<p class="placeholder">No filters applied. Showing all requests.</p>';
    return;
  }

  let html = "<ul>";
  filters.forEach((filter) => {
    html += `<li><strong>${filter.type}:</strong> ${filter.value}</li>`;
  });
  html += "</ul>";
  summaryEl.innerHTML = html;
}

function collectActiveFilters() {
  const filters = [];

  // Request types
  const selectedTypes = Array.from(
    document.querySelectorAll('input[name="captureType"]:checked')
  ).map((cb) => cb.value);
  if (selectedTypes.length > 0 && selectedTypes.length < 7) {
    filters.push({
      type: "Request Types",
      value: selectedTypes.join(", "),
    });
  }

  // Domains
  const includeDomains = document.getElementById("includeDomains");
  if (includeDomains && includeDomains.value.trim()) {
    filters.push({
      type: "Include Domains",
      value: includeDomains.value,
    });
  }

  const excludeDomains = document.getElementById("excludeDomains");
  if (excludeDomains && excludeDomains.value.trim()) {
    filters.push({
      type: "Exclude Domains",
      value: excludeDomains.value,
    });
  }

  // URL Pattern
  const urlPattern = document.getElementById("urlPattern");
  if (urlPattern && urlPattern.value.trim()) {
    filters.push({
      type: "URL Pattern",
      value: urlPattern.value,
    });
  }

  // Status codes
  const selectedStatus = Array.from(
    document.querySelectorAll('input[name="statusFilter"]:checked')
  ).map((cb) => cb.value);
  if (selectedStatus.length > 0 && selectedStatus.length < 4) {
    filters.push({
      type: "Status Codes",
      value: selectedStatus.join(", "),
    });
  }

  // Response time
  const minResponseTime = document.getElementById("minResponseTime");
  const maxResponseTime = document.getElementById("maxResponseTime");
  if (minResponseTime && minResponseTime.value) {
    const min = minResponseTime.value;
    const max =
      maxResponseTime && maxResponseTime.value ? maxResponseTime.value : "∞";
    filters.push({
      type: "Response Time",
      value: `${min}ms - ${max}ms`,
    });
  }

  // Size
  const minSize = document.getElementById("minSize");
  const maxSize = document.getElementById("maxSize");
  if (minSize && minSize.value) {
    const min = minSize.value;
    const max = maxSize && maxSize.value ? maxSize.value : "∞";
    filters.push({
      type: "Response Size",
      value: `${min} - ${max} bytes`,
    });
  }

  return filters;
}

async function applyFiltersToVisualizations() {
  const applyBtn = document.getElementById("applyFiltersBtn");
  if (applyBtn) {
    applyBtn.disabled = true;
    applyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';
  }

  try {
    // Collect all filter settings
    const filterConfig = {
      requestTypes: Array.from(
        document.querySelectorAll('input[name="captureType"]:checked')
      ).map((cb) => cb.value),
      includeDomains:
        document
          .getElementById("includeDomains")
          ?.value?.split(",")
          .map((d) => d.trim())
          .filter((d) => d) || [],
      excludeDomains:
        document
          .getElementById("excludeDomains")
          ?.value?.split(",")
          .map((d) => d.trim())
          .filter((d) => d) || [],
      urlPattern: document.getElementById("urlPattern")?.value?.trim() || "",
      statusCodes: Array.from(
        document.querySelectorAll('input[name="statusFilter"]:checked')
      ).map((cb) => cb.value),
      minResponseTime:
        parseInt(document.getElementById("minResponseTime")?.value) || 0,
      maxResponseTime:
        parseInt(document.getElementById("maxResponseTime")?.value) || 0,
      minSize: parseInt(document.getElementById("minSize")?.value) || 0,
      maxSize: parseInt(document.getElementById("maxSize")?.value) || 0,
    };

    // Save filter configuration
    await chrome.runtime.sendMessage({
      action: "updateVisualizationFilters",
      filters: filterConfig,
    });

    // Trigger dashboard refresh if on dashboard tab
    const dashboardRefreshBtn = document.getElementById("dashboardRefresh");
    if (dashboardRefreshBtn) {
      dashboardRefreshBtn.click();
    }

    showNotification("Filters applied to all visualizations");

    // Update status indicator
    const statusIndicator = document.getElementById("filterApplyStatus");
    if (statusIndicator) {
      statusIndicator.className = "status-indicator active";
      statusIndicator.title = "Filters applied";
    }
  } catch (error) {
    console.error("Failed to apply filters:", error);
    showNotification("Failed to apply filters", true);
  } finally {
    if (applyBtn) {
      applyBtn.disabled = false;
      applyBtn.innerHTML =
        '<i class="fas fa-check"></i> Apply to Visualizations';
    }
  }
}

// Clear All Filters
const clearFiltersBtn = document.getElementById("clearFiltersBtn");
if (clearFiltersBtn) {
  clearFiltersBtn.addEventListener("click", () => {
    document
      .querySelectorAll('input[name="captureType"]')
      .forEach((cb) => (cb.checked = true));
    document
      .querySelectorAll('input[name="statusFilter"]')
      .forEach((cb) => (cb.checked = true));

    const includeDomains = document.getElementById("includeDomains");
    const excludeDomains = document.getElementById("excludeDomains");
    const urlPattern = document.getElementById("urlPattern");
    const minResponseTime = document.getElementById("minResponseTime");
    const maxResponseTime = document.getElementById("maxResponseTime");
    const minSize = document.getElementById("minSize");
    const maxSize = document.getElementById("maxSize");

    if (includeDomains) includeDomains.value = "";
    if (excludeDomains) excludeDomains.value = "";
    if (urlPattern) urlPattern.value = "";
    if (minResponseTime) minResponseTime.value = "";
    if (maxResponseTime) maxResponseTime.value = "";
    if (minSize) minSize.value = "";
    if (maxSize) maxSize.value = "";

    updateActiveFiltersSummary();
    showNotification("All filters cleared");

    // Auto-apply if enabled
    const autoApply = document.getElementById("autoApplyFilters");
    if (autoApply && autoApply.checked) {
      applyFiltersToVisualizations();
    }
  });
}

// Apply Filters Button
const applyFiltersBtn = document.getElementById("applyFiltersBtn");
if (applyFiltersBtn) {
  applyFiltersBtn.addEventListener("click", applyFiltersToVisualizations);
}

// Auto-apply toggle
const autoApplyFilters = document.getElementById("autoApplyFilters");
if (autoApplyFilters) {
  autoApplyFilters.addEventListener("change", () => {
    const statusIndicator = document.getElementById("filterApplyStatus");
    if (statusIndicator) {
      if (autoApplyFilters.checked) {
        statusIndicator.className = "status-indicator active";
        statusIndicator.title = "Auto-apply enabled";
        applyFiltersToVisualizations();
      } else {
        statusIndicator.className = "status-indicator inactive";
        statusIndicator.title = "Auto-apply disabled";
      }
    }
  });
}

// Add change listeners to all filter inputs for auto-apply
const filterInputs = [
  ...document.querySelectorAll('input[name="captureType"]'),
  ...document.querySelectorAll('input[name="statusFilter"]'),
  document.getElementById("includeDomains"),
  document.getElementById("excludeDomains"),
  document.getElementById("urlPattern"),
  document.getElementById("minResponseTime"),
  document.getElementById("maxResponseTime"),
  document.getElementById("minSize"),
  document.getElementById("maxSize"),
].filter((el) => el);

filterInputs.forEach((input) => {
  const eventType = input.type === "checkbox" ? "change" : "blur";
  input.addEventListener(eventType, () => {
    updateActiveFiltersSummary();

    const autoApply = document.getElementById("autoApplyFilters");
    if (autoApply && autoApply.checked) {
      // Debounce auto-apply for text inputs
      if (input.type !== "checkbox") {
        clearTimeout(window.filterApplyTimeout);
        window.filterApplyTimeout = setTimeout(() => {
          applyFiltersToVisualizations();
        }, 1000);
      } else {
        applyFiltersToVisualizations();
      }
    }
  });
});

// URL Pattern validation
const urlPattern = document.getElementById("urlPattern");
if (urlPattern) {
  urlPattern.addEventListener("blur", () => {
    const pattern = urlPattern.value.trim();
    const errorEl = document.getElementById("urlPatternError");

    if (pattern && errorEl) {
      try {
        new RegExp(pattern);
        errorEl.textContent = "";
      } catch (e) {
        errorEl.textContent = `Invalid regex pattern: ${e.message}`;
      }
    }
  });
}

// Domain Validation
function validateDomains(domainString) {
  if (!domainString || !domainString.trim())
    return { valid: true, domains: [] };

  const domains = domainString
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d);
  const invalidDomains = [];

  domains.forEach((domain) => {
    // Allow wildcard at start
    const testDomain = domain.replace(/^\*\./, "");
    // Basic domain validation regex
    const domainRegex =
      /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

    if (!domainRegex.test(testDomain)) {
      invalidDomains.push(domain);
    }
  });

  return {
    valid: invalidDomains.length === 0,
    domains: domains,
    invalidDomains: invalidDomains,
  };
}

// Add validation listeners (using existing includeDomains and excludeDomains variables)
if (includeDomains) {
  includeDomains.addEventListener("blur", () => {
    const result = validateDomains(includeDomains.value);
    const errorEl = document.getElementById("includeDomainsError");
    if (errorEl) {
      if (!result.valid) {
        errorEl.textContent = `Invalid domains: ${result.invalidDomains.join(
          ", "
        )}`;
      } else {
        errorEl.textContent = "";
      }
    }
  });
}

if (excludeDomains) {
  excludeDomains.addEventListener("blur", () => {
    const result = validateDomains(excludeDomains.value);
    const errorEl = document.getElementById("excludeDomainsError");
    if (errorEl) {
      if (!result.valid) {
        errorEl.textContent = `Invalid domains: ${result.invalidDomains.join(
          ", "
        )}`;
      } else {
        errorEl.textContent = "";
      }
    }
  });
}

// Test Filters Button
const testFiltersBtn = document.getElementById("testFiltersBtn");
if (testFiltersBtn) {
  testFiltersBtn.addEventListener("click", () => {
    const includeResult = validateDomains(includeDomains?.value || "");
    const excludeResult = validateDomains(excludeDomains?.value || "");
    const resultEl = document.getElementById("filterTestResult");

    if (!includeResult.valid || !excludeResult.valid) {
      if (resultEl)
        resultEl.textContent = "❌ Please fix domain validation errors first";
      return;
    }

    const selectedTypes = Array.from(
      document.querySelectorAll('input[name="captureType"]:checked')
    ).map((cb) => cb.value);

    if (resultEl) {
      resultEl.textContent = `✅ Filter valid: ${selectedTypes.length} types, ${includeResult.domains.length} included, ${excludeResult.domains.length} excluded`;
    }
    showNotification("Filters validated successfully");
  });
}

// Export Now Button
const exportNowBtn = document.getElementById("exportNowBtn");
const manualExportFormat = document.getElementById("manualExportFormat");

if (exportNowBtn) {
  exportNowBtn.addEventListener("click", async () => {
    const format = manualExportFormat?.value || "json";
    const filename = `ura-export-${new Date()
      .toISOString()
      .slice(0, 10)}.${format}`;

    exportNowBtn.disabled = true;
    exportNowBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Exporting...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: "exportDatabase",
        format: format,
        filename: filename,
      });

      if (response && response.success) {
        showNotification("Export completed successfully!");

        // Update last export time
        const lastExportTime = document.getElementById("lastExportTime");
        if (lastExportTime) {
          lastExportTime.textContent = new Date().toLocaleString();
        }

        // Save last export time
        await chrome.storage.local.set({ lastExportTime: Date.now() });
      } else {
        showNotification(
          "Export failed: " + (response?.error || "Unknown error"),
          true
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      showNotification("Export failed: " + error.message, true);
    } finally {
      exportNowBtn.disabled = false;
      exportNowBtn.innerHTML = '<i class="fas fa-download"></i> Export Now';
    }
  });
}

// Auto Export Status (using existing autoExport variable)
const autoExportStatus = document.getElementById("autoExportStatus");

if (autoExport && autoExportStatus) {
  autoExport.addEventListener("change", () => {
    if (autoExport.checked) {
      autoExportStatus.className = "status-indicator active";
      autoExportStatus.title = "Auto-export is enabled";
    } else {
      autoExportStatus.className = "status-indicator inactive";
      autoExportStatus.title = "Auto-export is disabled";
    }
  });

  // Set initial state
  if (autoExport.checked) {
    autoExportStatus.className = "status-indicator active";
  } else {
    autoExportStatus.className = "status-indicator inactive";
  }
}

// Load last export time
async function loadLastExportTime() {
  const lastExportTimeEl = document.getElementById("lastExportTime");
  if (lastExportTimeEl) {
    const result = await chrome.storage.local.get("lastExportTime");
    if (result.lastExportTime) {
      lastExportTimeEl.textContent = new Date(
        result.lastExportTime
      ).toLocaleString();
    } else {
      lastExportTimeEl.textContent = "Never";
    }
  }
}

// Initialize new features on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
  updateStorageUsage();
  loadLastExportTime();
  updateActiveFiltersSummary(); // Initialize filter summary
  loadTrackedSites(); // Initialize site tracking
  populateSiteFilterDropdown(); // Initialize dashboard site filter

  // Update storage usage when max changes
  const maxInput = document.getElementById("maxStoredRequests");
  if (maxInput) {
    maxInput.addEventListener("change", updateStorageUsage);
  }

  // Update storage usage periodically
  setInterval(updateStorageUsage, 10000); // Every 10 seconds
});

// Site Tracking Configuration
async function loadTrackedSites() {
  const trackingSites = document.getElementById("trackingSites");
  const trackedSitesList = document.getElementById("trackedSitesList");

  if (!trackingSites) return;

  try {
    const result = await chrome.storage.local.get("trackingSites");
    const sites = result.trackingSites || [];

    if (sites.length > 0) {
      trackingSites.value = sites.join("\n");
      updateTrackedSitesList(sites);
    }
  } catch (error) {
    console.error("Failed to load tracked sites:", error);
  }
}

function updateTrackedSitesList(sites) {
  const trackedSitesList = document.getElementById("trackedSitesList");
  if (!trackedSitesList) return;

  if (sites.length === 0) {
    trackedSitesList.innerHTML =
      '<p class="placeholder" style="color: #999; font-style: italic; margin: 0;">No sites configured. Add sites above to start tracking specific URLs.</p>';
    return;
  }

  let html =
    '<ul style="margin: 5px 0; padding-left: 20px; font-size: 13px; line-height: 1.8;">';
  sites.forEach((site) => {
    const isRegex = site.startsWith("/") && site.endsWith("/");
    const icon = isRegex
      ? "fa-code"
      : site.includes("*")
      ? "fa-asterisk"
      : "fa-link";
    html += `<li><i class="fas ${icon}" style="color: #667eea; margin-right: 5px;"></i> <code style="background: #e8f0fe; padding: 2px 6px; border-radius: 3px;">${site}</code></li>`;
  });
  html += "</ul>";
  trackedSitesList.innerHTML = html;
}

function validateSitePatterns(patterns) {
  const results = {
    valid: [],
    invalid: [],
    warnings: [],
  };

  patterns.forEach((pattern) => {
    if (!pattern.trim()) return;

    pattern = pattern.trim();

    // Check if it's a regex pattern
    if (pattern.startsWith("/") && pattern.endsWith("/")) {
      try {
        new RegExp(pattern.slice(1, -1));
        results.valid.push(pattern);
      } catch (e) {
        results.invalid.push({ pattern, error: `Invalid regex: ${e.message}` });
      }
    }
    // Check if it's a wildcard pattern
    else if (pattern.includes("*")) {
      // Convert wildcard to regex for validation
      const regexPattern = pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      try {
        new RegExp(regexPattern);
        results.valid.push(pattern);
      } catch (e) {
        results.invalid.push({ pattern, error: "Invalid wildcard pattern" });
      }
    }
    // Check if it's a URL
    else {
      try {
        // Try to parse as URL
        if (pattern.startsWith("http://") || pattern.startsWith("https://")) {
          new URL(pattern);
          results.valid.push(pattern);
        } else {
          // Assume it's a domain pattern
          const domainRegex =
            /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/;
          if (domainRegex.test(pattern)) {
            results.valid.push(pattern);
            results.warnings.push({
              pattern,
              warning:
                "Domain pattern without protocol. Consider adding https://",
            });
          } else {
            results.invalid.push({
              pattern,
              error: "Invalid URL or domain format",
            });
          }
        }
      } catch (e) {
        results.invalid.push({ pattern, error: "Invalid URL format" });
      }
    }
  });

  return results;
}

// Validate Sites Button
const validateSitesBtn = document.getElementById("validateSitesBtn");
if (validateSitesBtn) {
  validateSitesBtn.addEventListener("click", async () => {
    const trackingSites = document.getElementById("trackingSites");
    const resultEl = document.getElementById("sitesValidationResult");

    if (!trackingSites || !resultEl) return;

    const patterns = trackingSites.value.split("\n").filter((p) => p.trim());

    if (patterns.length === 0) {
      resultEl.textContent = "⚠️ No patterns to validate";
      resultEl.style.color = "#ff9800";
      return;
    }

    const validation = validateSitePatterns(patterns);

    if (validation.invalid.length > 0) {
      resultEl.innerHTML = `❌ ${validation.invalid.length} invalid pattern(s): ${validation.invalid[0].pattern} - ${validation.invalid[0].error}`;
      resultEl.style.color = "#f44336";
    } else if (validation.warnings.length > 0) {
      resultEl.innerHTML = `⚠️ ${validation.valid.length} valid, ${validation.warnings.length} warning(s)`;
      resultEl.style.color = "#ff9800";
    } else {
      resultEl.innerHTML = `✅ All ${validation.valid.length} pattern(s) valid`;
      resultEl.style.color = "#4CAF50";
    }

    // Save valid patterns to database first
    if (validation.valid.length > 0) {
      // Save to database
      await chrome.runtime.sendMessage({
        action: "saveSettingToDb",
        key: "trackingSites",
        value: validation.valid,
      });

      // Also save to local storage for immediate use
      chrome.storage.local.set({ trackingSites: validation.valid });
      updateTrackedSitesList(validation.valid);

      // Notify content scripts to update tracking
      chrome.runtime.sendMessage({
        action: "updateTrackingSites",
        sites: validation.valid,
      });

      // Update dashboard dropdown
      populateSiteFilterDropdown();
    }
  });
}

// Add Current Site Button
const addCurrentSiteBtn = document.getElementById("addCurrentSiteBtn");
if (addCurrentSiteBtn) {
  addCurrentSiteBtn.addEventListener("click", async () => {
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tabs.length > 0 && tabs[0].url) {
        const url = new URL(tabs[0].url);
        
        // Validate URL - Block browser internal and extension pages
        const blockedProtocols = ['chrome:', 'edge:', 'about:', 'moz-extension:', 'chrome-extension:'];
        if (blockedProtocols.some(protocol => url.protocol.startsWith(protocol))) {
          showNotification("Cannot add browser internal or extension pages", true);
          return;
        }
        
        const site = `${url.protocol}//${url.hostname}`;

        const trackingSites = document.getElementById("trackingSites");
        if (trackingSites) {
          const currentSites = trackingSites.value.trim();
          
          // Check for duplicates
          if (currentSites.split('\n').some(s => s.trim() === site)) {
            showNotification(`Site already added: ${site}`, true);
            return;
          }
          
          trackingSites.value = currentSites
            ? `${currentSites}\n${site}`
            : site;
          showNotification(`Added: ${site}`);
        }
      }
    } catch (error) {
      console.error("Failed to add current site:", error);
      showNotification("Failed to add current site", true);
    }
  });
}

// Track Only Configured Sites Toggle
const trackOnlyConfigured = document.getElementById("trackOnlyConfiguredSites");
if (trackOnlyConfigured) {
  // Load saved setting
  chrome.storage.local.get("trackOnlyConfiguredSites").then((result) => {
    trackOnlyConfigured.checked = result.trackOnlyConfiguredSites !== false; // Default true
  });

  // Save to database when changed
  trackOnlyConfigured.addEventListener("change", async () => {
    const value = trackOnlyConfigured.checked;

    // Save to database first
    await chrome.runtime.sendMessage({
      action: "saveSettingToDb",
      key: "trackOnlyConfiguredSites",
      value: value,
    });

    // Also save to local storage
    chrome.storage.local.set({ trackOnlyConfiguredSites: value });

    // Notify content scripts
    chrome.runtime.sendMessage({
      action: "updateTrackingMode",
      trackOnlyConfigured: value,
    });
  });
}

// Site Preset Buttons
document.querySelectorAll(".site-preset-btn").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const preset = btn.dataset.preset;
    const trackingSites = document.getElementById("trackingSites");

    if (!trackingSites) return;

    if (preset === "current") {
      // Trigger add current site
      document.getElementById("addCurrentSiteBtn")?.click();
    } else if (preset === "popular") {
      const popularSites = [
        "https://api.github.com",
        "https://*.googleapis.com",
        "https://api.twitter.com",
        "https://graph.facebook.com",
        "https://*.stripe.com",
        "/api\\./", // Matches any URL with /api/ path
      ].join("\n");
      trackingSites.value = trackingSites.value
        ? `${trackingSites.value}\n${popularSites}`
        : popularSites;
      showNotification("Added popular API sites");
    } else if (preset === "clear") {
      if (confirm("Clear all tracked sites?")) {
        trackingSites.value = "";
        chrome.storage.local.set({ trackingSites: [] });
        updateTrackedSitesList([]);
        showNotification("All sites cleared");
      }
    }
  });
});

// Dashboard Site Filter Dropdown
async function populateSiteFilterDropdown() {
  const dropdown = document.getElementById("dashboardSiteFilter");
  if (!dropdown) return;

  try {
    // Fetch unique domains from database
    const response = await chrome.runtime.sendMessage({
      action: "executeDirectQuery",
      query: `
        SELECT DISTINCT domain, COUNT(*) as request_count
        FROM bronze_requests 
        WHERE domain IS NOT NULL AND domain != '' 
        GROUP BY domain
        ORDER BY request_count DESC
        LIMIT 50
      `,
    });

    console.log("Dashboard site filter response:", response);

    // Clear existing options except "All Sites"
    dropdown.innerHTML = '<option value="all">All Sites</option>';

    if (
      response &&
      response.success &&
      response.data &&
      response.data.length > 0
    ) {
      const domains = response.data;

      // Add each domain as an option
      domains.forEach((row) => {
        const domain = row.domain;
        const count = row.request_count || 0;
        if (domain) {
          const option = document.createElement("option");
          option.value = domain;
          option.textContent = `${domain} (${count} requests)`;
          dropdown.appendChild(option);
        }
      });

      console.log(`Populated site filter with ${domains.length} domains`);
    } else {
      console.warn("No domains found in database");
    }

    // Add change listener to filter dashboard
    dropdown.addEventListener("change", () => {
      const selectedSite = dropdown.value;
      filterDashboardBySite(selectedSite);
    });
  } catch (error) {
    console.error("Failed to populate site filter:", error);
  }
}

async function filterDashboardBySite(site) {
  const loadingEl = document.getElementById("dashboardLoading");
  if (loadingEl) loadingEl.style.display = "block";

  try {
    // Send filter request to background
    const response = await chrome.runtime.sendMessage({
      action: "filterDashboardBySite",
      site: site === "all" ? null : site,
    });

    if (response && response.success) {
      // Refresh dashboard with filtered data
      const dashboardRefreshBtn = document.getElementById("dashboardRefresh");
      if (dashboardRefreshBtn) {
        dashboardRefreshBtn.click();
      }

      const siteName = site === "all" ? "all sites" : site;
      showNotification(`Dashboard filtered to: ${siteName}`);
    }
  } catch (error) {
    console.error("Failed to filter dashboard:", error);
    showNotification("Failed to filter dashboard", true);
  } finally {
    if (loadingEl) loadingEl.style.display = "none";
  }
}

// Initialize Analytics component
let analyticsInstance = null;

async function initializeAnalytics() {
  try {
    const { default: Analytics } = await import("../components/analytics.js");
    analyticsInstance = new Analytics();
    await analyticsInstance.initialize();
    console.log("✓ Analytics component initialized");
  } catch (error) {
    console.error("Failed to initialize Analytics:", error);
  }
}

// Initialize Alerts component
let alertsInstance = null;

async function initializeAlerts() {
  try {
    const { default: Alerts } = await import("../components/alerts.js");
    alertsInstance = new Alerts();
    await alertsInstance.initialize();
    console.log("✓ Alerts component initialized");
  } catch (error) {
    console.error("Failed to initialize Alerts:", error);
  }
}

// ===== DATA SAFETY FEATURES =====
// (Data Management functions moved to data-management.js)

// Check and display storage warning
async function checkStorageWarning(currentRecords) {
  const maxStoredRequests = document.getElementById("maxStoredRequests");
  const currentStorageCount = document.getElementById("currentStorageCount");

  if (!maxStoredRequests) return;

  const maxRecords = parseInt(maxStoredRequests.value) || 10000;
  const percentage = (currentRecords / maxRecords) * 100;

  // Update current count display
  if (currentStorageCount) {
    currentStorageCount.textContent = currentRecords.toLocaleString();
  }

  // Update usage bar
  updateStorageUsageDisplay();

  // Show warning if approaching limit
  if (percentage >= 90) {
    showStorageWarning(
      `⚠️ Storage Nearly Full: ${percentage.toFixed(
        0
      )}% used (${currentRecords.toLocaleString()}/${maxRecords.toLocaleString()} records)`,
      "error"
    );
  } else if (percentage >= 75) {
    showStorageWarning(
      `⚠️ Storage Warning: ${percentage.toFixed(
        0
      )}% used (${currentRecords.toLocaleString()}/${maxRecords.toLocaleString()} records)`,
      "warning"
    );
  }
}

// Show storage warning banner
function showStorageWarning(message, type = "warning") {
  let warningBanner = document.getElementById("storageWarningBanner");

  if (!warningBanner) {
    warningBanner = document.createElement("div");
    warningBanner.id = "storageWarningBanner";
    warningBanner.className = "warning-banner";

    // Insert at top of general settings tab
    const generalTab = document.getElementById("general");
    if (generalTab) {
      generalTab.insertBefore(warningBanner, generalTab.firstChild);
    }
  }

  warningBanner.className = `warning-banner ${type}`;
  warningBanner.innerHTML = `
    <i class="fas fa-exclamation-triangle"></i>
    <span>${message}</span>
    <button class="close-btn warning-banner-close">
      <i class="fas fa-times"></i>
    </button>
  `;
  warningBanner.style.display = "flex";

  // Event delegation for warning banner close button
  const closeBtn = warningBanner.querySelector(".warning-banner-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      warningBanner.style.display = "none";
    });
  }

  // Add styles if not already present
  if (!document.getElementById("warningBannerStyles")) {
    const style = document.createElement("style");
    style.id = "warningBannerStyles";
    style.textContent = `
      .warning-banner {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        margin-bottom: 20px;
        border-radius: 8px;
        font-weight: 500;
      }
      .warning-banner.warning {
        background: #fef5e7;
        border-left: 4px solid #ed8936;
        color: #744210;
      }
      .warning-banner.error {
        background: #fee;
        border-left: 4px solid #e53e3e;
        color: #742a2a;
      }
      .warning-banner .close-btn {
        margin-left: auto;
        background: none;
        border: none;
        cursor: pointer;
        opacity: 0.6;
        padding: 4px;
      }
      .warning-banner .close-btn:hover {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }
}

// Validate domain list
function validateDomainList(inputElement) {
  if (!inputElement) return true;

  const domains = inputElement.value
    .split("\n")
    .map((d) => d.trim())
    .filter((d) => d);
  const invalidDomains = [];

  // Domain regex: basic validation for domain patterns
  const domainRegex = /^(\*\.)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;
  const wildcardRegex = /^https?:\/\/(\*\.)?([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+/;

  domains.forEach((domain) => {
    // Allow wildcards, URLs, and plain domains
    if (
      !domainRegex.test(domain) &&
      !wildcardRegex.test(domain) &&
      !domain.includes("*")
    ) {
      invalidDomains.push(domain);
    }
  });

  // Show validation feedback
  const feedbackId = inputElement.id + "Feedback";
  let feedbackEl = document.getElementById(feedbackId);

  if (!feedbackEl) {
    feedbackEl = document.createElement("div");
    feedbackEl.id = feedbackId;
    feedbackEl.className = "validation-feedback";
    inputElement.parentNode.insertBefore(feedbackEl, inputElement.nextSibling);
  }

  if (invalidDomains.length > 0) {
    feedbackEl.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Invalid domains: ${invalidDomains.join(
      ", "
    )}`;
    feedbackEl.style.color = "#e53e3e";
    feedbackEl.style.fontSize = "12px";
    feedbackEl.style.marginTop = "4px";
    return false;
  } else if (domains.length > 0) {
    feedbackEl.innerHTML = `<i class="fas fa-check-circle"></i> ${domains.length} valid domain(s)`;
    feedbackEl.style.color = "#48bb78";
    feedbackEl.style.fontSize = "12px";
    feedbackEl.style.marginTop = "4px";
    return true;
  } else {
    feedbackEl.innerHTML = "";
    return true;
  }
}

// Enhanced import settings with validation
// Legacy function removed - using new importSettings with preview
