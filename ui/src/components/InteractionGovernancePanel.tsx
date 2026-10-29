import { Fragment } from "react";
import {
  ISSUE_THREAD_INTERACTION_KINDS,
  normalizeIssueThreadInteractionResolverPolicy,
  type InteractionResolverGovernance,
  type IssueThreadInteractionCanonicalResolverPolicy,
  type IssueThreadInteractionKind,
  type IssueThreadInteractionResolverPolicy,
} from "@paperclipai/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolverPolicyLabel } from "../lib/interaction-audience";
import { useI18n } from "@/lib/locale-helper";

const INTERACTION_KIND_LABELS: Record<IssueThreadInteractionKind, string> = {
  suggest_tasks: "Suggested tasks",
  ask_user_questions: "Ask user questions",
  request_confirmation: "Confirmations",
  request_checkbox_confirmation: "Checkbox confirmations",
  request_item_verdicts: "Item verdicts",
  connection_intent: "Connection requests",
};

const INTERACTION_KIND_LABELS_ID: Record<IssueThreadInteractionKind, string> = {
  suggest_tasks: "Usulan tugas (Suggested tasks)",
  ask_user_questions: "Pertanyaan pengguna (Ask questions)",
  request_confirmation: "Konfirmasi (Confirmations)",
  request_checkbox_confirmation: "Konfirmasi centang (Checkbox)",
  request_item_verdicts: "Penilaian item (Item verdicts)",
  connection_intent: "Permintaan koneksi (Connections)",
};

/**
 * Sentinel for "no override" — Radix Select disallows empty-string item values.
 * Under the open-default contract (PAP-17280) an absent override *is* the open
 * audience, so this sentinel is what a company sees selected until it
 * deliberately narrows a kind.
 */
export const GOVERNANCE_UNSET = "default";
export type GovernanceSelectValue = typeof GOVERNANCE_UNSET | IssueThreadInteractionResolverPolicy;

export type GovernanceField = "defaultPolicy" | "cap";

/**
 * Only *narrowing* policies are offered. `anyone` is the product default, so
 * requesting it as a default override is a no-op, and capping at `anyone` cannot
 * narrow anything — both collapse into the unset sentinel, which is presented as
 * the visible default.
 */
const NARROWING_POLICIES: readonly IssueThreadInteractionCanonicalResolverPolicy[] = [
  "not_creator",
  "human_only",
];

const UNSET_LABELS: Record<GovernanceField, string> = {
  defaultPolicy: "Anyone (default)",
  cap: "No cap",
};

const UNSET_LABELS_ID: Record<GovernanceField, string> = {
  defaultPolicy: "Siapa saja (default)",
  cap: "Tanpa batasan",
};

const UNSET_EFFECTS: Record<GovernanceField, string> = {
  defaultPolicy: "New cards are open — the board or any agent can respond, including the one that asked.",
  cap: "A request keeps whatever audience it asks for.",
};

const UNSET_EFFECTS_ID: Record<GovernanceField, string> = {
  defaultPolicy: "Kartu baru terbuka — dewan atau agen mana pun dapat merespons, termasuk yang mengajukan.",
  cap: "Permintaan mempertahankan audiens apa pun yang dimintanya.",
};

const DEFAULT_POLICY_EFFECTS: Record<IssueThreadInteractionCanonicalResolverPolicy, string> = {
  anyone: UNSET_EFFECTS.defaultPolicy,
  not_creator: "New cards exclude the agent that created them, so the answer comes from someone else.",
  human_only: "New cards wait for a person on the board. Agents are turned away.",
};

const DEFAULT_POLICY_EFFECTS_ID: Record<IssueThreadInteractionCanonicalResolverPolicy, string> = {
  anyone: UNSET_EFFECTS_ID.defaultPolicy,
  not_creator: "Kartu baru mengecualikan agen pembuat, sehingga jawaban harus berasal dari agen lain atau dewan.",
  human_only: "Kartu baru menunggu seseorang di dewan. Agen tidak dapat merespons.",
};

const CAP_EFFECTS: Record<IssueThreadInteractionCanonicalResolverPolicy, string> = {
  anyone: UNSET_EFFECTS.cap,
  not_creator: "Even a card that asks for Anyone is narrowed to exclude its creator.",
  human_only: "Every card of this kind waits for a person, whatever it asked for.",
};

const CAP_EFFECTS_ID: Record<IssueThreadInteractionCanonicalResolverPolicy, string> = {
  anyone: UNSET_EFFECTS_ID.cap,
  not_creator: "Bahkan kartu yang meminta Siapa saja dibatasi untuk mengecualikan pembuatnya.",
  human_only: "Setiap kartu jenis ini harus menunggu tanggapan manusia, apa pun yang diminta sebelumnya.",
};

const NARROWING_POLICY_LABELS_ID: Record<IssueThreadInteractionCanonicalResolverPolicy, string> = {
  anyone: "Siapa saja",
  not_creator: "Siapa saja kecuali pembuat",
  human_only: "Hanya manusia (Dewan)",
};

