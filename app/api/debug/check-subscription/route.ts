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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile with subscription tier details
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        subscription_tier_id,
        subscription_tiers (
          id,
          tier_name,
          display_name,
          max_child_profiles,
          max_other_characters,
          features
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Get all subscription tiers for reference
    const { data: allTiers } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('tier_name')

    // Count user's characters
    const { count: childCount } = await supabase
      .from('character_profiles')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('character_type', 'child')
      .is('deleted_at', null)

    const { count: otherCount } = await supabase
      .from('character_profiles')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .neq('character_type', 'child')
      .is('deleted_at', null)

    return NextResponse.json({
      user: {
        email: user.email,
        id: user.id,
      },
      profile: {
        subscription_tier_id: userProfile?.subscription_tier_id,
        current_tier: userProfile?.subscription_tiers,
      },
      character_counts: {
        children: childCount || 0,
        others: otherCount || 0,
      },
      available_tiers: allTiers,
      debug_info: {
        tier_has_new_columns: {
          max_child_profiles: userProfile?.subscription_tiers?.max_child_profiles,
          max_other_characters: userProfile?.subscription_tiers?.max_other_characters,
        },
        tier_has_old_features: userProfile?.subscription_tiers?.features,
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}