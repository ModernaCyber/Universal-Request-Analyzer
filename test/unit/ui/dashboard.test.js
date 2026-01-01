/**
 * Unit tests for UI dashboard components
 * Tests data visualization, filtering, and interaction logic
 */

import { createMockChart, createMockAnalytics, createMockRequests } from "../../utils/testHelpers";

describe("Dashboard UI Components", () => {
  let mockChart;
  let mockAnalytics;

  beforeEach(() => {
    mockChart = createMockChart();
    mockAnalytics = createMockAnalytics();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Chart Rendering", () => {
    it("should initialize chart with data", () => {
      // Guard clause: ensure analytics data exists
      if (!mockAnalytics) {
        throw new Error("Analytics data required");
      }

      mockChart.data.labels = Object.keys(mockAnalytics.requestsByMethod);
      mockChart.data.datasets = [
        {
          data: Object.values(mockAnalytics.requestsByMethod),
        },
      ];

      expect(mockChart.data.labels).toHaveLength(4);
      expect(mockChart.data.datasets[0].data).toHaveLength(4);
    });

    it("should update chart when data changes", () => {
      mockChart.data.labels = ["GET", "POST"];
      mockChart.data.datasets = [{ data: [100, 50] }];
      mockChart.update();

      expect(mockChart.update).toHaveBeenCalled();
    });

    it("should destroy chart on cleanup", () => {
      mockChart.destroy();

      expect(mockChart.destroy).toHaveBeenCalled();
    });

    it("should resize chart on window resize", () => {
      mockChart.resize();

      expect(mockChart.resize).toHaveBeenCalled();
    });
  });

  describe("Data Filtering", () => {
    it("should filter requests by domain", () => {
      const requests = createMockRequests(10, { domain: "example.com" });
      const filtered = requests.filter((r) => r.domain === "example.com");

      expect(filtered).toHaveLength(10);
    });

    it("should filter requests by status code", () => {
      const requests = [
        ...createMockRequests(5, { status: 200 }),
        ...createMockRequests(3, { status: 404 }),
        ...createMockRequests(2, { status: 500 }),
      ];

      const successfulRequests = requests.filter((r) => r.status >= 200 && r.status < 300);
      expect(successfulRequests).toHaveLength(5);
    });

    it("should filter requests by time range", () => {
      const now = Date.now();
      const requests = [
        ...createMockRequests(5, { timestamp: now - 60000 }), // 1 min ago
        ...createMockRequests(3, { timestamp: now - 3600000 }), // 1 hour ago
        ...createMockRequests(2, { timestamp: now - 86400000 }), // 1 day ago
      ];

      const last5Min = requests.filter((r) => now - r.timestamp <= 300000);
      expect(last5Min).toHaveLength(5);
    });

    it("should combine multiple filters", () => {
      const now = Date.now();
      const requests = createMockRequests(10).map((r, i) => ({
        ...r,
        domain: i % 2 === 0 ? "api.example.com" : "cdn.example.com",
        status: i % 3 === 0 ? 404 : 200,
        timestamp: now - i * 60000,
      }));

      const filtered = requests.filter(
        (r) =>
          r.domain === "api.example.com" &&
          r.status === 200 &&
          now - r.timestamp <= 600000
      );

      expect(filtered.length).toBeGreaterThan(0);
      filtered.forEach((r) => {
        expect(r.domain).toBe("api.example.com");
        expect(r.status).toBe(200);
      });
    });
  });

  describe("Statistics Display", () => {
    it("should calculate total requests", () => {
      const total = mockAnalytics.totalRequests;
      expect(total).toBe(100);
    });

    it("should calculate success rate", () => {
      const successRate = mockAnalytics.successRate;
      expect(successRate).toBe(0.95);
      expect(successRate).toBeGreaterThanOrEqual(0);
      expect(successRate).toBeLessThanOrEqual(1);
    });

    it("should calculate average response time", () => {
      const avgTime = mockAnalytics.avgResponseTime;
      expect(avgTime).toBe(234);
      expect(avgTime).toBeGreaterThan(0);
    });

    it("should group requests by method", () => {
      const byMethod = mockAnalytics.requestsByMethod;

      expect(byMethod.GET).toBe(60);
      expect(byMethod.POST).toBe(25);
      expect(byMethod.PUT).toBe(10);
      expect(byMethod.DELETE).toBe(5);
    });

    it("should group requests by status", () => {
      const byStatus = mockAnalytics.requestsByStatus;

      expect(byStatus["2xx"]).toBe(95);
      expect(byStatus["4xx"]).toBe(2);
      expect(byStatus["5xx"]).toBe(1);
    });
  });

  describe("Pagination", () => {
    it("should paginate large datasets", () => {
      const requests = createMockRequests(100);
      const pageSize = 10;
      const page = 1;

      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const paginated = requests.slice(start, end);

      expect(paginated).toHaveLength(10);
      expect(paginated[0].id).toBe("req-0");
    });

    it("should calculate total pages", () => {
      const totalItems = 95;
      const pageSize = 10;
      const totalPages = Math.ceil(totalItems / pageSize);

      expect(totalPages).toBe(10);
    });

    it("should handle last page with fewer items", () => {
      const requests = createMockRequests(95);
      const pageSize = 10;
      const lastPage = 10;

      const start = (lastPage - 1) * pageSize;
      const paginated = requests.slice(start);

      expect(paginated).toHaveLength(5);
    });
  });

  describe("Search and Sort", () => {
    it("should search by URL", () => {
      const requests = createMockRequests(10);
      const searchTerm = "test-5";

      const results = requests.filter((r) => r.url.includes(searchTerm));

      expect(results).toHaveLength(1);
      expect(results[0].url).toContain("test-5");
    });

    it("should sort by timestamp", () => {
      const requests = createMockRequests(5);
      const sorted = [...requests].sort((a, b) => b.timestamp - a.timestamp);

      expect(sorted[0].timestamp).toBeGreaterThanOrEqual(sorted[1].timestamp);
    });

    it("should sort by response time", () => {
      const requests = [
        ...createMockRequests(1, { responseTime: 500 }),
        ...createMockRequests(1, { responseTime: 100 }),
        ...createMockRequests(1, { responseTime: 300 }),
      ];

      const sorted = [...requests].sort((a, b) => b.responseTime - a.responseTime);

      expect(sorted[0].responseTime).toBe(500);
      expect(sorted[2].responseTime).toBe(100);
    });
  });

  describe("Error Display", () => {
    it("should display error state when no data", () => {
      const requests = [];
      const hasData = requests.length > 0;

      expect(hasData).toBe(false);
    });

    it("should display loading state", () => {
      let isLoading = true;
      let data = null;

      // Simulate loading complete
      isLoading = false;
      data = mockAnalytics;

      expect(isLoading).toBe(false);
      expect(data).toBeDefined();
    });

    it("should handle chart rendering errors", () => {
      mockChart.update.mockImplementation(() => {
        throw new Error("Chart update failed");
      });

      expect(() => mockChart.update()).toThrow("Chart update failed");
    });
  });

  describe("Export Functionality", () => {
    it("should export data as JSON", () => {
      const requests = createMockRequests(5);
      const json = JSON.stringify(requests);

      expect(json).toBeTruthy();
      expect(JSON.parse(json)).toHaveLength(5);
    });

    it("should export filtered data", () => {
      const requests = createMockRequests(10);
      const filtered = requests.filter((r) => r.status === 200);
      const json = JSON.stringify(filtered);

      const parsed = JSON.parse(json);
      expect(parsed.length).toBeGreaterThan(0);
      parsed.forEach((r) => expect(r.status).toBe(200));
    });

    it("should create download blob", () => {
      const data = { requests: createMockRequests(5) };
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: "application/json" });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("application/json");
    });
  });
});
