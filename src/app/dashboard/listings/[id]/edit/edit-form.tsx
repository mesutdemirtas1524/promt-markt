"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { HighlightablePromptInput } from "@/components/highlightable-prompt-input";
import { PROMPT_LIMITS, ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { useSolPrice } from "@/hooks/use-sol-price";
import { formatSol } from "@/lib/utils";
import { Loader2, Upload, X } from "lucide-react";
import { SolLogo } from "@/components/sol-logo";
import type { Category, Platform } from "@/lib/supabase/types";

type Initial = {
  title: string;
  description: string;
  prompt_text: string;
  price_usd: number;
  category_ids: number[];
  platform_ids: number[];
  cover_image_url: string | null;
};

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    let settled = false;
    const cleanup = () => URL.revokeObjectURL(url);
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };
    const timer = setTimeout(() => done(() => reject(new Error("dim timeout"))), 4000);
    img.onload = () => {
      clearTimeout(timer);
      done(() => resolve({ width: img.naturalWidth, height: img.naturalHeight }));
    };
    img.onerror = (e) => {
      clearTimeout(timer);
      done(() => reject(e));
    };
    img.src = url;
  });
}

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
  const [priceUsd, setPriceUsd] = useState(String(initial.price_usd));
  const [categoryIds, setCategoryIds] = useState<number[]>(initial.category_ids);
  const [platformIds, setPlatformIds] = useState<number[]>(initial.platform_ids);
  const [submitting, setSubmitting] = useState(false);

  // Cover state: existing URL stays unless replaced or removed.
  const [coverUrl, setCoverUrl] = useState<string | null>(initial.cover_image_url);
  const [pendingCover, setPendingCover] = useState<{
    file: File;
    preview: string;
    width?: number;
    height?: number;
  } | null>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  function togglePlatform(id: number) {
    setPlatformIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleCategory(id: number) {
    setCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function pickCover(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      toast.error("Use PNG, JPG, or WEBP");
      return;
    }
    if (file.size > PROMPT_LIMITS.imageSizeMB * 1024 * 1024) {
      toast.error(`Cover exceeds ${PROMPT_LIMITS.imageSizeMB}MB`);
      return;
    }
    let dims: { width: number; height: number } | undefined;
    try {
      dims = await readImageDimensions(file);
    } catch {
      // ok
    }
    if (pendingCover) URL.revokeObjectURL(pendingCover.preview);
    setPendingCover({
      file,
      preview: URL.createObjectURL(file),
      width: dims?.width,
      height: dims?.height,
    });
  }

  function cancelPendingCover() {
    if (pendingCover) URL.revokeObjectURL(pendingCover.preview);
    setPendingCover(null);
  }

  function removeCover() {
    cancelPendingCover();
    setCoverUrl(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const price = parseFloat(priceUsd);
    if (Number.isNaN(price) || price < 0 || price > PROMPT_LIMITS.price.max) {
      toast.error("Invalid price");
      return;
    }
    if (price > 0 && price < PROMPT_LIMITS.price.minPaid) {
      toast.error(`Paid prompts must be at least $${PROMPT_LIMITS.price.minPaid}`);
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Auth token missing");

      // If the creator picked a new cover, upload it first.
      let coverPayload: { url: string; width?: number; height?: number } | null | undefined =
        undefined;
      if (pendingCover) {
        const signRes = await fetch("/api/upload/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            files: [
              {
                name: pendingCover.file.name,
                type: pendingCover.file.type,
                size: pendingCover.file.size,
              },
            ],
          }),
        });
        if (!signRes.ok) throw new Error((await signRes.json()).error ?? "Could not sign upload");
        const { uploads } = (await signRes.json()) as {
          uploads: { signedUrl: string; publicUrl: string }[];
        };
        const u = uploads[0];
        const putRes = await fetch(u.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": pendingCover.file.type },
          body: pendingCover.file,
        });
        if (!putRes.ok) throw new Error("Cover upload failed");
        coverPayload = {
          url: u.publicUrl,
          width: pendingCover.width,
          height: pendingCover.height,
        };
      } else if (initial.cover_image_url && coverUrl === null) {
        // Creator hit "Remove" without uploading a replacement → null clears.
        coverPayload = null;
      }
      // Otherwise leave cover untouched (undefined).

      const res = await fetch("/api/prompts/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt_id: promptId,
          title,
          description,
          prompt_text: promptText,
          price_usd: price,
          category_ids: categoryIds,
          platform_ids: platformIds,
          ...(coverPayload === undefined ? {} : { cover: coverPayload }),
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
        Gallery images can&apos;t be changed after upload. To change them, delete this prompt
        and create a new one. The cover image (shown on cards) can still be replaced below.
      </p>

      <div>
        <Label className="mb-2 block">Cover image</Label>
        <div className="flex items-start gap-3">
          <div className="relative h-32 w-32 overflow-hidden rounded-md border border-border bg-muted">
            {pendingCover ? (
              <>
                <Image
                  src={pendingCover.preview}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={cancelPendingCover}
                  className="absolute right-1 top-1 rounded-full bg-background/90 p-1 transition-transform hover:scale-110"
                  aria-label="Cancel new cover"
                >
                  <X className="h-3 w-3" />
                </button>
                <span className="absolute bottom-1 left-1 rounded bg-violet-500 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  New
                </span>
              </>
            ) : coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <button
                type="button"
                onClick={() => coverInput.current?.click()}
                className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <Upload className="h-5 w-5" />
                Choose
              </button>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Shown on cards across the marketplace. Leave empty to fall back to the first
              gallery image.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => coverInput.current?.click()}
              >
                {coverUrl || pendingCover ? "Replace" : "Upload cover"}
              </Button>
              {(coverUrl || pendingCover) && (
                <Button type="button" size="sm" variant="ghost" onClick={removeCover}>
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
        <input
          ref={coverInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void pickCover(f);
          }}
        />
      </div>

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
        <HighlightablePromptInput
          id="prompt"
          value={promptText}
          onChange={setPromptText}
          maxLength={PROMPT_LIMITS.promptText.max}
          rows={8}
        />
        <p className="mt-1.5 text-right text-xs text-muted-foreground">
          {promptText.length}/{PROMPT_LIMITS.promptText.max}
        </p>
      </div>

      <div>
        <Label className="mb-2 block">
          Categories <span className="text-muted-foreground">(pick one or more)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCategory(c.id)}
              className={
                "rounded-full border px-3 py-1 text-xs transition-colors " +
                (categoryIds.includes(c.id)
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
        <Label htmlFor="price">Price in USD (0 for free)</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
            $
          </span>
          <Input
            id="price"
            type="number"
            min="0"
            max={PROMPT_LIMITS.price.max}
            step="0.01"
            value={priceUsd}
            onChange={(e) => setPriceUsd(e.target.value)}
            className="pl-7 pr-24"
          />
          {(() => {
            const p = parseFloat(priceUsd);
            if (!Number.isFinite(p) || p <= 0 || !usd) return null;
            const sol = p / usd;
            return (
              <span className="pointer-events-none absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 text-xs tabular-nums text-muted-foreground">
                ≈ <SolLogo className="h-3 w-3" /> {formatSol(sol)} SOL
              </span>
            );
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
