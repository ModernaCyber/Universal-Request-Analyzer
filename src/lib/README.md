# Library Structure - Universal Request Analyzer

**Architecture Version 2.0** - Post Separation of Concerns Fix (December 2025)

This directory contains shared code organized by execution context to prevent service worker crashes.

## Directory Organization

### `/shared/` - Pure, Context-Independent Code ✨
Code that works in ANY JavaScript environment (service worker, browser, Node.js)
- **No dependencies on:** `window`, `document`, `localStorage`, `chrome.*`
- **Examples:** Constants, pure utilities, type definitions

### `/ui/` - Browser UI Code (DOM Required) ⚠️
Code requiring browser DOM environment - **CANNOT be imported in service workers**
- **Requires:** `window`, `document`, DOM APIs  
- **Files:** `theme-manager.js`, `BaseComponent.js`, `ChartManager.js`, `NotificationManager.js`

### `/background/` - Service Worker Utilities ✨
Code for service worker/background contexts - **NO DOM access**
- **Cannot use:** `window`, `document`, `localStorage`
- **Examples:** Database utilities, worker-specific helpers

### `/utils/` - Context-Aware Utilities
Utilities that detect and adapt to execution context
- **Files:** `context-detector.js`, `helpers.js`

### `/shared-components/` - Shared Components
Components used across contexts
- `settings-manager-core.js` - Background-safe ✅
- `settings-ui-coordinator.js` - UI wrapper ⚠️
- `settings-manager.js` - **DEPRECATED** ❌

## Import Rules

### ✅ Safe for Background/Service Worker
```javascript
import settingsManager from '../lib/shared-components/settings-manager-core.js';
import { hasDOM } from '../lib/utils/context-detector.js';
import featureFlags from '../config/feature-flags.js';
import aclManager from '../auth/acl-manager.js';
```

### ⚠️ UI Only - Will Crash in Service Worker
```javascript
import themeManager from '../lib/ui/theme-manager.js';
import settingsManager from '../lib/shared-components/settings-ui-coordinator.js';
import settingsManager from '../lib/shared-components/settings-manager.js'; // DEPRECATED
```

## Architecture Changes (Phase 1 Complete)

**Problem:** Service worker crashed when importing UI dependencies

**Solution:**
1. ✅ Split settings-manager → core (background) + coordinator (UI)
2. ✅ Created context-detector utility
3. ✅ Moved theme-manager to `/ui/`
4. ✅ Removed ALL localStorage fallbacks
5. ✅ Refactored feature-flags and acl-manager

**Result:** Clean separation, no service worker crashes

---
**Last Updated:** December 27, 2025
