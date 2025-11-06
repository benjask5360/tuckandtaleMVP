'use client'

import { ReactNode, useEffect } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Hide navbar and remove padding on mount
    const navbar = document.querySelector('body > nav')
    const main = document.querySelector('body > main')

    if (navbar) {
      ;(navbar as HTMLElement).style.display = 'none'
    }
    if (main) {
      ;(main as HTMLElement).style.paddingTop = '0'
    }

    // Restore on unmount
    return () => {
      if (navbar) {
        ;(navbar as HTMLElement).style.display = ''
      }
      if (main) {
        ;(main as HTMLElement).style.paddingTop = ''
      }
    }
  }, [])

  return <>{children}</>
}
