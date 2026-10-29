import type { ReactNode } from "react";
import type { CostByAgent } from "@paperclipai/shared";
import { formatCents } from "../lib/utils";
import { CostEstimateLabel } from "./CostEstimateLabel";
import { Badge } from "./ui/badge";
import { getCachedExchangeRate, formatIdr } from "../lib/exchange-rate";

export function CostAmount({
  costCents,
  eventCount,
  estimatedEventCount,
  unpricedEventCount,
  showUnavailableCount = false,
  suffix,
  showIdr = false,
  rate,
}: Pick<CostByAgent, "costCents"> & Partial<Pick<CostByAgent, "eventCount" | "estimatedEventCount">> & {
  unpricedEventCount?: number;
  showUnavailableCount?: boolean;
  suffix?: ReactNode;
  showIdr?: boolean;
  rate?: number;
}) {
  const currentRate = rate ?? getCachedExchangeRate();
  const entirelyUnpriced = costCents === 0 && (eventCount ?? 0) > 0 && unpricedEventCount === eventCount;
  return (
    <div className="flex flex-col items-end gap-1 text-right">
      <div className="whitespace-nowrap font-mono font-medium tabular-nums">
        {entirelyUnpriced ? "—" : formatCents(costCents)}
        {suffix}
      </div>
      {showIdr && !entirelyUnpriced && (
        <span className="text-xs text-emerald-500 font-mono">≈ {formatIdr(costCents, currentRate)}</span>
      )}
      <CostEstimateLabel eventCount={eventCount} estimatedEventCount={estimatedEventCount} />
      {showUnavailableCount && !!unpricedEventCount && <Badge variant="outline" className="font-normal text-muted-foreground">
        {unpricedEventCount} {unpricedEventCount === 1 ? "cost" : "costs"} unavailable
      </Badge>}
    </div>
  );
}
