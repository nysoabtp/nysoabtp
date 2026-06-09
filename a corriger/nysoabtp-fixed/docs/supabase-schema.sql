-- NYSOA BTP — Schema Supabase v4
-- Exécuter dans Supabase Dashboard SQL Editor

-- ============================================================
-- NOUVELLES TABLES
-- ============================================================

-- Table validations (circuit Admin)
CREATE TABLE IF NOT EXISTS validations (
  id            BIGSERIAL PRIMARY KEY,
  type          TEXT NOT NULL,           -- 'demande_materiaux', 'ecriture_journal', 'creation_chef', etc.
  entite_id     BIGINT,                  -- ID de l'objet concerné
  emetteur_role TEXT NOT NULL,
  emetteur_id   TEXT,
  statut        TEXT DEFAULT 'EN_ATTENTE', -- EN_ATTENTE | APPROUVE | REJETE | ARCHIVE
  commentaire   TEXT,
  motif_rejet   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  decided_at    TIMESTAMPTZ,
  decided_by    TEXT
);

-- Table devis (DAF)
CREATE TABLE IF NOT EXISTS devis (
  id            BIGSERIAL PRIMARY KEY,
  reference     TEXT UNIQUE,               -- ex: DEV-2026-001
  type          TEXT DEFAULT 'DEVIS',      -- 'DEVIS' | 'PROFORMA'
  client        TEXT NOT NULL,
  objet         TEXT,
  montant_ht    NUMERIC(15,2) DEFAULT 0,
  tva           NUMERIC(5,2)  DEFAULT 20,
  montant_ttc   NUMERIC(15,2) DEFAULT 0,
  statut        TEXT DEFAULT 'BROUILLON',  -- BROUILLON|SOUMIS|APPROUVE|REJETE|ENVOYE|ACCEPTE|REFUSE
  created_by    TEXT,
  chantier_id   BIGINT REFERENCES chantiers(id),
  motif_rejet   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  validated_at  TIMESTAMPTZ
);

-- Lignes de devis
CREATE TABLE IF NOT EXISTS devis_lignes (
  id            BIGSERIAL PRIMARY KEY,
  devis_id      BIGINT REFERENCES devis(id) ON DELETE CASCADE,
  lot           TEXT,
  designation   TEXT NOT NULL,
  quantite      NUMERIC(10,3) DEFAULT 1,
  prix_unitaire NUMERIC(15,2) DEFAULT 0,
  total         NUMERIC(15,2) DEFAULT 0
);

-- Table budget_felana (DAF)
CREATE TABLE IF NOT EXISTS budget_felana (
  id             BIGSERIAL PRIMARY KEY,
  chantier_id    BIGINT REFERENCES chantiers(id),
  annee          INTEGER NOT NULL,
  poste          TEXT NOT NULL,            -- 'materiaux', 'main_oeuvre', 'equipements', 'divers'
  mois           INTEGER NOT NULL CHECK (mois BETWEEN 1 AND 12),
  montant_prevu  NUMERIC(15,2) DEFAULT 0,
  montant_reel   NUMERIC(15,2) DEFAULT 0,
  statut         TEXT DEFAULT 'BROUILLON', -- BROUILLON|SOUMIS|APPROUVE|ACTIF
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Table conges (manquante — bug I3)
CREATE TABLE IF NOT EXISTS conges (
  id           BIGSERIAL PRIMARY KEY,
  employe_id   BIGINT REFERENCES personnel(id),
  employe_nom  TEXT,
  type         TEXT,
  date_debut   DATE,
  date_fin     DATE,
  statut       TEXT DEFAULT 'EN_ATTENTE',  -- EN_ATTENTE|APPROUVE|REJETE
  valide_par   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODIFICATIONS DE TABLES EXISTANTES
-- ============================================================

-- Traçabilité devis → chantier (N3)
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS devis_id BIGINT REFERENCES devis(id);

-- Chef scopé + type salaire (N5 + I2)
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS chantier_id      BIGINT REFERENCES chantiers(id);
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS compte_actif     BOOLEAN DEFAULT FALSE;
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS statut_validation TEXT DEFAULT 'EN_ATTENTE';
ALTER TABLE personnel ADD COLUMN IF NOT EXISTS type_salaire     TEXT DEFAULT 'JOURNALIER'; -- JOURNALIER | MENSUEL

-- Import Felana (bug m4)
ALTER TABLE caisse ADD COLUMN IF NOT EXISTS solde_debut NUMERIC(15,2) DEFAULT 0;
ALTER TABLE caisse ADD COLUMN IF NOT EXISTS solde_fin   NUMERIC(15,2) DEFAULT 0;

-- ============================================================
-- POLITIQUES RLS — sécurité minimale
-- ============================================================

-- Activer RLS sur toutes les tables
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_felana ENABLE ROW LEVEL SECURITY;
ALTER TABLE conges ENABLE ROW LEVEL SECURITY;

-- Politiques de base (à adapter selon les rôles)
DROP POLICY IF EXISTS "authenticated_select" ON validations;
DROP POLICY IF EXISTS "authenticated_insert" ON validations;
DROP POLICY IF EXISTS "admin_update_validations" ON validations;
DROP POLICY IF EXISTS "daf_devis" ON devis;
DROP POLICY IF EXISTS "scoped_select" ON budget_felana;

CREATE POLICY "authenticated_select" ON validations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_insert" ON validations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "admin_update_validations" ON validations FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "daf_devis" ON devis FOR ALL USING (
  auth.jwt() ->> 'role' IN ('admin', 'daf')
);

CREATE POLICY "scoped_select" ON budget_felana FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin'
  OR chantier_id IN (
    SELECT chantier_id FROM personnel WHERE email = auth.email()
  )
);
