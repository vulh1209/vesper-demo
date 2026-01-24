import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <nav className="w-56 border-r bg-muted/40 p-4">
        <h2 className="font-semibold mb-4">Admin</h2>
        <ul className="space-y-2">
          <li><Link href="/admin" className="block py-1 hover:underline">Overview</Link></li>
          <li><Link href="/admin/channels" className="block py-1 hover:underline">Channels</Link></li>
        </ul>
      </nav>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
