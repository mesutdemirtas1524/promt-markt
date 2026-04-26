import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PLATFORM_WALLET } from "@/lib/constants";
import { BackfillUI } from "./backfill-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Backfill image dims" };

export default async function BackfillPage() {
  const user = await getCurrentUser();
  if (!user || user.wallet_address !== PLATFORM_WALLET) {
    redirect("/");
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Backfill image dimensions</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        One-time admin task. Loads each image without stored width/height in the browser, reads the
        intrinsic dimensions, and writes them back. Refresh-safe — picks up where it left off.
      </p>
      <div className="mt-6">
        <BackfillUI />
      </div>
    </div>
  );
}
