import { ImageResponse } from "next/og";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const alt = "Creator on Promt Markt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { username: string } }) {
  const supabase = createSupabaseServiceClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, username, display_name, bio, avatar_url, banner_url, follower_count")
    .eq("username", params.username)
    .maybeSingle();

  if (!user) {
    return new ImageResponse(<Fallback />, size);
  }

  const [{ count: promptCount }, { data: sales }] = await Promise.all([
    supabase
      .from("prompts")
      .select("id", { count: "exact", head: true })
      .eq("creator_id", user.id)
      .eq("status", "active"),
    supabase
      .from("prompts")
      .select("purchase_count")
      .eq("creator_id", user.id)
      .eq("status", "active"),
  ]);
  const totalSales = (sales ?? []).reduce(
    (s, r) => s + Number((r as { purchase_count?: number }).purchase_count ?? 0),
    0
  );

  const display = user.display_name ?? `@${user.username}`;
  const handle = `@${user.username}`;
  const bio = (user.bio ?? "").trim();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0c",
          position: "relative",
        }}
      >
        {/* Banner top half */}
        {user.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.banner_url}
            alt=""
            width={1200}
            height={300}
            style={{
              width: 1200,
              height: 300,
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 1200,
              height: 300,
              display: "flex",
              background:
                "radial-gradient(ellipse at 50% 100%, rgba(167,139,250,0.5), transparent 70%), #0f0a1a",
            }}
          />
        )}
        <div
          style={{
            position: "absolute",
            top: 240,
            left: 0,
            right: 0,
            height: 80,
            background: "linear-gradient(180deg, transparent, #0a0a0c)",
            display: "flex",
          }}
        />

        {/* Brand chip */}
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

        {/* Avatar overlapping the banner edge */}
        <div
          style={{
            position: "absolute",
            top: 220,
            left: 64,
            width: 168,
            height: 168,
            borderRadius: 999,
            background: "#1a1a1f",
            border: "6px solid #0a0a0c",
            display: "flex",
            overflow: "hidden",
          }}
        >
          {user.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt=""
              width={156}
              height={156}
              style={{ width: 156, height: 156, objectFit: "cover" }}
            />
          )}
        </div>

        {/* Identity */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            color: "white",
            position: "absolute",
            top: 410,
            left: 64,
            right: 64,
          }}
        >
          <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -1.2, display: "flex" }}>
            {truncate(display, 32)}
          </div>
          <div
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.55)",
              marginTop: 4,
              display: "flex",
            }}
          >
            {handle}
          </div>
          {bio && (
            <div
              style={{
                marginTop: 14,
                fontSize: 22,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.4,
                maxWidth: 1000,
                display: "flex",
              }}
            >
              {truncate(bio, 130)}
            </div>
          )}
        </div>

        {/* Stat strip bottom */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 64,
            right: 64,
            display: "flex",
            gap: 12,
          }}
        >
          <Stat label="Prompts" value={String(promptCount ?? 0)} />
          <Stat label="Sales" value={String(totalSales)} />
          <Stat label="Followers" value={String(user.follower_count ?? 0)} />
        </div>
      </div>
    ),
    size
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "12px 22px",
        borderRadius: 14,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, letterSpacing: 1.2 }}>
        {label.toUpperCase()}
      </span>
      <span style={{ color: "white", fontSize: 30, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function Fallback() {
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
