"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card role="alert" className="border-destructive/30">
      <CardHeader>
        <CardTitle className="text-base">Couldn&apos;t load the dashboard</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Something went wrong reading from Supabase or the cache. Try again in
          a moment.
        </p>
        <Button variant="outline" size="sm" onClick={reset}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
