# Phase 7: Improve UI - Research

**Researched:** 2026-01-24
**Domain:** Next.js 16 App Router, React 19, Responsive Navigation, Dashboard UX
**Confidence:** HIGH

## Summary

Phase 7 enhances the Vesper dashboard with improved navigation, home page content, and mobile responsiveness. Research focused on Next.js 16 App Router layout patterns, shadcn/ui responsive navigation components, and dashboard statistics presentation.

**Key findings:**
- Next.js 16 layout deduplication enables shared navigation across routes without remounting
- shadcn/ui Sheet component is the recommended pattern for mobile hamburger menus
- Tailwind CSS v4 uses mobile-first approach with breakpoint prefixes (sm:, md:, lg:)
- React 19 removes forwardRef requirement and adds new hooks for client-side interactivity
- Dashboard stats should use Card components in grid layout with mobile-responsive breakpoints

**Primary recommendation:** Use Next.js root layout for global navigation header with Link to admin section, create stats cards using existing Card components on home page, and add Sheet component for mobile hamburger menu in admin sidebar.

## Standard Stack

The project already uses the correct modern stack for this phase.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | React framework with App Router | Industry standard for React apps in 2026, built-in layout system |
| React | 19.2.3 | UI library | Latest stable, required by Next.js 16 |
| Tailwind CSS | 4.x | Utility-first CSS | Mobile-first responsive design, v4 is current |
| shadcn/ui | Latest | Component library | Built on Radix UI primitives, accessible by default |
| lucide-react | 0.563.0 | Icon library | Modern, tree-shakeable icons for navigation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @radix-ui/react-dialog | 1.1.15 | Accessible dialogs | Already installed, base for Sheet component |
| class-variance-authority | 0.7.1 | Component variants | Already installed, used by Button/Card |
| clsx + tailwind-merge | Latest | Conditional classes | Already installed, needed for cn() utility |

### Missing Components (Need to Add)
| Component | Installation | Purpose |
|-----------|-------------|---------|
| Sheet | `npx shadcn@latest add sheet` | Mobile navigation drawer |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sheet | Custom drawer with react-spring | More code, accessibility harder, Sheet is production-ready |
| Link component | Plain `<a>` tags | Loses prefetching, client-side navigation |
| Tailwind breakpoints | CSS media queries | Verbose, less maintainable, Tailwind is already in stack |

**Installation:**
```bash
# Add Sheet component for mobile menu
cd dashboard
npx shadcn@latest add sheet
```

## Architecture Patterns

### Recommended Project Structure
```
dashboard/
├── app/
│   ├── layout.tsx              # Root layout with navigation header
│   ├── page.tsx                # Home page with stats + search
│   ├── admin/
│   │   ├── layout.tsx          # Admin sidebar (desktop) + mobile menu
│   │   ├── page.tsx            # Admin overview
│   │   ├── channels/page.tsx
│   │   └── jobs/page.tsx
│   └── assets/[id]/page.tsx
└── components/
    ├── ui/
    │   ├── card.tsx            # Already exists
    │   ├── button.tsx          # Already exists
    │   └── sheet.tsx           # Add this
    ├── navigation/
    │   ├── header-nav.tsx      # New: Global header with admin link
    │   └── mobile-menu.tsx     # New: Sheet-based hamburger menu
    └── home/
        └── stats-cards.tsx     # New: Dashboard stats grid
```

### Pattern 1: Shared Navigation via Root Layout
**What:** Place navigation header in `app/layout.tsx` to share across all routes without remounting.

**When to use:** Always for global navigation elements (header, footer).

**Why it works:** Next.js 16 layout deduplication ensures layouts preserve state and don't rerender during navigation. When prefetching multiple URLs with shared layout, the layout is downloaded once instead of per-page.

**Example:**
```tsx
// app/layout.tsx
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold hover:underline">
              Vesper
            </Link>
            <nav>
              <Link href="/admin" className="text-sm hover:underline">
                Admin
              </Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

**Source:** [Next.js Layouts and Pages Documentation](https://nextjs.org/docs/app/getting-started/layouts-and-pages), verified with [Next.js 16 Release Notes](https://nextjs.org/blog/next-16)

### Pattern 2: Mobile Navigation with Sheet Component
**What:** Use shadcn/ui Sheet component (Radix Dialog primitive) for slide-out mobile navigation.

**When to use:** When sidebar navigation needs to collapse to hamburger menu on mobile.

**Why it works:** Sheet extends Dialog with side positioning, built-in accessibility (focus trap, Esc to close), and proper ARIA attributes. Handles keyboard navigation and screen reader announcements automatically.

**Example:**
```tsx
// components/navigation/mobile-menu.tsx
'use client';

