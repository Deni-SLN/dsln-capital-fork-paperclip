import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAgentService = vi.hoisted(() => ({
  list: vi.fn(),
  orgForCompany: vi.fn(),
}));

const mockIssueService = vi.hoisted(() => ({
  create: vi.fn(),
}));

vi.mock("../services/index.js", () => ({
  agentService: () => mockAgentService,
  issueService: () => mockIssueService,
}));

vi.mock("../routes/authz.js", () => ({
  getActorInfo: () => ({ actorType: "user", actorId: "local-board", agentId: null, runId: null }),
  assertCompanyAccess: () => {},
}));

async function createApp() {
  const { meetingsRoutes } = await import("../routes/meetings.js");
  const app = express();
  app.use(express.json());
  app.use("/api", meetingsRoutes({} as any));
  return app;
}

describe("Meetings Routes (/api/companies/:companyId/meetings)", () => {
  const companyId = "test-company-1";

  beforeEach(() => {
    vi.clearAllMocks();
    mockAgentService.list.mockResolvedValue([
      {
        id: "agent-ceo",
        name: "Sofia Agent",
        role: "ceo",
        title: "Chief Executive Agent",
        reportsTo: null,
        status: "active",
      },
      {
        id: "agent-tech",
        name: "Dev Agent",
        role: "engineer",
        title: "Backend Engineer",
        reportsTo: "agent-ceo",
        status: "active",
      },
    ]);
  });

  it("GET /api/companies/:companyId/meetings/participants returns leader and participants", async () => {
    const app = await createApp();
    const res = await request(app).get(`/api/companies/${companyId}/meetings/participants`);

    expect(res.status).toBe(200);
    expect(res.body.leader.name).toBe("Sofia Agent");
    expect(res.body.leader.isLeader).toBe(true);
    expect(res.body.participants.length).toBe(2);
  });

  it("GET /api/companies/:companyId/meetings/participants returns ONLY real agents when only 1 exists", async () => {
    mockAgentService.list.mockResolvedValue([
      {
        id: "agent-ceo",
        name: "Sofia Agent",
        role: "ceo",
        title: "Chief Executive Agent",
        reportsTo: null,
        status: "active",
      },
    ]);
    const app = await createApp();
    const res = await request(app).get(`/api/companies/${companyId}/meetings/participants`);

    expect(res.status).toBe(200);
    expect(res.body.leader.name).toBe("Sofia Agent");
    expect(res.body.participants.length).toBe(1);
    expect(res.body.participants[0].name).toBe("Sofia Agent");
  });

  it("POST /api/companies/:companyId/meetings/conduct generates discussion and conclusion", async () => {
    const app = await createApp();
    const res = await request(app)
      .post(`/api/companies/${companyId}/meetings/conduct`)
      .send({ task: "Rancang peluncuran Nice Router versi 2.0 dan bot Telegram" });

    expect(res.status).toBe(200);
    expect(res.body.topic).toContain("Nice Router");
    expect(res.body.leaderAgent.name).toBe("Sofia Agent");
    expect(res.body.turns.length).toBeGreaterThanOrEqual(4);
    expect(res.body.conclusion).toBeDefined();
    expect(res.body.conclusion.actionItems.length).toBeGreaterThanOrEqual(1);
    expect(res.body.conclusion.decisions.length).toBeGreaterThanOrEqual(1);
  });

  it("POST /api/companies/:companyId/meetings/create-issues converts action items into real issues", async () => {
    mockIssueService.create.mockResolvedValue({
      id: "issue-1",
      title: "Test Task",
      identifier: "DSL-1",
    });

    const app = await createApp();
    const res = await request(app)
      .post(`/api/companies/${companyId}/meetings/create-issues`)
      .send({
        meetingTopic: "Nice Router",
        actionItems: [
          {
            title: "Implementasi Backend",
            assigneeName: "Dev Agent",
            description: "Kerjakan backend Nice Router",
            priority: "high",
          },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(1);
    expect(mockIssueService.create).toHaveBeenCalledTimes(1);
  });
});