function governanceOptions(field: GovernanceField, isId: boolean): {
  value: GovernanceSelectValue;
  label: string;
  effect: string;
}[] {
  const unsetLabel = isId ? UNSET_LABELS_ID[field] : UNSET_LABELS[field];
  const unsetEffect = isId ? UNSET_EFFECTS_ID[field] : UNSET_EFFECTS[field];
  const effects = field === "cap"
    ? (isId ? CAP_EFFECTS_ID : CAP_EFFECTS)
    : (isId ? DEFAULT_POLICY_EFFECTS_ID : DEFAULT_POLICY_EFFECTS);

  return [
    { value: GOVERNANCE_UNSET, label: unsetLabel, effect: unsetEffect },
    ...NARROWING_POLICIES.map((policy) => ({
      value: policy as GovernanceSelectValue,
      label: isId ? NARROWING_POLICY_LABELS_ID[policy] : resolverPolicyLabel(policy),
      effect: effects[policy],
    })),
  ];
}

/**
 * The label a *closed* trigger must show. Derived from the value rather than
 * looked up in the option list so an out-of-list value (a raw `anyone`, say)
 * still renders a complete, truthful label instead of falling back to a lie.
 */
export function governanceValueLabel(field: GovernanceField, value: GovernanceSelectValue, isId: boolean = false): string {
  if (value === GOVERNANCE_UNSET) {
    return isId ? UNSET_LABELS_ID[field] : UNSET_LABELS[field];
  }
  const canonical = normalizeIssueThreadInteractionResolverPolicy(value);
  return isId ? (NARROWING_POLICY_LABELS_ID[canonical] ?? resolverPolicyLabel(value)) : resolverPolicyLabel(value);
}

/**
 * Map a persisted override onto a select value. A stored `anyone` — including
 * the deprecated `board_or_agents` alias — is the open default, so it shows as
 * the unset sentinel rather than as a narrowing override.
 */
export function toGovernanceSelectValue(
  policy: IssueThreadInteractionResolverPolicy | undefined,
): GovernanceSelectValue {
  if (!policy) return GOVERNANCE_UNSET;
  const canonical = normalizeIssueThreadInteractionResolverPolicy(policy);
  return canonical === "anyone" ? GOVERNANCE_UNSET : canonical;
}

/**
 * Apply a single (kind, field) change to a governance map immutably, pruning
 * empty entries so the persisted object stays sparse (only real overrides).
 */
export function applyGovernanceChange(
  current: InteractionResolverGovernance,
  kind: IssueThreadInteractionKind,
  field: GovernanceField,
  value: GovernanceSelectValue,
): InteractionResolverGovernance {
  const next: InteractionResolverGovernance = { ...current };
  const entry = { ...(next[kind] ?? {}) };
  if (value === GOVERNANCE_UNSET) {
    delete entry[field];
  } else {
    entry[field] = value;
  }
  if (entry.defaultPolicy === undefined && entry.cap === undefined) {
    delete next[kind];
  } else {
    next[kind] = entry;
  }
  return next;
}

