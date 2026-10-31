import type { AdapterExecutionContext, AdapterExecutionResult } from "../types.js";
import { asString, asNumber, parseObject } from "../utils.js";
import { guardedHttpAdapterFetch } from "../http/remote-fetch.js";

interface CompanyAgent {
  id: string;
  name: string;
  title?: string | null;
  role?: string | null;
  capabilities?: string | null;
  reportsTo?: string | null;
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { config, runId, agent, context, authToken } = ctx;
  const baseUrl = asString(config.baseUrl || config.url, "http://192.168.0.42:20128/v1").replace(/\/+$/, "");
  const model = asString(config.model, "free-models");
  const apiKey = asString(config.apiKey, "");
  const timeoutMs = asNumber(config.timeoutMs, 120000);

  const port = process.env.PORT || "3100";
  const internalApiBase = `http://127.0.0.1:${port}/api`;

  const wake = parseObject(context.paperclipWake);
  const wakeIssue = parseObject(wake.issue);
  const rawIssue = parseObject(context.paperclipIssue);
  let currentIssueId = asString(rawIssue.id || wakeIssue.id, "");
  let currentProjectId = asString(rawIssue.projectId || wakeIssue.projectId, "");
  let issueTitle = asString(rawIssue.title || wakeIssue.title, "");
  let issueDescription = asString(rawIssue.description || wakeIssue.description, "");

  let promptText =
    asString(context.paperclipTaskMarkdown, "") ||
    asString(context.instructions, "") ||
    asString(context.prompt, "") ||
    asString(context.body, "");

  if (promptText === "null" || promptText === "undefined") {
    promptText = "";
  }

  // If no direct task in context, check for assigned active issues
  if ((!promptText || !currentIssueId) && authToken && agent.companyId) {
    try {
      const issuesRes = await fetch(`${internalApiBase}/companies/${agent.companyId}/issues?limit=50`, {
        headers: {
          authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
      });
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        const list = Array.isArray(issuesData) ? issuesData : issuesData.issues || [];
        const myTask = list.find(
          (item: Record<string, unknown>) =>
            item.assigneeAgentId === agent.id &&
            (item.status === "todo" || item.status === "in_progress"),
        );
        if (myTask) {
          currentIssueId = asString(myTask.id, "");
          currentProjectId = asString(myTask.projectId, "");
          issueTitle = asString(myTask.title, "");
          issueDescription = asString(myTask.description, "");
          promptText = `Tugas: ${issueTitle}\n\nDeskripsi:\n${issueDescription || "(Tidak ada deskripsi rinci)"}`;
        }
      }
    } catch {
      // fallback
    }
  }

  if (!promptText && issueTitle) {
    promptText = `Tugas: ${issueTitle}\n\nDeskripsi:\n${issueDescription || "(Tidak ada deskripsi rinci)"}`;
  }
  if (!promptText) {
    promptText = `Halo, ini adalah tugas untuk ${agent.name}. Silakan tinjau dan berikan respon terbaik Anda.`;
  }

  // 1. Fetch live company agents roster
  let companyAgents: CompanyAgent[] = [];
  if (authToken && agent.companyId) {
    try {
      const agentsRes = await fetch(`${internalApiBase}/companies/${agent.companyId}/agents`, {
        headers: {
          authorization: `Bearer ${authToken}`,
          "content-type": "application/json",
        },
      });
      if (agentsRes.ok) {
        const rawAgents = await agentsRes.json();
        if (Array.isArray(rawAgents)) {
          companyAgents = rawAgents;
        }
      }
    } catch {
      // Internal API fetch fallback
    }
  }

  // 2. Identify if this agent is an executive orchestrator (Sofia, CEO, Hermes, CRO)
  const agentNameLower = agent.name.toLowerCase();
  const isExecutive =
    agentNameLower.includes("sofia") ||
    agentNameLower.includes("ceo") ||
    agentNameLower.includes("hermes") ||
    agentNameLower.includes("coo") ||
    agentNameLower.includes("cio") ||
    agentNameLower.includes("cro") ||
    agentNameLower.includes("risk");

