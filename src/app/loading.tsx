import { PromptFeedSkeleton } from "@/components/skeletons";

export default function HomeLoading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <div className="mb-10 h-64 animate-pulse rounded-2xl bg-tint-2 sm:h-72" />
      <div className="mb-5 h-8 w-1/3 animate-pulse rounded-full bg-tint-2" />
      <PromptFeedSkeleton count={18} />
    </div>
  );
}
