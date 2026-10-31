import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
      <EmptyState
        icon="Search"
        title="Page not found"
        description="That page doesn't exist or was moved."
        action={<Button asChild variant="primary"><Link href="/overview">Back to Overview</Link></Button>}
      />
    </div>
  );
}
