-- ============================================================
-- NYSOA BTP — MIGRATION_NOUVELLES_TABLES.sql
-- Tables manquantes identifiées lors de l'audit 09/06/2026
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- ══ 1. interventions (technicien.html — C4) ════════════════
CREATE TABLE IF NOT EXISTS interventions (
    id          BIGSERIAL PRIMARY KEY,
    chantier    TEXT REFERENCES chantiers(nom) ON DELETE SET NULL,
    titre       TEXT NOT NULL,
    description TEXT,
    statut      TEXT DEFAULT 'EN COURS'
                    CHECK (statut IN ('EN COURS', 'SUSPENDU', 'TERMINÉ')),
    priorite    TEXT DEFAULT 'NORMALE'
                    CHECK (priorite IN ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE')),
    date_debut  DATE,
    date_fin    DATE,
    technicien  TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Technicien read own interventions" ON interventions
    FOR SELECT USING (
        auth.jwt()->'user_metadata'->>'role' IN ('technicien', 'admin', 'chef')
    );

CREATE POLICY "Technicien insert interventions" ON interventions
    FOR INSERT WITH CHECK (
        auth.jwt()->'user_metadata'->>'role' IN ('technicien', 'admin')
    );

CREATE POLICY "Technicien update own interventions" ON interventions
    FOR UPDATE USING (
        auth.jwt()->'user_metadata'->>'role' IN ('technicien', 'admin')
    );

-- ══ 2. formations (rh.html — M5) ══════════════════════════
CREATE TABLE IF NOT EXISTS formations (
    id           BIGSERIAL PRIMARY KEY,
    formation    TEXT NOT NULL,
    participants TEXT,
    date         DATE,
    duree        TEXT,
    formateur    TEXT,
    statut       TEXT DEFAULT 'Planifiée'
                     CHECK (statut IN ('Planifiée', 'En cours', 'Terminée', 'Annulée')),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE formations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH Admin read formations" ON formations
    FOR SELECT USING (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

CREATE POLICY "RH insert formations" ON formations
    FOR INSERT WITH CHECK (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

CREATE POLICY "RH update formations" ON formations
    FOR UPDATE USING (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

-- ══ 3. offres_emploi (rh.html — M5) ═══════════════════════
CREATE TABLE IF NOT EXISTS offres_emploi (
    id          BIGSERIAL PRIMARY KEY,
    poste       TEXT NOT NULL,
    description TEXT,
    statut      TEXT DEFAULT 'Ouverte'
                    CHECK (statut IN ('Ouverte', 'Fermée', 'Pourvue')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offres_emploi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH Admin manage offres" ON offres_emploi
    FOR SELECT USING (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

CREATE POLICY "RH insert offres" ON offres_emploi
    FOR INSERT WITH CHECK (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

CREATE POLICY "RH update offres" ON offres_emploi
    FOR UPDATE USING (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

-- ══ 4. candidatures (rh.html — M5) ═══════════════════════
CREATE TABLE IF NOT EXISTS candidatures (
    id              BIGSERIAL PRIMARY KEY,
    offre_id        BIGINT REFERENCES offres_emploi(id) ON DELETE SET NULL,
    nom_candidat    TEXT NOT NULL,
    contact         TEXT,
    statut          TEXT DEFAULT 'Reçue'
                        CHECK (statut IN ('Reçue', 'En cours d''examen', 'Retenue', 'Refusée')),
    date_candidature DATE DEFAULT CURRENT_DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE candidatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RH Admin read candidatures" ON candidatures
    FOR SELECT USING (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

CREATE POLICY "RH insert candidatures" ON candidatures
    FOR INSERT WITH CHECK (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

CREATE POLICY "RH update candidatures" ON candidatures
    FOR UPDATE USING (
        auth.jwt()->'user_metadata'->>'role' IN ('rh', 'admin')
    );

-- ══ 5. planning_tasks (chef-chantier — M5) ════════════════
CREATE TABLE IF NOT EXISTS planning_tasks (
    id          BIGSERIAL PRIMARY KEY,
    chantier    TEXT REFERENCES chantiers(nom) ON DELETE CASCADE,
    titre       TEXT NOT NULL,
    date_debut  DATE,
    date_fin    DATE,
    statut      TEXT DEFAULT 'A FAIRE'
                    CHECK (statut IN ('A FAIRE', 'EN COURS', 'TERMINÉ', 'BLOQUÉ')),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE planning_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef read own planning" ON planning_tasks
    FOR SELECT USING (
        auth.jwt()->'user_metadata'->>'role' = 'chef'
        AND auth.jwt()->'user_metadata'->>'chantier' IS NOT NULL
        AND chantier = auth.jwt()->'user_metadata'->>'chantier'
    );

CREATE POLICY "Chef insert own planning" ON planning_tasks
    FOR INSERT WITH CHECK (
        auth.jwt()->'user_metadata'->>'role' = 'chef'
        AND chantier = auth.jwt()->'user_metadata'->>'chantier'
    );

CREATE POLICY "Chef update own planning" ON planning_tasks
    FOR UPDATE USING (
        auth.jwt()->'user_metadata'->>'role' = 'chef'
        AND chantier = auth.jwt()->'user_metadata'->>'chantier'
    );

CREATE POLICY "Admin read all planning" ON planning_tasks
    FOR SELECT USING (
        auth.jwt()->'user_metadata'->>'role' IN ('admin', 'daf')
    );

-- ══ 6. Contrainte UNIQUE sur chantiers.nom (M4) ═══════════
-- Identifier les doublons avant d'exécuter :
-- SELECT nom, COUNT(*) FROM chantiers GROUP BY nom HAVING COUNT(*) > 1;
-- Fusionner manuellement les données des doublons, PUIS :
-- ALTER TABLE chantiers ADD CONSTRAINT chantiers_nom_unique UNIQUE (nom);

-- ══ Vérification finale ═══════════════════════════════════
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('interventions','formations','offres_emploi','candidatures','planning_tasks')
ORDER BY tablename, policyname;
