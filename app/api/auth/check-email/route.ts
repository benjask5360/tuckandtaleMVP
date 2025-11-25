import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const normalizedEmail = email.toLowerCase().trim()

    // Query the auth.users table directly to check if email exists
    const { data, error } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', normalizedEmail)
      .limit(1)
      .maybeSingle()

    if (error) {
      // If auth.users isn't accessible, try user_profiles as fallback
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', normalizedEmail)
        .limit(1)
        .maybeSingle()

      if (profileError) {
        console.error('Error checking email:', profileError)
        return NextResponse.json({ error: 'Failed to check email' }, { status: 500 })
      }

      return NextResponse.json({ exists: !!profileData })
    }

    return NextResponse.json({ exists: !!data })
  } catch (error) {
    console.error('Error in check-email route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
