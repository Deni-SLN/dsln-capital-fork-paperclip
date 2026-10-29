import { useId, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { Bot, Search, User } from "lucide-react";
import type { IssueFiltersPopover } from "./IssueFiltersPopover";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { FlyoutHeader } from "./ui/flyout";
import { StatusIcon } from "./StatusIcon";
import { TruncatedText } from "./TruncatedText";
import { issueFilterLabel, issueStatusOrder, searchIssueFilterOptions, toggleIssueFilterValue } from "@/lib/issue-filters";
import { useI18n } from "@/lib/locale-helper";

type PanelProps = Pick<ComponentProps<typeof IssueFiltersPopover>, "state" | "onChange" | "activeFilterCount" | "agents" | "projects" | "labels" | "creators" | "currentUserId"> & { onClear: () => void };

function FilterGroup({ title, searchLabel, query, onQueryChange, children, optionsKey, isId }: { title: string; searchLabel?: string; query?: string; onQueryChange?: (value: string) => void; children: ReactNode; optionsKey: string; isId?: boolean }) {
  const headingId = useId();
  return (
    <section className="task-filter-group" aria-labelledby={headingId}>
      <h3 id={headingId}>{title}</h3>
      <div className="task-filter-group-body">
        {searchLabel ? <div className="task-filter-search"><Search aria-hidden /><Input aria-label={`${isId ? "Cari" : "Search"} ${searchLabel}`} placeholder={`${isId ? "Cari" : "Search"} ${searchLabel}...`} value={query} onChange={event => onQueryChange?.(event.target.value)} /></div> : null}
        <div className="task-filter-options" data-filter-options={optionsKey}>{children}</div>
      </div>
    </section>
  );
}

function FilterRow({ label, checked, onToggle, icon }: { label: string; checked: boolean; onToggle: () => void; icon?: ReactNode }) {
  return <label className="task-filter-option" data-marquee-surface><Checkbox aria-label={label} checked={checked} onCheckedChange={onToggle} />{icon ? <span className="task-filter-icon" aria-hidden>{icon}</span> : null}<TruncatedText className="task-filter-option-label">{label}</TruncatedText></label>;
}

/** Proposed five-group IA; the collection retains ownership of filter state. */
export function IssueFilterPanel({ state, onChange, activeFilterCount, agents = [], projects = [], labels = [], creators = [], currentUserId, onClear }: PanelProps) {
  const { isId, t } = useI18n();
  const [queries, setQueries] = useState({ projects: "", creators: "", assignees: "", labels: "" });
  const search = (key: keyof typeof queries) => (value: string) => setQueries(current => ({ ...current, [key]: value }));
  const visibleProjects = searchIssueFilterOptions(projects, queries.projects, option => option.name);
  const visibleCreators = searchIssueFilterOptions(creators, queries.creators, option => `${option.label} ${option.searchText ?? ""}`);
  const assignees = [{ id: "__unassigned", name: t("Tanpa penerima tugas", "No assignee"), icon: null }, ...(currentUserId ? [{ id: "__me", name: t("Saya", "Me"), icon: <User /> }] : []), ...agents.map(agent => ({ ...agent, icon: null }))];
  const visibleAssignees = searchIssueFilterOptions(assignees, queries.assignees, option => option.name);
  const visibleLabels = searchIssueFilterOptions(labels, queries.labels, option => option.name);
  return <>
    <FlyoutHeader className="task-filters-header"><span>{t("Filter", "Filters")}</span>{activeFilterCount ? <Button variant="ghost" onClick={() => { onClear(); setQueries({ projects: "", creators: "", assignees: "", labels: "" }); }}>{t("Hapus", "Clear")}</Button> : null}</FlyoutHeader>
    <div className="task-filters-grid">
      <FilterGroup title="Status" optionsKey="statuses" isId={isId}>
        {issueStatusOrder.map(status => <FilterRow key={status} label={issueFilterLabel(status, isId)} checked={state.statuses.includes(status)} onToggle={() => onChange({ statuses: toggleIssueFilterValue(state.statuses, status) })} icon={<StatusIcon status={status} />} />)}
      </FilterGroup>
      <FilterGroup title={t("Proyek", "Project")} optionsKey="projects" searchLabel={t("proyek", "projects")} query={queries.projects} onQueryChange={search("projects")} isId={isId}>
        {visibleProjects.map(project => <FilterRow key={project.id} label={project.name} checked={state.projects.includes(project.id)} onToggle={() => onChange({ projects: toggleIssueFilterValue(state.projects, project.id) })} />)}
        {!visibleProjects.length ? <p className="task-filter-empty">{queries.projects ? t("Tidak ada proyek yang cocok.", "No projects match.") : t("Belum ada proyek.", "No projects available.")}</p> : null}
      </FilterGroup>
      <FilterGroup title={t("Pembuat", "Creator")} optionsKey="creators" searchLabel={t("pembuat", "creators")} query={queries.creators} onQueryChange={search("creators")} isId={isId}>
        {visibleCreators.map(creator => <FilterRow key={creator.id} label={creator.label} checked={state.creators.includes(creator.id)} onToggle={() => onChange({ creators: toggleIssueFilterValue(state.creators, creator.id) })} icon={creator.kind === "agent" ? <Bot /> : <User />} />)}
        {!visibleCreators.length ? <p className="task-filter-empty">{queries.creators ? t("Tidak ada pembuat yang cocok.", "No creators match.") : t("Belum ada pembuat.", "No creators available.")}</p> : null}
      </FilterGroup>
      <FilterGroup title={t("Penerima Tugas", "Assignee")} optionsKey="responsible" searchLabel={t("penerima tugas", "assignees")} query={queries.assignees} onQueryChange={search("assignees")} isId={isId}>
        {visibleAssignees.map(assignee => <FilterRow key={assignee.id} label={assignee.name} checked={state.assignees.includes(assignee.id)} onToggle={() => onChange({ assignees: toggleIssueFilterValue(state.assignees, assignee.id) })} icon={assignee.icon} />)}
        {!visibleAssignees.length ? <p className="task-filter-empty">{t("Tidak ada penerima tugas yang cocok.", "No assignees match.")}</p> : null}
      </FilterGroup>
      <FilterGroup title={t("Label", "Label")} optionsKey="labels" searchLabel={t("label", "labels")} query={queries.labels} onQueryChange={search("labels")} isId={isId}>
        {visibleLabels.map(label => <FilterRow key={label.id} label={label.name} checked={state.labels.includes(label.id)} onToggle={() => onChange({ labels: toggleIssueFilterValue(state.labels, label.id) })} icon={<span className="task-filter-label-dot" style={{ "--task-filter-label-color": label.color } as CSSProperties} />} />)}
        {!visibleLabels.length ? <p className="task-filter-empty">{queries.labels ? t("Tidak ada label yang cocok.", "No labels match.") : t("Belum ada label.", "No labels available.")}</p> : null}
      </FilterGroup>
    </div>
  </>;
}
