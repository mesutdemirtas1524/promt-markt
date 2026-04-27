"use client";

import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { Search, Plus, LogOut, Heart, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useSolPrice, solToUsdString } from "@/hooks/use-sol-price";
import { useT } from "@/lib/i18n/provider";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { NotificationsBell } from "./notifications-bell";
import { SolLogo } from "./sol-logo";

function formatSolBalance(sol: number): string {
  if (sol >= 100) return sol.toFixed(2);
  if (sol >= 1) return sol.toFixed(3);
  return sol.toFixed(4);
}

export function Navbar() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { dbUser } = useCurrentUser();
  const { usd } = useSolPrice();
  const balance = useSolBalance(dbUser?.wallet_address);
  const router = useRouter();
  const { t } = useT();

  const balanceUsd = balance !== null ? solToUsdString(balance, usd) : "";
  const [searchValue, setSearchValue] = useState("");

  function submitSearch(next: string) {
    const trimmed = next.trim();
    router.push(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/");
  }

  return (
    <header className="sticky top-0 z-40 w-full glass-strong">
      <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:h-[72px] sm:px-6 lg:px-10 xl:px-16">
        <div className="flex items-center gap-6 lg:gap-8">
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/pm-logo.svg"
              alt="Promt Markt"
              width={34}
              height={34}
              priority
              className="transition-transform duration-300 group-hover:rotate-[-8deg]"
            />
            <span className="hidden text-[16px] font-semibold tracking-tight sm:block">
              Promt Markt
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm lg:flex">
            <Link
              href="/new"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-tint-2 hover:text-foreground"
            >
              New
            </Link>
            <Link
              href="/creators"
              className="rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-tint-2 hover:text-foreground"
            >
              Creators
            </Link>
          </nav>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch(searchValue);
          }}
          className="relative block min-w-0 flex-1 max-w-xl"
          role="search"
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t("nav.searchPlaceholder")}
            className="h-10 w-full rounded-full border border-border bg-tint-1 pl-10 pr-9 text-sm tracking-tight outline-none transition-all placeholder:text-muted-foreground/70 focus:border-violet-400/40 focus:bg-tint-2 focus:ring-2 focus:ring-violet-500/15"
            aria-label={t("nav.search")}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => {
                setSearchValue("");
                submitSearch("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:bg-tint-3 hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <LocaleSwitcher />

          {ready && authenticated ? (
            <>
              <Link href="/upload" className="ml-1 hidden md:inline-flex">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("nav.create")}</span>
                </Button>
              </Link>

              <div className="hidden md:inline-flex">
                <NotificationsBell />
              </div>

              <Link href="/dashboard/favorites">
                <Button variant="ghost" size="icon" aria-label={t("nav.favorites")} className="h-9 w-9">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>

              {dbUser?.wallet_address && balance !== null && (
                <div className="hidden rounded-lg border border-border bg-tint-1 px-2.5 py-1 text-right text-[11px] leading-tight md:block">
                  <div className="inline-flex items-center gap-1 font-semibold tabular-nums text-foreground">
                    <SolLogo className="h-2.5 w-2.5" />
                    {formatSolBalance(balance)} <span className="opacity-60">SOL</span>
                  </div>
                  {balanceUsd && (
                    <div className="text-[10px] tabular-nums text-muted-foreground">{balanceUsd}</div>
                  )}
                </div>
              )}

              {dbUser && (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-tint-2"
                  aria-label={t("nav.dashboard")}
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-tint-2 ring-1 ring-border">
                    {dbUser.avatar_url && (
                      <Image
                        src={dbUser.avatar_url}
                        alt={dbUser.display_name ?? dbUser.username}
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="hidden min-w-0 max-w-[140px] flex-col text-left leading-tight pr-1 sm:flex">
                    <span className="truncate text-[12px] font-medium text-foreground">
                      {dbUser.display_name ?? `@${dbUser.username}`}
                    </span>
                    {dbUser.display_name && (
                      <span className="truncate text-[10px] text-muted-foreground">
                        @{dbUser.username}
                      </span>
                    )}
                  </div>
                </Link>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                aria-label={t("nav.logout")}
                className="h-9 w-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => login()} disabled={!ready} variant="primary" size="sm" className="ml-1">
              {ready ? t("nav.signIn") : t("nav.loading")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
