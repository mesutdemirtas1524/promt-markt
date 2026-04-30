"use client";

import {
  useCallback,
  useImperativeHandle,
  useRef,
  forwardRef,
  useState,
  useEffect,
} from "react";
import { Textarea } from "./ui/textarea";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  className?: string;
  id?: string;
};

export type HighlightablePromptInputHandle = {
  focus: () => void;
};

type EditorState = {
  start: number;
  end: number;
  /** The text the user originally selected — kept so we can show it in the
   *  form preview and decide what to do on cancel. */
  selected: string;
  label: string;
  /** Confirmed tags. The "currently typing" text lives separately in
   *  optionDraft so adding a tag doesn't churn this list on every keystroke. */
  options: string[];
  optionDraft: string;
};

/** Strip the wrapping {{ }} markers if the selection is already a
 *  placeholder, so re-triggering on a placeholder unwraps it. */
function stripBraces(s: string): string | null {
  if (s.startsWith("{{") && s.endsWith("}}") && s.length >= 4) {
    return s.slice(2, -2);
  }
  return null;
}

/** Split a `label|opt1,opt2` payload into its two parts. */
function splitPayload(payload: string): { label: string; options: string } {
  const idx = payload.indexOf("|");
  if (idx === -1) return { label: payload, options: "" };
  return { label: payload.slice(0, idx), options: payload.slice(idx + 1) };
}

/**
 * A textarea + toolbar that lets a creator turn a selected piece of text
 * into a `{{label|opt1,opt2}}` placeholder. The buyer side renders these
 * as a dropdown (when options are provided) or a free-text input.
 *
 * Storage syntax:
 *   - `{{label}}`              → free-text (any value the buyer types)
 *   - `{{label|a,b,c}}`        → dropdown with options a, b, c
 */
