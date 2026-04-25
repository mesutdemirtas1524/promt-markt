"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Img = { id: string; image_url: string; position: number };

export function PromptGallery({ images, alt }: { images: Img[]; alt: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : (i + 1) % images.length));
  }, [images.length]);
  const prev = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length));
  }, [images.length]);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, next, prev]);

  return (
    <>
      <div className="space-y-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group relative block w-full overflow-hidden rounded-2xl border border-white/[0.07] bg-muted transition-colors hover:border-white/[0.15]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.image_url}
              alt={alt}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="block h-auto w-full"
            />
            <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <span className="rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] font-medium tracking-tight backdrop-blur">
                Click to enlarge
              </span>
            </div>
          </button>
        ))}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-white/10"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/60 text-white transition hover:bg-white/10"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs tabular-nums text-white/80 backdrop-blur">
                {openIndex + 1} / {images.length}
              </div>
            </>
          )}

          <div className="relative max-h-[92vh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[openIndex].image_url}
              alt={alt}
              className="block max-h-[92vh] max-w-[92vw] object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
