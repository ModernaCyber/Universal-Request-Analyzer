# Universal Request Analyzer - Copilot Architecture Guide

## Table of Contents

1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Core Architecture](#core-architecture)
4. [Configuration System](#configuration-system)
5. [Database Architecture](#database-architecture)
6. [Browser Compatibility](#browser-compatibility)
7. [Communication Flow](#communication-flow)
8. [Theming System](#theming-system)
9. [Development Guidelines](#development-guidelines)

---

## Overview

Universal Request Analyzer is a cross-browser extension built with Manifest V3 that captures, analyzes, and visualizes HTTP requests using a medallion architecture (Bronze/Silver/Gold data layers).

### Key Features

- **Cross-browser support**: Chrome, Firefox, Edge (Chromium-based)
- **Medallion architecture**: Bronze (raw) → Silver (cleaned) → Gold (analytics)
- **SQL.js database**: Client-side SQLite with OPFS persistence
- **Star schema**: Optimized for analytical queries
- **Configuration management**: Dual storage (database + chrome.storage)
- **Theming**: Dynamic theme system with CSS variables

---

## Project Structure

```
Universal-Request-Analyzer/
├── src/
│   ├── background/               # Service worker (background scripts)
│   │   ├── api/                  # Backend API integration
│   │   │   ├── api-manager.js    # Central API coordinator
│   │   │   ├── api-service.js    # HTTP client wrapper
│   │   │   └── backend-api-service.js  # Backend sync service
│   │   ├── auth/                 # Authentication & authorization
│   │   │   ├── auth-manager.js   # Auth state management
│   │   │   ├── local-auth-manager.js  # Local auth
│   │   │   └── remote-auth-service.js # Remote auth
│   │   ├── capture/              # Request capture system
│   │   │   ├── request-capture.js      # Core capture logic
│   │   │   └── request-capture-integration.js  # webRequest API integration
│   │   ├── cleanup/              # Data cleanup & maintenance
│   │   │   └── cleanup-manager.js
│   │   ├── compat/               # **BROWSER COMPATIBILITY LAYER**
│   │   │   └── browser-compat.js # Cross-browser API abstraction
│   │   ├── config/               # Configuration management
│   │   │   └── config-manager.js # Settings & preferences
│   │   ├── database/             # **DATABASE LAYER**
│   │   │   ├── db-manager.js     # Legacy database manager
│   │   │   ├── db-manager-medallion.js  # Medallion DB manager
│   │   │   ├── medallion-manager.js     # Bronze/Silver/Gold ops
│   │   │   ├── medallion-schema.js      # Medallion table schemas
│   │   │   ├── config-schema-manager.js # Config table ops
│   │   │   ├── analytics-processor.js   # Data analytics
│   │   │   ├── star-schema.js    # Star schema (fact/dimension tables)
│   │   │   ├── schema.js         # Legacy schema
│   │   │   ├── migrations.js     # Database migrations
│   │   │   ├── purge-manager.js  # Data purging
│   │   │   └── sql-js-loader.js  # SQL.js initialization
│   │   ├── errors/               # Error handling
│   │   │   ├── error-manager.js
│   │   │   └── error-types.js
│   │   ├── export/               # Data export
│   │   │   └── export-manager.js
│   │   ├── messaging/            # **COMMUNICATION LAYER**
│   │   │   ├── event-bus.js      # Pub/sub event system
│   │   │   ├── message-handler.js        # Central message router
│   │   │   └── popup-message-handler.js  # Popup-specific handlers
│   │   ├── monitoring/           # Error monitoring
│   │   │   └── error-monitor.js
│   │   ├── notifications/        # Browser notifications
│   │   │   └── notification-manager.js
│   │   ├── security/             # Security & encryption
│   │   │   ├── auth-security.js
│   │   │   └── encryption-manager.js
│   │   ├── storage/              # Storage management
│   │   │   └── (storage utilities)
│   │   ├── sync/                 # Backend synchronization
│   │   │   └── data-sync-manager.js
│   │   ├── utils/                # Utility functions
│   │   ├── background.js         # Legacy background script
│   │   └── background-medallion.js  # **MAIN SERVICE WORKER**
│   │
│   ├── content/                  # Content scripts
│   │   └── content.js            # Injected into web pages
│   │
│   ├── devtools/                 # DevTools panel
│   │   ├── devtools.html         # DevTools entry point
│   │   ├── css/                  # Panel styles
│   │   └── js/
│   │       └── panel.js          # Main panel logic
│   │
│   ├── popup/                    # Extension popup
│   │   ├── popup.html
│   │   ├── popup.js
│   │   ├── css/
│   │   └── js/
│   │       └── (popup modules)
│   │
│   ├── options/                  # Options/settings page
│   │   ├── options.html
│   │   ├── css/
│   │   └── js/
│   │       └── options.js        # Settings UI logic
│   │
│   ├── lib/                      # **SHARED LIBRARIES**
│   │   ├── chart.min.js          # Chart.js for visualizations
│   │   ├── sql-wasm.js           # SQL.js WebAssembly
│   │   ├── core/                 # Core utilities
│   │   ├── managers/             # Shared managers
│   │   ├── shared-components/    # **SHARED COMPONENTS**
│   │   │   └── settings-manager.js  # Central settings management
│   │   ├── ui/                   # UI components
│   │   └── utils/                # Shared utilities
│   │
│   ├── config/                   # **CONFIGURATION**
│   │   ├── feature-flags.js      # Feature toggles
│   │   └── theme-manager.js      # Theme system
│   │
│   ├── auth/                     # Auth utilities
│   │   └── acl-manager.js        # Access control
│   │
│   ├── assets/                   # Static assets
│   │   ├── icons/                # Extension icons
│   │   ├── fontawesome/          # Font Awesome
│   │   └── wasm/                 # WebAssembly files
│   │
│   ├── manifest.json             # Extension manifest (MV3)
│   ├── styles.css                # Global styles
│   └── help.html                 # Help documentation
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md
│   ├── BACKEND_INTEGRATION.md
│   ├── CLEAN_ARCHITECTURE_REFACTORING.md
│   ├── IMPLEMENTATION_PROGRESS.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── STAR_SCHEMA_ANALYTICS.md
│   └── UI_IMPLEMENTATION.md
│
├── release/                      # Build output
├── webpack.*.js                  # Webpack configs
├── babel.config.js               # Babel config
├── jest.config.js                # Jest test config
└── package.json                  # Dependencies & scripts
```

---

## Core Architecture

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI LAYER                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Popup   │  │ DevTools │  │ Options  │  │ Content  │       │
│  │   UI     │  │  Panel   │  │   Page   │  │  Script  │       │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘       │
└───────┼────────────┼─────────────┼─────────────┼───────────────┘
        │            │             │             │
        └────────────┴─────────────┴─────────────┘
                     │
        ┌────────────▼────────────────────────────────────────────┐
        │           COMMUNICATION LAYER                            │
        │  ┌─────────────────┐      ┌──────────────────┐         │
        │  │  Message Bus    │◄────►│   Event Bus      │         │
        │  │  (chrome.runtime)│     │   (Pub/Sub)      │         │
        │  └─────────────────┘      └──────────────────┘         │
        └────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────▼────────────────────────────────────────┐
        │              SERVICE WORKER                              │
        │  (background-medallion.js)                               │
        │                                                           │
        │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
        │  │   Capture    │  │  Settings    │  │    Sync      │ │
        │  │  Integration │  │   Manager    │  │   Manager    │ │
        │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
        │         │                  │                  │         │
        │  ┌──────▼──────────────────▼──────────────────▼──────┐ │
        │  │           Database Manager (Medallion)             │ │
        │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │ │
        │  │  │  Medallion │  │   Config   │  │   Star     │  │ │
        │  │  │  Manager   │  │   Schema   │  │   Schema   │  │ │
        │  │  └────────────┘  └────────────┘  └────────────┘  │ │
        │  └───────────────────────────────────────────────────┘ │
        └────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────▼────────────────────────────────────────┐
        │                  DATA LAYER                              │
        │                                                           │
        │  ┌─────────────────────────────────────────────────┐   │
        │  │         SQL.js Database (OPFS)                  │   │
        │  │                                                  │   │
        │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
        │  │  │  Bronze  │→ │  Silver  │→ │   Gold   │     │   │
        │  │  │  (Raw)   │  │(Cleaned) │  │(Analytics)│     │   │
        │  │  └──────────┘  └──────────┘  └──────────┘     │   │
        │  │                                                  │   │
        │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐     │   │
        │  │  │  Config  │  │   Star   │  │ Dimension│     │   │
        │  │  │  Tables  │  │   Fact   │  │  Tables  │     │   │
        │  │  └──────────┘  └──────────┘  └──────────┘     │   │
        │  └─────────────────────────────────────────────────┘   │
        │                                                           │
        │  ┌─────────────────────────────────────────────────┐   │
        │  │      Chrome Storage (Fast Access Cache)         │   │
        │  │  - chrome.storage.local (settings sync)         │   │
        │  │  - Accessible by content scripts                │   │
        │  └─────────────────────────────────────────────────┘   │
        └───────────────────────────────────────────────────────────┘
```

### Medallion Architecture

**Bronze Layer (Raw Event Capture Data)**:

- `bronze_requests`: Raw HTTP request captures
- `bronze_request_headers`: Request/response headers
- `bronze_request_timings`: Performance timing data
- `bronze_runner_executions`: Runner execution logs
- `bronze_runner_execution_results`: Individual request results
- Immutable, append-only captures

**Silver Layer (Cleaned & Enriched)**:

- `silver_requests`: Validated and normalized requests
- `silver_api_calls`: Identified API calls
- `silver_page_loads`: Page navigation events
- Data quality checks, deduplication

**Gold Layer (Analytics-Ready Aggregates)**:

- `gold_domain_stats`: Per-domain aggregations
- `gold_endpoint_performance`: API endpoint metrics
- `gold_daily_summary`: Daily rollups
- Pre-computed aggregations for dashboards

**Config Schema (Application Settings)**:

- `config_app_settings`: Key-value settings
- `config_feature_flags`: Feature toggles
- `config_user_preferences`: User customizations
- `config_performance`: Performance settings
- `config_storage`: Storage limits
- `config_export`: Export defaults

**Star Schema (Analytics Warehouse)**:

- **Fact Tables**: `fact_requests`, `fact_api_calls`
- **Dimension Tables**: `dim_domain`, `dim_endpoint`, `dim_status`, `dim_method`, `dim_resource_type`, `dim_time`

---

## Configuration System

### Configuration Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                        OPTIONS PAGE                                │
│  User changes settings → settingsManager.updateSettings()          │
└────────────────────────┬──────────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────────────────────┐
│                   SETTINGS-MANAGER.JS                              │
│  (src/lib/shared-components/settings-manager.js)                   │
│                                                                     │
│  1. Merges new settings with current settings                      │
│  2. saveToStorage() → chrome.storage.local (fast access)           │
│  3. saveToDatabase() → config tables (source of truth)             │
│  4. broadcasts update via chrome.runtime.sendMessage()             │
│  5. notifies all registered listeners                              │
└────────────────────────┬──────────────────────────────────────────┘
                         │
           ┌─────────────┴──────────────┐
           ▼                            ▼
┌──────────────────────┐     ┌──────────────────────────────┐
│  CHROME.STORAGE      │     │    DATABASE CONFIG TABLES    │
│    .LOCAL            │     │                              │
│                      │     │  config_app_settings         │
│  {                   │     │  config_feature_flags        │
│    settings: {       │     │  config_user_preferences     │
│      settings: {...},│     │  config_performance          │
│      timestamp: ...  │     │  config_storage              │
│    }                 │     │  config_export               │
│  }                   │     │                              │
│                      │     │  Managed by:                 │
│  ✓ Fast access       │     │  configSchemaManager         │
│  ✓ Content script OK │     │  ✓ Source of truth           │
│  ✓ Auto-synced       │     │  ✓ Queryable history         │
│                      │     │  ✓ Backend sync ready        │
└──────────┬───────────┘     └──────────────────────────────┘
           │
           ▼
┌───────────────────────────────────────────────────────────────────┐
│                    CONTENT SCRIPT                                  │
│  (src/content/content.js)                                          │
│                                                                     │
│  1. Loads settings from browserAPI.storage.local['settings']       │
│  2. Checks capture.captureFilters.includeDomains                   │
│  3. Checks capture.captureFilters.excludeDomains                   │
│  4. Determines if current domain should be monitored               │
│  5. Listens for storage.onChanged to reload on updates             │
└───────────────────────────────────────────────────────────────────┘
```

### Configuration Categories

**1. Capture Settings** (`settings.capture`):

```javascript
{
  enabled: true,                    // Master toggle
  captureFilters: {
    includeDomains: [                // Monitor these domains
      'github.com',
      'api.github.com',
      '*.example.com'
    ],
    excludeDomains: [                // Exclude these
      'chrome://*',
      'edge://*',
      'about:*',
      'chrome-extension://*',
      'moz-extension://*'
    ],
    includeTypes: [                  // Resource types to capture
      'xmlhttprequest',
      'fetch',
      'script',
      'stylesheet',
      'image',
      'font',
      'other'
    ]
  }
}
```

**2. General Settings** (`settings.general`):

```javascript
{
  maxStoredRequests: 10000,         // Storage limit
  autoExport: false,                 // Auto-export toggle
  defaultExportFormat: 'json',       // json|csv|har|sqlite
  autoExportInterval: 3600000,       // 1 hour in ms
  exportPath: '',                    // Export directory
  showNotifications: true,           // Browser notifications
  confirmClearRequests: true         // Confirmation dialogs
}
```

**3. Display Settings** (`settings.display`):

```javascript
{
  requestsPerPage: 50,               // Pagination
  showCharts: true,                  // Enable visualizations
  enabledCharts: [                   // Active chart types for dashboard
    'requestsChart',                 // Request Volume chart (line)
    'statusChart',                   // Status Distribution (pie)
    'performanceChart'               // Performance Trends (area)
  ],
  defaultTab: 'requests',            // Default view
  showTimingBars: true,              // Waterfall view
  expandedDetails: false             // Auto-expand details
}
```

**Note**: The `enabledCharts` array controls which charts are visible in the dashboard Overview tab. The "Top Domains/Resources" chart is always visible and not configurable.

**4. Advanced Settings** (`settings.advanced`):

```javascript
{
  enableDebugMode: false,            // Debug logging
  persistFilters: true,              // Remember filters
  useCompression: true,              // Data compression
  backgroundMode: 'persistent',      // Service worker mode
  syncInterval: 60                   // Backend sync (seconds)
}
```

### Database Config Tables

**config_app_settings**:

```sql
CREATE TABLE config_app_settings (
  key TEXT PRIMARY KEY,              -- e.g., 'capture.enabled'
  value TEXT NOT NULL,               -- Serialized value
  data_type TEXT NOT NULL,           -- 'string'|'number'|'boolean'|'json'
  category TEXT NOT NULL,            -- 'capture'|'general'|'display'|'advanced'
  description TEXT,
  is_encrypted BOOLEAN DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

**config_feature_flags**:

```sql
CREATE TABLE config_feature_flags (
  feature_key TEXT PRIMARY KEY,      -- Feature identifier
  enabled BOOLEAN NOT NULL DEFAULT 0,
  rollout_percentage INTEGER DEFAULT 100,
  target_users TEXT,                 -- JSON array
  conditions TEXT,                   -- JSON object
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## Database Architecture

### Database Initialization Flow

```
┌────────────────────────────────────────────────────────────────┐
│  1. background-medallion.js starts                              │
│     MedallionExtensionInitializer.initialize()                  │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  2. initDatabase() from db-manager-medallion.js                 │
│     - Loads SQL.js WebAssembly                                  │
│     - Creates/loads OPFS database file                          │
│     - Runs createMedallionSchema()                              │
│     - Executes migrations (migrations.js)                       │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  3. createMedallionSchema() creates:                            │
│     - Config Schema (config_*)                                  │
│     - Bronze Schema (bronze_*)                                  │
│     - Silver Schema (silver_*)                                  │
│     - Gold Schema (gold_*)                                      │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  4. createStarSchema() creates:                                 │
│     - Fact tables (fact_requests, fact_api_calls)               │
│     - Dimension tables (dim_domain, dim_endpoint, etc.)         │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  5. Managers initialized:                                       │
│     - medallionManager (Bronze/Silver/Gold operations)          │
│     - configSchemaManager (Config CRUD)                         │
│     - analyticsProcessor (Gold layer aggregations)              │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  6. settingsManager.setDatabaseManager(configSchemaManager)     │
│     - Injects config DB manager                                 │
│     - Enables DB ↔ Storage sync                                 │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  7. Database ready! Returns dbManager API:                      │
│     - executeQuery(query, params)                               │
│     - medallion.insertBronzeRequest(requestData)                │
│     - config.getAppSetting(key)                                 │
│     - config.setAppSetting(key, value, options)                 │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow: Request Capture to Analytics

```
┌────────────────────────────────────────────────────────────────┐
│  1. User visits github.com/user/repo                            │
│     Browser makes API request to api.github.com/user/repos      │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  2. chrome.webRequest.onBeforeRequest fires                     │
│     request-capture-integration.js::handleRequestStart()        │
│     - Extracts: url, method, type, tab info                     │
│     - Gets page URL via chrome.tabs.get(tabId)                  │
│     - Extracts domain from PAGE URL (not request URL)           │
│     - domain = 'github.com' (page's domain)                     │
│     - page_url = 'https://github.com/user/repo'                 │
│     - url = 'https://api.github.com/user/repos'                 │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  3. chrome.webRequest.onCompleted fires                         │
│     request-capture-integration.js::handleRequestComplete()     │
│     - Merges start + complete data                              │
│     - Calls medallionManager.insertBronzeRequest()              │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  4. BRONZE LAYER                                                │
│     medallion-manager.js::insertBronzeRequest()                 │
│     INSERT INTO bronze_requests (                               │
│       id, url, method, domain, page_url, status, duration, ...  │
│     ) VALUES (                                                  │
│       'req_123',                                                │
│       'https://api.github.com/user/repos',  # Actual request    │
│       'GET',                                                    │
│       'github.com',                          # Page's domain    │
│       'https://github.com/user/repo',        # Page URL         │
│       200,                                                      │
│       234,                                                      │
│       ...                                                       │
│     )                                                           │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  5. SILVER LAYER (Batch Processing)                            │
│     analyticsProcessor.processBronzeToSilver()                  │
│     - Validates data quality                                    │
│     - Deduplicates entries                                      │
│     - Enriches with geolocation, user-agent parsing             │
│     - Classifies API vs non-API requests                        │
│     INSERT INTO silver_requests / silver_api_calls              │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  6. GOLD LAYER (Aggregations)                                  │
│     analyticsProcessor.processSilverToGold()                    │
│     - Aggregates per domain: github.com                         │
│       * Total requests                                          │
│       * Avg response time                                       │
│       * Success rate                                            │
│       * P95 latency                                             │
│     - Aggregates per endpoint: /user/repos                      │
│       * Call count                                              │
│       * Avg/min/max duration                                    │
│       * Error rate                                              │
│     INSERT/UPDATE gold_domain_stats, gold_endpoint_performance  │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  7. STAR SCHEMA (Analytics Warehouse)                          │
│     - Populates fact_requests with foreign keys                │
│     - Updates dimension tables (dim_domain, dim_endpoint)       │
│     - Enables fast OLAP queries for dashboards                  │
└────────────────────────────────────────────────────────────────┘
```

### Querying the Hierarchy

**Example: Get all requests for a domain**

```sql
-- Filter by domain (page's domain, not request domain)
SELECT url, method, status, duration, page_url
FROM bronze_requests
WHERE domain = 'github.com'  -- Page domain
ORDER BY timestamp DESC;

-- Result: All requests made while on github.com pages
-- Including: api.github.com/*, avatars.githubusercontent.com/*, etc.
```

**Example: Get pages under a domain**

```sql
SELECT DISTINCT page_url, COUNT(*) as request_count
FROM bronze_requests
WHERE domain = 'github.com'
GROUP BY page_url;

-- Result:
-- github.com/user/repo1 | 45 requests
-- github.com/user/repo2 | 32 requests
```

**Example: Get endpoint performance**

```sql
SELECT
  endpoint_pattern,
  call_count,
  avg_duration_ms,
  p95_duration_ms,
  error_rate_percent
FROM gold_endpoint_performance
WHERE domain = 'github.com'
ORDER BY call_count DESC;
```

---

## Browser Compatibility

### Browser Compatibility Layer

**File**: `src/background/compat/browser-compat.js`

All direct `chrome.*` API calls MUST go through this compatibility layer to support Firefox, Edge, and other browsers.

### Cross-Browser API Wrapper

```javascript
// WRONG ❌ - Direct chrome API
chrome.storage.local.get('key', (data) => { ... });

// CORRECT ✅ - Using browser-compat
import { storage } from './compat/browser-compat.js';
const data = await storage.get('key');
```

### Supported APIs

**1. Storage API**

```javascript
import { storage } from "./compat/browser-compat.js";

// Get from storage
const data = await storage.get("key");
const multiple = await storage.get(["key1", "key2"]);

// Set to storage
await storage.set({ key: "value" });

// Remove from storage
await storage.remove("key");
await storage.remove(["key1", "key2"]);

// Clear all storage
await storage.clear();

// Listen for changes
storage.onChanged.addListener((changes) => {
  console.log("Storage changed:", changes);
});
```

**2. Runtime API**

```javascript
import { runtime } from "./compat/browser-compat.js";

// Send message
const response = await runtime.sendMessage({ action: "getData" });

// Connect port
const port = runtime.connect({ name: "my-port" });

// Listen for messages
runtime.onMessage.addListener((message, sender) => {
  console.log("Received:", message);
  return { success: true }; // Response
});

// Get extension URL
const url = runtime.getURL("popup.html");
```

**3. WebRequest API**

```javascript
import { webRequest } from "./compat/browser-compat.js";

// Listen for requests
webRequest.onBeforeRequest.addListener(
  (details) => {
    console.log("Request:", details.url);
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

webRequest.onCompleted.addListener(
  (details) => {
    console.log("Completed:", details.url);
  },
  { urls: ["<all_urls>"] }
);
```

**4. Tabs API**

```javascript
import { tabs } from "./compat/browser-compat.js";

// Get tab
const tab = await tabs.get(tabId);

// Query tabs
const allTabs = await tabs.query({});

// Send message to tab
await tabs.sendMessage(tabId, { action: "refresh" });
```

### Global Browser API Pattern

For files that can't import (like content scripts or standalone modules):

```javascript
// Cross-browser API support
const browserAPI = globalThis.browser || globalThis.chrome;

// Then use browserAPI instead of chrome
browserAPI.storage.local.get("settings", (data) => {
  console.log("Settings:", data);
});
```

### Browser Detection

```javascript
import { browserInfo } from "./compat/browser-compat.js";

if (browserInfo.isFirefox) {
  // Firefox-specific code
}

if (browserInfo.isChrome) {
  // Chrome-specific code
}

if (browserInfo.isEdge) {
  // Edge-specific code
}
```

### Best Practices

1. **Always use the compat layer** in background scripts
2. **Use globalThis pattern** in content scripts and standalone files
3. **Test in multiple browsers** (Chrome, Firefox, Edge)
4. **Handle API differences** (e.g., Firefox uses Promises, Chrome uses callbacks)
5. **Check browser support** before using newer APIs

---

## Communication Flow

### Message Passing Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    MESSAGE FLOW DIAGRAM                         │
└────────────────────────────────────────────────────────────────┘

UI Components (Popup, DevTools, Options)
    │
    │ chrome.runtime.sendMessage({ action: 'getData', filters: {...} })
    │
    ▼
┌────────────────────────────────────────────────────────────────┐
│  SERVICE WORKER (background-medallion.js)                       │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Message Handler (message-handler.js)                     │ │
│  │  chrome.runtime.onMessage.addListener()                   │ │
│  │                                                            │ │
│  │  Routes to Modular Handlers:                              │ │
│  │  - vitals-handlers.js (recent requests, web vitals)       │ │
│  │  - stats-handlers.js (getFilteredStats, domain queries)   │ │
│  │  - collection-handlers.js (runner collections)            │ │
│  │  - analytics-handlers.js (compression, analytics)         │ │
│  │  - settings-handlers.js (getSettings, updateSettings)     │ │
│  │  - export-handlers.js (HAR, CSV, JSON export)             │ │
│  │  - popup-message-handler.js (legacy handlers)             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Event Bus (event-bus.js)                                 │ │
│  │  Internal pub/sub for service worker components           │ │
│  │                                                            │ │
│  │  eventBus.publish('database:ready', data)                 │ │
│  │  eventBus.subscribe('settings:changed', callback)         │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
    │
    │ sendResponse({ success: true, data: [...] })
    │
    ▼
UI Component receives response
```

### Message Types

**1. Data Query Messages**

```javascript
// Popup/DevTools → Background
chrome.runtime.sendMessage(
  {
    action: "getFilteredStats",
    filters: {
      domain: "github.com",
      pageUrl: "https://github.com/user/repo",
      timeRange: 300, // 5 minutes
      type: "xmlhttprequest",
      statusPrefix: "200",
    },
  },
  (response) => {
    if (response.success) {
      console.log("Stats:", response);
      // response.totalRequests, response.responseTimes, etc.
    }
  }
);
```

**2. Settings Update Messages**

```javascript
// Options Page → Background
chrome.runtime.sendMessage({
  action: 'settingsUpdated',
  settings: {
    capture: { enabled: true, ... },
    general: { maxStoredRequests: 10000, ... }
  }
}, (response) => {
  console.log('Settings saved:', response.success);
});
```

**3. Database Operation Messages**

```javascript
// Any UI → Background
chrome.runtime.sendMessage(
  {
    action: "clearDatabase",
  },
  (response) => {
    console.log("Database cleared:", response.success);
  }
);

chrome.runtime.sendMessage(
  {
    action: "exportFilteredData",
    filters: { domain: "github.com" },
    format: "json",
  },
  (response) => {
    // Triggers download
  }
);
```

**4. Page-specific Queries**

```javascript
// DevTools Panel → Background
chrome.runtime.sendMessage(
  {
    action: "getPagesByDomain",
    domain: "github.com",
    timeRange: 604800, // 7 days
  },
  (response) => {
    // response.pages = [{ pageUrl: '...', requestCount: 45 }, ...]
  }
);
```

### Event Bus (Internal)

**Publishing Events**:

```javascript
import { eventBus } from "./messaging/event-bus.js";

// Publish event
eventBus.publish("database:ready", {
  timestamp: Date.now(),
  dbSize: 1024000,
});

eventBus.publish("request:captured", {
  requestId: "req_123",
  domain: "github.com",
  url: "https://api.github.com/user/repos",
});
```

**Subscribing to Events**:

```javascript
import { eventBus } from "./messaging/event-bus.js";

// Subscribe
const unsubscribe = eventBus.subscribe("database:ready", (data) => {
  console.log("Database ready at:", data.timestamp);
});

// Unsubscribe later
unsubscribe();
```

**Available Events**:

- `extension:ready` - Extension initialized
- `database:ready` - Database loaded
- `database:saved` - Database persisted
- `request:captured` - New request captured
- `config:setting:changed` - Config updated
- `settings:changed` - Settings updated
- `bronze:inserted` - Bronze record added
- `silver:processed` - Silver record processed
- `gold:updated` - Gold aggregate updated

### Storage Change Listeners

**Background → Content Script Sync**:

```javascript
// Content script listens for settings changes
browserAPI.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.settings) {
    console.log("Settings updated, reloading...");
    // Reload configuration
    location.reload();
  }
});
```

---

## Theming System

### Theme Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    THEME SYSTEM                                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  theme-manager.js (src/config/theme-manager.js)                 │
│  - Manages theme state                                          │
│  - Applies CSS variables to document root                       │
│  - Persists theme selection                                     │
│  - Broadcasts theme changes                                     │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  Built-in Themes:                                               │
│  - Light Theme (default)                                        │
│  - Dark Theme                                                   │
│  - High Contrast                                                │
│  - System (follows OS preference)                               │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  CSS Variables Applied to :root                                 │
│                                                                  │
│  :root {                                                        │
│    /* Colors */                                                 │
│    --primary-color: #007bff;                                    │
│    --secondary-color: #6c757d;                                  │
│    --success-color: #28a745;                                    │
│    --error-color: #dc3545;                                      │
│    --warning-color: #ffc107;                                    │
│    --info-color: #17a2b8;                                       │
│                                                                  │
│    /* Backgrounds */                                            │
│    --bg-primary: #ffffff;                                       │
│    --bg-secondary: #f8f9fa;                                     │
│    --card-bg: #ffffff;                                          │
│    --modal-bg: #ffffff;                                         │
│                                                                  │
│    /* Text */                                                   │
│    --text-primary: #212529;                                     │
│    --text-secondary: #6c757d;                                   │
│    --text-muted: #adb5bd;                                       │
│                                                                  │
│    /* Borders & Shadows */                                      │
│    --border-color: #dee2e6;                                     │
│    --shadow-color: rgba(0, 0, 0, 0.1);                          │
│                                                                  │
│    /* Gradients */                                              │
│    --primary-gradient: linear-gradient(135deg, #667eea, #764ba2);│
│  }                                                              │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│  All UI components use CSS variables                            │
│                                                                  │
│  .card {                                                        │
│    background: var(--card-bg);                                  │
│    color: var(--text-primary);                                  │
│    border: 1px solid var(--border-color);                       │
│    box-shadow: 0 2px 4px var(--shadow-color);                   │
│  }                                                              │
│                                                                  │
│  .btn-primary {                                                 │
│    background: var(--primary-color);                            │
│    color: #ffffff;                                              │
│  }                                                              │
└────────────────────────────────────────────────────────────────┘
```

### Using the Theme Manager

**Initialize Theme Manager**:

```javascript
import themeManager from "./config/theme-manager.js";

// Initialize with theme
await themeManager.initialize({
  initialTheme: "light", // 'light'|'dark'|'high-contrast'|'system'
  onUpdate: (themeData) => {
    console.log("Theme changed to:", themeData.theme);
  },
});

// Get current theme
const currentTheme = themeManager.currentTheme;

// Set theme
await themeManager.setTheme("dark");

// Listen for system theme changes (if using 'system' theme)
themeManager.watchSystemTheme();
```

### Theme Definition

**themes.json** structure:

```json
{
  "light": {
    "name": "Light",
    "colors": {
      "primary": "#007bff",
      "secondary": "#6c757d",
      "success": "#28a745",
      "error": "#dc3545",
      "warning": "#ffc107",
      "info": "#17a2b8",
      "bgPrimary": "#ffffff",
      "bgSecondary": "#f8f9fa",
      "textPrimary": "#212529",
      "textSecondary": "#6c757d"
    }
  },
  "dark": {
    "name": "Dark",
    "colors": {
      "primary": "#0d6efd",
      "secondary": "#6c757d",
      "success": "#198754",
      "error": "#dc3545",
      "warning": "#ffc107",
      "info": "#0dcaf0",
      "bgPrimary": "#212529",
      "bgSecondary": "#343a40",
      "textPrimary": "#f8f9fa",
      "textSecondary": "#adb5bd"
    }
  }
}
```

### Styling Guidelines

1. **Always use CSS variables** for colors, backgrounds, borders
2. **Never hardcode colors** in component styles
3. **Test with all themes** before committing changes
4. **Use semantic variable names** (e.g., `--success-color` not `--green`)
5. **Provide fallbacks** for older browsers:
   ```css
   .element {
     color: #007bff; /* Fallback */
     color: var(--primary-color);
   }
   ```

---

## Development Guidelines

### Adding a New Feature

1. **Check feature flags** (`src/config/feature-flags.js`)
2. **Update database schema** if needed (`medallion-schema.js`)
3. **Add migration** if schema changes (`migrations.js`)
4. **Use browser-compat layer** for all browser APIs
5. **Update settings-manager** if adding config options
6. **Add message handlers** for new background operations
7. **Use CSS variables** for all styling
8. **Test in multiple browsers** (Chrome, Firefox, Edge)
9. **Update documentation**

### File Organization Rules

- **background/**: Service worker code only
- **lib/shared-components/**: Reusable across UI contexts
- **compat/**: Browser compatibility abstractions
- **config/**: Configuration, themes, feature flags
- **Never put UI code in background/**
- **Never put background code in UI folders**

### Import Rules

```javascript
// ✅ CORRECT
import { storage } from '../background/compat/browser-compat.js';
import settingsManager from '../lib/shared-components/settings-manager.js';
import themeManager from '../config/theme-manager.js';

// ❌ WRONG - Don't bypass compat layer
import chrome from 'chrome';
chrome.storage.local.get(...);

// ❌ WRONG - Don't import background code in content scripts
import { dbManager } from '../background/database/db-manager.js';
```

### Database Query Guidelines

1. **Use parameterized queries** (SQL.js doesn't support `?` placeholders)
2. **Escape strings manually**:

   ```javascript
   const escapeStr = (val) => {
     if (val === undefined || val === null) return "NULL";
     return `'${String(val).replace(/'/g, "''")}'`;
   };

   const query = `SELECT * FROM requests WHERE domain = ${escapeStr(domain)}`;
   ```

3. **Use medallion manager** for CRUD operations
4. **Query Bronze for real-time**, Gold for analytics
5. **Use indexes** for performance

### Testing Checklist

- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Edge
- [ ] Settings persist across browser restart
- [ ] Database persists across extension reload
- [ ] Content script loads config correctly
- [ ] Light and dark themes display correctly
- [ ] Message passing works (popup ↔ background)
- [ ] No console errors
- [ ] Performance is acceptable (< 100ms for common operations)

### Common Patterns

**Querying Data from UI**:

```javascript
// In popup.js, panel.js, options.js
const response = await chrome.runtime.sendMessage({
  action: "getFilteredStats",
  filters: this.getActiveFilters(),
});

if (response && response.success) {
  this.updateUI(response);
}
```

**Saving Settings**:

```javascript
// In options.js
import settingsManager from "../../lib/shared-components/settings-manager.js";

const newSettings = { capture: { enabled: true } };
const success = await settingsManager.updateSettings(newSettings);
```

**Accessing Config in Content Script**:

```javascript
// In content.js
const browserAPI = globalThis.browser || globalThis.chrome;

browserAPI.storage.local.get(["settings"], (data) => {
  const config = data.settings?.settings || {};
  const captureEnabled = config.capture?.enabled;
  const includeDomains = config.capture?.captureFilters?.includeDomains || [];
});
```

---

## Troubleshooting

### Common Issues

**1. "No domains configured" warning**

- **Cause**: Content script looking in wrong storage location
- **Fix**: Ensure content script reads from `chrome.storage.local['settings']`

**2. Settings not persisting**

- **Cause**: Not calling `settingsManager.updateSettings()`
- **Fix**: Always use settingsManager, not direct storage writes

**3. Database not loading**

- **Cause**: OPFS not initialized or SQL.js failed to load
- **Fix**: Check console for initialization errors, ensure OPFS is supported

**4. Message passing fails**

- **Cause**: Service worker inactive or context invalidated
- **Fix**: Check `chrome.runtime.lastError`, implement retry logic

**5. Theme not applying**

- **Cause**: CSS variables not defined or theme not initialized
- **Fix**: Ensure `themeManager.initialize()` is called early

**6. Cross-browser API errors**

- **Cause**: Using `chrome.*` directly instead of compat layer
- **Fix**: Import and use browser-compat APIs

### Debug Mode

Enable debug mode for verbose logging:

```javascript
// In settings
await settingsManager.updateSettings({
  advanced: { enableDebugMode: true },
});

// Or in console
chrome.storage.local.set({
  settings: {
    settings: {
      advanced: { enableDebugMode: true },
    },
  },
});
```

---

## Additional Resources

- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Extension APIs](https://developer.chrome.com/docs/extensions/reference/)
- [Firefox WebExtensions API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [SQL.js Documentation](https://sql.js.org/)
- [Medallion Architecture](https://www.databricks.com/glossary/medallion-architecture)

---

## JS FILES

Following the folder structure the js folders, eg in options, popup, background, devtools, helps keep code organized by context.Within the folder we can split our js files to further organize by feature or functionality as needed. so that our entry files like popup.js, options.js, background-medallion.js, devtools-panel.js can remain concise and focused on initializing and orchestrating the main components for that context and not be too long, doing min logic but importing the rest from the respective sub files.

## Conclusion

Following the forward-thinking architecture and coding standards outlined in this guide will ensure that the Universal Request Analyzer remains robust, maintainable, and adaptable to future browser changes. Always prioritize user experience, performance, and cross-browser compatibility in all development efforts.

**Last Updated**: December 12, 2025
**Version**: 1.0.0
**Maintainer**: Universal Request Analyzer Team
