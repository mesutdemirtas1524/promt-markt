import "server-only";
import { cookies } from "next/headers";
import { dictionaries, DEFAULT_LOCALE, type Locale, type TranslationKey } from "./dictionaries";

/**
 * Server-side translation helper. Reads the `pm-locale` cookie and returns
 * a `t(key)` function for the current request.
 */
export async function getServerT() {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("pm-locale")?.value;
  const locale: Locale = localeCookie === "tr" ? "tr" : DEFAULT_LOCALE;
  return {
    locale,
    t: (key: TranslationKey) => dictionaries[locale][key] ?? dictionaries[DEFAULT_LOCALE][key],
  };
}
