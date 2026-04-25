"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface server-side error digests to the browser console for debugging
    if (error.digest) console.error("Error digest:", error.digest);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center sm:px-6">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-border bg-tint-1">
        <AlertTriangle className="h-7 w-7 text-amber-400" />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        An unexpected error happened while loading this page.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-[10.5px] text-muted-foreground/70">
          ref: {error.digest}
        </p>
      )}
      <div className="mt-7 flex gap-3">
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
        <Link href="/">
          <Button variant="outline">Go home</Button>
        </Link>
      </div>
    </div>
  );
}
