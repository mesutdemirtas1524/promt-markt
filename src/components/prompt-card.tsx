import Link from "next/link";
import Image from "next/image";
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
    <div className="gradient-border group relative overflow-hidden rounded-xl border border-border bg-card ring-hover">
      <Link href={`/prompt/${prompt.id}`} className="block">
        <div className="relative aspect-square w-full overflow-hidden bg-muted">
          {prompt.cover_image ? (
            <Image
              src={prompt.cover_image}
              alt={prompt.title}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              No image
            </div>
          )}
          {/* Bottom gradient for legibility of any overlay text */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
            <div className="rounded-full border border-white/10 bg-black/55 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums backdrop-blur">
              <PriceTag sol={prompt.price_sol} size="xs" />
            </div>
            {isRemoved && <Badge variant="destructive">Removed</Badge>}
          </div>
        </div>
        <div className="space-y-1.5 p-3.5">
          <h3 className="line-clamp-1 text-[13.5px] font-medium leading-tight text-foreground">
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
              {prompt.rating_count > 0 && prompt.avg_rating !== null ? (
                <span className="flex items-center gap-1 tabular-nums">
                  <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                  {Math.round(prompt.avg_rating)}
                  <span className="opacity-60">({prompt.rating_count})</span>
                </span>
              ) : (
                <span className="opacity-50">No ratings</span>
              )}
            </div>
          </div>
        </div>
      </Link>
      <div className="absolute left-2 top-2 z-10 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
        <FavoriteButton
          promptId={prompt.id}
          initiallyFavorited={initiallyFavorited}
          size="sm"
        />
      </div>
      {initiallyFavorited && (
        <div className="absolute left-2 top-2 z-[5] pointer-events-none group-hover:opacity-0 transition-opacity duration-200">
          <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-pink-400 backdrop-blur">
            <Heart className="h-3.5 w-3.5 fill-current" />
          </div>
        </div>
      )}
    </div>
  );
}
