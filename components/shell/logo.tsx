import { cn } from "@/lib/utils";

export function LogoMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path
        d="M16 2.5 5 6.4v8.1c0 6.6 4.5 12.3 11 14.1 6.5-1.8 11-7.5 11-14.1V6.4L16 2.5Z"
        fill="var(--brand)"
      />
      <path
        d="M16 2.5 5 6.4v8.1c0 6.6 4.5 12.3 11 14.1 6.5-1.8 11-7.5 11-14.1V6.4L16 2.5Z"
        fill="url(#lg)"
        fillOpacity="0.35"
      />
      <path
        d="M11 16.2l3.3 3.3L21 12.8"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="lg" x1="16" y1="2.5" x2="16" y2="28.6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        VibeShield
      </span>
    </div>
  );
}
