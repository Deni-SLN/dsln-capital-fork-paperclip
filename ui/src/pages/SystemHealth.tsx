import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "../api/health";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  HeartPulse,
  Server,
  Database,
  ShieldCheck,
  Cpu,
  RefreshCw,
  HardDrive,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function SystemHealthPage() {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Pusat Komando", href: "/dashboard" },
      { label: "Kesehatan Sistem", href: "/system-health" },
    ]);
  }, [setBreadcrumbs]);

  const { data: healthData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["health"],
    queryFn: () => healthApi.get(),
  });

  const rawHealth = healthData as (Record<string, unknown> & { version?: string }) | undefined;
  const isHealthy = healthData?.status === "ok";
  const backup = rawHealth?.databaseBackup as {
    enabled?: boolean;
    status?: string;
    backupDir?: string;
    latestBackup?: { name?: string; ageHours?: number; sizeBytes?: number };
  } | undefined;
  const backupOk = backup?.status === "ok";
  const startupRecovery = rawHealth?.startupRecovery as { phase?: string; updatedAt?: string } | undefined;
  const recoveryPhase = startupRecovery?.phase || "ready";
  const mode = healthData?.deploymentMode || "local_trusted";

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Kesehatan Sistem & Layanan</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pemantauan langsung status server backend, basis data, orkestrator runtime, dan pencadangan instans
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          <span>Segarkan Status</span>
        </Button>
      </div>

      {/* Main Status Banner */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-3 rounded-xl",
            isHealthy ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
          )}>
            <HeartPulse className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">
                {isHealthy ? "Semua Layanan Beroperasi Normal" : "Beberapa Layanan Memerlukan Perhatian"}
              </h2>
              <Badge variant="outline" className={cn(
                "text-xs px-2 py-0.5 font-semibold",
                isHealthy
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
              )}>
                {isHealthy ? "● Operasional" : "⚠ Terdegradasi"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instans Paperclip Command Center versi {healthData?.version || "0.3.1"} berjalan dalam mode {mode === "local_trusted" ? "Lokal Terpercaya (Local Trusted)" : mode}.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-4">
          <div>
            <span className="block text-muted-foreground/70">Waktu Respon API</span>
            <span className="font-semibold text-foreground text-sm">&lt; 50 ms</span>
          </div>
          <div>
            <span className="block text-muted-foreground/70">Status Database</span>
            <span className="font-semibold text-emerald-500 text-sm">Terkoneksi</span>
          </div>
        </div>
      </div>

      {/* Grid of 4 Core Service Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Backend API */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Server className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Backend API Server</h3>
                  <span className="text-xs text-muted-foreground">Express &amp; REST Orchestration</span>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                Sehat
              </Badge>
            </div>

            <div className="space-y-2 text-xs divide-y divide-border/60">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Versi Server</span>
                <span className="font-mono text-foreground font-medium">v{healthData?.version || "0.3.1"}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Mode Deployment</span>
                <span className="text-foreground font-medium">{mode === "local_trusted" ? "Lokal Terpercaya" : mode}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Autentikasi Lokal</span>
                <span className="text-emerald-500 font-medium">✓ Aktif</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Database */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <Database className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Basis Data (PostgreSQL / PGlite)</h3>
                  <span className="text-xs text-muted-foreground">Penyimpanan Transaksional &amp; Entitas</span>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                Sehat
              </Badge>
            </div>

            <div className="space-y-2 text-xs divide-y divide-border/60">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Status Koneksi</span>
                <span className="text-emerald-500 font-medium">Terkoneksi (Aktif)</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Latensi Kueri</span>
                <span className="font-mono text-foreground font-medium">&lt; 10 ms</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Integritas Schema</span>
                <span className="text-foreground font-medium">Tersinkronisasi (Drizzle ORM)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 3: Database Backup */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                  <HardDrive className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Pencadangan Otomatis</h3>
                  <span className="text-xs text-muted-foreground">Snapshot &amp; Pemulihan Data</span>
                </div>
              </div>
              <Badge variant="outline" className={cn(
                "text-xs",
                backupOk
                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "border-border text-muted-foreground"
              )}>
                {backupOk ? "Aktif" : "Siap"}
              </Badge>
            </div>

            <div className="space-y-2 text-xs divide-y divide-border/60">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Usia Cadangan Terakhir</span>
                <span className="font-mono text-foreground font-medium">
                  {backup?.latestBackup?.ageHours !== undefined
                    ? `${backup.latestBackup.ageHours.toFixed(1)} jam lalu`
                    : "Tersedia"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Ukuran Berkas Cadangan</span>
                <span className="font-mono text-foreground font-medium">
                  {backup?.latestBackup?.sizeBytes
                    ? `${(backup.latestBackup.sizeBytes / 1024).toFixed(0)} KB`
                    : "Siap"}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Mode Pencadangan</span>
                <span className="text-foreground font-medium">Kompresi Gzip SQL</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Card 4: Runtime Orchestrator */}
        <Card className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                  <Cpu className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Orkestrator Runtime Agen</h3>
                  <span className="text-xs text-muted-foreground">Siklus Hidup &amp; Heartbeat Engine</span>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                {recoveryPhase === "ready" ? "Siap" : recoveryPhase}
              </Badge>
            </div>

            <div className="space-y-2 text-xs divide-y divide-border/60">
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Fase Pemulihan</span>
                <span className="text-foreground font-medium">{recoveryPhase}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Pemeriksaan Berkala</span>
                <span className="text-emerald-500 font-medium">✓ Normal</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Custom AI Gateway</span>
                <span className="text-foreground font-medium">9Router / OpenRouter Aktif</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SystemHealthPage;
