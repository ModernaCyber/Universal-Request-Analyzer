// Updated Database Manager with Medallion Architecture Integration

import { initSqlJs } from "./sql-js-loader.js";
import { DatabaseError } from "../errors/error-types.js";
import {
  createMedallionSchema,
  initializeDefaultConfig,
  validateAndFixSchema,
} from "./medallion-schema.js";
import { createMedallionManager } from "./medallion-manager.js";
import { createConfigSchemaManager } from "./config-schema-manager.js";
import {
  migrateToMedallionArchitecture,
  isMedallionMigrationComplete,
  fixMissingDomains,
} from "./medallion-migration.js";

let db = null;
let medallionManager = null;
let configManager = null;
let eventBus = null;
let isSaving = false;
let autoSaveInterval = null;
const DB_FILE_NAME = "universal_request_analyzer.sqlite";

/**
 * Load database from OPFS (Origin Private File System)
 */
async function loadDatabaseFromOPFS() {
  try {
    const fsHandle = await navigator.storage.getDirectory();
    const fileHandle = await fsHandle.getFileHandle(DB_FILE_NAME, {
      create: true,
    });
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  } catch (error) {
    console.warn(
      "Failed to load database from OPFS. Creating a new one.",
      error
    );
    return null;
  }
}

/**
 * Save database to OPFS
 */
