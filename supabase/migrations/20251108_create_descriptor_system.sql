-- Create descriptor system tables for enhanced avatar and story generation

-- 1. Descriptors for physical attributes (hair, eyes, skin, body type)
CREATE TABLE IF NOT EXISTS public.descriptors_attribute (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attribute_type TEXT NOT NULL CHECK (attribute_type IN ('hair', 'eyes', 'skin', 'body')),
    simple_term TEXT NOT NULL,
    rich_description TEXT NOT NULL,
    hex_color TEXT, -- Optional color code for visual representation
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(attribute_type, simple_term)
);

-- 2. Descriptors for age-specific characteristics
CREATE TABLE IF NOT EXISTS public.descriptors_age (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    age_value INTEGER NOT NULL,
    age_label TEXT NOT NULL, -- e.g., "six-year-old"
    rich_description TEXT NOT NULL, -- e.g., "six-year-old"
    developmental_stage TEXT, -- e.g., "early childhood", "pre-teen"
    min_age INTEGER, -- For age ranges
    max_age INTEGER, -- For age ranges
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(age_value)
);

-- 3. Descriptors for gender presentation
CREATE TABLE IF NOT EXISTS public.descriptors_gender (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simple_term TEXT NOT NULL UNIQUE,
    rich_description TEXT NOT NULL,
    pronouns TEXT, -- Optional pronouns
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Descriptors for pet-specific traits
CREATE TABLE IF NOT EXISTS public.descriptors_pet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    species TEXT NOT NULL,
    breed TEXT,
    simple_term TEXT NOT NULL,
    rich_description TEXT NOT NULL,
    size_category TEXT CHECK (size_category IN ('tiny', 'small', 'medium', 'large', 'giant')),
    temperament JSONB, -- Array of temperament traits
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(species, breed)
);

-- 5. Descriptors for magical/fantasy creatures
CREATE TABLE IF NOT EXISTS public.descriptors_magical (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creature_type TEXT NOT NULL,
    simple_term TEXT NOT NULL,
    rich_description TEXT NOT NULL,
    special_features JSONB, -- Array of special abilities/features
    rarity TEXT CHECK (rarity IN ('common', 'uncommon', 'rare', 'legendary')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(creature_type, simple_term)
);

-- 6. Mapping table to link profile types to applicable descriptor tables
CREATE TABLE IF NOT EXISTS public.descriptor_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_type TEXT NOT NULL CHECK (profile_type IN ('child', 'storybook_character', 'pet', 'magical_creature')),
    descriptor_table TEXT NOT NULL CHECK (descriptor_table IN ('descriptors_attribute', 'descriptors_age', 'descriptors_gender', 'descriptors_pet', 'descriptors_magical')),
    is_required BOOLEAN DEFAULT false, -- Whether this descriptor type is required for the profile
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_type, descriptor_table)
);

-- Create indexes for better query performance
CREATE INDEX idx_descriptors_attribute_type ON public.descriptors_attribute(attribute_type);
CREATE INDEX idx_descriptors_attribute_active ON public.descriptors_attribute(is_active);
CREATE INDEX idx_descriptors_age_value ON public.descriptors_age(age_value);
CREATE INDEX idx_descriptors_age_range ON public.descriptors_age(min_age, max_age);
CREATE INDEX idx_descriptors_pet_species ON public.descriptors_pet(species);
CREATE INDEX idx_descriptors_magical_creature ON public.descriptors_magical(creature_type);
CREATE INDEX idx_descriptor_mappings_profile ON public.descriptor_mappings(profile_type);

-- Add update timestamp triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_descriptors_attribute_updated_at BEFORE UPDATE
    ON public.descriptors_attribute FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_descriptors_age_updated_at BEFORE UPDATE
    ON public.descriptors_age FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_descriptors_gender_updated_at BEFORE UPDATE
    ON public.descriptors_gender FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_descriptors_pet_updated_at BEFORE UPDATE
    ON public.descriptors_pet FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_descriptors_magical_updated_at BEFORE UPDATE
    ON public.descriptors_magical FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.descriptors_attribute ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descriptors_age ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descriptors_gender ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descriptors_pet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descriptors_magical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descriptor_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - All descriptor tables are read-only for authenticated users
-- Admin users can modify them

-- Read policies (all authenticated users can read active descriptors)
CREATE POLICY "Authenticated users can read active attribute descriptors"
    ON public.descriptors_attribute FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Authenticated users can read active age descriptors"
    ON public.descriptors_age FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Authenticated users can read active gender descriptors"
    ON public.descriptors_gender FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Authenticated users can read active pet descriptors"
    ON public.descriptors_pet FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Authenticated users can read active magical descriptors"
    ON public.descriptors_magical FOR SELECT
    TO authenticated
    USING (is_active = true);

CREATE POLICY "Authenticated users can read descriptor mappings"
    ON public.descriptor_mappings FOR SELECT
    TO authenticated
    USING (true);

-- Admin policies (only admin users can modify descriptors)
CREATE POLICY "Admin users can manage attribute descriptors"
    ON public.descriptors_attribute FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

CREATE POLICY "Admin users can manage age descriptors"
    ON public.descriptors_age FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

CREATE POLICY "Admin users can manage gender descriptors"
    ON public.descriptors_gender FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

CREATE POLICY "Admin users can manage pet descriptors"
    ON public.descriptors_pet FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

CREATE POLICY "Admin users can manage magical descriptors"
    ON public.descriptors_magical FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

CREATE POLICY "Admin users can manage descriptor mappings"
    ON public.descriptor_mappings FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE user_profiles.id = auth.uid()
            AND user_profiles.user_type = 'admin'
        )
    );

-- Insert initial descriptor mappings
INSERT INTO public.descriptor_mappings (profile_type, descriptor_table, is_required) VALUES
-- Child profile mappings
('child', 'descriptors_attribute', true),
('child', 'descriptors_age', true),
('child', 'descriptors_gender', false),

-- Storybook character mappings
('storybook_character', 'descriptors_attribute', true),
('storybook_character', 'descriptors_age', false),
('storybook_character', 'descriptors_gender', false),

-- Pet mappings
('pet', 'descriptors_pet', true),

-- Magical creature mappings
('magical_creature', 'descriptors_magical', true),
('magical_creature', 'descriptors_attribute', false);

-- Comments for documentation
COMMENT ON TABLE public.descriptors_attribute IS 'Physical attribute descriptors (hair, eyes, skin, body) with simple to rich text mappings';
COMMENT ON TABLE public.descriptors_age IS 'Age-specific descriptors and developmental stages';
COMMENT ON TABLE public.descriptors_gender IS 'Gender presentation descriptors';
COMMENT ON TABLE public.descriptors_pet IS 'Pet-specific descriptors including species and breeds';
COMMENT ON TABLE public.descriptors_magical IS 'Magical and fantasy creature descriptors';
COMMENT ON TABLE public.descriptor_mappings IS 'Links profile types to applicable descriptor tables';