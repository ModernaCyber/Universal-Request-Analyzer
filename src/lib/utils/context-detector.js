/**
 * Context Detector for Universal Request Analyzer
 * 
 * Provides utilities to detect the current execution context.
 * Used to prevent runtime errors when code tries to access APIs that don't exist in the current context.
 * 
 * Contexts:
 * - Service Worker: Background script running in a service worker (MV3)
 * - Browser/UI: Scripts running in popup, options, devtools (has DOM, window, document)
 * - Content Script: Scripts injected into web pages
 */

/**
 * Check if the current context is a service worker
 * @returns {boolean} True if running in a service worker
 */
export function isServiceWorker() {
  return (
    typeof self !== "undefined" &&
    self.constructor &&
    self.constructor.name === "ServiceWorkerGlobalScope"
  );
}

/**
 * Check if the current context is a browser/UI context (has DOM)
 * @returns {boolean} True if running in a browser context with DOM
 */
export function isBrowserContext() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

/**
 * Check if DOM is available (alias for isBrowserContext)
 * @returns {boolean} True if DOM is available
 */
export function hasDOM() {
  return isBrowserContext();
}

/**
 * Check if document is available
 * @returns {boolean} True if document object exists
 */
export function hasDocument() {
  return typeof document !== "undefined" && document !== null;
}

/**
 * Check if window is available
 * @returns {boolean} True if window object exists
 */
export function hasWindow() {
  return typeof window !== "undefined" && window !== null;
}

/**
 * Check if localStorage is available
 * @returns {boolean} True if localStorage is accessible
 */
export function hasLocalStorage() {
  try {
    return (
      typeof localStorage !== "undefined" &&
      localStorage !== null &&
      // Test if we can actually use it
      (() => {
        const testKey = "__storage_test__";
        localStorage.setItem(testKey, "test");
        localStorage.removeItem(testKey);
        return true;
      })()
    );
  } catch (e) {
    return false;
  }
}

/**
 * Check if sessionStorage is available
 * @returns {boolean} True if sessionStorage is accessible
 */
export function hasSessionStorage() {
  try {
    return (
      typeof sessionStorage !== "undefined" &&
      sessionStorage !== null &&
      // Test if we can actually use it
      (() => {
        const testKey = "__storage_test__";
        sessionStorage.setItem(testKey, "test");
        sessionStorage.removeItem(testKey);
        return true;
      })()
    );
  } catch (e) {
    return false;
  }
}

/**
 * Check if chrome.storage API is available
 * @returns {boolean} True if chrome.storage is available
 */
export function hasChromeStorage() {
  const browserAPI = globalThis.browser || globalThis.chrome;
  return (
    typeof browserAPI !== "undefined" &&
    browserAPI !== null &&
    typeof browserAPI.storage !== "undefined" &&
    browserAPI.storage !== null
  );
}

/**
 * Check if chrome.runtime API is available
 * @returns {boolean} True if chrome.runtime is available
 */
export function hasChromeRuntime() {
  const browserAPI = globalThis.browser || globalThis.chrome;
  return (
    typeof browserAPI !== "undefined" &&
    browserAPI !== null &&
    typeof browserAPI.runtime !== "undefined" &&
    browserAPI.runtime !== null
  );
}

/**
 * Check if chrome.tabs API is available
 * @returns {boolean} True if chrome.tabs is available
 */
export function hasChromeTabs() {
  const browserAPI = globalThis.browser || globalThis.chrome;
  return (
    typeof browserAPI !== "undefined" &&
    browserAPI !== null &&
    typeof browserAPI.tabs !== "undefined" &&
    browserAPI.tabs !== null
  );
}

/**
 * Check if running in a content script
 * (Has chrome runtime but no chrome.tabs - content scripts can't access tabs)
 * @returns {boolean} True if likely running in a content script
 */
export function isContentScript() {
  return hasChromeRuntime() && !hasChromeTabs();
}

/**
 * Check if matchMedia is available (for theme detection)
 * @returns {boolean} True if window.matchMedia is available
 */
export function hasMatchMedia() {
  return (
    typeof window !== "undefined" &&
    window !== null &&
    typeof window.matchMedia === "function"
  );
}

/**
 * Get the current context as a string
 * @returns {string} Context name: 'service-worker', 'browser', 'content-script', or 'unknown'
 */
export function getContext() {
  if (isServiceWorker()) {
    return "service-worker";
  }
  if (isContentScript()) {
    return "content-script";
  }
  if (isBrowserContext()) {
    return "browser";
  }
  return "unknown";
}

/**
 * Get detailed context information
 * @returns {Object} Object with all context checks
 */
export function getContextInfo() {
  return {
    context: getContext(),
    isServiceWorker: isServiceWorker(),
    isBrowserContext: isBrowserContext(),
    isContentScript: isContentScript(),
    hasDOM: hasDOM(),
    hasDocument: hasDocument(),
    hasWindow: hasWindow(),
    hasLocalStorage: hasLocalStorage(),
    hasSessionStorage: hasSessionStorage(),
    hasChromeStorage: hasChromeStorage(),
    hasChromeRuntime: hasChromeRuntime(),
    hasChromeTabs: hasChromeTabs(),
    hasMatchMedia: hasMatchMedia(),
  };
}

/**
 * Assert that DOM is available, throw error if not
 * Use this in functions that require DOM to provide clear error messages
 * @param {string} functionName - Name of function requiring DOM
 * @throws {Error} If DOM is not available
 */
export function assertDOM(functionName = "this function") {
  if (!hasDOM()) {
    throw new Error(
      `${functionName} requires DOM but is running in ${getContext()} context`
    );
  }
}

/**
 * Assert that chrome.storage is available, throw error if not
 * @param {string} functionName - Name of function requiring chrome.storage
 * @throws {Error} If chrome.storage is not available
 */
export function assertChromeStorage(functionName = "this function") {
  if (!hasChromeStorage()) {
    throw new Error(
      `${functionName} requires chrome.storage but it's not available in ${getContext()} context`
    );
  }
}

/**
 * Log context information (useful for debugging)
 * @param {string} label - Optional label for the log
 */
export function logContextInfo(label = "Context Info") {
  console.log(`[${label}]`, getContextInfo());
}

// Default export with all functions
export default {
  isServiceWorker,
  isBrowserContext,
  hasDOM,
  hasDocument,
  hasWindow,
  hasLocalStorage,
  hasSessionStorage,
  hasChromeStorage,
  hasChromeRuntime,
  hasChromeTabs,
  isContentScript,
  hasMatchMedia,
  getContext,
  getContextInfo,
  assertDOM,
  assertChromeStorage,
  logContextInfo,
};
