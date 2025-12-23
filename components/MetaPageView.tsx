'use client'

import { useEffect, useRef } from 'react'

export default function MetaPageView() {
  const fired = useRef(false)

  console.log('MetaPageView rendered')

  useEffect(() => {
    console.log('MetaPageView useEffect, fired.current:', fired.current)
    if (!fired.current && window.fbq) {
      console.log('MetaPageView firing PageView')
      window.fbq('track', 'PageView')
      fired.current = true
    }
  }, [])

  return null
}
