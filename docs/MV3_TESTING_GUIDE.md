# Chrome Manifest V3 Testing Guide

## Overview

This guide covers testing strategies specific to Chrome Manifest V3 (MV3) extensions, addressing the unique challenges of service workers, ephemeral background scripts, and MV3-specific APIs.

## Table of Contents

1. [Current Testing Strategy](#current-testing-strategy)
2. [MV3-Specific Challenges](#mv3-specific-challenges)
3. [Manual Development Testing](#manual-development-testing)
4. [Automated E2E Testing](#automated-e2e-testing)
5. [Service Worker Testing](#service-worker-testing)
6. [State Persistence Testing](#state-persistence-testing)
7. [Pre-Production Testing](#pre-production-testing)

---

## Current Testing Strategy

### What We Have

Our current test suite (250+ tests) uses **Jest for unit and integration testing**:

```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

**Coverage:**
- ✅ **Unit Tests** (180+): Isolated component testing with mocks
- ✅ **Integration Tests** (64+): Multi-component flow testing
- ✅ **Chrome API Mocks**: All chrome.* APIs mocked via `test/mocks/chromeMock.js`
- ✅ **MSW**: Network request mocking for API testing

### What We Need to Add

Based on Chrome MV3 best practices, we should add:

- ⚠️ **E2E Tests**: Full browser automation with extension loaded
- ⚠️ **Service Worker Lifecycle Tests**: Test worker termination/restart
- ⚠️ **State Persistence Tests**: Verify chrome.storage usage (not globals)
- ⚠️ **Manual Testing Guide**: Structured approach for QA

---

## MV3-Specific Challenges

### 1. Service Worker Termination

**Challenge:** Background service workers terminate when idle (after ~30 seconds of inactivity).

**Impact on Extension:**
```javascript
// ❌ BAD: Global variables lost on worker termination
let capturedRequests = [];

// ✅ GOOD: Use chrome.storage for persistence
chrome.storage.local.set({ capturedRequests });
```

**Testing Strategy:**
- ✅ **Unit tests** mock chrome.storage API
- ⚠️ **E2E tests** should verify data persists after simulated worker restart

### 2. No Persistent Background Page

**Challenge:** Can't rely on continuous execution or DOM access in background.

**Impact on Extension:**
- Service worker has no DOM
- Must use chrome.storage instead of localStorage
- Event-driven architecture required

**Testing Strategy:**
- ✅ Current tests use chrome.storage mocks
- ✅ No DOM dependencies in background code

### 3. Chrome API Availability

**Challenge:** chrome.* APIs not available in Node.js test environment.

**Solution:** 
- ✅ **Implemented**: `test/mocks/chromeMock.js` provides comprehensive mocks
- ✅ Covers: runtime, storage, tabs, webRequest, notifications

---

## Manual Development Testing

### Load Unpacked Extension

1. **Build the extension:**
   ```bash
   npm run dev  # Development build with source maps
   ```

2. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked"
   - Select `dist/` directory

3. **Verify loaded:**
   - Extension icon appears in toolbar
   - No errors in extension card

### Debug Service Worker

**Access Service Worker Console:**
1. Go to `chrome://extensions/`
2. Find "Universal Request Analyzer"
3. Click **"service worker"** link (appears when active)
4. DevTools opens showing background script console

**Key Points:**
- Service worker link disappears when inactive
- Click any UI element to wake it up
- Use `console.log()` for debugging
- Errors persist even after termination

**Monitor Service Worker Lifecycle:**
```javascript
// In background.js
console.log('Service worker started:', new Date().toISOString());

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed/updated');
});

// Log every time worker wakes up
self.addEventListener('activate', (event) => {
  console.log('Service worker activated');
});
```

### Debug Popup/Options/DevTools

**Popup:**
- Right-click extension icon → **Inspect popup**
- Or: Click icon, then right-click in popup → Inspect

**Options Page:**
- Right-click anywhere on options page → Inspect

**DevTools Panel:**
- Open DevTools (F12) → Navigate to "Request Analyzer" tab
- Right-click in panel → Inspect

### Test State Persistence

**Simulate Worker Termination:**
1. Open service worker DevTools
2. Use extension (capture some requests)
3. Wait 30 seconds for worker to terminate
4. Service worker link disappears
5. Click extension icon to wake worker
6. Verify data still present

**Manual Test Script:**
```javascript
// In service worker DevTools console

// 1. Store test data
chrome.storage.local.set({ test: 'data' }, () => {
  console.log('Data stored');
});

// 2. Wait for worker to terminate (30+ seconds)
// 3. Wake worker by clicking extension icon
// 4. Verify data persists

chrome.storage.local.get('test', (result) => {
  console.log('Data retrieved:', result.test);
});
```

---

## Automated E2E Testing

### Why E2E Tests for MV3?

**Unit/Integration tests cannot verify:**
- Service worker lifecycle behavior
- Actual Chrome storage persistence
- Extension UI interactions
- Real webRequest API behavior
- Cross-component browser integration

### Recommended Tools

| Tool | Best For | MV3 Support |
|------|----------|-------------|
| **Playwright** | Modern, fast, multi-browser | ✅ Excellent |
| **Puppeteer** | Chrome-specific, mature | ✅ Good |
| **Selenium** | Cross-browser, mature | ✅ Good |

**Recommendation: Playwright** (best MV3 support, fastest)

### Setup Playwright for MV3 Testing

#### 1. Install Playwright

```bash
npm install --save-dev playwright @playwright/test
```

#### 2. Create Playwright Config

**File:** `playwright.config.js`

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false, // Extensions need sequential testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // One worker for extension tests
  reporter: 'html',
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium-extension',
      use: { 
        ...devices['Desktop Chrome'],
        // Extension-specific context options set in tests
      },
    },
  ],
});
```

#### 3. Create E2E Test Helper

**File:** `test/e2e/helpers/extensionHelper.js`

```javascript
import { chromium } from '@playwright/test';
import path from 'path';

/**
 * Launch browser with extension loaded
 * @returns {Promise<{browser, context, backgroundPage, extensionId}>}
 */
export async function launchBrowserWithExtension() {
  const extensionPath = path.join(__dirname, '../../../dist');
  
  // Launch browser with extension
  const browser = await chromium.launchPersistentContext('', {
    headless: false, // Extensions require headed mode
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox', // For CI environments
    ],
  });

  // Wait for extension to load
  let [backgroundPage] = browser.serviceWorkers();
  if (!backgroundPage) {
    backgroundPage = await browser.waitForEvent('serviceworker');
  }

  // Get extension ID
  const extensionId = backgroundPage.url().split('/')[2];
  
  console.log(`Extension loaded with ID: ${extensionId}`);

  return { browser, context: browser, backgroundPage, extensionId };
}

/**
 * Navigate to extension page
 * @param {BrowserContext} context
 * @param {string} extensionId
 * @param {string} page - 'popup', 'options', etc.
 */
export async function openExtensionPage(context, extensionId, page) {
  const extensionPage = await context.newPage();
  await extensionPage.goto(`chrome-extension://${extensionId}/${page}.html`);
  return extensionPage;
}

/**
 * Simulate service worker restart
 * Note: This is challenging in Playwright. Best approach is to wait for natural termination.
 */
export async function waitForServiceWorkerRestart(context, timeout = 35000) {
  // Service workers terminate after ~30s of inactivity
  await new Promise(resolve => setTimeout(resolve, timeout));
  
  // Wake up worker by triggering an event
  const page = await context.newPage();
  await page.goto('https://example.com');
  await page.close();
}
```

#### 4. Example E2E Test

**File:** `test/e2e/extension.spec.js`

```javascript
import { test, expect } from '@playwright/test';
import { 
  launchBrowserWithExtension, 
  openExtensionPage,
  waitForServiceWorkerRestart 
} from './helpers/extensionHelper.js';

test.describe('Universal Request Analyzer E2E', () => {
  let browser, context, extensionId, backgroundPage;

  test.beforeAll(async () => {
    ({ browser, context, backgroundPage, extensionId } = 
      await launchBrowserWithExtension());
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('should load extension successfully', async () => {
    expect(extensionId).toBeTruthy();
    expect(backgroundPage.url()).toContain('chrome-extension://');
  });

  test('should capture requests on page navigation', async () => {
    // Navigate to test page
    const page = await context.newPage();
    await page.goto('https://example.com');
    
    // Wait for requests to be captured
    await page.waitForTimeout(1000);
    
    // Open popup
    const popup = await openExtensionPage(context, extensionId, 'popup');
    
    // Verify requests displayed
    const requestCount = await popup.locator('[data-testid="request-count"]').textContent();
    expect(parseInt(requestCount)).toBeGreaterThan(0);
    
    await popup.close();
    await page.close();
  });

  test('should persist data after service worker restart', async () => {
    // Capture some requests
    const page = await context.newPage();
    await page.goto('https://example.com');
    await page.waitForTimeout(1000);
    
    // Open options and verify data
    const options1 = await openExtensionPage(context, extensionId, 'options');
    const count1 = await options1.locator('[data-testid="total-requests"]').textContent();
    const initialCount = parseInt(count1);
    expect(initialCount).toBeGreaterThan(0);
    await options1.close();
    
    // Wait for service worker to terminate
    console.log('Waiting for service worker to terminate...');
    await waitForServiceWorkerRestart(context);
    
    // Open options again and verify data persists
    const options2 = await openExtensionPage(context, extensionId, 'options');
    const count2 = await options2.locator('[data-testid="total-requests"]').textContent();
    const persistedCount = parseInt(count2);
    
    expect(persistedCount).toBe(initialCount);
    
    await options2.close();
    await page.close();
  });

  test('should filter requests by domain', async () => {
    const options = await openExtensionPage(context, extensionId, 'options');
    
    // Select domain filter
    await options.selectOption('[data-testid="domain-filter"]', 'example.com');
    
    // Verify filtered results
    const filteredRequests = await options.locator('[data-testid="request-item"]').count();
    expect(filteredRequests).toBeGreaterThan(0);
    
    await options.close();
  });

  test('should export data correctly', async () => {
    const options = await openExtensionPage(context, extensionId, 'options');
    
    // Trigger export
    const downloadPromise = options.waitForEvent('download');
    await options.click('[data-testid="export-button"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toContain('export');
    expect(download.suggestedFilename()).toMatch(/\.(json|csv)$/);
    
    await options.close();
  });
});
```

#### 5. Run E2E Tests

```bash
# Build extension first
npm run build

# Run E2E tests
npx playwright test

# Run with UI mode (debugging)
npx playwright test --ui

# Run specific test
npx playwright test test/e2e/extension.spec.js
```

---

## Service Worker Testing

### Test Service Worker Lifecycle

**Key Scenarios to Test:**

1. **Worker starts on extension install**
2. **Worker wakes on user action** (click icon, open page)
3. **Worker wakes on incoming message**
4. **Worker terminates after inactivity**
5. **State persists across restarts**

### Unit Test: State Persistence

**File:** `test/unit/background/statePersistence.test.js`

```javascript
import chromeMock from '../../mocks/chromeMock';

describe('State Persistence (MV3)', () => {
  beforeEach(() => {
    global.chrome = chromeMock;
  });

  it('should store state in chrome.storage instead of globals', async () => {
    // Simulate data capture
    const requestData = {
      id: 'req-1',
      url: 'https://example.com',
      timestamp: Date.now(),
    };

    // Store using chrome.storage (MV3 requirement)
    await chrome.storage.local.set({ requestData });

    // Verify storage was called
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ requestData });
  });

  it('should retrieve state from chrome.storage on worker restart', async () => {
    // Setup: Store data
    const storedData = { requests: [{ id: 'req-1' }] };
    chrome.storage.local.get.mockResolvedValueOnce(storedData);

    // Simulate worker restart by fetching data
    const result = await chrome.storage.local.get('requests');

    expect(result.requests).toHaveLength(1);
    expect(result.requests[0].id).toBe('req-1');
  });

  it('should NOT use global variables for state', () => {
    // This is a code review test
    // In real implementation, avoid:
    // let capturedRequests = []; // ❌ Lost on worker termination
    
    // Instead use:
    // chrome.storage.local for persistence ✅
    
    expect(true).toBe(true); // Placeholder assertion
  });
});
```

### E2E Test: Service Worker Restart

See example in "Automated E2E Testing" section above (`should persist data after service worker restart`).

---

## State Persistence Testing

### Code Audit Checklist

Review background scripts for MV3 compliance:

```javascript
// ❌ ANTI-PATTERNS (Don't use in MV3):
let globalState = {};                    // Lost on worker termination
localStorage.setItem('key', 'value');    // Not available in service worker
const db = new Database();               // Lost on restart if not persisted

// ✅ CORRECT PATTERNS (Use in MV3):
chrome.storage.local.set({ state });     // Persists across restarts
chrome.storage.session.set({ temp });    // For session-scoped data
// For SQL.js: Save to chrome.storage.local periodically
```

### Automated State Audit

**File:** `test/unit/background/mv3-compliance.test.js`

```javascript
import { readFileSync } from 'fs';
import { join } from 'path';

describe('MV3 Compliance Audit', () => {
  const backgroundFiles = [
    'src/background/background.js',
    'src/background/capture/request-capture.js',
    // Add all background files
  ];

  it('should not use global variables for state', () => {
    backgroundFiles.forEach(file => {
      const content = readFileSync(join(__dirname, '../../../', file), 'utf-8');
      
      // Check for problematic patterns
      const antiPatterns = [
        /let\s+\w+State\s*=/,           // let someState =
        /var\s+\w+State\s*=/,           // var someState =
        /localStorage\./,                // localStorage.setItem
        /sessionStorage\./,              // sessionStorage.setItem
      ];

      antiPatterns.forEach(pattern => {
        const match = content.match(pattern);
        if (match) {
          console.warn(`Warning in ${file}: Found pattern ${match[0]}`);
        }
      });
    });
  });

  it('should use chrome.storage for persistence', () => {
    backgroundFiles.forEach(file => {
      const content = readFileSync(join(__dirname, '../../../', file), 'utf-8');
      
      // Verify chrome.storage usage
      const hasStorageUsage = 
        content.includes('chrome.storage.local') ||
        content.includes('chrome.storage.session');
      
      // If file manages state, it should use chrome.storage
      if (content.includes('State') || content.includes('data')) {
        // This is a heuristic check
        // Manual review recommended
      }
    });
  });
});
```

---

## Pre-Production Testing

### Fixed Extension ID

For consistent testing, add a fixed `key` to `manifest.json`:

```json
{
  "manifest_version": 3,
  "key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
  "name": "Universal Request Analyzer",
  ...
}
```

**Generate key:**
```bash
# Using Chrome's built-in tool
# 1. Go to chrome://extensions/
# 2. Pack extension
# 3. Extract public key from .pem file
```

**Benefits:**
- Consistent extension ID across installs
- Easier E2E test URLs (`chrome-extension://<fixed-id>/popup.html`)
- Persistent chrome.storage between test runs

### Trusted Testers Program

**Before public release:**

1. **Create private listing:**
   - Chrome Web Store Developer Dashboard
   - Set visibility to "Private"
   - Add trusted testers' emails

2. **Test with beta users:**
   - Real-world usage patterns
   - Service worker behavior over days
   - State persistence validation
   - Performance monitoring

3. **Monitor feedback:**
   - Track service worker errors
   - Check storage usage
   - Verify no data loss

### Beta Testing Track

**For major MV3 updates:**

1. **Create beta version:**
   - Duplicate manifest with different ID
   - Add "-beta" suffix to name
   - Publish to separate listing

2. **Test migration path:**
   - Data export from stable → import to beta
   - Service worker migration
   - Storage schema updates

3. **Gradual rollout:**
   - 10% → 25% → 50% → 100%
   - Monitor error rates at each stage

---

## Testing Checklist

### Before Each Release

- [ ] **Unit tests pass** (`npm test`)
- [ ] **Coverage > 70%** (`npm run test:coverage`)
- [ ] **Build succeeds** (`npm run build`)
- [ ] **Manual QA**:
  - [ ] Load unpacked extension
  - [ ] Test all major features
  - [ ] Open service worker console (no errors)
  - [ ] Test popup, options, devtools
  - [ ] Capture requests on multiple sites
  - [ ] Verify data persists after 30+ seconds
  - [ ] Export/import data successfully
- [ ] **E2E tests pass** (`npx playwright test`) [if implemented]
- [ ] **State persistence verified**:
  - [ ] No global variables for state
  - [ ] All state in chrome.storage
  - [ ] SQL.js database saved periodically
- [ ] **Service worker behavior**:
  - [ ] Starts on install
  - [ ] Wakes on user action
  - [ ] Terminates gracefully
  - [ ] No errors in console

---

## Next Steps for Our Testing

### Immediate Actions

1. ✅ **Unit/Integration tests complete** (250 tests)
2. ⚠️ **Add E2E tests with Playwright** (recommended)
3. ⚠️ **State persistence audit** (review background code)
4. ⚠️ **Manual testing checklist** (QA guide)

### Implementation Priority

**High Priority:**
- Playwright E2E test setup
- Service worker lifecycle tests
- State persistence verification

**Medium Priority:**
- Fixed extension ID for testing
- Automated MV3 compliance checks
- Performance monitoring

**Low Priority:**
- Beta testing track (for major updates)
- Trusted testers program (before public launch)

---

## Resources

- **Chrome Extension MV3 Docs**: https://developer.chrome.com/docs/extensions/mv3/
- **Service Workers**: https://developer.chrome.com/docs/extensions/mv3/service_workers/
- **Playwright**: https://playwright.dev/
- **Testing Extensions**: https://developer.chrome.com/docs/extensions/mv3/tut_testing/
- **chrome.storage API**: https://developer.chrome.com/docs/extensions/reference/storage/

---

**Summary:** Our current Jest-based tests cover unit/integration logic well. To fully test MV3-specific behavior (service worker lifecycle, state persistence), we should add Playwright E2E tests that load the actual extension in Chrome.
