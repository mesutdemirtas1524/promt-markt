import Link from "next/link";
import { Badge } from "./ui/badge";
import { PriceTag } from "./price-tag";
import { Star, Heart } from "lucide-react";
import { FavoriteButton } from "./favorite-button";

export type PromptCardData = {
  id: string;
  title: string;
  price_sol: number;
  avg_rating: number | null;
  rating_count: number;
  favorite_count: number;
  cover_image: string | null;
  creator_username: string;
  status?: "active" | "removed";
};

export function PromptCard({
  prompt,
  initiallyFavorited = false,
}: {
  prompt: PromptCardData;
  initiallyFavorited?: boolean;
}) {
  const isRemoved = prompt.status === "removed";
  return (
    <div className="gradient-border ring-hover group relative inline-block w-full overflow-hidden rounded-xl border border-border bg-card break-inside-avoid">
      <Link href={`/prompt/${prompt.id}`} className="block">
        <div className="relative w-full overflow-hidden bg-muted">
          {prompt.cover_image ? (
            // Native aspect-ratio: lets browser size the image so nothing is cropped
            // Plain <img> here is intentional — masonry needs intrinsic height before paint
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={prompt.cover_image}
              alt={prompt.title}
              loading="lazy"
              decoding="async"
              className="block h-auto w-full transition-transform duration-[600ms] ease-out group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          {/* Bottom gradient — only on hover, fades over title area */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/65 via-black/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
            <div className="rounded-full border border-white/10 bg-black/55 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur">
              <PriceTag sol={prompt.price_sol} size="xs" />
            </div>
            {isRemoved && <Badge variant="destructive">Removed</Badge>}
          </div>
        </div>

        <div className="space-y-1.5 p-3">
          <h3 className="line-clamp-1 text-[13px] font-medium leading-tight text-foreground">
            {prompt.title}
          </h3>
          <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="truncate">@{prompt.creator_username}</span>
            <div className="flex shrink-0 items-center gap-2.5">
              {prompt.favorite_count > 0 && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Heart className="h-3 w-3 fill-pink-400/80 text-pink-400/80" />
                  {prompt.favorite_count}
                </span>
              )}
              {prompt.rating_count > 0 && prompt.avg_rating !== null && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                  {Math.round(prompt.avg_rating)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Hover-revealed favorite toggle */}
      <div className="absolute left-2 top-2 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        <FavoriteButton
          promptId={prompt.id}
          initiallyFavorited={initiallyFavorited}
          size="sm"
        />
      </div>

      {initiallyFavorited && (
        <div className="absolute left-2 top-2 z-[5] pointer-events-none transition-opacity duration-200 group-hover:opacity-0">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-pink-400 backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Wrap a list of PromptCards in a CSS-columns masonry layout. */
export function PromptMasonry({ children }: { children: React.ReactNode }) {
  return (
    <div className="columns-2 gap-3 sm:columns-3 md:columns-4 lg:columns-5 xl:columns-6 [&>*]:mb-3">
      {children}
    </div>
  );
}
