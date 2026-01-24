import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { JobStatus } from '@/lib/admin-api';

export function JobStatusCard({ status }: { status: JobStatus }) {
  return (
    <>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Queue Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Badge variant="outline">{status.counts.wait} waiting</Badge>
            <Badge variant="secondary">{status.counts.active} active</Badge>
            {status.counts.failed > 0 && <Badge variant="destructive">{status.counts.failed} failed</Badge>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Next Scrape</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {status.scheduler.nextRun
              ? new Date(status.scheduler.nextRun).toLocaleString()
              : 'Not scheduled'}
          </p>
        </CardContent>
      </Card>
    </>
  );
}
