/**
 * DB-Storage Sync Utility
 * 
 * Shared function for the pattern: Save to DB first → Sync to chrome.storage
 * This ensures data persistence even if chrome.storage is cleared.
 * 
 * Usage in UI contexts:
 * ```javascript
 * import { syncToStorageFromDB } from '../utils/db-storage-sync.js';
 * 
 * // Save theme
 * await syncToStorageFromDB('theme', 'currentTheme', 'dark');
 * ```
 * 
 * Usage in background contexts:
 * Use settings-manager-core.js which handles this automatically.
 */

/**
 * Save a setting to DB first, then sync to chrome.storage.local
 * This is the recommended pattern for all persistent settings.
 * 
 * @param {string} category - Setting category (e.g., 'theme', 'capture', 'export')
 * @param {string} key - Setting key
 * @param {any} value - Setting value (will be JSON stringified if object)
 * @param {object} options - Additional options
 * @param {string} options.storageKey - Chrome storage key (defaults to key)
 * @param {boolean} options.syncOnly - Skip DB, only sync to storage (use sparingly)
 * @returns {Promise<boolean>} - Success status
 */
export async function syncToStorageFromDB(category, key, value, options = {}) {
  const { storageKey = key, syncOnly = false } = options;

  try {
    // Step 1: Save to database (unless syncOnly mode)
    if (!syncOnly) {
      const response = await chrome.runtime.sendMessage({
        action: 'saveSetting',
        category,
        key,
        value,
      });

      if (!response || !response.success) {
        console.error('[DB-Storage Sync] Failed to save to database:', response?.error);
        // Continue to storage sync even if DB save fails (graceful degradation)
      } else {
        console.log(`[DB-Storage Sync] Saved ${category}.${key} to database`);
      }
    }

    // Step 2: Sync to chrome.storage.local for fast UI access
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await new Promise((resolve, reject) => {
        const storageData = { [storageKey]: value };
        chrome.storage.local.set(storageData, () => {
          if (chrome.runtime.lastError) {
            console.error('[DB-Storage Sync] Storage sync error:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log(`[DB-Storage Sync] Synced ${storageKey} to chrome.storage`);
            resolve();
          }
        });
      });
    }

    return true;
  } catch (error) {
    console.error('[DB-Storage Sync] Error:', error);
    return false;
  }
}

/**
 * Load a setting from storage, fallback to DB if not found
 * Automatically syncs DB → storage if loaded from DB
 * 
 * @param {string} category - Setting category
 * @param {string} key - Setting key
 * @param {object} options - Additional options
 * @param {string} options.storageKey - Chrome storage key (defaults to key)
 * @param {any} options.defaultValue - Default value if not found
 * @returns {Promise<any>} - Setting value
 */
export async function loadFromStorageOrDB(category, key, options = {}) {
  const { storageKey = key, defaultValue = null } = options;

  try {
    // Step 1: Try chrome.storage.local first (fast)
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = await new Promise((resolve) => {
        chrome.storage.local.get(storageKey, (result) => {
          resolve(result[storageKey]);
        });
      });

      if (data !== undefined && data !== null) {
        console.log(`[DB-Storage Sync] Loaded ${storageKey} from chrome.storage`);
        return data;
      }
    }

    // Step 2: Fallback to database
    console.log(`[DB-Storage Sync] Not in storage, checking database for ${category}.${key}`);
    const response = await chrome.runtime.sendMessage({
      action: 'getSetting',
      category,
      key,
    });

    if (response && response.success && response.value !== undefined) {
      console.log(`[DB-Storage Sync] Loaded ${category}.${key} from database`);
      
      // Step 3: Sync back to storage for next time
      await syncToStorageFromDB(category, key, response.value, { syncOnly: true });
      
      return response.value;
    }

    // Not found in DB either, return default
    console.log(`[DB-Storage Sync] ${category}.${key} not found, using default`);
    return defaultValue;
  } catch (error) {
    console.error('[DB-Storage Sync] Load error:', error);
    return defaultValue;
  }
}

/**
 * Batch sync multiple settings to storage from DB
 * Useful for initial load or after storage is cleared
 * 
 * @param {string} category - Setting category
 * @returns {Promise<boolean>} - Success status
 */
export async function syncCategoryToStorage(category) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'getSettingsByCategory',
      category,
    });

    if (response && response.success && response.settings) {
      const storageData = {};
      
      for (const setting of response.settings) {
        storageData[setting.key] = setting.value;
      }

      if (Object.keys(storageData).length > 0) {
        await new Promise((resolve, reject) => {
          chrome.storage.local.set(storageData, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });

        console.log(`[DB-Storage Sync] Synced ${Object.keys(storageData).length} settings from ${category} to storage`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[DB-Storage Sync] Category sync error:', error);
    return false;
  }
}

export default {
  syncToStorageFromDB,
  loadFromStorageOrDB,
  syncCategoryToStorage,
};
