# Shared Library

This directory contains shared, reusable code organized by functionality to eliminate code duplication across the extension.

## Directory Structure

```
lib/
├── core/           # Core data management classes
├── ui/             # UI component base classes
├── managers/       # Feature managers (Export, etc.)
├── utils/          # Utility functions
└── index.js        # Main entry point
```

## Core Classes

### DataManager
Base class for data management with caching, CRUD operations.

```javascript
import { DataManager } from '@/lib/core/DataManager.js';

class MyDataManager extends DataManager {
  async fetchFromStorage(id) {
    // Implementation
  }
}
```

### FilterManager
Manage data filtering with multiple filters and priorities.

```javascript
import { FilterManager } from '@/lib/core/DataManager.js';

const filterManager = new FilterManager();
filterManager.registerFilter('active', item => item.active);
const filtered = filterManager.applyFilters(data);
```

### SortManager
Handle data sorting with key paths and order.

```javascript
import { SortManager } from '@/lib/core/DataManager.js';

const sortManager = new SortManager();
sortManager.setSort('timestamp', 'desc');
const sorted = sortManager.applySort(data);
```

### PaginationManager
Manage data pagination with page size and navigation.

```javascript
import { PaginationManager } from '@/lib/core/DataManager.js';

const paginationManager = new PaginationManager(50);
const paginated = paginationManager.applyPagination(data);
```

## UI Components

### BaseComponent
Abstract base class for all UI components with lifecycle management.

```javascript
import { BaseComponent } from '@/lib/ui/BaseComponent.js';

class MyComponent extends BaseComponent {
  async onInit() {
    // Initialization logic
  }
  
  render() {
    // Rendering logic
  }
}
```

### ChartManager
Shared chart management for Chart.js visualizations.

```javascript
import { ChartManager } from '@/lib/ui/ChartManager.js';

const chartManager = new ChartManager('chart-container');
await chartManager.initialize();

chartManager.createChart('myChart', 'line', {
  data: { labels: [...], datasets: [...] }
});
```

### NotificationManager
Centralized notification system for user feedback.

```javascript
import { showSuccess, showError } from '@/lib/ui/NotificationManager.js';

showSuccess('Operation completed successfully!');
showError('An error occurred', { duration: 0 });
```

## Managers

### ExportManager
Handle data export/import in multiple formats (JSON, CSV, HAR).

```javascript
import { ExportManager } from '@/lib/managers/ExportManager.js';

const exportManager = new ExportManager();

// Export
await exportManager.export(data, 'json', 'my-export.json');

// Import
const result = await exportManager.import(file);
```

## Utilities

### Formatting
```javascript
import { formatBytes, formatDuration, formatTimestamp } from '@/lib/utils/helpers.js';

formatBytes(1024);           // "1 KB"
formatDuration(5500);        // "5.50s"
formatTimestamp(Date.now()); // "12/7/2025, 8:45:00 AM"
```

### Array Operations
```javascript
import { groupBy, sortBy, unique } from '@/lib/utils/helpers.js';

const grouped = groupBy(items, 'category');
const sorted = sortBy(items, 'timestamp', 'desc');
const uniqueItems = unique(items, 'id');
```

### Async Utilities
```javascript
import { debounce, throttle, retry, sleep } from '@/lib/utils/helpers.js';

const debouncedFn = debounce(() => console.log('Called'), 300);
const throttledFn = throttle(() => console.log('Called'), 1000);

await retry(asyncFn, { maxAttempts: 3, delay: 1000 });
await sleep(2000);
```

### URL Utilities
```javascript
import { parseUrl, extractDomain, extractPath } from '@/lib/utils/helpers.js';

const url = parseUrl('https://example.com/path?query=1');
const domain = extractDomain('https://example.com/path');
const path = extractPath('https://example.com/path');
```

## Usage Patterns

### Creating a Component

```javascript
import { BaseComponent } from '@/lib';

class RequestList extends BaseComponent {
  constructor(elementId) {
    super(elementId);
    this.requests = [];
  }

  async onInit() {
    // Load data
    this.requests = await this.loadRequests();
    this.render();
  }

  setupEventListeners() {
    this.addEventListener(this.$('.refresh-btn'), 'click', () => {
      this.refresh();
    });
  }

  render() {
    const html = this.requests.map(r => `
      <div class="request-item">${r.url}</div>
    `).join('');
    
    this.element.innerHTML = html;
  }

  async refresh() {
    this.showLoading();
    this.requests = await this.loadRequests();
    this.hideLoading();
    this.render();
  }
}
```

### Managing Data with Filters and Pagination

```javascript
import { FilterManager, SortManager, PaginationManager } from '@/lib';

class DataView {
  constructor(data) {
    this.rawData = data;
    this.filterManager = new FilterManager();
    this.sortManager = new SortManager();
    this.paginationManager = new PaginationManager(25);
    
    // Setup filters
    this.filterManager.registerFilter('active', item => item.active);
    this.filterManager.registerFilter('recent', item => {
      return Date.now() - item.timestamp < 3600000; // Last hour
    });
  }

  getData() {
    let data = this.rawData;
    
    // Apply filters
    data = this.filterManager.applyFilters(data);
    
    // Apply sorting
    data = this.sortManager.applySort(data);
    
    // Apply pagination
    data = this.paginationManager.applyPagination(data);
    
    return data;
  }
}
```

## Benefits

1. **Code Reusability**: Share code between popup, options, and devtools
2. **Maintainability**: Update once, apply everywhere
3. **Type Safety**: Consistent interfaces across components
4. **Testing**: Easier to test isolated, focused modules
5. **Performance**: Shared instances and caching
6. **Consistency**: Uniform behavior across the extension

## Migration Guide

To migrate existing duplicate code:

1. Identify duplicate functionality
2. Extract to appropriate lib directory
3. Create class-based implementation
4. Update imports in components
5. Remove duplicate code
6. Test thoroughly

Example migration:

```javascript
// Before (in multiple files)
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  // ... implementation
}

// After (in one file)
import { formatBytes } from '@/lib';

// Use everywhere
const size = formatBytes(1024);
```
