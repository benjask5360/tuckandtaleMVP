# Descriptor System Documentation

## Overview

The descriptor system is a modular, database-driven solution that enhances avatar and story generation by providing rich, contextual descriptions. It maps simple user-friendly terms (e.g., "black hair") to enhanced descriptors (e.g., "jet black hair") for AI generation while keeping the UI simple for parents.

## Architecture

### Database Tables

1. **descriptors_attribute** - Physical attributes (hair, eyes, skin, body)
2. **descriptors_age** - Age-specific developmental markers
3. **descriptors_gender** - Gender presentation options
4. **descriptors_pet** - Pet-specific traits and behaviors
5. **descriptors_magical** - Fantasy/magical creature attributes
6. **descriptor_mappings** - Links profile types to applicable descriptor tables

### Key Features

- **Simple → Rich Mapping**: Users select simple terms; AI uses enhanced descriptions
- **Profile-Type Aware**: Automatically selects relevant descriptors based on character type
- **Modular & Extensible**: Each descriptor table is independent and can be extended
- **Future-Proof**: JSONB fields for custom attributes and easy expansion

## Usage Examples

### Fetching Descriptors for a Profile Type

```typescript
import { getDescriptorsForProfileType } from '@/lib/descriptors/retrieval'

const response = await getDescriptorsForProfileType({
  profileType: 'child',
  includeInactive: false
})

// response.descriptors contains applicable descriptors
// response.mappings contains the mapping configuration
```

### Generating AI Prompts

```typescript
import { generateAIPrompt } from '@/lib/descriptors/prompt-builder'

const { prompt, enhancedDescriptors } = await generateAIPrompt({
  profileType: 'child',
  selections: {
    age: 6,
    gender: 'girl',
    hairColor: 'black',
    eyeColor: 'blue',
    skinTone: 'fair'
  },
  style: 'concise'
})

// Output: "A six-year-old young girl with jet black hair, ocean blue eyes, and porcelain skin"
```

### Generating Avatar Prompts

```typescript
import { generateAvatarPrompt } from '@/lib/descriptors/prompt-builder'

const avatarPrompt = await generateAvatarPrompt('child', {
  age: 6,
  gender: 'girl',
  hairColor: 'blonde',
  eyeColor: 'green'
})

// Output: "Portrait of a six-year-old young girl with golden blonde hair and emerald green eyes, friendly expression, children's book illustration style"
```

## API Endpoints

### GET /api/descriptors/[profileType]

Fetches all applicable descriptors for a given profile type.

**Parameters:**
- `profileType`: One of `child`, `storybook_character`, `pet`, `magical_creature`

**Response:**
```json
{
  "descriptors": {
    "attributes": [...],
    "age": {...},
    "gender": {...}
  },
  "mappings": [...]
}
```

## Character Creation/Update Integration

The descriptor system is automatically integrated with character creation and update endpoints:

1. User selections are stored as simple terms in `character_profiles.attributes`
2. During creation/update, the system maps these to enhanced descriptors
3. An AI-ready prompt is generated and stored in `appearance_description`
4. Avatar prompts are generated and stored for future Leonardo AI integration

## Database Migrations

Run the migrations to set up the descriptor system:

```bash
npx supabase db push
```

This will create:
- All 5 descriptor tables with indexes
- RLS policies (read for all authenticated users, write for admins only)
- Seed data with comprehensive descriptors

## Extending the System

### Adding New Descriptors

```sql
INSERT INTO public.descriptors_attribute (attribute_type, simple_term, rich_description) VALUES
('hair', 'silver', 'shimmering silver');
```

### Adding New Profile Type Mappings

```sql
INSERT INTO public.descriptor_mappings (profile_type, descriptor_table) VALUES
('new_type', 'descriptors_attribute');
```

### Creating Custom Descriptor Tables

Follow the pattern of existing tables and:
1. Add the table to migrations
2. Add TypeScript types
3. Update retrieval functions
4. Update prompt builder

## TypeScript Types

All types are defined in `lib/descriptors/types.ts`:

- `DescriptorAttribute` - Physical attribute descriptor
- `DescriptorAge` - Age descriptor
- `DescriptorGender` - Gender descriptor
- `DescriptorPet` - Pet descriptor
- `DescriptorMagical` - Magical creature descriptor
- `CharacterSelections` - User selections (simple terms)
- `EnhancedDescriptors` - AI-ready enhanced descriptions

## Performance Considerations

- Descriptors are indexed for fast lookups
- Consider implementing caching for frequently accessed descriptors
- Batch fetch descriptors when possible using `getDescriptorsBySimpleTerms`

## Future Enhancements

1. **Personality Descriptors**: Add personality traits table
2. **Interest Descriptors**: Add interests/hobbies table
3. **Dynamic Prompt Templates**: Store templates in database
4. **Localization**: Add multi-language support for descriptors
5. **User-Created Descriptors**: Allow users to create custom descriptors
6. **AI Learning**: Track which descriptors produce best results