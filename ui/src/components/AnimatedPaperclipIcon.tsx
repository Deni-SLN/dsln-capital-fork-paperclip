import type { SVGProps } from "react";
import { cn } from "../lib/utils";

export function AnimatedPaperclipIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("shrink-0 text-amber-500 animate-pulse", className)}
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="14" width="3.5" height="8" rx="0.75" />
      <rect x="7.5" y="10" width="3.5" height="12" rx="0.75" />
      <rect x="13" y="6" width="3.5" height="16" rx="0.75" />
      <rect x="18.5" y="2" width="3.5" height="20" rx="0.75" />
    </svg>
  );
}

/** Full-page loading state: a centered, amber animated DSLN logo. */
export function PaperclipLoading({ className }: { className?: string }) {
  return (
    <div
      role="status"
      className={cn("flex min-h-dvh w-full items-center justify-center", className)}
    >
      <AnimatedPaperclipIcon className="h-16 w-16" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
