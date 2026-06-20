-- ═══════════════════════════════════════════════════════════════
-- FIX_B01 : DELETE silencieux — ajouter les policies DELETE manquantes
-- ═══════════════════════════════════════════════════════════════
-- Problème : RLS bloque silencieusement les DELETE sans policy.
-- Tables concernées : validations, controles_inopines,
--   suppressions_log, gantt_taches
-- ═══════════════════════════════════════════════════════════════

-- ── VALIDATIONS ────────────────────────────────────────────────
DROP POLICY IF EXISTS delete_validations_admin ON validations;
CREATE POLICY delete_validations_admin ON validations
  FOR DELETE TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── CONTROLES_INOPINES ─────────────────────────────────────────
DROP POLICY IF EXISTS admin_delete_controles ON controles_inopines;
CREATE POLICY admin_delete_controles ON controles_inopines
  FOR DELETE TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── SUPPRESSIONS_LOG ───────────────────────────────────────────
DROP POLICY IF EXISTS admin_delete_suppressions ON suppressions_log;
CREATE POLICY admin_delete_suppressions ON suppressions_log
  FOR DELETE TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── GANTT_TACHES ────────────────────────────────────────────────
DROP POLICY IF EXISTS admin_delete_gantt ON gantt_taches;
CREATE POLICY admin_delete_gantt ON gantt_taches
  FOR DELETE TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── VÉRIFICATION ───────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('validations', 'controles_inopines', 'suppressions_log', 'gantt_taches');
