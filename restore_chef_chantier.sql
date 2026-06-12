UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"chantier": "AMBATOMAINTY"}'::jsonb
WHERE email = 'chef@nysoa.mg'
RETURNING email, raw_user_meta_data->>'chantier' as chantier;
