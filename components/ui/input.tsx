import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl",
          "border border-border bg-background",
          "px-4 py-2 text-sm",
          "shadow-[0_1px_2px_0_rgb(0_0_0/0.02),inset_0_1px_2px_0_rgb(0_0_0/0.02)]",
          "transition-all duration-200 ease-out",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/60",
          "hover:border-border/80 hover:shadow-[0_2px_4px_0_rgb(0_0_0/0.03)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/50",
          "focus-visible:shadow-[0_0_0_3px_rgb(218_119_86/0.1)]",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
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
