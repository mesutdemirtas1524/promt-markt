/**
 * Tiny SVG bar chart for daily sales over the last N days. No chart
 * library dependency — just CSS-styled rects sized by ratio. Works
 * inside server components.
 */
import { SolLogo } from "./sol-logo";

export type DailyPoint = { date: string; count: number; volumeSol: number };

export function SalesChart({
  data,
  metric = "count",
  height = 120,
}: {
  data: DailyPoint[];
  metric?: "count" | "volume";
  height?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed border-border bg-tint-1 text-xs text-muted-foreground"
        style={{ height }}
      >
        No sales yet — once buyers come in this fills up.
      </div>
    );
  }

  const values = data.map((d) => (metric === "count" ? d.count : d.volumeSol));
  const max = Math.max(1, ...values);
  const total = values.reduce((s, v) => s + v, 0);

  return (
    <div className="rounded-xl border border-border bg-tint-1 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {metric === "count" ? "Sales" : "Volume"} · last {data.length}d
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 text-2xl font-bold tabular-nums">
            {metric === "volume" && <SolLogo className="h-4 w-4" />}
            {metric === "count" ? total : formatSol(total)}
            {metric === "volume" && <span className="text-sm font-medium opacity-60">SOL</span>}
          </div>
        </div>
      </div>

      <div className="flex items-end gap-[2px]" style={{ height }}>
        {data.map((d) => {
          const v = metric === "count" ? d.count : d.volumeSol;
          const h = max === 0 ? 0 : (v / max) * 100;
          const empty = v === 0;
          return (
            <div
              key={d.date}
              className="group relative flex-1"
              title={`${formatDate(d.date)}: ${
                metric === "count" ? `${d.count} sales` : `${formatSol(d.volumeSol)} SOL`
              }`}
            >
              <div
                className={
                  "w-full rounded-sm transition-colors " +
                  (empty
                    ? "bg-border"
                    : "bg-gradient-to-t from-violet-500/40 to-violet-400/80 group-hover:from-violet-500/60 group-hover:to-violet-300")
                }
                style={{ height: empty ? 2 : `${Math.max(h, 4)}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground/70">
        <span>{shortDate(data[0]?.date)}</span>
        <span>{shortDate(data[data.length - 1]?.date)}</span>
      </div>
    </div>
  );
}

function formatSol(sol: number): string {
  if (sol === 0) return "0";
  if (sol >= 100) return sol.toFixed(2);
  if (sol >= 1) return sol.toFixed(3);
  return sol.toFixed(4);
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function shortDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Bucket a list of purchase rows into N daily buckets ending today.
 * Returns N points with date in YYYY-MM-DD form.
 */
export function bucketDailySales(
  rows: { created_at: string; price_paid_sol: number | string | null }[],
  days = 30
): DailyPoint[] {
  const out: DailyPoint[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push({ date: d.toISOString().slice(0, 10), count: 0, volumeSol: 0 });
  }
  const indexByDate = new Map(out.map((p, i) => [p.date, i]));
  for (const r of rows) {
    const day = r.created_at.slice(0, 10);
    const i = indexByDate.get(day);
    if (i === undefined) continue;
    out[i].count += 1;
    out[i].volumeSol += Number(r.price_paid_sol ?? 0);
  }
  return out;
}
