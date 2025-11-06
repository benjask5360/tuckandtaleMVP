import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // For MVP, we'll handle auth checks in the pages themselves
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/onboarding/:path*',
    '/auth/:path*',
  ],
}
