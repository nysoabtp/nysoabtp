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
-- POLITIQUES RLS (sécurité par rôle et scope chantier)
-- Chaque politique restreint l'accès selon auth.user_metadata.role
-- ============================================================
-- Activer RLS sur toutes les tables
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

-- ── CHANTIERS ──
DROP POLICY IF EXISTS "Chef read own chantier" ON chantiers;
CREATE POLICY "Chef read own chantier" ON chantiers
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND nom = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "Admin DAF RH read all chantiers" ON chantiers;
CREATE POLICY "Admin DAF RH read all chantiers" ON chantiers
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' IN ('admin','daf','rh'));
DROP POLICY IF EXISTS "Admin manage chantiers" ON chantiers;
CREATE POLICY "Admin manage chantiers" ON chantiers
    FOR ALL USING (auth.jwt()->'user_metadata'->>'role' = 'admin');

-- ── PERSONNEL ──
DROP POLICY IF EXISTS "Chef read own chantier personnel" ON personnel;
CREATE POLICY "Chef read own chantier personnel" ON personnel
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "RH Admin DAF read all personnel" ON personnel;
CREATE POLICY "RH Admin DAF read all personnel" ON personnel
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' IN ('rh','admin','daf'));
DROP POLICY IF EXISTS "Chef insert own chantier personnel" ON personnel;
CREATE POLICY "Chef insert own chantier personnel" ON personnel
    FOR INSERT WITH CHECK (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "RH Admin manage personnel" ON personnel;
CREATE POLICY "RH Admin manage personnel" ON personnel
    FOR ALL USING (auth.jwt()->'user_metadata'->>'role' IN ('rh','admin'));

-- ── POINTAGE ──
DROP POLICY IF EXISTS "Chef insert pointage own chantier" ON pointage;
CREATE POLICY "Chef insert pointage own chantier" ON pointage
    FOR INSERT WITH CHECK (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "Chef read pointage own chantier" ON pointage;
CREATE POLICY "Chef read pointage own chantier" ON pointage
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "RH Admin DAF read all pointage" ON pointage;
CREATE POLICY "RH Admin DAF read all pointage" ON pointage
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' IN ('rh','admin','daf'));
DROP POLICY IF EXISTS "RH insert pointage" ON pointage;
CREATE POLICY "RH insert pointage" ON pointage
    FOR INSERT WITH CHECK (auth.jwt()->'user_metadata'->>'role' = 'rh');

-- ── JOURNAL ──
DROP POLICY IF EXISTS "Chef read own journal" ON journal;
CREATE POLICY "Chef read own journal" ON journal
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "DAF Admin manage journal" ON journal;
CREATE POLICY "DAF Admin manage journal" ON journal
    FOR ALL USING (auth.jwt()->'user_metadata'->>'role' IN ('daf','admin'));
DROP POLICY IF EXISTS "RH read journal" ON journal;
CREATE POLICY "RH read journal" ON journal
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'rh');

-- ── COMMANDES ──
DROP POLICY IF EXISTS "Chef read own commandes" ON commandes;
CREATE POLICY "Chef read own commandes" ON commandes
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "DAF manage commandes" ON commandes;
CREATE POLICY "DAF manage commandes" ON commandes
    FOR ALL USING (auth.jwt()->'user_metadata'->>'role' = 'daf');

-- ── MATERIELS ──
DROP POLICY IF EXISTS "Chef read own materiels" ON materiels;
CREATE POLICY "Chef read own materiels" ON materiels
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier_actuel = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "Admin manage materiels" ON materiels;
CREATE POLICY "Admin manage materiels" ON materiels
    FOR ALL USING (auth.jwt()->'user_metadata'->>'role' IN ('admin','daf'));

-- ── DEVIS ──
DROP POLICY IF EXISTS "Chef read own devis" ON devis;
CREATE POLICY "Chef read own devis" ON devis
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
DROP POLICY IF EXISTS "DAF manage devis" ON devis;
CREATE POLICY "DAF manage devis" ON devis
    FOR ALL USING (auth.jwt()->'user_metadata'->>'role' = 'daf');
DROP POLICY IF EXISTS "Admin read devis" ON devis;
CREATE POLICY "Admin read devis" ON devis
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'admin');

