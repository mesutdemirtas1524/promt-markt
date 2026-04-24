import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — server-only. Bypasses RLS.
 * Used for:
 *   - Privileged reads (e.g. full prompt row including prompt_text after verifying a purchase)
 *   - All writes (create user, create prompt, insert purchase, upsert rating)
 * Never expose the returned client to the browser.
 */
export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
