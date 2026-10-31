"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root> & {
    tone?: "brand" | "success" | "critical";
  }
>(({ className, tone = "brand", ...props }, ref) => {
  const on =
    tone === "success"
      ? "data-[state=checked]:bg-success"
      : tone === "critical"
        ? "data-[state=checked]:bg-critical"
        : "data-[state=checked]:bg-brand";
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-[20px] w-[34px] shrink-0 cursor-pointer items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1 focus-visible:ring-offset-canvas disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-surface-3",
        on,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[15px] data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  );
});
Switch.displayName = "Switch";
