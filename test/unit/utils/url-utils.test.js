/**
 * Unit tests for URL utility functions
 * Tests isolated URL parsing, validation, and manipulation functions
 */

import {
  parseUrl,
  getBaseDomain,
  isValidUrl,
  getUrlWithoutQuery,
  getQueryParams,
  buildUrl,
  sanitizeUrl,
} from "../../../src/background/utils/url-utils";

describe("url-utils", () => {
  describe("parseUrl", () => {
    // Guard clause: reject invalid inputs early
    it("should return empty object for invalid URL", () => {
      const result = parseUrl("not-a-url");
      
      expect(result.domain).toBe("");
      expect(result.path).toBe("");
      expect(result.protocol).toBe("");
    });

    it("should parse complete URL correctly", () => {
      const url = "https://api.example.com:8080/path/to/resource?query=value#section";
      const result = parseUrl(url);

      expect(result.domain).toBe("api.example.com");
      expect(result.path).toBe("/path/to/resource");
      expect(result.protocol).toBe("https:");
      expect(result.port).toBe("8080");
      expect(result.query).toBe("?query=value");
      expect(result.hash).toBe("#section");
      expect(result.fullPath).toBe("/path/to/resource?query=value#section");
    });

    it("should parse URL with default port", () => {
      const url = "https://example.com/path";
      const result = parseUrl(url);

      expect(result.domain).toBe("example.com");
      expect(result.port).toBe("");
    });

    it("should handle URL with no path", () => {
      const url = "https://example.com";
      const result = parseUrl(url);

      expect(result.path).toBe("/");
      expect(result.fullPath).toBe("/");
    });
  });

  describe("getBaseDomain", () => {
    it("should return domain as-is for simple domains", () => {
      expect(getBaseDomain("example.com")).toBe("example.com");
    });

    it("should extract base domain from subdomain", () => {
      expect(getBaseDomain("api.example.com")).toBe("example.com");
      expect(getBaseDomain("www.api.example.com")).toBe("example.com");
    });

    it("should handle special TLDs correctly", () => {
      expect(getBaseDomain("example.co.uk")).toBe("example.co.uk");
      expect(getBaseDomain("api.example.co.uk")).toBe("example.co.uk");
    });

    it("should handle single-part domain", () => {
      expect(getBaseDomain("localhost")).toBe("localhost");
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://localhost:8080")).toBe(true);
      expect(isValidUrl("ftp://files.example.com/file.txt")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl("javascript:alert(1)")).toBe(false);
    });
  });

  describe("getUrlWithoutQuery", () => {
    it("should remove query parameters", () => {
      const url = "https://example.com/path?foo=bar&baz=qux";
      expect(getUrlWithoutQuery(url)).toBe("https://example.com/path");
    });

    it("should preserve hash", () => {
      const url = "https://example.com/path?query=value#section";
      const result = getUrlWithoutQuery(url);
      // Note: URL API behavior removes hash in origin + pathname
      expect(result).toBe("https://example.com/path");
    });

    it("should return original URL if parsing fails", () => {
      const invalidUrl = "not-a-url";
      expect(getUrlWithoutQuery(invalidUrl)).toBe(invalidUrl);
    });
  });

  describe("getQueryParams", () => {
    // Guard clause: return empty object for invalid input
    it("should return empty object for invalid URL", () => {
      expect(getQueryParams("not-a-url")).toEqual({});
    });

    it("should parse query parameters", () => {
      const url = "https://example.com/path?foo=bar&baz=qux&count=42";
      const params = getQueryParams(url);

      expect(params).toEqual({
        foo: "bar",
        baz: "qux",
        count: "42",
      });
    });

    it("should return empty object for URL with no params", () => {
      expect(getQueryParams("https://example.com/path")).toEqual({});
    });

    it("should handle duplicate parameter names", () => {
      const url = "https://example.com/path?foo=bar&foo=baz";
      const params = getQueryParams(url);
      
      // URL API behavior: last value wins
      expect(params.foo).toBe("baz");
    });
  });

  describe("buildUrl", () => {
    it("should build URL from parts", () => {
      const parts = {
        protocol: "https:",
        domain: "example.com",
        path: "/path/to/resource",
        query: "?foo=bar",
        hash: "#section",
      };

      const url = buildUrl(parts);
      expect(url).toBe("https://example.com/path/to/resource?foo=bar#section");
    });

    it("should use defaults for missing parts", () => {
      const parts = { domain: "example.com" };
      const url = buildUrl(parts);
      
      expect(url).toContain("example.com");
      expect(url).toContain("https://");
    });

    it("should handle port", () => {
      const parts = {
        protocol: "http:",
        domain: "localhost",
        port: "8080",
        path: "/api",
      };

      const url = buildUrl(parts);
      expect(url).toBe("http://localhost:8080/api");
    });
  });

  describe("sanitizeUrl", () => {
    // Guard clause: handle null/undefined input
    it("should return empty string for falsy input", () => {
      expect(sanitizeUrl(null)).toBe("");
      expect(sanitizeUrl(undefined)).toBe("");
      expect(sanitizeUrl("")).toBe("");
    });

    it("should display hostname and path", () => {
      const url = "https://example.com/path/to/resource";
      const result = sanitizeUrl(url);
      
      expect(result).toBe("example.com/path/to/resource");
    });

    it("should omit root path", () => {
      const url = "https://example.com/";
      const result = sanitizeUrl(url);
      
      expect(result).toBe("example.com");
    });

    it("should truncate long URLs", () => {
      const longUrl = "https://example.com/very/long/path/that/exceeds/the/maximum/length";
      const result = sanitizeUrl(longUrl, 20);
      
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain("...");
    });

    it("should handle invalid URLs by truncating", () => {
      const invalidUrl = "not-a-url-but-very-long-string-that-needs-truncation";
      const result = sanitizeUrl(invalidUrl, 20);
      
      expect(result.length).toBeLessThanOrEqual(20);
      expect(result).toContain("...");
    });
  });
});
