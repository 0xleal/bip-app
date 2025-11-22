'use client';

import { signOut, useSession } from 'next-auth/react';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LogOut } from 'lucide-react';

export function DashboardHeader() {
  const { data: session } = useSession();

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
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {session?.user && (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
                  <AvatarFallback>
                    {session.user.name?.charAt(0) || session.user.github_username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-foreground">
                    {session.user.name || session.user.github_username}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{session.user.github_username}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  title="Sign out"
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
