"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github, PenLine, Sparkles } from "lucide-react";

function NotionIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.166V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.934m14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.45.327s0 .84-1.168.84l-3.22.186c-.094-.187 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM2.64 1.782l13.168-.933c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V3.32c0-.84.374-1.54 1.589-1.54z" />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Subtle warm gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/30 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </div>
          <span className="font-serif text-lg font-semibold tracking-tight">
            BIP
          </span>
        </div>
        <Link href="/login">
          <Button variant="ghost" size="sm" className="gap-2">
            Sign in
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex flex-col items-center justify-center px-6 lg:px-12 pt-16 lg:pt-24 pb-24">
        {/* Main content */}
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Tagline pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/[0.08] text-primary text-sm font-medium animate-fade-in">
            <Sparkles className="h-3.5 w-3.5" />
            Build in Public, effortlessly
          </div>

          {/* Headline */}
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-semibold text-foreground tracking-tight leading-[1.1] text-balance animate-slide-up">
            Your work speaks.
            <br />
            <span className="text-primary">Let it be heard.</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed animate-slide-up stagger-1">
            Connect your GitHub and Notion. We&apos;ll turn your commits, notes,
            and learnings into authentic social content.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 animate-slide-up stagger-2">
            <Link href="/login">
              <Button size="lg" className="gap-3 px-8 h-14 text-base">
                <Github className="h-5 w-5" />
                Start with GitHub
                <ArrowRight className="h-4 w-4 opacity-60" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Visual: The Flow */}
        <div className="mt-24 lg:mt-32 w-full max-w-xl mx-auto animate-slide-up stagger-3">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-5">
            {/* Sources */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex -space-x-2">
                <div className="relative z-30 flex h-11 w-11 items-center justify-center rounded-xl bg-card border border-border shadow-sm">
                  <Github className="h-5 w-5 text-foreground/70" />
                </div>
                <div className="relative z-20 flex h-11 w-11 items-center justify-center rounded-xl bg-card border border-border shadow-sm">
                  <NotionIcon className="h-5 w-5 text-foreground/70" />
                </div>
                <div className="relative z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-card border border-border shadow-sm">
                  <PenLine className="h-5 w-5 text-foreground/70" />
                </div>
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Your work
              </span>
            </div>

            {/* Arrow connector */}
            <div className="text-border">
              <ArrowRight className="h-5 w-5 rotate-90 sm:rotate-0" />
            </div>

            {/* Output */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="flex h-11 w-44 items-center rounded-xl bg-card border border-border shadow-sm px-3">
                  <p className="text-xs text-foreground/80 truncate">
                    Just shipped a new feature...
                  </p>
                </div>
                <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-primary" />
              </div>
              <span className="text-xs text-muted-foreground font-medium">
                Ready to share
              </span>
            </div>
          </div>

          {/* Caption */}
          <p className="text-center text-sm text-muted-foreground/60 mt-10">
            From commits to content in seconds
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30">
        <div className="px-6 lg:px-12 py-6 flex items-start justify-between">
          <p className="text-sm text-muted-foreground/50">
            Built for developers who ship
          </p>
        </div>
      </footer>
    </div>
  );
}
