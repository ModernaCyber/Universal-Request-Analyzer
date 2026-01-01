# Universal Request Analyzer - Development Guide

## Table of Contents
1. [Development Setup](#development-setup)
2. [Project Structure](#project-structure)
3. [Building the Extension](#building-the-extension)
4. [Testing](#testing)
5. [Code Style & Standards](#code-style--standards)
6. [Contributing](#contributing)
7. [Debugging](#debugging)
8. [Release Process](#release-process)

## Development Setup

### Prerequisites

- **Node.js**: v14 or higher
- **npm**: v6 or higher
- **Git**: Latest version
- **Browser**: Chrome/Edge (v88+) or Firefox (v109+)

### Initial Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ModernaCyber/Universal-Request-Analyzer.git
   cd Universal-Request-Analyzer
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build the Extension**
   ```bash
   npm run build
   ```

4. **Load in Browser**
   
   **Chrome/Edge:**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder
   
   **Firefox:**
   - Navigate to `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select any file in the `dist` folder

## Project Structure

```
Universal-Request-Analyzer/
├── src/                          # Source code
│   ├── background/               # Background service worker
│   │   ├── database/            # Database layer (medallion + star schema)
│   │   ├── capture/             # Request capture logic
│   │   ├── messaging/           # Message handlers
│   │   └── background.js        # Main entry point
│   │
│   ├── popup/                   # Popup UI
│   │   ├── components/          # UI components
│   │   ├── popup.html           # Main HTML
│   │   └── popup.js             # Main script
│   │
│   ├── options/                 # Options/Dashboard page
│   │   ├── components/          # UI components
│   │   ├── options.html         # Main HTML
│   │   └── options.js           # Main script
│   │
│   ├── devtools/                # DevTools panel
│   │   ├── devtools.html        # Panel HTML
│   │   └── devtools.js          # Panel script
│   │
│   ├── content/                 # Content scripts
│   │   └── content.js           # Injected into pages
│   │
│   ├── lib/                     # Shared library
│   │   ├── core/               # Core classes (DataManager, etc.)
│   │   ├── ui/                 # UI components (BaseComponent, ChartManager)
│   │   ├── managers/           # Feature managers (ExportManager, etc.)
│   │   └── utils/              # Utility functions
│   │
│   ├── assets/                  # Static assets
│   │   ├── icons/              # Extension icons
│   │   ├── images/             # Images
│   │   └── wasm/               # WebAssembly files (sql.js)
│   │
│   └── manifest.json            # Extension manifest
│
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md          # Technical architecture
│   ├── USER_GUIDE.md           # User documentation
│   └── DEVELOPMENT.md          # This file
│
├── webpack.*.js                 # Webpack configurations
├── babel.config.js              # Babel configuration
├── jest.config.js               # Jest test configuration
├── .eslintrc.js                # ESLint configuration
└── package.json                # Dependencies and scripts

```

### Key Directories

- **`src/background/database/`**: All database-related code including medallion architecture, star schema, and analytics processing
- **`src/lib/`**: Shared code used across popup, options, and devtools
- **`src/assets/wasm/`**: WebAssembly files for SQLite (sql.js)

## Building the Extension

### Available Build Commands

```bash
# Development build with watch mode
npm run dev

# Production build (optimized and minified)
npm run build

# Clean build artifacts
npm run clean

# Clean and rebuild
npm run clean && npm run build
```

### Build Outputs

All builds output to the `dist/` directory:

```
dist/
├── background.js              # Service worker
├── popup.html & popup.js      # Popup interface
├── options.html & options.js  # Options page
├── devtools.html & devtools.js # DevTools panel
├── content.js                 # Content script
├── assets/                    # Copied static assets
└── manifest.json              # Processed manifest
```

### Development Mode

```bash
npm run dev
```

This starts webpack in watch mode:
- Automatically rebuilds on file changes
- Source maps included for debugging
- Faster build times
- No minification

**Note**: After rebuild, you must reload the extension in your browser:
- Chrome/Edge: Click reload icon on extension card
- Firefox: Click "Reload" in about:debugging

### Production Mode

```bash
npm run build
```

Production builds include:
- Minification and optimization
- Tree shaking (removes unused code)
- Asset compression
- No source maps

## Testing

### Overview

The extension uses **Jest** for testing with comprehensive unit and integration tests. Tests are **independent of the build process** - they run directly on source code without requiring a production build.

### Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Run all tests (no build required!)
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Important:** Tests run directly on source files in `src/` using Babel for transpilation. You do **NOT** need to build the extension before running tests.

### Build vs Test: When to Use What

| Task | Command | When to Use |
|------|---------|-------------|
| **Testing** | `npm test` | Validate code logic, run during development |
| **Development** | `npm run dev` | Build extension for browser testing |
| **Production** | `npm run build` | Create optimized build for release |

**Development Workflow:**
```bash
# 1. Make code changes
# 2. Run tests to validate logic
npm test

# 3. If tests pass, build for browser testing
npm run dev

# 4. Load extension in browser to test UI/UX
```

### Test Structure

Tests are located in `test/` (new structure) and `src/tests/` (legacy):
```
test/                          # New comprehensive test suite
├── unit/                      # 180+ isolated component tests
│   ├── background/           # Request capture, message handlers, export/import
│   ├── utils/                # URL parsing, ID generation, formatters
│   ├── storage/              # Database operations
│   ├── ui/                   # Dashboard components, charts, filters
│   └── content/              # Content script functionality
├── integration/              # 64+ end-to-end flow tests
│   └── background/           # Capture→storage→analytics, settings sync
├── mocks/                    # MSW handlers, Chrome API mocks
│   ├── handlers.js           # Network request mocks
│   ├── server.js             # MSW server setup
│   ├── chromeMock.js         # chrome.* API mocks
│   ├── styleMock.js          # CSS import stubs
│   └── fileMock.js           # Asset import stubs
├── utils/
│   └── testHelpers.js        # 15+ reusable helpers (createMockRequest, etc.)
└── setupTests.js             # Global setup (MSW lifecycle, polyfills)

src/tests/                     # Legacy tests (being migrated)
├── auth/                     # Authentication tests
├── config/                   # Configuration tests
└── ...
```

### Test Coverage

**Current Status:**
- **250 total tests** (244 passing - 97.6%)
- **180+ unit tests** covering utilities, background services, storage, UI, content scripts
- **64+ integration tests** for complete flows
- **Coverage:** URL utils 94%, ID generator 100%

**Run coverage report:**
```bash
npm run test:coverage

# Open detailed HTML report
open coverage/lcov-report/index.html  # Mac/Linux
start coverage/lcov-report/index.html # Windows
```

### Writing Tests

#### Unit Test Example

```javascript
import { createMockRequest, createMockDatabase } from '../../utils/testHelpers';

describe('Request Processing', () => {
  let mockDb;
  
  beforeEach(() => {
    mockDb = createMockDatabase(); // Compositional helper
  });
  
  afterEach(() => {
    jest.clearAllMocks(); // Cleanup for isolation
  });
  
  // Guard clause pattern
  it('should reject invalid requests', () => {
    const invalidRequest = null;
    expect(() => processRequest(invalidRequest)).toThrow();
  });
  
  it('should store valid request', () => {
    const request = createMockRequest({ id: 'req-1', status: 200 });
    storeRequest(mockDb, request);
    
    expect(mockDb.prepare).toHaveBeenCalled();
  });
});
```

#### Integration Test Example

```javascript
describe('Capture to Analytics Integration', () => {
  it('should complete full pipeline', async () => {
    // 1. Capture request
    const request = createMockRequest();
    capturedRequests.push(request);
    
    // 2. Store in Bronze layer
    await dbManager.medallion.insertBronzeRequest(request);
    
    // 3. Process to Silver layer
    await dbManager.medallion.processBronzeToSilver();
    
    // 4. Aggregate to Gold layer
    const stats = await dbManager.medallion.getGoldStats();
    
    expect(stats.totalRequests).toBe(1);
  });
});
```

### Test Utilities

Located in `test/utils/testHelpers.js`:

```javascript
// Create mock data
const request = createMockRequest({ status: 200 });
const requests = createMockRequests(10); // Generate 10 requests
const settings = createMockSettings();
const analytics = createMockAnalytics();

// Create mock objects
const db = createMockDatabase();
const storage = createMockStorage();
const chart = createMockChart();

// Async helpers
await waitFor(() => condition === true, 5000);
await delay(100);

// Validation helpers
guardAgainstNull(value, 'Value required');
guardAgainstEmptyArray(arr, 'Array cannot be empty');
```

### MSW (Mock Service Worker)

Tests use MSW to mock network requests. Handlers are in `test/mocks/handlers.js`:

```javascript
import { rest } from 'msw';

export const handlers = [
  rest.get('https://api.example.com/stats', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ totalRequests: 100 }));
  }),
];
```

MSW automatically starts/stops in tests via `setupTests.js`. No manual setup needed!

### Debugging Tests

```bash
# Run single test file
npm test -- path/to/file.test.js

# Run tests matching pattern
npm test -- --testNamePattern="Request Capture"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest --runInBand

# Verbose output
npm test -- --verbose

# Show console logs
npm test -- --silent=false
```

### Common Test Issues

#### Issue: "Cannot find module"
**Solution:** Check import paths are relative to test file location.

#### Issue: "chrome is not defined"
**Solution:** Global `chrome` mock is set up in `setupTests.js`. Ensure Jest config loads it.

#### Issue: "Timeout exceeded"
**Solution:** Increase timeout: `jest.setTimeout(10000)` or use `--testTimeout=10000` flag.

### Best Practices

✅ **Guard Clauses** - Handle edge cases early
```javascript
it('should handle null input', () => {
  expect(formatBytes(null)).toBe('N/A'); // Guard clause in implementation
});
```

✅ **Compositional Helpers** - Reuse test utilities
```javascript
const request = createMockRequest({ id: 'req-1' }); // Not manually building
```

✅ **Test Isolation** - Each test independent
```javascript
beforeEach(() => { /* fresh state */ });
afterEach(() => { jest.clearAllMocks(); });
```

✅ **Specific Tests** - One behavior per test
```javascript
it('should format bytes to KB', () => { /* single assertion */ });
```

### Documentation

- **Test README**: `test/README.md` - Complete testing guide
- **Implementation Summary**: `test/IMPLEMENTATION_SUMMARY.md` - Requirements mapping
- **Jest Config**: `jest.config.js` - Test runner configuration
- **MV3 Testing**: `docs/MV3_TESTING_GUIDE.md` - Chrome MV3-specific testing (service workers, E2E)

### Chrome Manifest V3 Testing

Our extension uses MV3 service workers. For E2E testing, service worker lifecycle tests, and state persistence verification:

👉 **See [MV3 Testing Guide](../docs/MV3_TESTING_GUIDE.md)**

**Quick MV3 Testing Tips:**
- Service worker console: `chrome://extensions/` → click "service worker"
- Test state persistence after 30s inactivity
- Use chrome.storage for all state (not global variables)
- E2E tests require Playwright with extension loaded

### Manual Testing

#### Testing the Extension

1. **Build the Extension**
   ```bash
   npm run dev
   ```

2. **Load in Browser** (see Initial Setup)

3. **Open Developer Tools**
   - For popup: Right-click popup → Inspect
   - For options: Right-click options page → Inspect
   - For background: Go to `chrome://extensions/` → Click "service worker"

4. **Test Features**
   - Navigate to websites and verify request capture
   - Open popup and verify metrics display
   - Open DevTools panel and test filters
   - Open Dashboard and verify charts render

#### Visual Testing Checklist

See [TESTING_GUIDE.md](../TESTING_GUIDE.md) for comprehensive visual testing checklist covering:
- Popup interface (auth and main app)
- Options page (all tabs)
- DevTools panel
- Help page
- All interactions and flows

### Linting

```bash
# Check for linting errors
npm run lint

# Auto-fix linting errors
npm run lint:fix
```

## Code Style & Standards

### JavaScript Style

We use ESLint with standard configuration. Key rules:

- **Indentation**: 2 spaces
- **Quotes**: Single quotes for strings
- **Semicolons**: Required
- **Line Length**: 100 characters (soft limit)
- **Naming**:
  - Classes: PascalCase
  - Functions/Variables: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Private methods: _prefixWithUnderscore

### File Organization

```javascript
// 1. Imports
import { BaseComponent } from '@/lib/ui/BaseComponent.js';
import { formatBytes } from '@/lib/utils/helpers.js';

// 2. Constants
const DEFAULT_REFRESH_INTERVAL = 5000;
const MAX_RETRIES = 3;

// 3. Class definition
class MyComponent extends BaseComponent {
  constructor() {
    super();
    this.state = {};
  }
  
  // Public methods first
  async initialize() {
    // ...
  }
  
  // Private methods last
  _privateMethod() {
    // ...
  }
}

// 4. Export
export default MyComponent;
```

### Comments

- Use JSDoc for functions and classes
- Inline comments for complex logic only
- Avoid obvious comments

```javascript
/**
 * Processes requests from Bronze to Silver layer
 * @param {Array} requests - Raw request objects
 * @param {Object} options - Processing options
 * @returns {Promise<number>} Number of processed requests
 */
async function processRequests(requests, options) {
  // Complex logic here warrants a comment
  const filtered = requests.filter(r => {
    // Only process requests within retention period
    return Date.now() - r.timestamp < options.retentionMs;
  });
  
  return filtered.length;
}
```

### Database Conventions

- **Table names**: `snake_case`
- **Column names**: `snake_case`
- **Bronze tables**: Prefix with `bronze_`
- **Silver tables**: Prefix with `silver_`
- **Gold tables**: Prefix with `gold_`
- **Dimensions**: Prefix with `dim_`
- **Facts**: Prefix with `fact_`

### Git Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build/tool changes

**Examples:**
```
feat(popup): add request type filter

fix(database): resolve SCD Type 2 version conflict

docs(user-guide): update performance metrics section

refactor(lib): extract chart logic to ChartManager
```

## Contributing

### Before You Start

1. Check existing issues for duplicates
2. Discuss major changes in an issue first
3. Read [CONTRIBUTING.md](../CONTRIBUTING.md)

### Development Workflow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Universal-Request-Analyzer.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feat/my-new-feature
   ```

3. **Make Changes**
   - Write code
   - Add/update tests
   - Update documentation if needed

4. **Test Your Changes**
   ```bash
   npm run lint
   npm test
   npm run build
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat(scope): description"
   ```

6. **Push to Fork**
   ```bash
   git push origin feat/my-new-feature
   ```

7. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill in PR template
   - Request review

### Pull Request Guidelines

- **Title**: Follow commit message format
- **Description**: Explain what and why, not how
- **Tests**: Include test coverage
- **Documentation**: Update if needed
- **Screenshots**: For UI changes
- **Breaking Changes**: Clearly document

## Debugging

### Background Service Worker

```javascript
// In background.js or any background file
console.log('Debug info:', data);
console.error('Error occurred:', error);
```

View logs:
- Chrome/Edge: `chrome://extensions/` → Click "service worker"
- Firefox: `about:debugging` → This Firefox → Inspect

### Popup/Options/DevTools

Right-click on the interface → Inspect

### Database Debugging

Use the Advanced tab in options page:

1. Open Options → Advanced
2. Execute SQL queries:
   ```sql
   -- View all bronze requests
   SELECT * FROM bronze_requests LIMIT 10;
   
   -- Check layer counts
   SELECT 'bronze' as layer, COUNT(*) FROM bronze_requests
   UNION ALL
   SELECT 'silver', COUNT(*) FROM silver_requests
   UNION ALL
   SELECT 'gold', COUNT(*) FROM gold_daily_analytics;
   
   -- View star schema dimensions
   SELECT * FROM dim_domain WHERE is_current = 1;
   ```

3. Use debug tools:
   - **Inspect Schema**: View all tables and columns
   - **Test Connection**: Verify database is working
   - **Force Processing**: Trigger data processing manually

### Network Debugging

Monitor extension's network activity:
1. Open DevTools in extension page
2. Go to Network tab
3. Trigger actions
4. Verify API calls (if any)

### Common Issues

#### Extension Not Loading
- Check manifest.json syntax
- Verify all required files exist in dist/
- Check browser console for errors

#### Database Errors
- Check if sql.js WASM files are in dist/assets/wasm/
- Verify Content Security Policy allows 'wasm-unsafe-eval'
- Check browser storage permissions

#### Build Failures
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear webpack cache: `npm run clean`
- Check Node.js version: `node --version`

## Release Process

### Version Numbering

We use Semantic Versioning (semver):
- **Major**: Breaking changes (v2.0.0)
- **Minor**: New features, backwards compatible (v1.1.0)
- **Patch**: Bug fixes (v1.0.1)

### Creating a Release

1. **Update Version**
   ```bash
   # Update version in package.json and manifest.json
   npm version patch  # or minor, or major
   ```

2. **Update Changelog**
   - Document all changes since last release
   - Categorize: Added, Changed, Fixed, Removed

3. **Build Production Version**
   ```bash
   npm run build
   ```

4. **Test Thoroughly**
   - Load production build in browser
   - Test all major features
   - Verify no console errors

5. **Create Git Tag**
   ```bash
   git tag -a v1.0.1 -m "Release version 1.0.1"
   git push origin v1.0.1
   ```

6. **Create GitHub Release**
   - Go to GitHub → Releases
   - Create new release from tag
   - Upload `dist.zip`
   - Add changelog to description

7. **Submit to Browser Stores**
   - Chrome Web Store: Upload dist.zip
   - Firefox Add-ons: Upload dist.zip
   - Follow store-specific review process

### Pre-Release Checklist

- [ ] All tests pass
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version numbers updated (package.json, manifest.json)
- [ ] Production build tested
- [ ] No console errors
- [ ] All features working
- [ ] Security vulnerabilities checked

## Additional Resources

### Project Documentation
- **Architecture Documentation**: [ARCHITECTURE.md](./ARCHITECTURE.md)
- **User Guide**: [USER_GUIDE.md](./USER_GUIDE.md)
- **Contributing Guide**: [../CONTRIBUTING.md](../CONTRIBUTING.md)
- **Testing Guide**: [../TESTING_GUIDE.md](../TESTING_GUIDE.md)
- **Code of Conduct**: [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)

### External Resources
- **Browser Extension APIs**:
  - [Chrome Extension API](https://developer.chrome.com/docs/extensions/reference/)
  - [Firefox WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
  - [Web Extension Polyfill](https://github.com/mozilla/webextension-polyfill)

- **Testing & Tools**:
  - [Jest Documentation](https://jestjs.io/docs/getting-started)
  - [Webpack Guide](https://webpack.js.org/guides/)
  - [ESLint Rules](https://eslint.org/docs/rules/)

- **Performance & Optimization**:
  - [Web Performance APIs](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
  - [SQLite Documentation](https://www.sqlite.org/docs.html)
  - [Chart.js Documentation](https://www.chartjs.org/docs/latest/)

## Getting Help

- **GitHub Issues**: For bugs and feature requests
- **Discussions**: For questions and ideas
- **Email**: [Contact email if available]

---

**Happy Coding! 🚀**
