-- Fix RLS v23 : supprimer allow_all, restreindre DELETE pour non-admin

-- 1. DROP allow_all sur controles_inopines (public → bloqué sauf controleur/admin)
DROP POLICY IF EXISTS allow_all_controles ON controles_inopines;
DROP POLICY IF EXISTS allow_all_controles_inopines ON controles_inopines;

-- 2. DROP allow_all sur rapports_chantier (public → bloqué sauf chef/admin/daf)
DROP POLICY IF EXISTS allow_all_rapports ON rapports_chantier;
DROP POLICY IF EXISTS allow_all_rapports_chantier ON rapports_chantier;

-- 3. Journal : remplacer ALL par SELECT/INSERT/UPDATE uniquement, DELETE réservé admin
DROP POLICY IF EXISTS admin_daf_rh_all_journal ON journal;

CREATE POLICY admin_daf_rh_select_journal ON journal
  FOR SELECT TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'daf', 'rh']));

CREATE POLICY admin_daf_rh_insert_journal ON journal
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'daf', 'rh']));

CREATE POLICY admin_daf_rh_update_journal ON journal
  FOR UPDATE TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'daf', 'rh']))
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'daf', 'rh']));

CREATE POLICY admin_delete_journal ON journal
  FOR DELETE TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- 4. Devis : remplacer ALL, DELETE réservé admin (M16)
DROP POLICY IF EXISTS admin_daf_all_devis ON devis;

CREATE POLICY admin_daf_select_devis ON devis
  FOR SELECT TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'daf']));

CREATE POLICY admin_daf_insert_devis ON devis
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'daf']));

CREATE POLICY admin_daf_update_devis ON devis
  FOR UPDATE TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'daf']))
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'daf']));

CREATE POLICY admin_delete_devis ON devis
  FOR DELETE TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- 5. Personnel : remplacer ALL, DELETE réservé admin (C3)
DROP POLICY IF EXISTS admin_rh_daf_all_personnel ON personnel;

CREATE POLICY admin_rh_daf_select_personnel ON personnel
  FOR SELECT TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'rh', 'daf']));

CREATE POLICY admin_rh_daf_insert_personnel ON personnel
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'rh', 'daf']));

CREATE POLICY admin_rh_daf_update_personnel ON personnel
  FOR UPDATE TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'rh', 'daf']))
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = ANY (ARRAY['admin', 'rh', 'daf']));

CREATE POLICY admin_delete_personnel ON personnel
  FOR DELETE TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- Vérification finale
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename IN ('journal','controles_inopines','rapports_chantier','devis','personnel')
ORDER BY tablename, cmd;
