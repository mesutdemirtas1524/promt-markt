"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, RotateCcw, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const PLACEHOLDER_RE = /\{\{([^{}]+?)\}\}/g;

type Segment =
  | { kind: "text"; value: string }
  | { kind: "var"; key: string; label: string; options: string[] | null };

type VarDef = {
  key: string;
  label: string;
  options: string[] | null;
};

/** Split prompt text into literal segments and {{label|options}} segments,
 *  plus a deduped list of variable definitions in source order.
 *
 *  Storage syntax:
 *    {{label}}              → free-text input
 *    {{label|opt1,opt2,…}}  → dropdown with the given options
 *
 *  Variables are keyed by their full payload (label + options) so two
 *  placeholders that look identical share the same input, but a label
 *  reused with different options would be treated as separate fields. */
function parse(text: string): { segments: Segment[]; vars: VarDef[] } {
  const segments: Segment[] = [];
  const seen = new Set<string>();
  const vars: VarDef[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((m = PLACEHOLDER_RE.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ kind: "text", value: text.slice(last, m.index) });
    }
    const payload = m[1].trim();
    const pipeIdx = payload.indexOf("|");
    const label = (pipeIdx === -1 ? payload : payload.slice(0, pipeIdx)).trim();
    const options =
      pipeIdx === -1
        ? null
        : payload
            .slice(pipeIdx + 1)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    const key = options ? `${label}|${(options ?? []).join(",")}` : label;

    segments.push({ kind: "var", key, label, options });
    if (!seen.has(key)) {
      seen.add(key);
      vars.push({ key, label, options });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: "text", value: text.slice(last) });
  }
  return { segments, vars };
}

function humanize(name: string): string {
  return name.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Interactive prompt customizer. For prompts that contain
 * `{{label|opt1,opt2}}` tokens, render a select per dropdown variable
 * and a text input per free-text variable, plus a live preview and a
 * Copy button.
 */
export function PromptCustomizer({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const { t } = useT();
  const { segments, vars } = useMemo(() => parse(text), [text]);
  const [values, setValues] = useState<Record<string, string>>({});

  const filled = segments
    .map((s) => {
      if (s.kind === "text") return s.value;
      const v = values[s.key]?.trim();
      // No value chosen → keep the original {{label}} (label only, no
      // options) so the buyer's pasted prompt still flags any unfilled
      // bits clearly.
      return v ? v : `{{${s.label}}}`;
    })
    .join("");

  const allFilled = vars.length > 0 && vars.every((v) => values[v.key]?.trim());

  function copy() {
    navigator.clipboard.writeText(filled);
    toast.success(t("detail.copied"));
  }

  function reset() {
    setValues({});
  }

  const placeholderTpl = t("detail.customize.placeholder");

  return (
    <div className={cn("space-y-3.5", className)}>
      {/* Inputs */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-wider text-violet-300">
            <Sparkles className="h-3 w-3" />
            {t("detail.customize.title")}
          </div>
          {Object.values(values).some((v) => v?.trim()) && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" />
              {t("detail.customize.reset")}
            </button>
          )}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">
          {t("detail.customize.hint")}
        </p>
        <div className="space-y-3">
          {vars.map((v) => {
            const labelText = humanize(v.label);
            const hasOptions = v.options !== null && v.options.length > 0;
            const current = values[v.key] ?? "";
            return (
              <div key={v.key}>
                <label
                  className="mb-1.5 block truncate text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground"
                  title={labelText}
                >
                  {labelText}
                </label>
                {hasOptions ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(v.options ?? []).map((opt) => {
                      const active = current === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setValues((prev) => ({
                              ...prev,
                              [v.key]: active ? "" : opt,
                            }))
                          }
                          className={cn(
                            "inline-flex h-8 items-center rounded-full border px-3 text-[12.5px] font-medium tracking-tight transition-colors",
                            active
                              ? "border-violet-400/40 bg-violet-500/20 text-violet-100"
                              : "border-border bg-tint-1 text-foreground hover:bg-tint-2"
                          )}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={current}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [v.key]: e.target.value }))
                    }
                    placeholder={placeholderTpl.replace("{label}", labelText)}
                    className="h-9 w-full rounded-md border border-input bg-tint-2 px-3 text-sm focus-visible:border-foreground/30 focus-visible:bg-tint-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live preview + copy */}
      <div className="rounded-lg border border-border bg-tint-2/60 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.customize.preview")}
          </span>
          <button
            type="button"
            onClick={copy}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
              allFilled
                ? "border-violet-400/30 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25"
                : "border-border bg-tint-1 text-foreground hover:bg-tint-3"
            )}
          >
            <Copy className="h-3 w-3" />
            {allFilled
              ? t("detail.customize.copyFilled")
              : t("detail.customize.copyOriginal")}
          </button>
        </div>
        <pre className="font-prompt whitespace-pre-wrap break-words text-[13px] leading-relaxed text-foreground">
          {segments.map((s, i) => {
            if (s.kind === "text") return <span key={i}>{s.value}</span>;
            const v = values[s.key]?.trim();
            return v ? (
              <span key={i} className="text-foreground">
                {v}
              </span>
            ) : (
              <span key={i} className="prompt-placeholder">
                {s.label}
              </span>
            );
          })}
        </pre>
      </div>
    </div>
  );
}
