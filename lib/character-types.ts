import { FormFieldConfig } from '@/components/forms/fields/FieldRenderer'

export interface CharacterTypeConfig {
  id: string
  displayName: string
  category: 'child' | 'other'
  fieldGroups: {
    title: string
    fields: FormFieldConfig[]
  }[]
}

// This configuration can be moved to a database or CMS in the future
// for true no-code editing capabilities
export const characterTypes: CharacterTypeConfig[] = [
  {
    id: 'child',
    displayName: 'Child',
    category: 'child',
    fieldGroups: [
      {
        title: 'Basic Information',
        fields: [
          {
            id: 'name',
            type: 'text',
            label: 'Child\'s Name',
            placeholder: 'Enter your child\'s name',
            required: true
          },
          {
            id: 'dateOfBirth',
            type: 'date',
            label: 'Date of Birth',
            required: true
          },
          {
            id: 'gender',
            type: 'buttons',
            label: 'Gender',
            required: true,
            options: [
              { value: 'male', label: 'Boy', emoji: '👦' },
              { value: 'female', label: 'Girl', emoji: '👧' },
              { value: 'non-binary', label: 'Prefer not to say', emoji: '🌟' }
            ]
          }
        ]
      },
      {
        title: 'Appearance',
        fields: [
          {
            id: 'hairColor',
            type: 'buttons',
            label: 'Hair Color',
            customOptions: true,
            options: [
              { value: 'blonde', label: 'Blonde' },
              { value: 'brown', label: 'Brown' },
              { value: 'black', label: 'Black' },
              { value: 'red', label: 'Red' },
              { value: 'auburn', label: 'Auburn' }
            ]
          },
          {
            id: 'hairLength',
            type: 'buttons',
            label: 'Hair Length',
            customOptions: true,
            options: [
              { value: 'short', label: 'Short' },
              { value: 'medium', label: 'Medium' },
              { value: 'long', label: 'Long' },
              { value: 'very_long', label: 'Very Long' },
              { value: 'bald', label: 'Bald' }
            ]
          },
          {
            id: 'eyeColor',
            type: 'buttons',
            label: 'Eye Color',
            customOptions: true,
            options: [
              { value: 'blue', label: 'Blue' },
              { value: 'brown', label: 'Brown' },
              { value: 'green', label: 'Green' },
              { value: 'hazel', label: 'Hazel' },
              { value: 'gray', label: 'Gray' }
            ]
          },
          {
            id: 'skinTone',
            type: 'buttons',
            label: 'Skin Tone',
            customOptions: true,
            options: [
              { value: 'fair', label: 'Fair' },
              { value: 'light', label: 'Light' },
              { value: 'medium', label: 'Medium' },
              { value: 'olive', label: 'Olive' },
              { value: 'tan', label: 'Tan' },
              { value: 'brown', label: 'Brown' },
              { value: 'dark', label: 'Dark' }
            ]
          },
          {
            id: 'bodyType',
            type: 'buttons',
            label: 'Body Type',
            customOptions: true,
            options: [
              { value: 'slim', label: 'Slim' },
              { value: 'average', label: 'Average' },
              { value: 'athletic', label: 'Athletic' },
              { value: 'stocky', label: 'Stocky' }
            ]
          },
          {
            id: 'hasGlasses',
            type: 'toggle',
            label: 'Wears glasses?',
            defaultValue: false
          }
        ]
      },
      {
        title: 'Personality & Development',
        fields: [
          {
            id: 'specialTraits',
            type: 'textarea',
            label: 'Special Traits',
            placeholder: 'Describe any special traits or characteristics'
          },
          {
            id: 'interests',
            type: 'multiselect',
            label: 'Interests (select all that apply)',
            options: [
              { value: 'animals', label: 'Animals', emoji: '🐾' },
              { value: 'sports', label: 'Sports', emoji: '⚽' },
              { value: 'music', label: 'Music', emoji: '🎵' },
              { value: 'art', label: 'Art', emoji: '🎨' },
              { value: 'science', label: 'Science', emoji: '🔬' },
              { value: 'reading', label: 'Reading', emoji: '📚' },
              { value: 'outdoors', label: 'Outdoors', emoji: '🌲' },
              { value: 'technology', label: 'Technology', emoji: '💻' },
              { value: 'cooking', label: 'Cooking', emoji: '👨‍🍳' },
              { value: 'dancing', label: 'Dancing', emoji: '💃' }
            ]
          },
          {
            id: 'growthAreas',
            type: 'multiselect',
            label: 'Growth Areas (select all that apply)',
            options: [
              { value: 'emotional_regulation', label: 'Emotional Regulation', emoji: '❤️' },
              { value: 'social_skills', label: 'Social Skills', emoji: '🤝' },
              { value: 'confidence', label: 'Confidence', emoji: '💪' },
              { value: 'patience', label: 'Patience', emoji: '⏳' },
              { value: 'sharing', label: 'Sharing', emoji: '🤲' },
              { value: 'listening', label: 'Listening', emoji: '👂' },
              { value: 'problem_solving', label: 'Problem Solving', emoji: '🧩' },
              { value: 'creativity', label: 'Creativity', emoji: '✨' },
              { value: 'independence', label: 'Independence', emoji: '🚀' },
              { value: 'responsibility', label: 'Responsibility', emoji: '📋' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'storybook_character',
    displayName: 'Storybook Character',
    category: 'other',
    fieldGroups: [
      {
        title: 'Basic Information',
        fields: [
          {
            id: 'name',
            type: 'text',
            label: 'Character Name',
            placeholder: 'Enter character name',
            required: true
          },
          {
            id: 'age',
            type: 'number',
            label: 'Age',
            placeholder: 'Enter age'
          },
          {
            id: 'gender',
            type: 'buttons',
            label: 'Gender',
            options: [
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'non_binary', label: 'Non-binary' },
              { value: 'other', label: 'Other' }
            ]
          }
        ]
      },
      {
        title: 'Appearance',
        fields: [
          {
            id: 'hairColor',
            type: 'buttons',
            label: 'Hair Color',
            customOptions: true,
            options: [
              { value: 'blonde', label: 'Blonde' },
              { value: 'brown', label: 'Brown' },
              { value: 'black', label: 'Black' },
              { value: 'red', label: 'Red' },
              { value: 'white', label: 'White' },
              { value: 'gray', label: 'Gray' },
              { value: 'blue', label: 'Blue' },
              { value: 'pink', label: 'Pink' },
              { value: 'purple', label: 'Purple' },
              { value: 'green', label: 'Green' }
            ]
          },
          {
            id: 'hairLength',
            type: 'buttons',
            label: 'Hair Length',
            customOptions: true,
            options: [
              { value: 'short', label: 'Short' },
              { value: 'medium', label: 'Medium' },
              { value: 'long', label: 'Long' },
              { value: 'very_long', label: 'Very Long' },
              { value: 'bald', label: 'Bald' }
            ]
          },
          {
            id: 'eyeColor',
            type: 'buttons',
            label: 'Eye Color',
            customOptions: true,
            options: [
              { value: 'blue', label: 'Blue' },
              { value: 'brown', label: 'Brown' },
              { value: 'green', label: 'Green' },
              { value: 'hazel', label: 'Hazel' },
              { value: 'gray', label: 'Gray' },
              { value: 'violet', label: 'Violet' },
              { value: 'amber', label: 'Amber' }
            ]
          },
          {
            id: 'skinTone',
            type: 'buttons',
            label: 'Skin Tone',
            customOptions: true,
            options: [
              { value: 'fair', label: 'Fair' },
              { value: 'light', label: 'Light' },
              { value: 'medium', label: 'Medium' },
              { value: 'olive', label: 'Olive' },
              { value: 'tan', label: 'Tan' },
              { value: 'brown', label: 'Brown' },
              { value: 'dark', label: 'Dark' }
            ]
          },
          {
            id: 'bodyType',
            type: 'buttons',
            label: 'Body Type',
            customOptions: true,
            options: [
              { value: 'slim', label: 'Slim' },
              { value: 'average', label: 'Average' },
              { value: 'athletic', label: 'Athletic' },
              { value: 'stocky', label: 'Stocky' },
              { value: 'tall', label: 'Tall' },
              { value: 'short', label: 'Short' }
            ]
          },
          {
            id: 'hasGlasses',
            type: 'toggle',
            label: 'Wears glasses?',
            defaultValue: false
          }
        ]
      }
    ]
  },
  {
    id: 'pet',
    displayName: 'Pet',
    category: 'other',
    fieldGroups: [
      {
        title: 'Pet Information',
        fields: [
          {
            id: 'name',
            type: 'text',
            label: 'Pet Name',
            placeholder: 'Enter pet name',
            required: true
          },
          {
            id: 'species',
            type: 'buttons',
            label: 'Species',
            customOptions: true,
            required: true,
            options: [
              { value: 'dog', label: 'Dog', emoji: '🐕' },
              { value: 'cat', label: 'Cat', emoji: '🐈' },
              { value: 'bird', label: 'Bird', emoji: '🦜' },
              { value: 'rabbit', label: 'Rabbit', emoji: '🐰' },
              { value: 'hamster', label: 'Hamster', emoji: '🐹' },
              { value: 'fish', label: 'Fish', emoji: '🐠' },
              { value: 'turtle', label: 'Turtle', emoji: '🐢' },
              { value: 'horse', label: 'Horse', emoji: '🐴' }
            ]
          },
          {
            id: 'breed',
            type: 'text',
            label: 'Breed',
            placeholder: 'e.g., Golden Retriever, Persian, Parrot'
          },
          {
            id: 'primaryColor',
            type: 'buttons',
            label: 'Fur/Feather Color',
            customOptions: true,
            options: [
              { value: 'white', label: 'White' },
              { value: 'black', label: 'Black' },
              { value: 'brown', label: 'Brown' },
              { value: 'gray', label: 'Gray' },
              { value: 'golden', label: 'Golden' },
              { value: 'orange', label: 'Orange' },
              { value: 'spotted', label: 'Spotted' },
              { value: 'striped', label: 'Striped' }
            ]
          },
          {
            id: 'eyeColor',
            type: 'buttons',
            label: 'Eye Color',
            customOptions: true,
            options: [
              { value: 'blue', label: 'Blue' },
              { value: 'brown', label: 'Brown' },
              { value: 'green', label: 'Green' },
              { value: 'amber', label: 'Amber' },
              { value: 'hazel', label: 'Hazel' },
              { value: 'gray', label: 'Gray' },
              { value: 'black', label: 'Black' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'magical_creature',
    displayName: 'Magical Creature',
    category: 'other',
    fieldGroups: [
      {
        title: 'Magical Being',
        fields: [
          {
            id: 'name',
            type: 'text',
            label: 'Creature Name',
            placeholder: 'Enter creature name',
            required: true
          },
          {
            id: 'creatureType',
            type: 'buttons',
            label: 'Creature Type',
            customOptions: true,
            required: true,
            options: [
              { value: 'dragon', label: 'Dragon', emoji: '🐉' },
              { value: 'unicorn', label: 'Unicorn', emoji: '🦄' },
              { value: 'fairy', label: 'Fairy', emoji: '🧚' },
              { value: 'phoenix', label: 'Phoenix', emoji: '🔥' },
              { value: 'mermaid', label: 'Mermaid', emoji: '🧜' },
              { value: 'griffin', label: 'Griffin', emoji: '🦅' },
              { value: 'elf', label: 'Elf', emoji: '🧝' },
              { value: 'wizard', label: 'Wizard', emoji: '🧙' }
            ]
          },
          {
            id: 'color',
            type: 'buttons',
            label: 'Color',
            customOptions: true,
            options: [
              { value: 'gold', label: 'Gold' },
              { value: 'silver', label: 'Silver' },
              { value: 'rainbow', label: 'Rainbow' },
              { value: 'purple', label: 'Purple' },
              { value: 'blue', label: 'Blue' },
              { value: 'green', label: 'Green' },
              { value: 'red', label: 'Red' },
              { value: 'white', label: 'White' },
              { value: 'black', label: 'Black' }
            ]
          },
          {
            id: 'specialFeatures',
            type: 'textarea',
            label: 'Special Features',
            placeholder: 'e.g., sparkly wings, breathes fire, can become invisible'
          }
        ]
      }
    ]
  }
]

export function getCharacterTypeById(id: string): CharacterTypeConfig | undefined {
  return characterTypes.find(type => type.id === id)
}

export function getCharacterTypesByCategory(category: 'child' | 'other'): CharacterTypeConfig[] {
  return characterTypes.filter(type => type.category === category)
}