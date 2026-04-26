import { ImageResponse } from "next/og";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { formatSol } from "@/lib/utils";

export const runtime = "nodejs";
export const alt = "Prompt on Promt Markt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const supabase = createSupabaseServiceClient();
  const { data: prompt } = await supabase
    .from("prompts")
    .select(
      `id, title, price_sol,
       creator:users!creator_id ( username, display_name, avatar_url ),
       images:prompt_images ( image_url, position )`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!prompt) {
    return new ImageResponse(<FallbackCard />, size);
  }

  const creator = Array.isArray(prompt.creator) ? prompt.creator[0] : prompt.creator;
  const imgs = ((prompt.images ?? []) as { image_url: string; position: number }[]).sort(
    (a, b) => a.position - b.position
  );
  const cover = imgs[0]?.image_url ?? null;
  const price = Number(prompt.price_sol);
  const priceLabel = price === 0 ? "FREE" : `${formatSol(price)} SOL`;
  const creatorName = creator?.display_name ?? `@${creator?.username ?? "creator"}`;
  const creatorHandle = creator?.username ? `@${creator.username}` : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0a0a0c",
          position: "relative",
        }}
      >
        {cover && (
          // Cover fills the canvas; we lay a vertical gradient on top so text
          // is always legible regardless of image colour
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "saturate(1.05)",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10,10,12,0.15) 0%, rgba(10,10,12,0.55) 55%, rgba(10,10,12,0.95) 100%)",
            display: "flex",
          }}
        />
        {/* Top-right brand mark */}
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 44,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 18px",
            borderRadius: 999,
            background: "rgba(10,10,12,0.55)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "white",
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: -0.3,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "linear-gradient(135deg,#a78bfa,#8b5cf6)",
            }}
          />
          Promt Markt
        </div>

        {/* Bottom content stack */}
        <div
          style={{
            position: "absolute",
            left: 56,
            right: 56,
            bottom: 48,
            display: "flex",
            flexDirection: "column",
            color: "white",
          }}
        >
          {/* Price chip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              alignSelf: "flex-start",
              padding: "10px 18px",
              borderRadius: 999,
              background:
                price === 0
                  ? "linear-gradient(135deg,#10b981,#059669)"
                  : "linear-gradient(135deg,#a78bfa,#7c3aed)",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 0.3,
              marginBottom: 18,
            }}
          >
            {priceLabel}
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -1.2,
              maxWidth: 1080,
              textShadow: "0 2px 24px rgba(0,0,0,0.55)",
            }}
          >
            {truncate(prompt.title, 90)}
          </div>

          {/* Creator row */}
          <div
            style={{
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 24,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            {creator?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatar_url}
                width={48}
                height={48}
                alt=""
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  objectFit: "cover",
                  border: "2px solid rgba(255,255,255,0.25)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.12)",
                  border: "2px solid rgba(255,255,255,0.2)",
                  display: "flex",
                }}
              />
            )}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontWeight: 600 }}>{creatorName}</span>
              {creatorHandle && creatorName !== creatorHandle && (
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 20 }}>
                  {creatorHandle}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}

function FallbackCard() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#0a0a0c 0%, #1a1325 100%)",
        color: "white",
        fontSize: 56,
        fontWeight: 700,
        letterSpacing: -1,
      }}
    >
      Promt Markt
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
