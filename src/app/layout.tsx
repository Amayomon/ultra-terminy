import type { Metadata, Viewport } from 'next';
import './globals.css';
import { TopBar } from '@/components/TopBar';

export const metadata: Metadata = {
  title: 'Ultra termíny',
  description: 'Najdi společný termín na ultra trail bez dlouhého domlouvání v chatu.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f2ec',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body>
        <TopBar />
        <main className="wrap">{children}</main>
      </body>
    </html>
  );
}
