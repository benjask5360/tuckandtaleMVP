import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateAIPrompt, generateAvatarPrompt } from '@/lib/descriptors/prompt-builder'
import { ProfileType, CharacterSelections } from '@/lib/descriptors/types'

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
    const { name, character_type, attributes, avatar_url } = await request.json()

    // Allow partial updates for avatar_url
    if (!avatar_url && (!name || !character_type)) {
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

    // Handle avatar_url only update
    if (avatar_url && !name && !character_type) {
      const { data: character, error: updateError } = await supabase
        .from('character_profiles')
        .update({
          avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)
        .eq('user_id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating avatar URL:', updateError)
        return NextResponse.json(
          { error: 'Failed to update avatar URL' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        character,
        message: 'Avatar URL updated successfully',
      })
    }

    // Convert character_type to ProfileType for descriptor system
    const profileType = character_type as ProfileType

    // Build character selections from attributes
    const selections: CharacterSelections = {
      ...attributes,
      age: attributes.age || calculateAge(attributes.dateOfBirth),
    }

    // Generate enhanced appearance description using descriptor system
    let appearance_description = `A ${character_type.replace('_', ' ')}`
    try {
      const { prompt, enhancedDescriptors } = await generateAIPrompt({
        profileType,
        selections,
        style: 'concise'
      })
      appearance_description = prompt

      // Also generate avatar prompt for future use
      const avatarPrompt = await generateAvatarPrompt(profileType, selections)
      // Store avatar prompt in attributes for later use when Leonardo API is integrated
      attributes._avatarPrompt = avatarPrompt
    } catch (error) {
      console.error('Error generating enhanced description:', error)
      // Fallback to basic description if descriptor system fails
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
    }

    // Update character in database - include avatar_url if provided
    const updateData: any = {
      character_type,
      name,
      attributes,
      appearance_description,
    }

    if (avatar_url) {
      updateData.avatar_url = avatar_url
    }

    const { data: character, error: updateError } = await supabase
      .from('character_profiles')
      .update(updateData)
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
