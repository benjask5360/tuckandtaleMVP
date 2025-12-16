'use client'

import { useEffect } from 'react'
import { captureUTMFromURL } from '@/lib/utils/utm'

/**
 * Client component that captures UTM parameters on page load.
 * Renders nothing - just runs the capture effect.
 */
export default function UTMCapture() {
  useEffect(() => {
    captureUTMFromURL()
  }, [])

  return null
}
