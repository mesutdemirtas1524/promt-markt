"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Home, Compass, Plus, Bell, User as UserIcon } from "lucide-react";
import Image from "next/image";

/**
 * Mobile-only bottom navigation. The center Create slot is a raised pill
 * to draw the eye toward the supply-side action. Visible only below the
 * `md` breakpoint; desktop continues to use the top navbar.
 *
 * The wrapper accounts for the iOS home-indicator safe area; pages get
 * matching bottom padding via the `pb-bottom-nav` utility on <body>.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { authenticated, login, ready } = usePrivy();
  const { dbUser } = useCurrentUser();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass-strong md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex h-14 w-full items-center justify-around px-2">
        <NavItem href="/" label="Home" active={isActive("/")}>
          <Home className="h-5 w-5" />
        </NavItem>
        <NavItem href="/explore" label="Explore" active={isActive("/explore")}>
          <Compass className="h-5 w-5" />
        </NavItem>

        {/* Center Create — raised pill */}
        <Link
          href={authenticated ? "/upload" : "#"}
          aria-label="Create prompt"
          onClick={(e) => {
            if (!authenticated) {
              e.preventDefault();
              if (ready) login();
            }
          }}
          className="-mt-5 grid h-12 w-12 place-items-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 ring-4 ring-background transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </Link>

        {authenticated ? (
          <>
            <NavItem
              href="/dashboard/notifications"
              label="Inbox"
              active={isActive("/dashboard/notifications")}
            >
              <Bell className="h-5 w-5" />
            </NavItem>
            <NavItem
              href={dbUser ? `/u/${dbUser.username}` : "/dashboard"}
              label="Me"
              active={
                Boolean(dbUser && pathname === `/u/${dbUser.username}`) ||
                Boolean(pathname?.startsWith("/dashboard"))
              }
            >
              {dbUser?.avatar_url ? (
                <span className="relative block h-6 w-6 overflow-hidden rounded-full ring-1 ring-border">
                  <Image
                    src={dbUser.avatar_url}
                    alt=""
                    fill
                    sizes="24px"
                    className="object-cover"
                  />
                </span>
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </NavItem>
          </>
        ) : (
          <>
            <NavItem href="/legal/terms" label="About" active={pathname?.startsWith("/legal") ?? false}>
              <Bell className="h-5 w-5" />
            </NavItem>
            <button
              type="button"
              onClick={() => ready && login()}
              aria-label="Sign in"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] tracking-wide text-muted-foreground"
            >
              <UserIcon className="h-5 w-5" />
              <span>Sign in</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  children,
  active,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={
        "flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[10px] tracking-wide transition-colors " +
        (active ? "text-foreground" : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}
