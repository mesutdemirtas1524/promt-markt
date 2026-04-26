/**
 * Light-weight prompt analysis. Used to surface trust signals on a
 * locked prompt block (before purchase) so buyers know what they're
 * getting without seeing the actual prompt text:
 *
 *   - char/word counts
 *   - number of {{customizable}} placeholders
 *   - detected model parameters (--ar, --v, --style, --niji, etc.)
 *
 * All extraction is purely structural — we never reveal the prompt
 * itself, only meta-properties.
 */

const PLACEHOLDER_RE = /\{\{[^{}]+?\}\}/g;

// Common Midjourney / SDXL / Niji / Flux flags. Captures the flag and
// a short excerpt of its value (numeric or single-token), e.g.:
//   "--ar 16:9", "--v 6.1", "--style raw", "--no people"
const PARAM_RE = /--([a-z]+)(?:\s+([^\s-]+))?/gi;

export type PromptAnalysis = {
  chars: number;
  words: number;
  placeholderCount: number;
  parameters: { flag: string; value?: string }[];
};

export function analyzePrompt(text: string): PromptAnalysis {
  const placeholderCount = (text.match(PLACEHOLDER_RE) ?? []).length;

  const parameters: { flag: string; value?: string }[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = PARAM_RE.exec(text)) !== null) {
    const flag = `--${m[1].toLowerCase()}`;
    if (seen.has(flag)) continue;
    seen.add(flag);
    parameters.push({ flag, value: m[2] });
    if (parameters.length >= 6) break; // cap UI clutter
  }

  return {
    chars: text.length,
    words: (text.trim().match(/\S+/g) ?? []).length,
    placeholderCount,
    parameters,
  };
}
