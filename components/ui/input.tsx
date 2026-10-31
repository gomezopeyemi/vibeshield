import * as React from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    icon?: IconName;
    invalid?: boolean;
    trailing?: React.ReactNode;
  }
>(({ className, icon, invalid, trailing, ...props }, ref) => (
  <div className="relative flex items-center">
    {icon && (
      <Icon
        name={icon}
        className="pointer-events-none absolute left-3 size-4 text-faint"
      />
    )}
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-[8px] border bg-surface text-[13.5px] text-ink shadow-[0_1px_2px_rgba(16,24,40,0.03)] outline-none transition-colors placeholder:text-faint",
        "focus:border-brand focus:ring-2 focus:ring-brand/15",
        "disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted",
        icon ? "pl-9" : "pl-3",
        trailing ? "pr-10" : "pr-3",
        invalid ? "border-critical focus:border-critical focus:ring-critical/15" : "border-line-strong",
        className,
      )}
      {...props}
    />
    {trailing && (
      <div className="absolute right-2 flex items-center">{trailing}</div>
    )}
  </div>
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-[8px] border border-line-strong bg-surface px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
