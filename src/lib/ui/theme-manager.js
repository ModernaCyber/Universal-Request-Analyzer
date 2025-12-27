/**
 * Theme Manager for Universal Request Analyzer
 *
 * ⚠️ UI-ONLY MODULE - DO NOT import in service workers!
 * This module requires DOM (document, window) and should only be used in UI contexts.
 * 
 * Theme persistence flow:
 * 1. User sets theme → Save to DATABASE first
 * 2. Database → Sync to chrome.storage.local (for fast UI access)
 * 3. UI reads from storage (fast lookup)
 * 4. If storage cleared → Read from database → Sync back to storage
 * 
 * This ensures theme persists even if chrome.storage is cleared.
 */

import { assertDOM, hasMatchMedia } from "../utils/context-detector.js";
import { syncToStorageFromDB, loadFromStorageOrDB } from "../utils/db-storage-sync.js";

const DEFAULT_THEMES = {
  light: {
    id: "light",
    name: "Light",
    description: "Default light theme",
    colors: {
      background: "#ffffff",
      surface: "#f5f5f5",
      primary: "#0066cc",
      secondary: "#6c757d",
      accent: "#ff9800",
      error: "#dc3545",
      warning: "#ffc107",
      info: "#17a2b8",
      success: "#28a745",
      text: {
        primary: "#212529",
        secondary: "#6c757d",
        disabled: "#adb5bd",
      },
      border: "#dee2e6",
      divider: "#e9ecef",
      shadow: "rgba(0, 0, 0, 0.1)",
    },
  },
  dark: {
    id: "dark",
    name: "Dark",
    description: "Default dark theme",
    colors: {
      background: "#212529",
      surface: "#343a40",
      primary: "#0d6efd",
      secondary: "#6c757d",
      accent: "#fd7e14",
      error: "#dc3545",
      warning: "#ffc107",
      info: "#0dcaf0",
      success: "#198754",
      text: {
        primary: "#f8f9fa",
        secondary: "#e9ecef",
        disabled: "#adb5bd",
      },
      border: "#495057",
      divider: "#6c757d",
      shadow: "rgba(0, 0, 0, 0.5)",
    },
  },
  highContrast: {
    id: "highContrast",
    name: "High Contrast",
    description: "High contrast theme for accessibility",
    colors: {
      background: "#000000",
      surface: "#121212",
      primary: "#ffffff",
      secondary: "#cccccc",
      accent: "#ffff00",
      error: "#ff0000",
      warning: "#ffff00",
      info: "#00ffff",
      success: "#00ff00",
      text: {
        primary: "#ffffff",
        secondary: "#eeeeee",
        disabled: "#aaaaaa",
      },
      border: "#ffffff",
      divider: "#ffffff",
      shadow: "rgba(255, 255, 255, 0.5)",
    },
  },
  blue: {
    id: "blue",
    name: "Blue",
    description: "Blue-focused theme",
    colors: {
      background: "#f0f8ff",
      surface: "#e6f2ff",
      primary: "#0066cc",
      secondary: "#4d94ff",
      accent: "#00ccff",
      error: "#cc0000",
      warning: "#ff9900",
      info: "#0099cc",
      success: "#009933",
      text: {
        primary: "#003366",
        secondary: "#0066cc",
        disabled: "#99ccff",
      },
      border: "#99ccff",
      divider: "#cce6ff",
      shadow: "rgba(0, 102, 204, 0.2)",
    },
  },
};

const CSS_VARIABLES = {
  background: "--background-color",
  surface: "--surface-color",
  primary: "--primary-color",
  secondary: "--secondary-color",
  accent: "--accent-color",
  error: "--error-color",
  warning: "--warning-color",
  info: "--info-color",
  success: "--success-color",
  "text.primary": "--text-primary-color",
  "text.secondary": "--text-secondary-color",
  "text.disabled": "--text-disabled-color",
  border: "--border-color",
  divider: "--divider-color",
  shadow: "--shadow-color",
};

class ThemeManager {
  constructor() {
    // Assert DOM availability at construction
    assertDOM("ThemeManager");

    this.themes = { ...DEFAULT_THEMES };
    this.currentTheme = "light";
    this.customThemes = {};
    this.initialized = false;
    this.onUpdateCallback = null;

    // Listen for system color scheme changes (only if matchMedia is available)
    if (hasMatchMedia()) {
      try {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        if (mediaQuery && mediaQuery.addEventListener) {
          mediaQuery.addEventListener("change", () => {
            if (this.currentTheme === "system") {
              this.applyTheme();
            }
          });
        }
      } catch (e) {
        console.warn("[ThemeManager] Could not set up matchMedia listener:", e);
      }
    }
  }

  async initialize(options = {}) {
    try {
      const data = await this.loadFromStorage();

      if (data) {
        if (data.currentTheme) {
          this.currentTheme = data.currentTheme;
        }
        if (data.customThemes) {
          this.customThemes = data.customThemes;
          this.themes = { ...DEFAULT_THEMES, ...this.customThemes };
        }
      }

      if (
        options.initialTheme &&
        (this.themes[options.initialTheme] || options.initialTheme === "system")
      ) {
        this.currentTheme = options.initialTheme;
      }

      if (options.customThemes) {
        for (const [id, theme] of Object.entries(options.customThemes)) {
          await this.addTheme(id, theme, false);
        }
      }

      this.onUpdateCallback = options.onUpdate;
      this.initialized = true;

      this.applyTheme();
      await this.saveToStorage();

      console.log("Theme manager initialized:", {
        currentTheme: this.currentTheme,
        availableThemes: Object.keys(this.themes),
      });
    } catch (error) {
      console.error("Error initializing theme manager:", error);
      this.themes = { ...DEFAULT_THEMES };
      this.currentTheme = "light";
      this.customThemes = {};
      this.initialized = true;
      this.applyTheme();
    }
  }

