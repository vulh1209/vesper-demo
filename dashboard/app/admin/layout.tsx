import Link from 'next/link';
import { MobileMenu } from '@/components/navigation/mobile-menu';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Mobile header - visible only on mobile */}
      <div className="md:hidden fixed top-14 left-0 right-0 border-b bg-background p-4 z-10">
        <MobileMenu />
      </div>

      {/* Desktop sidebar - hidden on mobile */}
      <nav className="hidden md:block w-56 border-r bg-muted/40 p-4">
        <h2 className="font-semibold mb-4">Admin</h2>
        <ul className="space-y-2">
          <li><Link href="/admin" className="block py-1 hover:underline">Overview</Link></li>
          <li><Link href="/admin/channels" className="block py-1 hover:underline">Channels</Link></li>
          <li><Link href="/admin/jobs" className="block py-1 hover:underline">Jobs</Link></li>
        </ul>
        <div className="mt-8 pt-4 border-t">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/queues`}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-1 text-sm text-muted-foreground hover:underline"
          >
            Queue Dashboard (Bull Board)
          </a>
        </div>
      </nav>

      {/* Main content - extra top padding on mobile for fixed header */}
      <main className="flex-1 p-6 pt-20 md:pt-6">{children}</main>
    </div>
  );
}
