import { useQuery } from "@tanstack/react-query";

/**
 * Live exchange rate provider for USD -> IDR.
 * Supports primary + secondary free public exchange rate APIs with local cache
 * and realistic fallback rate (as of late 2026).
 */

const FALLBACK_USD_IDR_RATE = 18158;
const STORAGE_KEY = "paperclip_exchange_rate_usd_idr";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60; // 1 hour

interface CachedRate {
  rate: number;
  time: number;
  dateStr: string;
}

export function getCachedExchangeRate(): number {
  if (typeof window === "undefined" || !window.localStorage) {
    return FALLBACK_USD_IDR_RATE;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return FALLBACK_USD_IDR_RATE;
    const parsed: CachedRate = JSON.parse(raw);
    if (typeof parsed.rate === "number" && parsed.rate > 0) {
      return parsed.rate;
    }
  } catch {
    // Ignore storage parse error
  }
  return FALLBACK_USD_IDR_RATE;
}

export async function fetchLiveUsdIdrRate(): Promise<number> {
  // 1. Try primary endpoint: open.er-api.com
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.IDR;
      if (typeof rate === "number" && rate > 0) {
        saveCachedRate(rate);
        return rate;
      }
    }
  } catch {
    // Primary failed, continue to fallback endpoint
  }

  // 2. Try secondary endpoint: exchangerate-api.com v4
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (res.ok) {
      const data = await res.json();
      const rate = data.rates?.IDR;
      if (typeof rate === "number" && rate > 0) {
        saveCachedRate(rate);
        return rate;
      }
    }
  } catch {
    // Secondary failed
  }

  // 3. Fall back to cached or default
  return getCachedExchangeRate();
}

function saveCachedRate(rate: number) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    const record: CachedRate = {
      rate,
      time: Date.now(),
      dateStr: new Date().toISOString().slice(0, 10),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota error
  }
}

/**
 * React hook to get the latest USD -> IDR exchange rate.
 * Uses TanStack Query with 30-minute stale time.
 */
export function useExchangeRate() {
  const query = useQuery({
    queryKey: ["exchange-rate", "USD-IDR"],
    queryFn: fetchLiveUsdIdrRate,
    staleTime: CACHE_MAX_AGE_MS / 2, // 30 minutes
    initialData: getCachedExchangeRate,
  });

  const rate = query.data ?? FALLBACK_USD_IDR_RATE;
  const formattedKurs = formatKurs(rate);

  return {
    rate,
    formattedKurs,
    isLoading: query.isLoading,
    isSuccess: query.isSuccess,
    refetch: query.refetch,
  };
}

/**
 * Convert USD cents to IDR rounded amount.
 */
export function centsToIdr(cents: number | null | undefined, rate = FALLBACK_USD_IDR_RATE): number {
  if (!cents || Number.isNaN(cents) || cents <= 0) return 0;
  const dollars = cents / 100;
  return Math.round(dollars * rate);
}

/**
 * Format USD cents into Rupiah (IDR) string (e.g. "Rp 0" or "Rp 18.158").
 */
export function formatIdr(cents: number | null | undefined, rate = FALLBACK_USD_IDR_RATE): string {
  const idr = centsToIdr(cents, rate);
  try {
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(idr);
    // Replace non-breaking spaces with standard space
    return formatted.replace(/\s+/g, " ");
  } catch {
    return `Rp ${idr.toLocaleString("id-ID")}`;
  }
}

/**
 * Format kurs string, e.g. "1 USD = Rp 18.158"
 */
export function formatKurs(rate = FALLBACK_USD_IDR_RATE): string {
  try {
    const formatted = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Math.round(rate));
    return `1 USD = ${formatted.replace(/\s+/g, " ")}`;
  } catch {
    return `1 USD = Rp ${Math.round(rate).toLocaleString("id-ID")}`;
  }
}
