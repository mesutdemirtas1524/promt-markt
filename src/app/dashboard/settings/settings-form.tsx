"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { shortAddress } from "@/lib/utils";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/constants";
import type { User } from "@/lib/supabase/types";
import { WalletRecovery } from "@/components/wallet-recovery";
import { useRouter } from "next/navigation";
import { Loader2, Upload, Trash2 } from "lucide-react";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function SettingsForm({ user }: { user: User }) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function handleAvatarPick(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      toast.error("Use PNG, JPG, or WEBP");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("Avatar must be 2MB or smaller");
      return;
    }
    setUploadingAvatar(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Auth token missing");

      const signRes = await fetch("/api/user/avatar/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: file.name, type: file.type, size: file.size }),
      });
      if (!signRes.ok) throw new Error((await signRes.json()).error ?? "Could not sign upload");
      const { signedUrl, publicUrl } = (await signRes.json()) as {
        signedUrl: string;
        publicUrl: string;
      };

      const putRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error("Upload failed");

      setAvatarUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success("Photo ready — click Save changes to apply.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username,
          display_name: displayName,
          bio,
          avatar_url: avatarUrl ? avatarUrl.split("?")[0] : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      toast.success("Saved.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <Label className="mb-2 block">Profile photo</Label>
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full bg-muted">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No photo
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {avatarUrl ? "Change photo" : "Upload photo"}
                      </>
                    )}
                  </Button>
                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatarUrl(null)}
                      disabled={uploadingAvatar}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, or WEBP · Max 2MB</p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatarPick(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              maxLength={24}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Lowercase letters, numbers, and underscore. 3–24 chars.
            </p>
          </div>
          <div>
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={60}
            />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
            />
            <p className="mt-1 text-xs text-muted-foreground">{bio.length}/280</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-6">
          <Label>Solana wallet</Label>
          {user.wallet_address ? (
            <div className="rounded-md bg-tint-1 px-3 py-2 font-mono text-xs">
              {shortAddress(user.wallet_address, 8)}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No wallet yet. Connect one via the Privy login menu to receive payments.
            </p>
          )}
        </CardContent>
      </Card>

      <WalletRecovery variant="card" />

      <Button type="submit" disabled={saving || uploadingAvatar}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
