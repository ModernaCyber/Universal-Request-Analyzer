# Testing Suite Documentation

## Overview

This directory contains the comprehensive testing suite for the Universal Request Analyzer extension. Tests are organized following industry best practices with clear separation between unit and integration tests.

**Important:** Tests run **independently** of the build process. You do NOT need to build the extension before running tests. Jest transpiles source code on-the-fly using Babel.

## Quick Start

```bash
# Run all tests (no build required!)
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Build vs Test

| Process | Command | Purpose | Input | Output |
|---------|---------|---------|-------|--------|
| **Test** | `npm test` | Validate logic | `src/` files | Test results |
| **Build** | `npm run build` | Create extension | `src/` files | `dist/` bundle |

**Tests DO NOT require build** - they use Jest + Babel to transpile source code in-memory.

**Development workflow:**
1. Write code in `src/`
2. Run `npm test` to validate logic
3. If tests pass, run `npm run dev` to build for browser
4. Load extension in browser to test UI/UX

## Directory Structure

```
test/
├── unit/                      # Unit tests (isolated components)
│   ├── background/           # Background service tests
│   ├── utils/                # Utility function tests
│   ├── storage/              # Storage layer tests
│   ├── ui/                   # UI component tests
│   └── content/              # Content script tests
├── integration/              # Integration tests (multiple components)
│   ├── background/           # Background flow tests
│   ├── ui/                   # UI integration tests
│   └── storage/              # Storage integration tests
├── mocks/                    # Mock implementations
│   ├── handlers.js           # MSW request handlers
│   ├── server.js             # MSW server setup
│   ├── chromeMock.js         # Chrome extension API mocks
│   ├── styleMock.js          # CSS import mocks
│   └── fileMock.js           # Asset import mocks
├── utils/                    # Test utilities and helpers
│   └── testHelpers.js        # Compositional test helpers
└── setupTests.js             # Global test setup (MSW, mocks, polyfills)
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- path/to/test.test.js
```

### Run Tests Matching Pattern
```bash
npm test -- --testNamePattern="Request Capture"
```

## Test Organization

### Unit Tests

Unit tests focus on testing **isolated functions and classes** without external dependencies. Each test should:

- Test a single behavior
- Use mocks for dependencies
- Be independent of other tests
- Run quickly (< 100ms per test)

**Example:**
```javascript
describe("url-utils", () => {
  describe("parseUrl", () => {
    it("should parse complete URL correctly", () => {
      const url = "https://api.example.com:8080/path?query=value";
      const result = parseUrl(url);

      expect(result.domain).toBe("api.example.com");
      expect(result.path).toBe("/path");
      expect(result.port).toBe("8080");
    });
  });
});
```

### Integration Tests

Integration tests verify that **multiple components work together correctly**. They should:

- Test realistic user flows
- Verify data flows between modules
- Use MSW for network mocking
- Test error handling across boundaries

**Example:**
```javascript
describe("Request Capture to Analytics Integration", () => {
  it("should complete full request lifecycle", async () => {
    // Step 1: Capture request
    const request = createMockRequest({...});
    
    // Step 2: Store in database
    await dbManager.insert(request);
    
    // Step 3: Retrieve analytics
    const stats = await analyticsProcessor.getStats();
    
    expect(stats.totalRequests).toBe(1);
  });
});
```

## Testing Best Practices

### 1. Guard Clauses

Use guard clauses at the beginning of functions and tests to reject invalid cases early:

```javascript
it("should return empty string for null input", () => {
  // Guard clause: handle null early
  if (!input) return "";
  
  expect(sanitizeUrl(null)).toBe("");
  expect(sanitizeUrl(undefined)).toBe("");
});
```

### 2. Compositional Helpers

Reuse test utilities from `test/utils/testHelpers.js` to reduce boilerplate:

```javascript
import { createMockRequest, createMockDatabase } from "../../utils/testHelpers";

it("should store request", () => {
  const request = createMockRequest({ id: "req-1" });
  const db = createMockDatabase();
  
  // Test logic...
});
```

### 3. Specific Tests

Each test should verify **one specific behavior**:

```javascript
// ✅ Good: Tests one specific behavior
it("should format bytes to KB", () => {
  expect(formatBytes(1024)).toBe("1 KB");
});

// ❌ Bad: Tests multiple behaviors
it("should format all units", () => {
  expect(formatBytes(1024)).toBe("1 KB");
  expect(formatDuration(1000)).toBe("1s");
  expect(formatTimestamp(Date.now())).toBeTruthy();
});
```

### 4. Test Independence

Tests should not depend on execution order or share mutable state:

```javascript
describe("Settings", () => {
  let settings;
  
  beforeEach(() => {
    settings = createMockSettings(); // Fresh state for each test
  });
  
  afterEach(() => {
    jest.clearAllMocks(); // Clean up after each test
  });
  
  it("should update theme", () => {
    settings.ui.theme = "dark";
    expect(settings.ui.theme).toBe("dark");
  });
});
```

## Mock Service Worker (MSW)

MSW intercepts network requests in tests, providing realistic API mocking.

### Adding New Handlers

Edit `test/mocks/handlers.js`:

```javascript
import { rest } from "msw";

