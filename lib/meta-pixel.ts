/**
 * Meta Pixel utility for firing events with test_event_code support
 */

/**
 * Fire a Meta Pixel event with automatic test_event_code support
 * When test_event_code is present in URL, events will appear in Events Manager Test Events tab
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window === 'undefined' || !window.fbq) {
    return
  }

  const urlParams = new URLSearchParams(window.location.search)
  const testCode = urlParams.get('test_event_code')

  if (testCode) {
    // Include test_event_code for Events Manager Test Events visibility
    window.fbq('track', eventName, params || {}, {
      eventID: `${eventName.toLowerCase()}-${Date.now()}`,
      test_event_code: testCode
    })
  } else {
    // Standard event tracking
    if (params) {
      window.fbq('track', eventName, params)
    } else {
      window.fbq('track', eventName)
    }
  }
}
