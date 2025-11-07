-- Seed data for development
-- This file runs automatically after migrations when you run `supabase db reset`

-- Create a test user for ben@novapoint.ai if not exists
DO $$
DECLARE
    user_id uuid;
    supernova_tier_id uuid;
BEGIN
    -- Check if user exists, if not create one
    SELECT id INTO user_id FROM auth.users WHERE email = 'ben@novapoint.ai';

    IF user_id IS NULL THEN
        -- Create user with a secure password (you'll use magic link or change this)
        user_id := gen_random_uuid();

        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            user_id,
            '00000000-0000-0000-0000-000000000000',
            'ben@novapoint.ai',
            crypt('TempPassword123!', gen_salt('bf')), -- Change this password after first login
            now(),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            'authenticated',
            'authenticated'
        );

        RAISE NOTICE 'Created user for ben@novapoint.ai with ID: %', user_id;
    END IF;

    -- Get the supernova tier ID
    SELECT id INTO supernova_tier_id FROM subscription_tiers WHERE tier_name = 'supernova';

    -- Create or update user profile with supernova tier and admin type
    INSERT INTO user_profiles (
        id,
        email,
        subscription_tier_id,
        user_type,
        created_at,
        updated_at
    ) VALUES (
        user_id,
        'ben@novapoint.ai',
        supernova_tier_id,
        'admin',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        subscription_tier_id = EXCLUDED.subscription_tier_id,
        user_type = EXCLUDED.user_type,
        updated_at = now();

    RAISE NOTICE 'User profile created/updated for ben@novapoint.ai with Supernova tier';
END $$;

-- Create another test user for testing free tier limits
DO $$
DECLARE
    test_user_id uuid;
    free_tier_id uuid;
BEGIN
    -- Check if test user exists
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@example.com';

    IF test_user_id IS NULL THEN
        test_user_id := gen_random_uuid();

        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            aud,
            role
        ) VALUES (
            test_user_id,
            '00000000-0000-0000-0000-000000000000',
            'test@example.com',
            crypt('TestPassword123!', gen_salt('bf')),
            now(),
            now(),
            now(),
            '{"provider": "email", "providers": ["email"]}',
            '{}',
            'authenticated',
            'authenticated'
        );

        RAISE NOTICE 'Created test user with ID: %', test_user_id;
    END IF;

    -- Get the free tier ID
    SELECT id INTO free_tier_id FROM subscription_tiers WHERE tier_name = 'free';

    -- Create user profile with free tier
    INSERT INTO user_profiles (
        id,
        email,
        subscription_tier_id,
        user_type,
        created_at,
        updated_at
    ) VALUES (
        test_user_id,
        'test@example.com',
        free_tier_id,
        'parent',
        now(),
        now()
    )
    ON CONFLICT (id) DO UPDATE SET
        subscription_tier_id = EXCLUDED.subscription_tier_id,
        user_type = EXCLUDED.user_type,
        updated_at = now();

    RAISE NOTICE 'Test user profile created with Free tier';
END $$;

-- Add some sample characters for ben@novapoint.ai
DO $$
DECLARE
    ben_user_id uuid;
BEGIN
    SELECT id INTO ben_user_id FROM auth.users WHERE email = 'ben@novapoint.ai';

    IF ben_user_id IS NOT NULL THEN
        -- Add a sample child character
        INSERT INTO character_profiles (
            user_id,
            character_type,
            name,
            attributes,
            appearance_description,
            is_primary,
            created_at,
            updated_at
        ) VALUES (
            ben_user_id,
            'child',
            'Emma',
            '{"age": 6, "gender": "female", "hairColor": "blonde", "eyeColor": "blue", "interests": ["dinosaurs", "space"], "personality": ["curious", "brave"]}',
            'A 6 year old girl with blonde hair and blue eyes',
            true,
            now(),
            now()
        ) ON CONFLICT DO NOTHING;

        -- Add a sample pet character
        INSERT INTO character_profiles (
            user_id,
            character_type,
            name,
            attributes,
            appearance_description,
            is_primary,
            created_at,
            updated_at
        ) VALUES (
            ben_user_id,
            'pet',
            'Max',
            '{"species": "dog", "breed": "Golden Retriever", "color": "golden", "personality": ["loyal", "playful"]}',
            'A golden retriever dog',
            false,
            now(),
            now()
        ) ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sample characters created for ben@novapoint.ai';
    END IF;
END $$;

-- Output current state for verification
DO $$
DECLARE
    tier_info record;
    user_info record;
BEGIN
    -- Show subscription tiers with new columns
    RAISE NOTICE '';
    RAISE NOTICE 'Current Subscription Tiers:';
    RAISE NOTICE '----------------------------------------';
    FOR tier_info IN
        SELECT tier_name, display_name, max_child_profiles, max_other_characters
        FROM subscription_tiers
        ORDER BY tier_name
    LOOP
        RAISE NOTICE '% (%): Children=%, Others=%',
            tier_info.display_name,
            tier_info.tier_name,
            COALESCE(tier_info.max_child_profiles::text, 'unlimited'),
            COALESCE(tier_info.max_other_characters::text, 'unlimited');
    END LOOP;

    -- Show user profiles
    RAISE NOTICE '';
    RAISE NOTICE 'User Profiles:';
    RAISE NOTICE '----------------------------------------';
    FOR user_info IN
        SELECT
            u.email,
            st.display_name as tier,
            up.user_type
        FROM user_profiles up
        JOIN auth.users u ON up.id = u.id
        JOIN subscription_tiers st ON up.subscription_tier_id = st.id
    LOOP
        RAISE NOTICE '% - % (%)', user_info.email, user_info.tier, user_info.user_type;
    END LOOP;
END $$;