export const handlers = [
  rest.get("https://api.example.com/endpoint", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ data: "mock response" })
    );
  }),
];
```

### Using MSW in Tests

MSW is automatically set up in `setupTests.js`. To customize handlers in a specific test:

```javascript
import { server } from "../../mocks/server";
import { rest } from "msw";

it("should handle API error", async () => {
  server.use(
    rest.get("https://api.example.com/data", (req, res, ctx) => {
      return res(ctx.status(500));
    })
  );
  
  // Test error handling...
});
```

## Test Utilities

### Available Helpers

Located in `test/utils/testHelpers.js`:

- `createMockRequest(overrides)` - Generate mock HTTP request
- `createMockRequests(count, overrides)` - Generate multiple requests
- `createMockDatabase()` - Create mock SQL.js database
- `createMockStorage()` - Create mock chrome.storage
- `createMockSettings(overrides)` - Generate mock settings
- `createMockAnalytics(overrides)` - Generate mock analytics data
- `createMockChart()` - Create mock Chart.js instance
- `waitFor(condition, timeout)` - Wait for async condition
- `delay(ms)` - Async delay helper
- `guardAgainstNull(value, message)` - Guard clause helper
- `guardAgainstEmptyArray(arr, message)` - Guard clause helper

### Example Usage

```javascript
import {
  createMockRequest,
  createMockDatabase,
  waitFor,
} from "../../utils/testHelpers";

it("should process request asynchronously", async () => {
  const request = createMockRequest({ id: "req-1" });
  const db = createMockDatabase();
  
  processRequest(request, db);
  
  await waitFor(() => db.prepare.mock.calls.length > 0, 5000);
  
  expect(db.prepare).toHaveBeenCalled();
});
```

## Chrome Extension API Mocks

Chrome extension APIs are mocked in `test/mocks/chromeMock.js`. All `chrome.*` APIs return mock implementations.

### Using Chrome Mocks

```javascript
it("should send message to background", async () => {
  const response = await chrome.runtime.sendMessage({ action: "test" });
  
  expect(response.success).toBe(true);
  expect(chrome.runtime.sendMessage).toHaveBeenCalled();
});
```

### Customizing Chrome Mocks

Override specific behaviors in tests:

```javascript
it("should handle storage error", async () => {
  chrome.storage.local.get.mockRejectedValueOnce(new Error("Storage error"));
  
  await expect(loadSettings()).rejects.toThrow("Storage error");
});
```

## Coverage Requirements

The test suite enforces minimum coverage thresholds:

- **Statements**: 70%
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%

### Viewing Coverage

After running `npm run test:coverage`, open:
```
coverage/lcov-report/index.html
```

## Writing New Tests

### 1. Choose Test Type

- **Unit test**: Testing isolated function/class
- **Integration test**: Testing multiple components together

### 2. Create Test File

Follow naming convention: `<module-name>.test.js`

Place in appropriate directory:
- `test/unit/<category>/` for unit tests
- `test/integration/<category>/` for integration tests

### 3. Use Template

```javascript
/**
 * Unit/Integration tests for <module name>
 * Description of what this test file covers
 */

import { createMockX, createMockY } from "../../utils/testHelpers";

describe("<Module Name>", () => {
  let mockDep;

  beforeEach(() => {
    mockDep = createMockX();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("<Feature Group>", () => {
    // Guard clause: document edge case handling
    it("should handle invalid input", () => {
      expect(func(null)).toBe(expectedValue);
    });

    it("should perform normal operation", () => {
      const result = func(validInput);
      expect(result).toBe(expected);
    });
  });
});
```

### 4. Follow Best Practices

- ✅ Use descriptive test names
- ✅ Test one behavior per test
- ✅ Use guard clauses for edge cases
- ✅ Clean up after tests (clearAllMocks)
- ✅ Use helpers from testHelpers.js
- ✅ Document test purpose with comments

## Debugging Tests

### Run Single Test

```bash
npm test -- path/to/file.test.js
```

### Run Tests with Debugger

Add `debugger;` statement in test, then:

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Verbose Output

```bash
npm test -- --verbose
```

### Show Console Logs

```bash
npm test -- --silent=false
```

## Common Issues

### Issue: "Cannot find module"

**Solution**: Check import paths are relative to test file location.

### Issue: "ReferenceError: chrome is not defined"

**Solution**: Ensure `setupTests.js` is loaded. Check `jest.config.js`.

### Issue: "Timeout exceeded"

**Solution**: Increase timeout or use `jest.setTimeout(10000)` in test.

### Issue: "MSW handlers not working"

**Solution**: Verify handlers are exported from `test/mocks/handlers.js` and server is started in `setupTests.js`.

## Contributing

When adding tests:

1. Follow the established structure
2. Use existing test helpers
3. Document complex test scenarios
4. Ensure all tests pass before committing
5. Maintain coverage thresholds

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [MSW Documentation](https://mswjs.io/docs/)
- [Testing Library](https://testing-library.com/docs/)
- [Chrome Extension Testing](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)

---

**Last Updated**: 2026-01-01
