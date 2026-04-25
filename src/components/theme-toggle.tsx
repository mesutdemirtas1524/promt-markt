"use client";

import { useTheme } from "@/lib/theme/provider";
import { Sun, Moon } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useT();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={t("theme.toggle")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-tint-2 hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