async function saveDatabaseToOPFS(data) {
  try {
    const fsHandle = await navigator.storage.getDirectory();
    const fileHandle = await fsHandle.getFileHandle(DB_FILE_NAME, {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    console.log("Database saved to OPFS.");
  } catch (error) {
    console.error("Failed to save database to OPFS.", error);
  }
}

/**
 * Initialize the database with medallion architecture
 */
async function initializeDatabase() {
  try {
    const SQL = await initSqlJs();

    // Load existing database or create new one
    const data = await loadDatabaseFromOPFS();
    const dbInstance = data ? new SQL.Database(data) : new SQL.Database();

    // Check if medallion migration has been completed
    const migrationComplete = await isMedallionMigrationComplete(dbInstance);

    if (!migrationComplete) {
      console.log("Initializing medallion architecture...");

      // Create medallion schema
      await createMedallionSchema(dbInstance);
      await initializeDefaultConfig(dbInstance);

      // Migrate existing data if any
      await migrateToMedallionArchitecture(dbInstance, eventBus);
    } else {
      console.log("Medallion architecture already initialized");
    }

    // ALWAYS validate and fix schema (handles upgrades and schema changes)
    console.log("Validating database schema...");
    await validateAndFixSchema(dbInstance);

    // Fix any existing rows with missing domains (from before the fix)
    try {
      await fixMissingDomains(dbInstance);
    } catch (error) {
      console.warn("Failed to fix missing domains:", error);
      // Don't fail initialization if this fails
    }

    return dbInstance;
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw new DatabaseError("Database initialization failed", error);
  }
}

/**
 * Setup auto-save mechanism
 */
function setupAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  // Auto-save every 30 seconds
  autoSaveInterval = setInterval(async () => {
    await saveDatabase();
  }, 30000);
}

/**
 * Save database to OPFS
 */
export async function saveDatabase() {
  if (!db || isSaving) {
    return;
  }

  try {
    isSaving = true;
    const data = db.export();
    await saveDatabaseToOPFS(data);

    eventBus?.publish("database:saved", { timestamp: Date.now() });
  } catch (error) {
    console.error("Failed to save database:", error);
    eventBus?.publish("database:error", {
      error: "save_failed",
      message: error.message,
    });
  } finally {
    isSaving = false;
  }
}

/**
 * Initialize the database manager
 */
export async function initDatabase(dbConfig, encryptionMgr, events) {
  try {
    eventBus = events;

    // Initialize database
    db = await initializeDatabase();

    // Initialize medallion manager
    medallionManager = createMedallionManager(db, eventBus);

    // Initialize config manager
    configManager = createConfigSchemaManager(db, eventBus);

    // Setup auto-save
    setupAutoSave();

    // Publish database ready event
    eventBus?.publish("database:ready", { timestamp: Date.now() });

    console.log("Database manager initialized with medallion architecture");

    // Return API
    return {
      // Core operations
      executeQuery,
      executeTransaction,
      saveDatabase,

      // Medallion operations
      medallion: medallionManager,
      config: configManager,

      // Legacy compatibility (delegates to medallion)
      getRequests: async (options) => getRequestsLegacy(options),
      saveRequest: async (request) => saveRequestLegacy(request),

      // Database management
      getDatabaseSize,
      getDatabaseStats,
      exportDatabase,
      importDatabase,
      clearDatabase,
      resetDatabase,
      cleanupOldRecords,
      previewCleanup,
      vacuumDatabase,

      // Runner operations
      runner: {
        createRunner,
        getRunnerDefinition,
        getRunnerRequests,
        createRunnerExecution,
        createRunnerExecutionResult,
        updateRunnerExecution,
        updateRunnerDefinition,
        getAllRunners,
        getRunnerExecutions,
        getExecutionResults,
        cleanupTemporaryRunners,
        deleteRunner,
      },
    };
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw new DatabaseError("Database initialization failed", error);
  }
}

/**
 * Execute a single query
 */
export function executeQuery(query, params = []) {
  if (!db) {
    throw new DatabaseError("Database not initialized");
  }

  try {
    return db.exec(query, params);
  } catch (error) {
    console.error("Query execution failed:", error, { query, params });
    throw new DatabaseError("Query execution failed", error);
  }
}

/**
 * Execute multiple queries in a transaction
 */
export function executeTransaction(queries) {
  if (!db) {
    throw new DatabaseError("Database not initialized");
  }

  try {
    db.exec("BEGIN TRANSACTION");

    for (const { query, params } of queries) {
      db.exec(query, params);
    }

    db.exec("COMMIT");
    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    console.error("Transaction failed:", error);
    throw new DatabaseError("Transaction failed", error);
  }
}

/**
 * Legacy compatibility: Get requests
 */
async function getRequestsLegacy(options = {}) {
  const { page = 1, limit = 100, filters = {} } = options;

  const offset = (page - 1) * limit;

  // Query silver layer for enriched data
  let query = `
    SELECT * FROM silver_requests
    WHERE 1=1
  `;

  const params = [];

  // Apply filters
  if (filters.domain) {
    query += " AND domain LIKE ?";
    params.push(`%${filters.domain}%`);
  }

  if (filters.status) {
    query += " AND status = ?";
    params.push(filters.status);
  }

  if (filters.type) {
    query += " AND type = ?";
    params.push(filters.type);
  }

  if (filters.startDate) {
    query += " AND timestamp >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    query += " AND timestamp <= ?";
    params.push(filters.endDate);
  }

  query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const result = executeQuery(query, params);

  if (!result || !result[0]) {
    return [];
  }

  return mapResultToArray(result[0]);
}

/**
 * Legacy compatibility: Save request
 */
async function saveRequestLegacy(request) {
  // Delegate to medallion manager
  return medallionManager.insertBronzeRequest(request);
}

/**
 * Get database size
 */
export function getDatabaseSize() {
  if (!db) {
    return 0;
  }

  try {
    const data = db.export();
    return data.length;
  } catch (error) {
    console.error("Failed to get database size:", error);
    return 0;
  }
}

/**
 * Get database statistics
 */
export function getDatabaseStats() {
  if (!db) {
    return null;
  }

  try {
    const stats = {
      size: getDatabaseSize(),
      tables: {},
      lastModified: Date.now(),
    };

    // Count rows in each layer
    const bronzeCount = executeQuery(
      "SELECT COUNT(*) as count FROM bronze_requests"
    );
    const silverCount = executeQuery(
      "SELECT COUNT(*) as count FROM silver_requests"
    );
    const goldCount = executeQuery(
      "SELECT COUNT(*) as count FROM gold_daily_analytics"
    );

    stats.tables.bronze = bronzeCount[0]?.values[0]?.[0] || 0;
    stats.tables.silver = silverCount[0]?.values[0]?.[0] || 0;
    stats.tables.gold = goldCount[0]?.values[0]?.[0] || 0;

    // Calculate total requests across all layers
    stats.totalRequests =
      stats.tables.bronze + stats.tables.silver + stats.tables.gold;

    // Get oldest record timestamp
    try {
      const oldestResult = executeQuery(
        "SELECT MIN(timestamp) as oldest FROM bronze_requests"
      );
      const oldestTimestamp = oldestResult[0]?.values[0]?.[0];
      if (oldestTimestamp) {
        stats.oldestDate = oldestTimestamp;
      }
    } catch (oldestError) {
      console.warn("Failed to get oldest record:", oldestError);
    }

    return stats;
  } catch (error) {
    console.error("Failed to get database stats:", error);
    return null;
  }
}

/**
 * Export database
 */
export function exportDatabase() {
  if (!db) {
    throw new DatabaseError("Database not initialized");
  }

  try {
    const data = db.export();
    return new Uint8Array(data);
  } catch (error) {
    console.error("Failed to export database:", error);
    throw new DatabaseError("Export failed", error);
  }
}

/**
 * Import database from Uint8Array
 */
export async function importDatabase(uint8Array) {
  if (!SQL || !dbConfig) {
    throw new DatabaseError("Database not initialized");
  }

  try {
    console.log("[DB] Importing database...");

    // Close current database
    if (db) {
      db.close();
    }

    // Create new database from imported data
    db = new SQL.Database(uint8Array);

    // Save to OPFS
    await saveToOPFS(db.export());

    console.log("[DB] Database imported successfully");

    return true;
  } catch (error) {
    console.error("Failed to import database:", error);
    throw new DatabaseError("Import failed", error);
  }
}

/**
 * Clear database (with confirmation)
 */
export async function clearDatabase() {
  if (!db) {
    return false;
  }

  try {
    // Clear all data but keep schema
    const tables = [
      "bronze_requests",
      "bronze_request_headers",
      "bronze_request_timings",
      "bronze_performance_entries",
      "bronze_events",
      "bronze_sessions",
      "bronze_errors",
      "silver_requests",
      "silver_request_metrics",
      "silver_domain_stats",
      "silver_resource_stats",
      "silver_hourly_stats",
      "silver_request_tags",
      "gold_daily_analytics",
      "gold_performance_insights",
      "gold_domain_performance",
      "gold_optimization_opportunities",
      "gold_trends",
      "gold_anomalies",
    ];

    db.exec("BEGIN TRANSACTION");

    for (const table of tables) {
      try {
        db.exec(`DELETE FROM ${table}`);
      } catch (error) {
        console.warn(`Failed to clear table ${table}:`, error);
      }
    }

    db.exec("COMMIT");

    // Save changes
    await saveDatabase();

    eventBus?.publish("database:cleared", { timestamp: Date.now() });

    return true;
  } catch (error) {
    db.exec("ROLLBACK");
    console.error("Failed to clear database:", error);
    throw new DatabaseError("Clear failed", error);
  }
}

/**
 * Reset database - completely drop all tables and recreate schema
 * This is more destructive than clearDatabase (which only deletes data)
 */
export async function resetDatabase() {
  if (!db) {
    return false;
  }

  try {
    console.log("Resetting database...");

    // Get list of all tables
    const tablesResult = db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);

    if (tablesResult[0]?.values) {
      db.exec("BEGIN TRANSACTION");

      // Drop all tables
      for (const [tableName] of tablesResult[0].values) {
        try {
          db.exec(`DROP TABLE IF EXISTS ${tableName}`);
          console.log(`Dropped table: ${tableName}`);
        } catch (error) {
          console.warn(`Failed to drop table ${tableName}:`, error);
        }
      }

      db.exec("COMMIT");
    }

    // Recreate schema
    console.log("Recreating medallion schema...");
    createMedallionSchema(db);

    // Initialize default configuration
    console.log("Initializing default configuration...");
    initializeDefaultConfig(db);

    // Recreate managers
    medallionManager = createMedallionManager(db);
    configManager = createConfigSchemaManager(db);

    // Save to OPFS
    await saveDatabase();

    eventBus?.publish("database:reset", { timestamp: Date.now() });

    console.log("Database reset complete");
    return true;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to rollback:", rollbackError);
    }
    console.error("Failed to reset database:", error);
    throw new DatabaseError("Reset failed", error);
  }
}

