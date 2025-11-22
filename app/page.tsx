import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
            GitHub Activity
          </h2>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your commits, PRs, reviews, and stars will appear here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Coming soon: Connect your GitHub account to see your activity
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
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
              <p className="text-sm text-muted-foreground">
                Coming soon: Add your own notes and learnings
              </p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">
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
              <p className="text-sm text-muted-foreground">
                Coming soon: Generate shareable content from your work
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </DashboardLayout>
  );
}
