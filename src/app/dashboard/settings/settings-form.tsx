"use client";

import { useEffect, useRef, useState } from "react";
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
import { Loader2, Upload, Trash2, Check, X as XIcon } from "lucide-react";

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export function SettingsForm({ user }: { user: User }) {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const [username, setUsername] = useState(user.username);
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url ?? null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(user.banner_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [social, setSocial] = useState({
    twitter: user.social_links?.twitter ?? "",
    instagram: user.social_links?.instagram ?? "",
    website: user.social_links?.website ?? "",
    discord: user.social_links?.discord ?? "",
    youtube: user.social_links?.youtube ?? "",
    tiktok: user.social_links?.tiktok ?? "",
    github: user.social_links?.github ?? "",
  });
  const [emailPrefs, setEmailPrefs] = useState({
    sales: user.email_prefs?.sales !== false,
    tips: user.email_prefs?.tips !== false,
    follows: user.email_prefs?.follows !== false,
  });
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  // Live availability state for the username field
  type UsernameStatus = "idle" | "checking" | "ok" | "taken" | "format" | "self";
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("self");
  useEffect(() => {
    const u = username.trim().toLowerCase();
    if (u === user.username) {
      setUsernameStatus("self");
      return;
    }
    if (!/^[a-z0-9_]{3,24}$/.test(u)) {
      setUsernameStatus("format");
      return;
    }
    setUsernameStatus("checking");
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch(`/api/user/check-username?u=${encodeURIComponent(u)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const data = (await res.json()) as { available: boolean; reason?: string };
        if (cancelled) return;
        if (data.available) setUsernameStatus(data.reason === "self" ? "self" : "ok");
        else setUsernameStatus(data.reason === "format" ? "format" : "taken");
      } catch {
        if (!cancelled) setUsernameStatus("idle");
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, user.username, getAccessToken]);

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

  async function handleBannerPick(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
      toast.error("Use PNG, JPG, or WEBP");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Banner must be 4MB or smaller");
      return;
    }
    setUploadingBanner(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Auth token missing");
      const signRes = await fetch("/api/user/banner/sign", {
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
      setBannerUrl(`${publicUrl}?t=${Date.now()}`);
      toast.success("Banner ready — click Save changes to apply.");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploadingBanner(false);
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
          banner_url: bannerUrl ? bannerUrl.split("?")[0] : null,
          social_links: social,
          email_prefs: emailPrefs,
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

          {/* Banner */}
          <div>
            <Label className="mb-2 block">Profile banner</Label>
            <div className="space-y-2">
              <div className="relative aspect-[4/1] w-full overflow-hidden rounded-lg border border-border bg-tint-1">
                {bannerUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={bannerUrl}
                    alt="Banner"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    Banner appears at the top of your public profile.
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => bannerInput.current?.click()}
                  disabled={uploadingBanner}
                >
                  {uploadingBanner ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {bannerUrl ? "Change banner" : "Upload banner"}
                    </>
                  )}
                </Button>
                {bannerUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setBannerUrl(null)}
                    disabled={uploadingBanner}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </Button>
                )}
                <span className="self-center text-xs text-muted-foreground">
                  PNG, JPG, or WEBP · Max 4MB · 4:1 ratio looks best
                </span>
              </div>
              <input
                ref={bannerInput}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleBannerPick(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                maxLength={24}
                className="pr-9"
              />
              <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {(usernameStatus === "ok" || usernameStatus === "self") && (
                  <Check className="h-4 w-4 text-emerald-400" />
                )}
                {(usernameStatus === "taken" || usernameStatus === "format") && (
                  <XIcon className="h-4 w-4 text-red-400" />
                )}
              </div>
            </div>
            <p
              className={
                "mt-1 text-xs " +
                (usernameStatus === "taken"
                  ? "text-red-400"
                  : usernameStatus === "format"
                  ? "text-muted-foreground"
                  : usernameStatus === "ok"
                  ? "text-emerald-400"
                  : "text-muted-foreground")
              }
            >
              {usernameStatus === "taken" && "That username is already taken."}
              {usernameStatus === "ok" && "Available."}
              {usernameStatus === "self" && "Lowercase letters, numbers, and underscore. 3–24 chars."}
              {usernameStatus === "format" && "Lowercase letters, numbers, and underscore. 3–24 chars."}
              {usernameStatus === "checking" && "Checking…"}
              {usernameStatus === "idle" && "Lowercase letters, numbers, and underscore. 3–24 chars."}
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
        <CardContent className="space-y-3 p-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Social links</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown on your public profile. Just the username, full URL, or
              handle — we&apos;ll figure it out.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                { key: "twitter", label: "Twitter / X", placeholder: "@yourname" },
                { key: "instagram", label: "Instagram", placeholder: "@yourname" },
                { key: "tiktok", label: "TikTok", placeholder: "@yourname" },
                { key: "youtube", label: "YouTube", placeholder: "@yourchannel" },
                { key: "discord", label: "Discord", placeholder: "yourname or invite link" },
                { key: "github", label: "GitHub", placeholder: "yourname" },
                { key: "website", label: "Website", placeholder: "https://example.com" },
              ] as const
            ).map((field) => (
              <div key={field.key}>
                <Label htmlFor={`social-${field.key}`}>{field.label}</Label>
                <Input
                  id={`social-${field.key}`}
                  value={social[field.key]}
                  onChange={(e) =>
                    setSocial((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  maxLength={field.key === "website" ? 200 : 120}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Email notifications</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {user.email
                ? `We'll email ${user.email} when something on your account happens.`
                : "Add an email login in your wallet menu to receive these."}
            </p>
          </div>
          <div className="space-y-2">
            {(
              [
                { key: "sales", label: "New sales", hint: "When someone buys one of your prompts" },
                { key: "tips", label: "Tips", hint: "When someone sends you a tip" },
                { key: "follows", label: "New followers", hint: "When someone follows you" },
              ] as const
            ).map((p) => (
              <label
                key={p.key}
                className="flex items-start gap-3 rounded-md border border-border bg-tint-1 px-3 py-2.5 hover:bg-tint-2"
              >
                <input
                  type="checkbox"
                  checked={emailPrefs[p.key]}
                  onChange={(e) =>
                    setEmailPrefs((prev) => ({ ...prev, [p.key]: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 accent-violet-500"
                />
                <div>
                  <div className="text-sm">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">{p.hint}</div>
                </div>
              </label>
            ))}
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

      <Button
        type="submit"
        disabled={
          saving ||
          uploadingAvatar ||
          usernameStatus === "checking" ||
          usernameStatus === "taken" ||
          usernameStatus === "format"
        }
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
