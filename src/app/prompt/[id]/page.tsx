import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { fetchPromptDetail } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { PromptDetailActions } from "@/components/prompt-detail-actions";
import { formatRating, formatRelativeTime } from "@/lib/utils";

export default async function PromptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const result = await fetchPromptDetail(id, viewer?.id ?? null);
  if (!result) notFound();

  const { prompt, hasAccess, myRating, isOwnPrompt } = result;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Gallery */}
        <div className="space-y-3 lg:col-span-3">
          {prompt.images.length > 0 ? (
            prompt.images.map((img: { id: string; image_url: string; position: number }) => (
              <div
                key={img.id}
                className="relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted"
              >
                <Image
                  src={img.image_url}
                  alt={prompt.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  className="object-cover"
                  priority={img.position === 1}
                />
              </div>
            ))
          ) : (
            <div className="aspect-square w-full rounded-lg border border-dashed border-border bg-muted" />
          )}
        </div>

        {/* Side panel */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {prompt.category && <Badge variant="secondary">{prompt.category.name}</Badge>}
              {prompt.platforms.map((p: { id: number; name: string }) => (
                <Badge key={p.id} variant="outline">{p.name}</Badge>
              ))}
            </div>
            <h1 className="text-2xl font-bold leading-tight">{prompt.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{prompt.description}</p>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Link
              href={`/u/${prompt.creator.username}`}
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted"
            >
              {prompt.creator.avatar_url && (
                <Image
                  src={prompt.creator.avatar_url}
                  alt={prompt.creator.display_name ?? prompt.creator.username}
                  fill
                  sizes="40px"
                  className="object-cover"
                />
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/u/${prompt.creator.username}`}
                className="block truncate text-sm font-medium hover:underline"
              >
                {prompt.creator.display_name ?? `@${prompt.creator.username}`}
              </Link>
              {prompt.creator.display_name && (
                <p className="truncate text-xs text-muted-foreground">@{prompt.creator.username}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(prompt.created_at)} · {prompt.purchase_count} sales
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm">
            <span className="text-muted-foreground">Rating</span>
            <span>{formatRating(prompt.avg_rating, prompt.rating_count)}</span>
          </div>

          <PromptDetailActions
            promptId={prompt.id}
            priceSol={Number(prompt.price_sol)}
            creatorWallet={prompt.creator.wallet_address}
            hasAccess={hasAccess}
            isOwnPrompt={isOwnPrompt}
            myRating={myRating}
            promptText={prompt.prompt_text}
          />
        </div>
      </div>
    </div>
  );
}
