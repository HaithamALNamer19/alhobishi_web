'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface SiteShellProps {
  children: React.ReactNode;
  navbar: React.ReactNode;
  footer: React.ReactNode;
}

export function SiteShell({ children, navbar, footer }: SiteShellProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // When inside the admin dashboard, suppress the public store Navbar and Footer
  // to avoid double navbars and give the admin panel its own dedicated full-screen layout.
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {navbar}
      <main className="flex-1 w-full max-w-full overflow-x-clip">{children}</main>
      {footer}
    </>
  );
}

