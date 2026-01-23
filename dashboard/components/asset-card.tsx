import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AssetQueryResult } from '@/lib/api';

interface AssetCardProps {
  asset: AssetQueryResult;
}

export function AssetCard({ asset }: AssetCardProps) {
  return (
    <Link href={`/assets/${asset.id}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="truncate">{asset.name}</span>
            {asset.category && (
              <Badge variant="secondary" className="ml-2 shrink-0">
                {asset.category}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Latest: v{asset.latestVersion || '?'}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
