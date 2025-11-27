"use client";

import { signOut, useSession } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { LogOut, Sparkles } from "lucide-react";

export function DashboardHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-semibold tracking-tight text-foreground">
                Build in Public
              </h1>
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            {session?.user && (
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-border/50">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={session.user.image || ""}
                      alt={session.user.name || ""}
                    />
                    <AvatarFallback className="text-xs">
                      {session.user.name?.charAt(0) ||
                        session.user.github_username?.charAt(0) ||
                        "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col">
                    <span className="text-sm font-medium text-foreground leading-tight">
                      {session.user.name || session.user.github_username}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      @{session.user.github_username}
                    </span>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  title="Sign out"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
