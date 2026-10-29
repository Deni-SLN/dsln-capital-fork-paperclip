import { Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setLocale, useCurrentLocale, useTranslation } from "@/i18n";

type LanguageToggleVariant = "icon" | "menu-action" | "compact-menu-action";

interface LanguageToggleProps {
  className?: string;
  variant?: LanguageToggleVariant;
  onAfterToggle?: () => void;
}

export function LanguageToggle({ className, variant = "compact-menu-action", onAfterToggle }: LanguageToggleProps) {
  const { t } = useTranslation();
  const currentLocale = useCurrentLocale();
  const isIndonesian = currentLocale.toLowerCase().startsWith("id");
  const nextLocale = isIndonesian ? "en" : "id";

  const label = isIndonesian ? "English" : "Bahasa Indonesia";
  const actionLabel = isIndonesian ? "Ganti ke English" : "Ubah ke Bahasa Indonesia";

  function handleClick() {
    setLocale(nextLocale);
    onAfterToggle?.();
  }

  if (variant === "compact-menu-action") {
    return (
      <button
        type="button"
        className={cn(
          "flex h-(--profile-popover-row-height) w-full items-center gap-(--profile-popover-row-gap) rounded-lg px-2.5 text-left text-(length:--text-compact) font-medium leading-(--profile-popover-label-line-height) text-foreground transition-colors hover:bg-accent",
          className,
        )}
        onClick={handleClick}
        aria-label={actionLabel}
        title={actionLabel}
      >
        <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
          <Globe className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">
          {t("account.language", { defaultValue: "Language" })}: {label}
        </span>
      </button>
    );
  }

  if (variant === "menu-action") {
    return (
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/60",
          className,
        )}
        onClick={handleClick}
        aria-label={actionLabel}
      >
        <span className="mt-0.5 rounded-lg border border-border bg-background/70 p-2 text-muted-foreground">
          <Globe className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            {t("account.language", { defaultValue: "Language" })}: {label}
          </span>
          <span className="block text-xs text-muted-foreground">{actionLabel}</span>
        </span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      aria-label={actionLabel}
      title={actionLabel}
      className={cn("text-muted-foreground", className)}
    >
      <Globe />
    </Button>
  );
}