/**
 * Vacuum database to optimize storage
 */
export function vacuumDatabase() {
  if (!db) {
    return;
  }

  try {
    db.exec("VACUUM");
    eventBus?.publish("database:vacuumed", { timestamp: Date.now() });
  } catch (error) {
    console.error("Failed to vacuum database:", error);
    eventBus?.publish("database:error", {
      error: "vacuum_failed",
      message: error.message,
    });
  }
}

/**
 * Delete records older than specified number of days
 * @param {number} days - Age threshold in days
 * @returns {Object} - Stats about deleted records
 */
export async function cleanupOldRecords(days) {
  if (!db) {
    throw new DatabaseError("Database not initialized");
  }

  try {
    const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;

    // First, count records that will be deleted (Bronze + Silver + Gold layers)
    const cutoffDate = new Date(cutoffTimestamp).toISOString().split("T")[0];
    const countQuery = `
      SELECT 
        (SELECT COUNT(*) FROM bronze_requests WHERE timestamp < ${cutoffTimestamp}) as bronze_count,
        (SELECT COUNT(*) FROM bronze_web_vitals WHERE timestamp < ${cutoffTimestamp}) as vitals_count,
        (SELECT COUNT(*) FROM silver_requests WHERE timestamp < ${cutoffTimestamp}) as silver_count,
        (SELECT COUNT(*) FROM gold_daily_analytics WHERE date < '${cutoffDate}') +
        (SELECT COUNT(*) FROM gold_performance_insights WHERE created_at < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_domain_performance WHERE created_at < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_optimization_opportunities WHERE created_at < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_trends WHERE created_at < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_anomalies WHERE detected_at < ${cutoffTimestamp}) as gold_count
    `;

    const countResult = db.exec(countQuery);
    const counts = countResult[0]?.values?.[0] || [0, 0, 0, 0];
    const totalToDelete = counts[0] + counts[1] + counts[2] + counts[3];

    console.log(
      `Cleaning up ${totalToDelete} records older than ${days} days (Bronze: ${counts[0]}, Silver: ${counts[2]}, Gold: ${counts[3]})`
    );

    // Begin transaction
    db.exec("BEGIN TRANSACTION");

    // Delete from bronze layer
    db.exec(`DELETE FROM bronze_requests WHERE timestamp < ${cutoffTimestamp}`);
    db.exec(
      `DELETE FROM bronze_web_vitals WHERE timestamp < ${cutoffTimestamp}`
    );
    db.exec(
      `DELETE FROM bronze_request_headers WHERE request_id NOT IN (SELECT id FROM bronze_requests)`
    );
    db.exec(
      `DELETE FROM bronze_request_timings WHERE request_id NOT IN (SELECT id FROM bronze_requests)`
    );

    // Delete from silver layer
    db.exec(`DELETE FROM silver_requests WHERE timestamp < ${cutoffTimestamp}`);

    // Delete from gold layer (analytics)
    // Note: gold_daily_analytics uses date string, not timestamp
    db.exec(`DELETE FROM gold_daily_analytics WHERE date < '${cutoffDate}'`);
    db.exec(
      `DELETE FROM gold_performance_insights WHERE created_at < ${cutoffTimestamp}`
    );
    db.exec(
      `DELETE FROM gold_domain_performance WHERE created_at < ${cutoffTimestamp}`
    );
    db.exec(
      `DELETE FROM gold_optimization_opportunities WHERE created_at < ${cutoffTimestamp}`
    );
    db.exec(`DELETE FROM gold_trends WHERE created_at < ${cutoffTimestamp}`);
    db.exec(
      `DELETE FROM gold_anomalies WHERE detected_at < ${cutoffTimestamp}`
    );

    // Commit transaction
    db.exec("COMMIT");

    // Save database
    await saveDatabase();

    // Vacuum to reclaim space
    vacuumDatabase();

    const stats = {
      recordsDeleted: totalToDelete,
      cutoffDate: new Date(cutoffTimestamp).toISOString(),
      timestamp: Date.now(),
    };

    eventBus?.publish("database:cleanup", stats);

    return stats;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to rollback:", rollbackError);
    }
    console.error("Failed to cleanup old records:", error);
    throw new DatabaseError("Cleanup failed", error);
  }
}

