import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Fetch user's profile - EXACT SAME QUERY AS DASHBOARD
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        subscription_tier_id,
        subscription_tiers (
          tier_name,
          display_name,
          max_child_profiles,
          max_other_characters
        )
      `)
      .eq('id', user.id)
      .single()

    // Extract tier exactly like dashboard does
    const userTier = (userProfile?.subscription_tiers as any) || {
      tier_name: 'free',
      display_name: 'Free',
      max_child_profiles: 1,
      max_other_characters: 0
    }

    // Fetch all characters
    const { data: allCharacters, error: charactersError } = await supabase
      .from('character_profiles')
      .select('*')
      .eq('user_profile_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      rawUserProfile: userProfile,
      extractedTier: userTier,
      profileError: profileError?.message,
      allCharacters,
      charactersError: charactersError?.message,
      characterCount: {
        children: allCharacters?.filter(c => c.character_type === 'child').length || 0,
        others: allCharacters?.filter(c => c.character_type !== 'child').length || 0,
      },
      debug: {
        hasUserProfile: !!userProfile,
        hasSubscriptionTiers: !!(userProfile?.subscription_tiers),
        subscriptionTiersValue: userProfile?.subscription_tiers,
        maxChildren: userTier?.max_child_profiles,
        maxOthers: userTier?.max_other_characters,
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
