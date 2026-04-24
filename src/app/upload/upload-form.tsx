"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PROMPT_LIMITS, ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import { useSyncUser } from "@/hooks/use-sync-user";
import { Loader2, Upload, X } from "lucide-react";
import type { Category, Platform } from "@/lib/supabase/types";

type LocalImage = { file: File; preview: string };

export function UploadForm({ categories, platforms }: { categories: Category[]; platforms: Platform[] }) {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { dbUser } = useSyncUser();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<LocalImage[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [promptText, setPromptText] = useState("");
  const [priceSol, setPriceSol] = useState("0");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [platformIds, setPlatformIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = PROMPT_LIMITS.images.max - images.length;
    const next: LocalImage[] = [];
    for (const f of Array.from(files).slice(0, remaining)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
        toast.error(`${f.name}: unsupported type`);
        continue;
      }
      if (f.size > PROMPT_LIMITS.imageSizeMB * 1024 * 1024) {
        toast.error(`${f.name}: exceeds ${PROMPT_LIMITS.imageSizeMB}MB`);
        continue;
      }
      next.push({ file: f, preview: URL.createObjectURL(f) });
    }
    setImages((prev) => [...prev, ...next]);
  }

  function removeImage(i: number) {
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  }

  function togglePlatform(id: number) {
    setPlatformIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authenticated) {
      login();
      return;
    }
    if (!dbUser) {
      toast.error("Setting up your account… try again in a second.");
      return;
    }

    const price = parseFloat(priceSol);
    if (Number.isNaN(price) || price < 0 || price > PROMPT_LIMITS.price.max) {
      toast.error("Invalid price");
      return;
    }
    if (price > 0 && price < 0.0001) {
      toast.error("Paid prompts must be at least 0.0001 SOL");
      return;
    }
    if (title.length < PROMPT_LIMITS.title.min) {
      toast.error(`Title must be at least ${PROMPT_LIMITS.title.min} characters`);
      return;
    }
    if (description.length < PROMPT_LIMITS.description.min) {
      toast.error(`Description must be at least ${PROMPT_LIMITS.description.min} characters`);
      return;
    }
    if (promptText.length < PROMPT_LIMITS.promptText.min) {
      toast.error(`Prompt must be at least ${PROMPT_LIMITS.promptText.min} characters`);
      return;
    }
    if (images.length < PROMPT_LIMITS.images.min) {
      toast.error("Add at least 1 image");
      return;
    }
    if (price > 0 && !dbUser.wallet_address) {
      toast.error("Paid prompts require a Solana wallet — connect one in settings");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Auth token missing");

      // 1. Request signed upload URLs
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          files: images.map((img) => ({ name: img.file.name, type: img.file.type, size: img.file.size })),
        }),
      });
      if (!signRes.ok) throw new Error((await signRes.json()).error ?? "Could not sign upload");
      const { uploads } = (await signRes.json()) as {
        uploads: { path: string; signedUrl: string; token: string; publicUrl: string }[];
      };

      // 2. Upload files directly to Supabase Storage
      for (let i = 0; i < images.length; i++) {
        const u = uploads[i];
        const putRes = await fetch(u.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": images[i].file.type },
          body: images[i].file,
        });
        if (!putRes.ok) throw new Error(`Upload failed for image ${i + 1}`);
      }

      // 3. Create prompt row
      const createRes = await fetch("/api/prompts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description,
          prompt_text: promptText,
          price_sol: price,
          category_id: categoryId,
          platform_ids: platformIds,
          image_urls: uploads.map((u) => u.publicUrl),
        }),
      });
      if (!createRes.ok) throw new Error((await createRes.json()).error ?? "Create failed");
      const { prompt_id } = (await createRes.json()) as { prompt_id: string };

      toast.success("Prompt published!");
      router.push(`/prompt/${prompt_id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!authenticated) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Sign in to upload a prompt.</p>
          <Button onClick={() => login()}>Sign in</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Images */}
      <div>
        <Label className="mb-2 block">Images ({images.length}/{PROMPT_LIMITS.images.max})</Label>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border">
              <Image src={img.preview} alt="" fill sizes="200px" className="object-cover" unoptimized />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 transition-transform hover:scale-110"
              >
                <X className="h-3 w-3" />
              </button>
              {i === 0 && (
                <div className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-[10px]">
                  Cover
                </div>
              )}
            </div>
          ))}
          {images.length < PROMPT_LIMITS.images.max && (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Upload className="h-5 w-5" />
              Add image
            </button>
          )}
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Max {PROMPT_LIMITS.imageSizeMB}MB each · PNG, JPG, WEBP · First image is the cover.
        </p>
      </div>

      {/* Title */}
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={PROMPT_LIMITS.title.max}
          placeholder="e.g. Golden-hour cinematic portrait"
        />
        <p className="mt-1 text-xs text-muted-foreground">{title.length}/{PROMPT_LIMITS.title.max}</p>
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description (public)</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={PROMPT_LIMITS.description.max}
          rows={3}
          placeholder="A short description buyers will see before purchasing."
        />
        <p className="mt-1 text-xs text-muted-foreground">{description.length}/{PROMPT_LIMITS.description.max}</p>
      </div>

      {/* Prompt text */}
      <div>
        <Label htmlFor="prompt">Prompt text (locked)</Label>
        <Textarea
          id="prompt"
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          maxLength={PROMPT_LIMITS.promptText.max}
          rows={8}
          placeholder="The full prompt buyers will receive after paying."
          className="font-mono"
        />
        <p className="mt-1 text-xs text-muted-foreground">{promptText.length}/{PROMPT_LIMITS.promptText.max}</p>
      </div>

      {/* Category */}
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

      {/* Platforms */}
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

      {/* Price */}
      <div>
        <Label htmlFor="price">Price in SOL (0 for free)</Label>
        <Input
          id="price"
          type="number"
          min="0"
          max={PROMPT_LIMITS.price.max}
          step="0.0001"
          value={priceSol}
          onChange={(e) => setPriceSol(e.target.value)}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          You receive 80%. Minimum paid price: 0.0001 SOL. Free prompts can&apos;t be rated.
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Publishing…
          </>
        ) : (
          "Publish prompt"
        )}
      </Button>
    </form>
  );
}
