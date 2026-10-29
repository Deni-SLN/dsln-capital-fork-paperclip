// @vitest-environment jsdom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Meetings } from "./Meetings";

const mockMeetingsApi = vi.hoisted(() => ({
  getParticipants: vi.fn(),
  conduct: vi.fn(),
  continue: vi.fn(),
  createIssues: vi.fn(),
}));

vi.mock("../api/meetings", () => ({
  meetingsApi: mockMeetingsApi,
}));

vi.mock("../context/CompanyContext", () => ({
  useCompany: () => ({
    selectedCompanyId: "company-1",
    selectedCompany: { id: "company-1", name: "DSLN Capital", issuePrefix: "DSL" },
  }),
}));

vi.mock("../context/BreadcrumbContext", () => ({
  useBreadcrumbs: () => ({ setBreadcrumbs: vi.fn() }),
}));

vi.mock("../context/ToastContext", () => ({
  useToast: () => ({ pushToast: vi.fn() }),
}));

vi.mock("../components/MarkdownBody", () => ({
  MarkdownBody: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe("Meetings Page (Ruang Rapat Multi-Agen)", () => {
  let container: HTMLDivElement;
  let root: Root;
  let queryClient: QueryClient;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    mockMeetingsApi.getParticipants.mockResolvedValue({
      leader: {
        id: "leader-1",
        name: "Sofia Agent",
        role: "Chief Executive Agent",
        department: "Kepemimpinan & Strategi Eksekutif",
        isLeader: true,
      },
      participants: [
        {
          id: "leader-1",
          name: "Sofia Agent",
          role: "Chief Executive Agent",
          department: "Kepemimpinan & Strategi Eksekutif",
          isLeader: true,
        },
      ],
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.clearAllMocks();
  });

  it("renders only real company agents in participants list", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Meetings />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain("Ruang Rapat AI");
    expect(container.textContent).toContain("Mulai Sesi Rapat Baru");

    await vi.waitFor(() => {
      expect(container.textContent).toContain("Peserta Rapat Sesuai Bidang (1)");
      expect(container.textContent).toContain("Sofia Agent");
      expect(container.textContent).toContain("Saat ini baru ada 1 agen AI terdaftar");
    });
  });

  it("renders quick topic template suggestions", async () => {
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <Meetings />
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain("Arsitektur Nice Router v2");
    expect(container.textContent).toContain("Integrasi Telegram & Webhook");
  });
});
