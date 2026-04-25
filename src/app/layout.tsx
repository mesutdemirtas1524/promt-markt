import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/dictionaries";
import type { Theme } from "@/lib/theme/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get("pm-theme")?.value;
  const localeCookie = cookieStore.get("pm-locale")?.value;
  const initialTheme: Theme = themeCookie === "light" ? "light" : "dark";
  const initialLocale: Locale = localeCookie === "tr" ? "tr" : DEFAULT_LOCALE;

  return (
    <html
      lang={initialLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased ${
        initialTheme === "dark" ? "dark" : ""
      }`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers initialTheme={initialTheme} initialLocale={initialLocale}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