/**
 * Preview cleanup - count records that would be deleted
 * @param {number} days - Age threshold in days
 * @returns {Object} - Preview stats
 */
export function previewCleanup(days) {
  if (!db) {
    throw new DatabaseError("Database not initialized");
  }

  try {
    const cutoffTimestamp = Date.now() - days * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(cutoffTimestamp).toISOString().split("T")[0];

    const query = `
      SELECT 
        (SELECT COUNT(*) FROM bronze_requests WHERE timestamp < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM bronze_web_vitals WHERE timestamp < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM silver_requests WHERE timestamp < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_daily_analytics WHERE date < '${cutoffDate}') +
        (SELECT COUNT(*) FROM gold_performance_insights WHERE created_at < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_domain_performance WHERE created_at < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_optimization_opportunities WHERE created_at < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_trends WHERE created_at < ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_anomalies WHERE detected_at < ${cutoffTimestamp}) as records_to_delete,
        (SELECT COUNT(*) FROM bronze_requests WHERE timestamp >= ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM bronze_web_vitals WHERE timestamp >= ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM silver_requests WHERE timestamp >= ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_daily_analytics WHERE date >= '${cutoffDate}') +
        (SELECT COUNT(*) FROM gold_performance_insights WHERE created_at >= ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_domain_performance WHERE created_at >= ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_optimization_opportunities WHERE created_at >= ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_trends WHERE created_at >= ${cutoffTimestamp}) +
        (SELECT COUNT(*) FROM gold_anomalies WHERE detected_at >= ${cutoffTimestamp}) as records_remaining,
        (SELECT MIN(timestamp) FROM bronze_requests) as oldest_timestamp
    `;

    const result = db.exec(query);
    if (!result[0]?.values?.[0]) {
      return {
        recordsToDelete: 0,
        recordsRemaining: 0,
        oldestRecord: null,
        sizeFreed: 0,
      };
    }

    const [recordsToDelete, recordsRemaining, oldestTimestamp] =
      result[0].values[0];

    // Estimate size freed (average 1KB per record)
    const estimatedSizeFreed = (recordsToDelete || 0) * 1024;

    return {
      recordsToDelete: recordsToDelete || 0,
      recordsRemaining: recordsRemaining || 0,
      oldestRecord: oldestTimestamp
        ? new Date(oldestTimestamp).toISOString()
        : null,
      cutoffDate: new Date(cutoffTimestamp).toISOString(),
      sizeFreed: estimatedSizeFreed,
    };
  } catch (error) {
    console.error("Failed to preview cleanup:", error);
    throw new DatabaseError("Preview failed", error);
  }
}

