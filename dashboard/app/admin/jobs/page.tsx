import { getJobStatus, getRecentJobs, getHealth, triggerScrape } from '@/lib/admin-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

async function handleTriggerScrape() {
  'use server';
  await triggerScrape();
  revalidatePath('/admin/jobs');
}

export default async function JobsPage() {
  const [jobStatus, recentJobs, health] = await Promise.all([
    getJobStatus(),
    getRecentJobs(),
    getHealth(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Queue</h1>
        <form action={handleTriggerScrape}>
          <Button type="submit">Trigger Full Scrape</Button>
        </form>
      </div>

      {/* Health Status */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={health.status === 'healthy' ? 'default' : health.status === 'degraded' ? 'secondary' : 'destructive'}>
                {health.status.toUpperCase()}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Redis: {health.checks.redis.status} ({health.checks.redis.latencyMs ?? '?'}ms) |
                Database: {health.checks.database.status} ({health.checks.database.latencyMs ?? '?'}ms)
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Status */}
      {jobStatus && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Waiting</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{jobStatus.counts.wait}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Active</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{jobStatus.counts.active}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{jobStatus.counts.completed}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Failed</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{jobStatus.counts.failed}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Delayed</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{jobStatus.counts.delayed}</p></CardContent>
          </Card>
        </div>
      )}

      {/* Scheduler Info */}
      {jobStatus?.scheduler && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Scheduler</CardTitle>
            <CardDescription>
              {jobStatus.scheduler.scheduled
                ? `Cron: ${jobStatus.scheduler.pattern}`
                : 'No scheduler configured'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {jobStatus.scheduler.nextRun && (
              <p className="text-sm">
                Next run: {new Date(jobStatus.scheduler.nextRun).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Failed Jobs */}
      {recentJobs?.failed && recentJobs.failed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Recent Failures</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recentJobs.failed.map((job) => (
                <li key={job.id} className="text-sm border-l-2 border-red-500 pl-3 py-1">
                  <span className="font-mono">{job.id}</span>
                  <span className="text-muted-foreground ml-2">{job.name}</span>
                  {job.failedReason && (
                    <p className="text-red-600 text-xs mt-1">{job.failedReason}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Link to Bull Board */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            For detailed job management (retry, clean, view logs), use the{' '}
            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/queues`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Bull Board Dashboard
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