import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <nav className="flex flex-col gap-4">
          <Link href="/admin" className="text-lg hover:underline">
            Overview
          </Link>
          <Link href="/admin/channels" className="text-lg hover:underline">
            Channels
          </Link>
          <Link href="/admin/jobs" className="text-lg hover:underline">
            Jobs
          </Link>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

**Source:** [shadcn/ui Sheet Component](https://ui.shadcn.com/docs/components/sheet)

### Pattern 3: Responsive Sidebar Layout
**What:** Show full sidebar on desktop (md:block), hide on mobile, with hamburger menu trigger.

**When to use:** Admin sections or dashboard areas with persistent navigation.

**Why it works:** Tailwind's mobile-first breakpoints mean unprefixed classes apply to all sizes, prefixed (md:) apply at 768px+. Uses standard media query approach without custom CSS.

**Example:**
```tsx
// app/admin/layout.tsx
import Link from 'next/link';
import { MobileMenu } from '@/components/navigation/mobile-menu';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar - hidden on mobile */}
      <nav className="hidden md:block w-56 border-r bg-muted/40 p-4">
        <h2 className="font-semibold mb-4">Admin</h2>
        <ul className="space-y-2">
          <li><Link href="/admin" className="block py-1 hover:underline">Overview</Link></li>
          <li><Link href="/admin/channels" className="block py-1 hover:underline">Channels</Link></li>
          <li><Link href="/admin/jobs" className="block py-1 hover:underline">Jobs</Link></li>
        </ul>
      </nav>

      {/* Mobile header with hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 border-b bg-background p-4 z-10">
        <MobileMenu />
      </div>

      {/* Main content - add top padding on mobile for fixed header */}
      <main className="flex-1 p-6 md:p-6 pt-20 md:pt-6">{children}</main>
    </div>
  );
}
```

**Source:** [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)

### Pattern 4: Dashboard Stats Cards
**What:** Grid of Card components showing key metrics with responsive columns.

**When to use:** Dashboard home page or overview screens.

**Why it works:** Card component provides consistent spacing/borders, grid with responsive columns adjusts layout across breakpoints (1 col mobile, 2 on md, 3 on lg).

**Example:**
```tsx
// components/home/stats-cards.tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface StatsCardsProps {
  totalAssets: number;
  lastSyncAt: string | null;
  recentAssets: Array<{ name: string; version: string }>;
}

export function StatsCards({ totalAssets, lastSyncAt, recentAssets }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
      <Card>
        <CardHeader>
          <CardTitle>Total Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{totalAssets}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Last Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {lastSyncAt ? new Date(lastSyncAt).toLocaleString('vi-VN') : 'Never'}
          </p>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Recent Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {recentAssets.slice(0, 3).map((asset, i) => (
              <li key={i} className="text-sm">
                {asset.name} <span className="text-muted-foreground">v{asset.version}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Source:** [shadcn/ui Card Component](https://ui.shadcn.com/docs/components/card), verified with [Dashboard Best Practices](https://www.ksolves.com/blog/next-js/best-practices-for-saas-dashboards)

### Anti-Patterns to Avoid

**1. Using sm: for mobile styles**
- **Wrong:** `<div className="sm:text-center">` (only centers on 640px+, not on mobile)
- **Right:** `<div className="text-center sm:text-left">` (centers on mobile, left-aligns on 640px+)
- **Why:** Tailwind is mobile-first, unprefixed utilities apply everywhere, prefixed apply at breakpoint and above.

**2. Multiple root layouts**
- **Wrong:** Creating separate root layouts for different sections (causes full page reload on navigation)
- **Right:** One root layout, nested layouts for sections
- **Why:** Navigating across multiple root layouts loses client-side navigation benefits.

**3. Unicode hamburger icons without labels**
- **Wrong:** `<button>☰</button>` (screen readers announce "hamburger" literally)
- **Right:** `<Button><Menu /><span className="sr-only">Open menu</span></Button>`
- **Why:** Icon-only buttons need accessible labels, SVG icons don't have intrinsic meaning.

**4. Passing data from layout to children**
- **Wrong:** Trying to pass props from layout.tsx to page.tsx
- **Right:** Fetch data in both (React automatically dedupes with cache())
- **Why:** Layouts can't pass data to children in App Router architecture.

**5. Using 'use client' on every component**
- **Wrong:** Adding 'use client' to every .tsx file
- **Right:** Add only at boundaries where client features (useState, onClick) are needed
- **Why:** Components below a 'use client' boundary are automatically client components.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mobile slide-out menu | Custom drawer with CSS transitions | shadcn/ui Sheet | Accessibility (focus trap, ARIA), keyboard navigation, screen reader support all built-in |
| Responsive navigation | Custom media query logic in JS | Tailwind breakpoint classes (md:hidden, md:block) | Declarative, works with SSR, no layout shift |
| Icon hamburger menu | Unicode characters (☰), custom SVG | lucide-react Menu icon | Proper sizing, consistent with design system, tree-shakeable |
| Client-side routing | window.location or `<a>` | Next.js Link component | Prefetching, client-side navigation, better performance |
| Stats card layout | Custom CSS Grid | shadcn/ui Card + Tailwind grid classes | Consistent spacing, responsive, accessible |
| Screen reader text | CSS visibility: hidden | Tailwind sr-only class | Proper implementation (visible to screen readers only) |

**Key insight:** Accessibility is the primary reason to avoid custom solutions. Focus management, ARIA attributes, keyboard navigation, and screen reader compatibility are hard to get right. Radix UI primitives (used by shadcn/ui) have solved these problems comprehensively.

## Common Pitfalls

### Pitfall 1: Hamburger Menu Accessibility
**What goes wrong:** Mobile menu works visually but fails accessibility tests - screen readers can't navigate, keyboard users get trapped, focus not managed.

**Why it happens:** Developers focus on visual behavior (slide animation, toggle state) and forget:
- Button needs `aria-expanded` attribute
- Button needs accessible label (not just icon)
- Menu needs focus trap when open
- Esc key should close menu
- Focus should return to trigger button on close

**How to avoid:** Use shadcn/ui Sheet component which handles all accessibility automatically via Radix Dialog primitive.

**Warning signs:**
- Screen reader announces "hamburger" instead of "Open menu"
- Can't close menu with Esc key
- Focus escapes to background content when menu is open
- No visual focus indicators on menu items

**Code check:**
```tsx
// BAD - Missing accessibility
<button onClick={() => setOpen(!open)}>
  <Menu />
</button>

// GOOD - Sheet component handles it
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon">
      <Menu />
      <span className="sr-only">Open menu</span>
    </Button>
  </SheetTrigger>
  <SheetContent side="left">{/* navigation */}</SheetContent>
</Sheet>
```

**Source:** [Accessibility for Hamburger Menu](https://medium.com/@linlinghao/accessibility-for-hamburger-menu-a37fa9617a89), [Mobile Navigation Accessibility](https://theadminbar.com/accessibility-weekly/mobile-nav-and-hamburger-menus/)

### Pitfall 2: Layout Doesn't Persist State
**What goes wrong:** Navigation reloads every time user changes pages, scroll position lost, input values deleted, animations re-trigger.

**Why it happens:**
- Using multiple root layouts (causes full page reload)
- Not understanding that layouts don't rerender between page navigations
- Trying to access searchParams or pathname in layout (these trigger rerenders)

**How to avoid:**
- Use one root layout for app-wide UI
- Use nested layouts for section-specific navigation (e.g., admin layout)
- Access dynamic data (searchParams, pathname) in page.tsx or Client Components with useSearchParams/usePathname hooks

**Warning signs:**
- "My sidebar scrolls back to top on every navigation"
- "Form inputs in layout get cleared"
- "Layout flickers on page change"
- useEffect in layout runs on every navigation

**Code check:**
```tsx
// BAD - Will cause issues
export default function Layout({ searchParams }) { // Layouts don't receive searchParams
  const theme = searchParams.theme; // This won't work
  return <nav>{/* ... */}</nav>;
}

// GOOD - Layout persists
export default function Layout({ children }) {
  return <nav>{/* Static navigation UI */}{children}</nav>;
}

// GOOD - Access dynamic data in page
export default function Page({ searchParams }) {
  const theme = searchParams.theme; // This works
  return <div>{/* ... */}</div>;
}
```

**Source:** [Common Next.js App Router Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them), [Next.js Layout Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/layout)

### Pitfall 3: Mobile-First Breakpoints Confusion
**What goes wrong:** Layout looks correct on desktop but broken on mobile, or responsive classes don't apply as expected.

**Why it happens:** Developers assume `sm:` means "mobile" but Tailwind's mobile-first approach means unprefixed = mobile, prefixed = that breakpoint and up.

**Common mistake:** Writing `sm:text-center` expecting it to center on small screens, but it actually centers on screens ≥640px.

**How to avoid:**
1. Always start with mobile layout (unprefixed classes)
2. Add breakpoint prefixes (sm:, md:, lg:) to override for larger screens
3. Test in browser DevTools with responsive mode at multiple sizes
4. Remember: `md:hidden` means "hide on medium screens and up" (shows on mobile)

**Warning signs:**
- "It works on desktop but mobile looks wrong"
- "I added sm: classes but nothing changed on my phone"
- Layout shifts unexpectedly at 640px width

**Code check:**
```tsx
// BAD - Won't center on mobile
<div className="sm:text-center md:text-left">
  {/* Only centered between 640px-767px, left-aligned 768px+, default left on mobile */}
</div>

// GOOD - Mobile-first approach
<div className="text-center md:text-left">
  {/* Centered on mobile and small tablets, left-aligned 768px+ */}
</div>

// BAD - Sidebar hidden on mobile, shown on desktop (backwards)
<nav className="md:hidden">...</nav>

// GOOD - Sidebar hidden on mobile, shown on desktop
<nav className="hidden md:block">...</nav>
```

**Source:** [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)

### Pitfall 4: Client/Server Component Boundaries
**What goes wrong:** "Error: Cannot use useState in Server Component" or "Hydration mismatch" errors.

**Why it happens:** React 19 + Next.js 16 default to Server Components. Interactive features (useState, onClick, useEffect) require 'use client' directive, but developers either:
- Forget to add it
- Add it everywhere (bloats bundle)
- Try to import Server Component into Client Component directly

**How to avoid:**
1. Keep Server Components by default (no 'use client')
2. Add 'use client' only at boundaries where interactivity starts
3. Pass Server Components to Client Components via children prop (composition pattern)
4. Never import Server Component directly into Client Component file

**Warning signs:**
- Build errors about hooks in Server Components
- Hydration mismatches
- Bundle size larger than expected
- Can't access server-only features (database, fs) in component

**Code check:**
```tsx
// BAD - Can't use useState in Server Component
export default function Page() {
  const [open, setOpen] = useState(false); // ERROR
  return <div>...</div>;
}

// GOOD - Add 'use client' at boundary
'use client';
export default function Page() {
  const [open, setOpen] = useState(false); // Works
  return <div>...</div>;
}

// BETTER - Keep page as Server Component, move interactivity to child
// page.tsx (Server Component)
export default function Page() {
  return <MobileMenu />; // Client Component handles interactivity
}

// mobile-menu.tsx (Client Component)
'use client';
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return <Sheet>...</Sheet>;
}
```

**Source:** [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [React 19 Features](https://react.dev/blog/2024/12/05/react-19)

### Pitfall 5: Missing Stats API Endpoint
**What goes wrong:** Home page stats cards fetch data but endpoint returns 404 or incorrect data structure.

**Why it happens:** Dashboard needs aggregate data (total assets count, last sync timestamp, recent updates) but API currently only has `/assets/search` and `/assets/:id` endpoints - no dedicated stats endpoint.

**How to avoid:**
1. Create new API route `/api/stats` or `/api/dashboard/stats`
2. Use Drizzle ORM to query: `db.select({ count: count() }).from(assets)`
3. Query channels table for `max(lastSyncAt)`
4. Query recent asset_versions with joins to get latest updates
5. Return consistent JSON response format like other endpoints

**Warning signs:**
- Stats cards show loading spinner forever
- Console errors about failed fetch
- TypeError when accessing stats.totalAssets (data structure mismatch)

**Code check:**
```tsx
// BAD - No endpoint exists for this
const stats = await fetch('http://localhost:3001/api/stats'); // 404

