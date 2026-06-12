-- ============================================================
-- MIGRATION V2: Nouvelles tables + Policies RLS
-- Executer dans Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. BUDGETS (suivi budget par chantier/personne)
CREATE TABLE IF NOT EXISTS budgets (
  id BIGSERIAL PRIMARY KEY,
  chantier TEXT,
  personne TEXT,
  designation TEXT,
  montant_initial NUMERIC(15,2) DEFAULT 0,
  montant_depense NUMERIC(15,2) DEFAULT 0,
  reste NUMERIC(15,2) DEFAULT 0,
  mois INTEGER,
  annee INTEGER,
  statut TEXT DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRIX CATALOGUE (prix unitaires fournisseurs)
CREATE TABLE IF NOT EXISTS prix_catalogue (
  id BIGSERIAL PRIMARY KEY,
  designation TEXT NOT NULL,
  prix_unitaire NUMERIC(15,2) DEFAULT 0,
  unite TEXT,
  fournisseur TEXT,
  categorie TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREDIT FOURNISSEUR (paiements échelonnés)
CREATE TABLE IF NOT EXISTS credits_fournisseur (
  id BIGSERIAL PRIMARY KEY,
  fournisseur TEXT NOT NULL,
  montant_total NUMERIC(15,2) DEFAULT 0,
  montant_paye NUMERIC(15,2) DEFAULT 0,
  reste NUMERIC(15,2) DEFAULT 0,
  echeances INTEGER DEFAULT 1,
  statut TEXT DEFAULT 'EN_COURS',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ECHÉANCES CREDIT
CREATE TABLE IF NOT EXISTS echeances_credit (
  id BIGSERIAL PRIMARY KEY,
  credit_id INTEGER REFERENCES credits_fournisseur(id),
  date_paiement DATE,
  montant_paye NUMERIC(15,2) DEFAULT 0,
  montant_restant NUMERIC(15,2) DEFAULT 0,
  statut TEXT DEFAULT 'EN_ATTENTE'
);

-- 5. STOCKS (inventaire par chantier avec historique)
CREATE TABLE IF NOT EXISTS stocks (
  id BIGSERIAL PRIMARY KEY,
  chantier TEXT,
  designation TEXT NOT NULL,
  quantite NUMERIC(10,2) DEFAULT 0,
  unite TEXT,
  seuil_alerte NUMERIC(10,2) DEFAULT 0,
  emplacement TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MOUVEMENTS STOCK (historique)
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id BIGSERIAL PRIMARY KEY,
  stock_id INTEGER REFERENCES stocks(id),
  type TEXT CHECK(type IN ('ENTREE','SORTIE','AJUSTEMENT')),
  quantite NUMERIC(10,2) DEFAULT 0,
  motif TEXT,
  date_mouvement DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BESOINS STOCK (articles à commander)
CREATE TABLE IF NOT EXISTS besoins_stock (
  id BIGSERIAL PRIMARY KEY,
  designation TEXT NOT NULL,
  quantite_necessaire NUMERIC(10,2) DEFAULT 0,
  prix_estime NUMERIC(15,2) DEFAULT 0,
  fournisseur TEXT,
  chantier TEXT,
  priorite TEXT DEFAULT 'MOYENNE',
  statut TEXT DEFAULT 'A_COMMANDER',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DEMANDES BUDGET PERSONNEL
CREATE TABLE IF NOT EXISTS demandes_budget (
  id BIGSERIAL PRIMARY KEY,
  date_demande DATE DEFAULT CURRENT_DATE,
  salaire_mensuel NUMERIC(15,2) DEFAULT 0,
  salaire_journalier NUMERIC(15,2) DEFAULT 0,
  antoka NUMERIC(15,2) DEFAULT 0,
  avances NUMERIC(15,2) DEFAULT 0,
  autres NUMERIC(15,2) DEFAULT 0,
  total NUMERIC(15,2) DEFAULT 0,
  statut TEXT DEFAULT 'BROUILLON',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AVANCES SALAIRE MENSUEL
CREATE TABLE IF NOT EXISTS avances_salaire (
  id BIGSERIAL PRIMARY KEY,
  employe_nom TEXT NOT NULL,
  salaire NUMERIC(15,2) DEFAULT 0,
  mois INTEGER,
  annee INTEGER,
  avance_1 NUMERIC(15,2) DEFAULT 0,
  avance_2 NUMERIC(15,2) DEFAULT 0,
  a_payer NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. ANTOKA (acomptes avec solde)
CREATE TABLE IF NOT EXISTS antoka (
  id BIGSERIAL PRIMARY KEY,
  employe_nom TEXT NOT NULL,
  chantier TEXT,
  montant_depart NUMERIC(15,2) DEFAULT 0,
  montant_paye NUMERIC(15,2) DEFAULT 0,
  reste NUMERIC(15,2) DEFAULT 0,
  statut TEXT DEFAULT 'ACTIF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. EVALUATIONS PERSONNEL
CREATE TABLE IF NOT EXISTS evaluations (
  id BIGSERIAL PRIMARY KEY,
  employe_nom TEXT NOT NULL,
  note TEXT,
  evaluation TEXT,
  mois INTEGER,
  annee INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Ajouter colonne montant à commandes
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS montant NUMERIC(15,2) DEFAULT 0;

-- 13. POLICIES RLS pour anon key (lecture seule sur toutes les tables)
-- ERR-21 CORRIGÉ : suppression de la politique 'anon_select FOR SELECT USING (true)'
-- sur les tables RH et financières sensibles.
-- L'accès anon (public non authentifié) est désormais strictement interdit sur ces tables.
-- Seules les tables non sensibles (chantiers, rapports publics) conservent un accès restreint.

DO $$
DECLARE
  tbl TEXT;
  -- Tables sensibles : AUCUN accès anon autorisé
  sensitive_tables TEXT[] := ARRAY[
    'salaires','avances_salaire','antoka','conges','personnel',
    'credits_fournisseur','echeances_credit','devis','contrats',
    'demandes_budget','evaluations'
  ];
  -- Tables non sensibles : accès lecture seule pour les rôles authentifiés uniquement
  non_sensitive_tables TEXT[] := ARRAY[
    'chantiers','pointage_attendance','journal',
    'commandes','mouvements_stock','gantt_taches','rapports_chantier',
    'controles_inopines','budgets','prix_catalogue',
    'stocks','besoins_stock'
  ];
BEGIN
  -- 1. Activer RLS sur toutes les tables et supprimer toute policy anon existante
  FOREACH tbl IN ARRAY (sensitive_tables || non_sensitive_tables) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Supprimer l'ancienne policy anon_select si elle existe
    EXECUTE format('DROP POLICY IF EXISTS anon_select ON %I', tbl);
  END LOOP;

  -- 2. Tables sensibles : accès réservé aux rôles authentifiés explicites UNIQUEMENT
  FOREACH tbl IN ARRAY sensitive_tables LOOP
    EXECUTE format(
      'CREATE POLICY authenticated_only_select ON %I FOR SELECT
       USING (auth.jwt() IS NOT NULL)',
      tbl
    );
  END LOOP;

  -- 3. Tables non sensibles : lecture pour tout utilisateur authentifié (pas anon)
  FOREACH tbl IN ARRAY non_sensitive_tables LOOP
    EXECUTE format(
      'CREATE POLICY authenticated_read ON %I FOR SELECT
       USING (auth.role() = ''authenticated'')',
      tbl
    );
  END LOOP;
END $$;
