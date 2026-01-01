# Build and Test Process Guide

## Quick Reference

```bash
# Testing (no build required)
npm test                    # Run all tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Generate coverage report

# Building
npm run dev                # Development build with watch
npm run build              # Production build

# Linting
npm run lint               # Check code style
npm run lint:fix           # Auto-fix style issues
```

## Understanding the Workflow

### Tests vs Build: Key Differences

| Aspect | Testing | Building |
|--------|---------|----------|
| **Purpose** | Validate code logic | Create extension bundle |
| **Input** | Source files (`src/`) | Source files (`src/`) |
| **Output** | Test results & coverage | Built extension (`dist/`) |
| **Transpilation** | Jest + Babel (in-memory) | Webpack + Babel (to files) |
| **Dependencies** | Mocked (MSW, chrome API mocks) | Actual dependencies bundled |
| **When to Run** | During development, before commit | Before browser loading, before release |

### Why Tests Don't Need Build

**Traditional Workflow (Not Used):**
```
Source Code → Build → Test Built Code
```

**Our Workflow (Modern):**
```
Source Code → Test Directly (Jest transpiles on-the-fly)
```

**Benefits:**
- ⚡ Faster feedback (no build step)
- 🔄 Watch mode works instantly
- 🎯 Test actual source code, not build artifacts
- 🧪 Mocked dependencies (no bundling needed)

## Complete Development Workflow

### 1. Initial Setup (One-Time)

```bash
# Clone repository
git clone https://github.com/ModernaCyber/Universal-Request-Analyzer.git
cd Universal-Request-Analyzer

# Install dependencies
npm install
```

### 2. Development Cycle

```bash
# Step 1: Make code changes in src/

# Step 2: Run tests (validates logic)
npm test

# Step 3: If tests pass, build for browser
npm run dev

# Step 4: Load extension in browser
# Chrome: chrome://extensions/ → Load unpacked → select dist/
# Firefox: about:debugging → Load Temporary Add-on → select dist/

# Step 5: Test in browser, iterate as needed
```

### 3. Pre-Commit Checklist

```bash
# Check linting
npm run lint

# Run all tests
npm test

# Generate coverage report (optional)
npm run test:coverage

# If all pass, commit your changes
git add .
git commit -m "feat: your changes"
```

### 4. Pre-Release Checklist

```bash
# Clean previous builds
npm run clean

# Run full test suite with coverage
npm run test:coverage

# Check coverage meets thresholds (70%)
# Open coverage/lcov-report/index.html

# Run production build
npm run build

# Verify build output in dist/
ls -la dist/

# Load in browser and test manually
# Test all major features

# If everything works, create release
git tag -a v1.x.x -m "Release v1.x.x"
```

## Testing Deep Dive

### Test Structure

```
test/                           # New comprehensive suite (250 tests)
├── unit/                      # 180+ unit tests
│   ├── background/
│   │   ├── requestCapture.test.js      # 25 tests
│   │   ├── messageHandler.test.js      # 45 tests
│   │   └── exportImport.test.js        # 50 tests
│   ├── utils/
│   │   ├── url-utils.test.js           # 20 tests
│   │   ├── id-generator.test.js        # 15 tests
│   │   └── helpers.test.js             # 25 tests
│   ├── storage/
│   │   └── dbAdapter.test.js           # 15 tests
│   ├── ui/
│   │   └── dashboard.test.js           # 35 tests
│   └── content/
│       └── contentScript.test.js       # 25 tests
├── integration/               # 64+ integration tests
│   └── background/
│       ├── captureToAnalytics.integration.test.js  # 30 tests
│       ├── settings.integration.test.js            # 20 tests
│       └── exportImport.integration.test.js        # 35 tests
├── mocks/                     # Test infrastructure
│   ├── handlers.js            # MSW network mocks
│   ├── server.js              # MSW server setup
│   ├── chromeMock.js          # Chrome API mocks
│   ├── styleMock.js           # CSS import stubs
│   └── fileMock.js            # Asset import stubs
├── utils/
│   └── testHelpers.js         # Compositional helpers
└── setupTests.js              # Global test setup

src/tests/                     # Legacy tests (being migrated)
```

### Test Execution Flow

