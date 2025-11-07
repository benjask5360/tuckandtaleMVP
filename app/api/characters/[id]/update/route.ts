import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
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

    // Parse request body
    const { name, character_type, attributes } = await request.json()

    if (!name || !character_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the character belongs to the user
    const { data: existingCharacter, error: fetchError } = await supabase
      .from('character_profiles')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !existingCharacter) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Generate appearance description based on attributes
    let appearance_description = `A ${character_type.replace('_', ' ')}`
    if (attributes.age || attributes.dateOfBirth) {
      const age = attributes.age || calculateAge(attributes.dateOfBirth)
      appearance_description += ` ${age} years old`
    }
    if (attributes.hairColor) {
      appearance_description += ` with ${attributes.hairColor} hair`
    }
    if (attributes.eyeColor) {
      appearance_description += ` and ${attributes.eyeColor} eyes`
    }

    // Update character in database
    const { data: character, error: updateError } = await supabase
      .from('character_profiles')
      .update({
        character_type,
        name,
        attributes,
        appearance_description,
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating character:', updateError)
      return NextResponse.json(
        { error: 'Failed to update character' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      character,
      message: 'Character updated successfully',
    })
  } catch (error: any) {
    console.error('Error in character update:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
