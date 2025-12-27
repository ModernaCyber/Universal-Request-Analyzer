// Integrated Background Script with Medallion Architecture
// Full implementation connecting all components

import { initDatabase } from "./database/db-manager.js";
import { setupLocalAuth } from "./auth/local-auth-manager.js";
import { initializePopupMessageHandler } from "./messaging/popup-message-handler.js";
import { DatabaseManagerMedallion } from "./database/db-manager-medallion.js";
import { MedallionManager } from "./database/medallion-manager.js";
import { AnalyticsProcessor } from "./database/analytics-processor.js";
import { ConfigSchemaManager } from "./database/config-schema-manager.js";
import { RequestCaptureIntegration } from "./capture/request-capture-integration.js";
import { migrateLegacyToMedallion } from "./database/medallion-migration.js";
import { runtime, downloads, alarms } from "./compat/browser-compat.js";

class IntegratedExtensionInitializer {
  constructor() {
    this.dbManager = null;
    this.medallionDb = null;
    this.localAuth = null;
    this.configManager = null;
    this.medallionManager = null;
    this.analyticsProcessor = null;
    this.requestCapture = null;
    this.eventBus = this.createEventBus();
    this.scheduledTasks = [];
    this.initialized = false; // Prevent multiple initializations
  }

  createEventBus() {
    const subscribers = new Map();
    return {
      subscribe: (event, callback) => {
        if (!subscribers.has(event)) {
          subscribers.set(event, []);
        }
        subscribers.get(event).push(callback);
      },
      publish: (event, data) => {
        if (subscribers.has(event)) {
          subscribers.get(event).forEach((callback) => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Event handler error for ${event}:`, error);
            }
          });
        }
      },
    };
  }

  async initialize() {
    // Prevent multiple initializations
    if (this.initialized) {
      console.log("⚠️ Already initialized, skipping...");
      return true;
    }

    try {
      console.log(
        "🚀 Initializing Universal Request Analyzer with Medallion Architecture..."
      );

      // Step 1: Initialize database with medallion architecture
      await this.initializeDatabase();

      // Step 2: Initialize local authentication
      await this.initializeLocalAuth();

      // Step 3: Initialize configuration manager
      await this.initializeConfigManager();

      // Step 4: Initialize medallion manager
      await this.initializeMedallionManager();

      // Step 5: Initialize analytics processor
      await this.initializeAnalyticsProcessor();

      // Step 7: Initialize request capture
      await this.initializeRequestCapture();

      // Step 8: Initialize message handlers
      this.initializeMessageHandlers();

      // Step 9: Schedule periodic tasks
      this.schedulePeriodicTasks();

      this.initialized = true; // Mark as initialized
      console.log(
        "✅ Extension initialized successfully with medallion architecture!"
      );
      return true;
    } catch (error) {
      console.error("❌ Extension initialization failed:", error);
      this.initialized = false; // Reset on failure
      return false;
    }
  }

  async initializeDatabase() {
    console.log("→ Initializing Medallion Database...");

    try {
      // Step 1: Initialize medallion database FIRST
      this.medallionDb = new DatabaseManagerMedallion();
      await this.medallionDb.initialize(null, null, this.eventBus);
      console.log("✓ Medallion Database core initialized");

      // Step 2: Initialize legacy database
      this.dbManager = await initDatabase();
      console.log("✓ Legacy Database initialized");

      // Step 3: Check if migration is needed
      const needsMigration = await this.checkLegacyData();
      if (needsMigration) {
        console.log("→ Migrating legacy data to medallion architecture...");
        await migrateLegacyToMedallion(this.dbManager, this.medallionDb);
        console.log("✓ Legacy data migration complete");
      }

      console.log("✓ Database initialization complete");
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  async checkLegacyData() {
    try {
      const result = await this.dbManager.executeQuery(`
        SELECT COUNT(*) as count FROM sqlite_master 
        WHERE type='table' AND name='requests'
      `);
      return result[0]?.values?.[0]?.[0] > 0;
    } catch (error) {
      return false;
    }
  }

  async initializeLocalAuth() {
    console.log("→ Initializing Local Authentication...");

    this.localAuth = setupLocalAuth(this.dbManager);
    await this.localAuth.initialize();

    console.log("✓ Local Authentication initialized");
  }

  async initializeConfigManager() {
    console.log("→ Initializing Configuration Manager...");

    this.configManager = new ConfigSchemaManager(
      this.medallionDb.db,
      this.eventBus
    );
    await this.configManager.initialize();

    // Set default configurations using the correct method name
    try {
      await this.configManager.setAppSetting("capture.enabled", true);
      await this.configManager.setAppSetting("analytics.enabled", true);
    } catch (error) {
      console.warn("Failed to set default config:", error.message);
    }

    console.log("✓ Configuration Manager initialized");
  }

  async initializeMedallionManager() {
    console.log("→ Initializing Medallion Manager...");

    this.medallionManager = new MedallionManager(
      this.medallionDb.db,
      this.eventBus
    );
    await this.medallionManager.initialize();

    // Subscribe to Bronze layer events for automatic processing
    this.eventBus.subscribe("bronze:new_request", async (data) => {
      try {
        await this.medallionManager.processBronzeToSilver(data.requestId);
      } catch (error) {
        console.error("Failed to process Bronze→Silver:", error);
      }
    });

    console.log("✓ Medallion Manager initialized");
  }

  async initializeAnalyticsProcessor() {
    console.log("→ Initializing Analytics Processor...");

    this.analyticsProcessor = new AnalyticsProcessor(
      this.medallionDb.db,
      this.eventBus
    );

    console.log("✓ Analytics Processor initialized");
  }

  async initializeRequestCapture() {
    console.log("→ Initializing Request Capture...");

    const config = {
      filters: {
        includePatterns: ["<all_urls>"],
      },
    };

    this.requestCapture = new RequestCaptureIntegration(
      this.medallionDb,
      this.eventBus,
      config
    );

    this.requestCapture.initialize();

    console.log("✓ Request Capture initialized");
  }

  initializeMessageHandlers() {
    console.log("→ Initializing Message Handlers...");

    // Get popup message handler function
    this.popupMessageHandler = initializePopupMessageHandler(
      this.localAuth,
      this.medallionDb
    );

    // Single consolidated message listener for better browser compatibility
    runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleAllMessages(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });

    console.log("✓ Message Handlers initialized");
  }

  async handleAllMessages(message, sender, sendResponse) {
    try {
      console.log("[handleAllMessages] Received message:", message.action);

      // First try popup/options handlers (register, login, getPageStats, query, etc.)
      if (this.popupMessageHandler) {
        const popupResponse = await this.popupMessageHandler(message, sender);
        console.log(
          "[handleAllMessages] Popup handler response:",
          popupResponse ? "received" : "null"
        );

        // If popup handler returned a response (not null), send it
        if (popupResponse !== null && popupResponse !== undefined) {
          console.log("[handleAllMessages] Sending popup response");
          sendResponse(popupResponse);
          return;
        }
      }

      // Then try medallion-specific handlers
      console.log("[handleAllMessages] Trying medallion handlers");
      await this.handleMedallionMessages(message, sender, sendResponse);
    } catch (error) {
      console.error("Message handling error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async handleMedallionMessages(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case "processToSilver": {
          const count = await this.medallionManager.processBronzeToSilver();
          sendResponse({ success: true, processed: count });
          break;
        }

        case "configureAutoExport": {
          await this.setupAutoExport(message.config);
          sendResponse({ success: true });
          break;
        }

        case "getDomainStats": {
          const stats = await this.medallionManager.getDomainStatistics(
            message.domain
          );
          sendResponse({ success: true, data: stats });
          break;
        }

        case "executeDirectQuery":
          try {
            // SQL.js doesn't support parameterized queries with ?
            // The query should already have values embedded or we execute as-is
            const rawResult = this.medallionDb.executeQuery(message.query);

            // Format result like handleQuery does for consistency
            if (!rawResult || rawResult.length === 0) {
              sendResponse({ success: true, data: [] });
            } else {
              const columns = rawResult[0].columns;
              const values = rawResult[0].values;

              const data = values.map((row) => {
                const obj = {};
                columns.forEach((col, index) => {
                  obj[col] = row[index];
                });
                return obj;
              });

              sendResponse({ success: true, data });
            }
          } catch (queryError) {
            console.error("Query execution error:", queryError);
            sendResponse({ success: false, error: queryError.message });
          }
          break;

        case "ping":
          sendResponse({ success: true, message: "pong" });
          break;

        case "clearDatabase":
          try {
            await this.medallionDb.clearDatabase();
            sendResponse({ success: true });
          } catch (clearError) {
            console.error("Clear database error:", clearError);
            sendResponse({ success: false, error: clearError.message });
          }
          break;

        case "resetDatabase":
          try {
            await this.medallionDb.resetDatabase();
            sendResponse({ success: true });
          } catch (resetError) {
            console.error("Reset database error:", resetError);
            sendResponse({ success: false, error: resetError.message });
          }
          break;

        case "performCleanup":
          try {
            const days = message.days || 30;
            const stats = await this.medallionDb.cleanupOldRecords(days);
            sendResponse({
              success: true,
              recordsDeleted: stats.recordsDeleted,
              cutoffDate: stats.cutoffDate,
            });
          } catch (cleanupError) {
            sendResponse({ success: false, error: cleanupError.message });
          }
          break;

        case "previewCleanup":
          try {
            const days = message.days || 30;
            const preview = this.medallionDb.previewCleanup(days);
            sendResponse({
              success: true,
              ...preview,
            });
          } catch (previewError) {
            sendResponse({ success: false, error: previewError.message });
          }
          break;

        case "vacuumDatabase":
          try {
            console.log("[Background] Vacuum database requested");
            await this.medallionDb.vacuumDatabase();
            sendResponse({
              success: true,
              message: "Database compacted successfully",
            });
          } catch (vacuumError) {
            console.error("[Background] Vacuum failed:", vacuumError);
            sendResponse({ success: false, error: vacuumError.message });
          }
          break;

        case "getDatabaseSize":
          try {
            const size = await this.medallionDb.getDatabaseSize();
            const stats = await this.medallionDb.getDatabaseStats();
            sendResponse({
              success: true,
              size: size,
              records: stats?.totalRequests || 0,
              oldestDate: stats?.oldestDate || null,
            });
          } catch (sizeError) {
            sendResponse({ success: false, error: sizeError.message });
          }
          break;

        case "createBackup": {
          try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `ura_backup_${timestamp}.sqlite`;

            const data = this.medallionDb.exportDatabase();

            // Convert to base64 in chunks to avoid stack overflow
            let binary = "";
            const chunkSize = 8192;
            for (let i = 0; i < data.length; i += chunkSize) {
              const chunk = data.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, chunk);
            }
            const base64 = btoa(binary);
            const dataUrl = `data:application/x-sqlite3;base64,${base64}`;

            await downloads.download({
              url: dataUrl,
              filename: filename,
              saveAs: true,
            });

            sendResponse({
              success: true,
              filename: filename,
              size: data.length,
            });
          } catch (backupError) {
            console.error("Backup error:", backupError);
            sendResponse({ success: false, error: backupError.message });
          }
          break;
        }

        case "exportDatabase": {
          try {
            console.log("[Background] Export raw database requested");
            const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
            const filename = `ura_export_${timestamp}.sqlite`;

            // Export database as Uint8Array
            const data = this.medallionDb.exportDatabase();

            // Convert to base64 in chunks to avoid stack overflow
            let binary = "";
            const chunkSize = 8192;
            for (let i = 0; i < data.length; i += chunkSize) {
              const chunk = data.subarray(i, i + chunkSize);
              binary += String.fromCharCode.apply(null, chunk);
            }
            const base64 = btoa(binary);
            const dataUrl = `data:application/x-sqlite3;base64,${base64}`;

            await downloads.download({
              url: dataUrl,
              filename: filename,
              saveAs: true,
            });

            sendResponse({
              success: true,
              filename: filename,
              size: data.length,
            });
          } catch (exportError) {
            console.error("[Background] Export error:", exportError);
            sendResponse({ success: false, error: exportError.message });
          }
          break;
        }

        case "importDatabase": {
          try {
            console.log("[Background] Import database requested");

            if (!message.data || !Array.isArray(message.data)) {
              throw new Error("Invalid database data");
            }

            // Convert array back to Uint8Array
            const uint8Array = new Uint8Array(message.data);

            // Import database
            await this.medallionDb.importDatabase(uint8Array);

            sendResponse({
              success: true,
              message: "Database imported successfully",
            });
          } catch (importError) {
            console.error("[Background] Import error:", importError);
            sendResponse({ success: false, error: importError.message });
          }
          break;
        }

        case "webVital": {
          try {
            const url = message.url || sender.tab?.url || sender.url;

            // Content script sends 'metric', not 'name'
            const metricName = message.metric || message.name;

            // Validate required fields
            if (!metricName) {
              console.error("Web vital missing 'metric' field:", message);
              sendResponse({ success: false, error: "Missing metric name" });
              break;
            }

            // Store web vital - map to insertWebVital expected fields
            const vitalData = {
              url: url,
              metric: metricName,
              value: message.value,
              rating: message.rating || "needs-improvement",
              timestamp: message.timestamp || Date.now(),
              viewport_width: message.viewportWidth,
              viewport_height: message.viewportHeight,
            };

            console.log(
              "[Background] Storing web vital:",
              metricName,
              vitalData
            );

            const result = await this.medallionManager.insertWebVital(
              vitalData
            );

            console.log(
              "[Background] Web vital stored successfully:",
              metricName,
              "result:",
              result
            );
            sendResponse({ success: true, id: result });
          } catch (vitalError) {
            console.error("Web vital capture error:", vitalError);
            sendResponse({ success: false, error: vitalError.message });
          }
          break;
        }

        case "userEvent": {
          try {
            const url = message.url || sender.tab?.url || sender.url;

            // Store event in database without session
            const eventData = {
              event_type: message.eventType,
              event_name: message.eventType,
              source: "content_script",
              data: message.eventData,
              request_id: null,
              user_id: null,
              session_id: null,
              timestamp: message.timestamp || Date.now(),
            };

            const result = await this.medallionManager.insertEvent(eventData);
            sendResponse({ success: true, id: result });
          } catch (eventError) {
            console.error("User event capture error:", eventError);
            sendResponse({ success: false, error: eventError.message });
          }
          break;
        }

        case "recordResourceTiming": {
          try {
            const success = await this.medallionManager.insertResourceTiming(
              message.timing
            );
            sendResponse({ success });
          } catch (timingError) {
            console.error("Resource timing capture error:", timingError);
            sendResponse({ success: false, error: timingError.message });
          }
          break;
        }

        case "getResourceCompressionStats": {
          try {
            const stats =
              await this.medallionManager.getResourceCompressionStats(
                message.filters || {}
              );
            sendResponse({ success: true, data: stats });
          } catch (statsError) {
            console.error("Compression stats error:", statsError);
            sendResponse({ success: false, error: statsError.message });
          }
          break;
        }

        default:
          sendResponse({ success: false, error: "Unknown action" });
      }
    } catch (error) {
      console.error("Message handler error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }

  schedulePeriodicTasks() {
    console.log("→ Scheduling Periodic Tasks...");

    // Process Bronze→Silver every 30 seconds (batch processing)
    const bronzeToSilver = setInterval(async () => {
      try {
        const count = await this.medallionManager.processBronzeToSilver();
        if (count > 0) {
          console.log(`Processed ${count} Bronze→Silver records`);
        }
      } catch (error) {
        console.error("Bronze→Silver processing failed:", error);
      }
    }, 30000); // 30 seconds for better performance
    this.scheduledTasks.push(bronzeToSilver);

    // Process Silver→Gold daily using alarms for reliability
    // Create alarm for daily processing at midnight
    if (alarms) {
      alarms.create("dailyGoldProcessing", {
        when: this.getNextMidnight(),
        periodInMinutes: 24 * 60, // Daily
      });

      alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === "dailyGoldProcessing") {
          try {
            await this.medallionManager.processSilverToGold();
            console.log("Processed Silver→Gold for daily aggregation");
          } catch (error) {
            console.error("Silver→Gold processing failed:", error);
          }
        } else if (alarm.name === "autoExport") {
          try {
            await this.handleAutoExport();
            console.log("Auto-export completed successfully");
          } catch (error) {
            console.error("Auto-export failed:", error);
          }
        }
      });
    } else {
      // Fallback to interval-based check
      const dailyGold = setInterval(async () => {
        try {
          const now = new Date();
          const hour = now.getHours();
          const minute = now.getMinutes();
          // Process between midnight and 1am
          if (hour === 0 && minute < 30) {
            await this.medallionManager.processSilverToGold();
            console.log("Processed Silver→Gold for daily aggregation");
          }
        } catch (error) {
          console.error("Silver→Gold processing failed:", error);
        }
      }, 30 * 60 * 1000); // Check every 30 minutes
      this.scheduledTasks.push(dailyGold);
    }

    console.log("✓ Periodic Tasks scheduled");
    console.log("  - Bronze→Silver: every 30 seconds");
    console.log("  - Silver→Gold: daily at midnight (chrome.alarms)");
    console.log("  - Auto-Export: configured via settings");
  }

  async handleAutoExport() {
    try {
      // Load auto-export configuration from DB
      const response = await this.popupMessageHandler({
        action: 'getSetting',
        category: 'export',
        key: 'autoExport'
      });

      if (!response || !response.success || !response.value) {
        console.log("[Auto-Export] No auto-export configuration found");
        return;
      }

      const autoExportConfig = response.value;
      
      if (!autoExportConfig.enabled) {
        console.log("[Auto-Export] Auto-export is disabled");
        return;
      }

      console.log("[Auto-Export] Starting auto-export with config:", autoExportConfig);

      // Determine export format (default to SQLite)
      const format = autoExportConfig.format || 'sqlite';
      let exportResponse;

      // Execute export based on format
      switch (format) {
        case 'sqlite':
          exportResponse = await this.popupMessageHandler({
            action: 'exportToSQLite',
            options: autoExportConfig.options || {}
          });
          break;
        case 'json':
          exportResponse = await this.popupMessageHandler({
            action: 'exportToJSON',
            options: autoExportConfig.options || {}
          });
          break;
        case 'csv':
          exportResponse = await this.popupMessageHandler({
            action: 'exportToCSV',
            options: autoExportConfig.options || {}
          });
          break;
        default:
          console.error("[Auto-Export] Unknown format:", format);
          return;
      }

      if (exportResponse && exportResponse.success) {
        console.log(`[Auto-Export] Export completed: ${exportResponse.filename}`);
        
        // Update last export time
        await this.popupMessageHandler({
          action: 'saveSetting',
          category: 'export',
          key: 'lastAutoExport',
          value: Date.now()
        });

        // TODO: Handle backup rotation if maxBackups is set
        // TODO: Trigger download or save to configured location
      } else {
        console.error("[Auto-Export] Export failed:", exportResponse?.error);
      }
    } catch (error) {
      console.error("[Auto-Export] Error during auto-export:", error);
    }
  }

  async setupAutoExport(config) {
    try {
      if (!config || !config.enabled) {
        // Clear existing auto-export alarm
        if (alarms) {
          await alarms.clear("autoExport");
        }
        console.log("[Auto-Export] Auto-export disabled or no config");
        return;
      }

      // Map frequency to minutes
      const frequencyMap = {
        'daily': 24 * 60,      // 1440 minutes
        'weekly': 7 * 24 * 60, // 10080 minutes
        'monthly': 30 * 24 * 60 // 43200 minutes
      };

      const periodInMinutes = frequencyMap[config.frequency] || 24 * 60;

      if (alarms) {
        // Clear existing alarm
        await alarms.clear("autoExport");
        
        // Create new alarm
        await alarms.create("autoExport", {
          when: Date.now() + 60000, // Start in 1 minute
          periodInMinutes: periodInMinutes
        });

        console.log(`[Auto-Export] Scheduled with frequency: ${config.frequency} (${periodInMinutes} minutes)`);
      } else {
        console.warn("[Auto-Export] chrome.alarms not available, auto-export won't work");
      }
    } catch (error) {
      console.error("[Auto-Export] Failed to setup auto-export:", error);
    }
  }

  getNextMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  async cleanup() {
    console.log("Cleaning up scheduled tasks...");
    this.scheduledTasks.forEach((task) => clearInterval(task));
    this.scheduledTasks = [];

    // Clear alarms
    if (alarms) {
      alarms.clear("dailyGoldProcessing");
      alarms.clear("autoExport");
    }

    // Save database before cleanup
    try {
      console.log("Saving database before cleanup...");
      const { saveDatabase } = await import("./database/db-manager.js");
      await saveDatabase();
      console.log("Database saved successfully.");
    } catch (error) {
      console.error("Failed to save database during cleanup:", error);
    }
  }
}

// Create and initialize extension (singleton)
let extensionInitializer = null;
let initializationPromise = null;

// Get or create initializer instance
function getInitializer() {
  if (!extensionInitializer) {
    extensionInitializer = new IntegratedExtensionInitializer();
  }
  return extensionInitializer;
}

// Safe initialization that prevents multiple concurrent runs
async function safeInitialize() {
  if (initializationPromise) {
    console.log("⏳ Initialization already in progress, waiting...");
    return initializationPromise;
  }

  const initializer = getInitializer();

  if (initializer.initialized) {
    console.log("✓ Extension already initialized");
    return;
  }

  console.log("🚀 Starting extension initialization...");
  initializationPromise = initializer.initialize();

  try {
    await initializationPromise;
    console.log("✓ Extension initialization complete");
  } finally {
    initializationPromise = null;
  }
}

// Initialize on install or update (only once)
runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed/updated:", details.reason);
  await safeInitialize();
});

// Initialize on browser startup (only once)
runtime.onStartup.addListener(async () => {
  console.log("Extension started on browser startup");
  await safeInitialize();
});

// Initialize immediately if service worker is already running (only once)
safeInitialize();

// Cleanup on suspension (service worker)
if (runtime.onSuspend) {
  runtime.onSuspend.addListener(() => {
    console.log("Service worker suspending, cleaning up...");
    const initializer = getInitializer();
    if (initializer) {
      initializer.cleanup();
    }
  });
}

// Export for testing/debugging
if (typeof globalThis !== "undefined") {
  globalThis.getExtensionInitializer = getInitializer;
}

export { getInitializer };
