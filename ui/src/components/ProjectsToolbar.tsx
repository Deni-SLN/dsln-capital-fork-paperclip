import { ArrowUpDown, Check, Plus } from "lucide-react";
import { ToolbarSearch } from "./ToolbarSearch";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { useI18n } from "@/lib/locale-helper";

export type ProjectSortField = "name" | "updated" | "created" | "targetDate";
export type ProjectSortDir = "asc" | "desc";

const PROJECT_SORT_OPTIONS: Array<{ field: ProjectSortField; label: string }> = [
  { field: "name", label: "Name" },
  { field: "updated", label: "Updated" },
  { field: "created", label: "Created" },
  { field: "targetDate", label: "Target date" },
];

/** Canonical project search, sorting and creation controls. State stays with the page. */
export function ProjectsToolbar({ query, onQueryChange, sortField, sortDir, onSortChange, onNewProject: openNewProject }: {
  query: string;
  onQueryChange: (value: string) => void;
  sortField: ProjectSortField;
  sortDir: ProjectSortDir;
  onSortChange: (field: ProjectSortField, direction: ProjectSortDir) => void;
  onNewProject: () => void;
}) {
  const { t } = useI18n();
  const sortOptionLabels: Record<ProjectSortField, string> = {
    name: t("Nama", "Name"),
    updated: t("Diperbarui", "Updated"),
    created: t("Dibuat", "Created"),
    targetDate: t("Tanggal target", "Target date"),
  };
  const sortLabel = sortOptionLabels[sortField] ?? t("Nama", "Name");
  return <div data-canonical-toolbar="projects" role="toolbar" aria-label="Projects controls" className="flex flex-wrap items-center gap-4">
    <ToolbarSearch query={query} onQueryChange={onQueryChange} label={t("Cari proyek", "Search projects")} placeholder={t("Cari proyek…", "Search projects…")} />
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" title={t("Urutkan", "Sort")}>
          <ArrowUpDown className="h-3.5 w-3.5 sm:h-3 sm:w-3 sm:mr-1" />
          <span>{t("Urutkan: ", "Sort: ")}{sortLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-0">
        <div className="p-2 space-y-0.5">
          {PROJECT_SORT_OPTIONS.map((option) => (
            <button
              key={option.field}
              type="button"
              className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm ${
                sortField === option.field
                  ? "bg-accent/50 text-foreground"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
              onClick={() => {
                onSortChange(option.field, sortField === option.field
                  ? (sortDir === "asc" ? "desc" : "asc")
                  : (option.field === "name" || option.field === "targetDate" ? "asc" : "desc"));
              }}
            >
              <span>{sortOptionLabels[option.field] ?? option.label}</span>
              {sortField === option.field ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3" />
                  {sortDir === "asc" ? t("Naik", "Asc") : t("Turun", "Desc")}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
    <div className="design-toolbar-actions">
      <Button size="sm" variant="outline" data-toolbar-primary onClick={openNewProject}>
          <Plus className="h-4 w-4 mr-1" />
          {t("Tambah Proyek", "Add Project")}
      </Button>
    </div>
  </div>;
}
