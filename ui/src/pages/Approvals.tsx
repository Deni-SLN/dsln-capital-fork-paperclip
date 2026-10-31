import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { approvalsApi } from "../api/approvals";
import { accessApi } from "../api/access";
import { agentsApi } from "../api/agents";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useToast } from "../context/ToastContext";
import { queryKeys } from "../lib/queryKeys";
import { cn } from "../lib/utils";
import { PageTabBar } from "../components/PageTabBar";
import { Tabs } from "@/components/ui/tabs";
import { ShieldCheck, Bot, Check, X, Loader2 } from "lucide-react";
import { ApprovalCard } from "../components/ApprovalCard";
import { PageSkeleton } from "../components/PageSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/locale-helper";

type StatusFilter = "pending" | "all";

export function Approvals() {
  const { t } = useI18n();
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const pathSegment = location.pathname.split("/").pop() ?? "pending";
  const statusFilter: StatusFilter = pathSegment === "all" ? "all" : "pending";
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: t("Persetujuan", "Approvals") }]);
  }, [setBreadcrumbs, t]);

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.approvals.list(selectedCompanyId!),
    queryFn: () => approvalsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const { data: joinRequests = [], isLoading: joinRequestsLoading } = useQuery({
    queryKey: queryKeys.access.joinRequests(selectedCompanyId!, "all"),
    queryFn: () => accessApi.listJoinRequests(selectedCompanyId!, undefined),
    enabled: !!selectedCompanyId,
  });

  const { data: agents } = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.approve(id),
    onSuccess: (_approval, id) => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId!) });
      navigate(`/approvals/${id}?resolved=approved`);
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : t("Gagal menyetujui", "Failed to approve"));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => approvalsApi.reject(id),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.list(selectedCompanyId!) });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : t("Gagal menolak", "Failed to reject"));
    },
  });

  const approveJoinMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.approveJoinRequest(selectedCompanyId!, requestId),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.joinRequests(selectedCompanyId!) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(selectedCompanyId!) });
      pushToast({
        title: t("Permintaan pairing agen disetujui & agen telah aktif", "Agent pairing approved & agent activated"),
        tone: "success",
      });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : t("Gagal menyetujui pairing agen", "Failed to approve agent pairing"));
    },
  });

  const rejectJoinMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.rejectJoinRequest(selectedCompanyId!, requestId),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.joinRequests(selectedCompanyId!) });
      pushToast({
        title: t("Permintaan pairing agen ditolak", "Agent pairing rejected"),
        tone: "info",
      });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : t("Gagal menolak pairing agen", "Failed to reject agent pairing"));
    },
  });

  const filteredApprovals = (data ?? [])
    .filter(
      (a) => statusFilter === "all" || a.status === "pending" || a.status === "revision_requested",
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingApprovalsCount = (data ?? []).filter(
    (a) => a.status === "pending" || a.status === "revision_requested",
  ).length;

  const pendingJoinRequests = (joinRequests ?? []).filter((r) => r.status === "pending_approval");
  const visibleJoinRequests = statusFilter === "all" ? joinRequests : pendingJoinRequests;

  const totalPending = pendingApprovalsCount + pendingJoinRequests.length;

  if (!selectedCompanyId) {
    return <p className="text-sm text-muted-foreground">{t("Pilih organisasi terlebih dahulu.", "Select an organization first.")}</p>;
  }

  if (isLoading || joinRequestsLoading) {
    return <PageSkeleton variant="approvals" />;
  }

  const hasAnyItems = filteredApprovals.length > 0 || visibleJoinRequests.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => navigate(`/approvals/${v}`)}>
          <PageTabBar items={[
            { value: "pending", label: <>{t("Menunggu", "Pending")}{totalPending > 0 && (
              <Badge variant="ghost" className={cn(
                "ml-1.5 px-1.5 text-xs",
                "bg-yellow-500/20 text-yellow-500"
              )}>
                {totalPending}
              </Badge>
            )}</> },
            { value: "all", label: t("Semua", "All") },
          ]} />
        </Tabs>
      </div>

      {error && <p className="text-sm text-destructive">{error.message}</p>}
      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      {/* 1. Agent Pairing & Join Requests Section */}
      {visibleJoinRequests.length > 0 && (
        <div className="space-y-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t("Permintaan Pairing Agen & Akses", "Agent Pairing & Access Requests")}
              </h3>
            </div>
            {pendingJoinRequests.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pendingJoinRequests.length} {t("Menunggu Konfirmasi", "Awaiting Confirmation")}
              </Badge>
            )}
          </div>

          <div className="grid gap-3">
            {visibleJoinRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-lg border border-border bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">
                      {req.agentName || (req.requestType === "human" ? req.requestEmailSnapshot : t("Agen", "Agent"))}
                    </span>
                    <Badge variant="outline" className="text-xs font-mono">
                      {req.adapterType || req.requestType}
                    </Badge>
                    <Badge
                      variant={req.status === "pending_approval" ? "secondary" : req.status === "approved" ? "outline" : "destructive"}
                      className="text-xs"
                    >
                      {req.status === "pending_approval" ? t("Menunggu Persetujuan", "Pending Approval") : req.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {req.capabilities || t("Permintaan pairing agen eksternal.", "External agent pairing request.")}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>IP: {req.requestIp}</span>
                    <span>•</span>
                    <span>{new Date(req.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                {req.status === "pending_approval" ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={rejectJoinMutation.isPending || approveJoinMutation.isPending}
                      onClick={() => rejectJoinMutation.mutate(req.id)}
                    >
                      <X className="size-3.5 mr-1" />
                      {t("Tolak", "Reject")}
                    </Button>
                    <Button
                      size="sm"
                      disabled={approveJoinMutation.isPending || rejectJoinMutation.isPending}
                      onClick={() => approveJoinMutation.mutate(req.id)}
                    >
                      {approveJoinMutation.isPending ? (
                        <Loader2 className="size-3.5 animate-spin mr-1" />
                      ) : (
                        <Check className="size-3.5 mr-1" />
                      )}
                      {t("Setujui Pairing & Hubungkan Agen", "Approve Pairing & Connect Agent")}
                    </Button>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic shrink-0">
                    {req.status === "approved" ? t("Telah disetujui", "Already approved") : t("Telah ditolak", "Already rejected")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Task & Operations Approvals Section */}
      {filteredApprovals.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("Persetujuan Tindakan & Tugas", "Action & Task Approvals")}
            </h3>
          </div>
          <div className="grid gap-3">
            {filteredApprovals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                requesterAgent={approval.requestedByAgentId ? (agents ?? []).find((a) => a.id === approval.requestedByAgentId) ?? null : null}
                onApprove={() => approveMutation.mutate(approval.id)}
                onReject={() => rejectMutation.mutate(approval.id)}
                detailLink={`/approvals/${approval.id}`}
                isPending={approveMutation.isPending || rejectMutation.isPending}
                pendingAction={
                  approveMutation.isPending ? "approve" : rejectMutation.isPending ? "reject" : null
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasAnyItems && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="size-8 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {statusFilter === "pending" ? t("Tidak ada persetujuan atau permintaan pairing tertunda.", "No pending approvals or pairing requests.") : t("Belum ada persetujuan.", "No approvals yet.")}
          </p>
        </div>
      )}
    </div>
  );
}
