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

        // If no characters, this is a new user
        if (!characters || characters.length === 0) {
          return NextResponse.redirect(`${origin}/onboarding/character`)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
