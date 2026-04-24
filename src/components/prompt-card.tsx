import Link from "next/link";
import Image from "next/image";
import { Badge } from "./ui/badge";
import { formatSol } from "@/lib/utils";
import { Star } from "lucide-react";

export type PromptCardData = {
  id: string;
  title: string;
  price_sol: number;
  avg_rating: number | null;
  rating_count: number;
  cover_image: string | null;
  creator_username: string;
};

export function PromptCard({ prompt }: { prompt: PromptCardData }) {
  return (
    <Link
      href={`/prompt/${prompt.id}`}
      className="group block overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-foreground/30"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {prompt.cover_image ? (
          <Image
            src={prompt.cover_image}
            alt={prompt.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute right-2 top-2">
          <Badge variant={prompt.price_sol === 0 ? "success" : "default"}>
            {prompt.price_sol === 0 ? "Free" : `${formatSol(prompt.price_sol)} SOL`}
          </Badge>
        </div>
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-1 text-sm font-medium text-foreground">{prompt.title}</h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">@{prompt.creator_username}</span>
          {prompt.rating_count > 0 && prompt.avg_rating !== null ? (
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {Math.round(prompt.avg_rating)}
              <span className="opacity-60">({prompt.rating_count})</span>
            </span>
          ) : (
            <span className="opacity-60">No ratings</span>
          )}
        </div>
      </div>
    </Link>
  );
}
