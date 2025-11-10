# Vignette Splicer MVP - Implementation Complete

## Overview

The vignette-splicer pipeline generates panoramic 9-panel storyboard images using Leonardo.ai, automatically slices them into individual panels, and stores them in Supabase.

## What Was Built

### 1. Database Schema
- **`vignette_panels` table**: Stores metadata for each of the 9 panels per story
  - `story_id`: References the content table
  - `panel_number`: 1-9, uniquely indexed per story
  - `image_url`: Public Supabase Storage URL
  - `storage_path`: Internal storage path
  - Full RLS policies for user access control

### 2. AI Configuration
- **New AI config purpose**: `story_vignette_panorama`
- **Model**: Leonardo Lucid Realism (3072×3072 resolution)
- **Settings**: Optimized for panoramic storyboard generation with 9 scenes

### 3. Core Service: `VignetteSplicerService`
Located at: `lib/services/vignette-splicer.ts`

**Key Features:**
- Fetches story data and associated characters
- Maps any number of paragraphs to exactly 9 scenes:
  - <9 paragraphs: Adds atmospheric transition scenes
  - =9 paragraphs: One-to-one mapping
  - >9 paragraphs: Merges into 9 key moments
- Builds character descriptions using existing descriptor system
- Generates Disney-Pixar style panoramic prompts
- Generates 3072×3072 image via Leonardo.ai
- Slices into 9 equal 1024×1024 panels using Sharp
- Uploads to Supabase Storage: `/vignettes/{storyId}/panels/panel_{1-9}.png`
- Stores metadata in `vignette_panels` table

### 4. Test API Endpoint
Located at: `app/api/vignette/splice/route.ts`

**POST `/api/vignette/splice`**
- Request body: `{ "storyId": "uuid" }`
- Validates user authentication and story ownership
- Generates all 9 panels
- Returns:
  ```json
  {
    "success": true,
    "data": {
      "storyId": "...",
      "panels": [
        {"panel_number": 1, "image_url": "...", "storage_path": "..."},
        ...
      ],
      "panoramicImageUrl": "...",
      "leonardoGenerationId": "...",
      "message": "Successfully generated 9 vignette panels"
    }
  }
  ```

**GET `/api/vignette/splice?storyId={uuid}`**
- Retrieves existing panels for a story
- Returns all panels in order

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```
✅ Sharp has been added to package.json and installed

### 2. Apply Database Migrations

**Option A: Supabase SQL Editor (Recommended)**

Copy and paste the contents of `APPLY_VIGNETTE_MIGRATIONS.sql` into the Supabase SQL Editor and run it.

**Option B: Check migrations manually**
```bash
node apply-vignette-migrations-simple.js
```
This will verify if migrations need to be applied and provide guidance.

### 3. Verify Setup

After applying migrations, verify the setup:

```sql
-- Check vignette_panels table
SELECT * FROM information_schema.tables
WHERE table_name = 'vignette_panels';

-- Check AI config
SELECT name, purpose, model_name, is_active
FROM ai_configs
WHERE purpose = 'story_vignette_panorama';
```

## Testing the Vignette Splicer

### Step 1: Get a Story ID

Find an existing story in your database:

```sql
SELECT id, title, user_id
FROM content
WHERE content_type = 'story'
ORDER BY created_at DESC
LIMIT 5;
```

### Step 2: Test the API Endpoint

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/vignette/splice \
  -H "Content-Type: application/json" \
  -d '{"storyId": "your-story-uuid-here"}'
```

**Using a REST client (Postman, Insomnia, etc.):**
- Method: POST
- URL: `http://localhost:3000/api/vignette/splice`
- Headers:
  - `Content-Type: application/json`
  - Include authentication cookies from your browser session
- Body:
  ```json
  {
    "storyId": "your-story-uuid-here"
  }
  ```

### Step 3: Monitor Progress

Check the console logs for progress updates:
- `[Vignette Splice] Starting generation for story: ...`
- `[Vignette Generation] Generating image... (X%)`
- `[Vignette Splicer] Panoramic image dimensions: 3072x3072`
- `[Vignette Splicer] Panel X created: ...`
- `[Vignette Splice] Successfully generated 9 panels`

### Step 4: Verify Results

**Check database:**
```sql
SELECT panel_number, image_url, created_at
FROM vignette_panels
WHERE story_id = 'your-story-uuid-here'
ORDER BY panel_number;
```

**Check Supabase Storage:**
Navigate to: Storage > illustrations > vignettes > {storyId} > panels

