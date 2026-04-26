import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/navbar";
import { BottomNav } from "@/components/bottom-nav";
import { Footer } from "@/components/footer";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Distinctive font for prompt text — not the generic mono used elsewhere.
// Visually says "this is the prompt content".
const jetBrainsMono = JetBrains_Mono({
  variable: "--font-prompt",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://promtmarkt.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: {
    icon: "/pm-logo.svg",
  },
  openGraph: {
    siteName: APP_NAME,
    type: "website",
    url: SITE_URL,
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: [{ url: "/pm-logo.svg", width: 512, height: 512, alt: APP_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/pm-logo.svg"],
  },
};

/**
 * Inline init script. Runs synchronously before React hydrates so the
 * page paints in the right theme + lang from the get-go (no flash).
 * Reads pm-theme and pm-locale cookies.
 */
const initScript = `
(function() {
  try {
    var ck = document.cookie || "";
    var t = ck.match(/(?:^|;\\s*)pm-theme=([^;]+)/);
    var l = ck.match(/(?:^|;\\s*)pm-locale=([^;]+)/);
    var theme = t ? decodeURIComponent(t[1]) : "dark";
    var locale = l ? decodeURIComponent(l[1]) : "en";
    var de = document.documentElement;
    if (theme === "dark") de.classList.add("dark");
    else de.classList.remove("dark");
    de.lang = locale === "tr" ? "tr" : "en";
  } catch (e) { /* noop */ }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Default to lang="en" + dark for SSR/static cache. The init script
    // below adjusts both before paint based on the user's cookies.
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${jetBrainsMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans pb-16 md:pb-0">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
