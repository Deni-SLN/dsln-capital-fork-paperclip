export interface MeetingParticipant {
  id: string;
  name: string;
  role: string;
  department: string;
  isLeader: boolean;
  avatarUrl?: string;
  avatarSeed?: string;
}

export interface MeetingTurn {
  id: string;
  agentId: string;
  agentName: string;
  role: string;
  department: string;
  avatarUrl?: string;
  isLeader: boolean;
  stage: "opening" | "discussion" | "alignment" | "conclusion" | "followup";
  content: string;
  timestamp: string;
}

export interface MeetingActionItem {
  id: string;
  title: string;
  assigneeName: string;
  assigneeAgentId?: string;
  description: string;
  priority: "high" | "medium" | "low";
  createdIssueId?: string;
  createdIssueIdentifier?: string;
}

export interface MeetingConclusion {
  summary: string;
  decisions: string[];
  actionItems: MeetingActionItem[];
  nextSteps: string[];
}

export interface MeetingSession {
  id: string;
  companyId: string;
  topic: string;
  createdAt: string;
  leaderAgent: MeetingParticipant;
  participants: MeetingParticipant[];
  turns: MeetingTurn[];
  conclusion?: MeetingConclusion;
  status: "idle" | "in_progress" | "completed";
}

export interface ConductMeetingInput {
  task: string;
  agentIds?: string[];
  departments?: string[];
}

export interface ContinueMeetingInput {
  meetingId: string;
  topic: string;
  userMessage: string;
  previousTurns: MeetingTurn[];
}

export interface CreateMeetingIssuesInput {
  actionItems: MeetingActionItem[];
  meetingTopic: string;
}
