import type { Agent } from "@paperclipai/shared";
import { AGENT_ROLE_LABELS } from "@paperclipai/shared";
import type { OrgNode } from "../api/agents";
import { getAdapterLabel } from "../adapters/adapter-display-registry";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim() || "organisasi";
}

function getFormattedDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Ekspor struktur organisasi ke file JSON (hierarki & metadata).
 */
export function exportOrgToJson(
  orgTree: OrgNode[],
  agents: Agent[],
  companyName: string
): void {
  const exportPayload = {
    organisasi: companyName,
    tanggalEkspor: new Date().toISOString(),
    totalAgen: agents.length,
    pohonHierarki: orgTree,
    daftarAgen: agents.map((agent) => ({
      id: agent.id,
      nama: agent.name,
      jabatan: agent.title || null,
      peran: (AGENT_ROLE_LABELS as Record<string, string>)[agent.role] || agent.role,
      peranKey: agent.role,
      status: agent.status,
      alasanJeda: agent.pauseReason || null,
      atasanId: agent.reportsTo || null,
      modelAdapter: agent.adapterType,
      labelAdapter: getAdapterLabel(agent.adapterType),
      kapabilitas: agent.capabilities || null,
      dibuatPada: agent.createdAt || null,
      terakhirAktif: agent.lastHeartbeatAt || null,
    })),
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const filename = `struktur-organisasi-${slugify(companyName)}-${getFormattedDate()}.json`;
  downloadBlob(blob, filename);
}

/**
 * Ekspor daftar struktur agen ke CSV (format tabel Excel dengan UTF-8 BOM).
 */
export function exportOrgToCsv(agents: Agent[], companyName: string): void {
  const agentMap = new Map<string, Agent>();
  for (const a of agents) {
    agentMap.set(a.id, a);
  }

  const escapeCsv = (val: string | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headers = [
    "No",
    "ID Agen",
    "Nama Agen",
    "Jabatan / Posisi",
    "Peran / Divisi",
    "Atasan Langsung (Melapor Ke)",
    "Model / Adapter AI",
    "Status",
    "Alasan Jeda",
    "Kapabilitas",
    "Terakhir Aktif",
    "Tanggal Dibuat",
  ];

  const rows = agents.map((agent, index) => {
    const supervisor = agent.reportsTo ? agentMap.get(agent.reportsTo) : null;
    const supervisorName = supervisor ? supervisor.name : (agent.reportsTo ? agent.reportsTo : "Pucuk Pimpinan / Tidak Ada");
    const roleLabel = (AGENT_ROLE_LABELS as Record<string, string>)[agent.role] || agent.role;
    const adapterLabel = getAdapterLabel(agent.adapterType);

    let statusLabel: string = agent.status;
    if (agent.status === "active") statusLabel = "Online / Siap";
    else if (agent.status === "running") statusLabel = "Sedang Berjalan";
    else if (agent.status === "paused") statusLabel = "Dijeda";
    else if (agent.status === "error") statusLabel = "Gangguan / Error";

    return [
      String(index + 1),
      escapeCsv(agent.id),
      escapeCsv(agent.name),
      escapeCsv(agent.title || "-"),
      escapeCsv(roleLabel),
      escapeCsv(supervisorName),
      escapeCsv(adapterLabel),
      escapeCsv(statusLabel),
      escapeCsv(agent.pauseReason || "-"),
      escapeCsv(agent.capabilities || "-"),
      escapeCsv(agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).toLocaleString("id-ID") : "-"),
      escapeCsv(agent.createdAt ? new Date(agent.createdAt).toLocaleString("id-ID") : "-"),
    ].join(",");
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const filename = `struktur-organisasi-${slugify(companyName)}-${getFormattedDate()}.csv`;
  downloadBlob(blob, filename);
}

// ── Perhitungan Layout Canvas Bagan PNG ───────────────────────────────────

interface CanvasNode {
  id: string;
  name: string;
  role: string;
  status: string;
  x: number;
  y: number;
  children: CanvasNode[];
}

const CARD_W = 240;
const CARD_H = 100;
const GAP_X = 36;
const GAP_Y = 70;
const PADDING_TOP = 130;
const PADDING_SIDE = 60;
const PADDING_BOTTOM = 60;

function subtreeWidth(node: OrgNode): number {
  if (!node.reports || node.reports.length === 0) return CARD_W;
  const childrenW = node.reports.reduce((sum, c) => sum + subtreeWidth(c), 0);
  const gaps = (node.reports.length - 1) * GAP_X;
  return Math.max(CARD_W, childrenW + gaps);
}

function layoutTree(node: OrgNode, x: number, y: number): CanvasNode {
  const totalW = subtreeWidth(node);
  const layoutChildren: CanvasNode[] = [];

  if (node.reports && node.reports.length > 0) {
    const childrenW = node.reports.reduce((sum, c) => sum + subtreeWidth(c), 0);
    const gaps = (node.reports.length - 1) * GAP_X;
    let cx = x + (totalW - childrenW - gaps) / 2;

    for (const child of node.reports) {
      const cw = subtreeWidth(child);
      layoutChildren.push(layoutTree(child, cx, y + CARD_H + GAP_Y));
      cx += cw + GAP_X;
    }
  }

  return {
    id: node.id,
    name: node.name,
    role: node.role,
    status: node.status,
    x: x + (totalW - CARD_W) / 2,
    y,
    children: layoutChildren,
  };
}

function layoutForest(roots: OrgNode[]): CanvasNode[] {
  if (!roots || roots.length === 0) return [];

  let x = PADDING_SIDE;
  const y = PADDING_TOP;
  const result: CanvasNode[] = [];

  for (const root of roots) {
    const w = subtreeWidth(root);
    result.push(layoutTree(root, x, y));
    x += w + GAP_X;
  }

  return result;
}

function flattenCanvasNodes(nodes: CanvasNode[]): CanvasNode[] {
  const list: CanvasNode[] = [];
  function walk(n: CanvasNode) {
    list.push(n);
    n.children.forEach(walk);
  }
  nodes.forEach(walk);
  return list;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Ekspor bagan struktur organisasi ke gambar resolusi tinggi PNG.
 */
export async function exportOrgChartToPng(
  orgTree: OrgNode[],
  agents: Agent[],
  companyName: string
): Promise<void> {
  const roots = layoutForest(orgTree);
  const allNodes = flattenCanvasNodes(roots);

  if (allNodes.length === 0) {
    throw new Error("Tidak ada data bagan organisasi untuk diunduh.");
  }

  const agentMap = new Map<string, Agent>();
  for (const a of agents) {
    agentMap.set(a.id, a);
  }

  // Hitung bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of allNodes) {
    if (node.x < minX) minX = node.x;
    if (node.x + CARD_W > maxX) maxX = node.x + CARD_W;
    if (node.y < minY) minY = node.y;
    if (node.y + CARD_H > maxY) maxY = node.y + CARD_H;
  }

  const rawWidth = Math.max(1000, maxX + PADDING_SIDE);
  const rawHeight = Math.max(700, maxY + PADDING_BOTTOM);

  // Gunakan scale 2x untuk output resolusi tajam
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = rawWidth * scale;
  canvas.height = rawHeight * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Gagal menginisialisasi canvas.");
  }

  ctx.scale(scale, scale);

  // 1. Gambar Background Canvas (Executive Dark Slate)
  ctx.fillStyle = "#0c1017";
  ctx.fillRect(0, 0, rawWidth, rawHeight);

  // Pola aksen grid lembut di background
  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 1;
  const gridSize = 32;
  for (let gx = 0; gx < rawWidth; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, rawHeight);
    ctx.stroke();
  }
  for (let gy = 0; gy < rawHeight; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(rawWidth, gy);
    ctx.stroke();
  }

  // 2. Header Organisasi
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 22px system-ui, -apple-system, sans-serif";
  ctx.fillText("STRUKTUR ORGANISASI TIM AGEN AI", PADDING_SIDE, 48);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "600 15px system-ui, -apple-system, sans-serif";
  ctx.fillText(companyName, PADDING_SIDE, 72);

  const subtitle = `Total: ${agents.length} Agen AI Terdaftar • Diekspor pada ${new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px system-ui, -apple-system, sans-serif";
  ctx.fillText(subtitle, PADDING_SIDE, 94);

  // Garis pemisah header
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING_SIDE, 108);
  ctx.lineTo(rawWidth - PADDING_SIDE, 108);
  ctx.stroke();

  // 3. Gambar Garis Konektor Hierarki (Orthogonal edges)
  const drawEdges = (parent: CanvasNode) => {
    for (const child of parent.children) {
      const x1 = parent.x + CARD_W / 2;
      const y1 = parent.y + CARD_H;
      const x2 = child.x + CARD_W / 2;
      const y2 = child.y;
      const midY = (y1 + y2) / 2;

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x1, midY);
      ctx.lineTo(x2, midY);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Titik sambungan kecil di percabangan
      ctx.fillStyle = "#0284c7";
      ctx.beginPath();
      ctx.arc(x1, y1, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x2, y2, 3, 0, Math.PI * 2);
      ctx.fill();

      drawEdges(child);
    }
  };

  for (const root of roots) {
    drawEdges(root);
  }

  // 4. Gambar Setiap Kartu Agen
  for (const node of allNodes) {
    const agent = agentMap.get(node.id);
    const cardX = node.x;
    const cardY = node.y;

    // Card background & shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = "#141c2b";
    drawRoundedRect(ctx, cardX, cardY, CARD_W, CARD_H, 8);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = "transparent";

    // Card border
    ctx.strokeStyle = "#27354a";
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, cardX, cardY, CARD_W, CARD_H, 8);
    ctx.stroke();

    // Aksen bar atas kartu sesuai peran
    let roleAccentColor = "#3b82f6";
    if (node.role === "ceo") roleAccentColor = "#f59e0b"; // gold/amber
    else if (node.role === "lead") roleAccentColor = "#3b82f6"; // blue
    else if (node.role === "specialist") roleAccentColor = "#a855f7"; // purple
    else if (node.role === "support") roleAccentColor = "#6366f1"; // indigo
    else roleAccentColor = "#10b981"; // emerald

    ctx.fillStyle = roleAccentColor;
    ctx.beginPath();
    ctx.moveTo(cardX + 8, cardY);
    ctx.lineTo(cardX + CARD_W - 8, cardY);
    ctx.quadraticCurveTo(cardX + CARD_W, cardY, cardX + CARD_W, cardY + 4);
    ctx.lineTo(cardX, cardY + 4);
    ctx.quadraticCurveTo(cardX, cardY, cardX + 8, cardY);
    ctx.closePath();
    ctx.fill();

    // Avatar Circle
    const avatarX = cardX + 28;
    const avatarY = cardY + 48;
    const avatarRadius = 16;

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Inisial avatar
    const initials = node.name.slice(0, 2).toUpperCase();
    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 11px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, avatarX, avatarY);

    // Status Dot
    let dotColor = "#94a3b8"; // default/offline
    if (node.status === "active" || node.status === "running") dotColor = "#10b981";
    else if (node.status === "paused") dotColor = "#f59e0b";
    else if (node.status === "error") dotColor = "#ef4444";

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(avatarX + 11, avatarY + 11, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#141c2b";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reset alignment untuk teks kartu
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    const textLeft = cardX + 54;
    const maxTextWidth = CARD_W - 64;

    // Nama Agen
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
    const displayName = node.name.length > 20 ? node.name.slice(0, 19) + "…" : node.name;
    ctx.fillText(displayName, textLeft, cardY + 36);

    // Jabatan / Title
    const titleText = agent?.title || (AGENT_ROLE_LABELS as Record<string, string>)[node.role] || node.role;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px system-ui, -apple-system, sans-serif";
    const displayTitle = titleText.length > 22 ? titleText.slice(0, 21) + "…" : titleText;
    ctx.fillText(displayTitle, textLeft, cardY + 54);

    // Badge Peran / Divisi
    const roleLabelText = ((AGENT_ROLE_LABELS as Record<string, string>)[node.role] || node.role).toUpperCase();
    ctx.font = "bold 9px system-ui, -apple-system, sans-serif";
    const badgeWidth = ctx.measureText(roleLabelText).width + 10;
    const badgeHeight = 16;
    const badgeX = textLeft;
    const badgeY = cardY + 64;

    ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
    drawRoundedRect(ctx, badgeX, badgeY, badgeWidth, badgeHeight, 4);
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.fillText(roleLabelText, badgeX + 5, badgeY + 11);

    // Adapter / Model Label (di sebelah kanan badge jika cukup ruang)
    if (agent) {
      const adapterLabel = getAdapterLabel(agent.adapterType);
      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      const adapterX = badgeX + badgeWidth + 8;
      if (adapterX < cardX + CARD_W - 12) {
        ctx.fillText(adapterLabel, adapterX, badgeY + 11);
      }
    }
  }

  // 5. Konversi Canvas ke Blob dan Trigger Unduhan
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Gagal membuat gambar PNG dari kanvas."));
        return;
      }
      const filename = `struktur-organisasi-${slugify(companyName)}-${getFormattedDate()}.png`;
      downloadBlob(blob, filename);
      resolve();
    }, "image/png");
  });
}
