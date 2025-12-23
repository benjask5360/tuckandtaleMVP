'use client'

import { useEffect } from 'react'

export default function MetaPageView() {
  useEffect(() => {
    if (window.fbq) {
      window.fbq('track', 'PageView')
    }
  }, [])

  return null
}
