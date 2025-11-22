import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6 leading-tight">
            GitHub Activity
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your commits, PRs, reviews, and stars will appear here
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-base text-muted-foreground leading-relaxed">
                Coming soon: Connect your GitHub account to see your activity
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button>Connect GitHub</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Delete</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator className="opacity-30" />

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6 leading-tight">
            Manual Notes
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Learnings & Discoveries</CardTitle>
              <CardDescription>
                Add notes about what you&apos;re learning and discovering
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base text-muted-foreground leading-relaxed">
                Coming soon: Add your own notes and learnings
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator className="opacity-30" />

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-6 leading-tight">
            Generated Content
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Share Your Work</CardTitle>
              <CardDescription>
                AI-generated content suggestions based on your activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-base text-muted-foreground leading-relaxed">
                Coming soon: Generate shareable content from your work
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
