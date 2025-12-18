import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Wait for database trigger to create user profile
      await new Promise(resolve => setTimeout(resolve, 500))

      // Check if user has characters
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: characters } = await supabase
          .from('character_profiles')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .limit(1)

        // If no characters, this is a new user - send admin notification
        if (!characters || characters.length === 0) {
          // Get user profile for name
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', user.id)
            .single()

          // Notify admin of new signup (non-blocking)
          fetch(`${origin}/api/notify-admin-signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: profile?.full_name || '(Not provided yet)',
              userId: user.id
            })
          }).catch(err => console.error('Failed to notify admin:', err))

          // Add newuser param to trigger Lead pixel on character page
          return NextResponse.redirect(`${origin}/onboarding/character?newuser=true`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
