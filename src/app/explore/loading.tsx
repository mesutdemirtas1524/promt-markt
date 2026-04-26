import { PromptFeedSkeleton } from "@/components/skeletons";
import { Shimmer } from "@/components/skeletons";

export default function ExploreLoading() {
  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Shimmer className="h-9 w-32" />
          <Shimmer className="h-3 w-72" />
        </div>
        <Shimmer className="h-10 w-full rounded-lg sm:w-80" />
      </div>
      <div className="mb-6 flex flex-wrap gap-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="h-8 w-16 rounded-full" />
        ))}
      </div>
      <PromptFeedSkeleton count={18} />
    </div>
  );
}
