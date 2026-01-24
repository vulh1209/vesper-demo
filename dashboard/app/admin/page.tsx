import { getJobStatus, getChannels } from '@/lib/admin-api';
import { JobStatusCard } from '@/components/admin/job-status-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [jobStatus, channels] = await Promise.all([getJobStatus(), getChannels()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Channels</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{channels.length}</p></CardContent>
        </Card>
        {jobStatus && <JobStatusCard status={jobStatus} />}
      </div>
    </div>
  );
}
