import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'Vesper - Asset Tracker',
  description: 'Track asset versions across your team',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <h1 className="text-xl font-bold">Vesper</h1>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
