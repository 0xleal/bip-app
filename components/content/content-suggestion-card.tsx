"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import type { ContentSuggestion } from "@/lib/ai/types";
import { toast } from "sonner";

interface ContentSuggestionCardProps {
  suggestion: ContentSuggestion;
  index: number;
}

const formatLabels: Record<string, string> = {
  "short-post": "Short Post",
  thread: "Thread",
  "code-snippet": "Code Snippet",
  til: "TIL",
  "before-after": "Before/After",
};

const toneIcons: Record<string, string> = {
  conversational: "💬",
  technical: "⚙️",
  reflective: "🤔",
};

export function ContentSuggestionCard({
  suggestion,
  index,
}: ContentSuggestionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Format the content for copying
      let content = `${suggestion.hook}\n\n${suggestion.body}`;
      if (suggestion.optional) {
        content += `\n\n${suggestion.optional}`;
      }

      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("Copied to clipboard!");

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base font-medium">
            Suggestion {index + 1}
          </CardTitle>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground">
              {formatLabels[suggestion.format] || suggestion.format}
            </span>
            <span className="px-2 py-1 rounded-md bg-muted">
              {toneIcons[suggestion.tone] || ""} {suggestion.tone}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Hook
            </p>
            <p className="text-base font-medium text-foreground leading-relaxed">
              {suggestion.hook}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Body
            </p>
            <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
              {suggestion.body}
            </p>
          </div>

          {suggestion.optional && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Additional Context
              </p>
              <div className="p-3 rounded-md bg-muted/50 border border-border/50">
                <p className="text-sm text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                  {suggestion.optional}
                </p>
              </div>
            </div>
          )}
        </div>

        <Button
          onClick={handleCopy}
          variant="outline"
          className="w-full"
          disabled={copied}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
