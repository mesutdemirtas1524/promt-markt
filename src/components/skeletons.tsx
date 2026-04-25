/**
 * Reusable skeleton primitives. All use the same `bg-tint-2` shimmer base
 * + `animate-pulse` so the loading state visually matches the dark/light
 * theme tokens from globals.css.
 */

export function Shimmer({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-tint-2 ${className}`} />;
}

/**
 * Single prompt card placeholder. Heights are randomized within a small
 * range so a grid of skeletons feels like the masonry it'll become.
 */
export function PromptCardSkeleton({ heightClass = "h-72" }: { heightClass?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className={`${heightClass} w-full animate-pulse bg-tint-2`} />
      <div className="space-y-2 p-3">
        <Shimmer className="h-3 w-3/4" />
        <div className="flex items-center justify-between gap-2">
          <Shimmer className="h-2.5 w-1/3" />
          <Shimmer className="h-2.5 w-10" />
        </div>
      </div>
    </div>
  );
}

/**
 * Masonry-shaped grid of card skeletons. Use as the fallback for a
 * Suspense boundary or `loading.tsx`.
 */
export function PromptFeedSkeleton({ count = 12 }: { count?: number }) {
  // Deterministic-but-varied heights so the grid feels right
  const heights = ["h-56", "h-72", "h-64", "h-80", "h-60", "h-72", "h-64", "h-56", "h-80", "h-72", "h-60", "h-64"];
  return (
    <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 [&>*]:mb-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="break-inside-avoid">
          <PromptCardSkeleton heightClass={heights[i % heights.length]} />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton shell that mimics the prompt detail page layout while it loads.
 */
export function PromptDetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <div className="aspect-[4/5] w-full animate-pulse rounded-2xl bg-tint-2" />
          <div className="flex gap-2">
            <Shimmer className="h-16 w-16 rounded-lg" />
            <Shimmer className="h-16 w-16 rounded-lg" />
          </div>
        </div>
        <div className="space-y-5 lg:col-span-2">
          <div>
            <div className="flex gap-1.5">
              <Shimmer className="h-5 w-20 rounded-full" />
              <Shimmer className="h-5 w-16 rounded-full" />
            </div>
            <Shimmer className="mt-3 h-9 w-4/5" />
            <Shimmer className="mt-3 h-3 w-full" />
            <Shimmer className="mt-2 h-3 w-3/4" />
          </div>
          <div className="rounded-xl border border-border bg-tint-1 p-3">
            <div className="flex items-center gap-3">
              <Shimmer className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Shimmer className="h-3 w-1/2" />
                <Shimmer className="h-2.5 w-1/3" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Shimmer className="h-14" />
            <Shimmer className="h-14" />
            <Shimmer className="h-14" />
          </div>
          <Shimmer className="h-10 w-full rounded-lg" />
          <Shimmer className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

/**
 * Profile page skeleton.
 */
export function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 rounded-2xl border border-border p-7 sm:p-9">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Shimmer className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-7 w-1/3" />
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-2/3" />
          </div>
        </div>
      </div>
      <PromptFeedSkeleton count={10} />
    </div>
  );
}
