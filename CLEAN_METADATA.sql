-- ============================================================
-- CLEAN_METADATA.sql — Supprime le chantier hardcodé des comptes
-- À exécuter DANS Supabase Dashboard > SQL Editor (pas via API)
-- ============================================================

-- 1. Retirer le chantier du metadata du chef (le rend vierge)
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'chantier'
WHERE email = 'chef@nysoa.mg';

-- 2. Vérification
SELECT email, raw_user_meta_data FROM auth.users WHERE email = 'chef@nysoa.mg';

-- 3. (Optionnel) Pour réassigner plus tard :
-- UPDATE auth.users
-- SET raw_user_meta_data = raw_user_meta_data || '{"chantier":"CHANTIER TEST ALPHA"}'::jsonb
-- WHERE email = 'chef@nysoa.mg';
