import { Globe } from "lucide-react";
import type { SocialLinks } from "@/lib/supabase/types";

/**
 * Render small icon links for a user's socials. Accepts free-form
 * input (handle, @handle, full URL) and normalises to a real URL.
 *
 * Lucide dropped most brand icons for trademark reasons, so brand
 * marks are inline SVG below.
 */
export function SocialLinksRow({ links }: { links: SocialLinks | null | undefined }) {
  if (!links) return null;

  const items: { key: keyof SocialLinks; href: string | null; Icon: (p: { className?: string }) => React.ReactNode; label: string }[] = [
    { key: "twitter", href: toTwitterUrl(links.twitter), Icon: TwitterIcon, label: "Twitter / X" },
    { key: "instagram", href: toInstagramUrl(links.instagram), Icon: InstagramIcon, label: "Instagram" },
    { key: "tiktok", href: toTikTokUrl(links.tiktok), Icon: TikTokIcon, label: "TikTok" },
    { key: "youtube", href: toYouTubeUrl(links.youtube), Icon: YouTubeIcon, label: "YouTube" },
    { key: "discord", href: toDiscordUrl(links.discord), Icon: DiscordIcon, label: "Discord" },
    { key: "github", href: toGithubUrl(links.github), Icon: GithubIcon, label: "GitHub" },
    { key: "website", href: toWebsiteUrl(links.website), Icon: ({ className }) => <Globe className={className} />, label: "Website" },
  ];

  const visible = items.filter((i) => i.href);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map(({ key, href, Icon, label }) => (
        <a
          key={key}
          href={href!}
          target="_blank"
          rel="noreferrer"
          aria-label={label}
          title={label}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-tint-1 text-muted-foreground transition-colors hover:bg-tint-2 hover:text-foreground"
        >
          <Icon className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}

// --- Inline brand icons (lucide doesn't ship these) ----------------------

function TwitterIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.86l-5.37-7.02L4.6 22H1.34l8.04-9.18L1 2h7.03l4.85 6.41L18.24 2Zm-1.2 18h1.9L7.05 4H5.05l11.99 16Z" />
    </svg>
  );
}

function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82a4.6 4.6 0 0 1-3.7-1.82h-2.6v11.27a2.78 2.78 0 0 1-2.78 2.78 2.78 2.78 0 1 1 2.78-2.78v-3.05a5.83 5.83 0 1 0 5.85 5.83V9.36a7.65 7.65 0 0 0 4.45 1.42V8.18a4.6 4.6 0 0 1-4-2.36Z" />
    </svg>
  );
}

function YouTubeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M23.5 7.1c-.3-1-1.1-1.8-2.1-2.1C19.5 4.5 12 4.5 12 4.5s-7.5 0-9.4.5c-1 .3-1.8 1.1-2.1 2.1C0 9 0 12 0 12s0 3 .5 4.9c.3 1 1.1 1.8 2.1 2.1 1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5c1-.3 1.8-1.1 2.1-2.1.5-1.9.5-4.9.5-4.9s0-3-.5-4.9ZM9.6 15.6V8.4l6.4 3.6-6.4 3.6Z" />
    </svg>
  );
}

function DiscordIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19.74 5.5a16.4 16.4 0 0 0-4.06-1.27.06.06 0 0 0-.07.03c-.18.32-.37.74-.51 1.07a15.13 15.13 0 0 0-4.55 0 10.6 10.6 0 0 0-.52-1.07.07.07 0 0 0-.07-.03c-1.4.24-2.74.66-4.06 1.27a.06.06 0 0 0-.03.02C2.16 9.46 1.46 13.3 1.81 17.1a.07.07 0 0 0 .03.05 16.6 16.6 0 0 0 4.99 2.52.07.07 0 0 0 .07-.02c.39-.53.73-1.09 1.03-1.68a.07.07 0 0 0-.04-.1 11 11 0 0 1-1.56-.74.07.07 0 0 1 0-.12l.31-.24a.07.07 0 0 1 .07 0 11.85 11.85 0 0 0 10.07 0 .07.07 0 0 1 .07 0l.31.24a.07.07 0 0 1 0 .12c-.5.3-1.02.55-1.56.74a.07.07 0 0 0-.04.1c.31.59.65 1.15 1.03 1.68a.07.07 0 0 0 .07.02 16.6 16.6 0 0 0 5-2.52.07.07 0 0 0 .03-.05c.41-4.4-.73-8.21-3.06-11.58a.06.06 0 0 0-.03-.02ZM8.68 14.81c-.99 0-1.81-.91-1.81-2.03s.81-2.03 1.81-2.03c1 0 1.82.92 1.81 2.03 0 1.12-.81 2.03-1.81 2.03Zm6.65 0c-.99 0-1.81-.91-1.81-2.03s.81-2.03 1.81-2.03c1 0 1.82.92 1.81 2.03 0 1.12-.81 2.03-1.81 2.03Z" />
    </svg>
  );
}

function GithubIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.79 23.4c.6.1.82-.26.82-.58v-2.05c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.85 1.24 1.85 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.39 1.24-3.23-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.3-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.58A12 12 0 0 0 12 .3" />
    </svg>
  );
}

// --- URL normalisers ------------------------------------------------------

function clean(s?: string): string | null {
  if (!s) return null;
  return s.trim() || null;
}

function looksLikeUrl(s: string): boolean {
  return /^https?:\/\//i.test(s);
}

function toTwitterUrl(s?: string): string | null {
  const v = clean(s);
  if (!v) return null;
  if (looksLikeUrl(v)) return v;
  return `https://twitter.com/${v.replace(/^@/, "")}`;
}

function toInstagramUrl(s?: string): string | null {
  const v = clean(s);
  if (!v) return null;
  if (looksLikeUrl(v)) return v;
  return `https://instagram.com/${v.replace(/^@/, "")}`;
}

function toTikTokUrl(s?: string): string | null {
  const v = clean(s);
  if (!v) return null;
  if (looksLikeUrl(v)) return v;
  return `https://tiktok.com/@${v.replace(/^@/, "")}`;
}

function toYouTubeUrl(s?: string): string | null {
  const v = clean(s);
  if (!v) return null;
  if (looksLikeUrl(v)) return v;
  return `https://youtube.com/${v.startsWith("@") ? v : `@${v}`}`;
}

function toDiscordUrl(s?: string): string | null {
  const v = clean(s);
  if (!v) return null;
  if (looksLikeUrl(v)) return v;
  if (/^[a-zA-Z0-9-]{4,12}$/.test(v)) return `https://discord.gg/${v}`;
  return null;
}

function toGithubUrl(s?: string): string | null {
  const v = clean(s);
  if (!v) return null;
  if (looksLikeUrl(v)) return v;
  return `https://github.com/${v.replace(/^@/, "")}`;
}

function toWebsiteUrl(s?: string): string | null {
  const v = clean(s);
  if (!v) return null;
  if (looksLikeUrl(v)) return v;
  return `https://${v}`;
}