function GovernanceSelect({
  field,
  value,
  onChange,
  disabled,
  testId,
  ariaLabel,
  mobileLabel,
  isId = false,
}: {
  field: GovernanceField;
  value: GovernanceSelectValue;
  onChange: (value: GovernanceSelectValue) => void;
  disabled?: boolean;
  testId?: string;
  ariaLabel: string;
  mobileLabel: string;
  isId?: boolean;
}) {
  const options = governanceOptions(field, isId);
  return (
    <div className="min-w-0">
      {/*
       * Below `sm` the governance grid collapses to a single column (see the
       * grid classes on the panel), detaching each select from its column
       * header. Surface a mobile-only inline label so the control stays
       * self-describing for sighted users, and always carry `aria-label` for
       * screen-reader pairing. WCAG 2.1 SC 1.4.10 (Reflow) — design review R2.
       */}
      <span className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide sm:hidden">
        {mobileLabel}
      </span>
      <Select value={value} onValueChange={(v) => onChange(v as GovernanceSelectValue)} disabled={disabled}>
        <SelectTrigger
          size="sm"
          aria-label={ariaLabel}
          // 208px is sized for the longest label the control can hold —
          // `Anyone except creator` needs ~150px of text room, and 170px only
          // left 122px after padding, gap and chevron, so it clipped even once
          // the effect sentence was gone (PAP-17297).
          className="w-full min-w-0 text-xs sm:w-(--sz-208px)"
          data-testid={testId}
        >
          {/*
           * Explicit children, not the default `<SelectValue />`. Radix portals
           * the selected item's *whole* subtree into an empty value node, which
           * dragged each option's effect sentence into the closed trigger and
           * clipped the selected label (desktop truncated the prose, mobile cut
           * `Anyone (default)` mid-label — PAP-17293/PAP-17297). Passing children
           * sets `valueNodeHasChildren`, which suppresses that portal, so the
           * trigger shows exactly the label and nothing else.
           */}
          <SelectValue>{governanceValueLabel(field, value, isId)}</SelectValue>
        </SelectTrigger>
        {/*
         * Cap the option list so the effect sentences wrap instead of stretching
         * the popover past a ~390px viewport (WCAG 2.1 SC 1.4.10 Reflow).
         */}
        <SelectContent className="max-w-(--sz-280px) sm:max-w-(--sz-360px)">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              // Keyboard typeahead matches on `textValue` when given; without it
              // Radix would match against the effect prose too.
              textValue={option.label}
              className="text-xs"
            >
              {/*
               * Effect preview lives inside the option so the consequence of a
               * narrowing choice is legible at the moment of choosing, not only
               * after saving (PAP-17280).
               */}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span>{option.label}</span>
                <span className="text-(length:--text-micro) text-muted-foreground">
                  {option.effect}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Company-level interaction governance: the per-kind default audience and cap.
 *
 * The open default is the headline — interactions are resolvable by anyone in
 * the company unless a row here narrows them — so the panel only offers
 * narrowing choices and never presents an unrestricted card as board-required
 * (PAP-17280, contract in `doc/SPEC-implementation.md` §9.8.1).
 */
export function InteractionGovernancePanel({
  governance,
  onChange,
  isPending,
  errorMessage,
}: {
  governance: InteractionResolverGovernance;
  onChange: (kind: IssueThreadInteractionKind, field: GovernanceField, value: GovernanceSelectValue) => void;
  isPending?: boolean;
  errorMessage?: string | null;
}) {
  const { t: tr, isId } = useI18n();

  return (
    <div className="space-y-4" data-testid="company-settings-interaction-governance-section">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {tr("Tata Kelola Interaksi", "Interaction governance")}
      </div>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {tr("Interaksi utas terbuka secara default: ", "Thread interactions are open by default: ")}
          <span className="font-medium text-foreground">{tr("Siapa saja", "Anyone")}</span>{" "}
          {tr(
            "di dalam organisasi — dewan atau agen mana pun, termasuk yang mengajukan — dapat merespons. Batasi jenis interaksi hanya jika Anda memerlukannya. ",
            "in the organization — the board or any agent, including the one that asked — can respond. Narrow a kind only when you need to. "
          )}
          <span className="font-medium text-foreground">{tr("Kebijakan default", "Default policy")}</span>{" "}
          {tr(
            "adalah audiens yang diterima kartu baru jika pemohon tidak menentukannya; ",
            "is the audience new cards get when the requester does not ask for one; "
          )}
          <span className="font-medium text-foreground">{tr("Batasan (Cap)", "Cap")}</span>{" "}
          {tr(
            "mempersempit setiap permintaan jenis tersebut dan tidak pernah memperluasnya. Konfirmasi persetujuan tools selalu ",
            "narrows every request of that kind and can never widen one. Tool-approval confirmations always stay "
          )}
          <span className="font-medium text-foreground">{tr("Hanya manusia", "Human only")}</span>.
        </p>
        {/*
         * Responsive: below `sm` the row collapses to a single column so the
         * two 170px selects never force horizontal overflow on a ~390px
         * viewport (WCAG 2.1 SC 1.4.10 Reflow — design review R2). Each kind
         * then stacks as: label → Default policy → Cap, each full-width with
         * its own inline label. At `sm`+ it restores the aligned 3-col grid.
         */}
        <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-x-4 sm:gap-y-2.5">
          <div className="hidden text-xs font-medium text-muted-foreground uppercase tracking-wide sm:block">
            {tr("Jenis Interaksi", "Kind")}
          </div>
          <div className="hidden text-xs font-medium text-muted-foreground uppercase tracking-wide sm:block">
            {tr("Kebijakan Default", "Default policy")}
          </div>
          <div className="hidden text-xs font-medium text-muted-foreground uppercase tracking-wide sm:block">
            {tr("Batasan (Cap)", "Cap")}
          </div>
          {ISSUE_THREAD_INTERACTION_KINDS.map((kind) => {
            const entry = governance[kind] ?? {};
            const kindLabel = isId ? INTERACTION_KIND_LABELS_ID[kind] : INTERACTION_KIND_LABELS[kind];
            return (
              <Fragment key={kind}>
                <div className="text-sm font-medium sm:font-normal">{kindLabel}</div>
                <GovernanceSelect
                  field="defaultPolicy"
                  testId={`governance-${kind}-default`}
                  ariaLabel={`Default resolver audience for ${kindLabel}`}
                  mobileLabel={tr("Kebijakan Default", "Default policy")}
                  value={toGovernanceSelectValue(entry.defaultPolicy)}
                  disabled={isPending}
                  onChange={(v) => onChange(kind, "defaultPolicy", v)}
                  isId={isId}
                />
                <GovernanceSelect
                  field="cap"
                  testId={`governance-${kind}-cap`}
                  ariaLabel={`Resolver cap for ${kindLabel}`}
                  mobileLabel={tr("Batasan (Cap)", "Cap")}
                  value={toGovernanceSelectValue(entry.cap)}
                  disabled={isPending}
                  onChange={(v) => onChange(kind, "cap", v)}
                  isId={isId}
                />
              </Fragment>
            );
          })}
        </div>
        {errorMessage ? (
          <span className="text-xs text-destructive">{errorMessage}</span>
        ) : null}
      </div>
    </div>
  );
}
