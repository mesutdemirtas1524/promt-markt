import { Sparkles } from "lucide-react";

// `[\s\S]` instead of `.` so we don't need the `s` flag (target compat).
const PLACEHOLDER_RE = /(\{\{[^{}]+?\}\})/g;
const PLACEHOLDER_INNER = /^\{\{([\s\S]+?)\}\}$/;

/**
 * Render prompt text with `{{placeholder}}` tokens highlighted.
 *
 * Creators can mark customizable bits in the prompt with double-curly
 * syntax — the buyer sees those bits in a distinctive style so they
 * know "I should swap this with my own subject / context".
 *
 *   "A portrait of {{your subject}} in cinematic lighting"
 *                  └────── highlighted ──────┘
 *
 * The token text itself (without the braces) is displayed; the user's
 * mental task is "rewrite anything that looks highlighted".
 *
 * Plain text (no `{{}}`) renders unchanged — backwards compatible.
 */
export function PromptText({ text, className = "" }: { text: string; className?: string }) {
  const parts = text.split(PLACEHOLDER_RE);
  const placeholderCount = parts.filter((p) => PLACEHOLDER_INNER.test(p)).length;

  return (
    <div className={className}>
      <pre className="font-prompt whitespace-pre-wrap break-words text-[14px] text-foreground">
        {parts.map((part, i) => {
          const m = part.match(PLACEHOLDER_INNER);
          if (m) {
            return (
              <span
                key={i}
                className="prompt-placeholder"
                title="The creator marked this as something you should change to fit your own content."
              >
                {m[1]}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </pre>

      {placeholderCount > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-violet-400/20 bg-violet-500/[0.06] p-2.5 text-[11px] leading-snug text-violet-300/90">
          <Sparkles className="mt-px h-3 w-3 shrink-0" />
          <span>
            Highlighted bits are <strong className="font-medium">customizable</strong>. Swap{" "}
            {placeholderCount === 1 ? "it" : `each of the ${placeholderCount}`} with your own
            content when you run the prompt.
          </span>
        </div>
      )}
    </div>
  );
}
