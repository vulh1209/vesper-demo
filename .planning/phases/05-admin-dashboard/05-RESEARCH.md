# Phase 5: Admin Dashboard - Research

**Researched:** 2026-01-24
**Domain:** Admin UI, Job Queue Monitoring, Channel Management
**Confidence:** HIGH

## Summary

This research focuses on building an admin dashboard for Vesper that provides channel management, job queue monitoring, and system health visibility. The existing infrastructure includes:

- **Hono API server** with zValidator middleware (src/api/)
- **Next.js 16.1.4 dashboard** with shadcn/ui "new-york" style (dashboard/)
- **BullMQ job system** with scrapeQueue already configured (src/jobs/)
- **Channel config service** with CRUD operations (src/config/channels.ts)

The admin dashboard will extend the existing dashboard with new routes and API endpoints. The primary approach is to leverage existing patterns and add bull-board for job visualization, while building custom channel management UI with shadcn/ui components.

**Primary recommendation:** Use bull-board with HonoAdapter for job monitoring (minimal code, professional UI), and build channel management using existing shadcn/ui components (Table, Dialog, Button) with server actions for mutations.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | Dashboard framework | Already configured with App Router |
| shadcn/ui | latest | UI components | Already has Card, Badge, Button, Input |
| Hono | 4.11.5 | API server | Already serving /api routes |
| @hono/zod-validator | 0.7.6 | Request validation | Already used in assets routes |
| BullMQ | 5.66.7 | Job queue | Already configured with scrapeQueue |

### To Add
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @bull-board/api | 6.16.x | Job queue dashboard core | Official BullMQ dashboard solution |
| @bull-board/hono | 6.16.x | Hono adapter for bull-board | Native Hono integration |
| @tanstack/react-table | 8.x | Data table logic | shadcn/ui recommended for tables |

### shadcn/ui Components to Add
| Component | Purpose | Installation |
|-----------|---------|--------------|
| table | Channel list display | `pnpm dlx shadcn@latest add table` |
| dialog | Add/edit channel modals | `pnpm dlx shadcn@latest add dialog` |
| sidebar | Admin navigation | `pnpm dlx shadcn@latest add sidebar` |
| alert-dialog | Confirm delete actions | `pnpm dlx shadcn@latest add alert-dialog` |
| dropdown-menu | Actions menu | `pnpm dlx shadcn@latest add dropdown-menu` |
| skeleton | Loading states | `pnpm dlx shadcn@latest add skeleton` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| bull-board | Custom UI | More work, same functionality; bull-board is mature |
| @tanstack/react-table | Custom table | Table component alone works for simple lists |
| shadcn sidebar | Static nav | Sidebar provides collapsible, mobile-friendly navigation |

**Installation:**
```bash
# Backend
npm install @bull-board/api @bull-board/hono

# Dashboard (run in dashboard/)
cd dashboard
pnpm add @tanstack/react-table
pnpm dlx shadcn@latest add table dialog sidebar alert-dialog dropdown-menu skeleton
```

## Architecture Patterns

### Recommended Project Structure
```
src/api/
├── routes/
│   ├── index.ts           # Route composition (add admin routes)
│   ├── assets.ts          # Existing asset routes
│   ├── admin/
│   │   ├── channels.ts    # Channel CRUD endpoints
│   │   ├── jobs.ts        # Job queue status endpoints
│   │   └── health.ts      # System health endpoints
│   └── queue-dashboard.ts # Bull-board mount

dashboard/
├── app/
│   ├── admin/
│   │   ├── layout.tsx     # Admin layout with sidebar
│   │   ├── page.tsx       # Admin overview/dashboard
│   │   ├── channels/
│   │   │   └── page.tsx   # Channel management
│   │   └── jobs/
│   │       └── page.tsx   # Job queue status
│   └── ...existing pages
├── components/
│   ├── admin/
│   │   ├── channel-table.tsx
│   │   ├── channel-dialog.tsx
│   │   ├── job-status-card.tsx
│   │   └── admin-sidebar.tsx
│   └── ui/
│       └── ...existing + new shadcn components
└── lib/
    └── admin-api.ts       # Admin API client functions
```

