import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-muted/60",
        "animate-pulse",
        "relative overflow-hidden",
        "after:absolute after:inset-0",
        "after:bg-gradient-to-r after:from-transparent after:via-background/40 after:to-transparent",
        "after:animate-[shimmer_2s_infinite]",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
