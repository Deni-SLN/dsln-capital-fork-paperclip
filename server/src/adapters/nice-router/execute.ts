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

  const wake = parseObject(context.paperclipWake);
  const wakeIssue = parseObject(wake.issue);
  const rawIssue = parseObject(context.paperclipIssue);
  const issueTitle = asString(rawIssue.title || wakeIssue.title, "");
  const issueDescription = asString(rawIssue.description || wakeIssue.description, "");

  let promptText =
    asString(context.paperclipTaskMarkdown, "") ||
    asString(context.instructions, "") ||
    asString(context.prompt, "") ||
    asString(context.body, "");

  if (!promptText && issueTitle) {
    promptText = `Tugas: ${issueTitle}\n\nDeskripsi:\n${issueDescription || "(Tidak ada deskripsi rinci)"}`;
  }
  if (!promptText) {
    promptText = `Halo, ini adalah tugas untuk ${agent.name}. Silakan tinjau dan berikan respon terbaik Anda.`;
  }

  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: `Anda adalah agen AI ${agent.name} di Paperclip (dsln capital).
Berikan jawaban yang jelas, profesional, dan ringkas dalam Bahasa Indonesia mengenai tugas yang didelegasikan kepada Anda.`,
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
    await ctx.onLog?.("stdout", `[nice-router] Mengirim permintaan ke ${endpoint} (model: ${model})...\n`);

    const parsedUrl = new URL(baseUrl);
    const allowlist = new Set([parsedUrl.origin.toLowerCase()]);

    const res = await guardedHttpAdapterFetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
      ...(timer ? { signal: controller.signal } : {}),
    }, { privateEndpointAllowlist: allowlist });

    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(`Nice Router mengembalikan status ${res.status}: ${rawText}`);
    }

    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      content?: string;
    };
    try {
      data = JSON.parse(rawText.trim());
    } catch {
      const jsonMatch = rawText.match(/(\{[\s\S]*\})\s*data:\s*\[DONE\]/i) || rawText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        data = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Gagal mem-parse respon Nice Router: ${rawText.slice(0, 200)}`);
      }
    }

    const reply = data.choices?.[0]?.message?.content || data.content || "Tugas berhasil diselesaikan melalui Nice Router.";
    await ctx.onLog?.("stdout", `${reply}\n`);

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: reply,
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
