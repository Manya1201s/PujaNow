-- ============================================================
-- PujaNow - Fix incorrect catalogue images
--
-- Updates ONLY image columns:
--   pujas.image_url            (7 rows)
--   samagri_products.image_url (10 rows)
--   pandits.photo_url          (2 rows)
--
-- No schema change, no inserts, no deletes. Names, descriptions,
-- prices, stock, bookings, orders and RLS are not touched.
--
-- Each UPDATE matches the row by slug/id AND by the OLD Pexels photo
-- id, so a row that has already been fixed or customised is skipped.
-- Safe to run more than once (second run updates 0 rows).
--
-- Run in the Supabase SQL Editor as role "postgres", whole file,
-- nothing highlighted.
-- ============================================================

BEGIN;

-- ---------- Pujas (cards 940x650, detail hero 1920x1080) ----------
-- Lakshmi Puja: generic aarti plate -> Goddess Lakshmi idol
UPDATE public.pujas SET image_url = 'https://images.pexels.com/photos/40699858/pexels-photo-40699858.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop'
 WHERE slug = 'lakshmi-puja' AND image_url LIKE '%/photos/11092914/%';

-- Rudrabhishek: generic aarti -> offering at Shiva lingam
UPDATE public.pujas SET image_url = 'https://images.pexels.com/photos/38748562/pexels-photo-38748562.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop'
 WHERE slug = 'rudrabhishek' AND image_url LIKE '%/photos/31598124/%';

-- Sundarkand Path: lamp lighting -> Lord Hanuman
UPDATE public.pujas SET image_url = 'https://images.pexels.com/photos/9691182/pexels-photo-9691182.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop'
 WHERE slug = 'sundarkand-path' AND image_url LIKE '%/photos/12543534/%';

-- Griha Pravesh: incense tray (duplicate) -> kalash with coconut & mango leaves
UPDATE public.pujas SET image_url = 'https://images.pexels.com/photos/13042375/pexels-photo-13042375.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop'
 WHERE slug = 'griha-pravesh-puja' AND image_url LIKE '%/photos/36595218/%';

-- Maha Mrityunjaya Jaap: single clay diya -> Shiva lingam with marigolds
UPDATE public.pujas SET image_url = 'https://images.pexels.com/photos/39237027/pexels-photo-39237027.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop'
 WHERE slug = 'maha-mrityunjaya-jaap' AND image_url LIKE '%/photos/40882498/%';

-- Durga Puja: street rangoli scene -> Goddess Durga idol
UPDATE public.pujas SET image_url = 'https://images.pexels.com/photos/27364815/pexels-photo-27364815.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop'
 WHERE slug = 'durga-puja' AND image_url LIKE '%/photos/35021779/%';

-- Saraswati Puja: kalash (duplicate) -> Goddess Saraswati with veena
UPDATE public.pujas SET image_url = 'https://images.pexels.com/photos/35870462/pexels-photo-35870462.jpeg?auto=compress&cs=tinysrgb&h=650&w=940&fit=crop'
 WHERE slug = 'saraswati-puja' AND image_url LIKE '%/photos/13471281/%';

-- ---------- Samagri products (square 600x600, detail 1200x1200) ----------
-- Brass Lakshmi Idol: was a GANESH idol (duplicate) -> brass Lakshmi idol with diya
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/6315678/pexels-photo-6315678.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'brass-lakshmi-idol-6' AND image_url LIKE '%/photos/13655189/%';

-- Brass Diya with Stand: duplicate of Navagraha puja -> brass diya on stand
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/20302339/pexels-photo-20302339.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'brass-diya-stand' AND image_url LIKE '%/photos/6315702/%';

-- Mogra Incense Sticks: brass bowl, no sticks -> burning incense sticks
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/3639806/pexels-photo-3639806.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'mogra-incense-sticks-100' AND image_url LIKE '%/photos/774378/%';

-- Chandan Dhoop Sticks: was a CURRY dish -> natural brown dhoop/incense sticks
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/37413916/pexels-photo-37413916.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'chandan-dhoop-sticks-50' AND image_url LIKE '%/photos/30203310/%';

-- Marigold Garland: floral rangoli -> hanging marigold garlands
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/12087682/pexels-photo-12087682.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'marigold-garland-3ft' AND image_url LIKE '%/photos/28915477/%';

-- Mixed Flower Puja Set: incense tray (duplicate) -> tray of puja flowers
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/8887127/pexels-photo-8887127.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'mixed-flower-puja-set' AND image_url LIKE '%/photos/36595218/%';

-- Brass Puja Thali Set: kalash (duplicate) -> thali with brass bell & conch
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/37531057/pexels-photo-37531057.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'brass-puja-thali-7' AND image_url LIKE '%/photos/13471281/%';

-- Silver-Plated Puja Thali: brass lamps (duplicate) -> silver thali with diya & roses
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/12936912/pexels-photo-12936912.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'silver-puja-thali' AND image_url LIKE '%/photos/32357382/%';

-- Camphor Tablets: was a SPICE box -> camphor burning in brass aarti holder
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/7750217/pexels-photo-7750217.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'camphor-tablets-100g' AND image_url LIKE '%/photos/32038446/%';

-- Rudraksha Mala: was a RICE dish -> rudraksha mala with tassel
UPDATE public.samagri_products SET image_url = 'https://images.pexels.com/photos/6634244/pexels-photo-6634244.jpeg?auto=compress&cs=tinysrgb&h=600&w=600&fit=crop'
 WHERE slug = 'rudraksha-mala-108' AND image_url LIKE '%/photos/24206919/%';

-- ---------- Pandit profile photos (400x400) ----------
-- Pt. Suresh Dikshit: posing figure at ruins -> priest in saffron with offering
UPDATE public.pandits SET photo_url = 'https://images.pexels.com/photos/36853153/pexels-photo-36853153.jpeg?auto=compress&cs=tinysrgb&h=400&w=400&fit=crop'
 WHERE id = 'a0000002-0000-0000-0000-000000000002' AND photo_url LIKE '%/photos/18194586/%';

-- Pt. Devraj Acharya: sadhu holding a horn -> elderly man in traditional attire
UPDATE public.pandits SET photo_url = 'https://images.pexels.com/photos/10138923/pexels-photo-10138923.jpeg?auto=compress&cs=tinysrgb&h=400&w=400&fit=crop'
 WHERE id = 'a0000006-0000-0000-0000-000000000006' AND photo_url LIKE '%/photos/10098312/%';

COMMIT;
