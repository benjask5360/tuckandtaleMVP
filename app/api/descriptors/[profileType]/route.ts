import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getDescriptorsForProfileType } from '@/lib/descriptors/retrieval'
import { ProfileType } from '@/lib/descriptors/types'

export async function GET(
  request: Request,
  { params }: { params: { profileType: string } }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Validate profile type
    const validProfileTypes = ['child', 'storybook_character', 'pet', 'magical_creature']
    if (!validProfileTypes.includes(params.profileType)) {
      return NextResponse.json(
        { error: 'Invalid profile type' },
        { status: 400 }
      )
    }

    const profileType = params.profileType as ProfileType

    // Fetch descriptors for this profile type
    const response = await getDescriptorsForProfileType({
      profileType,
      includeInactive: false,
    })

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error fetching descriptors:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch descriptors' },
      { status: 500 }
    )
  }
}