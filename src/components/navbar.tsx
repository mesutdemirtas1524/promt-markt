"use client";

import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { Search, Upload, LayoutDashboard, LogOut } from "lucide-react";
import { shortAddress } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function Navbar() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const router = useRouter();

  const solanaWallet = user?.linkedAccounts?.find(
    (a) => a.type === "wallet" && "chainType" in a && a.chainType === "solana"
  );
  const walletAddress =
    solanaWallet && "address" in solanaWallet ? (solanaWallet.address as string) : null;

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
                  <span className="hidden sm:inline">Upload</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="icon" aria-label="Dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>
              {walletAddress && (
                <span className="hidden rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground lg:inline">
                  {shortAddress(walletAddress)}
                </span>
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