  let rosterText = "";
  if (companyAgents.length > 0) {
    rosterText = companyAgents
      .map((a) => `- ${a.name} (${a.title || a.role || "Agent"}) | Keahlian: ${a.capabilities || "General"}`)
      .join("\n");
  } else {
    rosterText = `
- CEO - DSLN Capital (Chief Executive Officer) | Pemegang otoritas tertinggi DSLN Capital
- SOFIA (CIO) (Chief Intelligence Officer) | Lead Intelligence Agent & orkestrator strategis seluruh divisi
- HERMES (COO) (Chief Operating Officer) | Operasional organisasi, eksekusi task, dan koordinasi agen
- DSLN Risk (CRO) (Chief Risk Officer) | Pengawas risiko independen, mitigasi & audit
- Global News Intelligence (Global Macro) | Memantau The Fed, inflasi, suku bunga, geopolitik global
- Indonesia News Intelligence (Domestic Market) | Memantau BI, OJK, Kemenkeu, IHSG, emiten BEI, rupiah
- Social Intelligence Agent (Social & Sentiment) | Sentimen X, Reddit, Telegram, tren viral crypto & meme coin
- Investment & Market Research Analyst (Market Research) | Fundamental & teknikal analisa saham, emas, crypto
- Crypto Trading Analyst (Crypto Trading) | Analisis pasar crypto BTC/ETH/altcoin, trading setup
- Trading Execution Agent (Trade Execution) | Eksekusi order, take profit, stop loss, monitoring
- Market Risk Analyst (Market Risk) | Volatilitas, drawdown, korelasi portofolio, market regime
- Crypto & On-chain Risk Analyst (On-chain Risk) | Smart contract audit, rug pull check, liquidity pool analysis
- Legal Intelligence Agent (Legal & Regulatory) | Regulasi pasar modal, crypto, kepatuhan hukum
- Tax Intelligence Agent (Tax Advisory) | Pajak saham & crypto, pelaporan & kalkulasi pajak
    `.trim();
  }

  const currentAgentInfo = companyAgents.find((a) => a.id === agent.id);
  const agentTitle = currentAgentInfo?.title || asString((agent as unknown as Record<string, unknown>).title, "");
  const agentCapabilities =
    currentAgentInfo?.capabilities || asString((agent as unknown as Record<string, unknown>).capabilities, "");

  let systemPrompt = "";
  if (isExecutive) {
    systemPrompt = `Anda adalah ${agent.name} (${agentTitle || "Executive Leader"}), pemimpin dan orkestrator strategis di DSLN Capital.
Bahasa komunikasi utama Anda adalah Bahasa Indonesia formal dan profesional.

STRUKTUR ORGANISASI DSLN CAPITAL & AGEN YANG TERSEDIA SAAT INI:
${rosterText}

MANDAT & KEWENANGAN ANDA:
1. Analisis tugas/permintaan yang diberikan secara strategis dan komprehensif.
2. Jika tugas tersebut memerlukan analisis spesifik, investigasi, atau eksekusi dari divisi/agen tertentu, PECAH tugas tersebut menjadi sub-tugas dan DELEGASIKAN ke agen yang tepat menggunakan tag <delegate_task>.
Format:
<delegate_task>
{
  "assignee": "<Nama Agen atau Judul Agen yang sesuai dari daftar di atas>",
  "title": "<Judul sub-tugas yang jelas dan spesifik>",
  "description": "<Instruksi rinci, ekspektasi output, dan data yang harus dikumpulkan>",
  "priority": "high" | "medium" | "low"
}
</delegate_task>

3. JIKA TIDAK ADA AGEN YANG SESUAI untuk kebutuhan bidang tugas tertentu (misalnya Anda memerlukan 'Forex Arbitrage Specialist', 'DeFi Protocol Auditor', 'Commodity Trading Analyst', dll.), Anda MEMILIKI WEWENANG PENUH untuk MEREKRUT AGEN BARU secara otomatis menggunakan tag <hire_agent>:
Format:
<hire_agent>
{
  "name": "<Nama Agen Baru>",
  "title": "<Jabatan / Posisi>",
  "capabilities": "<Deskripsi keahlian, mandat, dan tanggung jawabnya>",
  "reportsTo": "<Nama Atasan yang membawahi, misalnya SOFIA (CIO) atau HERMES (COO) atau DSLN Risk (CRO)>"
}
</hire_agent>
Setelah merekrut agen baru tersebut, Anda dapat langsung mendelegasikan sub-tugas kepadanya menggunakan tag <delegate_task>.

4. Berikan jawaban eksekutif terstruktur di luar tag tersebut yang menjelaskan:
- Analisis situasi strategis
- Rencana aksi dan pembagian mandat tugas
- Rekrutmen baru (jika ada) dan alasannya
- Rekomendasi langkah selanjutnya untuk CEO / DSLN Capital.`;
  } else {
    systemPrompt = `Anda adalah agen AI spesialis ${agent.name} (${agentTitle || ""}) di DSLN Capital.
Mandat & Keahlian Anda: ${agentCapabilities || "Analisis profesional dan intelijen keuangan."}
Berikan hasil analisis terstruktur, berbasis data, profesional, dan dalam Bahasa Indonesia.`;
  }

