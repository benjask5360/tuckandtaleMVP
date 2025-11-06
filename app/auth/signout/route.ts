import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Sign out
  await supabase.auth.signOut()

  // Redirect to home page
  return NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
}
