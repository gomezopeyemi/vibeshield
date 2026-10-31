import { cn } from "@/lib/utils";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-line-strong bg-surface px-1 font-mono text-[10.5px] font-medium text-muted shadow-[0_1px_0_rgba(16,24,40,0.04)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
