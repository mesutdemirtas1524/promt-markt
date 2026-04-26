import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

/**
 * /explore is now home. Preserve any incoming query so old shared
 * links keep their filter state through the redirect.
 */
export default async function ExploreRedirect({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) params.set(k, v);
  }
  const qs = params.toString();
  redirect(qs ? `/?${qs}` : "/");
}