  const endpoint = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (apiKey) {
    headers["authorization"] = `Bearer ${apiKey}`;
  }

  const requestBody = {
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: promptText,
      },
    ],
    max_tokens: 3072,
    agentId: agent.id,
    runId,
  };

  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    ctx.onDispatch?.();
    await ctx.onLog?.("stdout", `[nice-router] Menghubungi Nice Router (${model}) untuk ${agent.name}...\n`);

    const parsedUrl = new URL(baseUrl);
    const allowlist = new Set([parsedUrl.origin.toLowerCase()]);

    const res = await guardedHttpAdapterFetch(
      endpoint,
      {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        ...(timer ? { signal: controller.signal } : {}),
      },
      { privateEndpointAllowlist: allowlist },
    );

    const rawText = await res.text();
    if (!res.ok) {
      throw new Error(`Nice Router mengembalikan status ${res.status}: ${rawText}`);
    }

    let data: {
      choices?: Array<{ message?: { content?: string; reasoning?: string } }>;
      content?: string;
    };
    try {
      data = JSON.parse(rawText.trim());
    } catch {
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        data = JSON.parse(rawText.substring(jsonStart, jsonEnd + 1));
      } else {
        throw new Error(`Gagal mem-parse respon Nice Router: ${rawText.slice(0, 200)}`);
      }
    }

    const reply =
      data.choices?.[0]?.message?.content ||
      data.choices?.[0]?.message?.reasoning ||
      data.content ||
      "Tugas diproses melalui Nice Router.";
    await ctx.onLog?.("stdout", `${reply}\n\n`);

    // 3. Process <hire_agent> tags
    const hireRegex = /<hire_agent>([\s\S]*?)<\/hire_agent>/gi;
    let hireMatch: RegExpExecArray | null;
    while ((hireMatch = hireRegex.exec(reply)) !== null) {
      if (!authToken || !agent.companyId) continue;
      try {
        const rawJson = hireMatch[1].trim();
        const hireData = JSON.parse(rawJson);
        if (hireData.name) {
          const exists = companyAgents.some((a) => a.name.toLowerCase() === hireData.name.toLowerCase());
          if (!exists) {
            let managerId: string | null = null;
            if (hireData.reportsTo) {
              const mgr = companyAgents.find(
                (a) =>
                  a.name.toLowerCase().includes(hireData.reportsTo.toLowerCase()) ||
                  (a.title && a.title.toLowerCase().includes(hireData.reportsTo.toLowerCase())),
              );
              if (mgr) managerId = mgr.id;
            }

            const hireRes = await fetch(`${internalApiBase}/companies/${agent.companyId}/agents`, {
              method: "POST",
              headers: {
                authorization: `Bearer ${authToken}`,
                "content-type": "application/json",
              },
              body: JSON.stringify({
                name: hireData.name,
                title: hireData.title || hireData.name,
                role: "general",
                capabilities: hireData.capabilities || "Spesialis AI di DSLN Capital",
                reportsTo: managerId || undefined,
                adapterType: "nice_router",
                adapterConfig: {
                  url: baseUrl,
                  model: model,
                  apiKey: apiKey || undefined,
                },
              }),
            });

            if (hireRes.ok) {
              const createdAgent = (await hireRes.json()) as CompanyAgent;
              companyAgents.push(createdAgent);
              await ctx.onLog?.(
                "stdout",
                `[DSLN Eksekutif] Sukses merekrut agen baru: ${createdAgent.name} (${createdAgent.title || ""})\n`,
              );
            } else {
              const errText = await hireRes.text();
              await ctx.onLog?.("stderr", `[DSLN Eksekutif] Gagal merekrut agen: ${errText}\n`);
            }
          }
        }
      } catch (hireErr) {
        await ctx.onLog?.("stderr", `[DSLN Eksekutif] Error parsing tag rekrutmen agen: ${hireErr}\n`);
      }
    }

    // 4. Process <delegate_task> tags
    const delegateRegex = /<delegate_task>([\s\S]*?)<\/delegate_task>/gi;
    let delegateMatch: RegExpExecArray | null;
    let delegatedCount = 0;
    while ((delegateMatch = delegateRegex.exec(reply)) !== null) {
      if (!authToken || !agent.companyId) continue;
      try {
        const rawJson = delegateMatch[1].trim();
        const taskData = JSON.parse(rawJson);
        if (taskData.title && taskData.assignee) {
          const assigneeQuery = String(taskData.assignee).toLowerCase();
          const matched = companyAgents.find(
            (a) =>
              a.name.toLowerCase().includes(assigneeQuery) ||
              assigneeQuery.includes(a.name.toLowerCase()) ||
              (a.title && a.title.toLowerCase().includes(assigneeQuery)) ||
              (a.role && a.role.toLowerCase().includes(assigneeQuery)),
          );

          const targetAgentId = matched ? matched.id : null;
          const targetAgentName = matched ? matched.name : taskData.assignee;

          const createRes = await fetch(`${internalApiBase}/companies/${agent.companyId}/issues`, {
            method: "POST",
            headers: {
              authorization: `Bearer ${authToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              title: taskData.title,
              description: taskData.description || "",
              parentId: currentIssueId || undefined,
              projectId: currentProjectId || undefined,
              assigneeAgentId: targetAgentId || undefined,
              status: "todo",
              priority: taskData.priority || "medium",
            }),
          });

          if (createRes.ok) {
            delegatedCount++;
            const createdIssue = (await createRes.json()) as { identifier?: string; id?: string };
            const issueTag = createdIssue.identifier || createdIssue.id || "";
            await ctx.onLog?.(
              "stdout",
              `[DSLN Eksekutif] Berhasil mendelegasikan tugas ke ${targetAgentName}: "${taskData.title}" (${issueTag})\n`,
            );
          } else {
            const errText = await createRes.text();
            await ctx.onLog?.("stderr", `[DSLN Eksekutif] Gagal mendelegasikan tugas: ${errText}\n`);
          }
        }
      } catch (taskErr) {
        await ctx.onLog?.("stderr", `[DSLN Eksekutif] Error parsing tag delegasi tugas: ${taskErr}\n`);
      }
    }

    // 5. Update parent issue status and add comment
    const cleanSummary = reply
      .replace(/<hire_agent>[\s\S]*?<\/hire_agent>/gi, "")
      .replace(/<delegate_task>[\s\S]*?<\/delegate_task>/gi, "")
      .trim();

    if (currentIssueId && authToken) {
      try {
        const nextStatus = delegatedCount > 0 ? "in_progress" : "done";
        const commentBody =
          cleanSummary ||
          (delegatedCount > 0
            ? "Telah mendelegasikan sub-tugas ke agen terkait."
            : "Tugas telah selesai diproses.");

        await fetch(`${internalApiBase}/issues/${currentIssueId}`, {
          method: "PATCH",
          headers: {
            authorization: `Bearer ${authToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
            comment: commentBody,
          }),
        });

        await ctx.onLog?.(
          "stdout",
          `[DSLN Control] Status issue diperbarui menjadi '${nextStatus}' dengan ringkasan eksekutif.\n`,
        );
      } catch (patchErr) {
        await ctx.onLog?.("stderr", `[DSLN Control] Gagal memperbarui status issue: ${patchErr}\n`);
      }
    }

    return {
      exitCode: 0,
      signal: null,
      timedOut: false,
      summary: cleanSummary || reply,
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
