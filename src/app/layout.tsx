import React, { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/shared/ui/toast';
import { Navbar } from '@/shared/components/navbar';
import { Footer } from '@/shared/components/footer';
import { SiteShell } from '@/shared/components/site-shell';

export const metadata: Metadata = {
  title: 'متجر الحبيشي | للألعاب والإكسسوارات والخردوات',
  description: 'متجر الحبيشي الإلكتروني - وجهتك الأولى لتسوق الألعاب، الأدوات، الأواني المنزلية، والإكسسوارات',
  icons: {
    icon: '/logo.jpg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased scroll-smooth overflow-x-clip">
      <body className="min-h-full flex flex-col bg-slate-100/70 text-slate-900 selection:bg-blue-600 selection:text-white overflow-x-clip w-full max-w-full">
        <ToastProvider />
        <SiteShell
          navbar={
            <Suspense fallback={<header className="h-18 border-b border-slate-200 bg-white/80 backdrop-blur-md" />}>
              <Navbar />
            </Suspense>
          }
          footer={<Footer />}
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
