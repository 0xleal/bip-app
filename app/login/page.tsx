"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Github } from "lucide-react";

export default function LoginPage() {
  const handleSignIn = () => {
    signIn("github", { callbackUrl: "/" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-secondary)] p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-[var(--color-text-primary)]">
              Build in Public Tool
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Share your development work and learnings consistently
            </p>
          </div>

          <div className="space-y-4">
            <Button onClick={handleSignIn} size="lg" className="w-full gap-2">
              <Github className="h-5 w-5" />
              Sign in with GitHub
            </Button>

            <p className="text-sm text-[var(--color-text-tertiary)]">
              By signing in, you agree to sync your GitHub activity and generate
              shareable content
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
