import Link from "next/link";

export const dynamic = "force-static";
export const revalidate = 86400;

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full px-4 py-14 sm:px-6 lg:px-10 xl:px-16">
      <nav className="mb-8 flex flex-wrap gap-1 border-b border-border text-sm">
        <LegalTab href="/legal/terms">Terms</LegalTab>
        <LegalTab href="/legal/privacy">Privacy</LegalTab>
        <LegalTab href="/legal/refund">Refunds</LegalTab>
      </nav>
      <article className="prose-legal">{children}</article>
    </div>
  );
}

function LegalTab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2.5 tracking-tight text-muted-foreground transition-colors hover:text-foreground"
    >
      {children}
    </Link>
  );
}
