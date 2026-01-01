/**
 * Test Utilities and Helpers
 * 
 * Compositional helpers to reduce boilerplate and improve test quality
 */

/**
 * Generate mock request data
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock request object
 */
export function createMockRequest(overrides = {}) {
  const id = overrides.id || `req-${Date.now()}-${Math.random()}`;
  return {
    id,
    url: "https://api.example.com/test",
    method: "GET",
    domain: "example.com",
    pageUrl: "https://example.com/page",
    status: 200,
    statusText: "OK",
    responseTime: 234,
    timestamp: Date.now(),
    requestHeaders: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    responseHeaders: {
      "Content-Type": "application/json",
      "Content-Length": "1234",
    },
    requestBody: null,
    responseBody: null,
    type: "xmlhttprequest",
    ...overrides,
  };
}

/**
 * Generate multiple mock requests
 * @param {number} count - Number of requests to generate
 * @param {Object} baseOverrides - Base properties for all requests
 * @returns {Array} Array of mock requests
 */
export function createMockRequests(count, baseOverrides = {}) {
  return Array.from({ length: count }, (_, i) =>
    createMockRequest({
      ...baseOverrides,
      id: `req-${i}`,
      url: `https://api.example.com/test-${i}`,
      timestamp: Date.now() - i * 1000,
    })
  );
}

/**
 * Create mock analytics stats
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock analytics object
 */
export function createMockAnalytics(overrides = {}) {
  return {
    domain: "example.com",
    totalRequests: 100,
    successRate: 0.95,
    avgResponseTime: 234,
    requestsByMethod: {
      GET: 60,
      POST: 25,
      PUT: 10,
      DELETE: 5,
    },
    requestsByStatus: {
      "2xx": 95,
      "3xx": 2,
      "4xx": 2,
      "5xx": 1,
    },
    ...overrides,
  };
}

/**
 * Create mock database instance
 * @returns {Object} Mock database object
 */
export function createMockDatabase() {
  return {
    exec: jest.fn((query) => {
      // Simple query parser for testing
      if (query.includes("INSERT")) {
        return [{ values: [] }];
      }
      if (query.includes("SELECT")) {
        return [{ columns: [], values: [] }];
      }
      return [];
    }),
    prepare: jest.fn((query) => ({
      run: jest.fn(() => ({ changes: 1 })),
      get: jest.fn(() => ({})),
      all: jest.fn(() => []),
      bind: jest.fn(),
      step: jest.fn(() => false),
      getAsObject: jest.fn(() => ({})),
      free: jest.fn(),
    })),
    close: jest.fn(),
    export: jest.fn(() => new Uint8Array()),
  };
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Max wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<void>}
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Create a mock Chrome storage object
 * @returns {Object} Mock storage object
 */
export function createMockStorage() {
  const store = {};

  return {
    get: jest.fn((keys) => {
      if (!keys) return Promise.resolve(store);
      if (Array.isArray(keys)) {
        const result = {};
        keys.forEach((key) => {
          if (key in store) result[key] = store[key];
        });
        return Promise.resolve(result);
      }
      return Promise.resolve({ [keys]: store[keys] });
    }),
    set: jest.fn((items) => {
      Object.assign(store, items);
      return Promise.resolve();
    }),
    remove: jest.fn((keys) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      keysArray.forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
      return Promise.resolve();
    }),
    // Access internal store for testing
    _getStore: () => store,
  };
}

/**
 * Create mock settings object
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock settings
 */
export function createMockSettings(overrides = {}) {
  return {
    capture: {
      enabled: true,
      captureFilters: {
        includeDomains: [],
        excludeDomains: ["chrome://*", "edge://*"],
        includeTypes: [],
        excludeTypes: [],
      },
    },
    storage: {
      maxStoredRequests: 10000,
      autoCleanup: true,
      cleanupAge: 30,
    },
    ui: {
      theme: "light",
      showNotifications: true,
      autoRefresh: false,
    },
    export: {
      format: "json",
      includeHeaders: true,
      includeBody: false,
    },
    ...overrides,
  };
}

/**
 * Create a deferred promise for async testing
 * @returns {Object} Object with promise, resolve, and reject
 */
export function createDeferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * Mock SQL.js initialization
 * @returns {Promise<Object>} Mock SQL object
 */
export async function mockSqlJs() {
  return {
    Database: jest.fn(() => createMockDatabase()),
  };
}

/**
 * Create mock Chart.js instance
 * @returns {Object} Mock Chart object
 */
export function createMockChart() {
  return {
    data: {
      labels: [],
      datasets: [],
    },
    options: {},
    update: jest.fn(),
    destroy: jest.fn(),
    render: jest.fn(),
    resize: jest.fn(),
    clear: jest.fn(),
  };
}

/**
 * Simulate delay for async operations
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Guard clause helper: Check if value is valid before proceeding
 * @param {*} value - Value to check
 * @param {string} errorMessage - Error message if invalid
 * @throws {Error} If value is null/undefined
 */
export function guardAgainstNull(value, errorMessage = "Value cannot be null or undefined") {
  if (value === null || value === undefined) {
    throw new Error(errorMessage);
  }
}

/**
 * Guard clause helper: Check if array is non-empty
 * @param {Array} arr - Array to check
 * @param {string} errorMessage - Error message if empty
 * @throws {Error} If array is empty
 */
export function guardAgainstEmptyArray(arr, errorMessage = "Array cannot be empty") {
  if (!Array.isArray(arr) || arr.length === 0) {
    throw new Error(errorMessage);
  }
}
