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
COMMENT ON TABLE public.descriptor_mappings IS 'Links profile types to applicable descriptor tables';-- Seed data for descriptor system
-- Concise mappings: simple terms → enhanced (but brief) descriptors

-- =====================================================
-- ATTRIBUTE DESCRIPTORS (Physical attributes)
-- =====================================================

-- Hair color descriptors
INSERT INTO public.descriptors_attribute (attribute_type, simple_term, rich_description, hex_color, sort_order) VALUES
('hair', 'black', 'jet black', '#000000', 1),
('hair', 'brown', 'chestnut brown', '#654321', 2),
('hair', 'blonde', 'golden blonde', '#F0E68C', 3),
('hair', 'red', 'auburn', '#A52A2A', 4),
('hair', 'gray', 'silver gray', '#808080', 5),
('hair', 'white', 'snow white', '#FFFFFF', 6),
('hair', 'dark brown', 'dark chocolate', '#3B2219', 7),
('hair', 'light brown', 'honey brown', '#B87333', 8),
('hair', 'dirty blonde', 'sandy blonde', '#D4A76A', 9),
('hair', 'strawberry blonde', 'strawberry blonde', '#FF9999', 10),
('hair', 'platinum', 'platinum blonde', '#E5E4E2', 11),
('hair', 'ginger', 'fiery ginger', '#FF6600', 12);

-- Eye color descriptors
INSERT INTO public.descriptors_attribute (attribute_type, simple_term, rich_description, hex_color, sort_order) VALUES
('eyes', 'blue', 'ocean blue', '#0077BE', 1),
('eyes', 'brown', 'warm brown', '#7B3F00', 2),
('eyes', 'green', 'emerald green', '#50C878', 3),
('eyes', 'hazel', 'hazel', '#8E7618', 4),
('eyes', 'gray', 'steel gray', '#71797E', 5),
('eyes', 'amber', 'golden amber', '#FFBF00', 6),
('eyes', 'dark brown', 'deep brown', '#3B2219', 7),
('eyes', 'light blue', 'sky blue', '#87CEEB', 8),
('eyes', 'violet', 'violet', '#8B00FF', 9);

-- Skin tone descriptors
INSERT INTO public.descriptors_attribute (attribute_type, simple_term, rich_description, hex_color, sort_order) VALUES
('skin', 'fair', 'porcelain', '#FDEBD0', 1),
('skin', 'light', 'ivory', '#FFFFF0', 2),
('skin', 'medium', 'olive', '#808000', 3),
('skin', 'tan', 'sun-kissed', '#D2691E', 4),
('skin', 'dark', 'ebony', '#3B2219', 5),
('skin', 'pale', 'pale', '#FAD6A5', 6),
('skin', 'rosy', 'rosy', '#F4C2C2', 7),
('skin', 'golden', 'golden', '#FFD700', 8),
('skin', 'bronze', 'bronze', '#CD7F32', 9),
('skin', 'deep', 'deep brown', '#4B2621', 10);

-- Body type descriptors
INSERT INTO public.descriptors_attribute (attribute_type, simple_term, rich_description, sort_order) VALUES
('body', 'slim', 'slender', 1),
('body', 'average', 'average build', 2),
('body', 'athletic', 'athletic', 3),
('body', 'stocky', 'sturdy', 4),
('body', 'tall', 'tall', 5),
('body', 'short', 'petite', 6),
('body', 'medium height', 'medium height', 7);

-- =====================================================
-- AGE DESCRIPTORS
-- =====================================================

INSERT INTO public.descriptors_age (age_value, age_label, rich_description, developmental_stage, min_age, max_age) VALUES
(0, 'baby', 'baby', 'infant', 0, 1),
(1, 'one-year-old', 'one-year-old', 'toddler', 1, 1),
(2, 'two-year-old', 'two-year-old', 'toddler', 2, 2),
(3, 'three-year-old', 'three-year-old', 'toddler', 3, 3),
(4, 'four-year-old', 'four-year-old', 'preschool', 4, 4),
(5, 'five-year-old', 'five-year-old', 'preschool', 5, 5),
(6, 'six-year-old', 'six-year-old', 'early childhood', 6, 6),
(7, 'seven-year-old', 'seven-year-old', 'early childhood', 7, 7),
(8, 'eight-year-old', 'eight-year-old', 'middle childhood', 8, 8),
(9, 'nine-year-old', 'nine-year-old', 'middle childhood', 9, 9),
(10, 'ten-year-old', 'ten-year-old', 'middle childhood', 10, 10),
(11, 'eleven-year-old', 'eleven-year-old', 'pre-teen', 11, 11),
(12, 'twelve-year-old', 'twelve-year-old', 'pre-teen', 12, 12),
(13, 'thirteen-year-old', 'thirteen-year-old', 'teen', 13, 13),
(14, 'fourteen-year-old', 'fourteen-year-old', 'teen', 14, 14),
(15, 'fifteen-year-old', 'fifteen-year-old', 'teen', 15, 15),
(16, 'sixteen-year-old', 'sixteen-year-old', 'teen', 16, 16),
(17, 'seventeen-year-old', 'seventeen-year-old', 'teen', 17, 17),
(18, 'eighteen-year-old', 'eighteen-year-old', 'young adult', 18, 18);

