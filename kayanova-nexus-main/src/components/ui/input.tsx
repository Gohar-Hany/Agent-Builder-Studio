import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border bg-card px-3 py-1 text-sm font-medium shadow-xs transition-colors",
          "placeholder:text-muted-foreground/40 placeholder:font-normal",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "text-start rtl:text-right",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
