import type { MetadataRoute } from "next";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://promtmarkt.com").replace(/\/$/, "");

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createSupabaseServiceClient();

  const [
    { data: prompts },
    { data: users },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("prompts")
      .select("id, updated_at")
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabase.from("users").select("username, updated_at").limit(5000),
    supabase.from("categories").select("slug"),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "hourly", priority: 1.0 },
    { url: `${SITE_URL}/new`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/creators`, changeFrequency: "daily", priority: 0.7 },
  ];

  const promptRoutes: MetadataRoute.Sitemap = (prompts ?? []).map((p) => ({
    url: `${SITE_URL}/prompt/${p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at as string) : undefined,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const userRoutes: MetadataRoute.Sitemap = (users ?? []).map((u) => ({
    url: `${SITE_URL}/u/${u.username}`,
    lastModified: u.updated_at ? new Date(u.updated_at as string) : undefined,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${SITE_URL}/category/${c.slug}`,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticRoutes, ...promptRoutes, ...userRoutes, ...categoryRoutes];
}
