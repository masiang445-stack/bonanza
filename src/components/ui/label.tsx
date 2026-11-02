import * as React from "react";
import { cn } from "@/lib/cn";

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-sm font-medium text-fg", className)}
      {...props}
    />
  );
}

export { Label };
