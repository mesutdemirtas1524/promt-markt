import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PLATFORM_WALLET } from "@/lib/constants";
import { ReportsQueue } from "./reports-queue";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation queue" };

export default async function AdminReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.wallet_address !== PLATFORM_WALLET) {
    redirect("/");
  }
  return (
    <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-16">
      <h1 className="text-2xl font-semibold tracking-tight">Moderation queue</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        User-flagged prompts. Remove takes the prompt off the marketplace
        (past buyers keep access). Dismiss closes the report without action.
      </p>
      <div className="mt-8">
        <ReportsQueue />
      </div>
    </div>
  );
}
