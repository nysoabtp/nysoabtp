-- ============================================================
-- NYSOA BTP — FIX_RLS_ALL_TABLES.sql
-- Complète les RLS policies pour toutes les tables
-- manquantes dans FIX_RLS_CHEF.sql
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. stocks_chantier
-- ══════════════════════════════════════════════════════════════
ALTER TABLE stocks_chantier ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef manage own stock" ON stocks_chantier;

CREATE POLICY "Chef read own stock" ON stocks_chantier
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

CREATE POLICY "Chef insert own stock" ON stocks_chantier
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

CREATE POLICY "Chef update own stock" ON stocks_chantier
FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

DROP POLICY IF EXISTS "Admin read all stock" ON stocks_chantier;
CREATE POLICY "Admin read all stock" ON stocks_chantier
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf', 'rh')
);

-- ══════════════════════════════════════════════════════════════
-- 2. materiels
-- ══════════════════════════════════════════════════════════════
ALTER TABLE materiels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef read own materiels" ON materiels;
CREATE POLICY "Chef read own materiels" ON materiels
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier_actuel = auth.jwt()->'user_metadata'->>'chantier'
);

DROP POLICY IF EXISTS "Admin manage materiels" ON materiels;

CREATE POLICY "Admin DAF read materiels" ON materiels
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf')
);

CREATE POLICY "Admin DAF insert materiels" ON materiels
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf')
);

CREATE POLICY "Admin DAF update materiels" ON materiels
FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf')
);

-- Seul admin peut supprimer du matériel
CREATE POLICY "Admin delete materiels" ON materiels
FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
);

-- ══════════════════════════════════════════════════════════════
-- 3. journal
-- ══════════════════════════════════════════════════════════════
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef read own journal" ON journal;
CREATE POLICY "Chef read own journal" ON journal
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

DROP POLICY IF EXISTS "DAF Admin manage journal" ON journal;

CREATE POLICY "DAF Admin read journal" ON journal
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('daf', 'admin')
);

CREATE POLICY "DAF Admin insert journal" ON journal
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' IN ('daf', 'admin')
);

CREATE POLICY "DAF Admin update journal" ON journal
FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' IN ('daf', 'admin')
);

-- Seul admin peut supprimer des écritures comptables
CREATE POLICY "Admin delete journal" ON journal
FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
);

DROP POLICY IF EXISTS "RH read journal" ON journal;
CREATE POLICY "RH read journal" ON journal
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'rh'
);

-- ══════════════════════════════════════════════════════════════
-- 4. devis
-- ══════════════════════════════════════════════════════════════
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef read own devis" ON devis;
CREATE POLICY "Chef read own devis" ON devis
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

DROP POLICY IF EXISTS "DAF manage devis" ON devis;

CREATE POLICY "DAF read devis" ON devis
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'daf'
);

CREATE POLICY "DAF insert devis" ON devis
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'daf'
);

CREATE POLICY "DAF update devis" ON devis
FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'daf'
);

-- Seul admin peut supprimer des devis
CREATE POLICY "Admin delete devis" ON devis
FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
);

DROP POLICY IF EXISTS "Admin read devis" ON devis;
CREATE POLICY "Admin read devis" ON devis
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
);

-- ══════════════════════════════════════════════════════════════
-- 5. commandes
-- ══════════════════════════════════════════════════════════════
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef read own commandes" ON commandes;
CREATE POLICY "Chef read own commandes" ON commandes
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

DROP POLICY IF EXISTS "DAF manage commandes" ON commandes;

CREATE POLICY "DAF read commandes" ON commandes
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'daf'
);

CREATE POLICY "DAF insert commandes" ON commandes
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'daf'
);

CREATE POLICY "DAF update commandes" ON commandes
FOR UPDATE USING (
    auth.jwt()->'user_metadata'->>'role' = 'daf'
);

-- Seul admin peut supprimer des commandes
CREATE POLICY "Admin delete commandes" ON commandes
FOR DELETE USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
);

-- ══════════════════════════════════════════════════════════════
-- 6. gantt_taches
-- ══════════════════════════════════════════════════════════════
ALTER TABLE gantt_taches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef read own gantt" ON gantt_taches;
CREATE POLICY "Chef read own gantt" ON gantt_taches
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

DROP POLICY IF EXISTS "Chef manage own gantt" ON gantt_taches;
CREATE POLICY "Chef manage own gantt" ON gantt_taches
FOR INSERT WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);

DROP POLICY IF EXISTS "Admin DAF read all gantt" ON gantt_taches;
CREATE POLICY "Admin DAF read all gantt" ON gantt_taches
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf')
);

-- ══════════════════════════════════════════════════════════════
-- 7. caisse
-- ══════════════════════════════════════════════════════════════
ALTER TABLE caisse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "DAF manage caisse" ON caisse;

CREATE POLICY "DAF read caisse" ON caisse
FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'daf');

CREATE POLICY "DAF insert caisse" ON caisse
FOR INSERT WITH CHECK (auth.jwt()->'user_metadata'->>'role' = 'daf');

CREATE POLICY "DAF update caisse" ON caisse
FOR UPDATE USING (auth.jwt()->'user_metadata'->>'role' = 'daf');

DROP POLICY IF EXISTS "Admin read caisse" ON caisse;
CREATE POLICY "Admin read caisse" ON caisse
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' = 'admin'
);

-- ══════════════════════════════════════════════════════════════
-- VÉRIFICATION : toutes les policies
-- ══════════════════════════════════════════════════════════════
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
