/**
 * Helpers for the Supabase image render endpoint. The render endpoint
 * resizes server-side and returns WebP automatically, which beats
 * downloading the raw image and resizing in the browser.
 *
 *   raw:    /storage/v1/object/public/<bucket>/<path>
 *   render: /storage/v1/render/image/public/<bucket>/<path>?width=600
 *
 * If the URL doesn't look like a Supabase storage URL we just return it
 * unchanged.
 */
export function renderImageUrl(
  rawUrl: string | null | undefined,
  opts: { width?: number; height?: number; quality?: number; resize?: "cover" | "contain" | "fill" } = {}
): string | null {
  if (!rawUrl) return null;
  const replaced = rawUrl.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  if (replaced === rawUrl) return rawUrl; // not a Supabase URL
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  if (opts.quality) params.set("quality", String(opts.quality));
  if (opts.resize) params.set("resize", opts.resize);
  const qs = params.toString();
  return qs ? `${replaced}?${qs}` : replaced;
}
