'use client';

import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { removeChannelAction, syncChannelAction } from '@/app/admin/channels/actions';
import type { Channel } from '@/lib/admin-api';

export function ChannelTable({ channels }: { channels: Channel[] }) {
  const [pending, setPending] = useState<string | null>(null);

  async function handleSync(id: string) {
    setPending(id);
    await syncChannelAction(id);
    setPending(null);
  }

  async function handleDelete(id: string) {
    await removeChannelAction(id);
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Slack ID</TableHead>
          <TableHead>Last Sync</TableHead>
          <TableHead>Messages</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {channels.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No channels configured. Add one to start tracking.
            </TableCell>
          </TableRow>
        ) : (
          channels.map((ch) => (
            <TableRow key={ch.id}>
              <TableCell className="font-medium">{ch.name}</TableCell>
              <TableCell className="font-mono text-sm">{ch.id}</TableCell>
              <TableCell>
                {ch.lastSyncAt ? new Date(ch.lastSyncAt).toLocaleString() : 'Never'}
              </TableCell>
              <TableCell>{ch.messageCount}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => handleSync(ch.id)} disabled={pending === ch.id}>
                  {pending === ch.id ? 'Syncing...' : 'Sync'}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">Remove</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove channel?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will stop tracking #{ch.name}. Existing messages will be kept.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(ch.id)}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
