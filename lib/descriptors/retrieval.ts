/**
 * Descriptor retrieval functions
 * Fetches and combines descriptors based on profile type
 */

import { createClient } from '@/lib/supabase/server';
import {
  ProfileType,
  CharacterDescriptors,
  DescriptorMapping,
  DescriptorAttribute,
  DescriptorAge,
  DescriptorGender,
  DescriptorPet,
  DescriptorMagical,
  DescriptorFetchOptions,
  DescriptorApiResponse,
  AttributeType,
} from './types';

/**
 * Get the descriptor tables applicable for a given profile type
 */
export async function getDescriptorMappings(
  profileType: ProfileType
): Promise<DescriptorMapping[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('descriptor_mappings')
    .select('*')
    .eq('profile_type', profileType);

  if (error) {
    console.error('Error fetching descriptor mappings:', error);
    throw new Error(`Failed to fetch descriptor mappings: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch attribute descriptors (hair, eyes, skin, body)
 */
export async function getAttributeDescriptors(
  attributeType?: AttributeType,
  includeInactive = false
): Promise<DescriptorAttribute[]> {
  const supabase = await createClient();

  let query = supabase
    .from('descriptors_attribute')
    .select('*');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (attributeType) {
    query = query.eq('attribute_type', attributeType);
  }

  query = query.order('attribute_type').order('sort_order');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching attribute descriptors:', error);
    throw new Error(`Failed to fetch attribute descriptors: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch age descriptors
 */
export async function getAgeDescriptors(
  includeInactive = false
): Promise<DescriptorAge[]> {
  const supabase = await createClient();

  let query = supabase
    .from('descriptors_age')
    .select('*');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  query = query.order('age_value');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching age descriptors:', error);
    throw new Error(`Failed to fetch age descriptors: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch gender descriptors
 */
export async function getGenderDescriptors(
  includeInactive = false
): Promise<DescriptorGender[]> {
  const supabase = await createClient();

  let query = supabase
    .from('descriptors_gender')
    .select('*');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching gender descriptors:', error);
    throw new Error(`Failed to fetch gender descriptors: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch pet descriptors
 */
export async function getPetDescriptors(
  species?: string,
  includeInactive = false
): Promise<DescriptorPet[]> {
  const supabase = await createClient();

  let query = supabase
    .from('descriptors_pet')
    .select('*');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (species) {
    query = query.eq('species', species);
  }

  query = query.order('species').order('breed');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching pet descriptors:', error);
    throw new Error(`Failed to fetch pet descriptors: ${error.message}`);
  }

  return data || [];
}

/**
 * Fetch magical creature descriptors
 */
export async function getMagicalDescriptors(
  creatureType?: string,
  includeInactive = false
): Promise<DescriptorMagical[]> {
  const supabase = await createClient();

  let query = supabase
    .from('descriptors_magical')
    .select('*');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  if (creatureType) {
    query = query.eq('creature_type', creatureType);
  }

  query = query.order('rarity').order('creature_type');

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching magical descriptors:', error);
    throw new Error(`Failed to fetch magical descriptors: ${error.message}`);
  }

  return data || [];
}

/**
 * Main function to fetch all applicable descriptors for a profile type
 */
export async function getDescriptorsForProfileType(
  options: DescriptorFetchOptions
): Promise<DescriptorApiResponse> {
  const { profileType, includeInactive = false } = options;

  // Get the mappings to know which tables to query
  const mappings = await getDescriptorMappings(profileType);

  const descriptors: CharacterDescriptors = {};

  // Fetch descriptors from each applicable table
  for (const mapping of mappings) {
    switch (mapping.descriptor_table) {
      case 'descriptors_attribute':
        descriptors.attributes = await getAttributeDescriptors(
          undefined,
          includeInactive
        );
        break;

      case 'descriptors_age':
        const ageDescriptors = await getAgeDescriptors(includeInactive);
        // For age, we return the array but typically only one is selected
        descriptors.age = ageDescriptors[0]; // Default to first, or handle selection elsewhere
        break;

      case 'descriptors_gender':
        const genderDescriptors = await getGenderDescriptors(includeInactive);
        descriptors.gender = genderDescriptors[0]; // Default to first, or handle selection elsewhere
        break;

      case 'descriptors_pet':
        const petDescriptors = await getPetDescriptors(undefined, includeInactive);
        descriptors.pet = petDescriptors[0]; // Default to first, or handle selection elsewhere
        break;

      case 'descriptors_magical':
        const magicalDescriptors = await getMagicalDescriptors(
          undefined,
          includeInactive
        );
        descriptors.magical = magicalDescriptors[0]; // Default to first, or handle selection elsewhere
        break;
    }
  }

  return {
    descriptors,
    mappings,
  };
}

/**
 * Get a specific descriptor by simple term
 * This is used to map user selections to rich descriptions
 */
export async function getDescriptorBySimpleTerm(
  tableName: string,
  simpleTerm: string,
  additionalFilters?: Record<string, any>
): Promise<any> {
  const supabase = await createClient();

  let query = supabase
    .from(tableName)
    .select('*')
    .eq('simple_term', simpleTerm)
    .eq('is_active', true);

  // Handle special _age_lookup filter for age-aware gender descriptors
  if (additionalFilters?._age_lookup !== undefined) {
    const age = additionalFilters._age_lookup;
    // Query for gender descriptor where age falls within min_age and max_age range
    // age >= min_age AND age <= max_age
    query = query.lte('min_age', age).gte('max_age', age);
    // Remove _age_lookup from filters so it's not applied as a regular column filter
    const { _age_lookup, ...otherFilters } = additionalFilters;
    additionalFilters = otherFilters;
  }

  // Add any additional filters (e.g., attribute_type for descriptors_attribute)
  if (additionalFilters && Object.keys(additionalFilters).length > 0) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // Apply single() to get a single result
  const finalQuery = query.single();

  const { data, error } = await finalQuery;

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
    console.error('Error fetching descriptor by simple term:', error);
    throw new Error(`Failed to fetch descriptor: ${error.message}`);
  }

  return data;
}

/**
 * Batch fetch descriptors by simple terms
 * Efficient for fetching multiple descriptors at once
 */
export async function getDescriptorsBySimpleTerms(
  mappings: Array<{
    table: string;
    term: string;
    filters?: Record<string, any>;
  }>
): Promise<Record<string, any>> {
  const results: Record<string, any> = {};

  // Use Promise.all for parallel fetching
  await Promise.all(
    mappings.map(async ({ table, term, filters }) => {
      try {
        const descriptor = await getDescriptorBySimpleTerm(table, term, filters);
        if (descriptor) {
          results[`${table}_${term}`] = descriptor;
        }
      } catch (error) {
        console.error(`Error fetching ${table} descriptor for "${term}":`, error);
        // Continue with other descriptors even if one fails
      }
    })
  );

  return results;
}

/**
 * Get grouped attribute descriptors by type
 * Useful for UI dropdowns
 */
export async function getGroupedAttributeDescriptors(
  includeInactive = false
): Promise<Record<AttributeType, DescriptorAttribute[]>> {
  const attributes = await getAttributeDescriptors(undefined, includeInactive);

  const grouped: Record<AttributeType, DescriptorAttribute[]> = {
    hair: [],
    eyes: [],
    skin: [],
    body: [],
  };

  attributes.forEach((attr) => {
    if (grouped[attr.attribute_type]) {
      grouped[attr.attribute_type].push(attr);
    }
  });

  return grouped;
}

/**
 * Get unique species from pet descriptors
 * Useful for species selection dropdown
 */
export async function getUniqueSpecies(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('descriptors_pet')
    .select('species')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching unique species:', error);
    throw new Error(`Failed to fetch species: ${error.message}`);
  }

  // Extract unique species
  const uniqueSpecies = [...new Set(data?.map(item => item.species) || [])];
  return uniqueSpecies.sort();
}

/**
 * Get unique creature types from magical descriptors
 * Useful for creature type selection dropdown
 */
export async function getUniqueCreatureTypes(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('descriptors_magical')
    .select('creature_type')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching unique creature types:', error);
    throw new Error(`Failed to fetch creature types: ${error.message}`);
  }

  // Extract unique creature types
  const uniqueTypes = [...new Set(data?.map(item => item.creature_type) || [])];
  return uniqueTypes.sort();
}