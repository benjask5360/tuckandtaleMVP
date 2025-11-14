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
      // Check if user has characters
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: characters } = await supabase
          .from('character_profiles')
          .select('id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .limit(1)

        // If no characters, this is a new user
        if (!characters || characters.length === 0) {
          // Send welcome email for new users (including OAuth signups)
          if (user.email) {
            // Get user's name from user_metadata (set by OAuth provider or signup)
            const fullName = user.user_metadata?.full_name ||
                           user.user_metadata?.name ||
                           user.email.split('@')[0]

            // Send welcome email (non-blocking)
            fetch(`${origin}/api/send-welcome`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: user.email,
                name: fullName
              })
            }).catch(error => {
              // Log error but don't block user flow
              console.error('Failed to send welcome email:', error)
            })
          }

          return NextResponse.redirect(`${origin}/onboarding/character`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
