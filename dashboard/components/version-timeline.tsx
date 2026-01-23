import type { AssetDetailResult } from '@/lib/api';

interface VersionTimelineProps {
  versions: AssetDetailResult['versions'];
}

export function VersionTimeline({ versions }: VersionTimelineProps) {
  return (
    <div className="space-y-4">
      {versions.map((version, i) => (
        <div
          key={`${version.version}-${version.createdAt}`}
          className="flex items-start gap-4 pb-4 border-b last:border-0"
        >
          <div className="w-16 font-mono font-bold text-primary">
            v{version.version}
          </div>
          <div className="flex-1">
            <p className="font-medium">
              {version.authorName || 'Unknown'}
            </p>
            <p className="text-sm text-muted-foreground">
              {new Date(version.createdAt).toLocaleDateString('vi-VN', {
                dateStyle: 'medium',
              })}
            </p>
          </div>
          {version.slackPermalink && (
            <a
              href={version.slackPermalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View in Slack
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
