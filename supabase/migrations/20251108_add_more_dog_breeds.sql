-- ================================================
-- Add More Popular Dog Breeds to Descriptors
-- ================================================
-- Adds commonly selected dog breeds including corgis, chihuahuas, etc.

INSERT INTO public.descriptors_pet (species, breed, simple_term, rich_description, size_category, temperament) VALUES
-- Corgis
('dog', 'corgi', 'corgi', 'adorable corgi', 'small', '["playful", "smart", "affectionate"]'),
('dog', 'pembroke welsh corgi', 'pembroke corgi', 'pembroke welsh corgi', 'small', '["intelligent", "friendly", "loyal"]'),
('dog', 'cardigan welsh corgi', 'cardigan corgi', 'cardigan welsh corgi', 'small', '["intelligent", "devoted", "adaptable"]'),

-- Small/Toy Breeds
('dog', 'chihuahua', 'chihuahua', 'chihuahua', 'tiny', '["sassy", "devoted", "alert"]'),
('dog', 'shih tzu', 'shih tzu', 'shih tzu', 'small', '["affectionate", "playful", "outgoing"]'),
('dog', 'maltese', 'maltese', 'maltese', 'tiny', '["gentle", "playful", "charming"]'),
('dog', 'french bulldog', 'frenchie', 'french bulldog', 'small', '["playful", "adaptable", "smart"]'),
('dog', 'boston terrier', 'boston terrier', 'boston terrier', 'small', '["friendly", "bright", "amusing"]'),
('dog', 'cavalier king charles spaniel', 'cavalier', 'cavalier king charles spaniel', 'small', '["affectionate", "gentle", "graceful"]'),
('dog', 'pug', 'pug', 'pug', 'small', '["charming", "mischievous", "loving"]'),

-- Medium Breeds
('dog', 'border collie', 'border collie', 'border collie', 'medium', '["intelligent", "energetic", "alert"]'),
('dog', 'australian shepherd', 'aussie', 'australian shepherd', 'medium', '["smart", "energetic", "loyal"]'),
('dog', 'cocker spaniel', 'cocker spaniel', 'cocker spaniel', 'medium', '["gentle", "happy", "smart"]'),
('dog', 'brittany spaniel', 'brittany', 'brittany spaniel', 'medium', '["energetic", "happy", "bright"]'),
('dog', 'boxer', 'boxer', 'boxer', 'large', '["playful", "energetic", "loyal"]'),

-- Large Breeds
('dog', 'rottweiler', 'rottweiler', 'rottweiler', 'large', '["loyal", "confident", "courageous"]'),
('dog', 'doberman', 'doberman', 'doberman pinscher', 'large', '["loyal", "alert", "intelligent"]'),
('dog', 'great dane', 'great dane', 'great dane', 'giant', '["friendly", "patient", "dependable"]'),
('dog', 'bernese mountain dog', 'bernese', 'bernese mountain dog', 'giant', '["calm", "affectionate", "intelligent"]'),
('dog', 'saint bernard', 'saint bernard', 'saint bernard', 'giant', '["gentle", "friendly", "calm"]'),
('dog', 'mastiff', 'mastiff', 'mastiff', 'giant', '["dignified", "courageous", "good-natured"]'),

-- Working/Herding Breeds
('dog', 'australian cattle dog', 'cattle dog', 'australian cattle dog', 'medium', '["alert", "intelligent", "loyal"]'),
('dog', 'shetland sheepdog', 'sheltie', 'shetland sheepdog', 'small', '["intelligent", "playful", "energetic"]'),
('dog', 'collie', 'collie', 'collie', 'large', '["loyal", "graceful", "proud"]'),

-- Terriers
('dog', 'jack russell terrier', 'jack russell', 'jack russell terrier', 'small', '["energetic", "fearless", "intelligent"]'),
('dog', 'bull terrier', 'bull terrier', 'bull terrier', 'medium', '["playful", "charming", "mischievous"]'),
('dog', 'scottish terrier', 'scottie', 'scottish terrier', 'small', '["independent", "confident", "spirited"]'),
('dog', 'west highland terrier', 'westie', 'west highland white terrier', 'small', '["confident", "friendly", "hardy"]'),

-- Sporting/Hunting Breeds
('dog', 'english springer spaniel', 'springer spaniel', 'english springer spaniel', 'medium', '["friendly", "obedient", "cheerful"]'),
('dog', 'vizsla', 'vizsla', 'vizsla', 'medium', '["affectionate", "gentle", "energetic"]'),
('dog', 'weimaraner', 'weimaraner', 'weimaraner', 'large', '["friendly", "fearless", "alert"]'),
('dog', 'pointer', 'pointer', 'pointer', 'large', '["even-tempered", "alert", "hard-driving"]'),

-- Asian Breeds
('dog', 'shiba inu', 'shiba', 'shiba inu', 'small', '["alert", "confident", "spirited"]'),
('dog', 'akita', 'akita', 'akita', 'large', '["dignified", "courageous", "profoundly loyal"]'),
('dog', 'chow chow', 'chow', 'chow chow', 'medium', '["dignified", "serious", "aloof"]'),

-- Other Popular Breeds
('dog', 'dalmatian', 'dalmatian', 'dalmatian', 'large', '["energetic", "playful", "sensitive"]'),
('dog', 'basset hound', 'basset', 'basset hound', 'medium', '["patient", "low-key", "charming"]'),
('dog', 'newfoundland', 'newfoundland', 'newfoundland', 'giant', '["sweet", "patient", "devoted"]'),
('dog', 'rhodesian ridgeback', 'ridgeback', 'rhodesian ridgeback', 'large', '["dignified", "intelligent", "strong-willed"]'),
('dog', 'samoyed', 'samoyed', 'fluffy samoyed', 'large', '["friendly", "gentle", "adaptable"]'),
('dog', 'alaskan malamute', 'malamute', 'alaskan malamute', 'large', '["affectionate", "loyal", "playful"]')

ON CONFLICT (species, breed) DO NOTHING;
