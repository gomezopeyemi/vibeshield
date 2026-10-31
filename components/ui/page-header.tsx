import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  badge,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-[19px] font-semibold tracking-tight text-ink">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
          {description && (
            <p className="text-[12.5px] text-muted">{description}</p>
          )}
        </div>
      </div>
      {actions}
    </div>
  );
}
