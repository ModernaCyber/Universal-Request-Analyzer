// Message Handler for Popup Auth and Stats
// Handles registration, login, logout, and page stats requests

import requestRunner from "../capture/request-runner.js";
import runnerCollections from "../capture/runner-collections.js";
import settingsManager from "../../lib/shared-components/settings-manager-core.js";

let localAuthManager = null;
let dbManager = null;

// Initialize message handler
export function initializePopupMessageHandler(auth, database) {
  localAuthManager = auth;
  dbManager = database;

  // Initialize requestRunner with database manager
  if (database && requestRunner) {
    requestRunner.setDbManager(database);
    console.log("✓ RequestRunner initialized with database manager");
  }

  console.log("Popup message handler initialized");

  // Return the handler function to be used by central listener
  return handleMessage;
}

// Handle incoming messages
async function handleMessage(message, sender) {
  const { action, data, filters } = message;

  try {
    switch (action) {
      case "register":
        return await handleRegister(data);

      case "login":
        return await handleLogin(data);

      case "logout":
        return await handleLogout();

      case "getPageStats":
        return await handleGetPageStats(data);

      case "getFilteredStats":
        return await handleGetFilteredStats(filters);

      case "exportFilteredData":
        return await handleExportFilteredData(filters, message.format);

      case "getDashboardStats":
        return await handleGetDashboardStats(message.timeRange);

      case "getMetrics":
        return await handleGetMetrics(message.timeRange);

      case "query":
        return await handleQuery(message.query, message.params);

      case "getDomains":
        return await handleGetDomains(message.timeRange);

      case "getPagesByDomain":
        return await handleGetPagesByDomain(message.domain, message.timeRange);

      case "getWebVitals":
        return await handleGetWebVitals(message.filters);

      case "getSettings":
        return await handleGetSettings();

      // getSessionMetrics removed - session engagement metrics are not meaningful
      // for single-user browser extension (only tracks developer's own behavior)

      case "saveSettingToDb":
        return await handleSaveSettingToDb(message.key, message.value);

      case "loadSettingsFromDb":
        return await handleLoadSettingsFromDb();

      case "syncSettingsToStorage":
        return await handleSyncSettingsToStorage();

      case "saveSetting":
        return await handleSaveSetting(message);

      case "getSetting":
        return await handleGetSetting(message);

      case "getSettingsByCategory":
        return await handleGetSettingsByCategory(message);

      case "getRequestTypes":
        return await handleGetRequestTypes();

      case "getDetailedRequests":
        return await handleGetDetailedRequests(
          message.filters,
          message.limit,
          message.offset
        );

      case "getHistoricalData":
        return await handleGetHistoricalData(message.filters, message.groupBy);

      case "getEndpointAnalysis":
        return await handleGetEndpointAnalysis(message.filters);

      case "getEndpointPerformanceHistory":
        return await handleGetEndpointPerformanceHistory(message.filters);

      case "getRequestTypePerformanceHistory":
        return await handleGetRequestTypePerformanceHistory(message.filters);

      case "getApiEndpointPerformanceHistory":
        return await handleGetApiEndpointPerformanceHistory(message.filters);

      case "getResourceSizeBreakdown":
        return await handleGetResourceSizeBreakdown(message.filters);

      case "getWaterfallData":
        return await handleGetWaterfallData(message.filters, message.limit);

      case "getPercentilesAnalysis":
        return await handleGetPercentilesAnalysis(message.filters);

      case "getAnomalyDetection":
        return await handleGetAnomalyDetection(message.filters);

      case "getTrendAnalysis":
        return await handleGetTrendAnalysis(
          message.filters,
          message.compareType
        );

      case "getAlertRules":
        return await handleGetAlertRules();

      case "saveAlertRule":
        return await handleSaveAlertRule(message.rule);

      case "deleteAlertRule":
        return await handleDeleteAlertRule(message.ruleId);

      case "getAlertHistory":
        return await handleGetAlertHistory(message.limit);

      case "getHeatmapData":
        return await handleGetHeatmapData(message.filters);

      case "getMultiDomainComparison":
        return await handleGetMultiDomainComparison(
          message.domains,
          message.filters
        );

      case "getPerformanceInsights":
        return await handleGetPerformanceInsights(message.filters);

      case "exportAsHAR":
        return await handleExportAsHAR(message.filters);

      case "exportToSQLite":
        return await handleExportToSQLite(message.options);

      case "exportToJSON":
        return await handleExportToJSON(message.options);

      case "exportToCSV":
        return await handleExportToCSV(message.options);

      case "getRecentErrors":
        return await handleGetRecentErrors(data);

      case "getRecentRequests":
        return await handleGetRecentRequests(data);

      case "runRequests":
        return await handleRunRequests(message.config, message.requests);

      case "getRunnerProgress":
        return await handleGetRunnerProgress();

      case "cancelRun":
        return await handleCancelRun();

      case "getRunHistory":
        return await handleGetRunHistory(message.limit);

      case "getRunResults":
        return await handleGetRunResults(message.runId);

      // Runner Collections
      case "createRunnerCollection":
        return await handleCreateRunnerCollection(message);

      case "getRunnerCollections":
        return await handleGetRunnerCollections();

      case "getRunnerCollection":
        return await handleGetRunnerCollection(message.collectionId);

      case "updateRunnerCollection":
        return await handleUpdateRunnerCollection(
          message.collectionId,
          message.updates
        );

      case "deleteRunnerCollection":
        return await handleDeleteRunnerCollection(message.collectionId);

      case "runCollection":
        return await handleRunCollection(message.collectionId);

      // Runner Scheduling
      case "scheduleRunner":
        return await handleScheduleRunner(
          message.collectionId,
          message.scheduleConfig
        );

      case "getScheduledRuns":
        return await handleGetScheduledRuns();

      case "updateScheduledRun":
        return await handleUpdateScheduledRun(
          message.scheduleId,
          message.updates
        );

      case "deleteScheduledRun":
        return await handleDeleteScheduledRun(message.scheduleId);

      // Runner Alerts
      case "createRunnerAlert":
        return await handleCreateRunnerAlert(message.alert);

      case "getRunnerAlerts":
        return await handleGetRunnerAlerts(message.collectionId);

      case "updateRunnerAlert":
        return await handleUpdateRunnerAlert(message.alertId, message.updates);

      case "deleteRunnerAlert":
        return await handleDeleteRunnerAlert(message.alertId);

      // Runner Database Operations (Unified Architecture)
      case "createRunner":
        return await handleCreateRunner(message.definition, message.requests);

      case "getRunnerDefinition":
        return await handleGetRunnerDefinition(message.runnerId);

      case "getAllRunners":
        return await handleGetAllRunners(data);

      case "ensureRunnerTables":
        return await handleEnsureRunnerTables();

      case "runRunner":
        return await handleRunRunner(message.runnerId);

      case "getRunnerHistory":
        return await handleGetRunnerHistory(message.runnerId, message.limit);

      case "getExecutionResults":
        return await handleGetExecutionResults(message.executionId);

      case "convertToSavedRunner":
        return await handleConvertToSavedRunner(message.runnerId);

      case "updateRunnerMetadata":
        return await handleUpdateRunnerMetadata(
          message.runnerId,
          message.name,
          message.description
        );

      case "cleanupTemporaryRunners":
        return await handleCleanupTemporaryRunners(message.daysOld);

      case "deleteRunner":
        return await handleDeleteRunner(message.runnerId);

      case "getRequestsByFilters":
        return await handleGetRequestsByFilters(message.filters);

      default:
        // Return null for unhandled actions so medallion handler can try
        return null;
    }
  } catch (error) {
    console.error("Message handler error:", error);
    return { success: false, error: error.message };
  }
}

// Handle registration
async function handleRegister(data) {
  try {
    if (!localAuthManager) {
      return { success: false, error: "Auth manager not initialized" };
    }

    const { email, password, name } = data;
    const result = await localAuthManager.register(email, password, name);

    return result;
  } catch (error) {
    console.error("Registration handler error:", error);
    return { success: false, error: error.message };
  }
}

// Handle login
async function handleLogin(data) {
  try {
    if (!localAuthManager) {
      return { success: false, error: "Auth manager not initialized" };
    }

    const { email, password } = data;
    const result = await localAuthManager.login(email, password);

    return result;
  } catch (error) {
    console.error("Login handler error:", error);
    return { success: false, error: error.message };
  }
}

