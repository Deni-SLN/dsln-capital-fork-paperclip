import { api } from "./client";
import type {
  ConductMeetingInput,
  ContinueMeetingInput,
  CreateMeetingIssuesInput,
  MeetingParticipant,
  MeetingSession,
  MeetingTurn,
} from "@paperclipai/shared";

export const meetingsApi = {
  getParticipants: (companyId: string) =>
    api.get<{ leader: MeetingParticipant; participants: MeetingParticipant[] }>(
      `/companies/${encodeURIComponent(companyId)}/meetings/participants`,
    ),

  conduct: (companyId: string, data: ConductMeetingInput) =>
    api.post<MeetingSession>(
      `/companies/${encodeURIComponent(companyId)}/meetings/conduct`,
      data,
    ),

  continue: (companyId: string, data: ContinueMeetingInput) =>
    api.post<{ newTurns: MeetingTurn[] }>(
      `/companies/${encodeURIComponent(companyId)}/meetings/continue`,
      data,
    ),

  createIssues: (companyId: string, data: CreateMeetingIssuesInput) =>
    api.post<{
      success: boolean;
      count: number;
      createdIssues: Array<{ id: string; title: string; identifier?: string }>;
    }>(
      `/companies/${encodeURIComponent(companyId)}/meetings/create-issues`,
      data,
    ),
};
