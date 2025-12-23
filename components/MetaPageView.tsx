'use client'

import { useEffect, useRef } from 'react'

export default function MetaPageView() {
  const fired = useRef(false)

  useEffect(() => {
    if (!fired.current && window.fbq) {
      window.fbq('track', 'PageView')
      fired.current = true
    }
  }, [])

  return null
}
