import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-48 lg:col-span-3" />
        <Skeleton className="h-48 lg:col-span-2" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}
