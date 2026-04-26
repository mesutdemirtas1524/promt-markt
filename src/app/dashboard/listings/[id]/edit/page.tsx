import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { fetchCategories, fetchPlatforms } from "@/lib/queries";
import { EditPromptForm } from "./edit-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit prompt" };

export default async function EditPromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/dashboard");

  const supabase = createSupabaseServiceClient();
  const { data: prompt } = await supabase
    .from("prompts")
    .select(
      `
      id, creator_id, title, description, prompt_text, price_usd, category_id, status, cover_image_url,
      platforms:prompt_platforms ( platform_id )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!prompt) notFound();
  if (prompt.creator_id !== user.id) redirect("/dashboard/listings");

  const [categories, platforms] = await Promise.all([fetchCategories(), fetchPlatforms()]);
  const platformIds = ((prompt.platforms ?? []) as { platform_id: number }[]).map((p) => p.platform_id);

  return (
    <div className="w-full">
      <h2 className="mb-6 text-lg font-semibold">Edit prompt</h2>
      <EditPromptForm
        promptId={prompt.id}
        initial={{
          title: prompt.title,
          description: prompt.description,
          prompt_text: prompt.prompt_text,
          price_usd: Number(prompt.price_usd),
          category_id: prompt.category_id,
          platform_ids: platformIds,
          cover_image_url: prompt.cover_image_url ?? null,
        }}
        categories={categories}
        platforms={platforms}
      />
    </div>
  );
}
