'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Client component to fire Meta Pixel StartTrial event
 * when user lands on dashboard after successful trial signup
 * Value is $0 since trial is free - actual Purchase tracked via Stripe webhook
 */
export default function MetaPixelStartTrial() {
  const searchParams = useSearchParams()
  const startTrialPixelFired = useRef(false)

  useEffect(() => {
    const subscriptionSuccess = searchParams.get('subscription') === 'success'
    if (subscriptionSuccess && !startTrialPixelFired.current) {
      startTrialPixelFired.current = true
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'StartTrial', { currency: 'USD', value: 0 })
      }
    }
  }, [searchParams])

  return null
}
