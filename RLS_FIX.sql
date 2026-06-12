-- ============================================================
-- RLS_FIX.sql — Corrections RLS identifiées par TEST_FLUX_COMPLET
-- Appliquer via Supabase SQL Editor (service_role requis)
-- Usage : Copier-coller dans Supabase Dashboard > SQL Editor
-- ============================================================

-- S03: Bloquer SELECT salaires pour tous sauf RH et admin
DROP POLICY IF EXISTS "salaires_select_policy" ON salaires;
CREATE POLICY "salaires_select_policy" ON salaires
  FOR SELECT USING (
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('rh', 'admin')
  );

-- S07: Bloquer SELECT devis pour les anon (unauthenticated)
DROP POLICY IF EXISTS "devis_select_anon" ON devis;
-- Si la table devis a RLS enabled mais un policy public existe, le supprimer
-- Sinon, activer RLS et créer policy pour users authentifiés
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "devis_select_all" ON devis;
CREATE POLICY "devis_select_authenticated" ON devis
  FOR SELECT USING (
    auth.role() = 'authenticated'
      AND current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' IN ('admin', 'daf')
  );

-- S08: DELETE sur journal réservé à admin uniquement
DROP POLICY IF EXISTS "journal_delete_policy" ON journal;
CREATE POLICY "journal_delete_policy" ON journal
  FOR DELETE USING (
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' = 'admin'
  );

-- S09: DELETE sur personnel réservé à admin uniquement
DROP POLICY IF EXISTS "personnel_delete_policy" ON personnel;
CREATE POLICY "personnel_delete_policy" ON personnel
  FOR DELETE USING (
    current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role' = 'admin'
  );
