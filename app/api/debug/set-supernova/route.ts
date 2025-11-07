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

    // Get the supernova tier ID
    const { data: supernovaTier, error: tierError } = await supabase
      .from('subscription_tiers')
      .select('id, tier_name, max_child_profiles, max_other_characters')
      .eq('tier_name', 'supernova')
      .single()

    if (tierError || !supernovaTier) {
      return NextResponse.json({ error: 'Supernova tier not found' }, { status: 500 })
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
        name: supernovaTier.tier_name,
        max_child_profiles: supernovaTier.max_child_profiles,
        max_other_characters: supernovaTier.max_other_characters,
        unlimited: supernovaTier.max_child_profiles === null && supernovaTier.max_other_characters === null
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}