const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Channel {
  id: string;
  name: string;
  lastSyncTs: string | null;
  lastSyncAt: string | null;
  messageCount: number;
}

export interface JobCounts {
  wait: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface SchedulerStatus {
  scheduled: boolean;
  pattern: string | null;
  nextRun: string | null;
}

export interface JobStatus {
  counts: JobCounts;
  scheduler: SchedulerStatus;
  isPaused: boolean;
}

export async function getChannels(): Promise<Channel[]> {
  const res = await fetch(`${API_BASE}/api/admin/channels`, { cache: 'no-store' });
  const data = await res.json();
  return data.ok ? data.data : [];
}

export async function addChannel(id: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });
  return res.json();
}

export async function removeChannel(id: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/channels/${id}`, { method: 'DELETE' });
  if (res.status === 204) return { ok: true };
  return res.json();
}

export async function triggerChannelSync(channelId: string): Promise<{ ok: boolean; jobId?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/channels/${channelId}/sync`, { method: 'POST' });
  return res.json();
}

export async function getJobStatus(): Promise<JobStatus | null> {
  const res = await fetch(`${API_BASE}/api/admin/jobs/status`, { cache: 'no-store' });
  const data = await res.json();
  return data.ok ? data.data : null;
}

export async function triggerScrape(): Promise<{ ok: boolean; jobId?: string }> {
  const res = await fetch(`${API_BASE}/api/admin/jobs/trigger`, { method: 'POST' });
  return res.json();
}
