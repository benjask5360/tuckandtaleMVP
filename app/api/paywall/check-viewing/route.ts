/**
 * Check Viewing Paywall API Route
 * Returns whether a specific story requires paywall for viewing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PaywallService } from '@/lib/services/paywall-service'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get story ID from query params
    const { searchParams } = new URL(request.url)
    const storyId = searchParams.get('storyId')

    if (!storyId) {
      return NextResponse.json(
        { error: 'Missing storyId' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check paywall status for this story
    const paywallResult = await PaywallService.requiresPaywallForViewing(user.id, storyId)

    // Get story title for display
    const { data: story } = await supabase
      .from('content')
      .select('title')
      .eq('id', storyId)
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      required: paywallResult.required,
      isUnlocked: paywallResult.isUnlocked,
      storyTitle: story?.title || null,
      paywallParagraphIndex: PRICING_CONFIG.PAYWALL_PARAGRAPH_INDEX,
    })
  } catch (error) {
    console.error('Error checking viewing paywall:', error)
    return NextResponse.json(
      { error: 'Failed to check paywall status' },
      { status: 500 }
    )
  }
}
