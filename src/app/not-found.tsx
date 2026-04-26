import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-border bg-tint-1">
        <Compass className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or was removed.
      </p>
      <div className="mt-7 flex gap-3">
        <Link href="/">
          <Button variant="primary">Browse prompts</Button>
        </Link>
        <Link href="/creators">
          <Button variant="outline">Top creators</Button>
        </Link>
      </div>
    </div>
  );
}
