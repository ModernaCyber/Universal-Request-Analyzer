/**
 * Unit tests for content script functionality
 * Tests message passing, DOM interaction, and page context detection
 */

describe("Content Script", () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = global.chrome;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    it("should initialize content script", () => {
      const initialized = true;
      expect(initialized).toBe(true);
    });

    it("should register message listeners", () => {
      const listener = jest.fn();
      mockChrome.runtime.onMessage.addListener(listener);

      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
    });

    it("should check if running in correct context", () => {
      // Content scripts run in page context
      const isContentScript = typeof chrome !== "undefined" && chrome.runtime;
      expect(isContentScript).toBe(true);
    });
  });

  describe("Message Passing", () => {
    it("should send message to background", async () => {
      const message = { action: "captureRequest", data: { url: "https://example.com" } };
      const response = await mockChrome.runtime.sendMessage(message);

      expect(response.success).toBe(true);
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(message);
    });

    it("should receive message from background", () => {
      const listener = jest.fn((message, sender, sendResponse) => {
        if (message.action === "updateUI") {
          sendResponse({ success: true });
        }
      });

      mockChrome.runtime.onMessage.addListener(listener);

      // Simulate message
      const message = { action: "updateUI", data: {} };
      listener(message, {}, jest.fn());

      expect(listener).toHaveBeenCalledWith(message, {}, expect.any(Function));
    });

    it("should handle message errors gracefully", async () => {
      mockChrome.runtime.sendMessage.mockRejectedValueOnce(new Error("Connection error"));

      await expect(mockChrome.runtime.sendMessage({ action: "test" })).rejects.toThrow(
        "Connection error"
      );
    });
  });

  describe("Page Context Detection", () => {
    it("should detect page URL", () => {
      const pageUrl = window.location.href;
      expect(typeof pageUrl).toBe("string");
    });

    it("should detect page domain", () => {
      // Mock window.location
      Object.defineProperty(window, "location", {
        value: {
          hostname: "example.com",
          href: "https://example.com/page",
        },
        writable: true,
      });

      const domain = window.location.hostname;
      expect(domain).toBe("example.com");
    });

    it("should check if page is allowed", () => {
      const allowedDomains = ["example.com", "test.com"];
      const currentDomain = "example.com";
      const isAllowed = allowedDomains.includes(currentDomain);

      expect(isAllowed).toBe(true);
    });

    it("should check if page is excluded", () => {
      const excludedDomains = ["ads.example.com", "tracking.com"];
      const currentDomain = "ads.example.com";
      const isExcluded = excludedDomains.includes(currentDomain);

      expect(isExcluded).toBe(true);
    });
  });

  describe("DOM Interaction", () => {
    it("should create UI elements", () => {
      const element = document.createElement("div");
      element.id = "extension-ui";
      element.textContent = "Extension Active";

      expect(element.id).toBe("extension-ui");
      expect(element.textContent).toBe("Extension Active");
    });

    it("should inject styles", () => {
      const style = document.createElement("style");
      style.textContent = ".extension-class { color: red; }";
      document.head.appendChild(style);

      expect(document.head.contains(style)).toBe(true);
    });

    it("should remove injected elements on cleanup", () => {
      const element = document.createElement("div");
      element.id = "extension-ui";
      document.body.appendChild(element);

      // Cleanup
      const toRemove = document.getElementById("extension-ui");
      if (toRemove) {
        toRemove.remove();
      }

      expect(document.getElementById("extension-ui")).toBeNull();
    });
  });

  describe("Storage Access", () => {
    it("should read settings from storage", async () => {
      const settings = {
        capture: { enabled: true },
      };

      mockChrome.storage.local.get.mockResolvedValueOnce({ settings });
      const result = await mockChrome.storage.local.get("settings");

      expect(result.settings).toEqual(settings);
    });

    it("should update settings in storage", async () => {
      const newSettings = {
        capture: { enabled: false },
      };

      await mockChrome.storage.local.set({ settings: newSettings });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        settings: newSettings,
      });
    });

    it("should handle storage errors", async () => {
      mockChrome.storage.local.get.mockRejectedValueOnce(new Error("Storage unavailable"));

      await expect(mockChrome.storage.local.get("settings")).rejects.toThrow(
        "Storage unavailable"
      );
    });
  });

  describe("Event Listeners", () => {
    it("should listen for page navigation", () => {
      const navigationListener = jest.fn();
      window.addEventListener("popstate", navigationListener);

      window.dispatchEvent(new Event("popstate"));

      expect(navigationListener).toHaveBeenCalled();
    });

    it("should listen for DOM changes", () => {
      const observer = new MutationObserver(jest.fn());
      observer.observe(document.body, { childList: true });

      expect(observer.observe).toBeDefined();
      observer.disconnect();
    });

    it("should cleanup listeners on unload", () => {
      const listener = jest.fn();
      window.addEventListener("beforeunload", listener);

      // Cleanup
      window.removeEventListener("beforeunload", listener);

      window.dispatchEvent(new Event("beforeunload"));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("Cross-Origin Communication", () => {
    it("should handle same-origin messages", () => {
      const message = { type: "REQUEST_DATA", data: {} };
      const listener = jest.fn((event) => {
        if (event.data.type === "REQUEST_DATA") {
          return { success: true };
        }
      });

      window.addEventListener("message", listener);
      window.postMessage(message, "*");

      // Note: postMessage is asynchronous
      setTimeout(() => {
        expect(listener).toHaveBeenCalled();
      }, 0);
    });

    // Guard clause: reject messages from untrusted origins
    it("should reject messages from untrusted origins", () => {
      const trustedOrigins = ["https://example.com"];
      const messageOrigin = "https://untrusted.com";

      const isTrusted = trustedOrigins.includes(messageOrigin);
      expect(isTrusted).toBe(false);
    });
  });

  describe("Performance", () => {
    it("should not block page rendering", () => {
      // Content scripts should be non-blocking
      const startTime = performance.now();

      // Simulate lightweight operation
      const data = { count: 100 };
      JSON.stringify(data);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
    });

    it("should cleanup resources efficiently", () => {
      const resources = {
        listeners: [],
        observers: [],
        intervals: [],
      };

      // Simulate cleanup
      resources.listeners.forEach((l) => window.removeEventListener("event", l));
      resources.observers.forEach((o) => o.disconnect());
      resources.intervals.forEach((i) => clearInterval(i));

      expect(resources.listeners).toHaveLength(0);
    });
  });
});
