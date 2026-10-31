"use client";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
      <EmptyState
        icon="AlertTriangle"
        tone="critical"
        title="Something went wrong"
        description={error.digest ? `The page failed to load (reference ${error.digest}).` : "The page failed to load."}
        action={<Button variant="primary" onClick={reset}>Try again</Button>}
      />
    </div>
  );
}
