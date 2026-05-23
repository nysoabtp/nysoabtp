-- ============================================================
-- NYSOA BTP — Script de création des tables Supabase
-- À exécuter dans : Supabase → SQL Editor → New Query
-- ============================================================

-- 1. TABLE CHANTIERS
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

-- 2. TABLE JOURNAL (comptabilité)
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

-- 3. TABLE COMMANDES (achats)
CREATE TABLE IF NOT EXISTS commandes (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE,
    chantier      TEXT,
    libelle       TEXT NOT NULL,
    quantite      NUMERIC(10,3) DEFAULT 1,
    prix          NUMERIC(15,2) DEFAULT 0,
    prix_unitaire NUMERIC(15,2),  -- alias pour compatibilité
    fournisseur   TEXT,
    mode_paiement TEXT,
    statut        TEXT DEFAULT 'EN ATTENTE',  -- EN ATTENTE | OK | NOK
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE PERSONNEL
CREATE TABLE IF NOT EXISTS personnel (
    id                 BIGSERIAL PRIMARY KEY,
    nom                TEXT NOT NULL,
    metier             TEXT,
    chantier           TEXT,
    salaire_journalier NUMERIC(15,2) DEFAULT 0,
    type_salaire       TEXT DEFAULT 'JOURNALIER',  -- JOURNALIER | MENSUEL
    actif              BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE POINTAGE
CREATE TABLE IF NOT EXISTS pointage (
    id                 BIGSERIAL PRIMARY KEY,
    semaine_du         DATE,
    chantier           TEXT,
    nom_employe        TEXT NOT NULL,
    salaire_journalier NUMERIC(15,2) DEFAULT 0,
    nb_jours           NUMERIC(4,1) DEFAULT 0,
    total_avances      NUMERIC(15,2) DEFAULT 0,
    a_payer            NUMERIC(15,2) DEFAULT 0,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE MATERIELS (logistique)
CREATE TABLE IF NOT EXISTS materiels (
    id              BIGSERIAL PRIMARY KEY,
    libelle         TEXT NOT NULL,
    etat            TEXT DEFAULT 'EN MARCHE',  -- EN MARCHE | EN PANNE | BON
    quantite        NUMERIC(10,2) DEFAULT 0,
    chantier_actuel TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DONNÉES DE BASE (chantiers de la feuille BASE)
-- ============================================================
INSERT INTO chantiers (code, nom, statut) VALUES
    ('CH-001', 'TRANO CHEF',      'EN COURS'),
    ('CH-002', 'AMBATOMAINTY',    'EN COURS'),
    ('CH-003', 'AINA & DOMOINA',  'EN COURS'),
    ('CH-004', 'VAHATRA',         'EN COURS'),
    ('CH-005', 'GASTRO AMBOHIMENA', 'EN COURS'),
    ('CH-006', 'BRICOTECH MAGASIN', 'EN COURS'),
    ('DEPOT',  'DEPOT',           'EN COURS')
ON CONFLICT DO NOTHING;

-- ============================================================
-- POLITIQUES RLS (sécurité : accès lecture/écriture libre)
-- ============================================================
ALTER TABLE chantiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal    ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage   ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiels  ENABLE ROW LEVEL SECURITY;

-- Politique "accès total" pour la clé anon (appli web sans auth)
CREATE POLICY "allow_all_chantiers"  ON chantiers  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_journal"    ON journal    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_commandes"  ON commandes  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_personnel"  ON personnel  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_pointage"   ON pointage   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_materiels"  ON materiels  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- VUE pour le graphique dashboard (optionnel)
-- ============================================================
CREATE OR REPLACE VIEW v_depenses_par_mois AS
SELECT
    DATE_TRUNC('month', date) AS mois,
    SUM(montant) AS total
FROM journal
WHERE date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY 1
ORDER BY 1;
