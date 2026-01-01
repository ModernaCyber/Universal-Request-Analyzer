// MSW request handlers for mocking network responses
import { rest } from "msw";

/**
 * Mock handlers for extension API endpoints
 * Used in integration tests to simulate network responses
 */
export const handlers = [
  // Config API endpoint
  rest.get("https://api.example.com/config", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        features: {
          onlineSync: true,
          authentication: true,
          remoteStorage: true,
        },
        permissions: {
          role: "admin",
          customPermissions: [],
        },
      })
    );
  }),

  // Authentication endpoint
  rest.post("https://api.example.com/auth/login", (req, res, ctx) => {
    const { username, password } = req.body;

    if (username === "testuser" && password === "password") {
      return res(
        ctx.status(200),
        ctx.json({
          success: true,
          token: "mock-jwt-token",
          user: {
            id: "123",
            username: "testuser",
            role: "admin",
          },
        })
      );
    }

    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        message: "Invalid credentials",
      })
    );
  }),

  // Data sync endpoint
  rest.post("https://api.example.com/sync", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        lastSyncTime: new Date().toISOString(),
      })
    );
  }),

  // Feature flags endpoint
  rest.get("https://api.example.com/features", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        features: {
          captureRequests: true,
          filterRequests: true,
          exportData: true,
          statistics: true,
          visualization: true,
          onlineSync: true,
          authentication: true,
          remoteStorage: true,
          cloudExport: true,
          teamSharing: true,
          requestModification: false,
          requestMocking: false,
          automatedTesting: false,
          performanceAlerts: false,
          customRules: false,
          aiAnalysis: false,
          predictiveAnalytics: false,
          securityScanning: false,
        },
      })
    );
  }),

  // Request capture mock - simulates captured network request
  rest.post("https://api.example.com/requests/capture", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        requestId: "req-123",
      })
    );
  }),

  // Analytics endpoint
  rest.get("https://api.example.com/analytics/stats", (req, res, ctx) => {
    const domain = req.url.searchParams.get("domain");
    return res(
      ctx.status(200),
      ctx.json({
        domain: domain || "example.com",
        totalRequests: 150,
        successRate: 0.95,
        avgResponseTime: 234,
        requestsByMethod: {
          GET: 100,
          POST: 30,
          PUT: 15,
          DELETE: 5,
        },
      })
    );
  }),

  // Export data endpoint
  rest.post("https://api.example.com/export", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        success: true,
        exportId: "export-123",
        downloadUrl: "https://api.example.com/exports/export-123.json",
      })
    );
  }),

  // Mock external API that extension might capture
  rest.get("https://external-api.example.com/data", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: "test data",
        timestamp: new Date().toISOString(),
      })
    );
  }),
];
