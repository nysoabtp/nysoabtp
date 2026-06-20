-- ═══════════════════════════════════════════════════════════════
-- FIX_DELETE_POLICIES.sql — Version finale corrigeee 2026-06-20
-- ═══════════════════════════════════════════════════════════════════════
-- BUG    : RLS bloque silencieusement les DELETE sans policy.
--           admin/chef peuvent declencher un DELETE mais rien ne se passe.
--           AUCUNE erreur JS — DELETE SQL silencieux (0 lignes affectees).
-- AUDIT  : prod confirme 3 tables avec DELETE operationnels :
--             validations   (qa_global.js ~650)
--             controles_inopines (controleur.html ~539)
--             gantt_taches  (admin.html ~2338, suivi-chantier.html ~1395)
-- NOTE    : "suppressions_log" retire — table inexistante (HTTP 404).
--
-- IMPORTANT : Executer via Supabase Dashboard SQL Editor (service_role requis).
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- RAPPEL SYNTAXE : utiliser ->> (TEXT) pour extraire du JWT
--
-- CORRECT :   auth.jwt() ->> 'role'           → TEXT
-- CORRECT :   (auth.jwt() ->> 'sub')::uuid    → TEXT puis UUID
-- INCORRECT : auth.jwt() -> 'sub'::uuid       → JSONB vers UUID IMPOSSIBLE
-- INCORRECT : auth.jwt() -> 'sub'             → retourne du JSONB
-- ═══════════════════════════════════════════════════════════════

-- ── 1. VALIDATIONS ─────────────────────────────────────────────
-- Admin peut supprimer toutes les validations.
-- Policy precedente (si existe) est remplacee.
DROP POLICY IF EXISTS delete_validations_admin ON validations;
CREATE POLICY delete_validations_admin ON validations
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- ── 2. CONTROLES_INOPINES ─────────────────────────────────────
-- Admin peut supprimer tout controle inopine.
DROP POLICY IF EXISTS delete_controles_inopines_admin ON controles_inopines;
CREATE POLICY delete_controles_inopines_admin ON controles_inopines
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- ── 3. GANTT_TACHES ─────────────────────────────────────────────
-- Admin peut supprimer toute tache gantt.
-- (Policy precedente "Chef delete own gantt" reste intacte si elle existe.)
DROP POLICY IF EXISTS delete_gantt_admin ON gantt_taches;
CREATE POLICY delete_gantt_admin ON gantt_taches
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- ── 4. VERIFICATION ────────────────────────────────────────────
-- Doit retourner 3 lignes (1 policy DELETE par table)
SELECT
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename IN ('validations', 'controles_inopines', 'gantt_taches')
  AND cmd = 'DELETE';
