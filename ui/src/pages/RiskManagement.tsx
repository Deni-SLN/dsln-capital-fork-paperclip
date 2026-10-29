import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useBreadcrumbs } from "../context/BreadcrumbContext";

export function RiskManagement() {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Pusat Komando", href: "/dashboard" },
      { label: "Manajemen Risiko", href: "/risk-management" },
    ]);
  }, [setBreadcrumbs]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Manajemen Risiko Portofolio</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Modul ini memantau ambang batas eksposur risiko aset dan batas anggaran eksekusi agen. Metrik pengawasan risiko sedang disiapkan untuk integrasi langsung.
        </p>
        <p className="mt-4 text-xs font-semibold text-amber-500 uppercase tracking-wider">Status: Siap diintegrasikan</p>
      </Card>
    </div>
  );
}

export default RiskManagement;
