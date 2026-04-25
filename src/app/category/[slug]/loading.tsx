import { PromptFeedSkeleton, Shimmer } from "@/components/skeletons";

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Shimmer className="mb-2 h-8 w-40" />
      <Shimmer className="mb-8 h-3 w-32" />
      <PromptFeedSkeleton count={15} />
    </div>
  );
}
