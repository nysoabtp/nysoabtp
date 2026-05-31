-- ============================================================
-- NYSOA BTP — Script de création des tables Supabase
-- VERSION CONSOLIDÉE (unique source de vérité)
-- À exécuter dans : Supabase → SQL Editor → New Query
-- ------------------------------------------------------------
-- ⚠️  FICHIER UNIQUE AUTORISÉ
--     L'ancien fichier supabase_schema.sql a été supprimé.
--     Il définissait des colonnes incompatibles (date_ecriture,
--     debit, credit, matricule…) qui faisaient échouer toutes
--     les requêtes du code JS. NE PAS le recréer ni l'exécuter.
--     Ce fichier est la seule source de vérité pour le schéma.
-- ============================================================

-- ============================================================
-- 1. TABLE CHANTIERS
-- ============================================================
CREATE TABLE IF NOT EXISTS chantiers (
    id          BIGSERIAL PRIMARY KEY,
    code        TEXT,
    nom         TEXT NOT NULL,
    client      TEXT,
    budget      NUMERIC(15,2),
    debut       DATE,
    fin         DATE,
    progression INTEGER DEFAULT 0,
    statut      TEXT DEFAULT 'EN COURS',  -- EN COURS | TERMINE | EN PAUSE
    actif       BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. TABLE JOURNAL (comptabilité)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE NOT NULL,
    chantier      TEXT,
    designation   TEXT NOT NULL,
    montant       NUMERIC(15,2) DEFAULT 0,
    mode_paiement TEXT,   -- ESPECE | CHEQUE | MOBILE MONEY | VIREMENT
    categorie     TEXT,   -- APPROVISIONNEMENT | SALAIRE JOURNALIER | RECETTE | etc.
    travaux       TEXT,   -- MAÇONNERIE | CARRELAGE | PLOMBERIE | etc.
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TABLE COMMANDES (achats)
-- ============================================================
CREATE TABLE IF NOT EXISTS commandes (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE,
    chantier      TEXT,
    libelle       TEXT NOT NULL,
    quantite      NUMERIC(10,3) DEFAULT 1,
    prix          NUMERIC(15,2) DEFAULT 0,
    fournisseur   TEXT,
    mode_paiement TEXT,
    statut        TEXT DEFAULT 'EN ATTENTE',  -- EN ATTENTE | OK | NOK
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TABLE PERSONNEL
-- ============================================================
CREATE TABLE IF NOT EXISTS personnel (
    id                  BIGSERIAL PRIMARY KEY,
    nom                 TEXT NOT NULL,
    metier              TEXT,
    chantier            TEXT,
    salaire_journalier  NUMERIC(15,2) DEFAULT 0,
    type_salaire        TEXT DEFAULT 'JOURNALIER',  -- JOURNALIER | MENSUEL
    actif               BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. TABLE POINTAGE
-- ============================================================
CREATE TABLE IF NOT EXISTS pointage (
    id                  BIGSERIAL PRIMARY KEY,
    semaine_du          DATE,
    chantier            TEXT,
    nom_employe         TEXT NOT NULL,
    salaire_journalier  NUMERIC(15,2) DEFAULT 0,
    nb_jours            NUMERIC(4,1) DEFAULT 0,
    total_avances       NUMERIC(15,2) DEFAULT 0,
    a_payer             NUMERIC(15,2) DEFAULT 0,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. TABLE MATERIELS (logistique)
-- ============================================================
CREATE TABLE IF NOT EXISTS materiels (
    id              BIGSERIAL PRIMARY KEY,
    libelle         TEXT NOT NULL,
    etat            TEXT DEFAULT 'EN MARCHE',  -- EN MARCHE | EN PANNE | BON
    quantite        NUMERIC(10,2) DEFAULT 0,
    chantier_actuel TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. TABLE DEVIS
-- ============================================================
CREATE TABLE IF NOT EXISTS devis (
    id           BIGSERIAL PRIMARY KEY,
    numero       TEXT UNIQUE NOT NULL,
    client       TEXT NOT NULL,
    lieu         TEXT,
    contact      TEXT,
    objet        TEXT,
    date_devis   DATE NOT NULL,
    tva          NUMERIC(5,2) DEFAULT 0,
    montant_ht   NUMERIC(15,2) DEFAULT 0,
    montant_ttc  NUMERIC(15,2) DEFAULT 0,
    statut       TEXT DEFAULT 'BROUILLON',  -- BROUILLON | ENVOYE | ACCEPTE | REFUSE
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. TABLE DEVIS_LOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS devis_lots (
    id        BIGSERIAL PRIMARY KEY,
    devis_id  BIGINT NOT NULL REFERENCES devis(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL,
    num       TEXT NOT NULL,
    titre     TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. TABLE DEVIS_LIGNES
-- ============================================================
CREATE TABLE IF NOT EXISTS devis_lignes (
    id            BIGSERIAL PRIMARY KEY,
    devis_lot_id  BIGINT NOT NULL REFERENCES devis_lots(id) ON DELETE CASCADE,
    ref           TEXT NOT NULL,
    designation   TEXT NOT NULL,
    unite         TEXT,
    quantite      NUMERIC(10,2) DEFAULT 1,
    prix_unitaire NUMERIC(15,2) DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. TABLE ANTOKA (avances sur salaire)
-- Colonnes alignées sur modules_new.js : employe, chantier,
-- montant_depart, montant_paye, reste, date, motif
-- ============================================================
CREATE TABLE IF NOT EXISTS antoka (
    id             BIGSERIAL PRIMARY KEY,
    employe        TEXT NOT NULL,
    chantier       TEXT,
    montant_depart NUMERIC(15,2) NOT NULL,
    montant_paye   NUMERIC(15,2) DEFAULT 0,
    reste          NUMERIC(15,2) NOT NULL,
    date           DATE NOT NULL,
    motif          TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. TABLE CREDITS_FOURNISSEURS
-- Colonnes alignées sur modules_new.js : fournisseur,
-- montant_total, date1, montant1, reste1
-- ============================================================
CREATE TABLE IF NOT EXISTS credits_fournisseurs (
    id            BIGSERIAL PRIMARY KEY,
    fournisseur   TEXT NOT NULL,
    montant_total NUMERIC(15,2) NOT NULL,
    date1         DATE,
    montant1      NUMERIC(15,2) DEFAULT 0,
    reste1        NUMERIC(15,2) DEFAULT 0,
    statut        TEXT DEFAULT 'EN COURS',  -- EN COURS | REGLE | ANNULE
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. TABLE CAISSE
-- Colonnes alignées sur modules_new.js : date, designation,
-- montant, solde_debut, solde_fin
-- ============================================================
CREATE TABLE IF NOT EXISTS caisse (
    id           BIGSERIAL PRIMARY KEY,
    date         DATE NOT NULL,
    designation  TEXT NOT NULL,
    montant      NUMERIC(15,2) NOT NULL,
    solde_debut  NUMERIC(15,2) DEFAULT 0,
    solde_fin    NUMERIC(15,2) DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. TABLE CATALOGUE_PRIX
-- Colonnes alignées sur modules_new.js : designation,
-- prix_unitaire, unite, fournisseur
-- ============================================================
CREATE TABLE IF NOT EXISTS catalogue_prix (
    id            BIGSERIAL PRIMARY KEY,
    designation   TEXT NOT NULL,
    prix_unitaire NUMERIC(15,2) NOT NULL,
    unite         TEXT,
    fournisseur   TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. TABLE CONTRATS
-- Nom aligné sur modules_new.js ('contrats', pas 'contrats_prestataires')
-- Colonnes : designation, prestataire, chantier, prix_convenu,
-- date_debut, date_fin_prevue, statut
-- ============================================================
CREATE TABLE IF NOT EXISTS contrats (
    id              BIGSERIAL PRIMARY KEY,
    designation     TEXT NOT NULL,
    prestataire     TEXT NOT NULL,
    chantier        TEXT,
    prix_convenu    NUMERIC(15,2),
    date_debut      DATE,
    date_fin_prevue DATE,
    date_fin        DATE,
    statut          TEXT DEFAULT 'EN COURS',  -- EN COURS | TERMINE | RESILIE
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 15. TABLE CONTROLES_INOPINES
-- Colonnes alignées sur admin.html : datetime, chantier,
-- controleur, chef_present, score, resultats (JSON)
-- ============================================================
CREATE TABLE IF NOT EXISTS controles_inopines (
    id            BIGSERIAL PRIMARY KEY,
    datetime      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chantier      TEXT NOT NULL,
    controleur    TEXT,
    chef_present  TEXT DEFAULT 'non',  -- oui | non
    score         INTEGER DEFAULT 0,   -- 0–100
    resultats     JSONB,               -- { categorie: [{item, resultat, note}] }
    observations  TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DONNÉES DE BASE (chantiers initiaux)
-- ============================================================
INSERT INTO chantiers (code, nom, statut) VALUES
    ('CH-001', 'TRANO CHEF',        'EN COURS'),
    ('CH-002', 'AMBATOMAINTY',      'EN COURS'),
    ('CH-003', 'AINA & DOMOINA',    'EN COURS'),
    ('CH-004', 'VAHATRA',           'EN COURS'),
    ('CH-005', 'GASTRO AMBOHIMENA', 'EN COURS'),
    ('CH-006', 'BRICOTECH MAGASIN', 'EN COURS'),
    ('DEPOT',  'DEPOT',             'EN COURS')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 16. TABLE STOCK_ARTICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_articles (
    id            BIGSERIAL PRIMARY KEY,
    ref           TEXT UNIQUE NOT NULL,
    nom           TEXT NOT NULL,
    categorie     TEXT DEFAULT 'Matériaux',  -- Matériaux | Outillage | Équipement | Consommable
    emplacement   TEXT,
    quantite      NUMERIC(12,3) DEFAULT 0,
    unite         TEXT,
    prix_unitaire NUMERIC(15,2) DEFAULT 0,
    seuil_alerte  NUMERIC(12,3) DEFAULT 0,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 17. TABLE STOCK_MOUVEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_mouvements (
    id                  BIGSERIAL PRIMARY KEY,
    date                DATE NOT NULL DEFAULT CURRENT_DATE,
    type                TEXT NOT NULL,  -- Entrée | Sortie | Transfert
    article_ref         TEXT NOT NULL REFERENCES stock_articles(ref) ON DELETE RESTRICT,
    nom_article         TEXT NOT NULL,
    quantite            NUMERIC(12,3) NOT NULL,
    emplacement_source  TEXT,
    emplacement_dest    TEXT,
    chantier            TEXT,
    motif               TEXT,
    saisi_par           TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 18. TABLE STOCK_AFFECTATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS stock_affectations (
    id            BIGSERIAL PRIMARY KEY,
    article_ref   TEXT NOT NULL REFERENCES stock_articles(ref) ON DELETE RESTRICT,
    nom_article   TEXT NOT NULL,
    unite         TEXT,
    quantite      NUMERIC(12,3) NOT NULL,
    date_prevue   DATE NOT NULL,
    chantier      TEXT NOT NULL,
    responsable   TEXT,
    notes         TEXT,
    statut        TEXT DEFAULT 'Planifié',  -- Planifié | Réalisé | Annulé
    date_creation DATE DEFAULT CURRENT_DATE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEX (performances)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_journal_date       ON journal(date);
CREATE INDEX IF NOT EXISTS idx_journal_chantier   ON journal(chantier);
CREATE INDEX IF NOT EXISTS idx_commandes_date     ON commandes(date);
CREATE INDEX IF NOT EXISTS idx_commandes_chantier ON commandes(chantier);
CREATE INDEX IF NOT EXISTS idx_personnel_actif    ON personnel(actif);
CREATE INDEX IF NOT EXISTS idx_pointage_semaine   ON pointage(semaine_du);
CREATE INDEX IF NOT EXISTS idx_devis_statut       ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_antoka_employe     ON antoka(employe);
CREATE INDEX IF NOT EXISTS idx_caisse_date        ON caisse(date);
CREATE INDEX IF NOT EXISTS idx_controles_datetime ON controles_inopines(datetime);
CREATE INDEX IF NOT EXISTS idx_controles_chantier ON controles_inopines(chantier);
CREATE INDEX IF NOT EXISTS idx_stock_articles_ref  ON stock_articles(ref);
CREATE INDEX IF NOT EXISTS idx_stock_mvt_article   ON stock_mouvements(article_ref);
CREATE INDEX IF NOT EXISTS idx_stock_mvt_date      ON stock_mouvements(date);
CREATE INDEX IF NOT EXISTS idx_stock_aff_article   ON stock_affectations(article_ref);
CREATE INDEX IF NOT EXISTS idx_stock_aff_statut    ON stock_affectations(statut);

-- ============================================================
-- RLS — Row Level Security (politiques granulaires par rôle)
-- Le rôle est lu depuis : auth.jwt() -> 'user_metadata' ->> 'role'
-- Rôles : admin | daf | chef | rh | controleur | technicien
--
-- HELPER : raccourci pour lire le rôle du JWT courant
-- ============================================================

CREATE OR REPLACE FUNCTION current_role_nysoa()
RETURNS TEXT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  );
$$;

-- ── Activer RLS sur toutes les tables ────────────────────────
ALTER TABLE chantiers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal               ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage              ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lignes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE antoka                ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_fournisseurs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE caisse                ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue_prix        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE controles_inopines    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_articles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mouvements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_affectations    ENABLE ROW LEVEL SECURITY;

-- ── Supprimer les anciennes politiques "allow_all" si elles existent ──
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies
           WHERE schemaname = 'public' AND policyname LIKE 'allow_all_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- CHANTIERS
-- Lecture : tous les rôles authentifiés
-- Écriture : admin, chef
-- ============================================================
CREATE POLICY "chantiers_select" ON chantiers FOR SELECT
  USING (current_role_nysoa() IN ('admin','daf','chef','rh','controleur','technicien'));

CREATE POLICY "chantiers_insert" ON chantiers FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','chef'));

CREATE POLICY "chantiers_update" ON chantiers FOR UPDATE
  USING (current_role_nysoa() IN ('admin','chef'))
  WITH CHECK (current_role_nysoa() IN ('admin','chef'));

CREATE POLICY "chantiers_delete" ON chantiers FOR DELETE
  USING (current_role_nysoa() = 'admin');

-- ============================================================
-- JOURNAL (comptabilité)
-- Lecture : admin, daf, controleur
-- Écriture : admin, daf
-- ============================================================
CREATE POLICY "journal_select" ON journal FOR SELECT
  USING (current_role_nysoa() IN ('admin','daf','controleur'));

CREATE POLICY "journal_insert" ON journal FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','daf'));

CREATE POLICY "journal_update" ON journal FOR UPDATE
  USING (current_role_nysoa() IN ('admin','daf'))
  WITH CHECK (current_role_nysoa() IN ('admin','daf'));

CREATE POLICY "journal_delete" ON journal FOR DELETE
  USING (current_role_nysoa() = 'admin');

-- ============================================================
-- COMMANDES / ACHATS
-- Lecture : admin, daf, chef, controleur
-- Écriture : admin, daf, chef
-- ============================================================
CREATE POLICY "commandes_select" ON commandes FOR SELECT
  USING (current_role_nysoa() IN ('admin','daf','chef','controleur'));

CREATE POLICY "commandes_insert" ON commandes FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));

CREATE POLICY "commandes_update" ON commandes FOR UPDATE
  USING (current_role_nysoa() IN ('admin','daf','chef'))
  WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));

CREATE POLICY "commandes_delete" ON commandes FOR DELETE
  USING (current_role_nysoa() IN ('admin','daf'));

-- ============================================================
-- PERSONNEL
-- Lecture : admin, rh, chef, controleur
-- Écriture : admin, rh
-- ============================================================
CREATE POLICY "personnel_select" ON personnel FOR SELECT
  USING (current_role_nysoa() IN ('admin','rh','chef','controleur'));

CREATE POLICY "personnel_insert" ON personnel FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','rh'));

CREATE POLICY "personnel_update" ON personnel FOR UPDATE
  USING (current_role_nysoa() IN ('admin','rh'))
  WITH CHECK (current_role_nysoa() IN ('admin','rh'));

CREATE POLICY "personnel_delete" ON personnel FOR DELETE
  USING (current_role_nysoa() = 'admin');

-- ============================================================
-- POINTAGE
-- Lecture : admin, rh, chef, controleur
-- Écriture : admin, rh, chef
-- ============================================================
CREATE POLICY "pointage_select" ON pointage FOR SELECT
  USING (current_role_nysoa() IN ('admin','rh','chef','controleur'));

CREATE POLICY "pointage_insert" ON pointage FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','rh','chef'));

CREATE POLICY "pointage_update" ON pointage FOR UPDATE
  USING (current_role_nysoa() IN ('admin','rh','chef'))
  WITH CHECK (current_role_nysoa() IN ('admin','rh','chef'));

CREATE POLICY "pointage_delete" ON pointage FOR DELETE
  USING (current_role_nysoa() IN ('admin','rh'));

-- ============================================================
-- MATERIELS
-- Lecture : admin, chef, technicien, controleur
-- Écriture : admin, chef, technicien
-- ============================================================
CREATE POLICY "materiels_select" ON materiels FOR SELECT
  USING (current_role_nysoa() IN ('admin','chef','technicien','controleur'));

CREATE POLICY "materiels_insert" ON materiels FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','chef','technicien'));

CREATE POLICY "materiels_update" ON materiels FOR UPDATE
  USING (current_role_nysoa() IN ('admin','chef','technicien'))
  WITH CHECK (current_role_nysoa() IN ('admin','chef','technicien'));

CREATE POLICY "materiels_delete" ON materiels FOR DELETE
  USING (current_role_nysoa() IN ('admin','chef'));

-- ============================================================
-- DEVIS + LOTS + LIGNES
-- Lecture : admin, daf, chef, controleur
-- Écriture : admin, daf, chef
-- ============================================================
CREATE POLICY "devis_select"       ON devis       FOR SELECT USING (current_role_nysoa() IN ('admin','daf','chef','controleur'));
CREATE POLICY "devis_insert"       ON devis       FOR INSERT WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));
CREATE POLICY "devis_update"       ON devis       FOR UPDATE USING (current_role_nysoa() IN ('admin','daf','chef')) WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));
CREATE POLICY "devis_delete"       ON devis       FOR DELETE USING (current_role_nysoa() IN ('admin','daf'));

CREATE POLICY "devis_lots_select"  ON devis_lots  FOR SELECT USING (current_role_nysoa() IN ('admin','daf','chef','controleur'));
CREATE POLICY "devis_lots_insert"  ON devis_lots  FOR INSERT WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));
CREATE POLICY "devis_lots_update"  ON devis_lots  FOR UPDATE USING (current_role_nysoa() IN ('admin','daf','chef')) WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));
CREATE POLICY "devis_lots_delete"  ON devis_lots  FOR DELETE USING (current_role_nysoa() IN ('admin','daf'));

CREATE POLICY "devis_lignes_select" ON devis_lignes FOR SELECT USING (current_role_nysoa() IN ('admin','daf','chef','controleur'));
CREATE POLICY "devis_lignes_insert" ON devis_lignes FOR INSERT WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));
CREATE POLICY "devis_lignes_update" ON devis_lignes FOR UPDATE USING (current_role_nysoa() IN ('admin','daf','chef')) WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));
CREATE POLICY "devis_lignes_delete" ON devis_lignes FOR DELETE USING (current_role_nysoa() IN ('admin','daf'));

-- ============================================================
-- ANTOKA (avances sur salaire)
-- Lecture : admin, rh, daf
-- Écriture : admin, rh
-- ============================================================
CREATE POLICY "antoka_select" ON antoka FOR SELECT
  USING (current_role_nysoa() IN ('admin','rh','daf'));

CREATE POLICY "antoka_insert" ON antoka FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','rh'));

CREATE POLICY "antoka_update" ON antoka FOR UPDATE
  USING (current_role_nysoa() IN ('admin','rh'))
  WITH CHECK (current_role_nysoa() IN ('admin','rh'));

CREATE POLICY "antoka_delete" ON antoka FOR DELETE
  USING (current_role_nysoa() = 'admin');

-- ============================================================
-- CREDITS FOURNISSEURS
-- Lecture : admin, daf, controleur
-- Écriture : admin, daf
-- ============================================================
CREATE POLICY "credits_select" ON credits_fournisseurs FOR SELECT
  USING (current_role_nysoa() IN ('admin','daf','controleur'));

CREATE POLICY "credits_insert" ON credits_fournisseurs FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','daf'));

CREATE POLICY "credits_update" ON credits_fournisseurs FOR UPDATE
  USING (current_role_nysoa() IN ('admin','daf'))
  WITH CHECK (current_role_nysoa() IN ('admin','daf'));

CREATE POLICY "credits_delete" ON credits_fournisseurs FOR DELETE
  USING (current_role_nysoa() = 'admin');

-- ============================================================
-- CAISSE
-- Lecture : admin, daf, controleur
-- Écriture : admin, daf
-- ============================================================
CREATE POLICY "caisse_select" ON caisse FOR SELECT
  USING (current_role_nysoa() IN ('admin','daf','controleur'));

CREATE POLICY "caisse_insert" ON caisse FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','daf'));

CREATE POLICY "caisse_update" ON caisse FOR UPDATE
  USING (current_role_nysoa() IN ('admin','daf'))
  WITH CHECK (current_role_nysoa() IN ('admin','daf'));

CREATE POLICY "caisse_delete" ON caisse FOR DELETE
  USING (current_role_nysoa() = 'admin');

-- ============================================================
-- CATALOGUE PRIX
-- Lecture : tous les rôles authentifiés
-- Écriture : admin, daf, chef
-- ============================================================
CREATE POLICY "catalogue_select" ON catalogue_prix FOR SELECT
  USING (current_role_nysoa() IN ('admin','daf','chef','rh','controleur','technicien'));

CREATE POLICY "catalogue_insert" ON catalogue_prix FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));

