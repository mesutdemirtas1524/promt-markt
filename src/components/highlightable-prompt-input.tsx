"use client";

import { useCallback, useImperativeHandle, useRef, forwardRef } from "react";
import { Textarea } from "./ui/textarea";
import { Sparkles } from "lucide-react";
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

/**
 * A textarea + toolbar that lets a creator wrap a selected piece of text
 * in `{{...}}` markers (which the buyer side renders as a "customize me"
 * placeholder). The marker syntax is an internal storage detail — the
 * creator just selects and clicks a button (or presses Ctrl/Cmd+H).
 *
 * Repeat-click on an already-wrapped selection unwraps it (toggle).
 */
export const HighlightablePromptInput = forwardRef<HighlightablePromptInputHandle, Props>(
  function HighlightablePromptInput(
    { value, onChange, maxLength, rows = 8, placeholder, className, id },
    ref
  ) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    const placeholderCount = (value.match(/\{\{[^{}]+?\}\}/g) ?? []).length;

    const toggleHighlight = useCallback(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { selectionStart, selectionEnd } = ta;
      if (selectionStart === selectionEnd) return; // nothing selected

      const before = value.slice(0, selectionStart);
      const selected = value.slice(selectionStart, selectionEnd);
      const after = value.slice(selectionEnd);

      // Toggle: if the selection already starts and ends with the markers,
      // unwrap it. Otherwise wrap.
      const isWrapped = selected.startsWith("{{") && selected.endsWith("}}") && selected.length >= 4;

      let newSelected: string;
      let newSelStart: number;
      let newSelEnd: number;

      if (isWrapped) {
        newSelected = selected.slice(2, -2);
        newSelStart = selectionStart;
        newSelEnd = selectionEnd - 4;
      } else {
        newSelected = `{{${selected}}}`;
        newSelStart = selectionStart;
        newSelEnd = selectionEnd + 4;
      }

      const next = before + newSelected + after;
      onChange(next);

      // Restore the selection (with adjusted bounds) on the next paint
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(newSelStart, newSelEnd);
      });
    }, [value, onChange]);

    const onKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Ctrl+H or Cmd+H (preventDefault stops the browser "Find/Replace")
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") {
          e.preventDefault();
          toggleHighlight();
        }
      },
      [toggleHighlight]
    );

    return (
      <div className="overflow-hidden rounded-lg border border-input bg-tint-1 focus-within:border-foreground/30 focus-within:ring-2 focus-within:ring-ring/40">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-tint-1 px-2 py-1.5">
          <button
            type="button"
            onClick={toggleHighlight}
            onMouseDown={(e) => e.preventDefault() /* don't lose selection */}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border border-violet-400/30 bg-violet-500/10 px-2.5 text-[11px] font-medium text-violet-300 transition-colors hover:bg-violet-500/15 active:scale-[0.97]"
            )}
            title="Wrap the selected text in a {{customize me}} placeholder. Shortcut: Ctrl+H / ⌘H."
          >
            <Sparkles className="h-3 w-3" />
            Highlight
          </button>
          <span className="text-[10px] text-muted-foreground/80">
            Select text in the box → <kbd className="rounded border border-border bg-tint-2 px-1 py-px font-mono text-[10px]">Ctrl</kbd>
            <kbd className="ml-1 rounded border border-border bg-tint-2 px-1 py-px font-mono text-[10px]">H</kbd>
          </span>
        </div>

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
            {placeholderCount} customizable {placeholderCount === 1 ? "placeholder" : "placeholders"} —
            buyers will see {placeholderCount === 1 ? "it" : "them"} highlighted.
          </div>
        )}
      </div>
    );
  }
);
