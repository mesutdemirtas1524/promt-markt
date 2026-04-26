import Link from "next/link";
import Image from "next/image";
import { APP_NAME } from "@/lib/constants";
import { getServerT } from "@/lib/i18n/server";

export async function Footer() {
  const { t } = await getServerT();
  return (
    <footer className="mt-32 border-t border-border">
      <div className="flex w-full flex-col items-start justify-between gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center lg:px-10 xl:px-16">
        <div className="flex items-center gap-2.5">
          <Image src="/pm-logo.svg" alt={APP_NAME} width={22} height={22} className="opacity-80" />
          <span className="text-sm font-medium tracking-tight">{APP_NAME}</span>
          <span className="ml-1 text-xs text-muted-foreground">· {t("footer.tagline")}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <Link href="/explore" className="transition-colors hover:text-foreground">
            {t("nav.explore")}
          </Link>
          <Link href="/new" className="transition-colors hover:text-foreground">
            New arrivals
          </Link>
          <Link href="/creators" className="transition-colors hover:text-foreground">
            Top creators
          </Link>
          <Link href="/upload" className="transition-colors hover:text-foreground">
            {t("footer.sell")}
          </Link>
          <Link href="/legal/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
          <Link href="/legal/refund" className="transition-colors hover:text-foreground">
            Refunds
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
