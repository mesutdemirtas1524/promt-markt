import { PromptFeedSkeleton, Shimmer } from "@/components/skeletons";

export default function CategoryLoading() {
  return (
    <div className="w-full px-4 py-8 sm:px-6 lg:px-10 xl:px-16">
      <Shimmer className="mb-2 h-8 w-40" />
      <Shimmer className="mb-8 h-3 w-32" />
      <PromptFeedSkeleton count={15} />
    </div>
  );
}
