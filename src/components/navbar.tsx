"use client";

import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { Search, Upload, LayoutDashboard, LogOut } from "lucide-react";
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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/pm-logo.svg" alt="Promt Markt" width={32} height={32} priority />
            <span className="hidden text-lg font-semibold tracking-tight sm:block">
              Promt Markt
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <Link href="/explore" className="text-muted-foreground transition-colors hover:text-foreground">
              Explore
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/explore")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>

          {ready && authenticated ? (
            <>
              <Link href="/upload">
                <Button variant="default" size="sm" className="gap-1.5">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Promt</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" aria-label="Dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>

              {dbUser?.wallet_address && balance !== null && (
                <div className="hidden rounded-md bg-muted px-2.5 py-1 text-right text-xs leading-tight md:block">
                  <div className="font-medium text-foreground">
                    {formatSolBalance(balance)} SOL
                  </div>
                  {balanceUsd && (
                    <div className="text-[10px] text-muted-foreground">{balanceUsd}</div>
                  )}
                </div>
              )}

              {dbUser && (
                <Link
                  href={`/u/${dbUser.username}`}
                  className="flex items-center gap-2 rounded-md p-1 transition-colors hover:bg-accent"
                  aria-label="My profile"
                >
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
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
                  <div className="hidden min-w-0 max-w-[140px] flex-col text-left leading-tight sm:flex">
                    <span className="truncate text-xs font-medium text-foreground">
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

              <Button variant="ghost" size="icon" onClick={() => logout()} aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => login()} disabled={!ready} size="sm">
              {ready ? "Sign in" : "Loading…"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
