import { ImageResponse } from "next/og";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

export const runtime = "nodejs";
export const alt = APP_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Mosaic of the 6 most-recent active cover images so the home card always
  // looks alive — beats a static logo for click-through.
  const supabase = createSupabaseServiceClient();
  const { data: covers } = await supabase
    .from("prompts")
    .select("id, prompt_images!inner(image_url, position)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(12);

  const urls: string[] = [];
  for (const row of covers ?? []) {
    const imgs = (row as { prompt_images: { image_url: string; position: number }[] })
      .prompt_images;
    const sorted = [...imgs].sort((a, b) => a.position - b.position);
    if (sorted[0]?.image_url) urls.push(sorted[0].image_url);
    if (urls.length >= 6) break;
  }
  // Pad with placeholders if the marketplace is empty so we still render
  while (urls.length < 6) urls.push("");

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
        {/* 3x2 mosaic */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {urls.map((u, i) => (
            <div
              key={i}
              style={{
                width: 400,
                height: 315,
                display: "flex",
                background: "#15151a",
                overflow: "hidden",
              }}
            >
              {u && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={u}
                  width={400}
                  height={315}
                  alt=""
                  style={{ width: 400, height: 315, objectFit: "cover" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Dark veil */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(10,10,12,0.55) 0%, rgba(10,10,12,0.78) 100%)",
            display: "flex",
          }}
        />

        {/* Centred title block */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            textAlign: "center",
            padding: "0 80px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.16)",
              fontSize: 22,
              fontWeight: 600,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: "linear-gradient(135deg,#a78bfa,#8b5cf6)",
              }}
            />
            {APP_NAME}
          </div>
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
              maxWidth: 1000,
              textShadow: "0 4px 32px rgba(0,0,0,0.7)",
              display: "flex",
              textAlign: "center",
            }}
          >
            Buy & sell AI image prompts
          </div>
          <div
            style={{
              marginTop: 22,
              fontSize: 28,
              color: "rgba(255,255,255,0.85)",
              maxWidth: 900,
              lineHeight: 1.3,
              display: "flex",
              textAlign: "center",
            }}
          >
            {APP_DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    size
  );
}