// GOOD - Create endpoint first
// src/api/routes/stats.ts
import { db } from '@/db/index.js';
import { assets, channels, assetVersions } from '@/db/schema.js';
import { count, desc, max } from 'drizzle-orm';

app.get('/stats', async (c) => {
  const [totalAssets] = await db.select({ count: count() }).from(assets);
  const [lastSync] = await db.select({ max: max(channels.lastSyncAt) }).from(channels);
  const recentAssets = await db
    .select({
      name: assets.rawName,
      version: assetVersions.version,
      createdAt: assetVersions.createdAt,
    })
    .from(assetVersions)
    .innerJoin(assets, eq(assetVersions.assetId, assets.id))
    .orderBy(desc(assetVersions.createdAt))
    .limit(5);

  return c.json({
    ok: true,
    data: {
      totalAssets: totalAssets.count,
      lastSyncAt: lastSync.max,
      recentAssets,
    },
  });
});
```

**Source:** Inferred from existing codebase patterns in `src/api/routes/assets.ts` and `src/db/schema.ts`

## Code Examples

Verified patterns from official sources:

### Next.js Link with Prefetch
```tsx
// Source: https://nextjs.org/docs/app/getting-started/layouts-and-pages
import Link from 'next/link';

// Prefetches on hover by default in Next.js 16
<Link href="/admin" className="hover:underline">
  Admin Dashboard
