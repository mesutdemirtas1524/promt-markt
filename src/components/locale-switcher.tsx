"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "@/lib/i18n/provider";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/dictionaries";
import { Globe, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // SSR-safe portal mount
  useEffect(() => setMounted(true), []);

  // Position the menu under the trigger when it opens
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // pointerdown fires before click and is more robust than mousedown
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(code: Locale) {
    setLocale(code);
    setOpen(false);
    window.location.reload();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("locale.switch")}
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-tint-2 hover:text-foreground"
      >
        <Globe className="h-4 w-4" />
      </button>

      {mounted && open && pos &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              zIndex: 9999,
            }}
            className="w-44 overflow-hidden rounded-lg border border-border bg-card shadow-2xl"
          >
            {SUPPORTED_LOCALES.map((l) => {
              const active = locale === l.code;
              return (
                <button
                  key={l.code}
                  type="button"
                  role="menuitem"
                  onClick={() => pick(l.code as Locale)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-tint-2",
                    active ? "font-medium text-foreground" : "text-foreground/85"
                  )}
                >
                  <span className="text-base leading-none">{l.flag}</span>
                  <span className="flex-1">{l.label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-violet-400" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}
