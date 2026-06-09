-- Migration: Chef scoping RLS policies (appliquée en prod le 08/06/2026)
-- Étape 1: Supprimer les anciennes policies allow_all qui court-circuitent le scoping
DROP POLICY IF EXISTS "allow_all_chantiers" ON chantiers;
DROP POLICY IF EXISTS "allow_all_personnel" ON personnel;
DROP POLICY IF EXISTS "allow_all_materiels" ON materiels;
DROP POLICY IF EXISTS "allow_all_pointage_attendance" ON pointage_attendance;
DROP POLICY IF EXISTS "anon_select" ON chantiers;
DROP POLICY IF EXISTS "anon_select" ON personnel;
DROP POLICY IF EXISTS "anon_select" ON materiels;
DROP POLICY IF EXISTS "anon_select" ON pointage_attendance;
DROP POLICY IF EXISTS "anon_insert" ON chantiers;
DROP POLICY IF EXISTS "anon_insert" ON personnel;
DROP POLICY IF EXISTS "anon_insert" ON materiels;
DROP POLICY IF EXISTS "anon_insert" ON pointage_attendance;
DROP POLICY IF EXISTS "anon_update" ON chantiers;
DROP POLICY IF EXISTS "anon_update" ON personnel;
DROP POLICY IF EXISTS "anon_update" ON materiels;
DROP POLICY IF EXISTS "anon_update" ON pointage_attendance;
DROP POLICY IF EXISTS "anon_delete" ON chantiers;
DROP POLICY IF EXISTS "anon_delete" ON personnel;
DROP POLICY IF EXISTS "anon_delete" ON materiels;
DROP POLICY IF EXISTS "anon_delete" ON pointage_attendance;

-- Étape 2: Admin/DAF/RH full access
CREATE POLICY "admin_all_chantiers" ON chantiers FOR ALL USING (auth.jwt() ->> 'role' IN ('admin','daf'));
CREATE POLICY "admin_all_personnel" ON personnel FOR ALL USING (auth.jwt() ->> 'role' IN ('admin','rh','daf'));
CREATE POLICY "admin_all_materiels" ON materiels FOR ALL USING (auth.jwt() ->> 'role' IN ('admin','daf'));
CREATE POLICY "admin_all_pointage" ON pointage_attendance FOR ALL USING (auth.jwt() ->> 'role' IN ('admin','rh'));

-- Étape 3: Chef SELECT scoped
CREATE POLICY "chef_select_chantiers" ON chantiers FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin'
  OR auth.jwt() ->> 'role' = 'daf'
  OR (auth.jwt() ->> 'role' = 'chef' AND nom = COALESCE(auth.jwt() ->> 'chantier', ''))
);

CREATE POLICY "chef_select_personnel" ON personnel FOR SELECT USING (
  auth.jwt() ->> 'role' IN ('admin', 'rh', 'daf')
  OR (auth.jwt() ->> 'role' = 'chef' AND chantier = COALESCE(auth.jwt() ->> 'chantier', ''))
);

CREATE POLICY "chef_select_materiels" ON materiels FOR SELECT USING (true);

CREATE POLICY "chef_select_pointage" ON pointage_attendance FOR SELECT USING (
  auth.jwt() ->> 'role' IN ('admin', 'rh')
  OR (auth.jwt() ->> 'role' = 'chef' AND employe_id IN (
    SELECT id FROM personnel WHERE chantier = COALESCE(auth.jwt() ->> 'chantier', '')
  ))
);

-- Étape 4: Chef INSERT (avec WITH CHECK)
CREATE POLICY "chef_insert_personnel" ON personnel FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'chef' AND chantier = COALESCE(auth.jwt() ->> 'chantier', '')
);

CREATE POLICY "chef_insert_pointage" ON pointage_attendance FOR INSERT WITH CHECK (
  auth.jwt() ->> 'role' = 'chef'
);

-- Activer RLS (déjà fait, idempotent)
ALTER TABLE IF EXISTS ONLY chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ONLY personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ONLY materiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ONLY pointage_attendance ENABLE ROW LEVEL SECURITY;
