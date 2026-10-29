import i18n, { type InitOptions, type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { DEFAULT_LOCALE, i18nextResources, supportedLocales } from "./locales";

function resolveInitialLocale(): string {
  if (import.meta.env.MODE === "test") {
    return DEFAULT_LOCALE;
  }

  try {
    const stored = window.localStorage.getItem("paperclip.locale");
    if (stored && supportedLocales.includes(stored)) return stored;
  } catch {
    // Ignore storage access failures.
  }

  return "id";
}

const i18nextOptions: InitOptions = {
  resources: i18nextResources,
  lng: resolveInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: supportedLocales,
  defaultNS: "translation",
  interpolation: { escapeValue: false },
  returnObjects: false,
  initAsync: false,
};

void i18n.use(initReactI18next).init(i18nextOptions).catch((error: unknown) => {
  console.error("Failed to initialize i18next", error);
});

export function setLocale(locale: string) {
  if (!supportedLocales.includes(locale)) return;
  try {
    window.localStorage.setItem("paperclip.locale", locale);
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = locale;
    }
  } catch {
    // Ignore storage access failures.
  }
  void i18n.changeLanguage(locale);
}

export function useCurrentLocale(): string {
  const { i18n: instance } = useReactI18nextTranslation();
  return instance.resolvedLanguage ?? instance.language ?? DEFAULT_LOCALE;
}

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n };