### Pattern 1: Bull-Board Integration with Hono
**What:** Mount bull-board dashboard at /admin/queues
**When to use:** Job queue visualization and management
**Example:**
```typescript
// src/api/routes/queue-dashboard.ts
// Source: https://github.com/felixmosh/bull-board

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { HonoAdapter } from '@bull-board/hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { scrapeQueue } from '../../jobs/queue.js';

const serverAdapter = new HonoAdapter(serveStatic);
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(scrapeQueue)],
  serverAdapter,
});

export const queueDashboard = serverAdapter.registerPlugin();
```

### Pattern 2: Channel CRUD API with zValidator
**What:** Type-safe channel management endpoints
**When to use:** All admin mutations
**Example:**
```typescript
// src/api/routes/admin/channels.ts
// Source: Existing assets.ts pattern

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { addChannel, getConfiguredChannels } from '../../../config/channels.js';

const app = new Hono();

const addChannelSchema = z.object({
  id: z.string().regex(/^C[A-Z0-9]+$/, 'Invalid Slack channel ID format'),
  name: z.string().min(1).max(80),
});

app.get('/', async (c) => {
  const channels = await getConfiguredChannels();
  return c.json({ ok: true, data: channels });
});

app.post('/', zValidator('json', addChannelSchema), async (c) => {
  const { id, name } = c.req.valid('json');
  await addChannel(id, name);
  return c.json({ ok: true, data: { id, name } }, 201);
});

export default app;
```

### Pattern 3: BullMQ Queue Status API
**What:** Endpoint returning job counts by status
**When to use:** Dashboard status cards, health monitoring
**Example:**
```typescript
// src/api/routes/admin/jobs.ts
// Source: https://docs.bullmq.io/guide/jobs/getters

import { Hono } from 'hono';
import { scrapeQueue } from '../../../jobs/queue.js';
import { runScrapeNow, getSchedulerStatus } from '../../../jobs/daily-scrape.js';

const app = new Hono();

app.get('/status', async (c) => {
  const counts = await scrapeQueue.getJobCounts(
    'wait', 'active', 'completed', 'failed', 'delayed'
  );
  const scheduler = await getSchedulerStatus();

  return c.json({
    ok: true,
    data: {
      counts,
      scheduler,
      isPaused: await scrapeQueue.isPaused(),
    },
  });
});

app.post('/trigger', async (c) => {
  const jobId = await runScrapeNow();
  return c.json({ ok: true, data: { jobId } });
});

export default app;
```

