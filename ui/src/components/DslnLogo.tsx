import { cn } from "@/lib/utils";

interface DslnLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  subtitle?: string;
}

export function DslnLogo({
  className = "size-6",
  showText = false,
  textClassName,
  subtitle,
}: DslnLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("shrink-0 text-amber-500", className)}
      >
        <rect x="2" y="14" width="3.5" height="8" rx="0.75" />
        <rect x="7.5" y="10" width="3.5" height="12" rx="0.75" />
        <rect x="13" y="6" width="3.5" height="16" rx="0.75" />
        <rect x="18.5" y="2" width="3.5" height="20" rx="0.75" />
      </svg>
      {showText && (
        <div className={cn("flex flex-col select-none", textClassName)}>
          <span className="font-bold tracking-wider text-sm leading-tight text-foreground">
            DSLN CAPITAL
          </span>
          {subtitle && (
            <span className="text-xs text-muted-foreground leading-tight">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
