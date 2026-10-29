import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useBreadcrumbs } from "../context/BreadcrumbContext";

export function TradingOperations() {
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([
      { label: "Pusat Komando", href: "/dashboard" },
      { label: "Operasi Trading", href: "/trading-operations" },
    ]);
  }, [setBreadcrumbs]);

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Operasi Perdagangan & Eksekusi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Modul ini mengorkestrasi eksekusi sinyal trading kuantitatif untuk saham dan aset digital. Jalur eksekusi broker dan bursa sedang disiapkan untuk koneksi aman.
        </p>
        <p className="mt-4 text-xs font-semibold text-amber-500 uppercase tracking-wider">Status: Siap diintegrasikan</p>
      </Card>
    </div>
  );
}

export default TradingOperations;
