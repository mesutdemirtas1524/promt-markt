import type { Metadata } from "next";
import Link from "next/link";
import { fetchPromptCards } from "@/lib/queries";
import { PromptCard, PromptMasonry } from "@/components/prompt-card";
import { Sparkles, ArrowRight } from "lucide-react";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "New arrivals",
  description: "The freshest prompts on Promt Markt.",
};

export default async function NewArrivalsPage() {
  const prompts = await fetchPromptCards({ orderBy: "newest", limit: 60 });

  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
      <header className="mb-8">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-medium tracking-wider text-violet-300">
          <Sparkles className="h-3 w-3" />
          JUST DROPPED
        </div>
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">New arrivals</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              The latest prompts uploaded to the marketplace.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Advanced filters <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          Nothing here yet — be the first to upload.
        </div>
      ) : (
        <PromptMasonry>
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} />
          ))}
        </PromptMasonry>
      )}
    </div>
  );
}