/**
 * Map SQL result to array of objects
 */
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

/**
 * Cleanup on shutdown
 */
export async function cleanup() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }

  await saveDatabase();

  if (db) {
    db.close();
    db = null;
  }

  medallionManager = null;
  configManager = null;
}

/**
 * Runner Database Operations
 */

// Helper function for SQL escaping
const escapeStr = (val) => {
  if (val === undefined || val === null) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
};

/**
 * Create a new runner definition and its requests
 */
async function createRunner(definition, requests) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    // Check if runner ID already exists
    const checkQuery = `SELECT id FROM config_runner_definitions WHERE id = ${escapeStr(
      definition.id
    )}`;
    const existing = db.exec(checkQuery);
    if (existing && existing[0]?.values && existing[0].values.length > 0) {
      throw new DatabaseError(
        `Runner with ID ${definition.id} already exists. Please try again.`
      );
    }

    // Insert runner definition
    const defQuery = `
      INSERT INTO config_runner_definitions (
        id, name, description, collection_id, execution_mode,
        delay_ms, follow_redirects, validate_status, use_variables,
        header_overrides, variables, is_active, created_at, updated_at, run_count
      ) VALUES (
        ${escapeStr(definition.id)},
        ${escapeStr(definition.name)},
        ${escapeStr(definition.description)},
        ${escapeStr(definition.collection_id || null)},
        ${escapeStr(definition.execution_mode)},
        ${definition.delay_ms || 0},
        ${definition.follow_redirects ? 1 : 0},
        ${definition.validate_status ? 1 : 0},
        ${definition.use_variables ? 1 : 0},
        ${escapeStr(definition.header_overrides)},
        ${escapeStr(definition.variables ? JSON.stringify(definition.variables) : null)},
        1,
        ${definition.created_at},
        ${definition.updated_at},
        0
      )
    `;

    db.exec(defQuery);

    // Insert runner requests
    for (const req of requests) {
      const reqQuery = `
        INSERT INTO config_runner_requests (
          id, runner_id, sequence_order, url, method,
          headers, body, domain, page_url, captured_request_id,
          assertions, description, is_enabled, created_at
        ) VALUES (
          ${escapeStr(req.id)},
          ${escapeStr(req.runner_id)},
          ${req.sequence_order},
          ${escapeStr(req.url)},
          ${escapeStr(req.method)},
          ${escapeStr(req.headers)},
          ${escapeStr(req.body)},
          ${escapeStr(req.domain || "unknown")},
          ${escapeStr(req.page_url || req.url || "unknown")},
          ${escapeStr(req.captured_request_id)},
          ${escapeStr(req.assertions)},
          ${escapeStr(req.description)},
          1,
          ${req.created_at}
        )
      `;

      db.exec(reqQuery);
    }

    try {
      await saveDatabaseToOPFS(db.export());
    } catch (saveError) {
      console.warn(
        "[Runner] Database save warning (non-critical):",
        saveError.message
      );
      // Continue - the runner was created in memory successfully
    }

    console.log(
      `[Runner] Created runner: ${definition.name} with ${requests.length} requests`
    );

    return { success: true, runnerId: definition.id };
  } catch (error) {
    console.error("[Runner] Failed to create runner:", error);
    throw new DatabaseError(`Failed to create runner: ${error.message}`);
  }
}

/**
 * Get runner definition by ID
 */
async function getRunnerDefinition(runnerId) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const query = `
      SELECT * FROM config_runner_definitions
      WHERE id = ${escapeStr(runnerId)}
    `;

    const result = db.exec(query);
    if (
      !result ||
      result.length === 0 ||
      !result[0].values ||
      result[0].values.length === 0
    ) {
      return null;
    }

    const columns = result[0].columns;
    const values = result[0].values[0];
    const runner = {};

    columns.forEach((col, idx) => {
      runner[col] = values[idx];
    });

    return runner;
  } catch (error) {
    console.error("[Runner] Failed to get runner definition:", error);
    throw new DatabaseError(`Failed to get runner: ${error.message}`);
  }
}

/**
 * Get all requests for a runner
 */
