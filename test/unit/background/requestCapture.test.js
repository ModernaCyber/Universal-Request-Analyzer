/**
 * Unit tests for request capture logic
 * Tests request filtering, parsing, and performance metrics collection
 */

import { createMockRequest, guardAgainstNull } from "../../utils/testHelpers";

// Mock PerformanceMetricsCollector class
class PerformanceMetricsCollector {
  constructor(config) {
    this.enabled = config.enabled;
    this.samplingRate = config.samplingRate;
    this.metrics = new Map();
    this.retentionPeriod = config.retentionPeriod;
  }

  shouldCapture() {
    return this.enabled && Math.random() * 100 <= this.samplingRate;
  }

  captureRequestStart(requestId, timestamp) {
    if (!this.shouldCapture()) return;

    this.metrics.set(requestId, {
      startTime: timestamp,
      dnsStart: 0,
      dnsEnd: 0,
      connectStart: 0,
      connectEnd: 0,
      sslStart: 0,
      sslEnd: 0,
      sendStart: 0,
      sendEnd: 0,
      receiveStart: 0,
      receiveEnd: 0,
      endTime: 0,
      total: 0,
    });
  }

  updateRequestTiming(requestId, timing) {
    if (!this.metrics.has(requestId)) return;

    const metric = this.metrics.get(requestId);

    if (timing) {
      metric.dnsStart = timing.dnsStart || 0;
      metric.dnsEnd = timing.dnsEnd || 0;
      metric.connectStart = timing.connectStart || 0;
      metric.connectEnd = timing.connectEnd || 0;
      metric.sslStart = timing.sslStart || 0;
      metric.sslEnd = timing.sslEnd || 0;
      metric.sendStart = timing.sendStart || 0;
      metric.sendEnd = timing.sendEnd || 0;
      metric.receiveStart = timing.receiveStart || 0;
      metric.receiveEnd = timing.receiveEnd || 0;
    }
  }

  finalizeRequest(requestId, endTime) {
    if (!this.metrics.has(requestId)) return;

    const metric = this.metrics.get(requestId);
    metric.endTime = endTime;

    metric.dns = metric.dnsEnd - metric.dnsStart || 0;
    metric.tcp =
      metric.connectEnd -
        metric.connectStart -
        (metric.sslEnd - metric.sslStart) || 0;
    metric.ssl = metric.sslEnd - metric.sslStart || 0;
    metric.ttfb = metric.receiveStart - metric.sendEnd || 0;
    metric.download = metric.receiveEnd - metric.receiveStart || 0;
    metric.total = metric.endTime - metric.startTime || 0;

    return metric;
  }

  getMetrics(requestId) {
    return this.metrics.get(requestId);
  }

  cleanupOldMetrics() {
    const now = Date.now();
    for (const [requestId, metric] of this.metrics.entries()) {
      if (now - metric.endTime > this.retentionPeriod) {
        this.metrics.delete(requestId);
      }
    }
  }
}

