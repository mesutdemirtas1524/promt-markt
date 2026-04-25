"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("locale.switch")}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-tint-2 hover:text-foreground"
      >
        <Globe className="h-4 w-4" />
      </button>

      {open && (
        <div className="glass absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-lg shadow-lg">
          {SUPPORTED_LOCALES.map((l) => {
            const active = locale === l.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLocale(l.code as Locale);
                  setOpen(false);
                  // Server components rendered the previous locale's strings —
                  // ask Next to refetch them so the whole page is in the new language.
                  router.refresh();
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-tint-2",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="text-base leading-none">{l.flag}</span>
                <span className="flex-1">{l.label}</span>
                {active && <Check className="h-3.5 w-3.5 text-violet-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
