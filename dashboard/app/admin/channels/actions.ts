'use server';

import { revalidatePath } from 'next/cache';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

export async function addChannelAction(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;

  const res = await fetch(`${API_BASE}/api/admin/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });

  if (!res.ok) {
    const data = await res.json();
    return { error: data.error || 'Failed to add channel' };
  }

  revalidatePath('/admin/channels');
  return { ok: true };
}

export async function removeChannelAction(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/channels/${id}`, { method: 'DELETE' });

  if (res.status === 409) {
    return { error: 'Cannot delete channel with messages' };
  }
  if (!res.ok) {
    return { error: 'Failed to remove channel' };
  }

  revalidatePath('/admin/channels');
  return { ok: true };
}

export async function syncChannelAction(id: string) {
  const res = await fetch(`${API_BASE}/api/admin/channels/${id}/sync`, { method: 'POST' });
  const data = await res.json();

  revalidatePath('/admin/channels');
  return data;
}
