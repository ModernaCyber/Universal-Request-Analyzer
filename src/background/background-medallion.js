// Updated Background Script Initializer
// Integrates medallion architecture with request capture and backend sync

import { initDatabase } from "./database/db-manager-medallion.js";
import { setupRequestCaptureIntegration } from "./capture/request-capture-integration.js";
import { setupBackendApiService } from "./api/backend-api-service.js";
import { setupDataSyncManager } from "./sync/data-sync-manager.js";
import { setupMessageHandlers } from "./messaging/message-handler.js";
import { setupEventBus } from "./messaging/event-bus.js";
import { createAnalyticsProcessor } from "./database/analytics-processor.js";
import { createStarSchema } from "./database/star-schema.js";
import settingsManager from "../lib/shared-components/settings-manager-core.js";

class MedallionExtensionInitializer {
  constructor() {
    this.dbManager = null;
    this.eventBus = null;
    this.services = new Map();
    this.analyticsProcessor = null;
    this.initializationState = {
      started: false,
      completed: false,
      failed: false,
      error: null,
    };
  }

  async initialize() {
    if (this.initializationState.started) {
      console.warn("Initialization already in progress");
      return false;
    }

    this.initializationState.started = true;

    try {
      console.log(
        "Initializing Universal Request Analyzer with Medallion Architecture..."
      );

      // Step 1: Initialize Event Bus
      await this.initializeEventBus();

      // Step 2: Initialize Database with Medallion Architecture
      await this.initializeDatabase();

      // Step 3: Initialize Star Schema
      await this.initializeStarSchema();

      // Step 4: Initialize Analytics Processor
      await this.initializeAnalyticsProcessor();

      // Step 5: Initialize Backend API Service
      await this.initializeBackendApi();

      // Step 6: Initialize Data Sync Manager
      await this.initializeDataSync();

      // Step 7: Initialize Request Capture
      await this.initializeRequestCapture();

      // Step 8: Initialize Message Handlers
      await this.initializeMessageHandlers();

      // Step 9: Schedule periodic tasks
      this.schedulePeriodicTasks();

      this.initializationState.completed = true;
      console.log("✓ Extension initialized successfully!");

      this.eventBus.publish("extension:ready", { timestamp: Date.now() });

      return true;
    } catch (error) {
      console.error("❌ Extension initialization failed:", error);
      this.initializationState.failed = true;
      this.initializationState.error = error;
      this.eventBus?.publish("extension:failed", { error: error.message });
      return false;
    }
  }

  async initializeEventBus() {
    console.log("→ Initializing Event Bus...");
    this.eventBus = setupEventBus();
    console.log("✓ Event Bus initialized");
  }

  async initializeDatabase() {
    console.log("→ Initializing Database with Medallion Architecture...");

    const config = {
      // Database configuration
    };

    this.dbManager = await initDatabase(config, null, this.eventBus);
    this.services.set("database", this.dbManager);

    // Inject database config manager into settings-manager for DB sync
    if (this.dbManager.config) {
      settingsManager.setDatabaseManager(this.dbManager.config);
      await settingsManager.initialize();
      console.log("✓ Settings-manager initialized with DB sync");
    }

    console.log("✓ Database initialized");
  }

  async initializeStarSchema() {
    console.log("→ Initializing Star Schema...");

    // Star schema is created as part of medallion schema
    // This is just a verification step
    try {
      const stats = this.dbManager.getDatabaseStats();
      console.log("✓ Star Schema ready:", stats);
    } catch (error) {
      console.warn("Star Schema verification warning:", error);
    }
  }

  async initializeAnalyticsProcessor() {
    console.log("→ Initializing Analytics Processor...");

    this.analyticsProcessor = createAnalyticsProcessor(
      this.dbManager.medallion.db,
      this.eventBus
    );
    this.services.set("analytics", this.analyticsProcessor);

    console.log("✓ Analytics Processor initialized");
  }

