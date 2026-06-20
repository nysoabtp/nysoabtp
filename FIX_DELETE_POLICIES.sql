-- ═══════════════════════════════════════════════════════════════
-- FIX_DELETE_POLICIES.sql — Corrigé 2026-06-20
-- ═══════════════════════════════════════════════════════════════
-- BUG    : RLS bloque silencieusement les DELETE sans policy.
--           admin/chef peuvent declencher un DELETE mais rien ne se passe.
--           AUCUNE erreur JS — DELETE SQL silencieux (0 lignes affectees).
-- SOURCES: Audit RLS 2026-06-20 (API REST anon key + compte DAF).
-- NOTE    : "suppressions_log" retire — table inexistante en prod (HTTP 404).
--
-- IMPORTANT: Executer via Supabase Dashboard SQL Editor (service_role requis).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. VALIDATIONS ─────────────────────────────────────────────
-- DELETE appele depuis : qa_global.js (ligne ~650)
DROP POLICY IF EXISTS delete_validations_admin ON validations;
CREATE POLICY delete_validations_admin ON validations
  FOR DELETE TO authenticated
  USING (
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'daf')
    AND (
      (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
      OR (emetteur_id = (auth.jwt() -> 'sub')::uuid AND statut = 'EN_ATTENTE')
    )
  );

-- ── 2. CONTROLES_INOPINES ─────────────────────────────────────
-- DELETE appele depuis : controleur.html (ligne ~539)
DROP POLICY IF EXISTS delete_controles_inopines_admin ON controles_inopines;
CREATE POLICY delete_controles_inopines_admin ON controles_inopines
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── 3. GANTT_TACHES ─────────────────────────────────────────────
-- DELETE appele depuis : admin.html (ligne ~2338), suivi-chantier.html (ligne ~1395)
DROP POLICY IF EXISTS delete_gantt_admin ON gantt_taches;
CREATE POLICY delete_gantt_admin ON gantt_taches
  FOR DELETE TO authenticated
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── 4. VERIFICATION ────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  permissive,
  roles
FROM pg_policies
WHERE tablename IN ('validations', 'controles_inopines', 'gantt_taches')
  AND cmd = 'DELETE';

-- ── NOTE ───────────────────────────────────────────────────────
-- "suppressions_log" a ete retire du script car :
--   1. Table inexistante en prod (HTTP 404 confirme)
--   2. Aucune operation DELETE dans le code source (grep confirme)
--   3. Aucune reference dans les formulaires UI
-- Si cette table est necessaire plus tard, la creer via une migration separee.
