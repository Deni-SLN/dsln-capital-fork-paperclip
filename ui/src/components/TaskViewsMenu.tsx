import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TASK_VIEW_GROUPS, taskView, type TaskViewKey } from "@/lib/task-views";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/locale-helper";

const TASK_VIEW_LABELS_ID: Record<string, { label: string; hint: string }> = {
  mine: { label: "Milik Saya", hint: "Ditugaskan ke Anda atau menunggu Anda" },
  unread: { label: "Belum Dibaca", hint: "Tugas yang Anda tangani dengan aktivitas baru" },
  blocked: { label: "Diblokir", hint: "Tugas yang diblokir, dikelompokkan berdasarkan pemblokir" },
  recent: { label: "Terbaru", hint: "Semua yang baru-baru ini Anda buka atau ubah" },
  everything: { label: "Semua Item", hint: "Tugas, persetujuan, eksekusi gagal, dan permintaan bergabung" },
  all: { label: "Semua tugas", hint: "Semua tugas di dalam organisasi" },
  active: { label: "Aktif", hint: "Tugas terbuka, sedang berjalan atau menunggu" },
  backlog: { label: "Backlog", hint: "Belum dimulai" },
  done: { label: "Selesai", hint: "Tugas yang sudah selesai atau dibatalkan" },
};

const TASK_GROUP_LABELS_ID: Record<string, string> = {
  "My work": "Pekerjaan Saya",
  "Organization": "Organisasi",
};

/**
 * The single control that replaced both the Inbox tab bar and the implicit
 * "all tasks" default on Tasks (PAP-670). One menu, grouped by scope, so the
 * nav does not have to grow a row every time a view is added.
 */
export function TaskViewsMenu({
  value,
  onChange,
  badgeCount,
}: {
  value: TaskViewKey;
  onChange: (next: TaskViewKey) => void;
  /** Unread count surfaced next to the My-work group, mirroring the nav badge. */
  badgeCount?: number;
}) {
  const { isId } = useI18n();
  const active = taskView(value);
  const activeLabel = isId ? (TASK_VIEW_LABELS_ID[value]?.label ?? active.label) : active.label;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5"
          aria-label={isId ? `Ganti tampilan — saat ini ${activeLabel}` : `Change view — currently ${active.label}`}
        >
          <span className="max-w-(--sz-160px) truncate font-medium">{activeLabel}</span>
          <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--sz-260px)">
        {TASK_VIEW_GROUPS.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>{isId ? (TASK_GROUP_LABELS_ID[group.label] ?? group.label) : group.label}</span>
              {groupIndex === 0 && badgeCount != null && badgeCount > 0 ? (
                <span className="rounded-full bg-primary px-1.5 text-(length:--text-nano) leading-tight text-primary-foreground">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              ) : null}
            </DropdownMenuLabel>
            {group.views.map((view) => {
              const selected = view.key === value;
              const viewLabel = isId ? (TASK_VIEW_LABELS_ID[view.key]?.label ?? view.label) : view.label;
              const viewHint = isId ? (TASK_VIEW_LABELS_ID[view.key]?.hint ?? view.hint) : view.hint;
              return (
                <DropdownMenuItem
                  key={view.key}
                  onSelect={() => onChange(view.key)}
                  className="items-start gap-2"
                  aria-current={selected ? "true" : undefined}
                >
                  <Check
                    aria-hidden="true"
                    className={cn("mt-0.5 size-3.5 shrink-0", selected ? "opacity-100" : "opacity-0")}
                  />
                  <span className="min-w-0">
                    <span className={cn("block truncate", selected && "font-medium")}>{viewLabel}</span>
                    <span className="block text-(length:--text-nano) text-muted-foreground">{viewHint}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
