import { useState } from "react";
import { Link } from "@/lib/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, Check, ShieldCheck, X, Loader2, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { accessApi } from "@/api/access";
import { approvalsApi } from "@/api/approvals";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/context/ToastContext";
import { useI18n } from "@/lib/locale-helper";

export function NotificationPopover({ companyId }: { companyId: string | null | undefined }) {
  const { t } = useI18n();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // 1. Fetch pending join requests (e.g. external agents pairing)
  const { data: joinRequests = [], isLoading: loadingJoins } = useQuery({
    queryKey: queryKeys.access.joinRequests(companyId ?? "", "pending_approval"),
    queryFn: () => accessApi.listJoinRequests(companyId!, "pending_approval"),
    enabled: !!companyId,
    refetchInterval: 15_000,
  });

  // 2. Fetch pending approvals (e.g. task / action approvals)
  const { data: approvals = [], isLoading: loadingApprovals } = useQuery({
    queryKey: queryKeys.approvals.list(companyId ?? ""),
    queryFn: () => approvalsApi.list(companyId!),
    enabled: !!companyId,
    refetchInterval: 15_000,
  });

  const pendingApprovals = approvals.filter(
    (a) => a.status === "pending" || a.status === "revision_requested",
  );

  const totalCount = joinRequests.length + pendingApprovals.length;

  // Approve join request mutation
  const approveJoinMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.approveJoinRequest(companyId!, requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.joinRequests(companyId ?? "") });
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.list(companyId ?? "") });
      pushToast({
        title: t("Permintaan pairing agen disetujui", "Agent pairing request approved"),
        tone: "success",
      });
    },
    onError: (err) => {
      pushToast({
        title: err instanceof Error ? err.message : t("Gagal menyetujui pairing", "Failed to approve pairing"),
        tone: "error",
      });
    },
  });

  // Reject join request mutation
  const rejectJoinMutation = useMutation({
    mutationFn: (requestId: string) => accessApi.rejectJoinRequest(companyId!, requestId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.access.joinRequests(companyId ?? "") });
      pushToast({
        title: t("Permintaan pairing ditolak", "Pairing request rejected"),
        tone: "info",
      });
    },
    onError: (err) => {
      pushToast({
        title: err instanceof Error ? err.message : t("Gagal menolak pairing", "Failed to reject pairing"),
        tone: "error",
      });
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label={t("Notifikasi & Persetujuan", "Notifications & Approvals")}
        >
          <Bell className="size-4" />
          {totalCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-xs font-bold leading-none animate-in zoom-in-50">
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 border border-border bg-popover shadow-xl rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("Notifikasi & Permintaan", "Notifications & Requests")}
            </h3>
          </div>
          {totalCount > 0 ? (
            <Badge variant="destructive" className="text-xs">
              {totalCount} {t("Menunggu", "Pending")}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {t("Semua Bersih", "All clear")}
            </Badge>
          )}
        </div>

        {/* Content list */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {loadingJoins && loadingApprovals ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
              <span className="text-xs">{t("Memuat notifikasi...", "Loading notifications...")}</span>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <ShieldCheck className="size-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs font-medium text-foreground">
                {t("Tidak ada notifikasi baru", "No new notifications")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("Semua agen dan persetujuan sudah terselesaikan.", "All agents and approvals are up to date.")}
              </p>
            </div>
          ) : (
            <>
              {/* Join Requests */}
              {joinRequests.map((req) => (
                <div key={req.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {req.agentName || (req.requestType === "human" ? req.requestEmailSnapshot : t("Agen Baru", "New Agent"))}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {req.adapterType || req.requestType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {req.capabilities || t("Meminta pairing untuk bergabung dengan organisasi.", "Requesting pairing to join organization.")}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            disabled={rejectJoinMutation.isPending || approveJoinMutation.isPending}
                            onClick={() => rejectJoinMutation.mutate(req.id)}
                          >
                            <X className="size-3 mr-1" />
                            {t("Tolak", "Reject")}
                          </Button>
                          <Button
                            size="sm"
                            className="h-6 px-2 text-xs"
                            disabled={approveJoinMutation.isPending || rejectJoinMutation.isPending}
                            onClick={() => approveJoinMutation.mutate(req.id)}
                          >
                            {approveJoinMutation.isPending ? (
                              <Loader2 className="size-3 animate-spin mr-1" />
                            ) : (
                              <Check className="size-3 mr-1" />
                            )}
                            {t("Setujui", "Approve")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Task Approvals */}
              {pendingApprovals.map((appr) => (
                <div key={appr.id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <div className="size-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {appr.type || t("Persetujuan Tindakan", "Action Approval")}
                        </span>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {appr.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {t("Menunggu persetujuan eksekusi tugas atau operasi dari operator.", "Waiting for task execution or operation approval.")}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-1">
                        <span className="text-xs text-muted-foreground">
                          {new Date(appr.createdAt).toLocaleDateString()}
                        </span>
                        <Link
                          to={`/approvals/${appr.id}`}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          {t("Periksa", "Review")}
                          <ArrowRight className="size-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/20 text-xs">
          <Link
            to="/approvals"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            {t("Buka Menu Persetujuan", "Open Approvals Menu")}
          </Link>
          <Link
            to="/inbox/requests"
            onClick={() => setOpen(false)}
            className="text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            {t("Antrean Akses", "Access Queue")}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
