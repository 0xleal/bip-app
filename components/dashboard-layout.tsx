import { ReactNode } from "react";
import { DashboardHeader } from "./dashboard-header";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="mx-auto max-w-dashboard px-8 py-12">{children}</main>
    </div>
  );
}
