import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/features/auth/infrastructure/session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  const isProtectedPath = pathname.startsWith('/admin') || pathname.startsWith('/account');

  if (isProtectedPath && !sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already logged in and visiting login or register, redirect to store or from
  const isAuthPage = pathname === '/login' || pathname === '/register';
  if (isAuthPage && sessionCookie) {
    const from = request.nextUrl.searchParams.get('from') || '/';
    return NextResponse.redirect(new URL(from, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/account/:path*', '/login', '/register'],
};
