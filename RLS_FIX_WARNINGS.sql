-- ============================================================
-- RLS_FIX_WARNINGS.sql — Corrige les 9 warnings des tests QA
-- Problèmes :
--   S02 : controles_inopines visible par DAF (roles public)
--   S03 : salaires visible par technicien (allow_all_salaires + roles public)
--   S04 : journal visible par technicien (authenticated_read roles public)
--   S05 : devis visible par RH (authenticated_only_select roles public)
--   S06 : journal visible par controleur (même cause que S04)
--   S07 : anon accède à 1 table sensible (roles public non filtré)
--   S08 : DAF DELETE journal status 204 (DELETE policy trop large)
--   S09 : RH DELETE personnel status 204 (DELETE policy trop large)
--   S11 : Chef INSERT rapport autre chantier non bloqué (fallback IS NULL)
-- ============================================================

-- 1. Restaurer le chantier du chef dans user_metadata
--    (le CLEAN_METADATA a supprimé le chantier, les tests en ont besoin)
--    Via API Supabase Management (exécuté plus tard par script JS)

-- 2. SUPPRIMER les politiques à roles={public} sur les tables sensibles
--    (roles public = tout le monde, y compris anon)

-- 2a. SALAIRES — Supprimer allow_all_salaires et corriger roles
DROP POLICY IF EXISTS allow_all_salaires ON salaires;
DROP POLICY IF EXISTS authenticated_only_select ON salaires;

ALTER TABLE salaires ENABLE ROW LEVEL SECURITY;

-- RH: ALL (gestion complète)
DROP POLICY IF EXISTS rh_manage_salaires ON salaires;
CREATE POLICY rh_manage_salaires ON salaires
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' IS NOT NULL)
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'rh'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- DAF/Admin: SELECT only
DROP POLICY IF EXISTS daf_admin_read_salaires ON salaires;
CREATE POLICY daf_admin_read_salaires ON salaires
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('daf', 'admin')
  );

-- 2b. JOURNAL — Supprimer authenticated_read
DROP POLICY IF EXISTS authenticated_read ON journal;
DROP POLICY IF EXISTS "Admin read journal benefice" ON journal;
DROP POLICY IF EXISTS "DAF read journal" ON journal;

ALTER TABLE journal ENABLE ROW LEVEL SECURITY;

-- Admin/DAF/RH: SELECT
DROP POLICY IF EXISTS admin_daf_rh_select_journal ON journal;
CREATE POLICY admin_daf_rh_select_journal ON journal
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'daf', 'rh')
  );

-- Chef: SELECT own chantier only
DROP POLICY IF EXISTS chef_read_own_journal ON journal;
CREATE POLICY chef_read_own_journal ON journal
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'chef'
    AND chantier ~~* (auth.jwt() -> 'user_metadata' ->> 'chantier')
  );

-- Admin/DAF/RH: INSERT
DROP POLICY IF EXISTS admin_daf_rh_insert_journal ON journal;
CREATE POLICY admin_daf_rh_insert_journal ON journal
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'daf', 'rh')
  );

-- Admin/DAF/RH: UPDATE
DROP POLICY IF EXISTS admin_daf_rh_update_journal ON journal;
CREATE POLICY admin_daf_rh_update_journal ON journal
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'daf', 'rh'))
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'daf', 'rh'));

-- Admin only: DELETE
DROP POLICY IF EXISTS admin_delete_journal ON journal;
CREATE POLICY admin_delete_journal ON journal
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 2c. DEVIS — Supprimer authenticated_only_select
DROP POLICY IF EXISTS authenticated_only_select ON devis;

ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_daf_select_devis ON devis;
CREATE POLICY admin_daf_select_devis ON devis
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'daf')
  );

DROP POLICY IF EXISTS chef_read_own_devis ON devis;
CREATE POLICY chef_read_own_devis ON devis
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'chef'
    AND chantier_id IN (
      SELECT id FROM chantiers
      WHERE nom ~~* (auth.jwt() -> 'user_metadata' ->> 'chantier')
    )
  );

-- 2d. PERSONNEL — Supprimer authenticated_only_select
DROP POLICY IF EXISTS authenticated_only_select ON personnel;

ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_rh_daf_select_personnel ON personnel;
CREATE POLICY admin_rh_daf_select_personnel ON personnel
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'rh', 'daf')
  );

DROP POLICY IF EXISTS chef_read_own_personnel ON personnel;
CREATE POLICY chef_read_own_personnel ON personnel
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'chef'
    AND chantier ~~* (auth.jwt() -> 'user_metadata' ->> 'chantier')
  );

-- Admin only: DELETE
DROP POLICY IF EXISTS admin_delete_personnel ON personnel;
CREATE POLICY admin_delete_personnel ON personnel
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
  );

-- 2e. CONTROLES_INOPINES — Supprimer authenticated_read
DROP POLICY IF EXISTS authenticated_read ON controles_inopines;

ALTER TABLE controles_inopines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS controleur_admin_read_inspections ON controles_inopines;
CREATE POLICY controleur_admin_read_inspections ON controles_inopines
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('controleur', 'admin')
  );

-- 3. RAPPORTS_CHANTIER — Supprimer le fallback IS NULL (S11)
--    Chef ne doit pas pouvoir insérer si chantier metadata est null
DROP POLICY IF EXISTS chef_insert_rapports ON rapports_chantier;
DROP POLICY IF EXISTS chef_select_rapports ON rapports_chantier;
DROP POLICY IF EXISTS authenticated_read ON rapports_chantier;