CREATE POLICY "catalogue_update" ON catalogue_prix FOR UPDATE
  USING (current_role_nysoa() IN ('admin','daf','chef'))
  WITH CHECK (current_role_nysoa() IN ('admin','daf','chef'));

CREATE POLICY "catalogue_delete" ON catalogue_prix FOR DELETE
  USING (current_role_nysoa() IN ('admin','daf'));

-- ============================================================
-- CONTRATS
-- Lecture : admin, rh, daf, chef
-- Écriture : admin, rh
-- ============================================================
CREATE POLICY "contrats_select" ON contrats FOR SELECT
  USING (current_role_nysoa() IN ('admin','rh','daf','chef'));

CREATE POLICY "contrats_insert" ON contrats FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','rh'));

CREATE POLICY "contrats_update" ON contrats FOR UPDATE
  USING (current_role_nysoa() IN ('admin','rh'))
  WITH CHECK (current_role_nysoa() IN ('admin','rh'));

CREATE POLICY "contrats_delete" ON contrats FOR DELETE
  USING (current_role_nysoa() = 'admin');

-- ============================================================
-- CONTROLES INOPINES
-- Lecture : admin, controleur, chef
-- Écriture : admin, controleur
-- ============================================================
CREATE POLICY "controles_select" ON controles_inopines FOR SELECT
  USING (current_role_nysoa() IN ('admin','controleur','chef'));

