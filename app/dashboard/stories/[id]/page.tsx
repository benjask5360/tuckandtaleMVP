import { redirect } from 'next/navigation'

/**
 * Legacy story viewer - redirects to story library
 *
 * All new stories use the V3 engine at /dashboard/stories/v3/[id]
 * Legacy/Beta stories are test data and not actively supported.
 */
export default function LegacyStoryViewerPage() {
  redirect('/dashboard/story-library')
}
