/**
 * UTM Parameter Capture Utilities
 *
 * Captures UTM parameters from URL and stores in localStorage.
 * Used to track marketing attribution for signups.
 */

const UTM_STORAGE_KEY = 'tuckandtale_utm'

export interface UTMParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
}

/**
 * Capture UTM parameters from current URL and save to localStorage.
 * Only saves if at least one UTM param is present.
 * Safe to call on any page - silently fails if anything goes wrong.
 */
export function captureUTMFromURL(): void {
  try {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const utm_source = params.get('utm_source')
    const utm_medium = params.get('utm_medium')
    const utm_campaign = params.get('utm_campaign')

    // Only save if at least one UTM param exists
    if (utm_source || utm_medium || utm_campaign) {
      const utms: UTMParams = {}
      if (utm_source) utms.utm_source = utm_source
      if (utm_medium) utms.utm_medium = utm_medium
      if (utm_campaign) utms.utm_campaign = utm_campaign

      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utms))
    }
  } catch (e) {
    // Silent fail - UTM capture is non-critical
    console.error('[UTM] Capture failed:', e)
  }
}

/**
 * Get stored UTM parameters from localStorage.
 * Returns null if none stored or on error.
 */
export function getStoredUTMs(): UTMParams | null {
  try {
    if (typeof window === 'undefined') return null

    const stored = localStorage.getItem(UTM_STORAGE_KEY)
    if (!stored) return null

    return JSON.parse(stored) as UTMParams
  } catch (e) {
    console.error('[UTM] Read failed:', e)
    return null
  }
}

/**
 * Clear stored UTM parameters from localStorage.
 */
export function clearStoredUTMs(): void {
  try {
    if (typeof window === 'undefined') return
    localStorage.removeItem(UTM_STORAGE_KEY)
  } catch (e) {
    console.error('[UTM] Clear failed:', e)
  }
}