async function getRunnerRequests(runnerId) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const query = `
      SELECT * FROM config_runner_requests
      WHERE runner_id = ${escapeStr(runnerId)}
      ORDER BY sequence_order ASC
    `;

    const result = db.exec(query);
    if (!result || result.length === 0 || !result[0].values) {
      return [];
    }

    const columns = result[0].columns;
    const requests = result[0].values.map((values) => {
      const req = {};
      columns.forEach((col, idx) => {
        req[col] = values[idx];
      });
      return req;
    });

    return requests;
  } catch (error) {
    console.error("[Runner] Failed to get runner requests:", error);
    throw new DatabaseError(`Failed to get runner requests: ${error.message}`);
  }
}

/**
 * Create a new runner execution record
 */
async function createRunnerExecution(execution) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const query = `
      INSERT INTO bronze_runner_executions (
        id, runner_id, runner_name, status, execution_mode,
        start_time, total_requests, completed_requests,
        success_count, failure_count, created_at
      ) VALUES (
        ${escapeStr(execution.id)},
        ${escapeStr(execution.runner_id)},
        ${escapeStr(execution.runner_name)},
        ${escapeStr(execution.status)},
        ${escapeStr(execution.execution_mode)},
        ${execution.start_time},
        ${execution.total_requests},
        0,
        0,
        0,
        ${execution.created_at}
      )
    `;

    db.exec(query);
    await saveDatabaseToOPFS(db.export());

    console.log(`[Runner] Created execution: ${execution.id}`);
    return { success: true };
  } catch (error) {
    console.error("[Runner] Failed to create execution:", error);
    throw new DatabaseError(`Failed to create execution: ${error.message}`);
  }
}

/**
 * Create a runner execution result
 */
async function createRunnerExecutionResult(result) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const query = `
      INSERT INTO bronze_runner_execution_results (
        execution_id, runner_request_id, logged_request_id,
        sequence_order, url, method, status, duration,
        success, assertion_results, validation_errors,
        error_message, timestamp
      ) VALUES (
        ${escapeStr(result.execution_id)},
        ${escapeStr(result.runner_request_id)},
        ${escapeStr(result.logged_request_id)},
        ${result.sequence_order},
        ${escapeStr(result.url)},
        ${escapeStr(result.method)},
        ${result.status || 0},
        ${result.duration || 0},
        ${result.success ? 1 : 0},
        ${escapeStr(result.assertion_results)},
        ${escapeStr(result.validation_errors)},
        ${escapeStr(result.error_message)},
        ${result.timestamp}
      )
    `;

    db.exec(query);
    return { success: true };
  } catch (error) {
    console.error("[Runner] Failed to create execution result:", error);
    throw new DatabaseError(
      `Failed to create execution result: ${error.message}`
    );
  }
}

/**
 * Update runner execution status and stats
 */
async function updateRunnerExecution(executionId, updates) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const sets = [];

    if (updates.status) sets.push(`status = ${escapeStr(updates.status)}`);
    if (updates.end_time) sets.push(`end_time = ${updates.end_time}`);
    if (updates.duration) sets.push(`duration = ${updates.duration}`);
    if (updates.completed_requests !== undefined)
      sets.push(`completed_requests = ${updates.completed_requests}`);
    if (updates.success_count !== undefined)
      sets.push(`success_count = ${updates.success_count}`);
    if (updates.failure_count !== undefined)
      sets.push(`failure_count = ${updates.failure_count}`);
    if (updates.error_message)
      sets.push(`error_message = ${escapeStr(updates.error_message)}`);
    if (updates.metadata)
      sets.push(`metadata = ${escapeStr(updates.metadata)}`);

    if (sets.length === 0) return { success: true };

    const query = `
      UPDATE bronze_runner_executions
      SET ${sets.join(", ")}
      WHERE id = ${escapeStr(executionId)}
    `;

    db.exec(query);
    await saveDatabaseToOPFS(db.export());

    return { success: true };
  } catch (error) {
    console.error("[Runner] Failed to update execution:", error);
    throw new DatabaseError(`Failed to update execution: ${error.message}`);
  }
}

/**
 * Update runner definition
 */
async function updateRunnerDefinition(runnerId, updates) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const sets = [];

    if (updates.name) sets.push(`name = ${escapeStr(updates.name)}`);
    if (updates.description !== undefined)
      sets.push(`description = ${escapeStr(updates.description)}`);
    if (updates.collection_id !== undefined)
      sets.push(`collection_id = ${escapeStr(updates.collection_id)}`);
    if (updates.last_run_at) sets.push(`last_run_at = ${updates.last_run_at}`);
    if (updates.run_count !== undefined)
      sets.push(`run_count = ${updates.run_count}`);

    sets.push(`updated_at = ${Date.now()}`);

    const query = `
      UPDATE config_runner_definitions
      SET ${sets.join(", ")}
      WHERE id = ${escapeStr(runnerId)}
    `;

    db.exec(query);
    await saveDatabaseToOPFS(db.export());

    return { success: true };
  } catch (error) {
    console.error("[Runner] Failed to update runner definition:", error);
    throw new DatabaseError(`Failed to update runner: ${error.message}`);
  }
}