</Link>

// Disable prefetch if needed
<Link href="/large-page" prefetch={false}>
  Heavy Page
</Link>
```

### Tailwind Responsive Grid
```tsx
// Source: https://tailwindcss.com/docs/responsive-design
// Mobile: 1 column, Tablet (768px+): 2 columns, Desktop (1024px+): 3 columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {items.map(item => <Card key={item.id}>{item.content}</Card>)}
</div>
```

### shadcn/ui Sheet with Radix Dialog
```tsx
// Source: https://ui.shadcn.com/docs/components/sheet
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

<Sheet>
  <SheetTrigger asChild>
    <Button variant="outline">Open</Button>
  </SheetTrigger>
  <SheetContent side="left">
    <SheetHeader>
      <SheetTitle>Navigation</SheetTitle>
    </SheetHeader>
    {/* Navigation content */}
  </SheetContent>
</Sheet>
```

### React 19 Client Component (No forwardRef)
```tsx
// Source: https://react.dev/blog/2024/12/05/react-19
// OLD (React 18): forwardRef required
const Button = forwardRef(({ onClick }, ref) => (
  <button ref={ref} onClick={onClick}>Click</button>
));

// NEW (React 19): ref is a regular prop
function Button({ ref, onClick }) {
  return <button ref={ref} onClick={onClick}>Click</button>;
}
```

### Accessible Screen Reader Text
```tsx
// Source: Tailwind CSS utility classes
<Button variant="ghost" size="icon">
  <Menu className="h-5 w-5" />
  <span className="sr-only">Open navigation menu</span>