export const HighlightablePromptInput = forwardRef<HighlightablePromptInputHandle, Props>(
  function HighlightablePromptInput(
    { value, onChange, maxLength, rows = 8, placeholder, className, id },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [editor, setEditor] = useState<EditorState | null>(null);
    const labelRef = useRef<HTMLInputElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    const placeholderCount = (value.match(/\{\{[^{}]+?\}\}/g) ?? []).length;

    // Focus the label only when the editor opens (transition from null →
    // non-null), not on every keystroke that updates editor state.
    const editorOpen = editor !== null;
    useEffect(() => {
      if (editorOpen) labelRef.current?.focus();
    }, [editorOpen]);

    const beginHighlight = useCallback(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { selectionStart, selectionEnd } = ta;
      if (selectionStart === selectionEnd) return;

      const selected = value.slice(selectionStart, selectionEnd);

      // Toggle: if the selection is already a placeholder, unwrap it.
      const stripped = stripBraces(selected);
      if (stripped !== null) {
        // Just unwrap — re-show the human-friendly part (label).
        const { label } = splitPayload(stripped);
        const next = value.slice(0, selectionStart) + label + value.slice(selectionEnd);
        onChange(next);
        requestAnimationFrame(() => {
          ta.focus();
          ta.setSelectionRange(selectionStart, selectionStart + label.length);
        });
        return;
      }

      // Otherwise open the inline editor seeded with the selected text.
      setEditor({
        start: selectionStart,
        end: selectionEnd,
        selected,
        label: selected,
        options: [],
        optionDraft: "",
      });
    }, [value, onChange]);

    const cancelEditor = useCallback(() => setEditor(null), []);

    const insertPlaceholder = useCallback(() => {
      if (!editor) return;
      const ta = textareaRef.current;
      const trimmedLabel = editor.label.trim();
      if (!trimmedLabel) return; // require a label

      // Tags from the confirmed list, plus any draft text the user typed
      // but hasn't pressed Enter on yet (so they don't lose it on Insert).
      const draft = editor.optionDraft.trim();
      const seen = new Set<string>();
      const cleanedOpts: string[] = [];
      for (const raw of [...editor.options, ...(draft ? [draft] : [])]) {
        const v = raw.trim();
        if (!v || seen.has(v)) continue;
        seen.add(v);
        cleanedOpts.push(v);
      }
      // Disallow `|`, `,` and `}}` in label/option content to keep the
      // syntax unambiguous. Substitute with similar-looking chars.
      const safe = (s: string) =>
        s.replace(/\|/g, "/").replace(/,/g, " ").replace(/\}\}/g, "}");
      const safeLabel = safe(trimmedLabel);
      const safeOpts = cleanedOpts.map(safe);

      const payload = safeOpts.length ? `${safeLabel}|${safeOpts.join(",")}` : safeLabel;
      const inserted = `{{${payload}}}`;

      const next = value.slice(0, editor.start) + inserted + value.slice(editor.end);
      onChange(next);
      setEditor(null);

      // Move caret to just after the inserted token.
      const caret = editor.start + inserted.length;
      requestAnimationFrame(() => {
        ta?.focus();
        ta?.setSelectionRange(caret, caret);
      });
    }, [editor, value, onChange]);

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
          e.preventDefault();
          beginHighlight();
        }
      },
      [beginHighlight]
    );

    return (
      <div className="overflow-hidden rounded-lg border border-input bg-tint-1 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/40">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-tint-1 px-2 py-1.5">
          <button
            type="button"
            onClick={beginHighlight}
            onMouseDown={(e) => e.preventDefault() /* don't lose selection */}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-400/30 bg-violet-500/10 px-2.5 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-500/15 active:scale-[0.97]"
            )}
            title="Turn the selected text into a customizable placeholder. Shortcut: Ctrl+H / ⌘H."
          >
            <Sparkles className="h-3 w-3" />
            Highlight
          </button>
          <span className="text-[10px] text-muted-foreground/80">
            Select text in the box →{" "}
            <kbd className="rounded border border-border bg-tint-2 px-1 py-px font-mono text-[10px]">
              Ctrl
            </kbd>
            <kbd className="ml-1 rounded border border-border bg-tint-2 px-1 py-px font-mono text-[10px]">
              H
            </kbd>
          </span>
        </div>

        {/* Inline editor — shows when the creator has triggered highlight
            on a real selection. Lets them name the placeholder and add
            optional preset options that buyers will pick from. */}
        {editor && (
          <div className="border-b border-border bg-tint-1 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-[10.5px] font-medium uppercase tracking-wider text-violet-300">
                <Sparkles className="-mt-0.5 mr-1 inline h-3 w-3" />
                Customizable placeholder
              </div>
              <button
                type="button"
                onClick={cancelEditor}
                className="rounded-md p-1 text-muted-foreground hover:bg-tint-2 hover:text-foreground"
                aria-label="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {editor.selected && (
              <div className="mb-2 line-clamp-1 text-[11px] text-muted-foreground">
                Replacing:{" "}
                <span className="font-mono text-foreground">&quot;{editor.selected}&quot;</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr]">
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Label
                </label>
                <input
                  ref={labelRef}
                  type="text"
                  value={editor.label}
                  onChange={(e) =>
                    setEditor((prev) => (prev ? { ...prev, label: e.target.value } : prev))
                  }
                  placeholder="e.g. gender, color"
                  className="h-8 w-full rounded-md border border-input bg-tint-2 px-2 text-sm focus-visible:border-foreground/30 focus-visible:bg-tint-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Options{" "}
                  <span className="text-muted-foreground/60">
                    (type a value and press Enter; leave empty for free text)
                  </span>
                </label>
                <div className="flex min-h-8 flex-wrap items-center gap-1 rounded-md border border-input bg-tint-2 px-1.5 py-1 focus-within:border-foreground/30 focus-within:bg-tint-3 focus-within:ring-2 focus-within:ring-ring/40">
                  {editor.options.map((opt, i) => (
                    <span
                      key={`${opt}-${i}`}
                      className="inline-flex items-center gap-1 rounded-md border border-violet-400/30 bg-violet-500/15 px-1.5 py-0.5 text-[12px] text-violet-200"
                    >
                      {opt}
                      <button
                        type="button"
                        onClick={() =>
                          setEditor((prev) =>
                            prev
                              ? { ...prev, options: prev.options.filter((_, j) => j !== i) }
                              : prev
                          )
                        }
                        className="rounded p-0.5 hover:bg-violet-500/25"
                        aria-label={`Remove ${opt}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={editor.optionDraft}
                    onChange={(e) =>
                      setEditor((prev) =>
                        prev ? { ...prev, optionDraft: e.target.value } : prev
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const v = editor.optionDraft.trim();
                        if (!v) return;
                        setEditor((prev) =>
                          prev && !prev.options.includes(v)
                            ? { ...prev, options: [...prev.options, v], optionDraft: "" }
                            : prev
                            ? { ...prev, optionDraft: "" }
                            : prev
                        );
                      } else if (
                        e.key === "Backspace" &&
                        editor.optionDraft === "" &&
                        editor.options.length > 0
                      ) {
                        // Backspace on empty draft pops the last tag —
                        // standard tag-input behavior.
                        setEditor((prev) =>
                          prev ? { ...prev, options: prev.options.slice(0, -1) } : prev
                        );
                      }
                    }}
                    placeholder={editor.options.length === 0 ? "e.g. man" : "Add another…"}
                    className="min-w-[80px] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={cancelEditor}
                className="inline-flex h-7 items-center rounded-md border border-border bg-tint-2 px-2.5 text-[11px] hover:bg-tint-3"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={insertPlaceholder}
                disabled={!editor.label.trim()}
                className="inline-flex h-7 items-center gap-1 rounded-md border border-violet-400/30 bg-violet-500/15 px-2.5 text-[11px] font-medium text-violet-200 hover:bg-violet-500/25 disabled:opacity-50"
              >
                <Sparkles className="h-3 w-3" />
                Insert
              </button>
            </div>
          </div>
        )}

        <Textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          className={cn(
            "border-0 bg-transparent font-prompt text-[14px] leading-relaxed focus-visible:border-0 focus-visible:bg-transparent focus-visible:ring-0",
            className
          )}
        />

        {placeholderCount > 0 && (
          <div className="border-t border-border bg-tint-1 px-3 py-1.5 text-[10.5px] text-violet-300/90">
            <Sparkles className="-mt-0.5 mr-1 inline h-3 w-3" />
            {placeholderCount} customizable{" "}
            {placeholderCount === 1 ? "placeholder" : "placeholders"} — buyers will see{" "}
            {placeholderCount === 1 ? "it" : "them"} as inputs or dropdowns.
          </div>
        )}
      </div>
    );
  }
);
