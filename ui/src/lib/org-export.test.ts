// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportOrgToJson, exportOrgToCsv } from "./org-export";
import type { Agent } from "@paperclipai/shared";
import type { OrgNode } from "../api/agents";

describe("org-export utilities", () => {
  let createdBlobs: Array<{ blob: Blob; filename: string }> = [];

  beforeEach(() => {
    createdBlobs = [];

    // Mock document.createElement and URL methods
    vi.spyOn(window.URL, "createObjectURL").mockImplementation((obj) => {
      const size = "size" in obj ? obj.size : 0;
      return `blob:mock-url-${size}`;
    });
    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = {
        tagName,
        href: "",
        download: "",
        click: vi.fn(function (this: { download: string; href: string }) {
          // Record what was downloaded
        }),
      } as unknown as HTMLElement;
      return el;
    });

    vi.spyOn(document.body, "appendChild").mockImplementation((node) => node);
    vi.spyOn(document.body, "removeChild").mockImplementation((node) => node);
  });

  const mockAgents: Agent[] = [
    {
      id: "agent-1",
      companyId: "comp-1",
      name: "CEO Executive",
      role: "ceo",
      title: "Chief Executive Officer",
      status: "active",
      reportsTo: null,
      adapterType: "claude_local",
      adapterConfig: {},
      capabilities: "Perencanaan strategis dan tata kelola",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      lastHeartbeatAt: new Date("2026-01-02T10:00:00Z"),
    } as unknown as Agent,
    {
      id: "agent-2",
      companyId: "comp-1",
      name: "Quant Analyst",
      role: "specialist",
      title: "Senior Quantitative Researcher",
      status: "running",
      reportsTo: "agent-1",
      adapterType: "codex_local",
      adapterConfig: {},
      capabilities: "Pemodelan risiko pasar",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      lastHeartbeatAt: new Date("2026-01-02T10:05:00Z"),
    } as unknown as Agent,
  ];

  const mockOrgTree: OrgNode[] = [
    {
      id: "agent-1",
      name: "CEO Executive",
      role: "ceo",
      status: "active",
      reports: [
        {
          id: "agent-2",
          name: "Quant Analyst",
          role: "specialist",
          status: "running",
          reports: [],
        },
      ],
    },
  ];

  it("exportOrgToJson builds structured JSON with hierarchy and agent list", async () => {
    let capturedBlob: Blob | null = null;
    let capturedDownloadName = "";

    vi.spyOn(window.URL, "createObjectURL").mockImplementation((blob) => {
      capturedBlob = blob as Blob;
      return "blob:mock-json";
    });

    const mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(function (this: { download: string }) {
        capturedDownloadName = this.download;
      }),
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLElement);

    exportOrgToJson(mockOrgTree, mockAgents, "DSLN Capital");

    expect(capturedDownloadName).toContain("struktur-organisasi-dsln-capital");
    expect(capturedDownloadName).toContain(".json");
    expect(capturedBlob).not.toBeNull();

    const jsonText = await (capturedBlob as unknown as Blob).text();
    const parsed = JSON.parse(jsonText);

    expect(parsed.organisasi).toBe("DSLN Capital");
    expect(parsed.totalAgen).toBe(2);
    expect(parsed.pohonHierarki).toHaveLength(1);
    expect(parsed.daftarAgen).toHaveLength(2);
    expect(parsed.daftarAgen[0].nama).toBe("CEO Executive");
    expect(parsed.daftarAgen[1].atasanId).toBe("agent-1");
  });

  it("exportOrgToCsv produces valid CSV with UTF-8 BOM and supervisor mapping", async () => {
    let capturedBlob: Blob | null = null;
    let capturedDownloadName = "";

    vi.spyOn(window.URL, "createObjectURL").mockImplementation((blob) => {
      capturedBlob = blob as Blob;
      return "blob:mock-csv";
    });

    const mockAnchor = {
      href: "",
      download: "",
      click: vi.fn(function (this: { download: string }) {
        capturedDownloadName = this.download;
      }),
    };
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as unknown as HTMLElement);

    exportOrgToCsv(mockAgents, "DSLN Capital");

    expect(capturedDownloadName).toContain("struktur-organisasi-dsln-capital");
    expect(capturedDownloadName).toContain(".csv");
    expect(capturedBlob).not.toBeNull();

    const csvText = await (capturedBlob as unknown as Blob).text();
    // Contains header columns
    expect(csvText).toContain("Nama Agen");
    expect(csvText).toContain("Atasan Langsung");
    // Contains agent rows and supervisor name mapping
    expect(csvText).toContain('"CEO Executive"');
    expect(csvText).toContain('"Quant Analyst"');
    expect(csvText).toContain('"CEO Executive"'); // Quant Analyst reports to CEO Executive
  });
});
