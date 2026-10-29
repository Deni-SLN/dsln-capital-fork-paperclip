import type { AdapterExecutionContext, AdapterExecutionResult } from "../types.js";
import { asString, asNumber, parseObject } from "../utils.js";
import { guardedHttpAdapterFetch } from "../http/remote-fetch.js";

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context } = ctx;
  const baseUrl = asString(config.baseUrl || config.url, "http://localhost:8000/v1").replace(/\/+$/, "");
  const model = asString(config.model, "auto");
  const apiKey = asString(config.apiKey, "");
  const timeoutMs = asNumber(config.timeoutMs, 60000);

  const endpoint = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers["authorization"] = `Bearer ${apiKey}`;
  }

  const promptText = context.instructions || context.prompt || context.body || `Halo, ini tugas untuk ${agent.name}`;
  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `Anda adalah agen AI ${agent.name} yang berjalan melalui Paperclip dengan Nice Router (https://github.com/Deni-SLN/Nice-Router.git).`,
      },
      {
        role: "user",
        content: promptText,
      },
    ],
    agentId: agent.id,
    runId,
  };

  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    ctx.onDispatch?.();
    ctx.onLog?.({
      stream: "stdout",
      chunk: `[nice-router] Mengirim permintaan ke ${endpoint} (model: ${model})...\n`,
    });

    const parsedUrl = new URL(baseUrl);
    const isLoopback = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsedUrl.hostname);
    const allowlist = isLoopback ? new Set([parsedUrl.origin.toLowerCase()]) : undefined;

    const res = await guardedHttpAdapterFetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      ...(timer ? { signal: controller.signal } : {}),
    }, allowlist ? { privateEndpointAllowlist: allowlist } : {});

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Nice Router mengembalikan status ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      content?: string;
    };

    const reply = data.choices?.[0]?.message?.content || data.content || "Tugas berhasil diselesaikan melalui Nice Router.";
    ctx.onLog?.({
      stream: "stdout",
      chunk: `${reply}\n`,
    });

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: `Nice Router (${model}) -> ${baseUrl}`,
    };
  } catch (err) {
    if (timer && err instanceof Error && err.name === "AbortError") {
      return {
        exitCode: null,
        signal: null,
        timedOut: true,
        errorMessage: `Nice Router request timed out after ${timeoutMs}ms`,
        errorCode: "timeout",
      };
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
