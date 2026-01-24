'use client';

import { Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>Admin</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-4 mt-4">
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
        <div className="mt-8 pt-4 border-t">
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/queues`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:underline"
          >
            Queue Dashboard (Bull Board)
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
