import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { DashboardGate } from "./dashboard-gate";

const tabs = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/listings", label: "My listings" },
  { href: "/dashboard/purchases", label: "My library" },
  { href: "/dashboard/earnings", label: "Earnings" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>
      <DashboardGate hasUser={Boolean(user)} />
      <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="whitespace-nowrap border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {user ? children : null}
    </div>
  );
}