-- =====================================================
-- GENDER DESCRIPTORS
-- =====================================================

INSERT INTO public.descriptors_gender (simple_term, rich_description, pronouns) VALUES
('boy', 'young boy', 'he/him'),
('girl', 'young girl', 'she/her'),
('child', 'child', 'they/them'),
('non-binary', 'child', 'they/them'),
('male', 'boy', 'he/him'),
('female', 'girl', 'she/her');

-- =====================================================
-- PET DESCRIPTORS
-- =====================================================

-- Dogs
INSERT INTO public.descriptors_pet (species, breed, simple_term, rich_description, size_category, temperament) VALUES
('dog', 'golden retriever', 'golden retriever', 'golden retriever', 'large', '["friendly", "loyal", "gentle"]'),
('dog', 'labrador', 'labrador', 'labrador retriever', 'large', '["friendly", "energetic", "loyal"]'),
('dog', 'german shepherd', 'german shepherd', 'german shepherd', 'large', '["intelligent", "loyal", "protective"]'),
('dog', 'bulldog', 'bulldog', 'bulldog', 'medium', '["calm", "friendly", "courageous"]'),
('dog', 'beagle', 'beagle', 'beagle', 'small', '["curious", "friendly", "merry"]'),
('dog', 'poodle', 'poodle', 'poodle', 'medium', '["intelligent", "active", "elegant"]'),
('dog', 'yorkshire terrier', 'yorkie', 'yorkshire terrier', 'tiny', '["brave", "energetic", "affectionate"]'),
('dog', 'dachshund', 'dachshund', 'dachshund', 'small', '["playful", "brave", "clever"]'),
('dog', 'siberian husky', 'husky', 'siberian husky', 'large', '["friendly", "energetic", "independent"]'),
('dog', 'pomeranian', 'pomeranian', 'fluffy pomeranian', 'tiny', '["lively", "bold", "curious"]'),
('dog', 'mixed breed', 'mixed breed', 'mixed breed dog', 'medium', '["unique", "friendly", "adaptable"]');

-- Cats
INSERT INTO public.descriptors_pet (species, breed, simple_term, rich_description, size_category, temperament) VALUES
('cat', 'tabby', 'tabby', 'tabby cat', 'small', '["playful", "friendly", "curious"]'),
('cat', 'siamese', 'siamese', 'siamese cat', 'small', '["vocal", "intelligent", "social"]'),
('cat', 'persian', 'persian', 'persian cat', 'medium', '["calm", "gentle", "quiet"]'),
('cat', 'maine coon', 'maine coon', 'maine coon', 'large', '["gentle", "friendly", "intelligent"]'),
('cat', 'british shorthair', 'british shorthair', 'british shorthair', 'medium', '["calm", "easy-going", "loyal"]'),
('cat', 'ragdoll', 'ragdoll', 'ragdoll cat', 'large', '["docile", "calm", "affectionate"]'),
('cat', 'bengal', 'bengal', 'bengal cat', 'medium', '["active", "playful", "intelligent"]'),
('cat', 'russian blue', 'russian blue', 'russian blue', 'medium', '["quiet", "gentle", "shy"]'),
('cat', 'orange tabby', 'orange tabby', 'orange tabby', 'medium', '["friendly", "laid-back", "social"]'),
('cat', 'black cat', 'black cat', 'sleek black cat', 'small', '["mysterious", "playful", "loyal"]'),
('cat', 'mixed breed', 'mixed breed', 'mixed breed cat', 'small', '["adaptable", "unique", "independent"]');