CREATE POLICY "controles_insert" ON controles_inopines FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','controleur'));

CREATE POLICY "controles_update" ON controles_inopines FOR UPDATE
  USING (current_role_nysoa() IN ('admin','controleur'))
  WITH CHECK (current_role_nysoa() IN ('admin','controleur'));

CREATE POLICY "controles_delete" ON controles_inopines FOR DELETE
  USING (current_role_nysoa() = 'admin');

-- ============================================================
-- STOCK (articles, mouvements, affectations)
-- Lecture : admin, chef, technicien, controleur
-- Écriture : admin, chef, technicien
-- ============================================================
CREATE POLICY "stock_articles_select" ON stock_articles FOR SELECT
  USING (current_role_nysoa() IN ('admin','chef','technicien','controleur'));

CREATE POLICY "stock_articles_insert" ON stock_articles FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','chef','technicien'));

CREATE POLICY "stock_articles_update" ON stock_articles FOR UPDATE
  USING (current_role_nysoa() IN ('admin','chef','technicien'))
  WITH CHECK (current_role_nysoa() IN ('admin','chef','technicien'));

CREATE POLICY "stock_articles_delete" ON stock_articles FOR DELETE
  USING (current_role_nysoa() IN ('admin','chef'));

CREATE POLICY "stock_mouvements_select" ON stock_mouvements FOR SELECT
  USING (current_role_nysoa() IN ('admin','chef','technicien','controleur'));

