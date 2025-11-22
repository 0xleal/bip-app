import { ThemeToggle } from "./theme-toggle";

export function DashboardHeader() {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="mx-auto max-w-dashboard px-8 py-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground leading-tight">
              Build in Public
            </h1>
            <p className="mt-3 text-base text-muted-foreground leading-relaxed">
              Share your work, learnings, and discoveries
            </p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
