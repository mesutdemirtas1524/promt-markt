import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchPromptCards } from "@/lib/queries";
import { InfiniteFeed } from "@/components/infinite-feed";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: cat } = await supabase.from("categories").select("name").eq("slug", slug).maybeSingle();
  if (!cat) return { title: "Category" };
  return {
    title: `${cat.name} prompts`,
    description: `Browse ${cat.name} AI image prompts on Promt Markt.`,
    openGraph: {
      title: `${cat.name} prompts on Promt Markt`,
      description: `Browse ${cat.name} AI image prompts paid in Solana.`,
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseServiceClient();
  const { data: cat } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
  if (!cat) notFound();

  const PAGE_SIZE = 24;
  const prompts = await fetchPromptCards({
    categorySlug: slug,
    orderBy: "newest",
    limit: PAGE_SIZE,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{cat.name}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{prompts.length}+ prompts</p>
      {prompts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-tint-1 p-16 text-center text-sm text-muted-foreground">
          No prompts in this category yet.
        </div>
      ) : (
        <InfiniteFeed
          initialItems={prompts}
          initialNextOffset={prompts.length}
          initialHasMore={prompts.length === PAGE_SIZE}
          filters={{ sort: "newest", category: slug }}
        />
      )}
    </div>
  );
}