</Button>

// Rendered HTML:
// <button>
//   <svg>...</svg>
//   <span class="sr-only">Open navigation menu</span> <!-- Visible to screen readers only -->
// </button>
```

### Drizzle ORM Aggregation Query
```tsx
// Source: Based on existing codebase patterns (src/db/schema.ts, src/api/routes/assets.ts)
import { db } from '@/db/index.js';
import { assets, channels, assetVersions } from '@/db/schema.js';
import { count, desc, max, eq } from 'drizzle-orm';

// Count total assets
const [result] = await db
  .select({ totalAssets: count() })
  .from(assets);

// Get most recent sync time across all channels
const [syncResult] = await db
  .select({ lastSyncAt: max(channels.lastSyncAt) })
  .from(channels);

// Get 5 most recent asset updates with names
const recentAssets = await db
  .select({
    id: assets.id,
    name: assets.rawName,
    version: assetVersions.version,
    createdAt: assetVersions.createdAt,
  })
  .from(assetVersions)
  .innerJoin(assets, eq(assetVersions.assetId, assets.id))
  .orderBy(desc(assetVersions.createdAt))
  .limit(5);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router (pages/ directory) | App Router (app/ directory) | Next.js 13 (2022), stable in 14 (2023) | Layouts persist across navigation, better code splitting, React Server Components |
