import { getCurrentUser } from "@/lib/auth";
import { DashboardGate } from "./dashboard-gate";
import { DashboardTabs } from "./dashboard-tabs";

export const dynamic = "force-dynamic";

const tabs = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/listings", label: "My listings" },
  { href: "/dashboard/purchases", label: "My library" },
  { href: "/dashboard/favorites", label: "Favorites" },
  { href: "/dashboard/earnings", label: "Earnings" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-7 text-3xl font-semibold tracking-tight">Dashboard</h1>
      <DashboardGate hasUser={Boolean(user)} />
      <DashboardTabs tabs={tabs} />
      {user ? children : null}
    </div>
  );
}
