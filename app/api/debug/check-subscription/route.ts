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

    // Get user profile with subscription tier details (new schema)
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        subscription_tier_id,
        subscription_tiers (
          id,
          name,
          child_profiles,
          other_character_profiles,
          illustrated_limit_month,
          illustrated_limit_total,
          text_limit_month,
          avatar_regenerations_month,
          allow_pets,
          allow_magical_creatures,
          allow_fun_stories,
          allow_growth_stories,
          allow_genres,
          allow_writing_styles,
          allow_story_length
        )
      `)
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Get all subscription tiers for reference
    const { data: allTiers } = await supabase
      .from('subscription_tiers')
      .select('*')
      .order('display_order')

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
      limits: {
        child_profiles: (userProfile?.subscription_tiers as any)?.child_profiles,
        other_character_profiles: (userProfile?.subscription_tiers as any)?.other_character_profiles,
        illustrated_monthly: (userProfile?.subscription_tiers as any)?.illustrated_limit_month,
        illustrated_lifetime: (userProfile?.subscription_tiers as any)?.illustrated_limit_total,
        text_monthly: (userProfile?.subscription_tiers as any)?.text_limit_month,
        avatar_regenerations: (userProfile?.subscription_tiers as any)?.avatar_regenerations_month,
      },
      features: {
        allow_pets: (userProfile?.subscription_tiers as any)?.allow_pets,
        allow_magical_creatures: (userProfile?.subscription_tiers as any)?.allow_magical_creatures,
        allow_fun_stories: (userProfile?.subscription_tiers as any)?.allow_fun_stories,
        allow_growth_stories: (userProfile?.subscription_tiers as any)?.allow_growth_stories,
        allow_genres: (userProfile?.subscription_tiers as any)?.allow_genres,
        allow_writing_styles: (userProfile?.subscription_tiers as any)?.allow_writing_styles,
        allow_story_length: (userProfile?.subscription_tiers as any)?.allow_story_length,
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}