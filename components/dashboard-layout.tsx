import { ReactNode } from "react";
import { DashboardHeader } from "./dashboard-header";
import { Toaster } from "@/components/ui/sonner";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-6 lg:px-8 py-8 lg:py-12">
        <div className="animate-fade-in">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/30 mt-auto">
        <div className="mx-auto max-w-5xl px-6 lg:px-8 py-6">
          <p className="text-sm text-muted-foreground text-center">
            Share your work, learnings, and discoveries
          </p>
        </div>
      </footer>

      <Toaster />
    </div>
  );
}
