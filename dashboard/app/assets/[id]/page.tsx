import { notFound } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VersionTimeline } from '@/components/version-timeline';
import { getAsset } from '@/lib/api';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AssetPage({ params }: PageProps) {
  const { id } = await params;
  const asset = await getAsset(id);

  if (!asset) {
    notFound();
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          &larr; Back to search
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-4">
          {asset.name}
          {asset.category && (
            <Badge variant="secondary">{asset.category}</Badge>
          )}
        </h1>
        <p className="text-muted-foreground mt-2">
          Latest version: {asset.latestVersion || 'N/A'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
        </CardHeader>
        <CardContent>
          {asset.versions.length > 0 ? (
            <VersionTimeline versions={asset.versions} />
          ) : (
            <p className="text-muted-foreground">No version history available.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
