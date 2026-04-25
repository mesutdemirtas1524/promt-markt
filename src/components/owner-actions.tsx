"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

export function OwnerActions({ promptId }: { promptId: string }) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 4000);
      return;
    }
    setBusy(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/prompts/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt_id: promptId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Delete failed");
      toast.success("Prompt removed.");
      router.push("/dashboard/listings");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <Button
      type="button"
      variant={confirming ? "destructive" : "outline"}
      onClick={handleDelete}
      disabled={busy}
      className="flex-1 gap-1.5"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {confirming ? t("detail.deleteConfirm") : t("detail.delete")}
    </Button>
  );
}
