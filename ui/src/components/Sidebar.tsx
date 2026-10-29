import {
  Inbox,
  ListChecks,
  CircleCheck,
  Target,
  ShieldCheck,
  LayoutDashboard,
  DollarSign,
  History,
  Search,
  SquarePen,
  Network,
  Boxes,
  Repeat,
  Layers,
  GitBranch,
  Package,
  Settings,
  FolderOpen,
  Unplug,
  MessagesSquare,
  MessageCircle,
  GanttChartSquare,
  LayoutGrid,
  Users,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  HeartPulse,
  CheckSquare,
} from "lucide-react";
import { DslnLogo } from "./DslnLogo";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { SidebarAgents } from "./SidebarAgents";
import { SidebarProjects } from "./SidebarProjects";
import { SidebarStarredProjects } from "./SidebarStarredProjects";
import { useAgentChatEnabled } from "@/hooks/useAgentChatEnabled";
import { SidebarRecentTasks } from "./SidebarRecentTasks";
import { useDialogActions } from "../context/DialogContext";
import { useCompany } from "../context/CompanyContext";
import { useSidebar } from "../context/SidebarContext";
import { attentionApi } from "../api/attention";
import { heartbeatsApi } from "../api/heartbeats";
import { instanceSettingsApi } from "../api/instanceSettings";
import { queryKeys } from "../lib/queryKeys";
import { attentionBadgeCount } from "../lib/attention";
import { useInboxBadge } from "../hooks/useInboxBadge";
import { useStreamlinedUiEnabled } from "../hooks/useStreamlinedUiEnabled";
import { usePublishSharedQueryData, useSharedPollingQuery } from "../hooks/useSharedPolling";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, SIDEBAR_RAIL_HIDDEN_LABEL } from "../lib/utils";
import { PluginSlotOutlet } from "@/plugins/slots";
import { PluginLauncherOutlet } from "@/plugins/launchers";
import { SidebarCompanyMenu } from "./SidebarCompanyMenu";
import { primarySidebarStyles } from "./primary-sidebar-styles";
import { useTranslation } from "@/i18n";

