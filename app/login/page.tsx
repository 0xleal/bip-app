"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Github, Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const handleSignIn = () => {
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent pointer-events-none" />

      <div className="relative w-full max-w-sm space-y-8">
        {/* Logo & Brand */}
        <div className="text-center space-y-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mx-auto">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-semibold text-foreground tracking-tight">
              Build in Public
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
              Turn your GitHub activity and learnings into shareable content
            </p>
          </div>
        </div>

        {/* Sign In Card */}
        <div className="bg-card rounded-2xl border border-border/40 p-6 shadow-[0_2px_8px_0_rgb(0_0_0/0.04)]">
          <div className="space-y-4">
            <Button
              onClick={handleSignIn}
              size="lg"
              className="w-full gap-3 h-12"
            >
              <Github className="h-5 w-5" />
              Continue with GitHub
              <ArrowRight className="h-4 w-4 ml-auto opacity-60" />
            </Button>

            <p className="text-xs text-center text-muted-foreground/70 leading-relaxed">
              We&apos;ll sync your GitHub activity to help you share your work
            </p>
          </div>
        </div>

        {/* Features Preview */}
        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { label: "Track Activity", icon: "📊" },
            { label: "AI Content", icon: "✨" },
            { label: "Share Work", icon: "🚀" },
          ].map((feature) => (
            <div
              key={feature.label}
              className="text-center space-y-1.5 p-3 rounded-xl bg-muted/30"
            >
              <span className="text-lg">{feature.icon}</span>
              <p className="text-xs text-muted-foreground font-medium">
                {feature.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-xs text-muted-foreground/50">
          Share your work, learnings, and discoveries
        </p>
      </div>
    </div>
  );
}