-- ── CAISSE ──
DROP POLICY IF EXISTS "DAF manage caisse" ON caisse;
CREATE POLICY "DAF manage caisse" ON caisse
    FOR ALL USING (auth.jwt()->'user_metadata'->>'role' = 'daf');
DROP POLICY IF EXISTS "Admin read caisse" ON caisse;
CREATE POLICY "Admin read caisse" ON caisse
    FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' = 'admin');

-- ── ANTOKA, CREDITS, CATALOGUE, CONTRATS, DEVIS_LOTS/LIGNES ──
-- Admin/DAF accès complet, autres rôles lecture seule
DROP POLICY IF EXISTS "DAF Admin manage antoka" ON antoka;
CREATE POLICY "DAF Admin manage antoka" ON antoka FOR ALL USING (auth.jwt()->'user_metadata'->>'role' IN ('daf','admin'));
DROP POLICY IF EXISTS "DAF Admin manage credits" ON credits_fournisseurs;
CREATE POLICY "DAF Admin manage credits" ON credits_fournisseurs FOR ALL USING (auth.jwt()->'user_metadata'->>'role' IN ('daf','admin'));
DROP POLICY IF EXISTS "DAF Admin manage catalogue" ON catalogue_prix;
CREATE POLICY "DAF Admin manage catalogue" ON catalogue_prix FOR ALL USING (auth.jwt()->'user_metadata'->>'role' IN ('daf','admin'));
DROP POLICY IF EXISTS "DAF Admin manage contrats" ON contrats;
CREATE POLICY "DAF Admin manage contrats" ON contrats FOR ALL USING (auth.jwt()->'user_metadata'->>'role' IN ('daf','admin'));
DROP POLICY IF EXISTS "DAF manage devis_lots" ON devis_lots;
CREATE POLICY "DAF manage devis_lots" ON devis_lots FOR ALL USING (auth.jwt()->'user_metadata'->>'role' = 'daf');
DROP POLICY IF EXISTS "DAF manage devis_lignes" ON devis_lignes;
CREATE POLICY "DAF manage devis_lignes" ON devis_lignes FOR ALL USING (auth.jwt()->'user_metadata'->>'role' = 'daf');

-- ============================================================
-- 15. TABLE RAPPORTS CHANTIER
-- ============================================================
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

-- 16. TABLE CONTROLES INOPINES
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

-- 17. TABLE GANTT TACHES
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

-- Activer RLS
ALTER TABLE rapports_chantier    ENABLE ROW LEVEL SECURITY;
ALTER TABLE controles_inopines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_taches         ENABLE ROW LEVEL SECURITY;

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

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: SALAIRES (fiches de paie RH)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS salaires (
    id          BIGSERIAL PRIMARY KEY,
    employe_nom TEXT,
    employe_id  BIGINT,
    mois        INTEGER NOT NULL,
    annee       INTEGER NOT NULL,
    nb_jours    INTEGER DEFAULT 0,
    salaire_base     NUMERIC(15,2) DEFAULT 0,
    salaire_mensuel  NUMERIC(15,2) DEFAULT 0,
    net_a_payer      NUMERIC(15,2) DEFAULT 0,
    statut      TEXT DEFAULT 'calcule',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE salaires ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RH manage salaires" ON salaires;
CREATE POLICY "RH manage salaires" ON salaires FOR ALL USING (auth.jwt()->'user_metadata'->>'role' = 'rh');
DROP POLICY IF EXISTS "DAF Admin read salaires" ON salaires;
CREATE POLICY "DAF Admin read salaires" ON salaires FOR SELECT USING (auth.jwt()->'user_metadata'->>'role' IN ('daf','admin'));
