-- ============================================================
-- PujaNow - Seed Catalog Data
--
-- Inserts catalogue rows only:
--   6 categories, 12 pujas, 6 verified demo pandits (profile_id NULL),
--   26 puja_pandits mappings, 6 samagri categories, 12 products.
--
-- Safe to run more than once: every insert uses ON CONFLICT DO NOTHING
-- (skips a row if ANY unique key - id, name or slug - already exists).
-- Never updates or removes existing rows. Runs as one transaction:
-- if anything fails, nothing is saved.
--
-- Run in the Supabase SQL Editor as role "postgres" (the default),
-- the WHOLE file, with nothing highlighted.
-- ============================================================

BEGIN;

-- Pre-flight: stop with a clear message instead of a partial or wrong seed.
DO $preflight$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['categories','pujas','pandits','puja_pandits','samagri_categories','samagri_products'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE EXCEPTION 'Seed aborted: table public.% does not exist. Run pujanow_safe_schema.sql first.', t;
    END IF;
  END LOOP;

  -- Run as a logged-in/impersonated user, the pandit guard trigger would
  -- force the demo pandits to "pending" and hide them from the site.
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Seed aborted: run this as role "postgres" in the SQL Editor, not as an impersonated user.';
  END IF;
END
$preflight$;

-- ============================================================
-- CATEGORIES
-- ============================================================
INSERT INTO public.categories (name, slug, description, icon, sort_order) VALUES
('Prosperity', 'prosperity', 'Pujas for wealth, abundance, and financial growth', 'Sparkles', 1),
('Wellbeing', 'wellbeing', 'Pujas for health, healing, and vitality', 'Heart', 2),
('Peace & Harmony', 'peace-harmony', 'Pujas for mental peace, family harmony, and spiritual balance', 'Dove', 3),
('Protection', 'protection', 'Pujas for removing obstacles and warding off negativity', 'Shield', 4),
('New Beginnings', 'new-beginnings', 'Pujas for starting new ventures, homes, and journeys', 'Rocket', 5),
('Festivals', 'festivals', 'Seasonal and festival-specific pujas throughout the year', 'PartyPopper', 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PUJAS
-- ============================================================
INSERT INTO public.pujas (name, slug, description, short_description, category_id, image_url, starting_price, duration_mins, popularity, benefits, samagri_items, is_featured) VALUES
('Lakshmi Puja', 'lakshmi-puja',
'Invoke the blessings of Goddess Lakshmi for wealth, prosperity, and abundance. This sacred puja is performed with devotion to attract financial stability and material well-being to your home and life.',
'Attract wealth and prosperity with the blessings of Goddess Lakshmi.',
(SELECT id FROM public.categories WHERE slug='prosperity'),
'https://images.pexels.com/photos/40699858/pexels-photo-40699858.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop',
2100, 120, 950,
ARRAY['Attracts wealth and prosperity','Removes financial obstacles','Brings harmony to home','Enhances material abundance'],
ARRAY['Goddess Lakshmi idol','Red and yellow flowers','Sweets and fruits','Incense sticks','Camphor','Ghee','Coconut','Panchamrit'],
true),

('Ganesh Puja', 'ganesh-puja',
'Lord Ganesha, the remover of obstacles, is worshipped first among all deities. This puja brings success to new ventures, removes hurdles, and grants wisdom and intellect.',
'Remove obstacles and invite success with Lord Ganesha''s blessings.',
(SELECT id FROM public.categories WHERE slug='new-beginnings'),
'https://images.pexels.com/photos/13655189/pexels-photo-13655189.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
1500, 90, 1200,
ARRAY['Removes obstacles and hurdles','Grants wisdom and intellect','Brings success to new ventures','Auspicious start to any endeavor'],
ARRAY['Ganesh idol','Durva grass','Red flowers','Modak sweets','Incense sticks','Camphor','Coconut','Betel leaves'],
true),

('Satyanarayan Katha', 'satyanarayan-katha',
'The Satyanarayan Puja is performed to express gratitude to Lord Vishnu and seek his blessings for fulfillment of vows, family well-being, and prosperity. It includes the sacred katha (story) narration.',
'Express gratitude to Lord Vishnu and seek family well-being and prosperity.',
(SELECT id FROM public.categories WHERE slug='prosperity'),
'https://images.pexels.com/photos/13405691/pexels-photo-13405691.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
3100, 180, 800,
ARRAY['Family well-being and prosperity','Fulfillment of vows and desires','Removes troubles and hardships','Brings peace and happiness'],
ARRAY['Satyanarayan idol or photo','Panchamrit','Sweets and fruits','Supari and coins','Yellow flowers','Incense sticks','Wheat flour','Ghee'],
true),

('Rudrabhishek', 'rudrabhishek',
'A powerful puja dedicated to Lord Shiva, performed with the sacred Rudra mantra. This abhishek (sacred bath) of the Shiva Linga removes negative energy, grants health, and fulfills deep desires.',
'A powerful Lord Shiva abhishek for health, protection, and desire fulfillment.',
(SELECT id FROM public.categories WHERE slug='protection'),
'https://images.pexels.com/photos/38748562/pexels-photo-38748562.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop',
5100, 180, 650,
ARRAY['Removes negative energy and doshas','Grants health and longevity','Fulfills deep desires','Protects from harm and adversity'],
ARRAY['Shiva Linga','Panchagavya','Milk and curd','Honey and ghee','Belpatra','White flowers','Rudraksha','Incense sticks','Camphor'],
true),

('Navagraha Shanti Puja', 'navagraha-shanti-puja',
'The Navagraha Shanti Puja pacifies the nine planets and neutralizes their malefic effects. It is performed to reduce the impact of planetary afflictions and bring balance, peace, and success.',
'Pacify the nine planets and neutralize malefic planetary effects.',
(SELECT id FROM public.categories WHERE slug='peace-harmony'),
'https://images.pexels.com/photos/6315702/pexels-photo-6315702.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
4100, 150, 520,
ARRAY['Reduces malefic planetary effects','Brings peace and mental balance','Improves career and relationships','Removes obstacles from life path'],
ARRAY['Navagraha yantra','Nine types of grains','Nine colors of cloth','Flowers and fruits','Ghee','Incense sticks','Camphor','Sesame seeds'],
false),

('Sundarkand Path', 'sundarkand-path',
'The recitation of Sundarkand from the Ramcharitmanas glorifies Lord Hanuman''s devotion and strength. This path brings courage, removes fear, and grants protection from evil influences.',
'Recite Sundarkand for courage, protection, and Lord Hanuman''s blessings.',
(SELECT id FROM public.categories WHERE slug='protection'),
'https://images.pexels.com/photos/9691182/pexels-photo-9691182.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop',
2500, 120, 480,
ARRAY['Grants courage and strength','Removes fear and anxiety','Protection from evil','Enhances devotion and faith'],
ARRAY['Ramcharitmanas book','Red flowers','Sindur and oil for Hanuman','Chola and betel leaves','Sweets and fruits','Incense sticks','Ghee lamp','Coconut'],
false),

('Griha Pravesh Puja', 'griha-pravesh-puja',
'The housewarming puja purifies a new home and invites positive energy, prosperity, and peace. Performed before entering a new residence, it wards off negative vibrations and blesses the dwelling.',
'Bless your new home with positivity, prosperity, and peace.',
(SELECT id FROM public.categories WHERE slug='new-beginnings'),
'https://images.pexels.com/photos/13042375/pexels-photo-13042375.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop',
3500, 150, 720,
ARRAY['Purifies the new home','Invites prosperity and positivity','Wards off negative vibrations','Ensures peace and harmony'],
ARRAY['Kalash and coconut','Mango leaves','Rice and turmeric','Ghee and milk','Havan kund materials','Incense sticks','Flowers and garlands','Sweets and fruits'],
true),

('Vastu Shanti Puja', 'vastu-shanti-puja',
'Vastu Shanti Puja corrects architectural and energetic imbalances in a home or workplace. It pacifies the Vastu Purusha and restores harmony between the five elements for well-being and success.',
'Correct Vastu imbalances and restore elemental harmony in your space.',
(SELECT id FROM public.categories WHERE slug='peace-harmony'),
'https://images.pexels.com/photos/32357382/pexels-photo-32357382.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
2800, 120, 430,
ARRAY['Corrects Vastu doshas','Restores elemental balance','Brings peace and well-being','Enhances success and prosperity'],
ARRAY['Vastu Yantra','Panchagavya','Five elements materials','Flowers and garlands','Ghee and camphor','Incense sticks','Rice and turmeric','Sweets and fruits'],
false),

('Maha Mrityunjaya Jaap', 'maha-mrityunjaya-jaap',
'The Maha Mrityunjaya Mantra Jaap is a powerful chant dedicated to Lord Shiva for healing, protection from life-threatening situations, and longevity. It is especially recommended for those facing health challenges.',
'Powerful Lord Shiva mantra for healing, protection, and longevity.',
(SELECT id FROM public.categories WHERE slug='wellbeing'),
'https://images.pexels.com/photos/39237027/pexels-photo-39237027.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop',
5500, 180, 590,
ARRAY['Grants healing and recovery','Protects from life-threatening dangers','Promotes longevity','Reduces fear of death and illness'],
ARRAY['Shiva Linga or photo','Milk and water','Belpatra and flowers','Rudraksha mala','Ghee and camphor','Incense sticks','Sweets and fruits','Coconut','Havan materials'],
false),

('Durga Puja', 'durga-puja',
'Worship of Goddess Durga, the divine mother who vanquishes evil. This puja invokes her fierce protective energy, grants strength, and removes all forms of negativity and adversity from life.',
'Invoke Goddess Durga''s protective power and strength against adversity.',
(SELECT id FROM public.categories WHERE slug='protection'),
'https://images.pexels.com/photos/27364815/pexels-photo-27364815.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop',
4100, 150, 890,
ARRAY['Vanquishes evil and negativity','Grants strength and courage','Protects from enemies and harm','Brings victory and success'],
ARRAY['Durga idol or photo','Red flowers and garlands','Sindur and bangles','Sweets and fruits','Incense sticks','Camphor and ghee','Coconut','Betel leaves'],
true),

('Saraswati Puja', 'saraswati-puja',
'Goddess Saraswati, the deity of knowledge, arts, and wisdom, is worshipped for intellectual growth, creativity, and learning. This puja is ideal for students, artists, and seekers of knowledge.',
'Seek Goddess Saraswati''s blessings for knowledge, wisdom, and creativity.',
(SELECT id FROM public.categories WHERE slug='wellbeing'),
'https://images.pexels.com/photos/35870462/pexels-photo-35870462.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop',
1800, 90, 560,
ARRAY['Enhances knowledge and wisdom','Improves focus and concentration','Blesses artistic and creative pursuits','Auspicious for students and learners'],
ARRAY['Saraswati idol or photo','White flowers','Books and stationery','Sweets and fruits','Incense sticks','Camphor','Coconut','Yellow cloth','Betel leaves'],
false),

('Diwali Lakshmi Puja', 'diwali-lakshmi-puja',
'The most auspicious Lakshmi Puja of the year, performed on the night of Diwali. This grand ceremony welcomes the Goddess of Wealth to your home, ensuring prosperity, happiness, and spiritual illumination for the year ahead.',
'The grand Diwali Lakshmi Puja for yearly prosperity and spiritual illumination.',
(SELECT id FROM public.categories WHERE slug='festivals'),
'https://images.pexels.com/photos/40897782/pexels-photo-40897782.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
2600, 120, 1500,
ARRAY['Maximum prosperity blessings for the year','Spiritual illumination and growth','Family happiness and harmony','Removes darkness and negativity'],
ARRAY['Lakshmi and Ganesh idols','Diya and candles','Rangoli colors','Sweets and dry fruits','Silver coins','Incense sticks','Camphor and ghee','Flowers and garlands'],
true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PANDITS (demo entries, profile_id = NULL)
-- ============================================================
INSERT INTO public.pandits (id, display_name, photo_url, experience_years, languages, specializations, location, service_radius_km, rating, total_reviews, total_bookings, base_price, verification_status, is_available, bio) VALUES
('a0000001-0000-0000-0000-000000000001',
 'Pt. Ramesh Shastri',
 'https://images.pexels.com/photos/9271180/pexels-photo-9271180.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
 22,
 ARRAY['Hindi','Sanskrit','English'],
 ARRAY['Lakshmi Puja','Ganesh Puja','Satyanarayan Katha','Griha Pravesh'],
 'Varanasi, UP', 25, 4.9, 187, 412, 1800, 'verified', true,
 'Acharya Ramesh Shastri is a Vedic scholar with over 22 years of experience performing authentic pujas following strict Vedic traditions. Trained in Varanasi, he specializes in prosperity and new-beginning ceremonies.'),

('a0000002-0000-0000-0000-000000000002',
 'Pt. Suresh Dikshit',
 'https://images.pexels.com/photos/36853153/pexels-photo-36853153.jpeg?auto=compress&cs=tinysrgb&h=400&w=400&fit=crop',
 18,
 ARRAY['Hindi','Sanskrit','Marathi'],
 ARRAY['Rudrabhishek','Maha Mrityunjaya Jaap','Navagraha Shanti','Sundarkand Path'],
 'Pune, MH', 20, 4.8, 142, 310, 2200, 'verified', true,
 'Pt. Suresh Dikshit specializes in Shiva pujas and mantra jaaps. With 18 years of dedicated practice, he is known for his precise pronunciation and powerful abhishek ceremonies.'),

('a0000003-0000-0000-0000-000000000003',
 'Pt. Anand Joshi',
 'https://images.pexels.com/photos/2385044/pexels-photo-2385044.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
 15,
 ARRAY['Hindi','Sanskrit','Gujarati','English'],
 ARRAY['Vastu Shanti','Griha Pravesh','Navagraha Shanti','Lakshmi Puja'],
 'Ahmedabad, GJ', 30, 4.7, 98, 220, 1600, 'verified', true,
 'Pt. Anand Joshi is a Vastu and Navagraha specialist with deep knowledge of planetary remedies. He combines traditional rituals with practical guidance for harmonious living.'),

('a0000004-0000-0000-0000-000000000004',
 'Pt. Krishna Iyer',
 'https://images.pexels.com/photos/19425293/pexels-photo-19425293.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
 28,
 ARRAY['Sanskrit','Tamil','English','Hindi'],
 ARRAY['Sundarkand Path','Durga Puja','Saraswati Puja','Rudrabhishek'],
 'Chennai, TN', 25, 5.0, 210, 530, 2500, 'verified', true,
 'Pt. Krishna Iyer is one of the most respected pandits in South India with 28 years of experience. He is a master of Vedic chanting and specializes in Hanuman and Devi pujas.'),

('a0000005-0000-0000-0000-000000000005',
 'Pt. Arjun Pandey',
 'https://images.pexels.com/photos/39172781/pexels-photo-39172781.jpeg?auto=compress&cs=tinysrgb&h=400&w=400',
 8,
 ARRAY['Hindi','Sanskrit','Bhojpuri'],
 ARRAY['Ganesh Puja','Lakshmi Puja','Diwali Puja','Satyanarayan Katha'],
 'Patna, BR', 15, 4.6, 67, 145, 1200, 'verified', true,
 'Pt. Arjun Pandey is a young and energetic pandit known for his engaging puja ceremonies. He connects well with modern families while maintaining authentic traditions.'),

('a0000006-0000-0000-0000-000000000006',
 'Pt. Devraj Acharya',
 'https://images.pexels.com/photos/10138923/pexels-photo-10138923.jpeg?auto=compress&cs=tinysrgb&h=400&w=400&fit=crop',
 35,
 ARRAY['Hindi','Sanskrit','Bengali'],
 ARRAY['Durga Puja','Saraswati Puja','Lakshmi Puja','Vastu Shanti'],
 'Kolkata, WB', 35, 4.9, 245, 680, 2800, 'verified', true,
 'Pt. Devraj Acharya is a senior pandit with 35 years of experience in Durga and Devi pujas. He is renowned in Kolkata for his elaborate and spiritually powerful ceremonies.')
ON CONFLICT DO NOTHING;

-- ============================================================
-- PUJA_PANDITS mappings
-- ============================================================
-- Joined on slug / id, so a mapping is skipped (not an error) if its
-- puja or pandit is missing.
INSERT INTO public.puja_pandits (puja_id, pandit_id)
SELECT p.id, d.id
FROM (VALUES
  ('lakshmi-puja',          'a0000001-0000-0000-0000-000000000001'::uuid),
  ('lakshmi-puja',          'a0000003-0000-0000-0000-000000000003'::uuid),
  ('lakshmi-puja',          'a0000005-0000-0000-0000-000000000005'::uuid),
  ('ganesh-puja',           'a0000001-0000-0000-0000-000000000001'::uuid),
  ('ganesh-puja',           'a0000005-0000-0000-0000-000000000005'::uuid),
  ('satyanarayan-katha',    'a0000001-0000-0000-0000-000000000001'::uuid),
  ('satyanarayan-katha',    'a0000005-0000-0000-0000-000000000005'::uuid),
  ('rudrabhishek',          'a0000002-0000-0000-0000-000000000002'::uuid),
  ('rudrabhishek',          'a0000004-0000-0000-0000-000000000004'::uuid),
  ('navagraha-shanti-puja', 'a0000002-0000-0000-0000-000000000002'::uuid),
  ('navagraha-shanti-puja', 'a0000003-0000-0000-0000-000000000003'::uuid),
  ('sundarkand-path',       'a0000002-0000-0000-0000-000000000002'::uuid),
  ('sundarkand-path',       'a0000004-0000-0000-0000-000000000004'::uuid),
  ('griha-pravesh-puja',    'a0000001-0000-0000-0000-000000000001'::uuid),
  ('griha-pravesh-puja',    'a0000003-0000-0000-0000-000000000003'::uuid),
  ('vastu-shanti-puja',     'a0000003-0000-0000-0000-000000000003'::uuid),
  ('vastu-shanti-puja',     'a0000006-0000-0000-0000-000000000006'::uuid),
  ('maha-mrityunjaya-jaap', 'a0000002-0000-0000-0000-000000000002'::uuid),
  ('maha-mrityunjaya-jaap', 'a0000004-0000-0000-0000-000000000004'::uuid),
  ('durga-puja',            'a0000004-0000-0000-0000-000000000004'::uuid),
  ('durga-puja',            'a0000006-0000-0000-0000-000000000006'::uuid),
  ('saraswati-puja',        'a0000004-0000-0000-0000-000000000004'::uuid),
  ('saraswati-puja',        'a0000006-0000-0000-0000-000000000006'::uuid),
  ('diwali-lakshmi-puja',   'a0000001-0000-0000-0000-000000000001'::uuid),
  ('diwali-lakshmi-puja',   'a0000005-0000-0000-0000-000000000005'::uuid),
  ('diwali-lakshmi-puja',   'a0000006-0000-0000-0000-000000000006'::uuid)
) AS m(puja_slug, pandit_id)
JOIN public.pujas   p ON p.slug = m.puja_slug
JOIN public.pandits d ON d.id   = m.pandit_id
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMAGRI CATEGORIES
-- ============================================================
INSERT INTO public.samagri_categories (name, slug, sort_order) VALUES
('Idols & Murtis', 'idols-murtis', 1),
('Diyas & Lamps', 'diyas-lamps', 2),
('Incense & Dhoop', 'incense-dhoop', 3),
('Flowers & Garlands', 'flowers-garlands', 4),
('Puja Thali Sets', 'puja-thali-sets', 5),
('Sacred Items', 'sacred-items', 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- SAMAGRI PRODUCTS
-- ============================================================
INSERT INTO public.samagri_products (name, slug, description, category_id, image_url, price, unit, stock, is_active) VALUES
('Brass Lakshmi Idol 6 inch', 'brass-lakshmi-idol-6',
'Handcrafted brass idol of Goddess Lakshmi, ideal for daily worship and Lakshmi Puja. Made by skilled artisans with fine detailing.',
(SELECT id FROM public.samagri_categories WHERE slug='idols-murtis'),
'https://images.pexels.com/photos/6315678/pexels-photo-6315678.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
1450, 'piece', 30, true),

('Ganesh Murti with Prasad Plate', 'ganesh-murti-prasad-plate',
'Beautifully painted Lord Ganesh murti with an attached prasad plate. Perfect for home temple and Ganesh Puja ceremonies.',
(SELECT id FROM public.samagri_categories WHERE slug='idols-murtis'),
'https://images.pexels.com/photos/33673465/pexels-photo-33673465.jpeg?auto=compress&cs=tinysrgb&h=600&w=600',
1200, 'piece', 25, true),

('Set of 12 Clay Diyas', 'set-12-clay-diyas',
'Traditional handcrafted clay diyas for Diwali and daily aarti. Set of 12 pieces with smooth finish and steady base.',
(SELECT id FROM public.samagri_categories WHERE slug='diyas-lamps'),
'https://images.pexels.com/photos/30425298/pexels-photo-30425298.jpeg?auto=compress&cs=tinysrgb&h=600&w=600',
350, 'set of 12', 200, true),

('Brass Diya with Stand', 'brass-diya-stand',
'Elegant brass diya with decorative stand, perfect for puja rooms and festive occasions. Long-lasting and easy to clean.',
(SELECT id FROM public.samagri_categories WHERE slug='diyas-lamps'),
'https://images.pexels.com/photos/20302339/pexels-photo-20302339.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
650, 'piece', 80, true),

('Mogra Incense Sticks 100 pack', 'mogra-incense-sticks-100',
'Premium mogra-scented incense sticks for daily puja and meditation. 100 sticks per pack with long-lasting fragrance.',
(SELECT id FROM public.samagri_categories WHERE slug='incense-dhoop'),
'https://images.pexels.com/photos/3639806/pexels-photo-3639806.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
180, 'pack of 100', 500, true),

('Chandan Dhoop Sticks 50 pack', 'chandan-dhoop-sticks-50',
'Sandalwood (chandan) dhoop sticks for an authentic puja atmosphere. 50 sticks with rich, earthy aroma.',
(SELECT id FROM public.samagri_categories WHERE slug='incense-dhoop'),
'https://images.pexels.com/photos/37413916/pexels-photo-37413916.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
220, 'pack of 50', 300, true),

('Marigold Flower Garland 3ft', 'marigold-garland-3ft',
'Fresh-looking marigold garland for deity decoration and door torans. Approximately 3 feet long, vibrant orange.',
(SELECT id FROM public.samagri_categories WHERE slug='flowers-garlands'),
'https://images.pexels.com/photos/12087682/pexels-photo-12087682.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
120, 'piece', 150, true),

('Mixed Flower Puja Set', 'mixed-flower-puja-set',
'A complete set of puja flowers including marigold, rose petals, and jasmine for daily worship and ceremonies.',
(SELECT id FROM public.samagri_categories WHERE slug='flowers-garlands'),
'https://images.pexels.com/photos/8887127/pexels-photo-8887127.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
250, 'set', 100, true),

('Brass Puja Thali Set 7 piece', 'brass-puja-thali-7',
'Complete 7-piece brass puja thali set including thali, diya, bell, kalash, agarbatti holder, camphor holder, and spoon.',
(SELECT id FROM public.samagri_categories WHERE slug='puja-thali-sets'),
'https://images.pexels.com/photos/37531057/pexels-photo-37531057.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
2100, 'set of 7', 20, true),

('Silver-Plated Puja Thali', 'silver-puja-thali',
'Elegant silver-plated puja thali with engraved border. Ideal for daily aarti and festive pujas.',
(SELECT id FROM public.samagri_categories WHERE slug='puja-thali-sets'),
'https://images.pexels.com/photos/12936912/pexels-photo-12936912.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
1800, 'piece', 15, true),

('Pure Camphor Tablets 100g', 'camphor-tablets-100g',
'Pure camphor tablets for aarti and puja. 100g pack with clean-burning, fragrant camphor for daily worship.',
(SELECT id FROM public.samagri_categories WHERE slug='sacred-items'),
'https://images.pexels.com/photos/7750217/pexels-photo-7750217.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
150, '100g', 400, true),

('Rudraksha Mala 108 beads', 'rudraksha-mala-108',
'Authentic 5-mukhi rudraksha mala with 108 beads for jap and meditation. Hand-strung with durable thread.',
(SELECT id FROM public.samagri_categories WHERE slug='sacred-items'),
'https://images.pexels.com/photos/6634244/pexels-photo-6634244.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop',
550, 'piece', 60, true)
ON CONFLICT DO NOTHING;

COMMIT;