ALTER TABLE rapports_chantier ENABLE ROW LEVEL SECURITY;

-- Chef: INSERT uniquement sur son chantier assigné
DROP POLICY IF EXISTS chef_insert_own_chantier_rapports ON rapports_chantier;
CREATE POLICY chef_insert_own_chantier_rapports ON rapports_chantier
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'chef'
    AND chantier = (auth.jwt() -> 'user_metadata' ->> 'chantier')
  );

-- Chef/Admin/DAF: SELECT
DROP POLICY IF EXISTS chef_admin_daf_read_rapports ON rapports_chantier;
CREATE POLICY chef_admin_daf_read_rapports ON rapports_chantier
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('chef', 'admin', 'daf')
  );

-- 4. POINTAGE_ATTENDANCE — Supprimer les fallbacks IS NULL
DROP POLICY IF EXISTS chef_select_pointage ON pointage_attendance;
DROP POLICY IF EXISTS chef_insert_pointage ON pointage_attendance;
DROP POLICY IF EXISTS authenticated_read ON pointage_attendance;

ALTER TABLE pointage_attendance ENABLE ROW LEVEL SECURITY;

-- Chef: SELECT sur son chantier uniquement
DROP POLICY IF EXISTS chef_read_own_chantier_pointage ON pointage_attendance;
CREATE POLICY chef_read_own_chantier_pointage ON pointage_attendance
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'chef'
    AND chantier = (auth.jwt() -> 'user_metadata' ->> 'chantier')
  );

-- Chef: INSERT sur son chantier uniquement
DROP POLICY IF EXISTS chef_insert_own_chantier_pointage ON pointage_attendance;
CREATE POLICY chef_insert_own_chantier_pointage ON pointage_attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'chef'
    AND chantier = (auth.jwt() -> 'user_metadata' ->> 'chantier')
  );

-- Admin/RH: ALL
DROP POLICY IF EXISTS admin_all_pointage ON pointage_attendance;
CREATE POLICY admin_all_pointage ON pointage_attendance
  FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'rh')
  )
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'rh')
  );

-- 5. VALIDATIONS — Supprimer roles public
DROP POLICY IF EXISTS authenticated_select ON validations;
DROP POLICY IF EXISTS authenticated_insert ON validations;
DROP POLICY IF EXISTS admin_manage_validations ON validations;
DROP POLICY IF EXISTS admin_update_validations ON validations;
DROP POLICY IF EXISTS chef_select_validations ON validations;
DROP POLICY IF EXISTS chef_insert_validations ON validations;

ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_select_validations ON validations
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'daf', 'rh')
  );

CREATE POLICY admin_insert_validations ON validations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'daf', 'rh', 'chef')
  );

CREATE POLICY admin_update_validations ON validations
  FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- 6. AUTRES TABLES — Nettoyer les policies roles={public} restantes
-- (qui permettent à anon de SELECT)

-- ANTOKA
DROP POLICY IF EXISTS allow_all_antoka ON antoka;
ALTER TABLE antoka ENABLE ROW LEVEL SECURITY;

-- ACHATS
DROP POLICY IF EXISTS allow_all_achats ON achats;
ALTER TABLE achats ENABLE ROW LEVEL SECURITY;

-- CONGES
DROP POLICY IF EXISTS allow_all_conges ON conges;
ALTER TABLE conges ENABLE ROW LEVEL SECURITY;

-- CONTRATS
DROP POLICY IF EXISTS allow_all_contrats ON contrats;
ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;

-- CREDITS_FOURNISSEURS
DROP POLICY IF EXISTS allow_all_credits ON credits_fournisseurs;
DROP POLICY IF EXISTS allow_all_credits_fournisseurs ON credits_fournisseurs;
ALTER TABLE credits_fournisseurs ENABLE ROW LEVEL SECURITY;

-- DEVIS_LIGNES / DEVIS_LOTS
DROP POLICY IF EXISTS allow_all_devis_lignes ON devis_lignes;
DROP POLICY IF EXISTS allow_all_devis_lots ON devis_lots;
ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lots ENABLE ROW LEVEL SECURITY;

-- CATALOGUE_PRIX
DROP POLICY IF EXISTS allow_all_catalogue ON catalogue_prix;
DROP POLICY IF EXISTS allow_all_catalogue_prix ON catalogue_prix;
ALTER TABLE catalogue_prix ENABLE ROW LEVEL SECURITY;

-- GANTT_TACHES
DROP POLICY IF EXISTS allow_all_gantt ON gantt_taches;
DROP POLICY IF EXISTS allow_all_gantt_taches ON gantt_taches;
ALTER TABLE gantt_taches ENABLE ROW LEVEL SECURITY;

-- LOGISTIQUE
DROP POLICY IF EXISTS allow_all_logistique ON logistique;
ALTER TABLE logistique ENABLE ROW LEVEL SECURITY;

-- MATERIAUX
DROP POLICY IF EXISTS allow_all_materiaux ON materiaux;
ALTER TABLE materiaux ENABLE ROW LEVEL SECURITY;

-- STOCKS_CHANTIER
DROP POLICY IF EXISTS open ON stocks_chantier;
ALTER TABLE stocks_chantier ENABLE ROW LEVEL SECURITY;

-- BUDGET_FELANA
DROP POLICY IF EXISTS budget_felana_all ON budget_felana;
ALTER TABLE budget_felana ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RAPPORT : Vérification des policies restantes
-- ============================================================
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
