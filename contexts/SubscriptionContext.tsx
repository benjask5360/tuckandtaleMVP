'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PRICING_CONFIG } from '@/lib/config/pricing-config'

/**
 * Simplified subscription state for the new hybrid pricing model
 */
export interface SubscriptionState {
  // Subscription status
  hasActiveSubscription: boolean
  subscriptionTier: 'free' | 'stories_plus'
  subscriptionStatus: string | null

  // Usage tracking (for subscribers)
  storiesUsedThisMonth: number
  storiesRemaining: number
  monthlyLimit: number
  daysUntilReset: number | null

  // Paywall status (for non-subscribers)
  totalStoriesGenerated: number
  freeTrialUsed: boolean
  generationCredits: number
  storyNumber: number // Next story number

  // Loading state
  loading: boolean
  error: string | null
}

interface SubscriptionContextType extends SubscriptionState {
  refresh: () => Promise<void>
  canGenerateStory: () => boolean
  getUsageMessage: () => string
}

const defaultState: SubscriptionState = {
  hasActiveSubscription: false,
  subscriptionTier: 'free',
  subscriptionStatus: null,
  storiesUsedThisMonth: 0,
  storiesRemaining: 0,
  monthlyLimit: 0,
  daysUntilReset: null,
  totalStoriesGenerated: 0,
  freeTrialUsed: false,
  generationCredits: 0,
  storyNumber: 1,
  loading: true,
  error: null,
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>(defaultState)

  const fetchSubscriptionData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setState({ ...defaultState, loading: false })
        return
      }

      // Fetch user profile with subscription info
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select(`
          subscription_tier_id,
          subscription_status,
          subscription_starts_at,
          subscription_ends_at,
          total_stories_generated,
          free_trial_used,
          generation_credits
        `)
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Treat both 'active' and 'trialing' as having an active subscription
      const hasActiveSubscription =
        (profile?.subscription_status === 'active' || profile?.subscription_status === 'trialing') &&
        profile?.subscription_tier_id === PRICING_CONFIG.TIER_STORIES_PLUS

      const subscriptionTier = hasActiveSubscription ? 'stories_plus' : 'free'
      const totalStoriesGenerated = profile?.total_stories_generated || 0
      const freeTrialUsed = profile?.free_trial_used || false
      const generationCredits = profile?.generation_credits || 0

      // Calculate story number (next story to be created)
      const storyNumber = totalStoriesGenerated + 1

      // For subscribers, fetch billing cycle usage
      let storiesUsedThisMonth = 0
      let storiesRemaining = 0
      let daysUntilReset: number | null = null

      if (hasActiveSubscription && profile?.subscription_starts_at) {
        // Calculate billing cycle
        const cycleInfo = calculateBillingCycle(new Date(profile.subscription_starts_at))

        // Count stories created in current billing cycle
        const { count } = await supabase
          .from('content')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('content_type', 'story')
          .gte('created_at', cycleInfo.start.toISOString())
          .lt('created_at', cycleInfo.end.toISOString())

        storiesUsedThisMonth = count || 0
        storiesRemaining = Math.max(0, PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT - storiesUsedThisMonth)
        daysUntilReset = cycleInfo.daysRemaining
      }

      setState({
        hasActiveSubscription,
        subscriptionTier,
        subscriptionStatus: profile?.subscription_status || null,
        storiesUsedThisMonth,
        storiesRemaining,
        monthlyLimit: hasActiveSubscription ? PRICING_CONFIG.SUBSCRIPTION_MONTHLY_LIMIT : 0,
        daysUntilReset,
        totalStoriesGenerated,
        freeTrialUsed,
        generationCredits,
        storyNumber,
        loading: false,
        error: null,
      })

    } catch (err: any) {
      console.error('Error fetching subscription data:', err)
      setState(prev => ({
        ...prev,
        loading: false,
        error: err.message,
      }))
    }
  }

  useEffect(() => {
    fetchSubscriptionData()

    // Set up auth state listener
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchSubscriptionData()
      } else if (event === 'SIGNED_OUT') {
        setState({ ...defaultState, loading: false })
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const canGenerateStory = (): boolean => {
    if (state.loading) return false

    // Only users with active subscription (including trialing) can generate stories
    if (state.hasActiveSubscription) {
      return state.storiesRemaining > 0
    }

    // Non-subscribers cannot generate stories - must start free trial
    return false
  }

  const getUsageMessage = (): string => {
    if (state.loading) return ''

    if (state.hasActiveSubscription) {
      if (state.storiesRemaining === 0) {
        return `You've used all ${state.monthlyLimit} stories this month. Resets in ${state.daysUntilReset} days.`
      }
      return `${state.storiesRemaining} of ${state.monthlyLimit} stories remaining this month`
    }

    // Non-subscribers need to start free trial
    return 'Start your free trial to create stories'
  }

  const value: SubscriptionContextType = {
    ...state,
    refresh: fetchSubscriptionData,
    canGenerateStory,
    getUsageMessage,
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}

/**
 * Calculate billing cycle boundaries from subscription start date
 * Uses UTC to avoid timezone issues with dates from the database
 */
function calculateBillingCycle(subscriptionStartsAt: Date): {
  start: Date
  end: Date
  daysRemaining: number
} {
  const now = new Date()
  // Use UTC day from subscription to avoid timezone issues
  const anchorDay = subscriptionStartsAt.getUTCDate()

  // Find most recent occurrence of anchor day (in UTC)
  let cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), anchorDay))

  // If anchor day hasn't happened this month, go back one month
  if (cycleStart > now) {
    cycleStart.setUTCMonth(cycleStart.getUTCMonth() - 1)
  }

  // Handle months with fewer days (e.g., 31st in February)
  if (cycleStart.getUTCDate() !== anchorDay) {
    // Roll to last day of intended month
    const intendedMonth = cycleStart.getUTCMonth()
    cycleStart = new Date(Date.UTC(cycleStart.getUTCFullYear(), intendedMonth + 1, 0))
  }

  // Set time to start of day (UTC)
  cycleStart.setUTCHours(0, 0, 0, 0)

  // For the first billing cycle, use exact subscription timestamp
  const subStartMidnight = new Date(subscriptionStartsAt)
  subStartMidnight.setUTCHours(0, 0, 0, 0)
  if (cycleStart.getTime() === subStartMidnight.getTime()) {
    cycleStart = new Date(subscriptionStartsAt)
  }

  // Cycle end is one month after anchor day (in UTC)
  let cycleEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), anchorDay))
  if (cycleEnd <= now) {
    cycleEnd.setUTCMonth(cycleEnd.getUTCMonth() + 1)
  }

  // Handle end-of-month edge cases
  if (cycleEnd.getUTCDate() !== anchorDay) {
    const intendedMonth = cycleEnd.getUTCMonth()
    cycleEnd = new Date(Date.UTC(cycleEnd.getUTCFullYear(), intendedMonth + 1, 0))
  }

  // Calculate days remaining
  const msPerDay = 24 * 60 * 60 * 1000
  const daysRemaining = Math.ceil((cycleEnd.getTime() - now.getTime()) / msPerDay)

  return {
    start: cycleStart,
    end: cycleEnd,
    daysRemaining: Math.max(0, daysRemaining),
  }
}