export function Sidebar({ children }: { children?: ReactNode }) {
  const { t } = useTranslation();
  const { openNewIssue } = useDialogActions();
  const { enabled: agentChatEnabled } = useAgentChatEnabled();
  // Every labeled section is collapsible (session-scoped, default open) —
  // one policy across static nav groups and the data-driven sections.
  const [workOpen, setWorkOpen] = useState(true);
  const [organizationOpen, setOrganizationOpen] = useState(true);
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { collapsed, peeking } = useSidebar();
  const { enabled: streamlinedUiEnabled } = useStreamlinedUiEnabled();
  const rail = collapsed && !peeking;
  const inboxBadge = useInboxBadge(selectedCompanyId);
  const { data: experimentalSettings } = useQuery({
    queryKey: queryKeys.instance.experimentalSettings,
    queryFn: () => instanceSettingsApi.getExperimental(),
  });
  const liveRunsQueryKey = queryKeys.liveRuns(selectedCompanyId!);
  const sharedLiveRuns = useSharedPollingQuery({
    companyId: selectedCompanyId,
    resourceKey: "live-runs",
    queryKey: liveRunsQueryKey,
    enabled: !!selectedCompanyId,
    // Event-sourced via LiveUpdatesProvider (GitHub issue 9627) + reconnect reconcile — no
    // interval poll needed. Polling here also re-armed React Query's timer on
    // every live-event cache write, a major source of steady-state churn.
    refetchInterval: false,
    leaderOnly: true,
  });
  const { data: liveRuns, dataUpdatedAt: liveRunsUpdatedAt } = useQuery({
    queryKey: liveRunsQueryKey,
    queryFn: () => heartbeatsApi.liveRunsForCompany(selectedCompanyId!),
    enabled: sharedLiveRuns.enabled,
    refetchInterval: sharedLiveRuns.refetchInterval,
  });
  usePublishSharedQueryData(sharedLiveRuns, liveRuns, liveRunsUpdatedAt);
  const liveRunCount = liveRuns?.length ?? 0;
  const liveIssueIds = new Set(
    (liveRuns ?? []).flatMap((run) => run.issueId ? [run.issueId] : []),
  );
  // PAP-670 splits the nav reorganization across two experimental flags.
  // Agent Chat: Chat leads Work as one row with its own agent rail (the
  // streamlined shell only — the legacy shell keeps per-agent rows), and
  // Workspaces leaves to make room. Combined Inbox + Task List: Inbox becomes
  // views inside Tasks, so its row goes and its badge rides on Tasks.
  const chatRail = agentChatEnabled && streamlinedUiEnabled;
  // The merged Tasks page only exists in the streamlined shell, so the legacy
  // shell keeps its Inbox row even with the flag on.
  const combinedInboxTasks = streamlinedUiEnabled && experimentalSettings?.enableCombinedInboxTasks === true;
  const showWorkspacesLink = !chatRail && experimentalSettings?.enableIsolatedWorkspaces === true;
  const showStatusCards = experimentalSettings?.enableStatusCards === true;
  const goalsLinkPending = experimentalSettings === undefined;
  const showGoalsLink = experimentalSettings?.enableGoalsSidebarLink === true;
  // Decisions (attention home) is an experimental surface (PAP-13481): the nav
  // item is hidden entirely until the flag is enabled (same no-flash pattern as
  // showWorkspacesLink — it defaults hidden, so no placeholder is needed).
  const showDecisions = experimentalSettings?.enableDecisions === true;
  const { data: attentionFeed } = useQuery({
    queryKey: queryKeys.attention(selectedCompanyId!),
    queryFn: () => attentionApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId && showDecisions,
    refetchInterval: 60_000,
  });
  const attentionCount = attentionBadgeCount(attentionFeed);
  const showCases = experimentalSettings?.enableCases === true;
  // Conference Room Chat flag (PAP-136/PAP-137): the Conference Room nav item
  // is a new surface, hidden entirely while the flag is off (same no-flash
  // pattern as showWorkspacesLink above).
  const conferenceRoomChatEnabled = experimentalSettings?.enableConferenceRoomChat === true;

  const pluginContext = {
    companyId: selectedCompanyId,
    companyPrefix: selectedCompany?.issuePrefix ?? null,
  };

  return (
    <aside
      className={cn(
        "w-full h-full min-h-0 flex flex-col",
        streamlinedUiEnabled
          ? primarySidebarStyles.surface
          : "border-r border-border bg-background",
      )}
    >
      {/* Top bar: company name, aligned with top sections and borderless.
          Search deliberately does NOT live here:
          the header's spare width goes to the workspace/organization name,
          which is the user's orientation anchor and truncates otherwise.
          Search is the first nav item below instead. */}
      <div className="flex h-(--sz-60px) shrink-0 items-center gap-1 px-3">
        <SidebarCompanyMenu />
      </div>

      <nav className={primarySidebarStyles.nav}>
        <div className={primarySidebarStyles.group}>
          <SidebarNavItem to="/dashboard" label="Pusat Komando" icon={LayoutDashboard} liveCount={liveRunCount} end />
          <SidebarNavItem to="/org" label="Struktur Organisasi" icon={Network} end />
          <SidebarNavItem to="/agents" label="Daftar Agen" icon={Users} />
          <SidebarNavItem to="/meetings" label="Ruang Rapat" icon={MessagesSquare} />
          <SidebarNavItem to="/projects" label="Proyek & Portofolio" icon={FolderOpen} />
          <SidebarNavItem to="/issues" label="Tugas & Operasi" icon={CheckSquare} badge={liveRunCount > 0 ? liveRunCount : undefined} badgeTone="danger" />
          <SidebarNavItem to="/approvals" label="Persetujuan" icon={ShieldCheck} badge={attentionCount > 0 ? attentionCount : undefined} badgeTone="danger" />
          <SidebarNavItem to="/costs" label="Pusat Biaya AI" icon={DollarSign} />
        </div>

        {/* Side Menu Proyek Aktif */}
        <SidebarProjects />

        <div className={primarySidebarStyles.group}>
          <SidebarNavItem to="/research-insights" label="Riset & Analisis" icon={Sparkles} end />
          <SidebarNavItem to="/trading-operations" label="Operasi Trading" icon={TrendingUp} end />
          <SidebarNavItem to="/risk-management" label="Manajemen Risiko" icon={ShieldAlert} end />
          <SidebarNavItem to="/system-health" label="Kesehatan Sistem" icon={HeartPulse} end />
          <SidebarNavItem to="/activity/timeline" label="Aktivitas & Audit" icon={History} />
          <SidebarNavItem to="/company/settings/connections" label="Integrasi & API" icon={Unplug} end />
          <SidebarNavItem to="/company/settings" label="Pengaturan" icon={Settings} end />
        </div>
      </nav>

      {/* DSLN Capital Footer */}
      {!rail && (
        <div className="mt-auto border-t border-border p-3.5 flex flex-col gap-1 bg-card/40">
          <div className="flex items-center gap-2">
            <DslnLogo className="size-5" />
            <span className="text-xs font-bold tracking-wider text-foreground">DSLN CAPITAL</span>
          </div>
          <p className="text-xs text-muted-foreground leading-tight">
            Membangun Kecerdasan untuk Masa Depan yang Lebih Baik
          </p>
          <span className="text-xs font-mono text-muted-foreground/70">
            v1.0.0-dsln
          </span>
        </div>
      )}
    </aside>
  );
}
