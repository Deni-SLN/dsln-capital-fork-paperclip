import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  centsToIdr,
  formatIdr,
  formatKurs,
  getCachedExchangeRate,
  fetchLiveUsdIdrRate,
} from "./exchange-rate";

describe("exchange-rate utility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("centsToIdr", () => {
    it("converts 0 cents to 0 IDR", () => {
      expect(centsToIdr(0, 18000)).toBe(0);
      expect(centsToIdr(null, 18000)).toBe(0);
      expect(centsToIdr(undefined, 18000)).toBe(0);
    });

    it("converts 100 cents (1 USD) at 18,158 rate correctly", () => {
      expect(centsToIdr(100, 18158)).toBe(18158);
    });

    it("converts 500 cents (5 USD) at 18,000 rate correctly", () => {
      expect(centsToIdr(500, 18000)).toBe(90000);
    });

    it("converts fractional cents properly with rounding", () => {
      expect(centsToIdr(150, 18158)).toBe(27237);
    });
  });

  describe("formatIdr", () => {
    it("formats 0 cents into Rp 0", () => {
      const result = formatIdr(0, 18000);
      expect(result).toMatch(/Rp\s*0/);
    });

    it("formats 100 cents (1 USD) with Rupiah format", () => {
      const result = formatIdr(100, 18158);
      expect(result).toMatch(/Rp\s*18\.158/);
    });

    it("formats null or undefined gracefully as Rp 0", () => {
      expect(formatIdr(null, 18000)).toMatch(/Rp\s*0/);
      expect(formatIdr(undefined, 18000)).toMatch(/Rp\s*0/);
    });
  });

  describe("formatKurs", () => {
    it("formats exchange rate into human-readable string", () => {
      const result = formatKurs(18158);
      expect(result).toContain("1 USD =");
      expect(result).toMatch(/Rp\s*18\.158/);
    });
  });

  describe("getCachedExchangeRate", () => {
    it("returns default fallback rate if no localStorage or window is undefined", () => {
      const rate = getCachedExchangeRate();
      expect(rate).toBeGreaterThan(15000);
    });
  });

  describe("fetchLiveUsdIdrRate", () => {
    it("fetches live rate or returns fallback if network fails", async () => {
      // Mock global fetch
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ rates: { IDR: 18200 } }),
      } as unknown as Response);

      const rate = await fetchLiveUsdIdrRate();
      expect(rate).toBe(18200);
      expect(fetchSpy).toHaveBeenCalled();
    });

    it("falls back gracefully when fetch rejects", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
      const rate = await fetchLiveUsdIdrRate();
      expect(rate).toBeGreaterThan(15000);
    });
  });
});