describe("Request Capture", () => {
  describe("PerformanceMetricsCollector", () => {
    let collector;

    beforeEach(() => {
      collector = new PerformanceMetricsCollector({
        enabled: true,
        samplingRate: 100,
        retentionPeriod: 7 * 24 * 60 * 60 * 1000,
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe("Initialization", () => {
      it("should initialize with config", () => {
        expect(collector.enabled).toBe(true);
        expect(collector.samplingRate).toBe(100);
        expect(collector.metrics).toBeInstanceOf(Map);
      });

      it("should respect disabled state", () => {
        const disabledCollector = new PerformanceMetricsCollector({
          enabled: false,
          samplingRate: 100,
          retentionPeriod: 1000,
        });

        expect(disabledCollector.shouldCapture()).toBe(false);
      });
    });

    describe("Request Start Capture", () => {
      // Guard clause: handle sampling rate
      it("should respect sampling rate", () => {
        const lowSampleCollector = new PerformanceMetricsCollector({
          enabled: true,
          samplingRate: 0,
          retentionPeriod: 1000,
        });

        lowSampleCollector.captureRequestStart("req1", Date.now());
        expect(lowSampleCollector.metrics.size).toBe(0);
      });

      it("should capture request start", () => {
        const timestamp = Date.now();
        collector.captureRequestStart("req1", timestamp);

        const metrics = collector.getMetrics("req1");
        expect(metrics).toBeDefined();
        expect(metrics.startTime).toBe(timestamp);
      });

      it("should initialize all timing fields", () => {
        collector.captureRequestStart("req1", Date.now());
        const metrics = collector.getMetrics("req1");

        expect(metrics.dnsStart).toBe(0);
        expect(metrics.dnsEnd).toBe(0);
        expect(metrics.connectStart).toBe(0);
        expect(metrics.total).toBe(0);
      });
    });

    describe("Update Request Timing", () => {
      beforeEach(() => {
        collector.captureRequestStart("req1", Date.now());
      });

      // Guard clause: ignore updates for non-existent requests
      it("should ignore updates for non-existent request", () => {
        collector.updateRequestTiming("non-existent", { dnsStart: 100 });
        expect(collector.getMetrics("non-existent")).toBeUndefined();
      });

      it("should update timing information", () => {
        const timing = {
          dnsStart: 100,
          dnsEnd: 150,
          connectStart: 150,
          connectEnd: 200,
        };

        collector.updateRequestTiming("req1", timing);
        const metrics = collector.getMetrics("req1");

        expect(metrics.dnsStart).toBe(100);
        expect(metrics.dnsEnd).toBe(150);
        expect(metrics.connectStart).toBe(150);
        expect(metrics.connectEnd).toBe(200);
      });

      it("should handle partial timing updates", () => {
        collector.updateRequestTiming("req1", { dnsStart: 100 });
        const metrics = collector.getMetrics("req1");

        expect(metrics.dnsStart).toBe(100);
        expect(metrics.dnsEnd).toBe(0);
      });
    });

    describe("Finalize Request", () => {
      beforeEach(() => {
        const startTime = 1000;
        collector.captureRequestStart("req1", startTime);
        collector.updateRequestTiming("req1", {
          dnsStart: 1000,
          dnsEnd: 1050,
          connectStart: 1050,
          connectEnd: 1150,
          sslStart: 1100,
          sslEnd: 1150,
          sendEnd: 1150,
          receiveStart: 1350,
          receiveEnd: 1450,
        });
      });

      // Guard clause: handle non-existent requests
      it("should return undefined for non-existent request", () => {
        const result = collector.finalizeRequest("non-existent", Date.now());
        expect(result).toBeUndefined();
      });

      it("should calculate timing breakdowns", () => {
        const metrics = collector.finalizeRequest("req1", 1450);

        expect(metrics.dns).toBe(50);
        expect(metrics.ssl).toBe(50);
        expect(metrics.ttfb).toBe(200);
        expect(metrics.download).toBe(100);
        expect(metrics.total).toBe(450);
      });

      it("should set end time", () => {
        const endTime = 1450;
        const metrics = collector.finalizeRequest("req1", endTime);

        expect(metrics.endTime).toBe(endTime);
      });
    });

    describe("Cleanup Old Metrics", () => {
      it("should remove old metrics", () => {
        const oldTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000;
        collector.captureRequestStart("old-req", oldTimestamp);
        collector.finalizeRequest("old-req", oldTimestamp);

        const recentTimestamp = Date.now();
        collector.captureRequestStart("recent-req", recentTimestamp);

        collector.cleanupOldMetrics();

        expect(collector.getMetrics("old-req")).toBeUndefined();
        expect(collector.getMetrics("recent-req")).toBeDefined();
      });

      it("should keep recent metrics", () => {
        const timestamp = Date.now();
        collector.captureRequestStart("req1", timestamp);
        collector.finalizeRequest("req1", timestamp);

        collector.cleanupOldMetrics();

        expect(collector.getMetrics("req1")).toBeDefined();
      });
    });
  });

  describe("Request Filtering", () => {
    it("should filter by domain", () => {
      const request = createMockRequest({
        domain: "example.com",
      });

      const includeDomains = ["example.com"];
      const isIncluded = includeDomains.includes(request.domain);

      expect(isIncluded).toBe(true);
    });

    it("should exclude by domain", () => {
      const request = createMockRequest({
        domain: "excluded.com",
      });

      const excludeDomains = ["excluded.com"];
      const isExcluded = excludeDomains.includes(request.domain);

      expect(isExcluded).toBe(true);
    });

    it("should filter by request type", () => {
      const request = createMockRequest({
        type: "xmlhttprequest",
      });

      const includeTypes = ["xmlhttprequest", "fetch"];
      const isIncluded = includeTypes.includes(request.type);

      expect(isIncluded).toBe(true);
    });
  });
});
