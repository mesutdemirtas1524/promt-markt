"use client";

import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { Search, Plus, LayoutDashboard, LogOut, Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSolBalance } from "@/hooks/use-sol-balance";
import { useSolPrice, solToUsdString } from "@/hooks/use-sol-price";

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

  const balanceUsd = balance !== null ? solToUsdString(balance, usd) : "";

  return (
    <header className="sticky top-0 z-40 w-full glass-strong">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-7">
          <Link href="/" className="group flex items-center gap-2.5">
            <Image
              src="/pm-logo.svg"
              alt="Promt Markt"
              width={28}
              height={28}
              priority
              className="transition-transform duration-300 group-hover:rotate-[-8deg]"
            />
            <span className="hidden text-[15px] font-semibold tracking-tight sm:block">
              Promt Markt
            </span>
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Link
              href="/explore"
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
            >
              Explore
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => router.push("/explore")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground md:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {ready && authenticated ? (
            <>
              <Link href="/upload">
                <Button variant="primary" size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Create</span>
                </Button>
              </Link>

              <Link href="/dashboard/favorites">
                <Button variant="ghost" size="icon" aria-label="Favorites" className="h-9 w-9">
                  <Heart className="h-4 w-4" />
                </Button>
              </Link>

              <Link href="/dashboard">
                <Button variant="ghost" size="icon" aria-label="Dashboard" className="h-9 w-9">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>

              {dbUser?.wallet_address && balance !== null && (
                <div className="hidden rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-right text-[11px] leading-tight md:block">
                  <div className="font-semibold tabular-nums text-foreground">
                    {formatSolBalance(balance)} <span className="opacity-60">SOL</span>
                  </div>
                  {balanceUsd && (
                    <div className="text-[10px] tabular-nums text-muted-foreground">{balanceUsd}</div>
                  )}
                </div>
              )}

              {dbUser && (
                <Link
                  href={`/u/${dbUser.username}`}
                  className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-white/[0.04]"
                  aria-label="My profile"
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.05] ring-1 ring-white/10">
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
                aria-label="Log out"
                className="h-9 w-9"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => login()} disabled={!ready} variant="primary" size="sm">
              {ready ? "Sign in" : "Loading…"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