You should see:
- `panel_1.png` through `panel_9.png`
- Each image should be 1024×1024 pixels

**View images:**
Copy the `image_url` values from the database and open them in your browser to verify the panels look correct.

## Expected Behavior

### Successful Generation
1. Takes 30-60 seconds to generate panoramic image via Leonardo
2. Slicing and uploading takes 5-10 seconds
3. All 9 panels stored in correct order
4. Each panel is 1024×1024 pixels
5. Storage path follows pattern: `/vignettes/{storyId}/panels/panel_{1-9}.png`

### Scene Mapping Logic
- **Story with 5 paragraphs**: 5 story scenes + 4 atmospheric transitions = 9 panels
- **Story with 9 paragraphs**: Direct 1:1 mapping = 9 panels
- **Story with 15 paragraphs**: Groups merged into 9 key moments = 9 panels

### Prompt Generation
The system:
- Extracts character descriptions from the descriptor system
- Maps paragraphs to visual moments
- Generates Disney-Pixar style panoramic prompt
- Includes all family characters with consistent visual descriptions
- Numbers each scene 1-9 for clear progression

## Error Handling

### Common Issues

**1. "Story not found or access denied"**
- Verify the storyId exists
- Ensure you're authenticated as the story owner

**2. "No AI config found for story_vignette_panorama"**
- Run the database migrations (see Setup Step 2)

**3. "Leonardo generation failed or returned no images"**
- Check Leonardo API key in `.env.local`
- Verify Leonardo API credits
- Check console for Leonardo error messages

**4. "Failed to upload panel X"**
- Verify Supabase Storage bucket `illustrations` exists
- Check Supabase service role key is configured
- Ensure RLS policies allow storage uploads

**5. Sharp-related errors**
- Verify Sharp was installed: `npm list sharp`
- Try reinstalling: `npm uninstall sharp && npm install sharp`

## File Structure

```
lib/
  services/
    vignette-splicer.ts          # Core service
  leonardo/
    client.ts                     # Leonardo API client (reused)
  prompt-builders/
    descriptionBuilder.ts         # Character descriptions (reused)

app/
  api/
    vignette/
      splice/
        route.ts                  # Test endpoint

supabase/
  migrations/
    20251110_create_vignette_panels.sql           # Table schema
    20251110_add_vignette_panorama_config.sql     # AI config

APPLY_VIGNETTE_MIGRATIONS.sql    # Consolidated migration script
apply-vignette-migrations-simple.js  # Migration verification script
```

## Next Steps (Future Phase 2)

After verifying the vignette splicer works correctly:

1. **OpenAI Integration**: Feed the 9 panel URLs + story config to OpenAI to generate aligned narration for each scene
2. **UI Integration**: Add vignette generation button to story detail pages
3. **Regeneration**: Allow users to regenerate vignettes with different prompts
4. **Caching**: Store panoramic image for potential re-slicing or adjustments
5. **Progress Tracking**: Add real-time progress updates via websockets or polling

## Success Criteria ✅

- [x] Sharp dependency added and installed
- [x] Database migrations created
- [x] AI config for panoramic vignettes defined
- [x] VignetteSplicerService implemented with:
  - [x] Story paragraph extraction
  - [x] Always generates exactly 9 scenes
  - [x] Character description integration
  - [x] Panoramic prompt generation
  - [x] Leonardo API integration
  - [x] Image slicing with Sharp
  - [x] Supabase Storage upload
  - [x] Database metadata storage
- [x] Test API endpoint created
- [x] Storage path follows spec: `/vignettes/{storyId}/panels/panel_{1-9}.png`
- [x] Code is modular and isolated from existing story logic

## Testing Checklist

Before marking this complete:

- [ ] Apply database migrations via Supabase SQL Editor
- [ ] Find an existing story ID
- [ ] Call POST /api/vignette/splice with the story ID
- [ ] Verify 9 panels are created in Supabase Storage
- [ ] Verify 9 records in vignette_panels table
- [ ] Verify each panel is 1024×1024 pixels
- [ ] Verify images visually show story progression
- [ ] Verify existing story functionality still works

## Cost Considerations

- Each panoramic generation uses Leonardo.ai credits
- 3072×3072 images are higher resolution and cost more than standard 1024×1024
- Estimated cost: ~5-10 credits per panoramic image (verify with Leonardo pricing)
- No cost for slicing or storage (client-side operation)

## Notes

- All existing story generation functionality remains unchanged
- The vignette splicer is completely isolated and optional
- Can be triggered independently via the API endpoint
- Future integration will be seamless due to modular design
