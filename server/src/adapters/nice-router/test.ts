import type {
  AdapterEnvironmentCheck,
  AdapterEnvironmentTestContext,
  AdapterEnvironmentTestResult,
} from "../types.js";
import { asString, parseObject } from "../utils.js";
import { guardedHttpAdapterFetch } from "../http/remote-fetch.js";

function summarizeStatus(checks: AdapterEnvironmentCheck[]): AdapterEnvironmentTestResult["status"] {
  if (checks.some((check) => check.level === "error")) return "fail";
  if (checks.some((check) => check.level === "warn")) return "warn";
  return "pass";
}

export async function testEnvironment(
  ctx: AdapterEnvironmentTestContext,
): Promise<AdapterEnvironmentTestResult> {
  const checks: AdapterEnvironmentCheck[] = [];
  const config = parseObject(ctx.config);
  const repoUrl = asString(config.repoUrl, "https://github.com/Deni-SLN/Nice-Router.git");
  const baseUrlValue = asString(config.baseUrl || config.url, "http://localhost:8000/v1");

  checks.push({
    code: "nice_router_repository",
    level: "info",
    message: `Nice Router Repository: ${repoUrl}`,
  });

  let url: URL | null = null;
  try {
    url = new URL(baseUrlValue);
  } catch {
    checks.push({
      code: "nice_router_url_invalid",
      level: "error",
      message: `Format URL endpoint Nice Router tidak valid: ${baseUrlValue}`,
      hint: "Gunakan format URL yang valid seperti http://localhost:8000/v1 atau https://your-router-domain.com/v1",
    });
  }

  if (url && url.protocol !== "http:" && url.protocol !== "https:") {
    checks.push({
      code: "nice_router_protocol_invalid",
      level: "error",
      message: `Protokol URL tidak didukung: ${url.protocol}`,
      hint: "Gunakan http:// atau https://",
    });
  }

  if (url) {
    checks.push({
      code: "nice_router_endpoint_configured",
      level: "info",
      message: `Endpoint Nice Router: ${url.toString()}`,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const allowlist = new Set([url.origin.toLowerCase()]);
    const apiKey = asString(config.apiKey, "");
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers["authorization"] = `Bearer ${apiKey}`;
    }
    try {
      // Probe Nice Router models or base endpoint
      const probeUrl = new URL(url.toString().replace(/\/+$/, "") + "/models");
      const response = await guardedHttpAdapterFetch(probeUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      }, { privateEndpointAllowlist: allowlist });

      if (response.ok) {
        checks.push({
          code: "nice_router_probe_ok",
          level: "info",
          message: "Koneksi ke Nice Router berhasil! Endpoint /models merespons dengan baik.",
        });
      } else if (response.status === 401 || response.status === 403) {
        checks.push({
          code: "nice_router_auth_required",
          level: "warn",
          message: `Endpoint Nice Router memerlukan autentikasi (HTTP ${response.status}). Pastikan API Key telah diisi jika diwajibkan.`,
        });
      } else {
        checks.push({
          code: "nice_router_probe_status",
          level: "info",
          message: `Endpoint Nice Router merespons dengan status HTTP ${response.status}.`,
        });
      }
    } catch (err) {
      // Local development router may not be running yet, surface informative warning
      checks.push({
        code: "nice_router_probe_notice",
        level: "warn",
        message: err instanceof Error ? err.message : "Tidak dapat terhubung ke Nice Router saat ini.",
        hint: `Pastikan Nice Router sedang berjalan di ${baseUrlValue} atau jalankan server Nice Router dari repositori ${repoUrl}`,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    adapterType: ctx.adapterType,
    status: summarizeStatus(checks),
    checks,
    testedAt: new Date().toISOString(),
  };
}
