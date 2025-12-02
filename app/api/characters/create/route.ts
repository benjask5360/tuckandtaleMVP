import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateAIPrompt, generateAvatarPrompt } from '@/lib/prompt-builders'
import { ProfileType, CharacterSelections } from '@/lib/descriptors/types'
import { normalizeCharacterSelections } from '@/lib/descriptors/normalize'

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
    const { name, character_type, attributes, is_primary } = await request.json()

    if (!name || !character_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // All character types are now available to everyone
    // Paywall controls access, not feature availability

    // Convert character_type to ProfileType for descriptor system
    const profileType = character_type as ProfileType

    console.log('🔧 [CHARACTER CREATE] Starting character creation:', {
      name,
      profileType,
      rawAttributes: attributes
    })

    // Build character selections from attributes
    let selections: CharacterSelections = {
      ...attributes,
      age: attributes.age || calculateAge(attributes.dateOfBirth),
    }

    console.log('🔧 [CHARACTER CREATE] Before normalization:', selections)

    // Normalize selections to use descriptor simple_terms when available
    selections = await normalizeCharacterSelections(profileType, selections)

    console.log('🔧 [CHARACTER CREATE] After normalization:', selections)

    // Update attributes with normalized values
    Object.assign(attributes, selections)

    // Generate enhanced appearance description using descriptor system
    let appearance_description = `A ${character_type.replace('_', ' ')}`
    console.log('🔧 [CHARACTER CREATE] Fallback description set to:', appearance_description)

    try {
      console.log('🔧 [CHARACTER CREATE] Calling generateAIPrompt...')
      const { prompt } = await generateAIPrompt({
        profileType,
        selections,
        style: 'concise'
      })
      appearance_description = prompt
      console.log('🔧 [CHARACTER CREATE] Generated description:', appearance_description)

      // Also generate avatar prompt for future use
      const avatarPrompt = await generateAvatarPrompt(profileType, selections)
      // Store avatar prompt in attributes for later use
      attributes._avatarPrompt = avatarPrompt
    } catch (error) {
      console.error('❌ [CHARACTER CREATE] Error generating enhanced description:', error)
      console.error('❌ [CHARACTER CREATE] Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
      // Fallback to basic description if descriptor system fails
      if (attributes.age || attributes.dateOfBirth) {
        const age = attributes.age || calculateAge(attributes.dateOfBirth)
        appearance_description += ` ${age} years old`
      }
      console.log('🔧 [CHARACTER CREATE] Using fallback description:', appearance_description)
      if (attributes.hairColor) {
        appearance_description += ` with ${attributes.hairColor} hair`
      }
      if (attributes.eyeColor) {
        appearance_description += ` and ${attributes.eyeColor} eyes`
      }
    }

    // Create character in database
    const { data: character, error: createError } = await supabase
      .from('character_profiles')
      .insert({
        user_id: user.id,
        character_type,
        name,
        attributes,
        appearance_description,
        is_primary: is_primary || false,
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
      id: character.id,
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
