"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PROMPT_LIMITS } from "@/lib/constants";
import { useSolPrice, solToUsdString } from "@/hooks/use-sol-price";
import { Loader2 } from "lucide-react";
import type { Category, Platform } from "@/lib/supabase/types";

type Initial = {
  title: string;
  description: string;
  prompt_text: string;
  price_sol: number;
  category_id: number | null;
  platform_ids: number[];
};

export function EditPromptForm({
  promptId,
  initial,
  categories,
  platforms,
}: {
  promptId: string;
  initial: Initial;
  categories: Category[];
  platforms: Platform[];
}) {
  const { getAccessToken } = usePrivy();
  const { usd } = useSolPrice();
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [promptText, setPromptText] = useState(initial.prompt_text);
  const [priceSol, setPriceSol] = useState(String(initial.price_sol));
  const [categoryId, setCategoryId] = useState<number | null>(initial.category_id);
  const [platformIds, setPlatformIds] = useState<number[]>(initial.platform_ids);
  const [submitting, setSubmitting] = useState(false);

  function togglePlatform(id: number) {
    setPlatformIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const price = parseFloat(priceSol);
    if (Number.isNaN(price) || price < 0 || price > PROMPT_LIMITS.price.max) {
      toast.error("Invalid price");
      return;
    }
    if (price > 0 && price < PROMPT_LIMITS.price.minPaid) {
      toast.error(`Paid prompts must be at least ${PROMPT_LIMITS.price.minPaid} SOL`);
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/prompts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt_id: promptId,
          title,
          description,
          prompt_text: promptText,
          price_sol: price,
          category_id: categoryId,
          platform_ids: platformIds,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Update failed");
      toast.success("Prompt updated.");
      router.push(`/prompt/${promptId}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
        Images can&apos;t be changed after upload. To change images, delete this prompt and create a new one.
      </p>

      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={PROMPT_LIMITS.title.max}
        />
        <p className="mt-1 text-xs text-muted-foreground">{title.length}/{PROMPT_LIMITS.title.max}</p>
      </div>

      <div>
        <Label htmlFor="description">Description (public)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={PROMPT_LIMITS.description.max}
          rows={3}
        />
        <p className="mt-1 text-xs text-muted-foreground">{description.length}/{PROMPT_LIMITS.description.max}</p>
      </div>

      <div>
        <Label htmlFor="prompt">Prompt text (locked)</Label>
        <Textarea
          id="prompt"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          maxLength={PROMPT_LIMITS.promptText.max}
          rows={8}
          className="font-mono"
        />
        <p className="mt-1 text-xs text-muted-foreground">{promptText.length}/{PROMPT_LIMITS.promptText.max}</p>
      </div>

      <div>
        <Label className="mb-2 block">Category</Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (categoryId === c.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-accent")
              }
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="mb-2 block">Platforms</Label>
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => togglePlatform(p.id)}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (platformIds.includes(p.id)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card hover:bg-accent")
              }
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="price">Price in SOL (0 for free)</Label>
        <div className="relative">
          <Input
            id="price"
            type="number"
            min="0"
            max={PROMPT_LIMITS.price.max}
            step="0.001"
            value={priceSol}
            onChange={(e) => setPriceSol(e.target.value)}
          />
          {(() => {
            const p = parseFloat(priceSol);
            const dollars = Number.isFinite(p) ? solToUsdString(p, usd) : "";
            return dollars ? (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                ≈ {dollars}
              </span>
            ) : null;
          })()}
        </div>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save changes"
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/prompt/${promptId}`)}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
