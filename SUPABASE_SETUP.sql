-- ============================================================
-- NYSOA BTP — Script de création des tables Supabase
-- À exécuter dans : Supabase → SQL Editor → New Query
-- ============================================================
-- Génère toutes les tables + politiques RLS + vues + données
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
    statut      TEXT DEFAULT 'EN COURS',
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
    mode_paiement TEXT,
    categorie     TEXT,
    travaux       TEXT,
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
    prix_unitaire NUMERIC(15,2),
    fournisseur   TEXT,
    mode_paiement TEXT,
    statut        TEXT DEFAULT 'EN ATTENTE',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE PERSONNEL
CREATE TABLE IF NOT EXISTS personnel (
    id                 BIGSERIAL PRIMARY KEY,
    nom                TEXT NOT NULL,
    metier             TEXT,
    chantier           TEXT,
    date_embauche      DATE,
    salaire_journalier NUMERIC(15,2) DEFAULT 0,
    type_salaire       TEXT DEFAULT 'JOURNALIER',
    actif              BOOLEAN DEFAULT TRUE,
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE POINTAGE
CREATE TABLE IF NOT EXISTS pointage (
    id                 BIGSERIAL PRIMARY KEY,
    date               DATE,
    chantier           TEXT,
    nom_employe        TEXT NOT NULL,
    type_pointage      TEXT DEFAULT 'Arrivée',
    salaire_journalier NUMERIC(15,2) DEFAULT 0,
    nb_jours           NUMERIC(4,1) DEFAULT 0,
    total_avances      NUMERIC(15,2) DEFAULT 0,
    a_payer            NUMERIC(15,2) DEFAULT 0,
    source             TEXT DEFAULT 'qr',
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABLE MATERIELS (logistique)
CREATE TABLE IF NOT EXISTS materiels (
    id              BIGSERIAL PRIMARY KEY,
    libelle         TEXT NOT NULL,
    etat            TEXT DEFAULT 'EN MARCHE',
    quantite        NUMERIC(10,2) DEFAULT 0,
    chantier_actuel TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABLE CAISSE
CREATE TABLE IF NOT EXISTS caisse (
    id            BIGSERIAL PRIMARY KEY,
    date          DATE NOT NULL,
    designation   TEXT NOT NULL,
    montant       NUMERIC(15,2) DEFAULT 0,
    type          TEXT NOT NULL DEFAULT 'sortie',
    solde_debut   NUMERIC(15,2) DEFAULT 0,
    solde_fin     NUMERIC(15,2) DEFAULT 0,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABLE ANTOKA (acomptes employés)
CREATE TABLE IF NOT EXISTS antoka (
    id              BIGSERIAL PRIMARY KEY,
    employe         TEXT NOT NULL,
    chantier        TEXT,
    montant_depart  NUMERIC(15,2) DEFAULT 0,
    montant_paye    NUMERIC(15,2) DEFAULT 0,
    reste           NUMERIC(15,2) DEFAULT 0,
    date            DATE,
    motif           TEXT,
    tranche1        NUMERIC(15,2) DEFAULT 0,
    date_tranche1   DATE,
    tranche2        NUMERIC(15,2) DEFAULT 0,
    date_tranche2   DATE,
    tranche3        NUMERIC(15,2) DEFAULT 0,
    date_tranche3   DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABLE CREDITS FOURNISSEURS
CREATE TABLE IF NOT EXISTS credits_fournisseurs (
    id              BIGSERIAL PRIMARY KEY,
    fournisseur     TEXT NOT NULL,
    montant_total   NUMERIC(15,2) DEFAULT 0,
    date1           DATE,
    montant1        NUMERIC(15,2) DEFAULT 0,
    reste1          NUMERIC(15,2) DEFAULT 0,
    date2           DATE,
    montant2        NUMERIC(15,2) DEFAULT 0,
    reste2          NUMERIC(15,2) DEFAULT 0,
    date3           DATE,
    montant3        NUMERIC(15,2) DEFAULT 0,
    reste3          NUMERIC(15,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABLE CATALOGUE PRIX
CREATE TABLE IF NOT EXISTS catalogue_prix (
    id              BIGSERIAL PRIMARY KEY,
    designation     TEXT NOT NULL,
    prix_unitaire   NUMERIC(15,2) DEFAULT 0,
    unite           TEXT DEFAULT 'unité',
    fournisseur     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABLE CONTRATS
CREATE TABLE IF NOT EXISTS contrats (
    id              BIGSERIAL PRIMARY KEY,
    reference       TEXT,
    client          TEXT NOT NULL,
    objet           TEXT,
    montant         NUMERIC(15,2) DEFAULT 0,
    date_debut      DATE,
    date_fin        DATE,
    statut          TEXT DEFAULT 'EN COURS',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABLE DEVIS
CREATE TABLE IF NOT EXISTS devis (
    id              BIGSERIAL PRIMARY KEY,
    reference       TEXT,
    client          TEXT NOT NULL,
    chantier        TEXT,
    montant_total   NUMERIC(15,2) DEFAULT 0,
    statut          TEXT DEFAULT 'EN ATTENTE',
    validite        DATE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABLE DEVIS LOTS
CREATE TABLE IF NOT EXISTS devis_lots (
    id              BIGSERIAL PRIMARY KEY,
    devis_id        BIGINT REFERENCES devis(id) ON DELETE CASCADE,
    designation     TEXT NOT NULL,
    quantite        NUMERIC(10,2) DEFAULT 1,
    prix_unitaire   NUMERIC(15,2) DEFAULT 0,
    total           NUMERIC(15,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TABLE DEVIS LIGNES (variante)
CREATE TABLE IF NOT EXISTS devis_lignes (
    id              BIGSERIAL PRIMARY KEY,
    devis_id        BIGINT REFERENCES devis(id) ON DELETE CASCADE,
    description     TEXT,
    quantite        NUMERIC(10,2) DEFAULT 1,
    prix_unitaire   NUMERIC(15,2) DEFAULT 0,
    total           NUMERIC(15,2) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DONNÉES DE BASE
-- ============================================================
INSERT INTO chantiers (code, nom, statut) VALUES
    ('CH-001', 'TRANO CHEF',            'EN COURS'),
    ('CH-002', 'AMBATOMAINTY',          'EN COURS'),
    ('CH-003', 'AINA & DOMOINA',        'EN COURS'),
    ('CH-004', 'VAHATRA',               'EN COURS'),
    ('CH-005', 'GASTRO AMBOHIMENA',     'EN COURS'),
    ('CH-006', 'BRICOTECH MAGASIN',     'EN COURS'),
    ('DEPOT',  'DEPOT',                 'EN COURS')
ON CONFLICT DO NOTHING;

-- ============================================================
-- POLITIQUES RLS (sécurité par table)
-- Lecture et écriture autorisées pour la clé anon
-- (authentification gérée côté app via localStorage)
-- ============================================================
ALTER TABLE chantiers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal               ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage              ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiels             ENABLE ROW LEVEL SECURITY;
ALTER TABLE caisse                ENABLE ROW LEVEL SECURITY;
ALTER TABLE antoka                ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_fournisseurs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue_prix        ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats              ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lots            ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis_lignes          ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN
        SELECT unnest(ARRAY[
            'chantiers','journal','commandes','personnel','pointage',
            'materiels','caisse','antoka','credits_fournisseurs',
            'catalogue_prix','contrats','devis','devis_lots','devis_lignes'
        ])
    LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS %I ON %I;
            CREATE POLICY %I ON %I
                FOR ALL USING (true) WITH CHECK (true);',
            'allow_all_' || tbl, tbl,
            'allow_all_' || tbl, tbl
        );
    END LOOP;
END $$;

-- ============================================================
-- VUE pour le graphique dashboard
-- ============================================================
CREATE OR REPLACE VIEW v_depenses_par_mois AS
SELECT
    DATE_TRUNC('month', date) AS mois,
    SUM(montant) AS total
FROM journal
WHERE date >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY 1
ORDER BY 1;