```
npm test
  ↓
Jest loads jest.config.js
  ↓
Runs setupTests.js (global setup)
  ├── Starts MSW server
  ├── Sets up Chrome API mocks
  └── Configures global polyfills
  ↓
Discovers test files (*.test.js)
  ↓
For each test file:
  ├── Transpiles with Babel (in-memory)
  ├── Runs beforeEach hooks
  ├── Executes test
  ├── Runs afterEach hooks
  └── Cleans up mocks
  ↓
Generates coverage report
  ↓
Displays results
```

### Running Specific Tests

```bash
# Run single test file
npm test -- test/unit/utils/url-utils.test.js

# Run tests matching pattern
npm test -- --testNamePattern="Request Capture"

# Run tests in specific directory
npm test -- test/unit/background/

# Run only changed tests (with git)
npm test -- --onlyChanged

# Update snapshots (if using)
npm test -- --updateSnapshot
```

### Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Show console.log statements
npm test -- --silent=false

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand

# Then open chrome://inspect in Chrome
# Click "inspect" on the Node process
```

## Build Process Deep Dive

### Build Types

#### Development Build (`npm run dev`)

**Command:** `webpack --mode development --watch`

**Characteristics:**
- Source maps included
- No minification
- Faster builds
- Watch mode (auto-rebuild)
- Larger file sizes

**When to use:**
- During active development
- When you need to debug in browser
- When testing UI/UX changes

**Output:**
```
dist/
├── background.js           # ~200KB (unminified)
├── popup.js               # ~150KB (unminified)
├── options.js             # ~500KB (unminified)
├── *.js.map              # Source maps
└── ...
```

#### Production Build (`npm run build`)

**Command:** `webpack --mode production`

**Characteristics:**
- Minified and optimized
- No source maps
- Tree shaking (removes unused code)
- Slower builds
- Smaller file sizes
- Creates ZIP file for distribution

**When to use:**
- Before releasing to store
- When testing final performance
- For distribution

**Output:**
```
dist/
├── background.js           # ~100KB (minified)
├── popup.js               # ~80KB (minified)
├── options.js             # ~250KB (minified)
└── ...

release/
└── ura.zip                # Complete extension package
```

### Build Configuration

Build is configured via webpack config files:

```
webpack.config.js         # Main config (used by npm run build/dev)
webpack.common.js         # Shared config
webpack.dev.js           # Development-specific config
webpack.prod.js          # Production-specific config
webpack.extension.js     # Extension-specific settings
babel.config.js          # Babel transpilation config
```

### What Gets Built

**Entry Points:**
```javascript
{
  popup: './src/popup/js/popup.js',
  options: './src/options/js/options.js',
  background: './src/background/background.js',
  content: './src/content/content.js',
  devtools: './src/devtools/js/devtools.js',
  panel: './src/devtools/js/panel.js',
}
```

**Assets Copied:**
- `manifest.json`
- Icons (`src/assets/icons/`)
- FontAwesome (`src/assets/fontawesome/`)
- WASM files (`src/assets/wasm/`)
- Libraries (`src/lib/`)
- CSS files

**Transformations:**
- JavaScript: Babel transpilation (ES6+ → ES5)
- CSS: Extraction and minification
- Images: Optimization and copying
- Fonts: Copying to output

### Build Output Structure

```
dist/
├── manifest.json              # Extension manifest
├── background.js              # Service worker
├── popup.html                 # Popup HTML
├── popup.js                   # Popup script
├── options.html               # Options/dashboard HTML
├── options.js                 # Options script
├── devtools.html              # DevTools panel HTML
├── devtools.js                # DevTools entry
├── panel.js                   # DevTools panel script
├── content.js                 # Content script
├── styles.css                 # Extracted CSS
├── assets/                    # Static assets
│   ├── icons/                # Extension icons
│   ├── fontawesome/          # Font Awesome
│   └── wasm/                 # SQL.js WASM files
├── lib/                       # Shared libraries
│   ├── chart.min.js          # Chart.js
│   └── sql-wasm.wasm         # SQLite WASM
└── css/                       # Component styles
```

## Common Workflows

### Workflow 1: Bug Fix

```bash
# 1. Identify the bug location in source code
# 2. Write a failing test
npm test -- path/to/test.js

# 3. Fix the code
# 4. Verify test passes
npm test -- path/to/test.js

# 5. Run full test suite
npm test

# 6. Build and test in browser
npm run dev
# Load in browser, verify fix

# 7. Commit
git commit -m "fix: resolve issue with X"
```

### Workflow 2: New Feature

```bash
# 1. Write tests for new feature
npm run test:watch  # Keep running

