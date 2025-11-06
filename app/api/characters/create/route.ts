import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
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

    // Parse request body
    const { name, attributes, appearanceDescription, isFirstTime } = await request.json()

    if (!name || !attributes || !appearanceDescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create character in database
    const { data: character, error: createError } = await supabase
      .from('character_profiles')
      .insert({
        user_id: user.id,
        character_type: 'child',
        name,
        attributes,
        appearance_description: appearanceDescription,
        is_primary: isFirstTime || false, // Mark as primary if it's their first character
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating character:', createError)
      return NextResponse.json(
        { error: 'Failed to create character' },
        { status: 500 }
      )
    }

    // For MVP, we'll skip avatar generation for now and add it in the next phase
    // This allows us to test the flow without Leonardo API calls
    // TODO: Integrate Leonardo API for avatar generation

    return NextResponse.json({
      success: true,
      character,
      message: 'Character created successfully',
    })
  } catch (error: any) {
    console.error('Error in character creation:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
