import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated - please sign up/login first' }, { status: 401 })
    }

    // Get the tier_plus (formerly supernova) tier
    const { data: supernovaTier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('id, name, child_profiles, other_character_profiles')
      .eq('id', 'tier_plus')
      .single()

    if (tierError || !supernovaTier) {
      return NextResponse.json({ error: 'tier_plus (Supernova) tier not found' }, { status: 500 })
    }

    // Update user's subscription tier to supernova
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier_id: supernovaTier.id,
        user_type: 'admin' // Also set as admin since you're the owner
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully upgraded to Supernova tier!',
      user: {
        email: user.email,
        id: user.id,
      },
      profile: updatedProfile,
      tier: {
        id: supernovaTier.id,
        name: supernovaTier.name,
        child_profiles: supernovaTier.child_profiles,
        other_character_profiles: supernovaTier.other_character_profiles,
        unlimited: false // No unlimited in new schema
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}