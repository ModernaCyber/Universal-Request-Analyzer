// Medallion Architecture Database Schema
// This implements a layered data architecture:
// - Config Schema: Application configuration and settings
// - Bronze Schema: Raw event capture data (immutable, append-only)
// - Silver Schema: Cleaned, validated, and enriched data with Star Schema
// - Gold Schema: Analytics-ready aggregated data (daily insights)

/**
 * Create all database schemas for medallion architecture
 * @param {Database} db - SQL.js database instance
 */
export async function createMedallionSchema(db) {
  // Create schemas in order: Config -> Bronze -> Silver -> Gold
  await createConfigSchema(db);
  await createBronzeSchema(db);
  await createSilverSchema(db);
  await createGoldSchema(db);

  console.log("Medallion architecture schema created successfully");
  return true;
}

/**
 * CONFIG SCHEMA - Application Settings and Configuration
 * Stores all application settings, feature flags, and user preferences
 */
function createConfigSchema(db) {
  // Application settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      data_type TEXT NOT NULL CHECK(data_type IN ('string', 'number', 'boolean', 'json')),
      category TEXT NOT NULL,
      description TEXT,
      is_encrypted BOOLEAN DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Feature flags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_feature_flags (
      feature_key TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT 0,
      rollout_percentage INTEGER DEFAULT 100 CHECK(rollout_percentage >= 0 AND rollout_percentage <= 100),
      target_users TEXT,
      conditions TEXT,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // User preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_user_preferences (
      user_id TEXT NOT NULL,
      preference_key TEXT NOT NULL,
      preference_value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, preference_key)
    )
  `);

  // Extension configuration table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_extension (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      version TEXT NOT NULL,
      environment TEXT NOT NULL CHECK(environment IN ('development', 'staging', 'production')),
      installation_id TEXT UNIQUE NOT NULL,
      installed_at INTEGER NOT NULL,
      last_updated INTEGER NOT NULL,
      config_data TEXT
    )
  `);

  // Performance settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_performance (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      enabled BOOLEAN DEFAULT 0,
      sampling_rate INTEGER DEFAULT 100 CHECK(sampling_rate >= 0 AND sampling_rate <= 100),
      capture_navigation_timing BOOLEAN DEFAULT 1,
      capture_resource_timing BOOLEAN DEFAULT 1,
      capture_server_timing BOOLEAN DEFAULT 1,
      capture_custom_metrics BOOLEAN DEFAULT 0,
      retention_period_ms INTEGER DEFAULT 604800000,
      max_metrics_stored INTEGER DEFAULT 10000,
      updated_at INTEGER NOT NULL
    )
  `);

  // Storage configuration table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_storage (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      max_requests INTEGER DEFAULT 10000,
      max_size_mb INTEGER DEFAULT 100,
      auto_cleanup_enabled BOOLEAN DEFAULT 1,
      cleanup_interval_ms INTEGER DEFAULT 3600000,
      retention_days INTEGER DEFAULT 30,
      compression_enabled BOOLEAN DEFAULT 1,
      updated_at INTEGER NOT NULL
    )
  `);

  // Export configuration table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_export (
      id INTEGER PRIMARY KEY CHECK(id = 1),
      default_format TEXT DEFAULT 'json' CHECK(default_format IN ('json', 'csv', 'har', 'sqlite')),
      compression_enabled BOOLEAN DEFAULT 1,
      max_export_size_mb INTEGER DEFAULT 100,
      include_headers BOOLEAN DEFAULT 1,
      include_timings BOOLEAN DEFAULT 1,
      include_body BOOLEAN DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `);

  // Runner definitions table - saved test runners/collections
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_runner_definitions (
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
      variables TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      last_run_at INTEGER,
      run_count INTEGER DEFAULT 0
    )
  `);

  // Runner requests table - requests associated with runners
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_runner_requests (
      id TEXT PRIMARY KEY,
      runner_id TEXT NOT NULL,
      sequence_order INTEGER NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      headers TEXT,
      body TEXT,
      domain TEXT NOT NULL,
      page_url TEXT NOT NULL,
      captured_request_id TEXT,
      assertions TEXT,
      description TEXT,
      is_enabled BOOLEAN DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(runner_id) REFERENCES config_runner_definitions(id) ON DELETE CASCADE
    )
  `);

  // Runner collections table - grouping of runners
  db.exec(`
    CREATE TABLE IF NOT EXISTS config_runner_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      icon TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Indexes for config schema
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_config_app_settings_category ON config_app_settings(category)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_config_feature_flags_enabled ON config_feature_flags(enabled)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_runner_definitions_active ON config_runner_definitions(is_active)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_runner_requests_runner ON config_runner_requests(runner_id, sequence_order)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_runner_collections_active ON config_runner_collections(is_active)`
  );

  console.log("Config schema created");
}

/**
 * BRONZE SCHEMA - Raw Event Capture Data
 * Stores all captured events immutably (append-only, timestamped)
 * Includes: HTTP requests, performance metrics, runner executions
 */
function createBronzeSchema(db) {
  // Raw requests table - complete capture of all HTTP requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_requests (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      type TEXT,
      status INTEGER,
      status_text TEXT,
      domain TEXT,
      path TEXT,
      query_string TEXT,
      protocol TEXT,
      start_time INTEGER,
      end_time INTEGER,
      duration INTEGER,
      size_bytes INTEGER,
      timestamp INTEGER NOT NULL,
      tab_id INTEGER,
      frame_id INTEGER,
      page_url TEXT,
      initiator TEXT,
      error TEXT,
      from_cache BOOLEAN DEFAULT 0,
      request_body TEXT,
      response_body TEXT,
      raw_data TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Request headers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_request_headers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT NOT NULL,
      header_type TEXT NOT NULL CHECK(header_type IN ('request', 'response')),
      name TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(request_id) REFERENCES bronze_requests(id) ON DELETE CASCADE
    )
  `);

  // Request timings table with Resource Timing API data
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_request_timings (
      request_id TEXT PRIMARY KEY,
      dns_start INTEGER,
      dns_end INTEGER,
      dns_duration INTEGER,
      tcp_start INTEGER,
      tcp_end INTEGER,
      tcp_duration INTEGER,
      ssl_start INTEGER,
      ssl_end INTEGER,
      ssl_duration INTEGER,
      request_start INTEGER,
      request_end INTEGER,
      request_duration INTEGER,
      response_start INTEGER,
      response_end INTEGER,
      response_duration INTEGER,
      transfer_size INTEGER,
      encoded_size INTEGER,
      decoded_size INTEGER,
      from_cache BOOLEAN DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(request_id) REFERENCES bronze_requests(id) ON DELETE CASCADE
    )
  `);

  // Performance entries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_performance_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT,
      entry_type TEXT NOT NULL,
      name TEXT NOT NULL,
      start_time REAL,
      duration REAL,
      metrics TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(request_id) REFERENCES bronze_requests(id) ON DELETE SET NULL
    )
  `);

  // Events table - captures all extension events
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      event_name TEXT NOT NULL,
      source TEXT,
      data TEXT,
      request_id TEXT,
      user_id TEXT,
      session_id TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(request_id) REFERENCES bronze_requests(id) ON DELETE SET NULL
    )
  `);

  // Web Vitals table - Core Web Vitals metrics
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_web_vitals (
      id TEXT PRIMARY KEY,
      page_url TEXT NOT NULL,
      domain TEXT NOT NULL,
      metric_name TEXT NOT NULL CHECK(metric_name IN ('LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'TTI', 'DCL', 'Load')),
      value REAL NOT NULL,
      rating TEXT CHECK(rating IN ('good', 'needs-improvement', 'poor')),
      timestamp INTEGER NOT NULL,
      user_agent TEXT,
      viewport_width INTEGER,
      viewport_height INTEGER,
      session_id TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES bronze_sessions(id) ON DELETE SET NULL
    )
  `);

  // User sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_sessions (
      id TEXT PRIMARY KEY,
      domain TEXT,
      user_id TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration INTEGER,
      events_count INTEGER DEFAULT 0,
      requests_count INTEGER DEFAULT 0,
      pages_count INTEGER DEFAULT 0,
      pages_visited TEXT,
      user_agent TEXT,
      metadata TEXT
    )
  `);

  // Errors table - all errors and exceptions
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      error_type TEXT NOT NULL,
      message TEXT NOT NULL,
      stack TEXT,
      source TEXT,
      request_id TEXT,
      user_id TEXT,
      severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      resolved BOOLEAN DEFAULT 0,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(request_id) REFERENCES bronze_requests(id) ON DELETE SET NULL
    )
  `);

  // Runner executions table - tracks each runner execution
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_runner_executions (
      id TEXT PRIMARY KEY,
      runner_id TEXT NOT NULL,
      runner_name TEXT NOT NULL,
      collection_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
      execution_mode TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      duration INTEGER,
      total_requests INTEGER DEFAULT 0,
      completed_requests INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      error_message TEXT,
      environment_snapshot TEXT,
      triggered_by TEXT,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(runner_id) REFERENCES config_runner_definitions(id) ON DELETE CASCADE
    )
  `);

  // Runner execution results - individual request results
  db.exec(`
    CREATE TABLE IF NOT EXISTS bronze_runner_execution_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      execution_id TEXT NOT NULL,
      runner_request_id TEXT NOT NULL,
      logged_request_id TEXT,
      sequence_order INTEGER NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      status INTEGER,
      duration INTEGER,
      success BOOLEAN DEFAULT 0,
      assertion_results TEXT,
      validation_errors TEXT,
      error_message TEXT,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(execution_id) REFERENCES bronze_runner_executions(id) ON DELETE CASCADE,
      FOREIGN KEY(logged_request_id) REFERENCES bronze_requests(id) ON DELETE SET NULL
    )
  `);

  // Indexes for bronze schema
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_requests_timestamp ON bronze_requests(timestamp)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_requests_domain ON bronze_requests(domain)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_requests_status ON bronze_requests(status)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_requests_type ON bronze_requests(type)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_requests_method ON bronze_requests(method)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_requests_tab_id ON bronze_requests(tab_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_headers_request_id ON bronze_request_headers(request_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_headers_type ON bronze_request_headers(header_type)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_timings_request_id ON bronze_request_timings(request_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_events_type ON bronze_events(event_type)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_events_timestamp ON bronze_events(timestamp)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_events_request_id ON bronze_events(request_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_web_vitals_domain ON bronze_web_vitals(domain)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_web_vitals_page ON bronze_web_vitals(page_url)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_web_vitals_timestamp ON bronze_web_vitals(timestamp)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_web_vitals_metric ON bronze_web_vitals(metric_name)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_sessions_domain ON bronze_sessions(domain)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_sessions_started ON bronze_sessions(started_at)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_errors_timestamp ON bronze_errors(timestamp)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_errors_severity ON bronze_errors(severity)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_errors_resolved ON bronze_errors(resolved)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_runner_executions_runner ON bronze_runner_executions(runner_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_runner_executions_status ON bronze_runner_executions(status)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_runner_executions_start ON bronze_runner_executions(start_time)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_runner_results_execution ON bronze_runner_execution_results(execution_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_bronze_runner_results_request ON bronze_runner_execution_results(logged_request_id)`
  );
  console.log("Bronze schema created");
}

