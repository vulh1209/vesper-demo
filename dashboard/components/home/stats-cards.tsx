import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { DashboardStats } from '@/lib/api';

export function StatsCards({ totalAssets, lastSyncAt, recentAssets }: DashboardStats) {
  const formattedLastSync = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('vi-VN')
    : 'Never';

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Assets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{totalAssets}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last Sync
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{formattedLastSync}</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recent Updates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentAssets.length === 0 ? (
            <p className="text-muted-foreground text-sm">No recent updates</p>
          ) : (
            <ul className="space-y-2">
              {recentAssets.slice(0, 5).map((asset) => (
                <li key={asset.id}>
                  <Link
                    href={`/assets/${asset.id}`}
                    className="text-sm hover:underline"
                  >
                    <span className="font-medium">{asset.name}</span>
                    <span className="text-muted-foreground ml-2">v{asset.version}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
