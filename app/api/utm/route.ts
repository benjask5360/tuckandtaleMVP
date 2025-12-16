import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/utm
 * Saves UTM parameters to the current user's profile.
 * Non-critical - returns 200 even on failure to never block flows.
 */
export async function POST(request: Request) {
  try {
    const { utm_source, utm_medium, utm_campaign } = await request.json()

    // Skip if no UTM params provided
    if (!utm_source && !utm_medium && !utm_campaign) {
      return NextResponse.json({ success: true, message: 'No UTM params' })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // No user logged in - that's fine, just skip
      return NextResponse.json({ success: true, message: 'No user' })
    }

    // Update user_profiles with UTM data
    const { error } = await supabase
      .from('user_profiles')
      .update({
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
      })
      .eq('id', user.id)

    if (error) {
      console.error('[UTM API] Failed to save UTMs:', error)
      // Still return 200 - UTM save is non-critical
      return NextResponse.json({ success: false, message: 'Save failed' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[UTM API] Error:', error)
    // Always return 200 - UTM is non-critical
    return NextResponse.json({ success: false, message: 'Error' })
  }
}
