/**
 * Normalize character attributes to use descriptor simple_terms when available
 * This ensures consistent storage of attribute values while allowing custom user input
 */

import { createClient } from '@/lib/supabase/server';
import { ProfileType, CharacterSelections } from './types';

/**
 * Normalize a single attribute value by looking it up in the descriptor table
 * If a matching descriptor is found, return its simple_term
 * Otherwise, return the original user input unchanged
 */
async function normalizeAttributeValue(
  tableName: string,
  userValue: string,
  attributeType?: string
): Promise<string> {
  if (!userValue || typeof userValue !== 'string') {
    return userValue;
  }

  const supabase = await createClient();

  try {
    let query = supabase
      .from(tableName)
      .select('simple_term')
      .eq('is_active', true)
      .ilike('simple_term', userValue)
      .limit(1);

    // Add attribute_type filter for descriptors_attribute table
    if (attributeType) {
      query = query.eq('attribute_type', attributeType);
    }

    const { data, error } = await query.maybeSingle();

    if (data && data.simple_term) {
      console.log(`✓ Normalized "${userValue}" → "${data.simple_term}" (descriptor found)`);
      return data.simple_term;
    } else {
      console.log(`ℹ Using custom value "${userValue}" (no descriptor match)`);
      return userValue;
    }
  } catch (error) {
    console.warn(`Warning: Failed to normalize "${userValue}":`, error);
    // On error, use the original value
    return userValue;
  }
}

/**
 * Normalize character selections to use descriptor simple_terms
 * This modifies the selections object in-place
 */
export async function normalizeCharacterSelections(
  profileType: ProfileType,
  selections: CharacterSelections
): Promise<CharacterSelections> {
  console.log(`\n🔧 [NORMALIZE] Normalizing ${profileType} character selections...`);
  console.log(`🔧 [NORMALIZE] Input selections:`, JSON.stringify(selections, null, 2));

  const normalized = { ...selections };

  // Normalize pet-specific attributes
  if (profileType === 'pet') {
    // Normalize primaryColor (fur/feather color)
    if (selections.primaryColor) {
      normalized.primaryColor = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.primaryColor,
        'pet_color'
      );
    }

    // Normalize eyeColor
    if (selections.eyeColor) {
      normalized.eyeColor = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.eyeColor,
        'eyes'
      );
    }

    // Note: breed and species are typically unique user input, not normalized
  }

  // Normalize magical creature attributes
  if (profileType === 'magical_creature') {
    // Normalize color
    if (selections.color) {
      normalized.color = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.color,
        'magical_color'
      );
    }

    // Note: creatureType is typically unique user input, not normalized
  }

  // Normalize child/storybook_character attributes
  if (profileType === 'child' || profileType === 'storybook_character') {
    // Normalize hairColor
    if (selections.hairColor) {
      normalized.hairColor = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.hairColor,
        'hair'
      );
    }

    // Normalize eyeColor
    if (selections.eyeColor) {
      normalized.eyeColor = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.eyeColor,
        'eyes'
      );
    }

    // Normalize skinTone
    if (selections.skinTone) {
      normalized.skinTone = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.skinTone,
        'skin'
      );
    }

    // Normalize bodyType
    if (selections.bodyType) {
      normalized.bodyType = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.bodyType,
        'body'
      );
    }

    // Normalize hairLength
    if (selections.hairLength) {
      normalized.hairLength = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.hairLength,
        'hair_length'
      );
    }

    // Normalize hairType
    if (selections.hairType) {
      normalized.hairType = await normalizeAttributeValue(
        'descriptors_attribute',
        selections.hairType,
        'hair_type'
      );
    }

    // Normalize hasGlasses
    if (selections.hasGlasses !== undefined) {
      const glassesValue = selections.hasGlasses ? 'yes' : 'no';
      const normalizedGlasses = await normalizeAttributeValue(
        'descriptors_attribute',
        glassesValue,
        'glasses'
      );
      normalized.hasGlasses = normalizedGlasses === 'yes';
    }

    // Normalize gender (uses descriptors_gender table)
    if (selections.gender) {
      normalized.gender = await normalizeAttributeValue(
        'descriptors_gender',
        selections.gender
      );
    }
  }

  console.log('✅ [NORMALIZE] Normalization complete');
  console.log('✅ [NORMALIZE] Output selections:', JSON.stringify(normalized, null, 2));
  return normalized;
}
