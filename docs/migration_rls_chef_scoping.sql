-- Migration: Chef scoping RLS policies
-- Ajoute des politiques RLS limitant les chefs à leurs chantiers respectifs

-- 1. Politique sur chantiers : chef ne voit que son chantier
--    On suppose que le JWT contient un claim 'chantier' ou que l'email du chef
--    correspond à un enregistrement dans personnel avec un chantier assigné.
DROP POLICY IF EXISTS "chef_select_chantiers" ON chantiers;
CREATE POLICY "chef_select_chantiers" ON chantiers FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin'
  OR auth.jwt() ->> 'role' = 'daf'
  OR (
    auth.jwt() ->> 'role' = 'chef'
    AND nom = COALESCE(auth.jwt() ->> 'chantier', '')
  )
);

-- 2. Politique sur personnel : chef ne voit que son équipe (même chantier)
DROP POLICY IF EXISTS "chef_select_personnel" ON personnel;
CREATE POLICY "chef_select_personnel" ON personnel FOR SELECT USING (
  auth.jwt() ->> 'role' IN ('admin', 'rh', 'daf')
  OR (
    auth.jwt() ->> 'role' = 'chef'
    AND chantier = COALESCE(auth.jwt() ->> 'chantier', '')
  )
);

-- 3. Politique sur materiels : chef voit tout (lecture seule)
DROP POLICY IF EXISTS "chef_select_materiels" ON materiels;
CREATE POLICY "chef_select_materiels" ON materiels FOR SELECT USING (true);

-- 4. Politique sur pointage_attendance : chef ne voit que son équipe
DROP POLICY IF EXISTS "chef_select_pointage" ON pointage_attendance;
CREATE POLICY "chef_select_pointage" ON pointage_attendance FOR SELECT USING (
  auth.jwt() ->> 'role' IN ('admin', 'rh')
  OR (
    auth.jwt() ->> 'role' = 'chef'
    AND employe_id IN (
      SELECT id FROM personnel
      WHERE chantier = COALESCE(auth.jwt() ->> 'chantier', '')
    )
  )
);

-- 5. Activer RLS sur les tables si pas déjà fait
ALTER TABLE IF EXISTS ONLY chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ONLY personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ONLY materiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ONLY pointage_attendance ENABLE ROW LEVEL SECURITY;