/**
 * SILVER SCHEMA - Cleaned and Validated Data
 * Stores processed, validated, and enriched data
 */
function createSilverSchema(db) {
  // Validated requests with enrichments
  db.exec(`
    CREATE TABLE IF NOT EXISTS silver_requests (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      type TEXT,
      status INTEGER,
      status_text TEXT,
      domain TEXT,
      path TEXT,
      protocol TEXT,
      duration INTEGER,
      size_bytes INTEGER,
      timestamp INTEGER NOT NULL,
      tab_id INTEGER,
      page_url TEXT,
      is_third_party BOOLEAN DEFAULT 0,
      is_secure BOOLEAN DEFAULT 0,
      has_error BOOLEAN DEFAULT 0,
      performance_score REAL,
      quality_score REAL,
      tags TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Aggregated request metrics
  db.exec(`
    CREATE TABLE IF NOT EXISTS silver_request_metrics (
      request_id TEXT PRIMARY KEY,
      total_time INTEGER,
      dns_time INTEGER,
      tcp_time INTEGER,
      ssl_time INTEGER,
      wait_time INTEGER,
      download_time INTEGER,
      bytes_sent INTEGER,
      bytes_received INTEGER,
      compression_ratio REAL,
      cache_hit BOOLEAN DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(request_id) REFERENCES silver_requests(id) ON DELETE CASCADE
    )
  `);

  // Domain statistics
  db.exec(`
    CREATE TABLE IF NOT EXISTS silver_domain_stats (
      domain TEXT PRIMARY KEY,
      total_requests INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      avg_duration INTEGER,
      min_duration INTEGER,
      max_duration INTEGER,
      success_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      last_request_at INTEGER,
      first_request_at INTEGER,
      is_third_party BOOLEAN DEFAULT 0,
      updated_at INTEGER NOT NULL
    )
  `);

  // Resource type statistics
  db.exec(`
    CREATE TABLE IF NOT EXISTS silver_resource_stats (
      resource_type TEXT PRIMARY KEY,
      total_requests INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      avg_duration INTEGER,
      avg_size INTEGER,
      updated_at INTEGER NOT NULL
    )
  `);

  // Time-based aggregations (hourly)
  db.exec(`
    CREATE TABLE IF NOT EXISTS silver_hourly_stats (
      hour_timestamp INTEGER PRIMARY KEY,
      total_requests INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      avg_duration INTEGER,
      error_count INTEGER DEFAULT 0,
      unique_domains INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);

  // Tags table for categorization
  db.exec(`
    CREATE TABLE IF NOT EXISTS silver_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      color TEXT,
      description TEXT,
      category TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Request-Tag mapping
  db.exec(`
    CREATE TABLE IF NOT EXISTS silver_request_tags (
      request_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (request_id, tag_id),
      FOREIGN KEY(request_id) REFERENCES silver_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES silver_tags(id) ON DELETE CASCADE
    )
  `);

  // Indexes for silver schema
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_silver_requests_timestamp ON silver_requests(timestamp)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_silver_requests_domain ON silver_requests(domain)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_silver_requests_status ON silver_requests(status)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_silver_requests_type ON silver_requests(type)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_silver_requests_performance ON silver_requests(performance_score)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_silver_domain_stats_requests ON silver_domain_stats(total_requests)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_silver_hourly_timestamp ON silver_hourly_stats(hour_timestamp)`
  );

  console.log("Silver schema created");
}

/**
 * GOLD SCHEMA - Analytics-Ready Data
 * Stores highly aggregated, analytics-ready data for reporting
 */
function createGoldSchema(db) {
  // Daily analytics summary
  db.exec(`
    CREATE TABLE IF NOT EXISTS gold_daily_analytics (
      date TEXT PRIMARY KEY,
      total_requests INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      avg_response_time INTEGER,
      median_response_time INTEGER,
      p95_response_time INTEGER,
      p99_response_time INTEGER,
      error_rate REAL,
      unique_domains INTEGER,
      top_domains TEXT,
      top_resource_types TEXT,
      performance_summary TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Performance insights
  db.exec(`
    CREATE TABLE IF NOT EXISTS gold_performance_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      insight_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT CHECK(severity IN ('info', 'warning', 'critical')),
      metric_name TEXT,
      metric_value REAL,
      threshold_value REAL,
      recommendation TEXT,
      date TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  // Domain performance report
  db.exec(`
    CREATE TABLE IF NOT EXISTS gold_domain_performance (
      domain TEXT NOT NULL,
      date TEXT NOT NULL,
      request_count INTEGER DEFAULT 0,
      total_bytes INTEGER DEFAULT 0,
      avg_response_time INTEGER,
      p95_response_time INTEGER,
      error_rate REAL,
      performance_grade TEXT CHECK(performance_grade IN ('A', 'B', 'C', 'D', 'F')),
      created_at INTEGER NOT NULL,
      PRIMARY KEY (domain, date)
    )
  `);

  // Resource optimization opportunities
  db.exec(`
    CREATE TABLE IF NOT EXISTS gold_optimization_opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_type TEXT NOT NULL,
      domain TEXT,
      resource_url TEXT,
      current_size_bytes INTEGER,
      potential_savings_bytes INTEGER,
      potential_savings_percent REAL,
      priority TEXT CHECK(priority IN ('low', 'medium', 'high')),
      recommendation TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Trend analysis
  db.exec(`
    CREATE TABLE IF NOT EXISTS gold_trends (
      metric_name TEXT NOT NULL,
      date TEXT NOT NULL,
      value REAL NOT NULL,
      trend TEXT CHECK(trend IN ('increasing', 'decreasing', 'stable')),
      change_percent REAL,
      created_at INTEGER NOT NULL,
      PRIMARY KEY (metric_name, date)
    )
  `);

  // Anomalies detection
  db.exec(`
    CREATE TABLE IF NOT EXISTS gold_anomalies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anomaly_type TEXT NOT NULL,
      metric_name TEXT NOT NULL,
      expected_value REAL,
      actual_value REAL,
      deviation_percent REAL,
      severity TEXT CHECK(severity IN ('low', 'medium', 'high', 'critical')),
      description TEXT,
      detected_at INTEGER NOT NULL,
      resolved BOOLEAN DEFAULT 0,
      resolved_at INTEGER
    )
  `);

  // Indexes for gold schema
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_daily_date ON gold_daily_analytics(date)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_insights_type ON gold_performance_insights(insight_type)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_insights_severity ON gold_performance_insights(severity)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_domain_perf_date ON gold_domain_performance(date)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_domain_perf_domain ON gold_domain_performance(domain)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_trends_metric ON gold_trends(metric_name)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_trends_date ON gold_trends(date)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_anomalies_severity ON gold_anomalies(severity)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_gold_anomalies_resolved ON gold_anomalies(resolved)`
  );

  // Runner results tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS runner_results (
      run_id TEXT PRIMARY KEY,
      collection_id TEXT,
      status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed', 'cancelled')),
      mode TEXT NOT NULL CHECK(mode IN ('sequential', 'parallel')),
      total_requests INTEGER NOT NULL,
      success_count INTEGER DEFAULT 0,
      failure_count INTEGER DEFAULT 0,
      duration INTEGER,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      results_json TEXT,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_runner_collection ON runner_results(collection_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_runner_status ON runner_results(status)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_runner_start_time ON runner_results(start_time DESC)`
  );

  // Runner alerts
  db.exec(`
    CREATE TABLE IF NOT EXISTS runner_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id TEXT NOT NULL,
      collection_name TEXT NOT NULL,
      alert_type TEXT NOT NULL CHECK(alert_type IN ('success_rate', 'duration', 'failure_count', 'status_code')),
      condition TEXT NOT NULL,
      threshold_value REAL NOT NULL,
      comparison TEXT NOT NULL CHECK(comparison IN ('greater_than', 'less_than', 'equals', 'not_equals')),
      enabled BOOLEAN DEFAULT 1,
      notification_type TEXT CHECK(notification_type IN ('toast', 'console', 'both')),
      last_triggered INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_runner_alerts_collection ON runner_alerts(collection_id)`
  );
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_runner_alerts_enabled ON runner_alerts(enabled)`
  );

  console.log("Gold schema created");
}

/**
 * Initialize default configuration data
 * @param {Database} db - SQL.js database instance
 */
export async function initializeDefaultConfig(db) {
  const now = Date.now();

  // Insert default extension config
  db.exec(
    `
    INSERT OR IGNORE INTO config_extension (id, version, environment, installation_id, installed_at, last_updated)
    VALUES (1, '1.0.0', 'production', ?, ?, ?)
  `,
    [generateInstallationId(), now, now]
  );

  // Insert default performance settings
  db.exec(
    `
    INSERT OR IGNORE INTO config_performance (id, updated_at)
    VALUES (1, ?)
  `,
    [now]
  );

  // Insert default storage settings
  db.exec(
    `
    INSERT OR IGNORE INTO config_storage (id, updated_at)
    VALUES (1, ?)
  `,
    [now]
  );

  // Insert default export settings
  db.exec(
    `
    INSERT OR IGNORE INTO config_export (id, updated_at)
    VALUES (1, ?)
  `,
    [now]
  );

  console.log("Default configuration initialized");
}

/**
 * Generate unique installation ID
 */
function generateInstallationId() {
  return `ura-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate and fix database schema
 * Checks if tables have correct structure and recreates them if needed
 */
export async function validateAndFixSchema(db) {
  console.log("Validating database schema...");

  try {
    // Check bronze_web_vitals table structure
    const result = db.exec(`PRAGMA table_info(bronze_web_vitals)`);

    if (result && result[0]?.values) {
      const columns = result[0].values.map((col) => col[1]); // Get column names
      console.log("bronze_web_vitals columns:", columns);

      // Check if table has old 'metric_value' column instead of 'value'
      if (columns.includes("metric_value") && !columns.includes("value")) {
        console.warn(
          "⚠️ Detected old schema with 'metric_value' column. Recreating bronze_web_vitals table..."
        );

        // Drop and recreate table with correct schema
        db.exec(`DROP TABLE IF EXISTS bronze_web_vitals`);
        db.exec(`
          CREATE TABLE IF NOT EXISTS bronze_web_vitals (
            id TEXT PRIMARY KEY,
            page_url TEXT NOT NULL,
            domain TEXT NOT NULL,
            metric_name TEXT NOT NULL CHECK(metric_name IN ('LCP', 'FID', 'CLS', 'FCP', 'TTFB', 'TTI', 'DCL', 'Load')),
            value REAL NOT NULL,
            rating TEXT CHECK(rating IN ('good', 'needs-improvement', 'poor')),
            timestamp INTEGER NOT NULL,
            user_agent TEXT,
            viewport_width INTEGER,
            viewport_height INTEGER,
            session_id TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES bronze_sessions(id) ON DELETE SET NULL
          )
        `);

        console.log("✓ bronze_web_vitals table recreated with correct schema");
      }
    }

    // Check bronze_performance_entries table
    const perfResult = db.exec(`PRAGMA table_info(bronze_performance_entries)`);

    if (perfResult && perfResult[0]?.values) {
      const perfColumns = perfResult[0].values.map((col) => col[1]);
      console.log("bronze_performance_entries columns:", perfColumns);

      // Check if table has old 'metric_value' column
      if (
        perfColumns.includes("metric_value") &&
        !perfColumns.includes("duration")
      ) {
        console.warn(
          "⚠️ Detected old schema in bronze_performance_entries. Recreating table..."
        );

        db.exec(`DROP TABLE IF EXISTS bronze_performance_entries`);
        db.exec(`
          CREATE TABLE IF NOT EXISTS bronze_performance_entries (
            id TEXT PRIMARY KEY,
            page_url TEXT NOT NULL,
            domain TEXT NOT NULL,
            entry_type TEXT NOT NULL,
            name TEXT NOT NULL,
            start_time REAL,
            duration REAL,
            metrics TEXT,
            timestamp INTEGER NOT NULL,
            session_id TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(session_id) REFERENCES bronze_sessions(id) ON DELETE SET NULL
          )
        `);

        console.log(
          "✓ bronze_performance_entries table recreated with correct schema"
        );
      }
    }

    // ✅ Ensure runner tables exist (for existing databases created before runner feature)
    const runnerTablesResult = db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('config_runner_definitions', 'config_runner_requests', 'bronze_runner_executions', 'bronze_runner_execution_results')
    `);

    const existingRunnerTables =
      runnerTablesResult[0]?.values?.map((row) => row[0]) || [];
    const missingRunnerTables = [
      "config_runner_definitions",
      "config_runner_requests",
      "bronze_runner_executions",
      "bronze_runner_execution_results",
    ].filter((table) => !existingRunnerTables.includes(table));

    if (missingRunnerTables.length > 0) {
      console.warn(
        `⚠️ Missing runner tables: ${missingRunnerTables.join(
          ", "
        )}. Creating them now...`
      );

      // Create config runner tables
      if (!existingRunnerTables.includes("config_runner_definitions")) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS config_runner_definitions (
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
            variables TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            last_run_at INTEGER,
            run_count INTEGER DEFAULT 0
          )
        `);
        db.exec(
          `CREATE INDEX IF NOT EXISTS idx_runner_definitions_collection ON config_runner_definitions(collection_id, created_at)`
        );
        console.log("✓ Created config_runner_definitions table");
      }

      if (!existingRunnerTables.includes("config_runner_requests")) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS config_runner_requests (
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
            assertions TEXT,
            description TEXT,
            is_enabled BOOLEAN DEFAULT 1,
            created_at INTEGER NOT NULL,
            FOREIGN KEY(runner_id) REFERENCES config_runner_definitions(id) ON DELETE CASCADE,
            UNIQUE(runner_id, sequence_order)
          )
        `);
        db.exec(
          `CREATE INDEX IF NOT EXISTS idx_runner_requests_runner ON config_runner_requests(runner_id, sequence_order)`
        );
        console.log("✓ Created config_runner_requests table");
      } else {
        // Migrate existing table - add missing columns
        try {
          const tableInfo = db.exec(
            `PRAGMA table_info(config_runner_requests)`
          );
          if (tableInfo && tableInfo[0]) {
            const columns = tableInfo[0].values.map((row) => row[1]);

            if (!columns.includes("assertions")) {
              console.log(
                "⚙️ Migrating: Adding assertions column to config_runner_requests"
              );
              db.exec(
                `ALTER TABLE config_runner_requests ADD COLUMN assertions TEXT`
              );
              console.log("✓ Added assertions column");
            }

            if (!columns.includes("description")) {
              console.log(
                "⚙️ Migrating: Adding description column to config_runner_requests"
              );
              db.exec(
                `ALTER TABLE config_runner_requests ADD COLUMN description TEXT`
              );
              console.log("✓ Added description column");
            }

            if (!columns.includes("is_enabled")) {
              console.log(
                "⚙️ Migrating: Adding is_enabled column to config_runner_requests"
              );
              db.exec(
                `ALTER TABLE config_runner_requests ADD COLUMN is_enabled BOOLEAN DEFAULT 1`
              );
              console.log("✓ Added is_enabled column");
            }
          }
        } catch (migrationError) {
          console.warn(
            "Migration warning for config_runner_requests:",
            migrationError
          );
        }
      }

      // Create bronze runner tables
      if (!existingRunnerTables.includes("bronze_runner_executions")) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS bronze_runner_executions (
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
          )
        `);
        db.exec(
          `CREATE INDEX IF NOT EXISTS idx_runner_executions_runner ON bronze_runner_executions(runner_id, start_time DESC)`
        );
        console.log("✓ Created bronze_runner_executions table");
      }

      if (!existingRunnerTables.includes("bronze_runner_execution_results")) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS bronze_runner_execution_results (
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
          )
        `);
        db.exec(
          `CREATE INDEX IF NOT EXISTS idx_runner_results_execution ON bronze_runner_execution_results(execution_id)`
        );
        console.log("✓ Created bronze_runner_execution_results table");
      }

      console.log("✓ All runner tables created successfully");
    } else {
      console.log("✓ All runner tables exist");

      // Migration: Add is_active column if missing (for existing databases)
      try {
        const tableInfo = db.exec(
          `PRAGMA table_info(config_runner_definitions)`
        );
        if (tableInfo && tableInfo[0]) {
          const columns = tableInfo[0].values.map((row) => row[1]); // column name is at index 1
          if (!columns.includes("is_active")) {
            console.log(
              "⚙️ Migrating: Adding is_active column to config_runner_definitions"
            );
            db.exec(
              `ALTER TABLE config_runner_definitions ADD COLUMN is_active BOOLEAN DEFAULT 1`
            );
            console.log("✓ Added is_active column");
          }
        }
      } catch (migrationError) {
        console.warn("Migration warning:", migrationError);
      }
    }

    console.log("✓ Schema validation complete");
    return true;
  } catch (error) {
    console.error("Schema validation error:", error);
    return false;
  }
}