CREATE POLICY "stock_mouvements_insert" ON stock_mouvements FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','chef','technicien'));

CREATE POLICY "stock_mouvements_update" ON stock_mouvements FOR UPDATE
  USING (current_role_nysoa() IN ('admin','chef','technicien'))
  WITH CHECK (current_role_nysoa() IN ('admin','chef','technicien'));

CREATE POLICY "stock_mouvements_delete" ON stock_mouvements FOR DELETE
  USING (current_role_nysoa() IN ('admin','chef'));

CREATE POLICY "stock_affectations_select" ON stock_affectations FOR SELECT
  USING (current_role_nysoa() IN ('admin','chef','technicien','controleur'));

CREATE POLICY "stock_affectations_insert" ON stock_affectations FOR INSERT
  WITH CHECK (current_role_nysoa() IN ('admin','chef','technicien'));

CREATE POLICY "stock_affectations_update" ON stock_affectations FOR UPDATE
  USING (current_role_nysoa() IN ('admin','chef','technicien'))
  WITH CHECK (current_role_nysoa() IN ('admin','chef','technicien'));

CREATE POLICY "stock_affectations_delete" ON stock_affectations FOR DELETE
  USING (current_role_nysoa() IN ('admin','chef'));

-- ============================================================
-- VUE dashboard : dépenses par mois
-- ============================================================
CREATE OR REPLACE VIEW v_depenses_par_mois AS
SELECT
    DATE_TRUNC('month', date) AS mois,
    SUM(montant)              AS total
FROM journal
WHERE date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY 1
ORDER BY 1;
