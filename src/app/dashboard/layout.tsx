import { getCurrentUser } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { DashboardGate } from "./dashboard-gate";
import { DashboardTabs } from "./dashboard-tabs";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const { t } = await getServerT();

  const tabs = [
    { href: "/dashboard", label: t("dashboard.overview") },
    { href: "/dashboard/following", label: "Following" },
    { href: "/dashboard/listings", label: t("dashboard.myListings") },
    { href: "/dashboard/purchases", label: t("dashboard.myLibrary") },
    { href: "/dashboard/favorites", label: t("nav.favorites") },
    { href: "/dashboard/earnings", label: t("dashboard.earnings") },
    { href: "/dashboard/settings", label: t("dashboard.settings") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-7 text-3xl font-semibold tracking-tight">
        {t("nav.dashboard")}
      </h1>
      <DashboardGate hasUser={Boolean(user)} />
      <DashboardTabs tabs={tabs} />
      {user ? children : null}
    </div>
  );
}