### Pattern 4: Admin Layout with Sidebar Navigation
**What:** Shared layout for admin pages with sidebar
**When to use:** All /admin/* routes
**Example:**
```tsx
// dashboard/app/admin/layout.tsx
// Source: https://ui.shadcn.com/docs/components/sidebar

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <div className="flex items-center gap-2 p-4 border-b">
          <SidebarTrigger />
          <h1 className="font-semibold">Admin</h1>
        </div>
        <div className="p-4">{children}</div>
      </main>
    </SidebarProvider>
  );
}
```

### Pattern 5: Server Actions for Mutations (Next.js 16)
**What:** Server-side mutations with revalidation
**When to use:** Form submissions, trigger actions
**Example:**
```tsx
// dashboard/app/admin/channels/actions.ts
// Source: https://nextjs.org/docs/app/getting-started/updating-data

'use server';

import { revalidatePath } from 'next/cache';

const API_BASE = process.env.API_URL || 'http://localhost:3001';

export async function addChannel(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;

  const res = await fetch(`${API_BASE}/api/admin/channels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, name }),
  });

  if (!res.ok) {
    throw new Error('Failed to add channel');
  }

  revalidatePath('/admin/channels');
}

export async function triggerScrape(channelId?: string) {
  const res = await fetch(`${API_BASE}/api/admin/jobs/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channelIds: channelId ? [channelId] : undefined }),
  });

  if (!res.ok) {
    throw new Error('Failed to trigger scrape');
  }

  revalidatePath('/admin/jobs');
}
```

### Anti-Patterns to Avoid
- **Polling without cleanup:** Use useEffect cleanup or React Query for auto-refresh
- **No loading states:** Always show skeleton/spinner during async operations
- **Unvalidated mutations:** All POST/PUT/DELETE must use zValidator server-side
- **Direct DB access from Next.js:** Route through Hono API for consistency
- **Blocking UI on scrape:** Scrape should queue job and return immediately

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job queue dashboard | Custom React UI for jobs | bull-board | Handles retry, pause, clean, job details out of box |
| Data table with sorting | Manual sort logic | @tanstack/react-table | Pagination, sorting, filtering patterns built-in |
| Form validation | Manual if/else | zValidator + Zod | Type-safe, consistent error format |
| Confirmation dialogs | Custom modal | shadcn AlertDialog | Accessible, keyboard-friendly by default |
| Channel ID validation | Regex in handler | Zod schema | Reusable, self-documenting |
| Job status polling | setInterval | React Query or SWR | Handles cache, refetch, stale data |

**Key insight:** Admin UIs require many edge cases (loading, error, empty states, confirmations). Using established patterns reduces bugs and improves UX.

## Common Pitfalls

### Pitfall 1: Bull-Board Static Assets Not Loading
**What goes wrong:** 404 errors for bull-board CSS/JS files
**Why it happens:** serveStatic not configured correctly for Hono
**How to avoid:** Pass `serveStatic` from `@hono/node-server/serve-static` to HonoAdapter constructor
**Warning signs:** Blank page at /admin/queues, network tab shows 404s

### Pitfall 2: Slack Channel ID Format Validation
**What goes wrong:** Invalid channel IDs stored in database
**Why it happens:** Slack channel IDs follow specific format (C + alphanumeric)
**How to avoid:** Validate with Zod regex: `z.string().regex(/^C[A-Z0-9]+$/)`
**Warning signs:** Scrape jobs failing with "channel_not_found"

### Pitfall 3: Race Condition on Manual Scrape
**What goes wrong:** User clicks "Scrape Now" multiple times, creates duplicate jobs
**Why it happens:** No debounce or optimistic UI
**How to avoid:** Disable button on click, show pending state, use job deduplication
**Warning signs:** Multiple identical jobs in queue

### Pitfall 4: Next.js Cache Stale After Mutation
**What goes wrong:** Channel list doesn't update after add/delete
**Why it happens:** Next.js caches fetch requests by default
**How to avoid:** Call `revalidatePath('/admin/channels')` in server actions, or use `cache: 'no-store'`
**Warning signs:** Data shows old state until hard refresh

### Pitfall 5: Missing Error Boundaries in Admin Pages
**What goes wrong:** Entire admin page crashes on API error
**Why it happens:** Unhandled promise rejection in server component
**How to avoid:** Use error.tsx files, try/catch in server actions
**Warning signs:** White screen with React error overlay

### Pitfall 6: BullMQ Queue Not Connected in API
**What goes wrong:** Queue status returns empty or errors
**Why it happens:** Redis connection not established before query
**How to avoid:** Ensure queue.ts is imported (creates connection), handle connection errors
**Warning signs:** "Could not connect to Redis" in logs

## Code Examples

Verified patterns from official sources:

### BullMQ Job Counts Query
```typescript
// Source: https://docs.bullmq.io/guide/jobs/getters

const counts = await scrapeQueue.getJobCounts(
  'wait',      // Waiting to be processed
  'active',    // Currently processing
  'completed', // Successfully finished
  'failed',    // Failed with error
  'delayed'    // Scheduled for later
);
// Returns: { wait: number, active: number, completed: number, failed: number, delayed: number }

// Get recent failed jobs for error display
const failedJobs = await scrapeQueue.getJobs(['failed'], 0, 10, true);
for (const job of failedJobs) {
  console.log(job.id, job.failedReason);
}
```

### Channel Table with TanStack Table
```tsx
// Source: https://ui.shadcn.com/docs/components/data-table

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Channel {
  id: string;
  name: string;
  lastSyncAt: string | null;
}

const columns: ColumnDef<Channel>[] = [
  { accessorKey: "name", header: "Channel" },
  { accessorKey: "id", header: "Slack ID" },
  {
    accessorKey: "lastSyncAt",
    header: "Last Sync",
    cell: ({ row }) => row.original.lastSyncAt
      ? new Date(row.original.lastSyncAt).toLocaleString()
      : "Never"
  },
  {
    id: "actions",
    cell: ({ row }) => <ChannelActions channel={row.original} />,
  },
];
```

### Dialog Form Pattern
```tsx
// Source: https://ui.shadcn.com/docs/components/dialog

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function AddChannelDialog() {
  const [open, setOpen] = useState(false);

  async function onSubmit(formData: FormData) {
    await addChannel(formData);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Channel</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Slack Channel</DialogTitle>
          <DialogDescription>
            Enter the Slack channel ID and display name.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="id">Channel ID</Label>
              <Input id="id" name="id" placeholder="C1234567890" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input id="name" name="name" placeholder="art-assets" required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Add Channel</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| getServerSideProps | Server Components + fetch | Next.js 13+ | Simpler data fetching |
| API routes for mutations | Server Actions | Next.js 14+ | Direct form handling |
| useEffect for data | Server Components | Next.js 13+ | No client-side loading states |
| Bull (v3/v4) | BullMQ | 2021+ | Better TypeScript, job schedulers |
| manual job status UI | bull-board | mature | Professional dashboard, less code |

**Deprecated/outdated:**
- `getServerSideProps/getStaticProps`: Use App Router with Server Components
- `pages/api/*`: Use route handlers or Server Actions
- Bull v3 repeatable jobs: Use BullMQ Job Schedulers (upsertJobScheduler)

## Open Questions

Things that couldn't be fully resolved:

1. **Authentication for Admin Routes**
   - What we know: Admin pages should be protected
   - What's unclear: Whether to use middleware, server-side check, or external auth
   - Recommendation: Add TODO for Phase 6 auth, for now use simple env-based check

2. **Real-time Job Updates**
   - What we know: bull-board handles this internally, custom UI would need polling
   - What's unclear: WebSocket vs polling for custom job status cards
   - Recommendation: Start with polling (5s interval), consider WebSocket if needed

3. **Channel Deletion Cascading**
   - What we know: Channels table exists, messages reference channel_id
   - What's unclear: Should deleting channel delete messages? Soft delete?
   - Recommendation: Start with preventing deletion if messages exist, add cleanup later

## Sources

### Primary (HIGH confidence)
- BullMQ Docs (getters) - https://docs.bullmq.io/guide/jobs/getters
- BullMQ Docs (metrics) - https://docs.bullmq.io/guide/metrics
- shadcn/ui Sidebar - https://ui.shadcn.com/docs/components/sidebar
- shadcn/ui Dialog - https://ui.shadcn.com/docs/components/dialog
- shadcn/ui Data Table - https://ui.shadcn.com/docs/components/data-table
- Next.js Server Actions - https://nextjs.org/docs/app/getting-started/updating-data
- bull-board GitHub - https://github.com/felixmosh/bull-board

### Secondary (MEDIUM confidence)
- @bull-board/hono npm - integration pattern verified with GitHub examples
- Next.js admin dashboard templates (Kiranism, arhamkhnz) - validated patterns

### Tertiary (LOW confidence)
- WebSearch results for Hono admin patterns - general patterns, project-specific validation needed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project or official recommendations
- Architecture: HIGH - Patterns match existing codebase (assets.ts, dashboard/)
- Pitfalls: MEDIUM - Based on documentation warnings and common issues
- Bull-board integration: HIGH - Official adapter exists, example verified

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable libraries)
