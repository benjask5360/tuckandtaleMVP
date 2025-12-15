import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const { firstName, lastName } = await request.json()

    if (!firstName || typeof firstName !== 'string') {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Build full name
    const fullName = lastName
      ? `${firstName} ${lastName}`.trim()
      : firstName.trim()

    // Update user profile
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    // Send welcome email (non-blocking)
    if (user.email) {
      const baseUrl = request.url.split('/api')[0]

      fetch(`${baseUrl}/api/send-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: fullName
        })
      }).catch(error => {
        console.error('Failed to send welcome email:', error)
      })

      // Note: Admin notification is now handled by database trigger (on_user_profile_created)
      // which fires on INSERT to user_profiles and calls the on-user-created Edge Function
    }

    return NextResponse.json({
      success: true,
      full_name: fullName
    })

  } catch (error) {
    console.error('Error in update-name API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
