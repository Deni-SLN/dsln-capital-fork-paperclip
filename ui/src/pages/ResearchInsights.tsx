import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useBreadcrumbs } from "../context/BreadcrumbContext";

export function ResearchInsights() {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Pusat Komando", href: "/dashboard" },
      { label: "Riset & Analisis", href: "/research-insights" },
    ]);
  }, [setBreadcrumbs]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Riset & Analisis Pasar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Modul ini merupakan bagian dari DSLN Capital Command Center. Integrasi analitik riset dan sentimen pasar saat ini menunggu koneksi sumber data terverifikasi.
        </p>
        <p className="mt-4 text-xs font-semibold text-amber-500 uppercase tracking-wider">Status: Siap diintegrasikan</p>
      </Card>
    </div>
  );
}

export default ResearchInsights;
