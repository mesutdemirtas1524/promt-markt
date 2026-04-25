import "server-only";
import { cookies } from "next/headers";
import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";
import {
  verifyAccessToken,
  verifyIdentityToken,
  type VerifyAccessTokenResponse,
} from "@privy-io/node";
import { createSupabaseServiceClient } from "./supabase/server";
import type { User } from "./supabase/types";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PRIVY_VERIFICATION_KEY = process.env.PRIVY_VERIFICATION_KEY; // optional SPKI string from dashboard

// JWKS endpoint — Privy publishes the verification key set per app here.
let jwksGetKey: JWTVerifyGetKey | null = null;
function getVerificationKey(): string | JWTVerifyGetKey | null {
  if (!PRIVY_APP_ID) return null;
  if (PRIVY_VERIFICATION_KEY) return PRIVY_VERIFICATION_KEY;
  if (!jwksGetKey) {
    jwksGetKey = createRemoteJWKSet(
      new URL(`https://auth.privy.io/api/v1/apps/${PRIVY_APP_ID}/jwks.json`)
    );
  }
  return jwksGetKey;
}

/**
 * Reject tokens that have expired. `verifyAccessToken` already throws on `exp`
 * via the underlying jose library, but we keep an explicit check here as
 * defense-in-depth in case the library upgrades silently change behavior.
 */
function assertNotExpired(payload: VerifyAccessTokenResponse) {
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.expiration === "number" && payload.expiration < nowSec) {
    throw new Error("Token expired");
  }
}

/**
 * Resolve the currently signed-in user from the Privy identity-token cookie
 * and return the matching row from our `users` table (null if not signed in
 * or if Privy isn't configured).
 */
export async function getCurrentUser(): Promise<User | null> {
  const appId = PRIVY_APP_ID;
  const verificationKey = getVerificationKey();
  if (!appId || !verificationKey) return null;

  const cookieStore = await cookies();
  const idToken = cookieStore.get("privy-id-token")?.value ?? null;
  const accessToken = cookieStore.get("privy-token")?.value ?? null;

  let privyId: string | null = null;

  // Identity token → user object (preferred when available)
  if (idToken) {
    try {
      const user = await verifyIdentityToken({
        identity_token: idToken,
        app_id: appId,
        verification_key: verificationKey,
      });
      privyId = user.id;
    } catch {
      privyId = null;
    }
  }

  // Fall back to access token if identity token is missing/invalid
  if (!privyId && accessToken) {
    try {
      const payload = await verifyAccessToken({
        access_token: accessToken,
        app_id: appId,
        verification_key: verificationKey,
      });
      assertNotExpired(payload);
      privyId = payload.user_id;
    } catch {
      privyId = null;
    }
  }

  if (!privyId) return null;

  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("users").select("*").eq("privy_id", privyId).maybeSingle();
  return (data as User) ?? null;
}

/**
 * Verify a Privy access token from an Authorization: Bearer header.
 * Returns the Privy user ID, or null if invalid/expired.
 */
export async function verifyPrivyToken(token: string): Promise<string | null> {
  const appId = PRIVY_APP_ID;
  const verificationKey = getVerificationKey();
  if (!appId || !verificationKey) return null;
  try {
    const payload = await verifyAccessToken({
      access_token: token,
      app_id: appId,
      verification_key: verificationKey,
    });
    assertNotExpired(payload);
    return payload.user_id;
  } catch {
    return null;
  }
}
