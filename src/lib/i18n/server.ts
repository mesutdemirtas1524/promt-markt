import "server-only";
import { dictionaries, DEFAULT_LOCALE, type Locale, type TranslationKey } from "./dictionaries";

/**
 * Server-side translation helper. Always returns the default locale so
 * server components stay statically renderable (cookies() would opt the
 * route into dynamic mode and defeat ISR).
 *
 * Pages that depend on per-user data are still dynamic — they can use
 * this for the static body text but get the default language. The
 * client-side `useT()` swaps chrome (navbar, buttons, lightbox, etc.)
 * to the user's preferred locale after hydration.
 *
 * For full translated body text on cached pages we'd need to either
 * route under [locale]/ or wrap each translated string in a small
 * client component — both are larger refactors planned separately.
 */
export async function getServerT() {
  const locale: Locale = DEFAULT_LOCALE;
  return {
    locale,
    t: (key: TranslationKey) => dictionaries[locale][key],
  };
}
