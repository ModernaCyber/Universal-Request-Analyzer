# Universal Request Analyzer - User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Extension](#understanding-the-extension)
3. [Using the Popup Interface](#using-the-popup-interface)
4. [Using the DevTools Panel](#using-the-devtools-panel)
5. [Using the Dashboard](#using-the-dashboard)
6. [Configuration & Settings](#configuration--settings)
7. [Understanding Metrics](#understanding-metrics)
8. [Advanced Features](#advanced-features)
9. [Tips & Best Practices](#tips--best-practices)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### What is Universal Request Analyzer?

Universal Request Analyzer is a powerful browser extension that helps you understand, analyze, and optimize your web application's network performance. It captures detailed information about every network request your browser makes and provides comprehensive analytics to help you identify bottlenecks and improve performance.

### Installation

1. **Chrome/Edge:**

   - Visit the Chrome Web Store
   - Search for "Universal Request Analyzer"
   - Click "Add to Chrome/Edge"
   - The extension icon will appear in your toolbar

2. **Firefox:**

   - Visit Firefox Add-ons
   - Search for "Universal Request Analyzer"
   - Click "Add to Firefox"

3. **Manual Installation (Developers):**
   - Clone the repository
   - Run `npm install` and `npm run build`
   - Load unpacked extension from the `dist` folder

### First-Time Setup

When you first install the extension:

1. Click the extension icon to open the popup
2. Review the default settings (request capture is enabled by default)
3. Performance metrics are **disabled by default** to minimize overhead
4. Configure your preferences in the options page if needed

## Understanding the Extension

### Three Ways to View Data

The extension provides three interfaces, each optimized for different use cases:

1. **Popup** - Quick insights for the current domain
2. **DevTools Panel** - Detailed analysis with real-time updates
3. **Dashboard** - Comprehensive cross-domain analytics

### Data Architecture

The extension uses a medallion architecture with three data layers:

- **Bronze Layer**: Raw, immutable request data
- **Silver Layer**: Validated and enriched data with star schema
- **Gold Layer**: Pre-aggregated analytics and insights

This architecture ensures data integrity while enabling powerful analytics.

## Using the Popup Interface

### Opening the Popup

Click the extension icon in your browser toolbar.

### What You See

The popup automatically shows metrics for **the current tab's domain** you're viewing:

- **Total Requests**: Number of requests made by this domain
- **Average Response Time**: Mean response time across all requests
- **Error Rate**: Percentage of failed requests
- **Data Transferred**: Total bytes transferred

**Important**: The extension intelligently filters by the **page domain** (the website you're visiting), not the request URL domains. For example, when viewing `github.com`, you'll see all requests made by GitHub, including API calls to `api.github.com` and other third-party services.

### Request Type Filter

Use the dropdown to filter by resource type:

- **All Requests** - Show all captured requests
- **XHR/API** - AJAX and API calls
- **Fetch** - Fetch API requests
- **Scripts** - JavaScript files
- **Stylesheets** - CSS files
- **Images** - Image resources
- **Fonts** - Web fonts
- **Documents** - HTML documents

### Quick Actions

- **Analytics**: Opens the DevTools Panel for detailed analysis
- **Dashboard**: Opens the full Dashboard in the options page
- **Refresh**: Updates the metrics with latest data

### Understanding the Data

**Important Notes:**

- Metrics are **aggregated across all pages** within the current domain
- Data refreshes automatically every 5 seconds when the popup is open
- Historical data is retained based on your settings (default: 7 days)

## Using the DevTools Panel

### Opening DevTools Panel

1. Press F12 or right-click and select "Inspect"
2. Navigate to the "Request Analyzer" tab
3. The panel shows real-time request data

### Filter Options

#### Domain Filter

- **Current Domain**: Shows only requests from the **inspected window's domain** (auto-detected)
- **All Domains**: Shows requests across all tracked domains
- **Specific Domain**: Select from a list of tracked domains

**Note**: Domain filtering is based on the **page URL** (the site making the requests), not the request destination URLs. This groups all requests by the website you're analyzing.

#### Page Filter

- **All Pages (Aggregated)**: Combines metrics across all pages in the domain
- **Specific Page**: Shows metrics for a single page/URL

#### Time Range

- Last 5 minutes
- Last 15 minutes
- Last hour
- Last 6 hours
- Last 24 hours
- Last 7 days
- Last 30 days

#### Request Type

Same categories as in the popup (All, XHR/API, Fetch, etc.)

#### Status Filter

- All Status Codes
- 2xx (Success)
- 3xx (Redirect)
- 4xx (Client Error)
- 5xx (Server Error)

### Panel Tabs

#### 1. Overview Tab

Real-time visualizations and key metrics:

- Request volume over time (line chart)
- Status code distribution (pie chart)
- Average response time trends
- Key performance indicators

**Auto-refresh**: Enabled by default (5-second intervals)

#### 2. Requests Table

Detailed view of individual requests:

- URL, method, status code
- Response time, size
- Timestamp
- Resource type

**Features:**

- Sortable columns
- Search/filter
- Click a row to see full request details
- Export filtered data

#### 3. Performance Tab

Performance timing breakdown:

- DNS lookup time
- TCP connection time
- SSL/TLS handshake time
- Time to First Byte (TTFB)
- Download time

**Visualizations:**

- Waterfall chart
- Performance distribution
- Slow request analysis (P95, P99)

**Note**: Performance metrics must be enabled in settings.

#### 4. Endpoints Tab

API endpoint analysis:

- Most frequently called endpoints
- Average response time per endpoint
- Error rates by endpoint
- Request/response size distribution

**Use Cases:**

- Identify slow API endpoints
- Find frequently failing endpoints
- Optimize API call patterns

#### 5. Errors Tab

Categorized error analysis:

- 4xx errors (client-side)
- 5xx errors (server-side)
- Network errors
- Timeout errors

**Features:**

- Error grouping by type
- Timeline of errors
- Most common errors
- Detailed error information

### Time Travel Feature

Access historical performance data:

1. Click the **"History"** button
2. Select grouping level:
   - **By Minute**: For recent, detailed analysis
   - **Hourly**: For daily trends
   - **Daily**: For long-term patterns
3. View historical:
   - Request volume over time
   - Average response times
   - Error rate patterns
   - Performance regressions

**Use Cases:**

- Identify when performance degraded
- Track improvements after optimization
- Compare different time periods
- Spot patterns and anomalies

## Using the Dashboard

### Opening the Dashboard

1. Click the extension icon
2. Click "Dashboard" button, OR
3. Right-click extension icon → Options → Dashboard tab

### Dashboard Overview

The dashboard provides cross-domain analytics with comprehensive visualizations.

### Filters

1. **Domain Selection**: Choose which domain to analyze
2. **Page Selection**: Optional - filter to specific pages
3. **Time Range**: Same options as DevTools Panel
4. **Request Type**: Filter by resource type

### Dashboard Charts

#### 1. Request Volume Timeline

Line chart showing request count over time.

**Insights:**

- Traffic patterns
- Peak usage times
- Unusual spikes or drops

#### 2. Status Distribution

Pie chart of HTTP status codes.

**Insights:**

- Success rate at a glance
- Types of errors occurring
- Overall system health

#### 3. Top Domains by Requests

Bar chart of most active domains.

**Insights:**

- Which domains are most active
- Third-party service usage
- Potential optimization targets

#### 4. Performance Trends

Area chart of response time metrics.

**Insights:**

- Average response time trends
- Performance improvements or degradations
- Baseline establishment

#### 5. Data Transfer

Visualization of bytes transferred.

**Insights:**

- Bandwidth usage
- Heavy resource identification
- Cache effectiveness

### Using Multiple Domains

The dashboard excels at comparing performance across different domains:

1. Select "All Domains" to see aggregated metrics
2. Compare individual domain performance
3. Identify outliers or problem domains
4. Track third-party service performance

## Configuration & Settings

### Accessing Settings

Right-click extension icon → Options, or click "Settings" in any interface.

### General Settings

#### Request Capture

- **Enable/Disable**: Toggle request monitoring on/off
- **Default**: Enabled
- **Impact**: When disabled, no new requests are captured

#### Data Retention

- **Duration**: 1 day, 7 days (default), 14 days, 30 days
- **Purpose**: Controls how long historical data is kept
- **Recommendation**: 7 days for most users, 30 days for long-term analysis

#### Maximum Stored Requests

- **Range**: 100 - 100,000 requests
- **Default**: 10,000
- **Impact**: Older requests are removed when limit is reached (FIFO)

### Performance Monitoring Settings

Performance metrics provide detailed timing breakdown but add overhead.

#### Enable Performance Metrics

- **Default**: Disabled
- **When to Enable**: When you need detailed timing analysis
- **Impact**: Slight performance overhead (~2-5%)

#### Sampling Rate

- **Range**: 1% - 100%
- **Default**: 100% (when enabled)
- **Purpose**: Reduce overhead by sampling a percentage of requests
- **Example**: 25% captures detailed metrics for 1 in 4 requests

#### Metric Types

Select which timing metrics to capture:

- **Navigation Timing**: Page load events
- **Resource Timing**: Individual resource timings
- **Server Timing**: Server-reported timings
- **Custom Metrics**: User-defined performance marks

**Recommendation**: Start with all disabled, enable only what you need.

### Export/Import Settings

#### Export Data

1. Click "Export Data" button
2. Choose format: JSON or CSV
3. Select date range
4. Apply filters (optional)
5. Download file

**Use Cases:**

- Backup your data
- Share with team members
- Analyze in external tools (Excel, BI tools)
- Generate reports

#### Import Data

1. Click "Import Data" button
2. Select previously exported file
3. Choose merge or replace strategy
4. Confirm import

### Dashboard Visualization Settings

#### Enable Dashboard Plots

- **Default**: Enabled
- **Purpose**: Toggle all dashboard visualizations on/off
- **When to Disable**: If you prefer table-only view or want better performance

#### Chart Types

Select which charts to display on the dashboard:

- **Request Volume** (`requestsChart`): Line chart showing request count over time
- **Status Distribution** (`statusChart`): Pie chart of HTTP status codes (2xx, 3xx, 4xx, 5xx)
- **Performance Trends** (`performanceChart`): Area chart of response times

**Note**: The "Top Domains/Resources" chart is always visible when domain filtering is active.

**Settings Location**: Options → General → Dashboard Visualization

### Advanced Settings

#### Auto-Refresh

- **Dashboard**: 30 seconds (default)
- **DevTools Panel**: 5 seconds (default)
- **Popup**: 5 seconds (default)

#### Theme

- Light (default)
- Dark
- Auto (matches browser)

## Understanding Metrics

### Basic Metrics

#### Total Requests

Count of all network requests in the selected time range and filters.

#### Average Response Time

Mean duration from request start to completion.

**Good**: < 200ms
**Acceptable**: 200-500ms
**Slow**: > 500ms

#### Error Rate

Percentage of requests that failed (4xx, 5xx, or network errors).

**Good**: < 1%
**Acceptable**: 1-5%
**Poor**: > 5%

#### Data Transferred

Total bytes of data sent and received.

**Consideration**: Higher is not always worse if requests are necessary and efficient.

### Performance Metrics

#### DNS Lookup Time

Time to resolve domain name to IP address.

**Typical**: 20-120ms
**Optimization**: Use DNS prefetching, CDN with good DNS

#### TCP Connection Time

Time to establish TCP connection.

**Typical**: 50-200ms
**Optimization**: Keep-alive connections, HTTP/2

#### SSL/TLS Handshake Time

Time for HTTPS negotiation.

**Typical**: 50-300ms
**Optimization**: Session resumption, TLS 1.3

#### Time to First Byte (TTFB)

Time from request sent to first response byte received.

**Good**: < 200ms
**Acceptable**: 200-500ms
**Poor**: > 500ms

**Factors**: Server processing time, network latency

#### Download Time

Time to download response body.

**Depends on**: Response size, bandwidth
**Optimization**: Compression, smaller responses

#### Total Duration

Complete request time (sum of all phases).

### Core Web Vitals

When performance monitoring is enabled, the extension tracks Core Web Vitals:

#### Largest Contentful Paint (LCP)

Time until largest content element is rendered.

**Target**: < 2.5s
**Acceptable**: 2.5-4.0s
**Poor**: > 4.0s

#### First Input Delay (FID)

Time from user interaction to browser response.

**Target**: < 100ms
**Acceptable**: 100-300ms
**Poor**: > 300ms

#### Cumulative Layout Shift (CLS)

Visual stability - sum of unexpected layout shifts.

**Target**: < 0.1
**Acceptable**: 0.1-0.25
**Poor**: > 0.25

### Percentiles

#### P50 (Median)

50% of requests are faster than this value.

**Use**: Understanding typical experience

#### P95

95% of requests are faster than this value.

**Use**: Understanding almost all users' experience

#### P99

99% of requests are faster than this value.

**Use**: Identifying worst-case scenarios

**Why Percentiles Matter**: Averages can hide problems. P95 and P99 show outliers that affect real users.

## Advanced Features

### Filter Hierarchy

Understanding how filters work together:

```
Domain → Page → Request Type → Status → Time Range
```

Each level narrows down the dataset:

1. Start with domain (or all domains)
2. Optionally select specific page(s)
3. Filter by request type if needed
4. Filter by status code if needed
5. Choose time range

### Third-Party Domain Tracking

The extension automatically categorizes third-party domains:

**Categories:**

- **Analytics**: Google Analytics, Mixpanel, etc.
- **Advertising**: Google Ads, DoubleClick, etc.
- **CDN**: Cloudflare, Akamai, etc.
- **Social**: Facebook, Twitter widgets, etc.
- **Fonts**: Google Fonts, Adobe Fonts, etc.

**Why It Matters:**

- Third-party requests affect your page performance
- Identify which services add most overhead
- Optimize or remove heavy third-party dependencies

### Security Features

#### Mixed Content Detection

Identifies HTTP resources loaded on HTTPS pages.

**Risk**: Security warnings, blocked resources
**Action**: Update to HTTPS

#### Risk Level Assessment

Domains are assigned risk levels based on:

- Third-party status
- Known malicious patterns
- SSL/TLS status
- Response patterns

## Tips & Best Practices

### For Developers

1. **Enable Performance Metrics During Development**

   - Use 100% sampling to catch all issues
   - Disable in production to reduce overhead

2. **Use Time Travel for Debugging**

   - Compare before/after deployments
   - Identify when regressions occurred

3. **Monitor Third-Party Services**

   - Check which services are slowest
   - Consider alternatives or optimizations

4. **Set Up Regular Exports**
   - Export weekly for long-term tracking
   - Share data with team members

### For QA Teams

1. **Baseline Performance**

   - Establish performance baselines
   - Use percentiles (P95, P99) not just averages

2. **Test Across Time Periods**

   - Test during different times of day
   - Monitor over extended periods

3. **Focus on Error Patterns**
   - Use Errors tab to categorize issues
   - Track error rates over time

### For Product Managers

1. **Use Dashboard for High-Level Views**

   - Track overall performance trends
   - Compare domains/features

2. **Monitor User Impact**

   - Focus on Core Web Vitals
   - Check error rates

3. **Data-Driven Decisions**
   - Export data for presentations
   - Use historical data to justify optimization work

## Troubleshooting

### No Data Showing

**Possible Causes:**

1. Request capture is disabled
   - **Solution**: Enable in settings
2. No requests match current filters
   - **Solution**: Broaden filters (e.g., select "All Domains")
3. Data retention period expired
   - **Solution**: Increase retention period in settings

### Performance Metrics Not Available

**Cause**: Performance monitoring is disabled by default.

**Solution**:

1. Open Options → Performance Settings
2. Enable "Capture Performance Metrics"
3. Choose sampling rate
4. Reload pages to start capturing metrics

### Extension Using Too Much Memory

**Solutions:**

1. Reduce maximum stored requests (Settings → General)
2. Decrease data retention period
3. Disable performance metrics if not needed
4. Export and clear old data periodically

### Charts Not Rendering

**Possible Causes:**

1. No data in selected time range
2. All requests filtered out
3. Browser compatibility issue

**Solutions:**

1. Check filters and time range
2. Try refreshing the page
3. Check browser console for errors

### Slow Dashboard Loading

**Causes:**

- Large dataset
- Complex filters
- Multiple visualizations

**Solutions:**

1. Narrow time range
2. Apply domain filters
3. Reduce data retention period
4. Export and archive old data

### Data Not Persisting

**Cause**: Browser storage issues or extension updated.

**Solution**:

1. Check browser storage permissions
2. Export important data regularly
3. Re-import after updates if needed

## Getting Help

### Resources

- **GitHub Repository**: [Link to repository]
- **Issue Tracker**: Report bugs and feature requests
- **Documentation**: Additional technical documentation in `/docs`

### Reporting Issues

When reporting issues, include:

1. Browser version and OS
2. Extension version
3. Steps to reproduce
4. Screenshots if applicable
5. Console errors if any

### Feature Requests

We welcome feature requests! Please:

1. Check existing issues first
2. Describe your use case
3. Explain expected behavior
4. Consider contributing a pull request

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**License**: MIT
