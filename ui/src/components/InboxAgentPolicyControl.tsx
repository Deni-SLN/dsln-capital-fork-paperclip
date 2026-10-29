import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Inbox, LoaderCircle, Save } from "lucide-react";
import type { InboxAgentPolicy, InboxAgentPolicyMode } from "@paperclipai/shared";
import { agentsApi } from "@/api/agents";
import { inboxAgentPolicyApi } from "@/api/inbox-agent-policy";
import { queryKeys } from "@/lib/queryKeys";
import { isAgentTaskTarget } from "@/lib/company-members";
import { AgentMultiSelect } from "@/components/AgentMultiSelect";
import { Button } from "@/components/ui/button";
import { RadioCardGroup, type RadioCardOption } from "@/components/ui/radio-card";
import { useI18n } from "@/lib/locale-helper";

const MODE_OPTIONS: RadioCardOption[] = [
  {
    value: "open",
    title: "Any of my agents",
    description: "Let any agent you manage archive tasks out of your inbox.",
  },
  {
    value: "allowlist",
    title: "Only chosen agents",
    description: "Restrict inbox tidying to the agents you pick below.",
  },
  {
    value: "disabled",
    title: "Off",
    description: "Agents can never archive tasks from your inbox.",
  },
];

function policyKey(mode: InboxAgentPolicyMode, allowedAgentIds: string[]): string {
  return `${mode}:${[...allowedAgentIds].sort().join(",")}`;
}

interface Draft {
  mode: InboxAgentPolicyMode;
  allowedAgentIds: string[];
}

/**
 * "Let agents tidy my inbox" user-settings control. A single
 * three-state policy — `open` / `allowlist` / `disabled` — round-tripped through
 * the per-user endpoints. When `allowlist` is selected the user picks which
 * of their agents may archive. The one-click Undo/Unarchive affordance and the
 * "Archived by …" attribution live elsewhere (inbox rows / properties pane).
 */
