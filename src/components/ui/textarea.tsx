import * as React from "react";
import { cn } from "@/lib/cn";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-fg shadow-[var(--shadow-border)] outline-none transition-[box-shadow,border-color] duration-150 placeholder:text-subtle focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-primary/25 disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
