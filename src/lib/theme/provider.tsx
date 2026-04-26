"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<Ctx>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initial state must equal what SSR rendered with (dark) so any text or
  // markup that depends on `theme` doesn't drift on hydration. The DOM
  // class is already correct because of the inline init script in <head>;
  // we re-sync the React state in a useEffect after mount so consumers
  // observe the user's actual preference.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      const next: Theme = isDark ? "dark" : "light";
      if (next !== theme) setThemeState(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.cookie = `pm-theme=${t}; path=/; max-age=31536000; SameSite=Lax`;
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.cookie = `pm-theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