# 2. Implement feature (tests will auto-run)
# 3. When all tests pass, build
npm run dev

# 4. Test in browser
# 5. Write integration tests if needed
# 6. Generate coverage report
npm run test:coverage

# 7. Commit
git commit -m "feat: add new feature X"
```

### Workflow 3: Refactoring

```bash
# 1. Ensure all tests pass first
npm test

# 2. Refactor code
# 3. Run tests continuously
npm run test:watch

# 4. Ensure no tests broke
# 5. Build and verify
npm run build

# 6. Commit
git commit -m "refactor: improve code structure"
```

### Workflow 4: Performance Optimization

```bash
# 1. Measure current performance
npm run build
# Check bundle sizes in dist/

# 2. Make optimizations
# 3. Rebuild
npm run build

# 4. Compare bundle sizes
ls -lh dist/*.js

# 5. Run tests to ensure no breakage
npm test

# 6. Test in browser for actual performance
# 7. Commit
git commit -m "perf: reduce bundle size"
```

## Troubleshooting

### Tests Failing After Code Changes

```bash
# 1. Check which tests failed
npm test

# 2. Run only failing tests
npm test -- --onlyFailures

# 3. Debug specific test
npm test -- --testNamePattern="test name"

# 4. Check if mocks need updating
# Review test/mocks/ for outdated mocks
```

### Build Failures

```bash
# 1. Clean and rebuild
npm run clean
npm install
npm run build

# 2. Check Node.js version
node --version  # Should be v14+

# 3. Clear npm cache
npm cache clean --force

# 4. Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Extension Not Loading

```bash
# 1. Check manifest.json in dist/
cat dist/manifest.json

# 2. Verify all files present
ls -la dist/

# 3. Check browser console
# Open chrome://extensions/
# Click "Errors" on extension card

# 4. Rebuild with clean slate
npm run clean
npm run build
```

### Coverage Too Low

```bash
# 1. Generate HTML report
npm run test:coverage

# 2. Open detailed view
open coverage/lcov-report/index.html

# 3. Identify uncovered files/lines
# Click on files to see coverage visualization

# 4. Write tests for uncovered code
# 5. Re-run coverage
npm run test:coverage
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test and Build

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '14'
      - run: npm install
      - run: npm run lint
      - run: npm test
      - run: npm run build
```

### Pre-Commit Hooks (Husky)

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run lint && npm test",
      "pre-push": "npm test && npm run build"
    }
  }
}
```

## Performance Tips

### Testing Performance

```bash
# Run tests in band (single process)
npm test -- --runInBand

# Disable coverage for faster runs
npm test -- --coverage=false

# Run only changed tests
npm test -- --onlyChanged
```

### Build Performance

```bash
# Use development mode during development
npm run dev  # Faster than production

# Clean between builds if issues occur
npm run clean && npm run build

# Watch mode for instant rebuilds
npm run dev  # Already in watch mode
```

## Manifest V3 Specific Testing

Our extension uses Chrome Manifest V3 with service workers. For MV3-specific testing strategies (service worker lifecycle, state persistence, E2E testing), see:

**📘 [MV3 Testing Guide](./MV3_TESTING_GUIDE.md)**

Key MV3 considerations:
- Service workers terminate after ~30s inactivity
- Use `chrome.storage` instead of global variables
- E2E tests require Playwright/Puppeteer with extension loaded
- Manual testing via `chrome://extensions/` service worker console

## Additional Resources

- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **Webpack Guide**: https://webpack.js.org/guides/
- **MSW Documentation**: https://mswjs.io/docs/
- **Babel Configuration**: https://babeljs.io/docs/en/configuration
- **Chrome Extension Testing**: https://developer.chrome.com/docs/extensions/mv3/tut_testing/
- **MV3 Service Workers**: https://developer.chrome.com/docs/extensions/mv3/service_workers/
- **Playwright for Extensions**: https://playwright.dev/

## Quick Troubleshooting Commands

```bash
# Reset everything
rm -rf node_modules dist coverage
npm install
npm test
npm run build

# Check versions
node --version
npm --version
npx webpack --version
npx jest --version

# Verify dependencies
npm list webpack
npm list jest
npm list @babel/core

# Check for outdated packages
npm outdated
```

---

**Remember:** Tests validate logic, builds create the extension. They are independent processes!