/**
 * Check if runner tables exist and create them if missing
 */
async function ensureRunnerTablesExist() {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    // Check if config_runner_definitions exists
    const checkQuery = `
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='config_runner_definitions'
    `;
    const result = db.exec(checkQuery);

    if (
      !result ||
      result.length === 0 ||
      !result[0].values ||
      result[0].values.length === 0
    ) {
      console.log("[Runner] Runner tables missing, creating them now...");

      // Create runner tables
      await createMedallionSchema(db);
      await saveDatabaseToOPFS(db.export());

      console.log("[Runner] Runner tables created successfully");
    }
  } catch (error) {
    console.error("[Runner] Failed to ensure runner tables:", error);
    throw new DatabaseError(`Failed to create runner tables: ${error.message}`);
  }
}

/**
 * Get all runners (including temporary ones < 7 days old)
 * @param {Object} options - Query options
 * @param {number} options.offset - Offset for pagination (default: 0)
 * @param {number} options.limit - Limit for pagination (default: 50)
 * @param {string} options.searchQuery - Search query for name/description (optional)
 * @returns {Object} { runners: [], totalCount: number }
 */
async function getAllRunners(options = {}) {
  if (!db) throw new DatabaseError("Database not initialized");

  const { offset = 0, limit = 50, searchQuery = null } = options;

  try {
    // Ensure tables exist first
    await ensureRunnerTablesExist();

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Build WHERE clause
    let whereClause = `
      WHERE (
        rd.collection_id IS NOT NULL
        OR rd.created_at > ${sevenDaysAgo}
      )
    `;

    // Add search filter if provided
    if (searchQuery && searchQuery.trim()) {
      const escapedSearch = escapeStr(`%${searchQuery.trim()}%`);
      whereClause += `
        AND (
          rd.name LIKE ${escapedSearch}
          OR rd.description LIKE ${escapedSearch}
        )
      `;
    }

    // Count total matching runners
    const countQuery = `
      SELECT COUNT(DISTINCT rd.id) as total
      FROM config_runner_definitions rd
      ${whereClause}
    `;

    const countResult = db.exec(countQuery);
    const totalCount = countResult && countResult[0] && countResult[0].values[0]
      ? countResult[0].values[0][0]
      : 0;

    // Get paginated runners with stats
    const query = `
      SELECT
        rd.*,
        COUNT(DISTINCT re.id) as execution_count,
        MAX(re.start_time) as last_execution_time,
        COUNT(DISTINCT rr.id) as total_requests,
        COALESCE(SUM(CASE WHEN rer.success = 1 THEN 1 ELSE 0 END), 0) as total_success
      FROM config_runner_definitions rd
      LEFT JOIN bronze_runner_executions re ON rd.id = re.runner_id
      LEFT JOIN config_runner_requests rr ON rd.id = rr.runner_id
      LEFT JOIN bronze_runner_execution_results rer ON re.id = rer.execution_id
      ${whereClause}
      GROUP BY rd.id
      ORDER BY rd.last_run_at DESC, rd.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = db.exec(query);
    if (!result || result.length === 0 || !result[0].values) {
      return { runners: [], totalCount: 0 };
    }

    const columns = result[0].columns;
    const runners = result[0].values.map((values) => {
      const runner = {};
      columns.forEach((col, idx) => {
        runner[col] = values[idx];
      });
      return runner;
    });

    return { runners, totalCount };
  } catch (error) {
    console.error("[Runner] Failed to get all runners:", error);
    throw new DatabaseError(`Failed to get runners: ${error.message}`);
  }
}

/**
 * Get execution history for a runner
 */
async function getRunnerExecutions(runnerId, limit = 50) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const query = `
      SELECT
        re.*,
        COUNT(rer.id) as result_count
      FROM bronze_runner_executions re
      LEFT JOIN bronze_runner_execution_results rer ON re.id = rer.execution_id
      WHERE re.runner_id = ${escapeStr(runnerId)}
      GROUP BY re.id
      ORDER BY re.start_time DESC
      LIMIT ${limit}
    `;

    const result = db.exec(query);
    if (!result || result.length === 0 || !result[0].values) {
      return [];
    }

    const columns = result[0].columns;
    const executions = result[0].values.map((values) => {
      const exec = {};
      columns.forEach((col, idx) => {
        exec[col] = values[idx];
      });
      return exec;
    });

    return executions;
  } catch (error) {
    console.error("[Runner] Failed to get runner executions:", error);
    throw new DatabaseError(`Failed to get executions: ${error.message}`);
  }
}

/**
 * Get detailed results for a specific execution
 */
async function getExecutionResults(executionId) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const query = `
      SELECT
        rer.*,
        br.status as http_status,
        br.duration as actual_duration,
        br.size_bytes,
        br.domain,
        br.page_url
      FROM bronze_runner_execution_results rer
      LEFT JOIN bronze_requests br ON rer.logged_request_id = br.id
      WHERE rer.execution_id = ${escapeStr(executionId)}
      ORDER BY rer.sequence_order
    `;

    const result = db.exec(query);
    if (!result || result.length === 0 || !result[0].values) {
      return [];
    }

    const columns = result[0].columns;
    const results = result[0].values.map((values) => {
      const res = {};
      columns.forEach((col, idx) => {
        res[col] = values[idx];
      });
      return res;
    });

    return results;
  } catch (error) {
    console.error("[Runner] Failed to get execution results:", error);
    throw new DatabaseError(
      `Failed to get execution results: ${error.message}`
    );
  }
}

/**
 * Cleanup old temporary runners (older than specified days)
 */
async function cleanupTemporaryRunners(daysOld = 7) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const query = `
      DELETE FROM config_runner_definitions
      WHERE collection_id IS NULL
        AND created_at < ${cutoffTime}
    `;

    db.exec(query);
    await saveDatabaseToOPFS(db.export());

    console.log(
      `[Runner] Cleaned up temporary runners older than ${daysOld} days`
    );
    return { success: true };
  } catch (error) {
    console.error("[Runner] Failed to cleanup temporary runners:", error);
    throw new DatabaseError(`Failed to cleanup runners: ${error.message}`);
  }
}

/**
 * Delete a runner and all its related data (CASCADE)
 */
async function deleteRunner(runnerId) {
  if (!db) throw new DatabaseError("Database not initialized");

  try {
    // Delete runner definition (CASCADE will delete related tables)
    const query = `
      DELETE FROM config_runner_definitions
      WHERE id = ${escapeStr(runnerId)}
    `;

    db.exec(query);
    await saveDatabaseToOPFS(db.export());

    console.log(`[Runner] Deleted runner: ${runnerId}`);
    return { success: true };
  } catch (error) {
    console.error("[Runner] Failed to delete runner:", error);
    throw new DatabaseError(`Failed to delete runner: ${error.message}`);
  }
}

/**
 * Class wrapper for backward compatibility
 */
export class DatabaseManagerMedallion {
  constructor() {
    this.initialized = false;
    this.dbApi = null;
  }

  async initialize(config = {}, encryptionMgr = null, events = null) {
    if (this.initialized) {
      console.warn("DatabaseManagerMedallion already initialized");
      return this.dbApi;
    }

    try {
      this.dbApi = await initDatabase(config, encryptionMgr, events);
      this.initialized = true;
      return this.dbApi;
    } catch (error) {
      console.error("Failed to initialize DatabaseManagerMedallion:", error);
      throw error;
    }
  }

  // Proxy methods to the API
  executeQuery(...args) {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.executeQuery(...args);
  }

  executeTransaction(...args) {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.executeTransaction(...args);
  }

  async saveDatabase() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.saveDatabase();
  }

  getRequests(...args) {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.getRequests(...args);
  }

  saveRequest(...args) {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.saveRequest(...args);
  }

  getDatabaseSize() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.getDatabaseSize();
  }

  getDatabaseStats() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.getDatabaseStats();
  }

  exportDatabase() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.exportDatabase();
  }

  async importDatabase(...args) {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    const result = await this.dbApi.importDatabase(...args);
    // Reinitialize API after import
    this.dbApi = await initDatabase(null, null, this.eventBus);
    return result;
  }

  clearDatabase() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.clearDatabase();
  }

  vacuumDatabase() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.vacuumDatabase();
  }

  async resetDatabase() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    const result = await this.dbApi.resetDatabase();
    // Reinitialize to get fresh API with updated managers
    this.dbApi = await initDatabase(null, null, eventBus);
    return result;
  }

  async cleanupOldRecords(days) {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return await this.dbApi.cleanupOldRecords(days);
  }

  previewCleanup(days) {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.previewCleanup(days);
  }

  get medallion() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.medallion;
  }

  get config() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.config;
  }

  get db() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    // Return the module-level db instance that was initialized
    return db;
  }

  get isReady() {
    return this.initialized && this.dbApi !== null && db !== null;
  }

  // Runner operations proxy
  get runner() {
    if (!this.initialized) throw new DatabaseError("Database not initialized");
    return this.dbApi.runner;
  }

  async cleanup() {
    if (this.initialized) {
      await cleanup();
      this.initialized = false;
      this.dbApi = null;
    }
  }
}
