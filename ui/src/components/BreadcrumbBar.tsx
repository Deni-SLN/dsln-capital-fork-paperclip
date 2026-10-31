import { Link } from "@/lib/router";
import { Menu, PanelRightClose, PanelRightOpen, Bell, Sun, Moon, Search } from "lucide-react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useSidebar } from "../context/SidebarContext";
import { useCompany } from "../context/CompanyContext";
import { usePanel } from "../context/PanelContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Fragment, useMemo, type ReactNode } from "react";
import { PluginSlotOutlet, usePluginSlots } from "@/plugins/slots";
import { PluginLauncherOutlet, usePluginLaunchers } from "@/plugins/launchers";
import { NotificationPopover } from "./NotificationPopover";
import { cn } from "../lib/utils";

type GlobalToolbarContext = { companyId: string | null; companyPrefix: string | null };

/** Task identifier rendered in gray monospace beside its breadcrumb label. */
function CrumbIdentifier({ identifier }: { identifier?: string }) {
  if (!identifier) return null;
  return (
    <span data-slot="task-title-identifier" className="shrink-0 font-mono text-(length:--text-micro) text-muted-foreground">
      {identifier}
    </span>
  );
}

function GlobalToolbar({
  context,
  pageToolbar,
}: {
  context: GlobalToolbarContext;
  pageToolbar?: ReactNode;
}) {
  const { slots } = usePluginSlots({ slotTypes: ["globalToolbarButton"], companyId: context.companyId });
  const { launchers } = usePluginLaunchers({ placementZones: ["globalToolbarButton"], companyId: context.companyId, enabled: !!context.companyId });
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1 pl-2 empty:hidden">
      {pageToolbar}
      {slots.length > 0 ? (
        <PluginSlotOutlet slotTypes={["globalToolbarButton"]} context={context} className="flex items-center gap-1" />
      ) : null}
      {launchers.length > 0 ? (
        <PluginLauncherOutlet placementZones={["globalToolbarButton"]} context={context} className="flex items-center gap-1" />
      ) : null}
    </div>
  );
}

