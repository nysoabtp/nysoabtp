-- Migration complète: RLS policies + nouvelles tables
-- Executer dans Supabase Dashboard > SQL Editor

-- ============================================================
-- PARTIE 1 : Colonnes manquantes et corrections
-- ============================================================

-- Ajouter colonne montant à commandes
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS montant NUMERIC(15,2) DEFAULT 0;

-- Mettre à jour montant à partir de prix * quantite existants
UPDATE commandes SET montant = COALESCE(prix, 0) * COALESCE(quantite, 1) WHERE montant = 0;

-- ============================================================
-- PARTIE 2 : Nouvelles tables
-- ============================================================

-- Budgets par chantier
CREATE TABLE IF NOT EXISTS budgets (
    id BIGSERIAL PRIMARY KEY,
    chantier TEXT NOT NULL DEFAULT '',
    designation TEXT NOT NULL DEFAULT '',
    montant NUMERIC(15,2) NOT NULL DEFAULT 0,
    depense_actuelle NUMERIC(15,2) NOT NULL DEFAULT 0,
    mois TEXT,
    annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Prix catalogue
CREATE TABLE IF NOT EXISTS prix_catalogue (
    id BIGSERIAL PRIMARY KEY,
    designation TEXT NOT NULL,
    unite TEXT NOT NULL DEFAULT 'U',
    prix_unitaire NUMERIC(15,2) NOT NULL DEFAULT 0,
    categorie TEXT DEFAULT '',
    fournisseur TEXT DEFAULT '',
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Crédits fournisseur
CREATE TABLE IF NOT EXISTS credits_fournisseur (
    id BIGSERIAL PRIMARY KEY,
    fournisseur TEXT NOT NULL,
    montant_initial NUMERIC(15,2) NOT NULL DEFAULT 0,
    montant_restant NUMERIC(15,2) NOT NULL DEFAULT 0,
    motif TEXT DEFAULT '',
    date_credit DATE DEFAULT CURRENT_DATE,
    echeance DATE,
    statut TEXT DEFAULT 'ACTIF',
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Échéances de crédit
CREATE TABLE IF NOT EXISTS echeances_credit (
    id BIGSERIAL PRIMARY KEY,
    credit_id BIGINT REFERENCES credits_fournisseur(id) ON DELETE CASCADE,
    montant NUMERIC(15,2) NOT NULL DEFAULT 0,
    date_echeance DATE,
    payee BOOLEAN DEFAULT FALSE,
    date_paiement DATE,
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Stocks
CREATE TABLE IF NOT EXISTS stocks (
    id BIGSERIAL PRIMARY KEY,
    designation TEXT NOT NULL,
    categorie TEXT DEFAULT '',
    unite TEXT DEFAULT 'U',
    quantite NUMERIC(15,2) NOT NULL DEFAULT 0,
    seuil_alerte NUMERIC(15,2) DEFAULT 0,
    prix_unitaire NUMERIC(15,2) DEFAULT 0,
    chantier TEXT DEFAULT '',
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Mouvements de stock
CREATE TABLE IF NOT EXISTS mouvements_stock (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT REFERENCES stocks(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('ENTREE','SORTIE')),
    quantite NUMERIC(15,2) NOT NULL DEFAULT 0,
    motif TEXT DEFAULT '',
    chantier TEXT DEFAULT '',
    date_mouvement DATE DEFAULT CURRENT_DATE,
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Besoins stock (demandes d'achat)
CREATE TABLE IF NOT EXISTS besoins_stock (
    id BIGSERIAL PRIMARY KEY,
    designation TEXT NOT NULL,
    quantite_demandee NUMERIC(15,2) NOT NULL DEFAULT 0,
    quantite_validee NUMERIC(15,2) DEFAULT 0,
    priorite TEXT DEFAULT 'NORMAL',
    chantier TEXT DEFAULT '',
    statut TEXT DEFAULT 'EN_ATTENTE',
    date_demande DATE DEFAULT CURRENT_DATE,
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Demandes de budget
CREATE TABLE IF NOT EXISTS demandes_budget (
    id BIGSERIAL PRIMARY KEY,
    chantier TEXT DEFAULT '',
    motif TEXT NOT NULL,
    montant_demande NUMERIC(15,2) NOT NULL DEFAULT 0,
    montant_valide NUMERIC(15,2) DEFAULT 0,
    statut TEXT DEFAULT 'EN_ATTENTE',
    date_demande DATE DEFAULT CURRENT_DATE,
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Avances sur salaire
CREATE TABLE IF NOT EXISTS avances_salaire (
    id BIGSERIAL PRIMARY KEY,
    employe TEXT NOT NULL,
    montant NUMERIC(15,2) NOT NULL DEFAULT 0,
    motif TEXT DEFAULT '',
    mois_remboursement TEXT,
    rembourse BOOLEAN DEFAULT FALSE,
    date_avance DATE DEFAULT CURRENT_DATE,
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- ANTOKA (acomptes fournisseurs / débours)
CREATE TABLE IF NOT EXISTS antoka (
    id BIGSERIAL PRIMARY KEY,
    beneficiaire TEXT NOT NULL,
    montant NUMERIC(15,2) NOT NULL DEFAULT 0,
    motif TEXT DEFAULT '',
    chantier TEXT DEFAULT '',
    statut TEXT DEFAULT 'EN_COURS',
    date_antoka DATE DEFAULT CURRENT_DATE,
    date_regularisation DATE,
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- Évaluations / contrôles qualité
CREATE TABLE IF NOT EXISTS evaluations (
    id BIGSERIAL PRIMARY KEY,
    chantier TEXT DEFAULT '',
    type TEXT DEFAULT 'QUALITE',
    note NUMERIC(3,1) DEFAULT 0,
    commentaire TEXT DEFAULT '',
    inspecteur TEXT DEFAULT '',
    date_evaluation DATE DEFAULT CURRENT_DATE,
    date_creation TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PARTIE 3 : RLS Policies pour anon key (SELECT, INSERT, UPDATE, DELETE)
-- ============================================================

DO $$ DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT unnest(ARRAY[
        'chantiers','personnel','devis','pointage_attendance','journal',
        'conges','salaires','contrats','commandes','mouvements_stock',
        'gantt_taches','rapports_chantier','controles_inopines',
        'budgets','prix_catalogue','credits_fournisseur','echeances_credit',
        'stocks','besoins_stock','demandes_budget','avances_salaire',
        'antoka','evaluations'
    ])
    LOOP
        EXECUTE format('CREATE POLICY IF NOT EXISTS anon_select ON %I FOR SELECT USING (true);', tbl);
        EXECUTE format('CREATE POLICY IF NOT EXISTS anon_insert ON %I FOR INSERT WITH CHECK (true);', tbl);
        EXECUTE format('CREATE POLICY IF NOT EXISTS anon_update ON %I FOR UPDATE USING (true) WITH CHECK (true);', tbl);
        EXECUTE format('CREATE POLICY IF NOT EXISTS anon_delete ON %I FOR DELETE USING (true);', tbl);
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

-- ============================================================
-- PARTIE 4 : Index pour performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_journal_chantier ON journal(chantier);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(date);
CREATE INDEX IF NOT EXISTS idx_journal_categorie ON journal(categorie);
CREATE INDEX IF NOT EXISTS idx_commandes_date ON commandes(date);
CREATE INDEX IF NOT EXISTS idx_pointage_date ON pointage_attendance(date);
CREATE INDEX IF NOT EXISTS idx_personnel_chantier ON personnel(chantier_code);
CREATE INDEX IF NOT EXISTS idx_budgets_chantier ON budgets(chantier);
CREATE INDEX IF NOT EXISTS idx_stocks_categorie ON stocks(categorie);
CREATE INDEX IF NOT EXISTS idx_credits_fournisseur ON credits_fournisseur(fournisseur);
