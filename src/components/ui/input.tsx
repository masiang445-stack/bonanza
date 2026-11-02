import * as React from "react";
import { cn } from "@/lib/cn";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow,border-color] duration-150 placeholder:text-subtle focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
