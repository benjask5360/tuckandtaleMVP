-- Set up admin users with supernova tier
-- This migration ensures admin users have the correct subscription tier

DO $$
DECLARE
    ben_user_id uuid;
    supernova_tier_id uuid;
BEGIN
    -- Get ben@novapoint.ai user ID
    SELECT id INTO ben_user_id FROM auth.users WHERE email = 'ben@novapoint.ai';

    IF ben_user_id IS NOT NULL THEN
        -- Get the supernova tier ID
        SELECT id INTO supernova_tier_id FROM subscription_tiers WHERE tier_name = 'supernova';

        IF supernova_tier_id IS NOT NULL THEN
            -- Update user profile to have supernova tier and admin type
            UPDATE user_profiles
            SET
                subscription_tier_id = supernova_tier_id,
                user_type = 'admin',
                updated_at = now()
            WHERE id = ben_user_id;

            RAISE NOTICE 'Updated ben@novapoint.ai to Supernova tier with admin privileges';
        ELSE
            RAISE NOTICE 'Supernova tier not found';
        END IF;
    ELSE
        RAISE NOTICE 'User ben@novapoint.ai not found';
    END IF;
END $$;

-- Also update any other admin emails you want to have supernova access
-- Add more emails here as needed
DO $$
DECLARE
    admin_emails text[] := ARRAY['ben@novapoint.ai']; -- Add more admin emails here
    admin_email text;
    admin_user_id uuid;
    supernova_tier_id uuid;
BEGIN
    -- Get the supernova tier ID
    SELECT id INTO supernova_tier_id FROM subscription_tiers WHERE tier_name = 'supernova';

    IF supernova_tier_id IS NOT NULL THEN
        FOREACH admin_email IN ARRAY admin_emails
        LOOP
            SELECT id INTO admin_user_id FROM auth.users WHERE email = admin_email;

            IF admin_user_id IS NOT NULL THEN
                -- Ensure user profile exists and has supernova tier
                INSERT INTO user_profiles (
                    id,
                    email,
                    subscription_tier_id,
                    user_type,
                    created_at,
                    updated_at
                ) VALUES (
                    admin_user_id,
                    admin_email,
                    supernova_tier_id,
                    'admin',
                    now(),
                    now()
                )
                ON CONFLICT (id) DO UPDATE SET
                    subscription_tier_id = EXCLUDED.subscription_tier_id,
                    user_type = EXCLUDED.user_type,
                    updated_at = now();

                RAISE NOTICE 'Admin user % configured with Supernova tier', admin_email;
            END IF;
        END LOOP;
    END IF;
END $$;