-- Other common pets
INSERT INTO public.descriptors_pet (species, breed, simple_term, rich_description, size_category, temperament) VALUES
('rabbit', 'holland lop', 'holland lop', 'holland lop rabbit', 'small', '["gentle", "friendly", "calm"]'),
('rabbit', 'lionhead', 'lionhead', 'lionhead rabbit', 'small', '["friendly", "energetic", "playful"]'),
('hamster', 'syrian', 'hamster', 'syrian hamster', 'tiny', '["solitary", "curious", "active"]'),
('guinea pig', null, 'guinea pig', 'guinea pig', 'small', '["social", "gentle", "vocal"]'),
('bird', 'parakeet', 'parakeet', 'colorful parakeet', 'tiny', '["social", "playful", "vocal"]'),
('bird', 'cockatiel', 'cockatiel', 'cockatiel', 'small', '["affectionate", "intelligent", "social"]'),
('fish', 'goldfish', 'goldfish', 'goldfish', 'tiny', '["peaceful", "hardy", "active"]'),
('turtle', 'red-eared slider', 'turtle', 'turtle', 'small', '["calm", "hardy", "aquatic"]');

-- =====================================================
-- MAGICAL CREATURE DESCRIPTORS
-- =====================================================

INSERT INTO public.descriptors_magical (creature_type, simple_term, rich_description, special_features, rarity) VALUES
-- Dragons
('dragon', 'fire dragon', 'fire-breathing dragon', '["breathes fire", "flies", "ancient wisdom"]', 'rare'),
('dragon', 'ice dragon', 'frost dragon', '["breathes ice", "flies", "cold immunity"]', 'rare'),
('dragon', 'earth dragon', 'earth dragon', '["controls earth", "strong", "protective"]', 'uncommon'),
('dragon', 'baby dragon', 'baby dragon', '["learning to fly", "playful", "curious"]', 'uncommon'),

-- Unicorns
('unicorn', 'white unicorn', 'pristine unicorn', '["healing horn", "pure magic", "gentle"]', 'rare'),
('unicorn', 'silver unicorn', 'silver unicorn', '["moonlight magic", "swift", "wise"]', 'legendary'),
('unicorn', 'rainbow unicorn', 'rainbow unicorn', '["color magic", "joyful", "brings luck"]', 'legendary'),

-- Phoenixes
('phoenix', 'fire phoenix', 'phoenix', '["rebirth", "healing tears", "immortal"]', 'legendary'),
('phoenix', 'golden phoenix', 'golden phoenix', '["sun magic", "protective", "majestic"]', 'legendary'),

-- Griffins
('griffin', 'griffin', 'mighty griffin', '["flies", "brave", "guardian"]', 'rare'),
('griffin', 'royal griffin', 'royal griffin', '["noble", "protective", "wise"]', 'legendary'),

-- Pegasus
('pegasus', 'white pegasus', 'winged horse', '["flies", "swift", "graceful"]', 'rare'),
('pegasus', 'black pegasus', 'midnight pegasus', '["night flight", "mysterious", "swift"]', 'rare'),

-- Fairies
('fairy', 'garden fairy', 'garden fairy', '["nature magic", "tiny", "helpful"]', 'common'),
('fairy', 'forest fairy', 'forest sprite', '["forest magic", "playful", "mischievous"]', 'common'),
('fairy', 'water fairy', 'water sprite', '["water magic", "graceful", "healing"]', 'uncommon'),

-- Other magical creatures
('mermaid', 'mermaid', 'mermaid', '["swims", "sings", "water magic"]', 'rare'),
('centaur', 'centaur', 'wise centaur', '["archery", "wisdom", "nature knowledge"]', 'uncommon'),
('pixie', 'pixie', 'playful pixie', '["invisibility", "pranks", "small magic"]', 'common'),
('elf', 'woodland elf', 'woodland elf', '["archery", "nature magic", "agile"]', 'uncommon'),
('yeti', 'yeti', 'gentle yeti', '["strong", "cold immunity", "shy"]', 'rare'),
('gnome', 'garden gnome', 'garden gnome', '["earth magic", "crafty", "helpful"]', 'common'),
('troll', 'friendly troll', 'friendly troll', '["strong", "bridge guardian", "kind"]', 'uncommon');

-- Add some example combinations for better variety
INSERT INTO public.descriptors_magical (creature_type, simple_term, rich_description, special_features, rarity) VALUES
('hybrid', 'dragon-unicorn', 'dragon-unicorn hybrid', '["flies", "healing magic", "unique"]', 'legendary'),
('hybrid', 'fairy-dragon', 'fairy dragon', '["tiny dragon", "sparkle magic", "playful"]', 'rare');