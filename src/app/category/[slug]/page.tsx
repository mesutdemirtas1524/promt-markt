import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchPromptCards, fetchUserFavoriteIds } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { PromptCard } from "@/components/prompt-card";

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

  const viewer = await getCurrentUser();
  const [prompts, favoriteIds] = await Promise.all([
    fetchPromptCards({ categorySlug: slug, orderBy: "newest", limit: 48 }),
    viewer ? fetchUserFavoriteIds(viewer.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold">{cat.name}</h1>
      <p className="mb-8 text-sm text-muted-foreground">{prompts.length} prompts</p>
      {prompts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-foreground">
          No prompts in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {prompts.map((p) => (
            <PromptCard key={p.id} prompt={p} initiallyFavorited={favoriteIds.has(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
