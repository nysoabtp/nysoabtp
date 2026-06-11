-- ============================================================
-- CORRECTIONS : colonnes manquantes + vues
-- Execute APRES SUPABASE_SETUP.sql (ou seul si les tables existent)
-- ============================================================

-- 1. Ajouter la colonne 'date' dans journal (alias de date_ecriture)
ALTER TABLE journal ADD COLUMN IF NOT EXISTS date DATE;
UPDATE journal SET date = date_ecriture WHERE date IS NULL AND date_ecriture IS NOT NULL;

-- 2. Ajouter colonnes manquantes dans personnel
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS chantier TEXT;
UPDATE personnel SET chantier = chantier_code WHERE chantier IS NULL AND chantier_code IS NOT NULL;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS date_embauche DATE;

-- 3. Ajouter colonne semaine_du dans pointage si pas de date
ALTER TABLE pointage ADD COLUMN IF NOT EXISTS date DATE;

-- 4. Creer les 3 tables manquantes
CREATE TABLE IF NOT EXISTS rapports_chantier (
    id              BIGSERIAL PRIMARY KEY,
    date            DATE NOT NULL,
    chantier        TEXT NOT NULL,
    meteo           TEXT,
    ouvriers        INTEGER DEFAULT 0,
    travaux         TEXT,
    taches          JSONB DEFAULT '[]',
    mouvements      JSONB DEFAULT '[]',
    photos          JSONB DEFAULT '[]',
    problemes       TEXT,
    actions         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS controles_inopines (
    id              BIGSERIAL PRIMARY KEY,
    chantier        TEXT NOT NULL,
    datetime        TIMESTAMPTZ,
    controleur      TEXT,
    chef_present    TEXT,
    resultats       JSONB DEFAULT '{}',
    observations    TEXT,
    photos          JSONB DEFAULT '[]',
    score           INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gantt_taches (
    id              BIGSERIAL PRIMARY KEY,
    tache           TEXT NOT NULL,
    chantier        TEXT,
    debut           DATE NOT NULL,
    fin             DATE NOT NULL,
    avancement      INTEGER DEFAULT 0,
    couleur         TEXT DEFAULT 'blue',
    responsable     TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RLS pour les nouvelles tables
ALTER TABLE rapports_chantier    ENABLE ROW LEVEL SECURITY;
ALTER TABLE controles_inopines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_taches         ENABLE ROW LEVEL SECURITY;

-- rapports_chantier : chef gère ses propres rapports, admin/daf/controleur lisent tout
DROP POLICY IF EXISTS allow_all_rapports_chantier ON rapports_chantier;
DROP POLICY IF EXISTS "Chef manage own rapports" ON rapports_chantier;
CREATE POLICY "Chef manage own rapports" ON rapports_chantier
FOR ALL USING (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND (auth.jwt()->'user_metadata'->>'chantier') IS NOT NULL
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
) WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'chef'
    AND (auth.jwt()->'user_metadata'->>'chantier') IS NOT NULL
    AND chantier = auth.jwt()->'user_metadata'->>'chantier'
);
DROP POLICY IF EXISTS "Admin DAF CTR read rapports" ON rapports_chantier;
CREATE POLICY "Admin DAF CTR read rapports" ON rapports_chantier
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf', 'controleur', 'rh')
);

-- controles_inopines : controleur gère ses contrôles, admin lit tout
DROP POLICY IF EXISTS allow_all_controles_inopines ON controles_inopines;
DROP POLICY IF EXISTS "Controleur manage controles" ON controles_inopines;
CREATE POLICY "Controleur manage controles" ON controles_inopines
FOR ALL USING (
    auth.jwt()->'user_metadata'->>'role' = 'controleur'
) WITH CHECK (
    auth.jwt()->'user_metadata'->>'role' = 'controleur'
);
DROP POLICY IF EXISTS "Admin read all controles" ON controles_inopines;
CREATE POLICY "Admin read all controles" ON controles_inopines
FOR SELECT USING (
    auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf')
);

-- gantt_taches : politiques granulaires dans FIX_RLS_ALL_TABLES.sql
DROP POLICY IF EXISTS allow_all_gantt_taches ON gantt_taches;

-- 6. Vue corrigee (date_ecriture au lieu de date)
CREATE OR REPLACE VIEW v_depenses_par_mois AS
SELECT
    DATE_TRUNC('month', date) AS mois,
    SUM(montant) AS total
FROM journal
WHERE date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY 1
ORDER BY 1;
