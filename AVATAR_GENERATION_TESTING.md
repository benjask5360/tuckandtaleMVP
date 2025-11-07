# Avatar Generation Testing Guide

## Prerequisites

1. **Leonardo AI API Key**
   - Sign up for Leonardo AI Apprentice plan at https://leonardo.ai
   - Get your API key from the dashboard
   - Add to `.env.local`:
     ```
     LEONARDO_API_KEY=your_api_key_here
     ```

2. **Database Setup**
   - Run the avatar generation migration:
     ```bash
     npx supabase db push
     ```
   - This creates all necessary tables and functions

## Testing Steps

### 1. Initial Setup Verification

```bash
# Check environment variable
echo $LEONARDO_API_KEY

# Verify Supabase tables exist
npx supabase db diff
```

### 2. Create a Test Character

1. Navigate to `/dashboard/my-children` or `/dashboard/other-characters`
2. Click "Add New Child" or "Add New Character"
3. Fill in the character details:
   - Name: Test Character
   - Age/Date of Birth: Any valid age
   - Gender: Select any option
   - Hair Color: Select any option
   - Eye Color: Select any option
   - Other attributes as needed
4. Click "Save Profile"

### 3. Test Avatar Generation

After saving the character:
1. The avatar section should appear below the form
2. Click "Generate Avatar" button
3. Observe the loading states:
   - "Starting avatar generation..." (0-10%)
   - "Generating your unique avatar..." (10-50%)
   - "Adding finishing touches..." (50-70%)
   - "Almost ready..." (70-90%)
   - Progress bar should show incremental progress
4. Generation should complete in 10-30 seconds
5. Avatar image should appear with success animation

### 4. Test Regeneration Limits

1. **Free Tier (Default)**
   - Can generate 1 avatar per month
   - After first generation, button should show "Regenerate Avatar"
   - After regeneration, should see "Monthly limit reached. Resets in X days"

2. **Moonlight Tier**
   - Can regenerate 5 times per month
   - Should see "You can regenerate X more times this month"

3. **Starlight Tier**
   - Can regenerate 10 times per month

4. **Supernova Tier**
   - Unlimited regenerations (999 per month)

### 5. Test Error Handling

1. **Invalid API Key**
   - Set incorrect LEONARDO_API_KEY
   - Should see error message: "Failed to generate avatar"

2. **Network Timeout**
   - Generation exceeds 60 seconds
   - Should see: "Generation timed out. Please try again."

3. **API Rate Limits**
   - Rapid successive generations
   - Should handle Leonardo rate limits gracefully

### 6. Verify Database Records

```sql
-- Check avatar cache entries
SELECT * FROM avatar_cache
WHERE character_profile_id = 'your_character_id'
ORDER BY created_at DESC;

-- Check generation usage
SELECT * FROM avatar_generation_usage
WHERE user_id = 'your_user_id'
ORDER BY created_at DESC;

-- Check AI config
SELECT * FROM ai_configs;

-- Check cost tracking
SELECT * FROM generation_costs
WHERE user_id = 'your_user_id'
ORDER BY created_at DESC;
```

### 7. Test Different Character Types

Create and test avatar generation for:
- Child profile
- Pet profile
- Magical creature
- Storybook character

Each should generate appropriate prompts based on their attributes.

### 8. Test Edit Flow

1. Go to existing character edit page
2. Avatar should display if already generated
3. Can regenerate (subject to limits)
4. New avatar should replace old one

## Expected Behaviors

### Success Flow
1. User saves character → Character ID created
2. Avatar section appears
3. User clicks "Generate Avatar"
4. Loading state with progress (10-30 seconds)
5. Avatar appears with success animation
6. Avatar URL saved to character profile
7. Usage tracked in database
8. Regeneration limit message shown

### UI States
- **No Avatar**: Shows placeholder with user icon
- **Generating**: Spinner, progress bar, status messages
- **Complete**: Avatar image with sparkle animation (3 seconds)
- **Error**: Red error message below avatar area
- **Limit Reached**: Disabled button with reset countdown

### Monthly Reset
- Limits reset on the 1st of each month
- Based on user's subscription tier
- Previous month's usage archived

## Troubleshooting

### Common Issues

1. **"Failed to generate avatar"**
   - Check LEONARDO_API_KEY is set correctly
   - Verify Leonardo account is active
   - Check API credits available

2. **Avatar not appearing after generation**
   - Check browser console for errors
   - Verify Supabase Storage bucket exists and is public
   - Check avatar URL in character_profiles table

3. **Regeneration button disabled**
   - Check monthly limit not exceeded
   - Verify subscription tier in user_profiles

4. **Slow generation**
   - Normal: 10-30 seconds
   - Leonardo API may be under load
   - Check Leonardo status page

### Debug Commands

```bash
# Check Leonardo API connection
curl -H "Authorization: Bearer $LEONARDO_API_KEY" \
  https://cloud.leonardo.ai/api/rest/v1/me

# Check Supabase Storage
npx supabase storage ls avatars

# View generation logs
npx supabase db query "SELECT * FROM avatar_cache ORDER BY created_at DESC LIMIT 10"
```

## API Endpoints

### Generate Avatar
```
POST /api/characters/{id}/generate-avatar
Body: { regenerate: boolean }
Response: { generationId, regenerationStatus, message }
```

### Poll Status
```
GET /api/characters/{id}/generate-avatar?generationId={id}
Response: { status, progress, imageUrl, message }
```

### Update Character Avatar
```
PUT /api/characters/{id}/update
Body: { avatar_url: string }
Response: { success, character }
```

## Configuration

### AI Models (in ai_configs table)
- **leonardo_diffusion_xl_avatar**: Default model for avatars
- Settings: 512x768, quality 2, guidance 7
- Can add more models/styles in future

### Regeneration Limits
- Free: 1/month
- Moonlight: 5/month
- Starlight: 10/month
- Supernova: 999/month (unlimited)

### Cost Tracking
- Each generation logged with credits used
- Monthly summaries available
- Can query costs by user, character, or AI model

## Next Steps for Production

1. Add image upload option for custom avatars
2. Implement style selection (multiple AI configs)
3. Add avatar preview/approval before saving
4. Implement batch generation for multiple characters
5. Add webhook for async generation notifications
6. Cache avatars in CDN for faster loading
7. Add avatar history/versioning
8. Implement A/B testing for different models
9. Add parental controls for appropriate content
10. Monitor and optimize Leonardo API usage/costs