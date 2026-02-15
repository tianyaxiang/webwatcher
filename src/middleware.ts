import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import crypto from 'crypto';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/health',
  '/login',
];

// Static assets that should pass through
const STATIC_PREFIXES = ['/_next/', '/favicon.ico'];

function generateToken(password: string): string {
  return crypto.createHash('sha256').update(`webwatcher:${password}`).digest('hex').slice(0, 32);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminPassword = process.env.ADMIN_PASSWORD;

  // No auth configured — allow everything
  if (!adminPassword) {
    return NextResponse.next();
  }

  // Skip auth for static assets
  if (STATIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip auth for public routes
  if (PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  // Check for auth token in cookie
  const token = request.cookies.get('ww_token')?.value;
  const expectedToken = generateToken(adminPassword);

  if (token === expectedToken) {
    return NextResponse.next();
  }

  // For API routes, return 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // For page routes, redirect to login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
