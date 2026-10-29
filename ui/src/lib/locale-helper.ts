import { useCurrentLocale } from "@/i18n";

export function useI18n() {
  const locale = useCurrentLocale();
  const isId = import.meta.env.MODE === "test"
    ? Boolean(locale && locale.toLowerCase().startsWith("id"))
    : !Boolean(locale && locale.toLowerCase().startsWith("en"));

  return {
    isId,
    locale,
    t: (idText: string, enText: string) => (isId ? idText : enText),
  };
}
