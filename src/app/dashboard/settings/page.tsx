import { getCurrentUser } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div>
      <h2 className="mb-6 text-lg font-semibold">Settings</h2>
      <SettingsForm user={user} />
    </div>
  );
}
