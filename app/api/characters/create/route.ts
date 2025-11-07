import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateAIPrompt, generateAvatarPrompt } from '@/lib/prompt-builders'
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

    // Check subscription limits before creating
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select(`
        subscription_tier_id,
        subscription_tiers (
          max_child_profiles,
          max_other_characters
        )
      `)
      .eq('id', user.id)
      .single()

    const tier = userProfile?.subscription_tiers as any

    // Check character limit based on type (null means unlimited, so only use defaults if undefined)
    const maxAllowed = character_type === 'child'
      ? (tier?.max_child_profiles !== undefined ? tier.max_child_profiles : 1)
      : (tier?.max_other_characters !== undefined ? tier.max_other_characters : 0)

    if (maxAllowed !== null) {
      // Count existing characters of this type
      const { count } = await supabase
        .from('character_profiles')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('character_type', character_type === 'child' ? 'child' : character_type)
        .is('deleted_at', null)

      if ((count || 0) >= maxAllowed) {
        return NextResponse.json(
          { error: `You have reached the limit of ${maxAllowed} ${character_type === 'child' ? 'child profiles' : 'characters'} for your plan` },
          { status: 403 }
        )
      }
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
      const { prompt } = await generateAIPrompt({
        profileType,
        selections,
        style: 'concise'
      })
      appearance_description = prompt

      // Also generate avatar prompt for future use
      const avatarPrompt = await generateAvatarPrompt(profileType, selections)
      // Store avatar prompt in attributes for later use
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