  async initializeBackendApi() {
    console.log("→ Initializing Backend API Service...");

    const config = {
      baseUrl: "", // Will be configured by user
      apiKey: "",
    };

    const backendApi = setupBackendApiService(config, this.eventBus);
    await backendApi.initialize();

    this.services.set("backendApi", backendApi);

    console.log("✓ Backend API Service initialized");
  }

  async initializeDataSync() {
    console.log("→ Initializing Data Sync Manager...");

    const backendApi = this.services.get("backendApi");
    const config = {
      autoSync: false, // Disabled by default
      syncIntervalMs: 300000, // 5 minutes
    };

    const dataSyncManager = setupDataSyncManager(
      this.dbManager,
      backendApi,
      this.eventBus,
      config
    );
    await dataSyncManager.initialize();

    this.services.set("dataSync", dataSyncManager);

    console.log("✓ Data Sync Manager initialized");
  }

  async initializeRequestCapture() {
    console.log("→ Initializing Request Capture...");

    const config = {
      filters: {
        includePatterns: ["<all_urls>"],
        excludePatterns: [],
      },
    };

    const requestCapture = setupRequestCaptureIntegration(
      this.dbManager,
      this.eventBus,
      config
    );

    this.services.set("requestCapture", requestCapture);

    console.log("✓ Request Capture initialized");
  }

  async initializeMessageHandlers() {
    console.log("→ Initializing Message Handlers...");

    const messageHandlers = setupMessageHandlers(
      this.dbManager,
      this.services,
      this.eventBus
    );

    this.services.set("messaging", messageHandlers);

    console.log("✓ Message Handlers initialized");
  }

  schedulePeriodicTasks() {
    console.log("→ Scheduling periodic tasks...");

    // Generate daily analytics at midnight
    const scheduleDaily = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const msUntilMidnight = tomorrow - now;

      setTimeout(async () => {
        try {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const dateStr = yesterday.toISOString().split("T")[0];

          await this.dbManager.medallion.processDailyAnalytics(dateStr);

          console.log("✓ Daily analytics generated");
        } catch (error) {
          console.error("Failed to generate daily analytics:", error);
        }

        // Schedule next day
        scheduleDaily();
      }, msUntilMidnight);
    };

    scheduleDaily();

    // Database maintenance every 6 hours
    setInterval(async () => {
      try {
        // Cleanup old pending requests
        this.services.get("requestCapture")?.cleanup();

        // Vacuum database if needed
        const stats = this.dbManager.getDatabaseStats();
        if (stats && stats.size > 100 * 1024 * 1024) {
          // > 100MB
          this.dbManager.vacuumDatabase();
          console.log("✓ Database vacuumed");
        }
      } catch (error) {
        console.error("Failed database maintenance:", error);
      }
    }, 6 * 3600000); // Every 6 hours

    console.log("✓ Periodic tasks scheduled");
  }

  getService(name) {
    return this.services.get(name);
  }

  getStatus() {
    return {
      initialized: this.initializationState.completed,
      failed: this.initializationState.failed,
      error: this.initializationState.error?.message,
      services: {
        database: !!this.dbManager,
        analytics: !!this.analyticsProcessor,
        backendApi: this.services.get("backendApi")?.getStatus(),
        dataSync: this.services.get("dataSync")?.getStatus(),
        requestCapture: this.services.get("requestCapture")?.getStatistics(),
      },
    };
  }
}

// Create and initialize extension
const extensionInitializer = new MedallionExtensionInitializer();

// Initialize on install or startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("Extension installed/updated:", details.reason);
  await extensionInitializer.initialize();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("Extension started");
  await extensionInitializer.initialize();
});

// Initialize immediately if service worker is already running
(async () => {
  await extensionInitializer.initialize();
})();

// Export for testing/debugging
if (typeof globalThis !== "undefined") {
  globalThis.extensionInitializer = extensionInitializer;
}

export { extensionInitializer };
