/**
 * UI string dictionaries. Add a key to BOTH `en` and `tr` (TypeScript will
 * complain if you forget). Used via `useT()` from `@/lib/i18n/provider`.
 */
export const dictionaries = {
  en: {
    // Navbar
    "nav.explore": "Explore",
    "nav.create": "Create",
    "nav.signIn": "Sign in",
    "nav.loading": "Loading…",
    "nav.dashboard": "Dashboard",
    "nav.favorites": "Favorites",
    "nav.profile": "My profile",
    "nav.logout": "Log out",
    "nav.search": "Search",
    "nav.searchPlaceholder": "Search prompts, styles, creators…",

    // Dashboard
    "dashboard.overview": "Overview",
    "dashboard.myListings": "My listings",
    "dashboard.myLibrary": "My library",
    "dashboard.earnings": "Earnings",
    "dashboard.settings": "Settings",
    "dashboard.newPrompt": "New prompt",
    "dashboard.empty.listings": "You haven't uploaded any prompts yet.",
    "dashboard.empty.library": "Prompts you purchase or unlock will appear here.",
    "dashboard.empty.favorites":
      "You haven't favorited any prompts yet. Tap the heart on any prompt to save it here.",
    "dashboard.myFavorites": "My favorites",

    // Theme + Locale
    "theme.toggle": "Toggle theme",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "locale.switch": "Switch language",

    // Homepage hero
    "home.badge": "Curated AI image prompts · Pay-per-prompt in SOL",
    "home.title.1": "Find the prompt behind the image",
    "home.title.2": "you love.",
    "home.subtitle":
      "Browse images, tap any one to unlock the exact prompt that produced it. No subscriptions — pay only for what you want.",
    "home.cta.browse": "Browse prompts",
    "home.advancedFilters": "Advanced filters",
    "home.browseByStyle": "Browse by style",
    "home.sellTitle": "Sell your own prompts",
    "home.sellSubtitle": "80% to creators · 20% platform · paid instantly on-chain",
    "home.startSelling": "Start selling",
    "home.empty": "No prompts yet — check back soon.",

    // Filters / chips
    "filter.newest": "Newest",
    "filter.trending": "Trending",
    "filter.topRated": "Top rated",
    "filter.all": "All",
    "filter.free": "Free",
    "filter.paid": "Paid",
    "filter.allCategories": "All categories",

    // Explore
    "explore.title": "Explore",
    "explore.subtitle": "Discover prompts from creators across the network.",
    "explore.search": "Search title or description…",
    "explore.clearSearch": "clear search",
    "explore.results.one": "result",
    "explore.results.many": "results",
    "explore.empty.search": "No prompts match",
    "explore.empty.filters": "No prompts match these filters.",
    "explore.supported": "Supported platforms",

    // Prompt card / favorites
    "card.noRatings": "No ratings",
    "card.clickEnlarge": "Click to enlarge",
    "card.openFullscreen": "Open fullscreen",
    "fav.add": "Add to favorites",
    "fav.remove": "Remove from favorites",
    "fav.favorite": "Favorite",
    "fav.favorited": "Favorited",

    // Prompt detail
    "detail.removed.title": "This prompt has been removed.",
    "detail.removed.owner":
      "It's no longer visible on the marketplace, but past buyers still have access.",
    "detail.removed.buyer":
      "It's no longer for sale, but you keep access because you previously purchased it.",
    "detail.stat.rating": "Rating",
    "detail.stat.favorites": "Favorites",
    "detail.stat.sales": "Sales",
    "detail.edit": "Edit",
    "detail.delete": "Delete",
    "detail.deleteConfirm": "Click again to confirm",
    "detail.prompt": "Prompt",
    "detail.copy": "Copy",
    "detail.copied": "Copied to clipboard.",
    "detail.unlockFree": "Unlock for free",
    "detail.signInToUnlock": "Sign in to unlock",
    "detail.unlockFor": "Unlock for",
    "detail.buyFor": "Buy for",
    "detail.processing": "Processing…",
    "detail.ownPrompt": "This is your prompt. Buyers see the prompt text only after purchasing.",
    "detail.yourRating": "Your rating",
    "detail.rateThis": "Rate this prompt",
    "detail.ratingHint": "You can change your rating anytime.",
    "detail.sales": "sales",

    // Footer
    "footer.tagline": "AI prompt marketplace, paid in Solana",
    "footer.sell": "Sell",

    // Common
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.savedToast": "Saved.",
    "common.somethingWrong": "Something went wrong.",
    "common.viewAll": "View all",
    "common.tabs.prompts": "Prompts",
    "common.tabs.favorites": "Favorites",
    "common.empty.noFavorites": "No favorites yet.",
    "common.empty.noPrompts": "No prompts yet.",
  },

  tr: {
    "nav.explore": "Keşfet",
    "nav.create": "Oluştur",
    "nav.signIn": "Giriş yap",
    "nav.loading": "Yükleniyor…",
    "nav.dashboard": "Panel",
    "nav.favorites": "Favoriler",
    "nav.profile": "Profilim",
    "nav.logout": "Çıkış",
    "nav.search": "Ara",
    "nav.searchPlaceholder": "Promt, stil, üretici ara…",

    "dashboard.overview": "Özet",
    "dashboard.myListings": "İlanlarım",
    "dashboard.myLibrary": "Kütüphanem",
    "dashboard.earnings": "Kazançlar",
    "dashboard.settings": "Ayarlar",
    "dashboard.newPrompt": "Yeni promt",
    "dashboard.empty.listings": "Henüz hiç promt yüklemedin.",
    "dashboard.empty.library": "Satın aldığın veya açtığın promtlar burada görünecek.",
    "dashboard.empty.favorites":
      "Henüz favorin yok. Beğendiğin bir promtun kalbine dokun, burada görünsün.",
    "dashboard.myFavorites": "Favorilerim",

    "theme.toggle": "Temayı değiştir",
    "theme.light": "Açık",
    "theme.dark": "Koyu",
    "locale.switch": "Dili değiştir",

    "home.badge": "Seçkin AI görsel promtları · SOL ile promt başına ödeme",
    "home.title.1": "Beğendiğin görselin",
    "home.title.2": "promtunu bul.",
    "home.subtitle":
      "Görselleri keşfet, beğendiğine tıkla ve onu üreten promtu satın al. Abonelik yok — yalnızca istediğin için ödersin.",
    "home.cta.browse": "Promtları gez",
    "home.advancedFilters": "Gelişmiş filtreler",
    "home.browseByStyle": "Stile göre gez",
    "home.sellTitle": "Kendi promtlarını sat",
    "home.sellSubtitle": "%80 üreticiye · %20 platforma · zincir üzerinde anlık ödeme",
    "home.startSelling": "Satışa başla",
    "home.empty": "Henüz promt yok — yakında tekrar bak.",

    "filter.newest": "En yeni",
    "filter.trending": "Trend",
    "filter.topRated": "En beğenilen",
    "filter.all": "Tümü",
    "filter.free": "Ücretsiz",
    "filter.paid": "Ücretli",
    "filter.allCategories": "Tüm kategoriler",

    "explore.title": "Keşfet",
    "explore.subtitle": "Ağdaki üreticilerden promtları keşfet.",
    "explore.search": "Başlık veya açıklamada ara…",
    "explore.clearSearch": "aramayı temizle",
    "explore.results.one": "sonuç",
    "explore.results.many": "sonuç",
    "explore.empty.search": "Eşleşen promt yok",
    "explore.empty.filters": "Bu filtrelere uyan promt yok.",
    "explore.supported": "Desteklenen platformlar",

    "card.noRatings": "Puan yok",
    "card.clickEnlarge": "Büyütmek için tıkla",
    "card.openFullscreen": "Tam ekran aç",
    "fav.add": "Favorilere ekle",
    "fav.remove": "Favorilerden çıkar",
    "fav.favorite": "Favorile",
    "fav.favorited": "Favorilendi",

    "detail.removed.title": "Bu promt kaldırıldı.",
    "detail.removed.owner":
      "Pazaryerinde artık görünmüyor, ancak önceki alıcılar erişimini koruyor.",
    "detail.removed.buyer":
      "Artık satışta değil, ancak daha önce satın aldığın için erişimin sürüyor.",
    "detail.stat.rating": "Puan",
    "detail.stat.favorites": "Favori",
    "detail.stat.sales": "Satış",
    "detail.edit": "Düzenle",
    "detail.delete": "Sil",
    "detail.deleteConfirm": "Onaylamak için tekrar tıkla",
    "detail.prompt": "Promt",
    "detail.copy": "Kopyala",
    "detail.copied": "Panoya kopyalandı.",
    "detail.unlockFree": "Ücretsiz aç",
    "detail.signInToUnlock": "Açmak için giriş yap",
    "detail.unlockFor": "Aç:",
    "detail.buyFor": "Satın al:",
    "detail.processing": "İşleniyor…",
    "detail.ownPrompt":
      "Bu senin promtun. Alıcılar promt metnini ancak satın aldıktan sonra görür.",
    "detail.yourRating": "Puanın",
    "detail.rateThis": "Bu promtu puanla",
    "detail.ratingHint": "Puanını istediğin zaman değiştirebilirsin.",
    "detail.sales": "satış",

    "footer.tagline": "Solana ile ödenen AI promt pazaryeri",
    "footer.sell": "Sat",

    "common.cancel": "İptal",
    "common.save": "Kaydet",
    "common.savedToast": "Kaydedildi.",
    "common.somethingWrong": "Bir şeyler ters gitti.",
    "common.viewAll": "Tümünü gör",
    "common.tabs.prompts": "Promtlar",
    "common.tabs.favorites": "Favoriler",
    "common.empty.noFavorites": "Henüz favori yok.",
    "common.empty.noPrompts": "Henüz promt yok.",
  },
} as const;

export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof typeof dictionaries["en"];

export const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
];

export const DEFAULT_LOCALE: Locale = "en";
