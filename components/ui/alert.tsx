import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  [
    "relative w-full rounded-xl border px-4 py-4 text-sm",
    "[&>svg+div]:translate-y-[-3px]",
    "[&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
    "[&>svg~*]:pl-7",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-muted/30 border-border/50 text-foreground",
          "[&>svg]:text-muted-foreground",
        ].join(" "),
        destructive: [
          "bg-destructive/5 border-destructive/20 text-destructive",
          "dark:bg-destructive/10 dark:border-destructive/30",
          "[&>svg]:text-destructive",
        ].join(" "),
        success: [
          "bg-green-50 border-green-200/50 text-green-800",
          "dark:bg-green-950/30 dark:border-green-800/30 dark:text-green-300",
          "[&>svg]:text-green-600 dark:[&>svg]:text-green-400",
        ].join(" "),
        warning: [
          "bg-amber-50 border-amber-200/50 text-amber-800",
          "dark:bg-amber-950/30 dark:border-amber-800/30 dark:text-amber-300",
          "[&>svg]:text-amber-600 dark:[&>svg]:text-amber-400",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1.5 font-medium leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
