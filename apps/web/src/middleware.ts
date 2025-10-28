import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
 
export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
 
  // Only handle the root path
  if (path !== '/') return NextResponse.next();

  // Check if the user is authenticated (has a session)
  const isAuthenticated = request.cookies.has('next-auth.session-token');
  
  // If authenticated and on root, redirect to media library
  if (isAuthenticated) {
    return NextResponse.redirect(new URL('/media', request.url));
  }

  return NextResponse.next();
}