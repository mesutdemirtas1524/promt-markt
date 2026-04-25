import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-white/[0.05]">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center">
        <div className="flex items-center gap-2.5">
          <Image src="/pm-logo.svg" alt={APP_NAME} width={22} height={22} className="opacity-80" />
          <span className="text-sm font-medium tracking-tight">{APP_NAME}</span>
          <span className="ml-1 text-xs text-muted-foreground">
            · AI prompt marketplace, paid in Solana
          </span>
        </div>
        <div className="flex items-center gap-5 text-xs text-muted-foreground">
          <Link href="/explore" className="transition-colors hover:text-foreground">
            Explore
          </Link>
          <Link href="/upload" className="transition-colors hover:text-foreground">
            Sell
          </Link>
          <a
            href="https://github.com/mesutdemirtas1524/promt-markt"
            className="transition-colors hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