export function BreadcrumbBar({ taskDetailLayout = false }: { taskDetailLayout?: boolean }) {
  const {
    breadcrumbs,
    breadcrumbToolbar,
    breadcrumbPanelControl,
    mobileToolbar,
  } = useBreadcrumbs();
  const { toggleSidebar, isMobile } = useSidebar();
  const { panelVisible, togglePanelVisible } = usePanel();
  const { selectedCompanyId, selectedCompany } = useCompany();
  const { theme, toggleTheme } = useTheme();
  const taskPanelOpen = breadcrumbPanelControl?.open ?? panelVisible;
  const toggleTaskPanel = breadcrumbPanelControl?.onToggle ?? togglePanelVisible;

  const dslnRightActions = (
    <div className="flex items-center gap-2.5 shrink-0 ml-4">
      {/* Search Input button */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
        className="hidden md:flex items-center justify-between gap-3 w-64 lg:w-72 px-3 py-1 rounded-lg border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">Cari agen, tugas, riset...</span>
        </div>
        <kbd className="shrink-0 px-1 py-0.2 rounded border border-border bg-background text-xs font-mono text-muted-foreground">
          Ctrl K
        </kbd>
      </button>

      {/* Notification Bell */}
      <NotificationPopover companyId={selectedCompanyId} />

      {/* Theme toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Ganti tema"
      >
        {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>

      {/* Admin Profile */}
      <div className="flex items-center gap-2 pl-2 border-l border-border select-none">
        <div className="size-8 rounded-full bg-blue-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
          AD
        </div>
        <div className="hidden xl:flex flex-col text-left leading-tight">
          <span className="text-xs font-semibold text-foreground">Admin</span>
          <span className="text-xs text-muted-foreground">Kantor Eksekutif</span>
        </div>
      </div>
    </div>
  );

  const globalToolbarSlotContext = useMemo(
    () => ({
      companyId: selectedCompanyId ?? null,
      companyPrefix: selectedCompany?.issuePrefix ?? null,
    }),
    [selectedCompanyId, selectedCompany?.issuePrefix],
  );

  const globalToolbarSlots = (
    <GlobalToolbar
      context={globalToolbarSlotContext}
      pageToolbar={isMobile ? null : breadcrumbToolbar}
    />
  );

  if (isMobile && mobileToolbar) {
    return (
      <div className="h-(--sz-60px) shrink-0 flex items-center border-b border-border px-2">
        {mobileToolbar}
      </div>
    );
  }

  if (breadcrumbs.length === 0) {
    return (
      <div className="h-(--sz-60px) shrink-0 flex items-center justify-end border-b border-border px-4 md:px-6">
        {globalToolbarSlots}
      </div>
    );
  }

  const menuButton = isMobile && (
    <Button
      variant="ghost"
      size="icon-sm"
      className="mr-2 shrink-0"
      onClick={toggleSidebar}
      aria-label="Open sidebar"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );

  const currentCrumb = breadcrumbs[breadcrumbs.length - 1];
  if (isMobile && breadcrumbs[0]?.label === "Tasks" && currentCrumb.identifier) {
    return (
      <div className="h-(--sz-60px) shrink-0 flex items-center border-b border-border px-4">
        {menuButton}
        <h1 className="flex min-w-0 flex-1 items-baseline gap-1.5 text-sm">
          {currentCrumb.leading ? (
            <span className="flex shrink-0 items-center self-center">{currentCrumb.leading}</span>
          ) : null}
          <span className="min-w-0 truncate" title={currentCrumb.label}>{currentCrumb.label}</span>
          <CrumbIdentifier identifier={currentCrumb.identifier} />
        </h1>
        {globalToolbarSlots}
      </div>
    );
  }

  const breadcrumbTrail = (
    <div className="min-w-0 overflow-hidden flex-1">
      <Breadcrumb className="min-w-0 overflow-hidden">
        <BreadcrumbList className="flex-nowrap">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1;
            return (
              <Fragment key={i}>
                {i > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem className={isLast ? "min-w-0" : "shrink-0"}>
                  {isLast || !crumb.href ? (
                    crumb.leading || crumb.identifier ? (
                      <BreadcrumbPage className={cn("flex min-w-0 gap-1.5", crumb.trailing ? "items-center" : "items-baseline")}>
                        {crumb.leading && (
                          <span className="flex shrink-0 items-center self-center">{crumb.leading}</span>
                        )}
                        {!taskDetailLayout ? <CrumbIdentifier identifier={crumb.identifier} /> : null}
                        <span className="min-w-0 truncate">{crumb.label}</span>
                        {taskDetailLayout && isLast ? <CrumbIdentifier identifier={crumb.identifier} /> : null}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                    )
                  ) : (
                    <BreadcrumbLink asChild>
                      {crumb.leading || crumb.identifier ? (
                        <Link
                          to={crumb.href} onClick={crumb.onClick}
                          className={cn(
                            "flex min-w-0 items-baseline gap-1.5",
                            i === 0 && "font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {crumb.leading && (
                            <span className="flex shrink-0 items-center self-center">{crumb.leading}</span>
                          )}
                          {!taskDetailLayout ? <CrumbIdentifier identifier={crumb.identifier} /> : null}
                          <span className="min-w-0 truncate">{crumb.label}</span>
                          {taskDetailLayout && isLast ? <CrumbIdentifier identifier={crumb.identifier} /> : null}
                        </Link>
                      ) : (
                        <Link
                          to={crumb.href} onClick={crumb.onClick}
                          className={cn(
                            "min-w-0 truncate",
                            i === 0 && "font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {crumb.label}
                        </Link>
                      )}
                    </BreadcrumbLink>
                  )}
                  {crumb.trailing && <span className="flex shrink-0 items-center">{crumb.trailing}</span>}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );

  // Task details use the same breadcrumb typography even with one item.
  // Other single-crumb pages keep their existing page-title presentation.
  if (breadcrumbs.length === 1 && !taskDetailLayout) {
    return (
      <div className="h-(--sz-60px) shrink-0 flex items-center border-b border-border px-4 md:px-6">
        {menuButton}
        <div className="min-w-0 overflow-hidden flex-1">
          {breadcrumbs[0].leading || breadcrumbs[0].identifier ? (
            <h1 className="flex items-baseline gap-1.5 text-sm font-semibold uppercase tracking-wider">
              {breadcrumbs[0].leading && (
                <span className="flex shrink-0 items-center self-center">{breadcrumbs[0].leading}</span>
              )}
              <CrumbIdentifier identifier={breadcrumbs[0].identifier} />
              <span className="truncate">{breadcrumbs[0].label}</span>
            </h1>
          ) : (
            <h1 className="text-sm font-semibold uppercase tracking-wider truncate">
              {breadcrumbs[0].label}
            </h1>
          )}
        </div>
        {globalToolbarSlots}
        {dslnRightActions}
      </div>
    );
  }

  // Multiple breadcrumbs = breadcrumb trail
  return (
    <div
      className={cn(
        "relative h-(--sz-60px) shrink-0 flex items-center border-b border-border",
        "px-4 md:px-6",
      )}
    >
      {menuButton}
      {breadcrumbTrail}
      {globalToolbarSlots}
      {dslnRightActions}
      {taskDetailLayout ? (
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-5 size-9 shrink-0 text-muted-foreground"
          onClick={toggleTaskPanel}
          aria-label={taskPanelOpen ? "Hide properties" : "Show properties"}
          title={taskPanelOpen ? "Hide properties" : "Show properties"}
        >
          {taskPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
      ) : null}
    </div>
  );
}