// Handle logout
async function handleLogout() {
  try {
    if (!localAuthManager) {
      return { success: false, error: "Auth manager not initialized" };
    }

    const result = await localAuthManager.logout();
    return result;
  } catch (error) {
    console.error("Logout handler error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get page stats - now supports domain-level aggregation
async function handleGetPageStats(data) {
  try {
    const { tabId, url, requestType, statusFilter } = data;

    if (!url) {
      return { success: false, error: "URL required" };
    }

    // Extract domain from URL
    const domain = new URL(url).hostname;

    // Query requests for this domain in the last 5 minutes
    // This aggregates across ALL pages for the domain (as per popup requirements)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    const stats = {
      totalRequests: 0,
      avgResponse: 0,
      errorCount: 0,
      dataTransferred: 0,
      requestTypes: {},
      statusCodes: {},
      timestamps: [],
      responseTimes: [],
    };

    try {
      if (dbManager && dbManager.db) {
        // Escape SQL strings
        const escapeStr = (val) => {
          if (val === undefined || val === null) return "NULL";
          return `'${String(val).replace(/'/g, "''")}'`;
        };

        // Build query with optional request type filter
        let whereClause = `WHERE domain = ${escapeStr(
          domain
        )} AND created_at > ${fiveMinutesAgo}`;

        if (requestType && requestType !== "") {
          whereClause += ` AND type = ${escapeStr(requestType)}`;
        }

        // Apply status filter for quick filter chips
        if (statusFilter === "2xx") {
          whereClause += ` AND status >= 200 AND status < 300`;
        } else if (statusFilter === "4xx") {
          whereClause += ` AND status >= 400 AND status < 500`;
        } else if (statusFilter === "5xx") {
          whereClause += ` AND status >= 500 AND status < 600`;
        }

        // Query aggregate stats across all pages in the domain
        const aggregateQuery = `
          SELECT 
            COUNT(*) as totalRequests,
            AVG(duration) as avgResponse,
            SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errorCount,
            SUM(size_bytes) as dataTransferred
          FROM bronze_requests
          ${whereClause}
        `;

        const aggregateResult = dbManager.db.exec(aggregateQuery);

        if (
          aggregateResult &&
          aggregateResult[0]?.values &&
          aggregateResult[0].values.length > 0
        ) {
          const [total, avg, errors, bytes] = aggregateResult[0].values[0];
          stats.totalRequests = total || 0;
          stats.avgResponse = Math.round(avg || 0);
          stats.errorCount = errors || 0;
          stats.dataTransferred = bytes || 0;
        }

        // Query detailed request data for charts (aggregated across all pages)
        const detailQuery = `
          SELECT type, status, duration, created_at
          FROM bronze_requests
          ${whereClause}
          ORDER BY created_at DESC
          LIMIT 100
        `;

        const detailResult = dbManager.db.exec(detailQuery);

        if (detailResult && detailResult[0]?.values) {
          detailResult[0].values.forEach((row) => {
            const [type, status, duration, timestamp] = row;

            // Aggregate by type
            if (type) {
              stats.requestTypes[type] = (stats.requestTypes[type] || 0) + 1;
            }

            // Aggregate by status code
            if (status) {
              stats.statusCodes[status] = (stats.statusCodes[status] || 0) + 1;
            }

            // Collect timestamps and response times
            if (timestamp) stats.timestamps.push(timestamp);
            if (duration) stats.responseTimes.push(duration);
          });
        }

        console.log(
          `Page stats for ${domain} (all pages): ${stats.totalRequests} requests`
        );
      } else {
        console.warn("Database manager not available");
      }
    } catch (queryError) {
      console.error("Query error:", queryError);
      // Return default stats if query fails
    }

    return { success: true, stats };
  } catch (error) {
    console.error("Get page stats error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get filtered stats for DevTools panel and Dashboard
// Supports domain → page → request type filtering hierarchy
async function handleGetFilteredStats(filters) {
  try {
    console.log("handleGetFilteredStats called with filters:", filters);
    console.log("dbManager available:", !!dbManager);

    if (!dbManager || !dbManager.executeQuery) {
      console.error(
        "Database manager not initialized or missing executeQuery method"
      );
      return {
        success: false,
        error: "Database not initialized",
        totalRequests: 0,
        timestamps: [],
        responseTimes: [],
        requestTypes: {},
        statusCodes: {},
      };
    }

    const { domain, pageUrl, timeRange, type, statusPrefix } = filters || {};

    // Default to last 5 minutes if not specified
    const timeRangeMs = timeRange ? parseInt(timeRange) * 1000 : 5 * 60 * 1000;
    const startTime = Date.now() - timeRangeMs;

    // Escape SQL strings
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let query = `
      SELECT 
        id, url, method, type, status, duration, size_bytes, timestamp, domain, page_url
      FROM bronze_requests
      WHERE timestamp > ${startTime}
    `;

    // Filter by domain (if specified)
    if (domain && domain !== "all") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    // Filter by page URL (if specified) - takes precedence if both domain and pageUrl provided
    // If pageUrl is specified, filter to that specific page
    // If only domain is specified, aggregate across all pages for that domain
    if (pageUrl && pageUrl !== "") {
      // Extract domain from pageUrl to ensure consistency
      try {
        const url = new URL(pageUrl);
        query += ` AND page_url = ${escapeStr(pageUrl)}`;

        // Also ensure domain matches for safety
        if (!domain || domain === "all") {
          query += ` AND domain = ${escapeStr(url.hostname)}`;
        }
      } catch (urlError) {
        // If pageUrl is just a domain, treat it as domain filter
        const domainFromUrl = pageUrl.replace(/^https?:\/\//, "").split("/")[0];
        query += ` AND domain = ${escapeStr(domainFromUrl)}`;
      }
    }

    // Add request type filter
    if (type && type !== "") {
      query += ` AND type = ${escapeStr(type)}`;
    }

    // Add status filter
    if (statusPrefix) {
      if (statusPrefix === "3xx") {
        query += " AND status >= 300 AND status < 400";
      } else if (statusPrefix === "4xx") {
        query += " AND status >= 400 AND status < 500";
      } else if (statusPrefix === "5xx") {
        query += " AND status >= 500 AND status < 600";
      } else if (statusPrefix === "200") {
        query += " AND status >= 200 AND status < 300";
      } else {
        query += ` AND status = ${parseInt(statusPrefix)}`;
      }
    }

    query += " ORDER BY timestamp DESC LIMIT 1000";

    console.log("Executing query:", query);

    let requests = [];

    try {
      const result = dbManager.db.exec(query);
      console.log("Query result:", result);

      if (result && result[0]) {
        requests = mapResultToArray(result[0]);
        console.log("Mapped requests count:", requests.length);
      } else {
        console.log("No results from query");
      }
    } catch (queryError) {
      console.error("Filtered stats query error:", queryError);

      // Check if error is due to schema mismatch
      if (queryError.message && queryError.message.includes("no such column")) {
        console.error(
          "⚠️ Database schema mismatch detected. Please clear extension data and reload."
        );
        return {
          success: false,
          error:
            "Database schema outdated. Please clear extension data (Chrome Settings > Extensions > Universal Request Analyzer > Remove) and reinstall.",
          totalRequests: 0,
          timestamps: [],
          responseTimes: [],
          requestTypes: {},
          statusCodes: {},
        };
      }

      return {
        success: false,
        error: queryError.message,
        totalRequests: 0,
        timestamps: [],
        responseTimes: [],
        requestTypes: {},
        statusCodes: {},
      };
    }

    // Process data for charts
    const timestamps = [];
    const responseTimes = [];
    const requestTypes = {};
    const statusCodes = {};
    const domainCounts = {}; // For tracking domains when no domain filter is active

    requests.forEach((req) => {
      // Collect timestamps and response times
      if (req.timestamp && req.duration) {
        timestamps.push(new Date(req.timestamp).toLocaleTimeString());
        responseTimes.push(req.duration);
      }

      // Count request types (resource types when domain IS filtered)
      if (req.type) {
        requestTypes[req.type] = (requestTypes[req.type] || 0) + 1;
      }

      // Count domains (when NO domain filter is active)
      if (req.domain) {
        domainCounts[req.domain] = (domainCounts[req.domain] || 0) + 1;
      }

      // Count status codes
      if (req.status) {
        const statusGroup = Math.floor(req.status / 100) * 100;
        statusCodes[statusGroup] = (statusCodes[statusGroup] || 0) + 1;
      }
    });

    return {
      success: true,
      timestamps: timestamps.slice(-50), // Last 50 data points
      responseTimes: responseTimes.slice(-50),
      requestTypes, // Resource types (xhr, script, stylesheet, etc.) - use when domain IS filtered
      domainCounts, // Domain names (github.com, stackoverflow.com, etc.) - use when NO domain filter
      statusCodes,
      totalRequests: requests.length,
      // Include metadata about what was filtered
      filterApplied: {
        domain: domain || "all",
        page: pageUrl || "all",
        requestType: type || "all",
      },
    };
  } catch (error) {
    console.error("Get filtered stats error:", error);
    return { success: false, error: error.message };
  }
}

// Handle export filtered data
async function handleExportFilteredData(filters, format) {
  try {
    // Get filtered stats first
    const statsResult = await handleGetFilteredStats(filters);

    if (!statsResult.success) {
      return statsResult;
    }

    // Return data to popup - popup will handle download
    return {
      success: true,
      data: statsResult,
      format: format || "json",
      filename: `request-analyzer-export-${Date.now()}.${format || "json"}`,
    };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: error.message };
  }
}

// Helper function to map SQL result to array of objects
function mapResultToArray(result) {
  if (!result || !result.columns || !result.values) {
    return [];
  }

  return result.values.map((row) => {
    const obj = {};
    result.columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

// Handle get dashboard stats
async function handleGetDashboardStats(timeRange = 86400) {
  try {
    const timeRangeMs = parseInt(timeRange) * 1000;
    const startTime = Date.now() - timeRangeMs;

    const stats = {
      totalRequests: 0,
      avgResponse: 0,
      slowRequests: 0,
      errorCount: 0,
      volumeTimeline: { labels: [], values: [] },
      statusDistribution: [0, 0, 0, 0], // 2xx, 3xx, 4xx, 5xx
      topDomains: { labels: [], values: [] },
      performanceTrend: { labels: [], values: [] },
      layerCounts: { bronze: 0, silver: 0, gold: 0 },
    };

    try {
      if (dbManager?.executeQuery) {
        // Get overall stats
        const overallQuery = `
          SELECT 
            COUNT(*) as totalRequests,
            AVG(duration) as avgResponse,
            SUM(CASE WHEN duration > 1000 THEN 1 ELSE 0 END) as slowRequests,
            SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errorCount
          FROM bronze_requests
          WHERE timestamp > ?
        `;
        const overallResult = dbManager.executeQuery(overallQuery, [startTime]);

        if (
          overallResult &&
          overallResult[0]?.values &&
          overallResult[0].values.length > 0
        ) {
          const [total, avg, slow, errors] = overallResult[0].values[0];
          stats.totalRequests = total || 0;
          stats.avgResponse = avg || 0;
          stats.slowRequests = slow || 0;
          stats.errorCount = errors || 0;
        }

        // Get status distribution
        const statusQuery = `
          SELECT 
            CASE 
              WHEN status >= 200 AND status < 300 THEN '2xx'
              WHEN status >= 300 AND status < 400 THEN '3xx'
              WHEN status >= 400 AND status < 500 THEN '4xx'
              WHEN status >= 500 THEN '5xx'
            END as statusGroup,
            COUNT(*) as count
          FROM bronze_requests
          WHERE timestamp > ? AND status IS NOT NULL
          GROUP BY statusGroup
        `;
        const statusResult = dbManager.executeQuery(statusQuery, [startTime]);

        if (statusResult && statusResult[0]?.values) {
          const statusMap = { "2xx": 0, "3xx": 1, "4xx": 2, "5xx": 3 };
          statusResult[0].values.forEach(([group, count]) => {
            if (group && statusMap[group] !== undefined) {
              stats.statusDistribution[statusMap[group]] = count;
            }
          });
        }

        // Get top domains
        const domainsQuery = `
          SELECT domain, COUNT(*) as count
          FROM bronze_requests
          WHERE timestamp > ? AND domain IS NOT NULL
          GROUP BY domain
          ORDER BY count DESC
          LIMIT 10
        `;
        const domainsResult = dbManager.executeQuery(domainsQuery, [startTime]);

        if (domainsResult && domainsResult[0]?.values) {
          stats.topDomains.labels = domainsResult[0].values.map((r) => r[0]);
          stats.topDomains.values = domainsResult[0].values.map((r) => r[1]);
        }

        // Get volume timeline (hourly aggregation)
        const hoursToShow = Math.min(
          Math.ceil(timeRangeMs / (3600 * 1000)),
          24
        );
        const hourlyQuery = `
          SELECT 
            strftime('%H:00', datetime(timestamp/1000, 'unixepoch')) as hour,
            COUNT(*) as count
          FROM bronze_requests
          WHERE timestamp > ?
          GROUP BY hour
          ORDER BY timestamp ASC
          LIMIT ?
        `;
        const volumeResult = dbManager.executeQuery(hourlyQuery, [
          startTime,
          hoursToShow,
        ]);

        if (volumeResult && volumeResult[0]?.values) {
          stats.volumeTimeline.labels = volumeResult[0].values.map((r) => r[0]);
          stats.volumeTimeline.values = volumeResult[0].values.map((r) => r[1]);
        }

        // Get performance trend (hourly average)
        const perfQuery = `
          SELECT 
            strftime('%H:00', datetime(timestamp/1000, 'unixepoch')) as hour,
            AVG(duration) as avgDuration
          FROM bronze_requests
          WHERE timestamp > ? AND duration IS NOT NULL
          GROUP BY hour
          ORDER BY timestamp ASC
          LIMIT ?
        `;
        const perfResult = dbManager.executeQuery(perfQuery, [
          startTime,
          hoursToShow,
        ]);

        if (perfResult && perfResult[0]?.values) {
          stats.performanceTrend.labels = perfResult[0].values.map((r) => r[0]);
          stats.performanceTrend.values = perfResult[0].values.map((r) =>
            Math.round(r[1])
          );
        }

        // Get layer counts
        const layerQueries = {
          bronze: "SELECT COUNT(*) FROM bronze_requests",
          silver: "SELECT COUNT(*) FROM silver_requests",
          gold: "SELECT COUNT(*) FROM gold_daily_analytics",
        };

        for (const [layer, query] of Object.entries(layerQueries)) {
          try {
            const result = dbManager.executeQuery(query);
            if (result && result[0]?.values && result[0].values.length > 0) {
              stats.layerCounts[layer] = result[0].values[0][0] || 0;
            }
          } catch (layerError) {
            console.warn(`Failed to get ${layer} count:`, layerError);
          }
        }
      }
    } catch (queryError) {
      console.error("Dashboard stats query error:", queryError);
    }

    return { success: true, stats };
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get metrics
async function handleGetMetrics(timeRange = 86400) {
  try {
    // Reuse dashboard stats logic for metrics
    const result = await handleGetDashboardStats(timeRange);
    return result;
  } catch (error) {
    console.error("Get metrics error:", error);
    return { success: false, error: error.message };
  }
}

// Handle database query
async function handleQuery(query, params = []) {
  try {
    if (!dbManager || !dbManager.db) {
      return { success: false, error: "Database not initialized" };
    }

    // Execute query
    const result = dbManager.db.exec(query, params);

    if (!result || result.length === 0) {
      return { success: true, data: [] };
    }

    // Convert SQL.js result format to array of objects
    const columns = result[0].columns;
    const values = result[0].values;

    const data = values.map((row) => {
      const obj = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return obj;
    });

    return { success: true, data };
  } catch (error) {
    console.error("Query handler error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get domains - returns list of all tracked domains
async function handleGetDomains(timeRange = 604800) {
  try {
    const timeRangeMs = parseInt(timeRange) * 1000;
    const startTime = Date.now() - timeRangeMs;

    const query = `
      SELECT DISTINCT domain, COUNT(*) as request_count
      FROM bronze_requests
      WHERE domain IS NOT NULL AND domain != '' AND timestamp > ?
      GROUP BY domain
      ORDER BY request_count DESC
    `;

    let domains = [];

    try {
      if (dbManager?.executeQuery) {
        const result = dbManager.executeQuery(query, [startTime]);
        if (result && result[0]?.values) {
          domains = result[0].values.map((row) => ({
            domain: row[0],
            requestCount: row[1],
          }));
        }
      }
    } catch (queryError) {
      console.error("Get domains query error:", queryError);
    }

    return { success: true, domains };
  } catch (error) {
    console.error("Get domains error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get pages by domain - returns list of pages under a specific domain
async function handleGetPagesByDomain(domain, timeRange = 604800) {
  try {
    console.log("handleGetPagesByDomain called with domain:", domain);

    if (!domain) {
      return { success: false, error: "Domain is required" };
    }

    // Escape SQL strings
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Get ALL pages for this domain regardless of time
    // Time filtering should only apply to the metrics displayed, not to available pages
    const query = `
      SELECT DISTINCT page_url, COUNT(*) as request_count
      FROM bronze_requests
      WHERE domain = ${escapeStr(
        domain
      )} AND page_url IS NOT NULL AND page_url != ''
      GROUP BY page_url
      ORDER BY request_count DESC
    `;

    let pages = [];

    try {
      if (dbManager?.db) {
        const result = dbManager.db.exec(query);
        if (result && result[0]?.values) {
          pages = result[0].values.map((row) => ({
            pageUrl: row[0],
            requestCount: row[1],
          }));
        }
      }
    } catch (queryError) {
      console.error("Get pages query error:", queryError);
    }

    return { success: true, pages };
  } catch (error) {
    console.error("Get pages by domain error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get Web Vitals - returns Core Web Vitals metrics
async function handleGetWebVitals(filters = {}) {
  try {
    const timeRange = filters.timeRange || 86400;
    const timeRangeMs = parseInt(timeRange) * 1000;
    const startTime = Date.now() - timeRangeMs;

    const vitals = {
      LCP: null,
      FID: null,
      CLS: null,
      FCP: null,
      TTFB: null,
      TTI: null,
      DCL: null,
      Load: null,
    };

    // Helper function to escape SQL strings
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Build WHERE clause based on filters - query bronze_web_vitals table
    const whereConditions = [`timestamp >= ${startTime}`];

    if (filters.domain) {
      const escapedDomain = String(filters.domain).replace(/'/g, "''");
      whereConditions.push(`domain = ${escapeStr(escapedDomain)}`);
    }

    if (filters.pageUrl) {
      const escapedUrl = String(filters.pageUrl).replace(/'/g, "''");
      whereConditions.push(`page_url = ${escapeStr(escapedUrl)}`);
    }

    const whereClause = whereConditions.join(" AND ");

    console.log(
      "[WebVitals] Querying bronze_web_vitals with filters:",
      filters
    );
    console.log("[WebVitals] WHERE clause:", whereClause);

    // Debug: Check total count and available domains
    try {
      if (dbManager?.db) {
        const countQuery = `SELECT COUNT(*) as total FROM bronze_web_vitals`;
        const countResult = dbManager.db.exec(countQuery);
        if (countResult && countResult[0]?.values) {
          console.log(
            "[WebVitals] Total records in bronze_web_vitals:",
            countResult[0].values[0][0]
          );
        }

        const domainsQuery = `SELECT DISTINCT domain FROM bronze_web_vitals LIMIT 10`;
        const domainsResult = dbManager.db.exec(domainsQuery);
        if (domainsResult && domainsResult[0]?.values) {
          console.log(
            "[WebVitals] Available domains:",
            domainsResult[0].values.map((row) => row[0])
          );
        }

        const metricsQuery = `SELECT DISTINCT metric_name FROM bronze_web_vitals`;
        const metricsResult = dbManager.db.exec(metricsQuery);
        if (metricsResult && metricsResult[0]?.values) {
          console.log(
            "[WebVitals] Available metrics:",
            metricsResult[0].values.map((row) => row[0])
          );
        }
      }
    } catch (debugError) {
      console.error("[WebVitals] Debug query failed:", debugError);
    }

    // Query each Web Vital metric from bronze_web_vitals table
    for (const metric of [
      "LCP",
      "FID",
      "CLS",
      "FCP",
      "TTFB",
      "TTI",
      "DCL",
      "Load",
    ]) {
      const query = `
        SELECT 
          metric_name,
          value,
          rating,
          timestamp
        FROM bronze_web_vitals
        WHERE ${whereClause} 
          AND metric_name = ${escapeStr(metric)}
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      console.log(`[WebVitals] Query for ${metric}:`, query);

      try {
        if (dbManager?.db) {
          const result = dbManager.db.exec(query);
          console.log(`[WebVitals] Raw result for ${metric}:`, result);
          if (result && result[0]?.values && result[0].values.length > 0) {
            const row = result[0].values[0];
            const value = row[1];
            const rating = row[2] || "needs-improvement";

            vitals[metric] = {
              value: value,
              rating: rating,
            };
            console.log(`[WebVitals] ${metric}:`, vitals[metric]);
          }
        }
      } catch (queryError) {
        console.error(`[WebVitals] Error querying ${metric}:`, queryError);
      }
    }

    console.log("[WebVitals] Final vitals object:", vitals);
    console.log(
      "[WebVitals] Returning:",
      JSON.stringify({ success: true, vitals }, null, 2)
    );
    return { success: true, vitals };
  } catch (error) {
    console.error("Get Web Vitals error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get settings - returns all settings including variables
async function handleGetSettings() {
  try {
    console.log("[Background] handleGetSettings() called");
    console.log(
      "[Background] settingsManager initialized:",
      settingsManager.initialized
    );

    const settings = await settingsManager.getSettings();

    console.log(
      "[Background] Settings retrieved:",
      settings ? "success" : "failed"
    );
    console.log(
      "[Background] Settings keys:",
      settings ? Object.keys(settings) : "null"
    );
    console.log(
      "[Background] Has variables key:",
      settings?.hasOwnProperty("variables")
    );
    console.log("[Background] Variables object:", settings?.variables);
    console.log(
      "[Background] Variables list length:",
      settings?.variables?.list?.length || 0
    );
    console.log("[Background] Variables list:", settings?.variables?.list);

    return { success: true, settings };
  } catch (error) {
    console.error("[Background] Get settings error:", error);
    return { success: false, error: error.message };
  }
}

// handleGetSessionMetrics removed - session engagement metrics not meaningful
// for single-user browser extension (only tracks developer's own behavior)

// Handle get request types - returns list of available request types
async function handleGetRequestTypes() {
  try {
    const query = `
      SELECT DISTINCT type, COUNT(*) as count
      FROM bronze_requests
      WHERE type IS NOT NULL AND type != ''
      GROUP BY type
      ORDER BY count DESC
    `;

    let requestTypes = [];

    try {
      if (dbManager?.executeQuery) {
        const result = dbManager.executeQuery(query);
        if (result && result[0]?.values) {
          requestTypes = result[0].values.map((row) => ({
            type: row[0],
            count: row[1],
          }));
        }
      }
    } catch (queryError) {
      console.error("Get request types query error:", queryError);
    }

    return { success: true, requestTypes };
  } catch (error) {
    console.error("Get request types error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get detailed requests - returns full request details for table display
async function handleGetDetailedRequests(filters, limit = 100, offset = 0) {
  try {
    const { domain, pageUrl, timeRange, type, statusPrefix, searchQuery } =
      filters || {};

    const timeRangeMs = timeRange ? parseInt(timeRange) * 1000 : 5 * 60 * 1000;
    const startTime = Date.now() - timeRangeMs;

    // Escape SQL strings
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let query = `
      SELECT 
        id, url, method, type, status, status_text,
        duration, size_bytes, timestamp, domain, page_url,
        from_cache, error
      FROM bronze_requests
      WHERE timestamp > ${startTime}
    `;

    // Apply filters (same as handleGetFilteredStats)
    if (domain && domain !== "all") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    if (pageUrl && pageUrl !== "") {
      try {
        const url = new URL(pageUrl);
        query += ` AND page_url = ${escapeStr(pageUrl)}`;
        if (!domain || domain === "all") {
          query += ` AND domain = ${escapeStr(url.hostname)}`;
        }
      } catch (urlError) {
        const domainFromUrl = pageUrl.replace(/^https?:\/\//, "").split("/")[0];
        query += ` AND domain = ${escapeStr(domainFromUrl)}`;
      }
    }

    if (type && type !== "") {
      query += ` AND type = ${escapeStr(type)}`;
    }

    // Add search query filter for URL, method, or status
    if (searchQuery && searchQuery !== "") {
      const searchLower = searchQuery.toLowerCase();
      query += ` AND (LOWER(url) LIKE '%${searchLower.replace(
        /'/g,
        "''"
      )}%' OR LOWER(method) LIKE '%${searchLower.replace(
        /'/g,
        "''"
      )}%' OR CAST(status AS TEXT) LIKE '%${searchLower.replace(
        /'/g,
        "''"
      )}%')`;
    }

    if (statusPrefix) {
      if (statusPrefix === "3xx") {
        query += " AND status >= 300 AND status < 400";
      } else if (statusPrefix === "4xx") {
        query += " AND status >= 400 AND status < 500";
      } else if (statusPrefix === "5xx") {
        query += " AND status >= 500 AND status < 600";
      } else if (statusPrefix === "200") {
        query += " AND status >= 200 AND status < 300";
      } else {
        query += ` AND status = ${parseInt(statusPrefix)}`;
      }
    }

    query += ` ORDER BY timestamp DESC LIMIT ${parseInt(
      limit
    )} OFFSET ${parseInt(offset)}`;

    let requests = [];
    let totalCount = 0;

    try {
      if (dbManager?.db) {
        // Build and execute count query
        let countQuery = `
          SELECT COUNT(*) as total
          FROM bronze_requests
          WHERE timestamp > ${startTime}
        `;

        // Apply same filters to count query
        if (domain && domain !== "all") {
          countQuery += ` AND domain = ${escapeStr(domain)}`;
        }

        if (pageUrl && pageUrl !== "") {
          try {
            const url = new URL(pageUrl);
            countQuery += ` AND page_url = ${escapeStr(pageUrl)}`;
            if (!domain || domain === "all") {
              countQuery += ` AND domain = ${escapeStr(url.hostname)}`;
            }
          } catch (urlError) {
            const domainFromUrl = pageUrl
              .replace(/^https?:\/\//, "")
              .split("/")[0];
            countQuery += ` AND domain = ${escapeStr(domainFromUrl)}`;
          }
        }

        if (type && type !== "") {
          countQuery += ` AND type = ${escapeStr(type)}`;
        }

        if (statusPrefix) {
          if (statusPrefix === "3xx") {
            countQuery += " AND status >= 300 AND status < 400";
          } else if (statusPrefix === "4xx") {
            countQuery += " AND status >= 400 AND status < 500";
          } else if (statusPrefix === "5xx") {
            countQuery += " AND status >= 500 AND status < 600";
          } else if (statusPrefix === "200") {
            countQuery += " AND status >= 200 AND status < 300";
          } else {
            countQuery += ` AND status = ${parseInt(statusPrefix)}`;
          }
        }

        const countResult = dbManager.db.exec(countQuery);
        if (countResult && countResult[0]?.values) {
          totalCount = countResult[0].values[0][0];
        }

        // Get requests with pagination
        const result = dbManager.db.exec(query);
        if (result && result[0]) {
          requests = mapResultToArray(result[0]);
        }
      }
    } catch (queryError) {
      console.error("Get detailed requests query error:", queryError);
    }

    return {
      success: true,
      requests,
      totalCount,
      limit,
      offset,
    };
  } catch (error) {
    console.error("Get detailed requests error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get historical data - returns aggregated data grouped by time period
async function handleGetHistoricalData(filters, groupBy = "hour") {
  try {
    const { domain, pageUrl, type, timeRange } = filters || {};

    const timeRangeMs = timeRange
      ? parseInt(timeRange) * 1000
      : 24 * 60 * 60 * 1000; // Default 24 hours
    const startTime = Date.now() - timeRangeMs;

    // Determine grouping format based on groupBy parameter
    let timeFormat;
    switch (groupBy) {
      case "minute":
        timeFormat = "%Y-%m-%d %H:%M";
        break;
      case "hour":
        timeFormat = "%Y-%m-%d %H:00";
        break;
      case "day":
        timeFormat = "%Y-%m-%d";
        break;
      default:
        timeFormat = "%Y-%m-%d %H:00";
    }

    let query = `
      SELECT 
        strftime('${timeFormat}', datetime(timestamp/1000, 'unixepoch')) as time_bucket,
        COUNT(*) as request_count,
        AVG(duration) as avg_duration,
        MIN(duration) as min_duration,
        MAX(duration) as max_duration,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
        SUM(size_bytes) as total_bytes
      FROM bronze_requests
      WHERE timestamp > ?
    `;

    const params = [startTime];

    // Apply filters
    if (domain && domain !== "all") {
      query += " AND domain = ?";
      params.push(domain);
    }

    if (pageUrl && pageUrl !== "") {
      query += " AND page_url = ?";
      params.push(pageUrl);
    }

    if (type && type !== "") {
      query += " AND type = ?";
      params.push(type);
    }

    query += " GROUP BY time_bucket ORDER BY time_bucket ASC";

    let historicalData = [];

    try {
      if (dbManager?.executeQuery) {
        const result = dbManager.executeQuery(query, params);
        if (result && result[0]?.values) {
          historicalData = result[0].values.map((row) => ({
            timeBucket: row[0],
            requestCount: row[1],
            avgDuration: Math.round(row[2] || 0),
            minDuration: row[3] || 0,
            maxDuration: row[4] || 0,
            errorCount: row[5] || 0,
            totalBytes: row[6] || 0,
          }));
        }
      }
    } catch (queryError) {
      console.error("Get historical data query error:", queryError);
    }

    return {
      success: true,
      data: historicalData,
      groupBy,
      timeRange,
    };
  } catch (error) {
    console.error("Get historical data error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get endpoint analysis - groups requests by API endpoint pattern
async function handleGetEndpointAnalysis(filters) {
  try {
    const { domain, pageUrl, timeRange, type } = filters || {};
    const timeRangeMs = timeRange
      ? parseInt(timeRange) * 1000
      : 24 * 60 * 60 * 1000;
    const startTime = Date.now() - timeRangeMs;

    // Escape SQL strings
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let query = `
      SELECT 
        url,
        COUNT(*) as call_count,
        AVG(duration) as avg_duration,
        MIN(duration) as min_duration,
        MAX(duration) as max_duration,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
        AVG(size_bytes) as avg_size
      FROM bronze_requests
      WHERE timestamp > ${startTime} AND url IS NOT NULL
    `;

    if (domain && domain !== "all") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    if (pageUrl && pageUrl !== "") {
      query += ` AND page_url = ${escapeStr(pageUrl)}`;
    }

    if (type && type !== "") {
      query += ` AND type = ${escapeStr(type)}`;
    }

    query += " GROUP BY url ORDER BY call_count DESC LIMIT 50";

    let endpoints = [];

    try {
      if (dbManager?.db) {
        const result = dbManager.db.exec(query);
        if (result && result[0]?.values) {
          endpoints = result[0].values.map((row) => {
            const url = row[0];
            // Extract endpoint pattern
            let endpoint = url;
            try {
              const urlObj = new URL(url);
              endpoint = urlObj.pathname;
              // Simple pattern matching: replace IDs with placeholders
              endpoint = endpoint.replace(/\/\d+/g, "/:id");
              endpoint = endpoint.replace(/\/[0-9a-f]{8,}/gi, "/:hash");
            } catch (e) {
              // Keep original if URL parsing fails
            }

            return {
              endpoint,
              url,
              callCount: row[1],
              avgDuration: Math.round(row[2] || 0),
              minDuration: row[3] || 0,
              maxDuration: row[4] || 0,
              errorCount: row[5] || 0,
              avgSize: Math.round(row[6] || 0),
              errorRate:
                row[1] > 0 ? (((row[5] || 0) / row[1]) * 100).toFixed(2) : 0,
            };
          });
        }
      }
    } catch (queryError) {
      console.error("Get endpoint analysis query error:", queryError);
    }

    return { success: true, endpoints };
  } catch (error) {
    console.error("Get endpoint analysis error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get Endpoint Performance History - returns time-series performance data for endpoints
// This enables answering: "How has the login API been performing over time?"
// Useful for detecting performance degradation, spikes after PR merges, and regression analysis
async function handleGetEndpointPerformanceHistory(filters = {}) {
  try {
    const {
      domain,
      pageUrl,
      endpoint,
      type,
      timeBucket = "none",
      startTime,
      endTime,
      maxPointsPerEndpoint = 100,
    } = filters;

    // Default time range if not provided
    const actualStartTime = startTime || Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    const actualEndTime = endTime || Date.now();

    // Escape SQL strings
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let query;

    // No bucketing - return individual requests with actual timestamps
    if (timeBucket === "none") {
      query = `
        SELECT 
          timestamp,
          url,
          duration,
          status,
          size_bytes
        FROM bronze_requests
        WHERE timestamp >= ${actualStartTime}
        AND timestamp <= ${actualEndTime}
      `;
    } else {
      // Legacy bucketing support (if ever needed)
      let timeBucketExpr;
      if (timeBucket === "minutely") {
        timeBucketExpr = `strftime('%Y-%m-%d %H:%M:00', timestamp / 1000, 'unixepoch')`;
      } else if (timeBucket === "daily") {
        timeBucketExpr = `strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch')`;
      } else {
        timeBucketExpr = `strftime('%Y-%m-%d %H:00:00', timestamp / 1000, 'unixepoch')`;
      }

      query = `
        SELECT 
          ${timeBucketExpr} as time_bucket,
          url,
          COUNT(*) as request_count,
          AVG(duration) as avg_duration,
          MIN(duration) as min_duration,
          MAX(duration) as max_duration,
          SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
          SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) as server_error_count,
          AVG(size_bytes) as avg_size,
          SUM(size_bytes) as total_size
        FROM bronze_requests
        WHERE timestamp >= ${actualStartTime}
        AND timestamp <= ${actualEndTime}
      `;
    }

    if (domain && domain !== "") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    if (pageUrl && pageUrl !== "") {
      query += ` AND page_url = ${escapeStr(pageUrl)}`;
    }

    if (type && type !== "") {
      query += ` AND type = ${escapeStr(type)}`;
    }

    if (endpoint && endpoint !== "") {
      // Match endpoint pattern - support both exact match and pattern with :id/:hash
      query += ` AND (url LIKE ${escapeStr(
        `%${endpoint}%`
      )} OR url = ${escapeStr(endpoint)})`;
    }

    // Add ordering and limit based on timeBucket mode
    if (timeBucket === "none") {
      query += ` ORDER BY timestamp DESC`;
    } else {
      query += ` GROUP BY time_bucket, url ORDER BY time_bucket DESC, request_count DESC`;
    }

    let history = [];

    try {
      if (dbManager?.db) {
        const result = dbManager.db.exec(query);
        if (result && result[0]?.values) {
          if (timeBucket === "none") {
            // Process individual requests
            history = result[0].values.map((row) => {
              const timestamp = row[0];
              const url = row[1];
              const duration = row[2];
              const status = row[3];
              const sizeBytes = row[4];

              // Extract endpoint pattern
              let endpointPattern = url;
              try {
                const urlObj = new URL(url);
                endpointPattern = urlObj.pathname;
                // Replace IDs and hashes with placeholders for pattern matching
                endpointPattern = endpointPattern.replace(/\/\d+/g, "/:id");
                endpointPattern = endpointPattern.replace(
                  /\/[0-9a-f]{8,}/gi,
                  "/:hash"
                );
              } catch (e) {
                // Keep original if URL parsing fails
              }

              return {
                timestamp,
                url,
                endpoint: endpointPattern,
                duration: Math.round(duration || 0),
                status: status || 0,
                sizeBytes: sizeBytes || 0,
                isError: status >= 400,
              };
            });
          } else {
            // Process bucketed data (legacy support)
            history = result[0].values.map((row) => {
              const url = row[1];
              let endpointPattern = url;
              try {
                const urlObj = new URL(url);
                endpointPattern = urlObj.pathname;
                endpointPattern = endpointPattern.replace(/\/\d+/g, "/:id");
                endpointPattern = endpointPattern.replace(
                  /\/[0-9a-f]{8,}/gi,
                  "/:hash"
                );
              } catch (e) {}

              const requestCount = row[2] || 0;
              const errorCount = row[6] || 0;

              return {
                timeBucket: row[0],
                url,
                endpoint: endpointPattern,
                requestCount,
                avgDuration: Math.round(row[3] || 0),
                minDuration: Math.round(row[4] || 0),
                maxDuration: Math.round(row[5] || 0),
                errorCount,
                serverErrorCount: row[7] || 0,
                avgSize: Math.round(row[8] || 0),
                totalSize: row[9] || 0,
                errorRate:
                  requestCount > 0
                    ? ((errorCount / requestCount) * 100).toFixed(2)
                    : 0,
                successRate:
                  requestCount > 0
                    ? (
                        ((requestCount - errorCount) / requestCount) *
                        100
                      ).toFixed(2)
                    : 100,
              };
            });
          }
        }
      }
    } catch (queryError) {
      console.error(
        "Get endpoint performance history query error:",
        queryError
      );
    }

    // Group by endpoint pattern for easier analysis
    const groupedHistory = {};
    history.forEach((record) => {
      if (!groupedHistory[record.endpoint]) {
        groupedHistory[record.endpoint] = [];
      }
      groupedHistory[record.endpoint].push(record);
    });

    // Calculate aggregate metrics per endpoint for sorting
    const endpointMetrics = Object.keys(groupedHistory).map((endpoint) => {
      const records = groupedHistory[endpoint];

      let totalRequests, avgDuration, totalErrors, avgSize;

      if (timeBucket === "none") {
        // Calculate from individual requests
        totalRequests = records.length;
        avgDuration =
          records.reduce((sum, r) => sum + r.duration, 0) / totalRequests;
        totalErrors = records.filter((r) => r.isError).length;
        avgSize =
          records.reduce((sum, r) => sum + r.sizeBytes, 0) / totalRequests;
      } else {
        // Calculate from bucketed data (legacy)
        totalRequests = records.reduce((sum, r) => sum + r.requestCount, 0);
        avgDuration =
          records.reduce((sum, r) => sum + r.avgDuration, 0) / records.length;
        totalErrors = records.reduce((sum, r) => sum + r.errorCount, 0);
        avgSize =
          records.reduce((sum, r) => sum + r.avgSize, 0) / records.length;
      }

      return {
        endpoint,
        totalRequests,
        avgDuration,
        totalErrors,
        avgSize,
        records,
      };
    });

    // Sort based on criteria
    const sortBy = filters.sortBy || "requests";
    endpointMetrics.sort((a, b) => {
      switch (sortBy) {
        case "slowest":
          return b.avgDuration - a.avgDuration;
        case "errors":
          return b.totalErrors - a.totalErrors;
        case "size":
          return b.avgSize - a.avgSize;
        case "requests":
        default:
          return b.totalRequests - a.totalRequests;
      }
    });

    // Limit to top N endpoints
    const limit = filters.limit || 10;
    const topEndpoints = endpointMetrics.slice(0, limit);

    // Rebuild grouped history with only top endpoints
    const filteredGroupedHistory = {};
    topEndpoints.forEach(({ endpoint, records }) => {
      // If using individual requests, limit points per endpoint
      if (timeBucket === "none") {
        const limitedRecords = records.slice(0, maxPointsPerEndpoint);
        filteredGroupedHistory[endpoint] = limitedRecords;
      } else {
        filteredGroupedHistory[endpoint] = records;
      }
    });

    return {
      success: true,
      history,
      groupedByEndpoint: filteredGroupedHistory,
      timeBucket,
      startTime: actualStartTime,
      endTime: actualEndTime,
      totalEndpoints: Object.keys(groupedHistory).length,
      displayedEndpoints: Object.keys(filteredGroupedHistory).length,
    };
  } catch (error) {
    console.error("Get endpoint performance history error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get request type performance history - tracks performance by request type (fetch, xhr, script, etc.)
async function handleGetRequestTypePerformanceHistory(filters = {}) {
  try {
    const {
      domain,
      pageUrl,
      type,
      timeBucket = "hourly",
      startTime,
      endTime,
    } = filters;

    // Default time range if not provided
    const actualStartTime = startTime || Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days ago
    const actualEndTime = endTime || Date.now();

    // Escape SQL strings
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Time bucket SQL expression
    let timeBucketExpr;
    if (timeBucket === "daily") {
      timeBucketExpr = `strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch')`;
    } else {
      timeBucketExpr = `strftime('%Y-%m-%d %H:00:00', timestamp / 1000, 'unixepoch')`;
    }

    let query = `
      SELECT 
        ${timeBucketExpr} as time_bucket,
        type,
        COUNT(*) as request_count,
        AVG(duration) as avg_duration,
        MIN(duration) as min_duration,
        MAX(duration) as max_duration,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) as server_error_count,
        AVG(size_bytes) as avg_size,
        SUM(size_bytes) as total_size
      FROM bronze_requests
      WHERE timestamp >= ${actualStartTime}
      AND timestamp <= ${actualEndTime}
      AND type IS NOT NULL AND type != ''
    `;

    if (domain && domain !== "") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    if (pageUrl && pageUrl !== "") {
      query += ` AND page_url = ${escapeStr(pageUrl)}`;
    }

    if (type && type !== "") {
      query += ` AND type = ${escapeStr(type)}`;
    }

    query += ` GROUP BY time_bucket, type ORDER BY time_bucket DESC, request_count DESC`;

    console.log("Request Type Performance Query:", query);

    // First, let's check if there's ANY data with type field
    let checkQuery = `SELECT COUNT(*) as total, COUNT(CASE WHEN type IS NOT NULL AND type != '' THEN 1 END) as with_type FROM bronze_requests WHERE timestamp >= ${actualStartTime} AND timestamp <= ${actualEndTime}`;
    if (domain && domain !== "") {
      checkQuery += ` AND domain = ${escapeStr(domain)}`;
    }

    try {
      if (dbManager?.db) {
        const checkResult = dbManager.db.exec(checkQuery);
        if (checkResult && checkResult[0]?.values) {
          console.log("Data availability check:", {
            total: checkResult[0].values[0][0],
            withType: checkResult[0].values[0][1],
            startTime: new Date(actualStartTime).toISOString(),
            endTime: new Date(actualEndTime).toISOString(),
          });
        }
      }
    } catch (checkError) {
      console.error("Check query error:", checkError);
    }

    let history = [];

    try {
      if (dbManager?.db) {
        const result = dbManager.db.exec(query);
        console.log("Query result:", {
          hasResult: !!result,
          hasValues: !!(result && result[0]?.values),
          valueCount: result?.[0]?.values?.length,
        });
        if (result && result[0]?.values) {
          history = result[0].values.map((row) => {
            const requestCount = row[2] || 0;
            const errorCount = row[6] || 0;

            return {
              timeBucket: row[0],
              type: row[1] || "unknown",
              requestCount,
              avgDuration: Math.round(row[3] || 0),
              minDuration: Math.round(row[4] || 0),
              maxDuration: Math.round(row[5] || 0),
              errorCount,
              serverErrorCount: row[7] || 0,
              avgSize: Math.round(row[8] || 0),
              totalSize: row[9] || 0,
              errorRate:
                requestCount > 0
                  ? ((errorCount / requestCount) * 100).toFixed(2)
                  : 0,
              successRate:
                requestCount > 0
                  ? (
                      ((requestCount - errorCount) / requestCount) *
                      100
                    ).toFixed(2)
                  : 100,
            };
          });
        }
      }
    } catch (queryError) {
      console.error(
        "Get request type performance history query error:",
        queryError
      );
    }

    // Group by request type for easier analysis
    const groupedHistory = {};
    history.forEach((record) => {
      if (!groupedHistory[record.type]) {
        groupedHistory[record.type] = [];
      }
      groupedHistory[record.type].push(record);
    });

    console.log("Request Type Performance Result:", {
      historyCount: history.length,
      groupedTypes: Object.keys(groupedHistory),
      timeBucket,
      startTime: new Date(actualStartTime).toISOString(),
      endTime: new Date(actualEndTime).toISOString(),
    });

    // If no data found, check what types exist in the entire database
    if (history.length === 0) {
      try {
        const typesQuery = `SELECT DISTINCT type, COUNT(*) as count FROM bronze_requests WHERE type IS NOT NULL AND type != '' GROUP BY type ORDER BY count DESC LIMIT 10`;
        const typesResult = dbManager.db.exec(typesQuery);
        if (typesResult && typesResult[0]?.values) {
          console.log(
            "Available request types in database:",
            typesResult[0].values
          );
        }
      } catch (typesError) {
        console.error("Error checking available types:", typesError);
      }
    }

    return {
      success: true,
      history,
      groupedByType: groupedHistory,
      timeBucket,
      startTime: actualStartTime,
      endTime: actualEndTime,
    };
  } catch (error) {
    console.error("Get request type performance history error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get API endpoint performance history - tracks individual API endpoints (fetch/xhr) over time
async function handleGetApiEndpointPerformanceHistory(filters = {}) {
  try {
    const {
      domain,
      pageUrl,
      timeBucket = "hourly",
      startTime,
      endTime,
    } = filters;

    const actualStartTime = startTime || Date.now() - 7 * 24 * 60 * 60 * 1000;
    const actualEndTime = endTime || Date.now();

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let timeBucketExpr;
    if (timeBucket === "daily") {
      timeBucketExpr = `strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch')`;
    } else {
      timeBucketExpr = `strftime('%Y-%m-%d %H:00:00', timestamp / 1000, 'unixepoch')`;
    }

    // Focus on API requests (fetch, xmlhttprequest, xhr)
    let query = `
      SELECT 
        ${timeBucketExpr} as time_bucket,
        url,
        method,
        type,
        COUNT(*) as request_count,
        AVG(duration) as avg_duration,
        MIN(duration) as min_duration,
        MAX(duration) as max_duration,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN status >= 500 THEN 1 ELSE 0 END) as server_error_count,
        AVG(size_bytes) as avg_size,
        SUM(size_bytes) as total_size
      FROM bronze_requests
      WHERE timestamp >= ${actualStartTime}
      AND timestamp <= ${actualEndTime}
      AND (type = 'fetch' OR type = 'xmlhttprequest' OR type = 'xhr')
    `;

    if (domain && domain !== "") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    if (pageUrl && pageUrl !== "") {
      query += ` AND page_url = ${escapeStr(pageUrl)}`;
    }

    query += ` GROUP BY time_bucket, url, method ORDER BY time_bucket DESC, request_count DESC`;

    console.log("API Endpoint Performance Query:", query);

    let history = [];

    try {
      if (dbManager?.db) {
        const result = dbManager.db.exec(query);
        if (result && result[0]?.values) {
          history = result[0].values.map((row) => {
            const url = row[1];
            const method = row[2] || "GET";

            // Extract endpoint pattern from URL
            let endpointPattern = url;
            try {
              const urlObj = new URL(url);
              endpointPattern = urlObj.pathname;
              // Replace IDs and hashes with placeholders
              endpointPattern = endpointPattern.replace(/\/\d+/g, "/:id");
              endpointPattern = endpointPattern.replace(
                /\/[0-9a-f]{8,}/gi,
                "/:hash"
              );
            } catch (e) {
              // Keep original if URL parsing fails
            }

            const requestCount = row[4] || 0;
            const errorCount = row[8] || 0;

            return {
              timeBucket: row[0],
              url,
              method,
              type: row[3],
              endpoint: `${method} ${endpointPattern}`,
              requestCount,
              avgDuration: Math.round(row[5] || 0),
              minDuration: Math.round(row[6] || 0),
              maxDuration: Math.round(row[7] || 0),
              errorCount,
              serverErrorCount: row[9] || 0,
              avgSize: Math.round(row[10] || 0),
              totalSize: row[11] || 0,
              errorRate:
                requestCount > 0
                  ? ((errorCount / requestCount) * 100).toFixed(2)
                  : 0,
              successRate:
                requestCount > 0
                  ? (
                      ((requestCount - errorCount) / requestCount) *
                      100
                    ).toFixed(2)
                  : 100,
            };
          });
        }
      }
    } catch (queryError) {
      console.error("Get API endpoint performance query error:", queryError);
    }

    // Group by endpoint pattern (METHOD + path)
    const groupedHistory = {};
    history.forEach((record) => {
      if (!groupedHistory[record.endpoint]) {
        groupedHistory[record.endpoint] = [];
      }
      groupedHistory[record.endpoint].push(record);
    });

    console.log("API Endpoint Performance Result:", {
      historyCount: history.length,
      groupedEndpoints: Object.keys(groupedHistory),
      timeBucket,
    });

    return {
      success: true,
      history,
      groupedByEndpoint: groupedHistory,
      timeBucket,
      startTime: actualStartTime,
      endTime: actualEndTime,
    };
  } catch (error) {
    console.error("Get API endpoint performance error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get resource size breakdown - analyzes resource sizes by type
async function handleGetResourceSizeBreakdown(filters) {
  try {
    if (!dbManager?.db) {
      return { success: false, error: "Database not initialized" };
    }

    const { domain, pageUrl, timeRange } = filters || {};
    const timeRangeMs = timeRange
      ? parseInt(timeRange) * 1000
      : 24 * 60 * 60 * 1000;
    const startTime = Date.now() - timeRangeMs;

    // Escape SQL strings (SQL.js doesn't support ? placeholders)
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let query = `
      SELECT 
        type,
        COUNT(*) as count,
        SUM(size_bytes) as total_bytes,
        AVG(size_bytes) as avg_bytes,
        MAX(size_bytes) as max_bytes
      FROM bronze_requests
      WHERE timestamp > ${startTime} AND type IS NOT NULL AND size_bytes > 0
    `;

    if (domain && domain !== "all") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    if (pageUrl && pageUrl !== "") {
      query += ` AND page_url = ${escapeStr(pageUrl)}`;
    }

    query += " GROUP BY type ORDER BY total_bytes DESC";

    const results = dbManager.db.exec(query);

    let breakdown = [];
    let totalSize = 0;
    let totalCount = 0;

    if (results && results.length > 0) {
      const rows = results[0].values;

      breakdown = rows.map((row) => ({
        type: row[0] || "unknown",
        count: row[1] || 0,
        totalBytes: row[2] || 0,
        avgBytes: Math.round(row[3] || 0),
        maxBytes: row[4] || 0,
      }));

      totalSize = breakdown.reduce((sum, item) => sum + item.totalBytes, 0);
      totalCount = breakdown.reduce((sum, item) => sum + item.count, 0);

      // Add percentage
      breakdown = breakdown.map((item) => ({
        ...item,
        percentage:
          totalSize > 0 ? ((item.totalBytes / totalSize) * 100).toFixed(2) : 0,
      }));
    }

    console.log(
      `✓ Resource breakdown: ${breakdown.length} types, ${totalCount} requests, ${totalSize} bytes`
    );

    return {
      success: true,
      breakdown,
      totalSize,
      totalCount,
    };
  } catch (error) {
    console.error("Get resource size breakdown error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get waterfall data - returns timing data for waterfall visualization
async function handleGetWaterfallData(filters, limit = 50) {
  try {
    const { domain, pageUrl, timeRange, type } = filters || {};
    const timeRangeMs = timeRange ? parseInt(timeRange) * 1000 : 5 * 60 * 1000;
    const startTime = Date.now() - timeRangeMs;

    // Escape SQL strings
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    let query = `
      SELECT 
        id, url, method, type, status, status_text, duration, 
        size_bytes, timestamp, from_cache, domain, page_url
      FROM bronze_requests
      WHERE timestamp > ${startTime}
    `;

    if (domain && domain !== "all") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    if (pageUrl && pageUrl !== "") {
      query += ` AND page_url = ${escapeStr(pageUrl)}`;
    }

    if (type && type !== "") {
      query += ` AND type = ${escapeStr(type)}`;
    }

    query += ` ORDER BY timestamp ASC LIMIT ${parseInt(limit)}`;

    let requests = [];

    try {
      if (dbManager?.db) {
        const result = dbManager.db.exec(query);
        if (result && result[0]) {
          requests = mapResultToArray(result[0]);

          // Enhance with timing phases (simplified for now)
          requests = requests.map((req, index) => {
            const duration = req.duration || 0;
            // Simulate timing phases (in real implementation, use Resource Timing API data)
            return {
              ...req,
              startTime: req.timestamp,
              phases: {
                queued: Math.round(duration * 0.05),
                dns: Math.round(duration * 0.1),
                tcp: Math.round(duration * 0.15),
                ssl: Math.round(duration * 0.1),
                ttfb: Math.round(duration * 0.3),
                download: Math.round(duration * 0.3),
              },
            };
          });
        }
      }
    } catch (queryError) {
      console.error("Get waterfall data query error:", queryError);
    }

    return { success: true, requests };
  } catch (error) {
    console.error("Get waterfall data error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get percentiles analysis - P50, P75, P90, P95, P99 response times
async function handleGetPercentilesAnalysis(filters) {
  try {
    const { domain, pageUrl, timeRange, type } = filters || {};
    const timeRangeMs = timeRange ? parseInt(timeRange) * 1000 : 86400 * 1000;
    const startTime = Date.now() - timeRangeMs;

    let query = `
      SELECT duration
      FROM bronze_requests
      WHERE timestamp > ? AND duration IS NOT NULL
    `;
    const params = [startTime];

    if (domain && domain !== "all") {
      query += " AND domain = ?";
      params.push(domain);
    }

    if (pageUrl && pageUrl !== "") {
      query += " AND page_url = ?";
      params.push(pageUrl);
    }

    if (type && type !== "") {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY duration ASC";

    let durations = [];

    try {
      if (dbManager?.executeQuery) {
        const result = dbManager.executeQuery(query, params);
        if (result && result[0]?.values) {
          durations = result[0].values.map((row) => row[0]);
        }
      }
    } catch (queryError) {
      console.error("Percentiles query error:", queryError);
    }

    // Calculate percentiles
    const percentiles = {};
    if (durations.length > 0) {
      percentiles.p50 = calculatePercentile(durations, 50);
      percentiles.p75 = calculatePercentile(durations, 75);
      percentiles.p90 = calculatePercentile(durations, 90);
      percentiles.p95 = calculatePercentile(durations, 95);
      percentiles.p99 = calculatePercentile(durations, 99);
      percentiles.min = durations[0];
      percentiles.max = durations[durations.length - 1];
      percentiles.count = durations.length;
    }

    return { success: true, percentiles };
  } catch (error) {
    console.error("Get percentiles analysis error:", error);
    return { success: false, error: error.message };
  }
}

// Helper function to calculate percentile
function calculatePercentile(sortedArray, percentile) {
  const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
}

// Handle anomaly detection - detect unusual patterns
async function handleGetAnomalyDetection(filters) {
  try {
    const { domain, pageUrl, timeRange } = filters || {};
    const timeRangeMs = timeRange ? parseInt(timeRange) * 1000 : 86400 * 1000;
    const startTime = Date.now() - timeRangeMs;

    let query = `
      SELECT 
        strftime('%H', datetime(timestamp/1000, 'unixepoch')) as hour,
        COUNT(*) as count,
        AVG(duration) as avgDuration,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors
      FROM bronze_requests
      WHERE timestamp > ?
    `;
    const params = [startTime];

    if (domain && domain !== "all") {
      query += " AND domain = ?";
      params.push(domain);
    }

    if (pageUrl && pageUrl !== "") {
      query += " AND page_url = ?";
      params.push(pageUrl);
    }

    query += " GROUP BY hour ORDER BY hour";

    let hourlyData = [];

    try {
      if (dbManager?.executeQuery) {
        const result = dbManager.executeQuery(query, params);
        if (result && result[0]) {
          hourlyData = mapResultToArray(result[0]);
        }
      }
    } catch (queryError) {
      console.error("Anomaly detection query error:", queryError);
    }

    // Simple anomaly detection: find outliers (values > 2 std deviations from mean)
    const anomalies = [];

    if (hourlyData.length > 0) {
      const counts = hourlyData.map((d) => d.count);
      const durations = hourlyData.map((d) => d.avgDuration);
      const errorRates = hourlyData.map((d) => (d.errors / d.count) * 100);

      const countMean = counts.reduce((a, b) => a + b, 0) / counts.length;
      const countStd = Math.sqrt(
        counts.reduce((sum, val) => sum + Math.pow(val - countMean, 2), 0) /
          counts.length
      );

      const durationMean =
        durations.reduce((a, b) => a + b, 0) / durations.length;
      const durationStd = Math.sqrt(
        durations.reduce(
          (sum, val) => sum + Math.pow(val - durationMean, 2),
          0
        ) / durations.length
      );

      hourlyData.forEach((data, index) => {
        const countZScore = Math.abs(
          (data.count - countMean) / (countStd || 1)
        );
        const durationZScore = Math.abs(
          (data.avgDuration - durationMean) / (durationStd || 1)
        );

        if (countZScore > 2 || durationZScore > 2 || errorRates[index] > 10) {
          anomalies.push({
            hour: data.hour,
            type:
              countZScore > 2
                ? "traffic_spike"
                : durationZScore > 2
                ? "slow_response"
                : "high_errors",
            severity:
              countZScore > 3 || durationZScore > 3 || errorRates[index] > 20
                ? "high"
                : "medium",
            value: data.count,
            avgDuration: Math.round(data.avgDuration),
            errorRate: errorRates[index].toFixed(2),
          });
        }
      });
    }

    return { success: true, anomalies, hourlyData };
  } catch (error) {
    console.error("Get anomaly detection error:", error);
    return { success: false, error: error.message };
  }
}

// Handle trend analysis - compare week-over-week or month-over-month
async function handleGetTrendAnalysis(filters, compareType = "week") {
  try {
    const { domain, pageUrl, type } = filters || {};

    // Define time ranges for comparison
    const now = Date.now();
    const ranges =
      compareType === "week"
        ? {
            current: { start: now - 7 * 24 * 60 * 60 * 1000, end: now },
            previous: {
              start: now - 14 * 24 * 60 * 60 * 1000,
              end: now - 7 * 24 * 60 * 60 * 1000,
            },
          }
        : {
            current: { start: now - 30 * 24 * 60 * 60 * 1000, end: now },
            previous: {
              start: now - 60 * 24 * 60 * 60 * 1000,
              end: now - 30 * 24 * 60 * 60 * 1000,
            },
          };

    const getMetrics = async (startTime, endTime) => {
      let query = `
        SELECT 
          COUNT(*) as totalRequests,
          AVG(duration) as avgDuration,
          SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
          SUM(size_bytes) as totalBytes
        FROM bronze_requests
        WHERE timestamp > ? AND timestamp <= ?
      `;
      const params = [startTime, endTime];

      if (domain && domain !== "all") {
        query += " AND domain = ?";
        params.push(domain);
      }

      if (pageUrl && pageUrl !== "") {
        query += " AND page_url = ?";
        params.push(pageUrl);
      }

      if (type && type !== "") {
        query += " AND type = ?";
        params.push(type);
      }

      if (dbManager?.executeQuery) {
        const result = dbManager.executeQuery(query, params);
        if (result && result[0]?.values && result[0].values[0]) {
          const [requests, duration, errors, bytes] = result[0].values[0];
          return {
            totalRequests: requests || 0,
            avgDuration: Math.round(duration || 0),
            errors: errors || 0,
            totalBytes: bytes || 0,
          };
        }
      }

      return { totalRequests: 0, avgDuration: 0, errors: 0, totalBytes: 0 };
    };

    const currentMetrics = await getMetrics(
      ranges.current.start,
      ranges.current.end
    );
    const previousMetrics = await getMetrics(
      ranges.previous.start,
      ranges.previous.end
    );

    // Calculate changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return (((current - previous) / previous) * 100).toFixed(2);
    };

    const trends = {
      requestsChange: calculateChange(
        currentMetrics.totalRequests,
        previousMetrics.totalRequests
      ),
      durationChange: calculateChange(
        currentMetrics.avgDuration,
        previousMetrics.avgDuration
      ),
      errorsChange: calculateChange(
        currentMetrics.errors,
        previousMetrics.errors
      ),
      bytesChange: calculateChange(
        currentMetrics.totalBytes,
        previousMetrics.totalBytes
      ),
      current: currentMetrics,
      previous: previousMetrics,
      compareType,
    };

    return { success: true, trends };
  } catch (error) {
    console.error("Get trend analysis error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get alert rules
async function handleGetAlertRules() {
  try {
    // Check if alerts table exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS alert_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        metric TEXT NOT NULL,
        condition TEXT NOT NULL,
        threshold REAL NOT NULL,
        domain TEXT,
        enabled INTEGER DEFAULT 1,
        created_at INTEGER
      )
    `;

    if (dbManager?.executeQuery) {
      await dbManager.executeQuery(createTableQuery);

      const query = "SELECT * FROM alert_rules ORDER BY created_at DESC";
      const result = await dbManager.executeQuery(query);

      const rules = result && result[0] ? mapResultToArray(result[0]) : [];
      return { success: true, rules };
    }

    return { success: true, rules: [] };
  } catch (error) {
    console.error("Get alert rules error:", error);
    return { success: false, error: error.message };
  }
}

// Handle save alert rule
async function handleSaveAlertRule(rule) {
  try {
    if (
      !rule ||
      !rule.name ||
      !rule.metric ||
      !rule.condition ||
      rule.threshold === undefined
    ) {
      return { success: false, error: "Invalid rule data" };
    }

    // Ensure table exists
    await handleGetAlertRules();

    if (!dbManager?.executeQuery) {
      return { success: false, error: "Database not available" };
    }

    // Check for duplicate rule with same name and metric
    const checkQuery = `
      SELECT id FROM alert_rules 
      WHERE name = ? AND metric = ? AND domain = ?
      LIMIT 1
    `;

    const checkResult = dbManager.executeQuery(checkQuery, [
      rule.name,
      rule.metric,
      rule.domain || null,
    ]);

    // If duplicate exists, update instead of insert
    if (
      checkResult &&
      checkResult[0] &&
      checkResult[0].values &&
      checkResult[0].values.length > 0
    ) {
      const existingId = checkResult[0].values[0][0];
      const updateQuery = `
        UPDATE alert_rules 
        SET condition = ?, threshold = ?, enabled = ?
        WHERE id = ?
      `;

      await dbManager.executeQuery(updateQuery, [
        rule.condition,
        rule.threshold,
        rule.enabled !== false ? 1 : 0,
        existingId,
      ]);

      return { success: true, message: "Alert rule updated successfully" };
    }

    // Insert new rule
    const insertQuery = `
      INSERT INTO alert_rules (name, metric, condition, threshold, domain, enabled, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      rule.name,
      rule.metric,
      rule.condition,
      rule.threshold,
      rule.domain || null,
      rule.enabled !== false ? 1 : 0,
      Date.now(),
    ];

    await dbManager.executeQuery(insertQuery, params);
    return { success: true, message: "Alert rule saved successfully" };
  } catch (error) {
    console.error("Save alert rule error:", error);
    return { success: false, error: error.message };
  }
}

// Handle delete alert rule
async function handleDeleteAlertRule(ruleId) {
  try {
    if (!ruleId) {
      return { success: false, error: "Rule ID required" };
    }

    const query = "DELETE FROM alert_rules WHERE id = ?";

    if (dbManager?.executeQuery) {
      await dbManager.executeQuery(query, [ruleId]);
      return { success: true, message: "Alert rule deleted successfully" };
    }

    return { success: false, error: "Database not available" };
  } catch (error) {
    console.error("Delete alert rule error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get alert history
async function handleGetAlertHistory(limit = 100) {
  try {
    // Create alert_history table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS alert_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id INTEGER,
        rule_name TEXT,
        triggered_at INTEGER,
        value REAL,
        threshold REAL,
        message TEXT
      )
    `;

    if (dbManager?.executeQuery) {
      await dbManager.executeQuery(createTableQuery);

      const query = `
        SELECT * FROM alert_history 
        ORDER BY triggered_at DESC 
        LIMIT ?
      `;
      const result = await dbManager.executeQuery(query, [limit]);

      const history = result && result[0] ? mapResultToArray(result[0]) : [];
      return { success: true, history };
    }

    return { success: true, history: [] };
  } catch (error) {
    console.error("Get alert history error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get heatmap data - activity by time of day and day of week
async function handleGetHeatmapData(filters) {
  try {
    const { domain, pageUrl, timeRange } = filters || {};
    const timeRangeMs = timeRange
      ? parseInt(timeRange) * 1000
      : 30 * 24 * 60 * 60 * 1000; // Default 30 days
    const startTime = Date.now() - timeRangeMs;

    let query = `
      SELECT 
        strftime('%w', datetime(timestamp/1000, 'unixepoch')) as dayOfWeek,
        strftime('%H', datetime(timestamp/1000, 'unixepoch')) as hour,
        COUNT(*) as count,
        AVG(duration) as avgDuration
      FROM bronze_requests
      WHERE timestamp > ?
    `;
    const params = [startTime];

    if (domain && domain !== "all") {
      query += " AND domain = ?";
      params.push(domain);
    }

    if (pageUrl && pageUrl !== "") {
      query += " AND page_url = ?";
      params.push(pageUrl);
    }

    query += " GROUP BY dayOfWeek, hour ORDER BY dayOfWeek, hour";

    let heatmapData = [];

    try {
      if (dbManager?.executeQuery) {
        const result = dbManager.executeQuery(query, params);
        if (result && result[0]) {
          heatmapData = mapResultToArray(result[0]);
        }
      }
    } catch (queryError) {
      console.error("Heatmap query error:", queryError);
    }

    // Format for heatmap visualization
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const matrix = Array(7)
      .fill(null)
      .map(() => Array(24).fill(0));
    const durationMatrix = Array(7)
      .fill(null)
      .map(() => Array(24).fill(0));

    heatmapData.forEach((d) => {
      const day = parseInt(d.dayOfWeek);
      const hour = parseInt(d.hour);
      matrix[day][hour] = d.count;
      durationMatrix[day][hour] = Math.round(d.avgDuration);
    });

    return {
      success: true,
      heatmap: {
        days: dayNames,
        hours: Array.from({ length: 24 }, (_, i) => `${i}:00`),
        data: matrix,
        durations: durationMatrix,
      },
    };
  } catch (error) {
    console.error("Get heatmap data error:", error);
    return { success: false, error: error.message };
  }
}

// Handle multi-domain comparison
async function handleGetMultiDomainComparison(domains, filters) {
  try {
    if (!domains || domains.length === 0) {
      return { success: false, error: "Domains array required" };
    }

    const { timeRange } = filters || {};
    const timeRangeMs = timeRange ? parseInt(timeRange) * 1000 : 86400 * 1000;
    const startTime = Date.now() - timeRangeMs;

    const results = [];

    for (const domain of domains) {
      const query = `
        SELECT 
          COUNT(*) as totalRequests,
          AVG(duration) as avgDuration,
          SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
          SUM(size_bytes) as totalBytes
        FROM bronze_requests
        WHERE domain = ? AND timestamp > ?
      `;

      try {
        if (dbManager?.executeQuery) {
          const result = dbManager.executeQuery(query, [domain, startTime]);
          if (result && result[0]?.values && result[0].values[0]) {
            const [requests, duration, errors, bytes] = result[0].values[0];
            results.push({
              domain,
              totalRequests: requests || 0,
              avgDuration: Math.round(duration || 0),
              errors: errors || 0,
              totalBytes: bytes || 0,
              errorRate:
                requests > 0 ? ((errors / requests) * 100).toFixed(2) : 0,
            });
          }
        }
      } catch (queryError) {
        console.error(`Query error for domain ${domain}:`, queryError);
      }
    }

    return { success: true, comparison: results };
  } catch (error) {
    console.error("Multi-domain comparison error:", error);
    return { success: false, error: error.message };
  }
}

// Handle performance insights - generate recommendations
async function handleGetPerformanceInsights(filters) {
  try {
    const { domain, pageUrl, timeRange } = filters || {};
    const timeRangeMs = timeRange ? parseInt(timeRange) * 1000 : 86400 * 1000;
    const startTime = Date.now() - timeRangeMs;

    const insights = [];

    let query = `
      SELECT 
        COUNT(*) as totalRequests,
        AVG(duration) as avgDuration,
        MAX(duration) as maxDuration,
        SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
        SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) as cachedRequests,
        SUM(size_bytes) as totalBytes,
        type
      FROM bronze_requests
      WHERE timestamp > ?
    `;
    const params = [startTime];

    if (domain && domain !== "all") {
      query += " AND domain = ?";
      params.push(domain);
    }

    if (pageUrl && pageUrl !== "") {
      query += " AND page_url = ?";
      params.push(pageUrl);
    }

    query += " GROUP BY type";

    try {
      if (dbManager?.executeQuery) {
        const result = dbManager.executeQuery(query, params);
        if (result && result[0]) {
          const typeStats = mapResultToArray(result[0]);

          typeStats.forEach((stat) => {
            // Slow requests insight
            if (stat.avgDuration > 1000) {
              insights.push({
                type: "performance",
                severity: stat.avgDuration > 3000 ? "high" : "medium",
                category: stat.type,
                message: `${stat.type} requests averaging ${Math.round(
                  stat.avgDuration
                )}ms - consider optimization`,
                recommendation:
                  "Optimize server response time, implement caching, or reduce payload size",
              });
            }

            // Low cache hit rate
            const cacheRate = (stat.cachedRequests / stat.totalRequests) * 100;
            if (cacheRate < 30 && stat.type !== "xhr") {
              insights.push({
                type: "caching",
                severity: "medium",
                category: stat.type,
                message: `Only ${cacheRate.toFixed(1)}% of ${
                  stat.type
                } requests cached`,
                recommendation:
                  "Implement browser caching with proper Cache-Control headers",
              });
            }

            // High error rate
            const errorRate = (stat.errors / stat.totalRequests) * 100;
            if (errorRate > 5) {
              insights.push({
                type: "reliability",
                severity: errorRate > 15 ? "high" : "medium",
                category: stat.type,
                message: `${errorRate.toFixed(1)}% error rate for ${
                  stat.type
                } requests`,
                recommendation:
                  "Investigate failed requests and implement better error handling",
              });
            }

            // Large resource size
            const avgSize = stat.totalBytes / stat.totalRequests;
            if (
              avgSize > 500000 &&
              (stat.type === "script" || stat.type === "stylesheet")
            ) {
              insights.push({
                type: "optimization",
                severity: "medium",
                category: stat.type,
                message: `Average ${stat.type} size is ${(
                  avgSize / 1024
                ).toFixed(0)}KB`,
                recommendation:
                  "Minify and compress assets, consider code splitting",
              });
            }
          });
        }
      }
    } catch (queryError) {
      console.error("Performance insights query error:", queryError);
    }

    // Sort by severity
    insights.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return { success: true, insights };
  } catch (error) {
    console.error("Get performance insights error:", error);
    return { success: false, error: error.message };
  }
}

// Handle save setting to database
async function handleSaveSettingToDb(key, value) {
  try {
    if (!dbManager?.executeQuery) {
      return { success: false, error: "Database not available" };
    }

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      if (typeof val === "number") return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    const valueJson = JSON.stringify(value);
    const timestamp = Date.now();

    // Insert or update setting in config_app_settings table (using inline values)
    const query = `
      INSERT OR REPLACE INTO config_app_settings (key, value, category, updated_at)
      VALUES (${escapeStr(key)}, ${escapeStr(
      valueJson
    )}, 'user_preferences', ${timestamp})
    `;

    dbManager.executeQuery(query);

    console.log(`[Settings] Saved ${key} to database`);

    // Also update in-memory settings if settingsManager is available
    if (settingsManager) {
      await settingsManager.initialize();
    }

    return { success: true };
  } catch (error) {
    console.error("Save setting to DB error:", error);
    return { success: false, error: error.message };
  }
}

// Handle load settings from database
async function handleLoadSettingsFromDb() {
  try {
    if (!dbManager?.executeQuery) {
      return { success: false, error: "Database not available" };
    }

    const query = `
      SELECT key, value FROM config_app_settings
      WHERE category = 'user_preferences'
    `;

    const result = dbManager.executeQuery(query);
    const settings = {};

    if (result && result[0]?.values) {
      for (const row of result[0].values) {
        const key = row[0];
        const value = row[1];
        try {
          settings[key] = JSON.parse(value);
        } catch (e) {
          settings[key] = value;
        }
      }
    }

    console.log("[Settings] Loaded from database:", Object.keys(settings));
    return { success: true, settings };
  } catch (error) {
    console.error("Load settings from DB error:", error);
    return { success: false, error: error.message };
  }
}

// Handle sync settings from DB to chrome.storage
async function handleSyncSettingsToStorage() {
  try {
    // Load settings from database
    const dbResult = await handleLoadSettingsFromDb();

    if (!dbResult.success) {
      return dbResult;
    }

    const settings = dbResult.settings;

    // Sync to chrome.storage.sync for content scripts
    if (Object.keys(settings).length > 0) {
      await chrome.storage.sync.set(settings);
      console.log(
        "[Settings] Synced to chrome.storage.sync:",
        Object.keys(settings)
      );
    }

    // Also sync to local storage
    await chrome.storage.local.set(settings);
    console.log(
      "[Settings] Synced to chrome.storage.local:",
      Object.keys(settings)
    );

    return {
      success: true,
      message: `Synced ${
        Object.keys(settings).length
      } settings from database to storage`,
      settings: settings,
    };
  } catch (error) {
    console.error("Sync settings to storage error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Save individual setting to DB with category
 * Used by db-storage-sync utility
 */
async function handleSaveSetting(data) {
  try {
    if (!dbManager?.db) {
      return { success: false, error: "Database not available" };
    }

    const { category, key, value } = data;
    
    if (!category || !key) {
      return { success: false, error: "Category and key are required" };
    }

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      if (typeof val === "number") return val;
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    const timestamp = Date.now();
    let valueStr, dataType;

    // Determine data type and format value
    if (typeof value === 'string') {
      valueStr = escapeStr(value);
      dataType = 'string';
    } else if (typeof value === 'number') {
      valueStr = value;
      dataType = 'number';
    } else if (typeof value === 'boolean') {
      valueStr = value ? 1 : 0;
      dataType = 'boolean';
    } else {
      valueStr = escapeStr(JSON.stringify(value));
      dataType = 'json';
    }

    // Insert or replace in config_app_settings
    const query = `
      INSERT OR REPLACE INTO config_app_settings 
      (key, value, data_type, category, created_at, updated_at)
      VALUES (
        ${escapeStr(key)},
        ${valueStr},
        ${escapeStr(dataType)},
        ${escapeStr(category)},
        COALESCE((SELECT created_at FROM config_app_settings WHERE key = ${escapeStr(key)}), ${timestamp}),
        ${timestamp}
      )
    `;

    dbManager.db.exec(query);
    console.log(`[Settings] Saved ${category}.${key} to database`);

    return { success: true };
  } catch (error) {
    console.error("[Settings] Save setting error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get individual setting from DB by category and key
 * Used by db-storage-sync utility
 */
async function handleGetSetting(data) {
  try {
    if (!dbManager?.db) {
      return { success: false, error: "Database not available" };
    }

    const { category, key } = data;
    
    if (!category || !key) {
      return { success: false, error: "Category and key are required" };
    }

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    const query = `
      SELECT value, data_type FROM config_app_settings
      WHERE category = ${escapeStr(category)} AND key = ${escapeStr(key)}
      LIMIT 1
    `;

    const result = dbManager.db.exec(query);

    if (result && result[0]?.values && result[0].values.length > 0) {
      const row = result[0].values[0];
      const valueStr = row[0];
      const dataType = row[1];

      let value;
      // Parse value based on data type
      if (dataType === 'json') {
        try {
          value = JSON.parse(valueStr);
        } catch (e) {
          value = valueStr;
        }
      } else if (dataType === 'boolean') {
        value = valueStr === 1 || valueStr === '1' || valueStr === true;
      } else if (dataType === 'number') {
        value = parseFloat(valueStr);
      } else {
        value = valueStr;
      }

      console.log(`[Settings] Retrieved ${category}.${key} from database`);
      return { success: true, value };
    }

    return { success: false, error: "Setting not found" };
  } catch (error) {
    console.error("[Settings] Get setting error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all settings by category
 * Used by db-storage-sync utility for batch sync
 */
async function handleGetSettingsByCategory(data) {
  try {
    if (!dbManager?.db) {
      return { success: false, error: "Database not available" };
    }

    const { category } = data;
    
    if (!category) {
      return { success: false, error: "Category is required" };
    }

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    const query = `
      SELECT key, value, data_type FROM config_app_settings
      WHERE category = ${escapeStr(category)}
    `;

    const result = dbManager.db.exec(query);
    const settings = [];

    if (result && result[0]?.values) {
      for (const row of result[0].values) {
        const key = row[0];
        const valueStr = row[1];
        const dataType = row[2];

        let value;
        // Parse value based on data type
        if (dataType === 'json') {
          try {
            value = JSON.parse(valueStr);
          } catch (e) {
            value = valueStr;
          }
        } else if (dataType === 'boolean') {
          value = valueStr === 1 || valueStr === '1' || valueStr === true;
        } else if (dataType === 'number') {
          value = parseFloat(valueStr);
        } else {
          value = valueStr;
        }

        settings.push({ key, value });
      }
    }

    console.log(`[Settings] Retrieved ${settings.length} settings from ${category}`);
    return { success: true, settings };
  } catch (error) {
    console.error("[Settings] Get settings by category error:", error);
    return { success: false, error: error.message };
  }
}

// Handle Export as HAR
async function handleExportAsHAR(filters) {
  try {
    if (!dbManager?.db) {
      return { success: false, error: "Database not initialized" };
    }

    const { domain, timeRange } = filters || {};

    // Escape SQL strings (SQL.js doesn't support ? placeholders)
    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Calculate time range
    const timeRangeMs = timeRange
      ? parseInt(timeRange) * 1000
      : 24 * 60 * 60 * 1000;
    const startTime = Date.now() - timeRangeMs;

    // Build query to get requests based on filters
    let query = `
      SELECT 
        id,
        method,
        url,
        status,
        status_text,
        type,
        duration,
        size_bytes,
        from_cache,
        timestamp,
        domain,
        page_url
      FROM bronze_requests
      WHERE timestamp > ${startTime}
    `;

    // Apply domain filter
    if (domain && domain !== "all") {
      query += ` AND domain = ${escapeStr(domain)}`;
    }

    query += ` ORDER BY timestamp DESC LIMIT 500`;

    // Execute query
    const results = dbManager.db.exec(query);

    if (!results || results.length === 0) {
      return {
        success: true,
        har: {
          log: {
            version: "1.2",
            creator: {
              name: "Universal Request Analyzer",
              version: "1.0.0",
            },
            entries: [],
          },
        },
        count: 0,
      };
    }

    // Parse results
    const columns = results[0].columns;
    const rows = results[0].values;

    const requests = rows.map((row) => {
      const obj = {};
      columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });

    // Build HAR 1.2 format
    const har = {
      log: {
        version: "1.2",
        creator: {
          name: "Universal Request Analyzer",
          version: "1.0.0",
        },
        browser: {
          name: "Chrome/Firefox/Edge",
          version: "Extension",
        },
        pages: [],
        entries: [],
      },
    };

    // Convert requests to HAR entries
    // Note: For simplicity, we're not fetching headers from the separate table
    // This keeps the export fast and the headers are optional in HAR format
    for (const req of requests) {
      const entry = {
        startedDateTime: new Date(req.timestamp).toISOString(),
        time: req.duration || 0,
        request: {
          method: req.method || "GET",
          url: req.url || "",
          httpVersion: "HTTP/1.1",
          cookies: [],
          headers: [], // Headers stored in separate table for performance
          queryString: parseQueryString(req.url),
          headersSize: -1,
          bodySize: 0,
        },
        response: {
          status: req.status || 0,
          statusText: req.status_text || getStatusText(req.status),
          httpVersion: "HTTP/1.1",
          cookies: [],
          headers: [], // Headers stored in separate table for performance
          content: {
            size: req.size_bytes || 0,
            mimeType: getMimeType(req.type),
            text: "",
          },
          redirectURL: "",
          headersSize: -1,
          bodySize: req.size_bytes || 0,
        },
        cache: {
          beforeRequest: req.from_cache ? {} : null,
          afterRequest: req.from_cache ? {} : null,
        },
        timings: {
          blocked: -1,
          dns: -1,
          connect: -1,
          send: 0,
          wait: req.duration || 0,
          receive: 0,
          ssl: -1,
        },
        serverIPAddress: "",
        connection: "",
        comment: req.domain
          ? `Domain: ${req.domain}, Page: ${req.page_url || "N/A"}`
          : "",
      };

      har.log.entries.push(entry);
    }

    console.log(`✓ Exported ${har.log.entries.length} requests as HAR`);

    return {
      success: true,
      har: har,
      count: har.log.entries.length,
    };
  } catch (error) {
    console.error("Export HAR error:", error);
    return { success: false, error: error.message };
  }
}

// Helper: Parse headers from JSON string
function parseHeaders(headersJson) {
  if (!headersJson) return [];
  try {
    const headers = JSON.parse(headersJson);
    return Object.entries(headers).map(([name, value]) => ({
      name,
      value: String(value),
    }));
  } catch {
    return [];
  }
}

// Helper: Parse query string from URL
function parseQueryString(url) {
  if (!url) return [];
  try {
    const urlObj = new URL(url);
    const params = [];
    urlObj.searchParams.forEach((value, name) => {
      params.push({ name, value });
    });
    return params;
  } catch {
    return [];
  }
}

// Helper: Get HTTP status text
function getStatusText(status) {
  const statusTexts = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };
  return statusTexts[status] || "";
}

// Helper: Get MIME type from resource type
function getMimeType(type) {
  const mimeTypes = {
    script: "application/javascript",
    stylesheet: "text/css",
    image: "image/*",
    font: "font/*",
    document: "text/html",
    xmlhttprequest: "application/json",
    fetch: "application/json",
  };
  return mimeTypes[type] || "application/octet-stream";
}

// Handle Get Recent Errors
async function handleGetRecentErrors(data) {
  try {
    if (!dbManager) {
      return { success: false, error: "Database manager not initialized" };
    }

    const { url, timeRange } = data;
    const timestampCutoff = Date.now() - (timeRange || 300000); // Default 5 minutes

    // Get domain from URL
    let domain = "";
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch {
      return { success: false, error: "Invalid URL" };
    }

    // Query for recent errors from current domain
    const query = `
      SELECT 
        url,
        status,
        method,
        type,
        timestamp,
        error
      FROM bronze_requests
      WHERE domain = ?
        AND status >= 400
        AND timestamp > ?
      ORDER BY timestamp DESC
      LIMIT 5
    `;

    const queryResult = dbManager.executeQuery(query, [
      domain,
      timestampCutoff,
    ]);

    // Parse result from sql.js format
    const errors =
      queryResult && queryResult[0] && queryResult[0].values
        ? queryResult[0].values.map((row) => {
            const obj = {};
            queryResult[0].columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          })
        : [];

    return {
      success: true,
      errors: errors,
    };
  } catch (error) {
    console.error("Get recent errors error:", error);
    return { success: false, error: error.message };
  }
}

// Handle get recent requests
async function handleGetRecentRequests(data) {
  try {
    if (!dbManager || !dbManager.db) {
      return { success: false, error: "Database not available" };
    }

    const limit = data?.limit || 10;

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Get recent requests from silver_requests
    const query = `
      SELECT 
        id,
        url,
        method,
        status,
        duration,
        timestamp,
        type,
        domain,
        page_url,
        size_bytes as size,
        status_text
      FROM silver_requests
      ORDER BY timestamp DESC
      LIMIT ${parseInt(limit)}
    `;

    const queryResult = dbManager.db.exec(query);

    const requests =
      queryResult.length > 0 && queryResult[0].values
        ? queryResult[0].values.map((row) => {
            const obj = {};
            queryResult[0].columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          })
        : [];

    return {
      success: true,
      requests: requests,
    };
  } catch (error) {
    console.error("Get recent requests error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// REQUEST RUNNER HANDLERS
// ============================================================

/**
 * Run a collection of requests
 */
async function handleRunRequests(config, requests) {
  try {
    if (!requests || requests.length === 0) {
      return { success: false, error: "No requests provided" };
    }

    // Combine config and requests into a single config object
    const runConfig = {
      ...config,
      requests: requests,
    };

    // Start the run with progress callback
    const result = await requestRunner.runRequests(runConfig, (progress) => {
      // Progress updates are sent via runtime.sendMessage from background
      // UI polls via getRunnerProgress
    });

    return {
      success: true,
      runId: result.id,
      status: result.status,
    };
  } catch (error) {
    console.error("Run requests error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current runner progress
 */
async function handleGetRunnerProgress() {
  try {
    const progress = requestRunner.getProgress();
    return {
      success: true,
      progress,
    };
  } catch (error) {
    console.error("Get runner progress error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel active run
 */
async function handleCancelRun() {
  try {
    const cancelled = requestRunner.cancelRun();
    return {
      success: true,
      cancelled,
    };
  } catch (error) {
    console.error("Cancel run error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get run history
 */
async function handleGetRunHistory(limit = 10) {
  try {
    const history = requestRunner.getHistory(limit);
    return {
      success: true,
      history,
    };
  } catch (error) {
    console.error("Get run history error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get specific run results
 */
async function handleGetRunResults(runId) {
  try {
    const results = requestRunner.getRunResults(runId);
    if (!results) {
      return { success: false, error: "Run not found" };
    }

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error("Get run results error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// RUNNER COLLECTIONS HANDLERS
// ============================================================

/**
 * Create a new runner collection
 */
async function handleCreateRunnerCollection(message) {
  try {
    const { name, description, requests, config } = message;
    const collection = await runnerCollections.createCollection(
      name,
      description,
      requests,
      config
    );

    return {
      success: true,
      collection,
    };
  } catch (error) {
    console.error("Create runner collection error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all runner collections
 */
async function handleGetRunnerCollections() {
  try {
    const collections = await runnerCollections.getCollections();

    return {
      success: true,
      collections,
    };
  } catch (error) {
    console.error("Get runner collections error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get specific runner collection
 */
async function handleGetRunnerCollection(collectionId) {
  try {
    const collection = await runnerCollections.getCollection(collectionId);
    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    return {
      success: true,
      collection,
    };
  } catch (error) {
    console.error("Get runner collection error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update runner collection
 */
async function handleUpdateRunnerCollection(collectionId, updates) {
  try {
    const collection = await runnerCollections.updateCollection(
      collectionId,
      updates
    );

    return {
      success: true,
      collection,
    };
  } catch (error) {
    console.error("Update runner collection error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete runner collection
 */
async function handleDeleteRunnerCollection(collectionId) {
  try {
    const deleted = await runnerCollections.deleteCollection(collectionId);

    return {
      success: deleted,
    };
  } catch (error) {
    console.error("Delete runner collection error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Run a saved collection
 */
async function handleRunCollection(collectionId) {
  try {
    const collection = await runnerCollections.getCollection(collectionId);
    if (!collection) {
      return { success: false, error: "Collection not found" };
    }

    // Add collection ID to config
    const config = {
      ...collection.config,
      collectionId: collection.id,
    };

    // Start the run
    const result = await requestRunner.runRequests(config, (progress) => {
      // Progress updates handled by polling
    });

    return {
      success: true,
      runId: result.id,
      status: result.status,
    };
  } catch (error) {
    console.error("Run collection error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// RUNNER SCHEDULING HANDLERS
// ============================================================

/**
 * Schedule a runner
 */
async function handleScheduleRunner(collectionId, scheduleConfig) {
  try {
    const schedule = await runnerCollections.scheduleRun(
      collectionId,
      scheduleConfig
    );

    return {
      success: true,
      schedule,
    };
  } catch (error) {
    console.error("Schedule runner error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all scheduled runs
 */
async function handleGetScheduledRuns() {
  try {
    const schedules = await runnerCollections.getScheduledRuns();

    return {
      success: true,
      schedules,
    };
  } catch (error) {
    console.error("Get scheduled runs error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update scheduled run
 */
async function handleUpdateScheduledRun(scheduleId, updates) {
  try {
    const schedule = await runnerCollections.updateScheduledRun(
      scheduleId,
      updates
    );

    return {
      success: true,
      schedule,
    };
  } catch (error) {
    console.error("Update scheduled run error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete scheduled run
 */
async function handleDeleteScheduledRun(scheduleId) {
  try {
    const deleted = await runnerCollections.deleteScheduledRun(scheduleId);

    return {
      success: deleted,
    };
  } catch (error) {
    console.error("Delete scheduled run error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// RUNNER ALERTS HANDLERS
// ============================================================

/**
 * Create runner alert
 */
async function handleCreateRunnerAlert(alert) {
  try {
    if (!dbManager || !dbManager.db) {
      return { success: false, error: "Database not initialized" };
    }

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    const now = Date.now();

    const query = `
      INSERT INTO runner_alerts (
        collection_id,
        collection_name,
        alert_type,
        condition,
        threshold_value,
        comparison,
        enabled,
        notification_type,
        created_at,
        updated_at
      ) VALUES (
        ${escapeStr(alert.collectionId)},
        ${escapeStr(alert.collectionName)},
        ${escapeStr(alert.alertType)},
        ${escapeStr(alert.condition)},
        ${alert.thresholdValue},
        ${escapeStr(alert.comparison)},
        ${alert.enabled ? 1 : 0},
        ${escapeStr(alert.notificationType)},
        ${now},
        ${now}
      )
    `;

    dbManager.db.exec(query);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Create runner alert error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get runner alerts
 */
async function handleGetRunnerAlerts(collectionId) {
  try {
    if (!dbManager || !dbManager.db) {
      return { success: false, error: "Database not initialized" };
    }

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    const whereClause = collectionId
      ? `WHERE collection_id = ${escapeStr(collectionId)}`
      : "";

    const query = `
      SELECT * FROM runner_alerts
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = dbManager.db.exec(query);

    const alerts =
      result.length > 0 && result[0].values
        ? result[0].values.map((row) => {
            const obj = {};
            result[0].columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          })
        : [];

    return {
      success: true,
      alerts,
    };
  } catch (error) {
    console.error("Get runner alerts error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update runner alert
 */
async function handleUpdateRunnerAlert(alertId, updates) {
  try {
    if (!dbManager || !dbManager.db) {
      return { success: false, error: "Database not initialized" };
    }

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    const setClauses = [];
    if (updates.enabled !== undefined) {
      setClauses.push(`enabled = ${updates.enabled ? 1 : 0}`);
    }
    if (updates.thresholdValue !== undefined) {
      setClauses.push(`threshold_value = ${updates.thresholdValue}`);
    }
    if (updates.notificationType) {
      setClauses.push(
        `notification_type = ${escapeStr(updates.notificationType)}`
      );
    }

    setClauses.push(`updated_at = ${Date.now()}`);

    const query = `
      UPDATE runner_alerts
      SET ${setClauses.join(", ")}
      WHERE id = ${parseInt(alertId)}
    `;

    dbManager.db.exec(query);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Update runner alert error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete runner alert
 */
async function handleDeleteRunnerAlert(alertId) {
  try {
    if (!dbManager || !dbManager.db) {
      return { success: false, error: "Database not initialized" };
    }

    const query = `
      DELETE FROM runner_alerts
      WHERE id = ${parseInt(alertId)}
    `;

    dbManager.db.exec(query);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete runner alert error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// RUNNER DATABASE OPERATIONS (Unified Architecture)
// ============================================================

/**
 * Create a new runner definition with requests
 */
async function handleCreateRunner(definition, requests) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    const runnerId = await dbManager.runner.createRunner(definition, requests);

    return {
      success: true,
      runnerId,
    };
  } catch (error) {
    console.error("Create runner error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get runner definition by ID
 */
async function handleGetRunnerDefinition(runnerId) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    const runner = await dbManager.runner.getRunnerDefinition(runnerId);

    if (!runner) {
      return { success: false, error: "Runner not found" };
    }

    // Also fetch the requests for this runner
    const requests = await dbManager.runner.getRunnerRequests(runnerId);

    return {
      success: true,
      runner,
      requests: requests || [],
    };
  } catch (error) {
    console.error("Get runner definition error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all runners (permanent + recent temporary)
 */
async function handleGetAllRunners(data) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    // Extract pagination and search options from data
    const options = {
      offset: data?.offset || 0,
      limit: data?.limit || 50,
      searchQuery: data?.searchQuery || null
    };

    const result = await dbManager.runner.getAllRunners(options);

    return {
      success: true,
      runners: result.runners || [],
      totalCount: result.totalCount || 0,
    };
  } catch (error) {
    console.error("Get all runners error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Run a runner by ID (loads from database and executes)
 */
async function handleRunRunner(runnerId) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    // Use request-runner to execute by ID
    const result = await requestRunner.runRunner(runnerId, (progress) => {
      // Progress updates available via getRunnerProgress
    });

    return {
      success: true,
      executionId: result.id,
      status: result.status,
    };
  } catch (error) {
    console.error("Run runner error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get execution history for a runner
 */
async function handleGetRunnerHistory(runnerId, limit = 10) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    const executions = await dbManager.runner.getRunnerExecutions(
      runnerId,
      limit
    );

    return {
      success: true,
      executions,
    };
  } catch (error) {
    console.error("Get runner history error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get detailed results for an execution
 */
async function handleGetExecutionResults(executionId) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    const results = await dbManager.runner.getExecutionResults(executionId);

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error("Get execution results error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Convert a temporary runner to a saved runner
 * NOTE: With collection_id pattern, all runners are "saved" - they are either
 * part of a collection (collection_id = ID) or standalone (collection_id = NULL).
 * Use cleanupTemporaryRunners to remove old standalone runners if needed.
 */
async function handleConvertToSavedRunner(runnerId) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    // With new schema, runners don't need "conversion" - they're already saved
    // If you want to add to a collection, use updateRunnerDefinition with collection_id
    console.log(
      "[Runner] Convert no longer needed - all runners are persistent"
    );

    return {
      success: true,
      message:
        "Runner is already saved. Use 'Add to Collection' to organize runners.",
    };
  } catch (error) {
    console.error("Convert to saved runner error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update runner name and description
 */
async function handleUpdateRunnerMetadata(runnerId, name, description) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    await dbManager.runner.updateRunnerDefinition(runnerId, updates);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Update runner metadata error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Clean up old temporary runners
 */
async function handleCleanupTemporaryRunners(daysOld = 7) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    const count = await dbManager.runner.cleanupTemporaryRunners(daysOld);

    return {
      success: true,
      deletedCount: count,
    };
  } catch (error) {
    console.error("Cleanup temporary runners error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a runner definition and all its executions
 */
async function handleDeleteRunner(runnerId) {
  try {
    if (!dbManager || !dbManager.runner) {
      return { success: false, error: "Database not initialized" };
    }

    // Delete runner and cascade to related tables
    await dbManager.runner.deleteRunner(runnerId);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Delete runner error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Ensure runner tables exist (manual trigger)
 */
async function handleEnsureRunnerTables() {
  try {
    if (!dbManager || !dbManager.executeQuery) {
      return { success: false, error: "Database not initialized" };
    }

    // Try to query runner tables to see if they exist
    try {
      dbManager.executeQuery("SELECT COUNT(*) FROM config_runner_definitions");
      return { success: true, message: "Runner tables already exist" };
    } catch (e) {
      // Tables don't exist, create them
      console.log("[Runners] Creating runner tables manually...");

      // Create runner tables
      const createQueries = [
        `CREATE TABLE IF NOT EXISTS config_runner_definitions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          collection_id TEXT,
          execution_mode TEXT NOT NULL CHECK(execution_mode IN ('sequential', 'parallel')),
          delay_ms INTEGER DEFAULT 0,
          follow_redirects BOOLEAN DEFAULT 1,
          validate_status BOOLEAN DEFAULT 0,
          use_variables BOOLEAN DEFAULT 1,
          header_overrides TEXT,
          is_active BOOLEAN DEFAULT 1,
          run_count INTEGER DEFAULT 0,
          last_run_at INTEGER,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_runner_definitions_collection ON config_runner_definitions(collection_id, created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_runner_definitions_active ON config_runner_definitions(is_active, created_at)`,
        `CREATE TABLE IF NOT EXISTS config_runner_requests (
          id TEXT PRIMARY KEY,
          runner_id TEXT NOT NULL,
          sequence_order INTEGER NOT NULL,
          url TEXT NOT NULL,
          method TEXT NOT NULL DEFAULT 'GET',
          headers TEXT,
          body TEXT,
          domain TEXT NOT NULL,
          page_url TEXT NOT NULL,
          captured_request_id TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(runner_id) REFERENCES config_runner_definitions(id) ON DELETE CASCADE,
          UNIQUE(runner_id, sequence_order)
        )`,
        `CREATE INDEX IF NOT EXISTS idx_runner_requests_runner ON config_runner_requests(runner_id, sequence_order)`,
        `CREATE TABLE IF NOT EXISTS bronze_runner_executions (
          id TEXT PRIMARY KEY,
          runner_id TEXT NOT NULL,
          runner_name TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
          execution_mode TEXT NOT NULL,
          start_time INTEGER NOT NULL,
          end_time INTEGER,
          duration INTEGER,
          total_requests INTEGER NOT NULL,
          completed_requests INTEGER DEFAULT 0,
          success_count INTEGER DEFAULT 0,
          failure_count INTEGER DEFAULT 0,
          error_message TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(runner_id) REFERENCES config_runner_definitions(id) ON DELETE CASCADE
        )`,
        `CREATE INDEX IF NOT EXISTS idx_runner_executions_runner ON bronze_runner_executions(runner_id, start_time DESC)`,
        `CREATE TABLE IF NOT EXISTS bronze_runner_execution_results (
          id TEXT PRIMARY KEY,
          execution_id TEXT NOT NULL,
          runner_request_id TEXT NOT NULL,
          logged_request_id TEXT,
          status INTEGER,
          duration INTEGER,
          success BOOLEAN NOT NULL,
          error_message TEXT,
          created_at INTEGER NOT NULL,
          FOREIGN KEY(execution_id) REFERENCES bronze_runner_executions(id) ON DELETE CASCADE,
          FOREIGN KEY(runner_request_id) REFERENCES config_runner_requests(id) ON DELETE CASCADE,
          FOREIGN KEY(logged_request_id) REFERENCES bronze_requests(id) ON DELETE SET NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_runner_results_execution ON bronze_runner_execution_results(execution_id)`,
      ];

      for (const query of createQueries) {
        dbManager.executeQuery(query);
      }

      // Save to OPFS
      if (dbManager.saveDatabase) {
        await dbManager.saveDatabase();
      }

      console.log("[Runners] ✓ Runner tables created successfully");
      return { success: true, message: "Runner tables created" };
    }
  } catch (error) {
    console.error("Ensure runner tables error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get distinct domains from bronze_requests
 * Note: Prefer using getDomains with timeRange for better performance
 */
async function handleGetDistinctDomains() {
  try {
    if (!dbManager || !dbManager.executeQuery) {
      return { success: false, error: "Database not initialized" };
    }

    const query = `
      SELECT DISTINCT domain, COUNT(*) as request_count
      FROM bronze_requests 
      WHERE domain IS NOT NULL AND domain != ''
      GROUP BY domain
      ORDER BY request_count DESC
    `;

    const result = dbManager.executeQuery(query);
    let domains = [];

    if (result && result[0]?.values) {
      domains = result[0].values.map((row) => ({
        domain: row[0],
        requestCount: row[1],
      }));
    }

    return { success: true, domains: domains };
  } catch (error) {
    console.error("Get distinct domains error:", error);
    return { success: false, error: error.message, domains: [] };
  }
}

/**
 * Get requests filtered by domain, page, and type
 */
async function handleGetRequestsByFilters(filters) {
  try {
    if (!dbManager || !dbManager.db) {
      return { success: false, error: "Database not initialized" };
    }

    const { domain, pageUrl, type } = filters;

    if (!domain) {
      return { success: false, error: "Domain is required" };
    }

    const escapeStr = (val) => {
      if (val === undefined || val === null) return "NULL";
      return `'${String(val).replace(/'/g, "''")}'`;
    };

    // Add time filter to get recent requests (last 7 days)
    const timeRangeMs = 7 * 24 * 60 * 60 * 1000;
    const startTime = Date.now() - timeRangeMs;

    // Get requests without headers/body (fetch those on-demand in Step 3)
    let query = `
      SELECT id, url, method, type, timestamp, status, duration, page_url
      FROM bronze_requests 
      WHERE domain = ${escapeStr(domain)}
        AND timestamp > ${startTime}
    `;

    if (pageUrl) {
      query += ` AND page_url = ${escapeStr(pageUrl)}`;
    }

    if (type) {
      query += ` AND type = ${escapeStr(type)}`;
    }

    query += ` ORDER BY timestamp DESC LIMIT 500`;

    // Execute query and parse SQL.js result format
    const result = dbManager.db.exec(query);
    let requests = [];

    if (result && result[0]?.values) {
      // Map SQL.js result format to objects
      const columns = result[0].columns;
      requests = result[0].values.map((row) => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        return obj;
      });
    }

    return { success: true, requests: requests };
  } catch (error) {
    console.error("Get requests by filters error:", error);
    return { success: false, error: error.message, requests: [] };
  }
}

/**
 * Export database to SQLite format
 * Returns Uint8Array serialized as regular array for message passing
 */
async function handleExportToSQLite(options = {}) {
  try {
    if (!dbManager?.db) {
      return { success: false, error: "Database not available" };
    }

    console.log("[Export] Starting SQLite export with options:", options);

    // Export the database
    const data = dbManager.db.export();
    const uint8Data = new Uint8Array(data);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `URA_Export_${timestamp}.sqlite`;

    console.log(`[Export] SQLite export complete: ${uint8Data.length} bytes`);

    return {
      success: true,
      data: Array.from(uint8Data), // Serialize for chrome.runtime.sendMessage
      filename,
      size: uint8Data.length,
      mimeType: 'application/x-sqlite3'
    };
  } catch (error) {
    console.error("[Export] SQLite export error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Export database to JSON format
 * Structure: { database: { tableName: [rows...] }, metadata: {...} }
 */
async function handleExportToJSON(options = {}) {
  try {
    if (!dbManager?.db) {
      return { success: false, error: "Database not available" };
    }

    console.log("[Export] Starting JSON export with options:", options);

    const { tables = null, prettify = true } = options;

    // Get all table names or use specified ones
    const tableNamesResult = dbManager.db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    const allTables = tableNamesResult[0]?.values.map(row => row[0]) || [];
    const tablesToExport = tables || allTables;

    console.log(`[Export] Exporting ${tablesToExport.length} tables to JSON`);

    // Build export data
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: chrome.runtime.getManifest()?.version || 'unknown',
        tables: tablesToExport,
        recordCounts: {}
      },
      database: {}
    };

    // Export each table
    for (const tableName of tablesToExport) {
      try {
        const result = dbManager.db.exec(`SELECT * FROM ${tableName}`);
        
        if (result.length > 0) {
          const columns = result[0].columns;
          const rows = result[0].values.map(row => {
            const obj = {};
            columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          });

          exportData.database[tableName] = rows;
          exportData.metadata.recordCounts[tableName] = rows.length;
        } else {
          exportData.database[tableName] = [];
          exportData.metadata.recordCounts[tableName] = 0;
        }
      } catch (tableError) {
        console.warn(`[Export] Failed to export table ${tableName}:`, tableError);
        exportData.database[tableName] = [];
        exportData.metadata.recordCounts[tableName] = 0;
      }
    }

    // Convert to JSON string
    const jsonString = JSON.stringify(exportData, null, prettify ? 2 : 0);
    const jsonBytes = new TextEncoder().encode(jsonString);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `URA_Export_${timestamp}.json`;

    console.log(`[Export] JSON export complete: ${jsonBytes.length} bytes`);

    return {
      success: true,
      data: Array.from(jsonBytes), // Serialize for chrome.runtime.sendMessage
      filename,
      size: jsonBytes.length,
      mimeType: 'application/json',
      tableCount: tablesToExport.length,
      totalRecords: Object.values(exportData.metadata.recordCounts).reduce((a, b) => a + b, 0)
    };
  } catch (error) {
    console.error("[Export] JSON export error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Export database to CSV format (one CSV per table, packaged in ZIP)
 * Note: Full ZIP implementation requires additional library
 * For now, returns CSV data for single table or instructions for multiple
 */
async function handleExportToCSV(options = {}) {
  try {
    if (!dbManager?.db) {
      return { success: false, error: "Database not available" };
    }

    console.log("[Export] Starting CSV export with options:", options);

    const { tables = null, tableName = null } = options;

    // If single table specified, export just that table as CSV
    if (tableName) {
      const result = dbManager.db.exec(`SELECT * FROM ${tableName}`);
      
      if (result.length === 0) {
        return {
          success: false,
          error: `Table ${tableName} is empty or does not exist`
        };
      }

      const columns = result[0].columns;
      const rows = result[0].values;

      // Build CSV
      let csv = columns.join(',') + '\n';
      for (const row of rows) {
        const escapedRow = row.map(val => {
          if (val === null) return '';
          const str = String(val);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csv += escapedRow.join(',') + '\n';
      }

      const csvBytes = new TextEncoder().encode(csv);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `${tableName}_${timestamp}.csv`;

      console.log(`[Export] CSV export complete for ${tableName}: ${csvBytes.length} bytes`);

      return {
        success: true,
        data: Array.from(csvBytes),
        filename,
        size: csvBytes.length,
        mimeType: 'text/csv',
        recordCount: rows.length
      };
    }

    // Multiple tables - return info about tables available
    const tableNamesResult = dbManager.db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);

    const allTables = tableNamesResult[0]?.values.map(row => row[0]) || [];

    return {
      success: true,
      message: 'Multiple table export requires specifying tableName',
      availableTables: allTables,
      hint: 'Call with { tableName: "table_name" } to export a specific table'
    };
  } catch (error) {
    console.error("[Export] CSV export error:", error);
    return { success: false, error: error.message };
  }
}
