"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> & {
    variant?: "underline" | "pill";
  }
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      variant === "underline"
        ? "inline-flex h-10 items-center gap-4 border-b border-line"
        : "inline-flex items-center gap-1 rounded-[9px] border border-line bg-surface-2 p-1",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

/** Underline-style tab trigger (default). */
export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap text-[13px] font-medium text-muted outline-none transition-colors hover:text-ink",
      "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-brand after:opacity-0 after:transition-opacity",
      "data-[state=active]:text-ink data-[state=active]:after:opacity-100",
      "focus-visible:ring-2 focus-visible:ring-brand/40",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

/** Pill-style trigger (use inside a pill TabsList). */
export const TabPill = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12.5px] font-medium text-muted outline-none transition-all hover:text-ink data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_2px_rgba(16,24,40,0.06)] focus-visible:ring-2 focus-visible:ring-brand/40",
      className,
    )}
    {...props}
  />
));
TabPill.displayName = "TabPill";

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";
