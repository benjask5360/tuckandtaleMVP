'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'

/**
 * Client component to fire Meta Pixel Subscribe event
 * when user lands on dashboard after successful subscription
 */
export default function MetaPixelSubscribe() {
  const searchParams = useSearchParams()
  const subscribePixelFired = useRef(false)

  useEffect(() => {
    const subscriptionSuccess = searchParams.get('subscription') === 'success'
    if (subscriptionSuccess && !subscribePixelFired.current) {
      subscribePixelFired.current = true
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Subscribe', { currency: 'USD', value: 14.99 })
      }
    }
  }, [searchParams])

  return null
}
