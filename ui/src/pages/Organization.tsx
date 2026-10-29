import { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "@/lib/router";
import { useQuery } from "@tanstack/react-query";
import type { Agent, Issue } from "@paperclipai/shared";
import { AGENT_ROLE_LABELS } from "@paperclipai/shared";
import { agentsApi, type OrgNode } from "../api/agents";
import { dashboardApi } from "../api/dashboard";
import { issuesApi } from "../api/issues";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OrgChart } from "./OrgChart";
import { getAdapterLabel } from "../adapters/adapter-display-registry";
import {
  exportOrgChartToPng,
  exportOrgToJson,
  exportOrgToCsv,
} from "../lib/org-export";
import {
  Users,
  Building2,
  Activity,
  Play,
  Search,
  ChevronDown,
  Maximize2,
  Crown,
  Briefcase,
  Wallet,
  LineChart,
  BarChart3,
  TrendingUp,
  Coins,
  Shield,
  Cpu,
  Workflow,
  Palette,
  PieChart,
  Zap,
  Eye,
  CheckCircle2,
  MoreHorizontal,
  X,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Plus,
  Download,
  FileJson,
  FileSpreadsheet,
  Image as ImageIcon,
  Archive,
  Loader2,
} from "lucide-react";
import { cn, relativeTime } from "@/lib/utils";

export interface DepartmentData {
  id: string;
  name: string;
  icon: typeof Briefcase;
  iconBg: string;
  iconColor: string;
  agentCount: number;
  description: string;
  headOfDivision: string;
  runningTasks: number;
  pendingTasks: number;
  completedToday: number;
  createdAt: string;
  agents: Array<{
    id: string;
    urlKey: string;
    name: string;
    isLead?: boolean;
    role: string;
    roleBadgeClass: string;
    model: string;
    provider: string;
    providerLogo: string;
    status: "Running" | "Online" | "Idle" | "Offline";
    currentTask: string;
    lastRun: string;
  }>;
  subAgents: Array<{
    id: string;
    name: string;
    icon: typeof BarChart3;
    iconColor: string;
    agentCount: number;
  }>;
}

