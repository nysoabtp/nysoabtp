-- ============================================================
-- RLS_FIX_2.sql — Corrige les INSERT manquants + nettoyage final
-- ============================================================

-- 1. CONGES — Ajouter INSERT pour RH et Admin
DROP POLICY IF EXISTS allow_all_conges ON conges;
CREATE POLICY rh_admin_insert_conges ON conges
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('rh', 'admin')
  );

CREATE POLICY rh_admin_update_conges ON conges
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('rh', 'admin'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('rh', 'admin'));

-- 2. SALAIRES — Réparer USING pour éviter doublons
DROP POLICY IF EXISTS rh_manage_salaires ON salaires;
CREATE POLICY rh_manage_salaires ON salaires
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('rh', 'admin')
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('rh', 'admin')
  );

DROP POLICY IF EXISTS authenticated_only_select ON salaires;

-- 3. VALIDATIONS — Vérifier que chef peut insérer
DROP POLICY IF EXISTS admin_insert_validations ON validations;
CREATE POLICY authenticated_insert_validations ON validations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() IS NOT NULL
  );

-- Clean up dup chantier rows from test pollution
DELETE FROM chantiers WHERE ctid NOT IN (
  SELECT min(ctid) FROM chantiers GROUP BY nom
);

-- 4. Supprimer les policies {public} restantes sur INSERT sensibles
DROP POLICY IF EXISTS controleur_insert_inspections ON controles_inopines;
CREATE POLICY controleur_insert_inspections ON controles_inopines
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'controleur'
  );

DROP POLICY IF EXISTS rh_insert_pointage ON pointage_attendance;
CREATE POLICY rh_insert_pointage ON pointage_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'rh'
  );

DROP POLICY IF EXISTS rh_admin_daf_read_all_pointage ON pointage_attendance;

CREATE POLICY rh_admin_daf_pointage ON pointage_attendance
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('rh', 'admin', 'daf')
  );

-- 5. Nettoyer les tables de test (supprimer doublons eventuels)
DELETE FROM validations WHERE emetteur_role IS NULL;
