import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-center">
        <div className="flex items-center gap-2">
          <Image src="/pm-logo.svg" alt={APP_NAME} width={28} height={28} />
          <span className="text-sm font-medium">{APP_NAME}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            AI prompt marketplace · paid in Solana
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link href="/explore" className="hover:text-foreground">Explore</Link>
          <Link href="/upload" className="hover:text-foreground">Sell</Link>
          <a href="https://github.com/mesutdemirtas1524/promt-markt" className="hover:text-foreground" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