export function InboxAgentPolicyControl({ companyId }: { companyId: string | null | undefined }) {
  const { t: tr } = useI18n();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const lastServerKeyRef = useRef<string | null>(null);

  const modeOptions: RadioCardOption[] = useMemo(
    () => [
      {
        value: "open",
        title: tr("Semua agen saya", "Any of my agents"),
        description: tr("Izinkan agen mana pun yang Anda kelola untuk mengarsipkan tugas dari kotak masuk Anda.", "Let any agent you manage archive tasks out of your inbox."),
      },
      {
        value: "allowlist",
        title: tr("Hanya agen pilihan", "Only chosen agents"),
        description: tr("Batasi perapian kotak masuk hanya untuk agen yang Anda pilih di bawah ini.", "Restrict inbox tidying to the agents you pick below."),
      },
      {
        value: "disabled",
        title: tr("Nonaktif", "Off"),
        description: tr("Agen tidak dapat pernah mengarsipkan tugas dari kotak masuk Anda.", "Agents can never archive tasks from your inbox."),
      },
    ],
    [tr],
  );

  const policyQuery = useQuery({
    queryKey: companyId ? queryKeys.inboxAgentPolicy.mine(companyId) : ["inbox-agent-policy", "none"],
    queryFn: () => inboxAgentPolicyApi.getMine(companyId!),
    enabled: !!companyId,
  });
  const policy = policyQuery.data;

  const agentsQuery = useQuery({
    queryKey: companyId ? queryKeys.agents.list(companyId) : ["agents", "none"],
    queryFn: () => agentsApi.list(companyId!),
    enabled: !!companyId,
  });
  const selectableAgents = useMemo(
    () => (agentsQuery.data ?? []).filter(isAgentTaskTarget),
    [agentsQuery.data],
  );
  const agentOptions = useMemo(
    () => selectableAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      title: agent.title ?? agent.role,
      icon: agent.icon,
    })),
    [selectableAgents],
  );
  const selectedAgentIds = useMemo(
    () => new Set(draft?.allowedAgentIds ?? []),
    [draft?.allowedAgentIds],
  );

  // Adopt server state on first load, or on refetch when the user has not
  // diverged from the previously-synced snapshot (so a background refetch never
  // clobbers pending edits).
  useEffect(() => {
    if (!policy) return;
    const serverKey = policyKey(policy.mode, policy.allowedAgentIds);
    setDraft((current) => {
      if (current === null || policyKey(current.mode, current.allowedAgentIds) === lastServerKeyRef.current) {
        return { mode: policy.mode, allowedAgentIds: policy.allowedAgentIds };
      }
      return current;
    });
    lastServerKeyRef.current = serverKey;
  }, [policy]);

  const updateMutation = useMutation({
    mutationFn: (next: Draft) =>
      inboxAgentPolicyApi.updateMine(companyId!, {
        mode: next.mode,
        allowedAgentIds: next.mode === "allowlist" ? next.allowedAgentIds : [],
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData<InboxAgentPolicy>(queryKeys.inboxAgentPolicy.mine(companyId!), saved);
    },
  });

  const isDirty = Boolean(
    draft && policy && policyKey(draft.mode, draft.allowedAgentIds) !== policyKey(policy.mode, policy.allowedAgentIds),
  );

  if (policyQuery.error) {
    return (
      <div className="text-sm text-destructive">
        {policyQuery.error instanceof Error ? policyQuery.error.message : tr("Gagal memuat kebijakan agen kotak masuk.", "Failed to load inbox agent policy.")}
      </div>
    );
  }

  if (policyQuery.isLoading || !draft) {
    return <div className="text-sm text-muted-foreground">{tr("Memuat kebijakan agen kotak masuk…", "Loading inbox agent policy…")}</div>;
  }

  return (
    <section className="space-y-4" aria-label="Let agents tidy my inbox">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">{tr("Izinkan agen merapikan kotak masuk saya", "Let agents tidy my inbox")}</h2>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {tr(
            "Pilih apakah agen yang Anda kelola boleh mengarsipkan tugas dari kotak masuk atas nama Anda. Anda dapat membatalkan pengarsipan apa pun, dan setiap arsip agen dicatat dalam properti tugas.",
            "Choose whether the agents you manage may archive tasks out of your inbox on your behalf. You can undo any archive, and every agent archive is attributed in the task's properties.",
          )}
        </p>
      </div>

      <RadioCardGroup
        ariaLabel="Inbox agent archiving policy"
        value={draft.mode}
        onValueChange={(value) => setDraft((current) => (current ? { ...current, mode: value as InboxAgentPolicyMode } : current))}
        options={modeOptions}
        className="max-w-2xl"
      />

      {draft.mode === "allowlist" ? (
        <div className="max-w-2xl space-y-2">
          <div className="text-sm font-medium">{tr("Agen yang diizinkan merapikan kotak masuk saya", "Agents allowed to tidy my inbox")}</div>
          <AgentMultiSelect
            agents={agentOptions}
            selectedAgentIds={selectedAgentIds}
            onChange={(next) =>
              setDraft((current) =>
                current ? { ...current, allowedAgentIds: [...next] } : current,
              )
            }
            triggerLabel={
              selectedAgentIds.size === 0
                ? tr("Pilih agen", "Select agents")
                : `${selectedAgentIds.size} ${tr("agen dipilih", selectedAgentIds.size === 1 ? "agent selected" : "agents selected")}`
            }
            triggerFullWidth={false}
            showSelectionPreview={false}
            emptyMessage={tr("Anda belum mengelola agen apa pun.", "You don’t manage any agents yet.")}
          />
        </div>
      ) : null}

      {updateMutation.error ? (
        <div className="max-w-2xl rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {updateMutation.error instanceof Error ? updateMutation.error.message : tr("Gagal menyimpan kebijakan agen kotak masuk.", "Failed to save inbox agent policy.")}
        </div>
      ) : null}

      <div className="flex max-w-2xl items-center justify-end gap-3">
        {updateMutation.isSuccess && !isDirty ? (
          <span className="text-xs text-muted-foreground" role="status">{tr("Tersimpan", "Saved")}</span>
        ) : null}
        <Button
          type="button"
          disabled={!isDirty || updateMutation.isPending}
          onClick={() => draft && updateMutation.mutate(draft)}
        >
          {updateMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {updateMutation.isPending ? tr("Menyimpan…", "Saving…") : tr("Simpan", "Save")}
        </Button>
      </div>
    </section>
  );
}
