import { getChannels } from '@/lib/admin-api';
import { ChannelTable } from '@/components/admin/channel-table';
import { AddChannelDialog } from '@/components/admin/add-channel-dialog';

export const dynamic = 'force-dynamic';

export default async function ChannelsPage() {
  const channels = await getChannels();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Channels</h1>
        <AddChannelDialog />
      </div>
      <ChannelTable channels={channels} />
    </div>
  );
}
