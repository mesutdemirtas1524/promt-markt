"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardGate({ hasUser }: { hasUser: boolean }) {
  const { ready, authenticated, login } = usePrivy();
  if (hasUser) return null;

  return (
    <Card className="mb-8">
      <CardContent className="p-8 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          {ready && authenticated
            ? "Finalizing your account…"
            : "Sign in to access your dashboard."}
        </p>
        {!authenticated && (
          <Button onClick={() => login()} disabled={!ready}>
            Sign in
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
