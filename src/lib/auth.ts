import "server-only";
import { cookies } from "next/headers";
import { PrivyClient } from "@privy-io/server-auth";
import { createSupabaseServiceClient } from "./supabase/server";
import type { User } from "./supabase/types";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const privyAppSecret = process.env.PRIVY_APP_SECRET;

let privyClient: PrivyClient | null = null;
function getPrivy(): PrivyClient | null {
  if (!privyAppId || !privyAppSecret) return null;
  if (!privyClient) privyClient = new PrivyClient(privyAppId, privyAppSecret);
  return privyClient;
}

/**
 * Resolve the currently signed-in user from the Privy identity-token cookie
 * and return the matching row from our `users` table (null if not signed in
 * or if Privy isn't configured).
 */
export async function getCurrentUser(): Promise<User | null> {
  const privy = getPrivy();
  if (!privy) return null;

  const cookieStore = await cookies();
  const idToken =
    cookieStore.get("privy-id-token")?.value ??
    cookieStore.get("privy-token")?.value ??
    null;
  if (!idToken) return null;

  let privyId: string | null = null;
  try {
    const user = await privy.getUser({ idToken });
    privyId = user.id;
  } catch {
    try {
      const verified = await privy.verifyAuthToken(idToken);
      privyId = verified.userId;
    } catch {
      return null;
    }
  }
  if (!privyId) return null;

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("users").select("*").eq("privy_id", privyId).maybeSingle();
  return (data as User) ?? null;
}

/**
 * Verify a Privy access token from an Authorization: Bearer header.
 * Returns the Privy user ID, or null if invalid.
 */
export async function verifyPrivyToken(token: string): Promise<string | null> {
  const privy = getPrivy();
  if (!privy) return null;
  try {
    const verified = await privy.verifyAuthToken(token);
    return verified.userId;
  } catch {
    return null;
  }
}
