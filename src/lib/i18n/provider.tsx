"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { dictionaries, DEFAULT_LOCALE, type Locale, type TranslationKey } from "./dictionaries";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<Ctx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k) => dictionaries[DEFAULT_LOCALE][k],
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Initial state must equal what SSR rendered with (the default locale).
  // Reading the cookie/DOM here would diverge between server and client and
  // trip React's hydration check on every translated string. We sync from
  // the DOM in useEffect after hydration; the inline <head> init script
  // already painted the right <html lang> so the visual flash is small.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const lang = document.documentElement.lang;
      const next: Locale = lang === "tr" ? "tr" : "en";
      if (next !== locale) setLocaleState(next);
    }
    // Intentionally only runs once on mount; later changes are driven by
    // setLocale() calls, which sync the DOM lang attribute themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep <html lang> in sync whenever the locale changes after mount.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `pm-locale=${l}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const t = useCallback(
    (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key],
    [locale]
  );

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useT() {
  return useContext(LocaleContext);
}