  async loadFromStorage() {
    // Only use chrome.storage.local (no localStorage fallback)
    return new Promise((resolve) => {
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.local.get("themeData", (data) => {
          resolve(data.themeData || null);
        });
      } else {
        console.warn("[ThemeManager] chrome.storage not available");
        resolve(null);
      }
    });
  }

  async saveToStorage() {
    // Only use chrome.storage.local (no localStorage fallback)
    return new Promise((resolve) => {
      const data = {
        currentTheme: this.currentTheme,
        customThemes: this.customThemes,
        timestamp: Date.now(),
      };

      if (typeof chrome !== "undefined" && chrome.storage) {
        // Save both themeData and currentTheme separately for easy access
        chrome.storage.local.set(
          {
            themeData: data,
            currentTheme: this.currentTheme,
          },
          resolve
        );
      } else {
        console.warn("[ThemeManager] chrome.storage not available, theme not persisted");
        resolve();
      }
    });
  }

  applyTheme() {
    if (!this.initialized) {
      console.warn("Theme manager not initialized, using default theme");
      this.applyThemeToDocument(DEFAULT_THEMES.light);
      return;
    }

    if (this.currentTheme === "system") {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = prefersDark ? this.themes.dark : this.themes.light;
      this.applyThemeToDocument(theme);
      return;
    }

    const theme = this.themes[this.currentTheme];
    if (theme) {
      this.applyThemeToDocument(theme);
    } else {
      console.warn(`Theme "${this.currentTheme}" not found, using default`);
      this.applyThemeToDocument(DEFAULT_THEMES.light);
    }
  }

  applyThemeToDocument(theme) {
    // Only apply to DOM in browser context (not in service worker)
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    this.applyColorsToCss(root, theme.colors);

    // Update body classes
    document.body.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-high-contrast",
      "theme-blue",
      "dark"
    );
    document.body.classList.add(`theme-${theme.id}`);

    // Handle dark mode class
    if (theme.id === "dark" || theme.id === "highContrast") {
      document.body.classList.add("dark");
    }

    document.body.setAttribute("data-theme", theme.id);
  }

  applyColorsToCss(root, colors, prefix = "") {
    for (const [key, value] of Object.entries(colors)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "object") {
        this.applyColorsToCss(root, value, fullKey);
      } else {
        const cssVar = CSS_VARIABLES[fullKey];
        if (cssVar) {
          root.style.setProperty(cssVar, value);
        }
      }
    }
  }

  async setTheme(themeId) {
    if (themeId !== "system" && !this.themes[themeId]) {
      console.error(`Theme "${themeId}" not found`);
      return false;
    }

    this.currentTheme = themeId;
    this.applyTheme();
    
    // Save to DB first, then sync to storage (proper flow)
    await syncToStorageFromDB('theme', 'currentTheme', themeId, {
      storageKey: 'currentTheme'
    });

    // Also save custom themes if any
    const customThemesArray = Object.values(this.customThemes);
    if (customThemesArray.length > 0) {
      await syncToStorageFromDB('theme', 'customThemes', customThemesArray, {
        storageKey: 'customThemes'
      });
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        theme: this.currentTheme,
        themeData: this.getCurrentTheme(),
      });
    }

    console.log(`[ThemeManager] Theme set to: ${themeId} (saved to DB → storage)`);
    return true;
  }

  async addTheme(themeId, themeData, save = true) {
    if (!themeId || typeof themeData !== "object") {
      console.error("Invalid theme data");
      return false;
    }

    const theme = {
      id: themeId,
      name: themeData.name || themeId,
      description: themeData.description || "",
      colors: themeData.colors || DEFAULT_THEMES.light.colors,
    };

    this.themes[themeId] = theme;

    if (!DEFAULT_THEMES[themeId]) {
      this.customThemes[themeId] = theme;
    }

    if (this.currentTheme === themeId) {
      this.applyTheme();
    }

    if (save) {
      await this.saveToStorage();
    }

    return true;
  }

  async removeTheme(themeId) {
    if (themeId in DEFAULT_THEMES) {
      console.error("Cannot remove default theme");
      return false;
    }

    if (this.customThemes[themeId]) {
      delete this.customThemes[themeId];
      delete this.themes[themeId];

      if (this.currentTheme === themeId) {
        this.currentTheme = "light";
        this.applyTheme();
      }

      await this.saveToStorage();

      if (this.onUpdateCallback) {
        this.onUpdateCallback({
          theme: this.currentTheme,
          themeData: this.getCurrentTheme(),
        });
      }

      return true;
    }

    return false;
  }

  async resetToDefaults() {
    this.themes = { ...DEFAULT_THEMES };
    this.currentTheme = "light";
    this.customThemes = {};

    this.applyTheme();
    await this.saveToStorage();

    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        theme: this.currentTheme,
        themeData: this.getCurrentTheme(),
      });
    }

    return true;
  }

  getThemesInfo() {
    return Object.entries(this.themes).map(([id, theme]) => ({
      id,
      name: theme.name,
      description: theme.description,
      isCurrentTheme: id === this.currentTheme,
      isDefaultTheme: id in DEFAULT_THEMES,
      previewColors: {
        background: theme.colors.background,
        surface: theme.colors.surface,
        primary: theme.colors.primary,
        text: theme.colors.text.primary,
      },
    }));
  }

  getCurrentTheme() {
    if (this.currentTheme === "system") {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      return prefersDark ? this.themes.dark : this.themes.light;
    }

    return this.themes[this.currentTheme] || DEFAULT_THEMES.light;
  }
}

// Create and export singleton instance
const themeManager = new ThemeManager();
export default themeManager;