| forwardRef for refs | refs as props | React 19 (Dec 2024) | Simpler component API, less boilerplate |
| Tailwind CSS v3 | Tailwind CSS v4 | Dec 2024 | Native CSS features, @theme syntax, better performance |
| Manual useMemo/useCallback | React Compiler | React 19 (stable in Next.js 16) | Automatic memoization, less manual optimization |
| Navigation Menu for mobile | Sheet/Drawer components | shadcn/ui evolution (2024-2025) | Better mobile UX, Sheet is purpose-built for mobile drawers |
| CSS Modules for responsive | Tailwind breakpoint classes | Industry shift 2020-2023 | Declarative, mobile-first, less CSS to maintain |

**Deprecated/outdated:**
- **getStaticProps/getServerSideProps**: Replaced by async Server Components and fetch in Next.js 13+ App Router
- **forwardRef**: No longer needed in React 19, refs are regular props
- **Unicode hamburger icons (☰)**: Replaced by SVG icon libraries (lucide-react) for accessibility
- **Custom media query hooks (useMediaQuery)**: Replaced by Tailwind responsive classes for most use cases

## Open Questions

Things that couldn't be fully resolved:

1. **Stats data caching strategy**
   - What we know: Next.js 16 has aggressive caching by default, stats endpoint needs to balance freshness vs. performance
   - What's unclear: Should stats use `cache: 'no-store'` for real-time data or `revalidate: 60` for cached with 1-minute freshness?
   - Recommendation: Start with `revalidate: 300` (5 minutes) since stats don't need to be real-time. User can refresh manually if needed.

2. **Admin section route protection**
   - What we know: Current dashboard has no authentication, admin routes are publicly accessible
   - What's unclear: Whether Phase 7 should include route protection or if that's a future phase
   - Recommendation: Skip auth for Phase 7 (focused on UI/navigation), but use Next.js middleware pattern when adding auth later.

3. **Dark mode support**
   - What we know: Tailwind config already has dark mode colors defined (globals.css has .dark theme)
   - What's unclear: Whether to implement theme toggle in this phase or defer
   - Recommendation: Defer to future phase - focus on responsive navigation first, dark mode is separate feature.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16) - Layout deduplication, prefetching improvements
- [Next.js Layouts and Pages Documentation](https://nextjs.org/docs/app/getting-started/layouts-and-pages) - Layout patterns, nesting, persistence
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) - Mobile-first approach, breakpoints
- [shadcn/ui Sheet Component](https://ui.shadcn.com/docs/components/sheet) - Mobile drawer component
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19) - New features, ref as prop, breaking changes
- Vesper codebase - `dashboard/package.json`, `dashboard/app/layout.tsx`, `src/db/schema.ts`, `src/api/routes/assets.ts`

### Secondary (MEDIUM confidence)
- [Common Next.js App Router Mistakes](https://vercel.com/blog/common-mistakes-with-the-next-js-app-router-and-how-to-fix-them) - Pitfalls verified with official docs
- [Next.js Dashboard Best Practices](https://www.ksolves.com/blog/next-js/best-practices-for-saas-dashboards) - Layout organization, card-based design
- [Accessibility for Hamburger Menu](https://medium.com/@linlinghao/accessibility-for-hamburger-menu-a37fa9617a89) - ARIA attributes, focus management
- [Mobile Navigation Accessibility](https://theadminbar.com/accessibility-weekly/mobile-nav-and-hamburger-menus/) - Screen reader support, keyboard navigation

### Tertiary (LOW confidence)
- [shadcn/ui Dashboard Example](https://ui.shadcn.com/examples/dashboard) - Visual reference but not prescriptive
- [React Dashboard Component Examples](https://www.usedatabrain.com/how-to/create-react-dashboard) - General patterns, not specific to stack
- Third-party template sites (shadcnblocks.com, reui.io) - Good examples but not authoritative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified versions in package.json, official docs confirm these are current for 2026
- Architecture: HIGH - All patterns sourced from Next.js 16 and Tailwind CSS official documentation
- Pitfalls: HIGH - Cross-referenced between official docs and community sources, tested patterns
- Code examples: HIGH - All examples from official documentation or verified against existing codebase

**Research date:** 2026-01-24
**Valid until:** ~2026-02-24 (30 days) - Stack is stable (Next.js 16 just released, React 19 stable, Tailwind v4 stable), but monitor for Next.js 16.x patch releases