export function OrganizationPage() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const navigate = useNavigate();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Pusat Komando", href: "/dashboard" },
      { label: "Struktur Organisasi", href: "/organization" },
    ]);
  }, [setBreadcrumbs]);

  const companyKey = selectedCompanyId || "default";

  // Fetch real agents list
  const { data: realAgents = [] } = useQuery({
    queryKey: queryKeys.agents.list(companyKey),
    queryFn: () => agentsApi.list(companyKey),
    enabled: Boolean(selectedCompanyId),
  });

  // Fetch real org tree
  const { data: orgTree = [] } = useQuery({
    queryKey: ["agents", "org", companyKey],
    queryFn: () => agentsApi.org(companyKey),
    enabled: Boolean(selectedCompanyId),
  });

  // Fetch real dashboard summary
  const { data: dashboardData } = useQuery({
    queryKey: queryKeys.dashboard(companyKey),
    queryFn: () => dashboardApi.summary(companyKey),
    enabled: Boolean(selectedCompanyId),
  });

  // Fetch real issues for task correlation
  const { data: realIssues = [] } = useQuery({
    queryKey: queryKeys.issues.list(companyKey),
    queryFn: () => issuesApi.list(companyKey),
    enabled: Boolean(selectedCompanyId),
  });

  // Dynamically group agents into real departments based on agent roles / metadata
  const departments: DepartmentData[] = useMemo(() => {
    if (!realAgents || realAgents.length === 0) return [];

    const deptMap = new Map<string, DepartmentData>();

    const getDeptMeta = (role: string) => {
      switch (role) {
        case "ceo":
          return {
            id: "executive-office",
            name: "Executive Office",
            icon: Crown,
            iconBg: "bg-amber-500/10",
            iconColor: "text-amber-500",
            description: "Divisi kepemimpinan eksekutif dan orkestrasi arah strategis DSLN Capital.",
          };
        case "lead":
          return {
            id: "strategy-governance",
            name: "Strategy & Governance",
            icon: Briefcase,
            iconBg: "bg-blue-500/10",
            iconColor: "text-blue-500",
            description: "Divisi tata kelola, kepatuhan, dan perumusan eksekusi portofolio AI.",
          };
        case "specialist":
          return {
            id: "research-analytics",
            name: "Research & Analytics",
            icon: LineChart,
            iconBg: "bg-purple-500/10",
            iconColor: "text-purple-500",
            description: "Divisi riset makroekonomi kuantitatif, analisis pasar, dan pemodelan data.",
          };
        case "support":
          return {
            id: "it-automation",
            name: "IT & Automation",
            icon: Cpu,
            iconBg: "bg-indigo-500/10",
            iconColor: "text-indigo-500",
            description: "Divisi infrastruktur komputasi, otomatisasi alur kerja, dan integrasi layanan.",
          };
        case "general":
        default:
          return {
            id: "operations-general",
            name: "General Operations",
            icon: Workflow,
            iconBg: "bg-emerald-500/10",
            iconColor: "text-emerald-500",
            description: "Divisi operasional umum dan koordinasi penanganan tugas multifungsi.",
          };
      }
    };

    for (const agent of realAgents) {
      const roleKey = agent.role || "general";
      const meta = getDeptMeta(roleKey);

      let dept = deptMap.get(meta.id);
      if (!dept) {
        dept = {
          id: meta.id,
          name: meta.name,
          icon: meta.icon,
          iconBg: meta.iconBg,
          iconColor: meta.iconColor,
          agentCount: 0,
          description: meta.description,
          headOfDivision: agent.name,
          runningTasks: 0,
          pendingTasks: 0,
          completedToday: 0,
          createdAt: agent.createdAt ? new Date(agent.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-",
          agents: [],
          subAgents: [],
        };
        deptMap.set(meta.id, dept);
      }

      // Map agent status
      let displayStatus: "Running" | "Online" | "Idle" | "Offline" = "Idle";
      if (agent.status === "running") displayStatus = "Running";
      else if (agent.status === "active") displayStatus = "Online";
      else if (agent.status === "paused") displayStatus = "Idle";
      else if (agent.status === "error") displayStatus = "Offline";

      // Count tasks for this agent
      const agentIssues = realIssues.filter((i) => i.assigneeAgentId === agent.id);
      const runningCount = agentIssues.filter((i) => i.status === "in_progress").length;
      const pendingCount = agentIssues.filter((i) => i.status === "todo" || i.status === "backlog").length;
      const completedCount = agentIssues.filter((i) => i.status === "done").length;

      dept.runningTasks += runningCount;
      dept.pendingTasks += pendingCount;
      dept.completedToday += completedCount;

      const currentTaskTitle = agentIssues.find((i) => i.status === "in_progress")?.title
        || agentIssues.find((i) => i.status === "todo")?.title
        || (agent.status === "paused" ? `Dijeda (${agent.pauseReason || "manual"})` : "Menunggu instruksi tugas");

      const adapterDisplay = getAdapterLabel(agent.adapterType);

      dept.agents.push({
        id: agent.id,
        urlKey: agent.urlKey || agent.id,
        name: agent.name,
        isLead: dept.agents.length === 0,
        role: (AGENT_ROLE_LABELS as Record<string, string>)[roleKey] || roleKey,
        roleBadgeClass: meta.iconBg + " " + meta.iconColor + " border-border",
        model: adapterDisplay,
        provider: agent.adapterType,
        providerLogo: "🤖",
        status: displayStatus,
        currentTask: currentTaskTitle,
        lastRun: agent.lastHeartbeatAt ? relativeTime(agent.lastHeartbeatAt) : (agent.updatedAt ? relativeTime(agent.updatedAt) : "-"),
      });

      dept.agentCount += 1;
    }

    return Array.from(deptMap.values());
  }, [realAgents, realIssues]);

  const [activeTab, setActiveTab] = useState<
    "chart" | "department" | "all" | "canvas"
  >("chart");

  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<"overview" | "agents" | "tasks">("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableFilter, setTableFilter] = useState<"all" | "online" | "running" | "idle" | "offline">("all");

  // Keep selected department valid
  useEffect(() => {
    if (departments.length > 0 && (!selectedDeptId || !departments.some((d) => d.id === selectedDeptId))) {
      setSelectedDeptId(departments[0].id);
    }
  }, [departments, selectedDeptId]);

  const selectedDepartment = useMemo(() => {
    return departments.find((d) => d.id === selectedDeptId) || departments[0] || null;
  }, [departments, selectedDeptId]);

  const filteredAgentsInDept = useMemo(() => {
    if (!selectedDepartment) return [];
    return selectedDepartment.agents.filter((a) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q)) return false;
      }
      if (tableFilter === "all") return true;
      if (tableFilter === "online") return a.status === "Online";
      if (tableFilter === "running") return a.status === "Running";
      if (tableFilter === "idle") return a.status === "Idle";
      if (tableFilter === "offline") return a.status === "Offline";
      return true;
    });
  }, [selectedDepartment, tableFilter, searchQuery]);

  const totalAgents = realAgents.length;
  const onlineAgents = realAgents.filter((a) => a.status === "active" || a.status === "running").length;
  const runningTasks = dashboardData?.tasks?.inProgress ?? realIssues.filter((i) => i.status === "in_progress").length;

  const [isExportingPng, setIsExportingPng] = useState(false);

  const handleExportPng = async () => {
    try {
      setIsExportingPng(true);
      await exportOrgChartToPng(orgTree, realAgents, selectedCompany?.name || "DSLN Capital");
    } catch (err) {
      console.error("Gagal mengunduh bagan organisasi:", err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleExportJson = () => {
    exportOrgToJson(orgTree, realAgents, selectedCompany?.name || "DSLN Capital");
  };

  const handleExportCsv = () => {
    exportOrgToCsv(realAgents, selectedCompany?.name || "DSLN Capital");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & 4 Real Summary Metric Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Struktur Organisasi</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Struktur hierarki dan koordinasi divisi agen AI {selectedCompany?.name || "DSLN Capital"}
          </p>
        </div>

        {/* 4 Metric Cards in horizontal row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-lg border border-border bg-card px-3.5 py-2 flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
              <Users className="size-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Total Agen</span>
              <span className="text-base font-bold text-foreground">{totalAgents}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card px-3.5 py-2 flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
              <Building2 className="size-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Divisi</span>
              <span className="text-base font-bold text-foreground">{departments.length}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card px-3.5 py-2 flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-500">
              <Activity className="size-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Online</span>
              <span className="text-base font-bold text-foreground">{onlineAgents}</span>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card px-3.5 py-2 flex items-center gap-3">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-500">
              <Play className="size-4" />
            </div>
            <div>
              <span className="text-xs text-muted-foreground block">Tugas Berjalan</span>
              <span className="text-base font-bold text-foreground">{runningTasks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tab Navigation & Actions */}
      <div className="border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-6 text-xs font-medium overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("chart")}
            className={cn(
              "pb-2.5 pt-1 border-b-2 transition-colors whitespace-nowrap",
              activeTab === "chart"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Bagan Divisi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("canvas")}
            className={cn(
              "pb-2.5 pt-1 border-b-2 transition-colors whitespace-nowrap",
              activeTab === "canvas"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Visual Canvas (Pan & Zoom)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={cn(
              "pb-2.5 pt-1 border-b-2 transition-colors whitespace-nowrap",
              activeTab === "all"
                ? "border-primary text-primary font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Semua Agen ({totalAgents})
          </button>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto pb-1.5 sm:pb-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={isExportingPng || totalAgents === 0}
              >
                {isExportingPng ? (
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Download className="size-3.5" />
                )}
                <span>Unduh Struktur</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                Pilih format unduhan:
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={handleExportPng}
                disabled={isExportingPng}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <ImageIcon className="size-4 text-sky-500" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Bagan Gambar (PNG)</span>
                  <span className="text-muted-foreground text-(length:--text-nano)">Diagram visual resolusi tinggi</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportJson}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <FileJson className="size-4 text-amber-500" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Hierarki Data (JSON)</span>
                  <span className="text-muted-foreground text-(length:--text-nano)">Struktur pohon & relasi lengkap</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportCsv}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <FileSpreadsheet className="size-4 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">Roster Tabel (CSV / Excel)</span>
                  <span className="text-muted-foreground text-(length:--text-nano)">Daftar agen & atasan langsung</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer text-xs flex items-center gap-2">
                <Link to="/company/export">
                  <Archive className="size-4 text-purple-500" />
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">Ekspor Penuh Organisasi (.zip)</span>
                    <span className="text-muted-foreground text-(length:--text-nano)">Semua data, agen & instruksi</span>
                  </div>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button size="sm" className="h-8 text-xs gap-1.5" asChild>
            <Link to="/agents/new">
              <Plus className="size-3.5" />
              <span>Tambah Agen</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 3. Empty State If No Agents Exist */}
      {departments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center flex flex-col items-center justify-center">
          <Building2 className="size-12 text-muted-foreground mb-3" />
          <h3 className="text-base font-semibold text-foreground">Belum ada agen dalam organisasi</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md">
            Mulai bangun struktur tim AI Anda dengan menambahkan agen eksekutif atau operasional pertama.
          </p>
          <Button className="mt-4 text-xs gap-1.5" asChild>
            <Link to="/agents/new">
              <Plus className="size-3.5" />
              <span>Tambah Agen Baru</span>
            </Link>
          </Button>
        </div>
      ) : activeTab === "canvas" ? (
        /* Full Interactive Pan & Zoom OrgChart */
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <OrgChart embedded orgTree={orgTree} agents={realAgents} />
        </div>
      ) : (
        /* Dynamic Visual Hierarchy & Drawer */
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Canvas Area: 2 cols */}
          <div className="xl:col-span-2 rounded-xl border border-border bg-card p-4 overflow-hidden relative min-h-120 flex flex-col justify-between">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
              <div className="relative w-full sm:w-64">
                <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Cari divisi atau agen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1" asChild>
                  <Link to="/agents/new">
                    <Plus className="size-3.5" />
                    <span>Tambah Agen</span>
                  </Link>
                </Button>
              </div>
            </div>

            {/* Visual Org Tree */}
            <div className="py-6 overflow-x-auto flex flex-col items-center select-none">
              {/* LEVEL 0: ROOT COMPANY / CEO NODE */}
              <div className="flex flex-col items-center">
                <div className="rounded-xl border border-amber-500/40 bg-card p-3 shadow-sm flex items-center gap-3 w-60 hover:border-amber-500 transition-colors">
                  <div className="p-2 rounded-lg bg-amber-500/15 text-amber-500">
                    <Crown className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-foreground truncate">
                        {selectedCompany?.name || "DSLN Capital"}
                      </span>
                      <span className="size-2 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                      <span>Pusat Komando</span>
                      <span className="font-mono">{totalAgents} agen</span>
                    </div>
                  </div>
                </div>

                {/* Vertical connector line */}
                <div className="w-px h-8 bg-border" />
              </div>

              {/* LEVEL 1: HORIZONTAL CONNECTOR */}
              {departments.length > 1 && (
                <div className="w-full flex justify-center">
                  <div className="border-t border-border w-4/5 h-6" />
                </div>
              )}

              {/* LEVEL 1: REAL DEPARTMENTS ROW */}
              <div className="flex items-start justify-center gap-3 overflow-x-auto max-w-full pb-4 px-2">
                {departments.map((dept) => {
                  const IconComponent = dept.icon;
                  const isSelected = dept.id === selectedDeptId;

                  return (
                    <div
                      key={dept.id}
                      onClick={() => {
                        setSelectedDeptId(dept.id);
                        setDrawerOpen(true);
                      }}
                      className={cn(
                        "flex flex-col items-center p-3 rounded-xl border text-center transition-all cursor-pointer w-32 shrink-0 hover:border-primary/60",
                        isSelected
                          ? "border-blue-500 bg-blue-500/10 shadow-sm"
                          : "border-border bg-card hover:bg-muted/40"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-lg mb-1.5", dept.iconBg, dept.iconColor)}>
                        <IconComponent className="size-4" />
                      </div>
                      <span className="font-semibold text-xs text-foreground truncate w-full" title={dept.name}>
                        {dept.name}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        <span>{dept.agentCount} agen</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Drawer Panel: 1 col (Selected Department Overview) */}
          {drawerOpen && selectedDepartment && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              {/* Drawer Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      {selectedDepartment.name}
                    </h3>
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-xs">
                      ● Aktif
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedDepartment.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Drawer Tabs */}
              <div className="border-b border-border flex items-center gap-4 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setDrawerTab("overview")}
                  className={cn(
                    "pb-2 border-b-2 transition-colors",
                    drawerTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  )}
                >
                  Ringkasan
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("agents")}
                  className={cn(
                    "pb-2 border-b-2 transition-colors",
                    drawerTab === "agents" ? "border-primary text-primary" : "border-transparent text-muted-foreground"
                  )}
                >
                  Daftar Agen ({selectedDepartment.agents.length})
                </button>
              </div>

              {/* Key Department Details List */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Koordinator Divisi</span>
                  <span className="font-mono text-foreground flex items-center gap-1 font-semibold">
                    🤖 {selectedDepartment.headOfDivision}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Jumlah Agen</span>
                  <span className="font-semibold text-foreground">{selectedDepartment.agentCount}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Tugas Berjalan</span>
                  <span className="font-semibold text-foreground">{selectedDepartment.runningTasks}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Tugas Antrean</span>
                  <span className="font-semibold text-foreground">{selectedDepartment.pendingTasks}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Dibuat Pada</span>
                  <span className="text-foreground">{selectedDepartment.createdAt}</span>
                </div>
              </div>

              <Button
                className="w-full text-xs font-medium justify-center gap-1.5 h-8 mt-2"
                variant="outline"
                asChild
              >
                <Link to="/issues">
                  <span>Lihat Tugas Divisi Ini</span>
                  <ArrowRight className="size-3" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 4. Bottom Table: Agents in Selected Department */}
      {selectedDepartment && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Agen di Divisi {selectedDepartment.name}
              </h3>
              <Badge variant="outline" className="text-xs font-mono font-medium">
                {selectedDepartment.agents.length} agen
              </Badge>

              {/* Filter pills */}
              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => setTableFilter("all")}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                    tableFilter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Semua {selectedDepartment.agents.length}
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter("online")}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                    tableFilter === "online" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Online {selectedDepartment.agents.filter((a) => a.status === "Online").length}
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter("running")}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                    tableFilter === "running" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Berjalan {selectedDepartment.agents.filter((a) => a.status === "Running").length}
                </button>
                <button
                  type="button"
                  onClick={() => setTableFilter("idle")}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                    tableFilter === "idle" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  Dijeda {selectedDepartment.agents.filter((a) => a.status === "Idle").length}
                </button>
              </div>
            </div>

            <Link to="/agents" className="text-xs font-medium text-primary hover:underline">
              Kelola Semua Agen
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-muted-foreground border-b border-border pb-2">
                  <th className="py-2 w-8 font-medium">#</th>
                  <th className="py-2 font-medium">NAMA AGEN</th>
                  <th className="py-2 font-medium">PERAN</th>
                  <th className="py-2 font-medium">ADAPTER / MODEL</th>
                  <th className="py-2 font-medium">STATUS</th>
                  <th className="py-2 font-medium">TUGAS SAAT INI</th>
                  <th className="py-2 font-medium">HEARTBEAT TERAKHIR</th>
                  <th className="py-2 font-medium text-right">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAgentsInDept.map((ag, idx) => (
                  <tr key={ag.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-mono text-muted-foreground">{idx + 1}</td>
                    <td className="py-3 font-medium text-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 rounded bg-blue-500/10 text-blue-500">🤖</span>
                        <Link to={`/agents/${ag.urlKey || ag.id}`} className="hover:underline font-mono font-semibold">
                          {ag.name}
                        </Link>
                        {ag.isLead && <Crown className="size-3 text-amber-500 inline fill-amber-500" />}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", ag.roleBadgeClass)}>
                        {ag.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{ag.providerLogo}</span>
                        <span className="font-medium text-foreground">{ag.model}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                          ag.status === "Running" && "bg-blue-500/15 text-blue-500",
                          ag.status === "Online" && "bg-emerald-500/15 text-emerald-500",
                          ag.status === "Idle" && "bg-slate-500/15 text-slate-500",
                          ag.status === "Offline" && "bg-rose-500/15 text-rose-500"
                        )}
                      >
                        <span>●</span>
                        <span>{ag.status}</span>
                      </span>
                    </td>
                    <td className="py-3 max-w-48 truncate text-muted-foreground" title={ag.currentTask}>
                      {ag.currentTask}
                    </td>
                    <td className="py-3 font-mono text-muted-foreground">{ag.lastRun}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                        <Link to={`/agents/${ag.urlKey || ag.id}`}>
                          Buka
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrganizationPage;
