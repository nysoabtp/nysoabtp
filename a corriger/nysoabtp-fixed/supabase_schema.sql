-- ═══════════════════════════════════════════════════════════════════════════════
-- NYSOA BTP - SCHEMA SUPABASE
-- ═══════════════════════════════════════════════════════════════════════════════

-- Activer l'extension UUID si nécessaire
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: PROJETS / CHANTIERS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projets (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    client VARCHAR(255),
    localisation TEXT,
    date_debut DATE,
    date_fin_prevue DATE,
    budget DECIMAL(15,2),
    statut VARCHAR(50) DEFAULT 'en_cours', -- en_cours, termine, attente
    progression INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: ACHATS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS achats (
    id BIGSERIAL PRIMARY KEY,
    commande VARCHAR(100) UNIQUE NOT NULL,
    date_achat DATE NOT NULL,
    chantier VARCHAR(255),
    libelle TEXT NOT NULL,
    quantite DECIMAL(10,2),
    prix DECIMAL(15,2),
    fournisseur VARCHAR(255),
    mode_paiement VARCHAR(100),
    statut VARCHAR(50) DEFAULT 'en_attente', -- en_attente, commande, recu, annule
    categorie VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: JOURNAL / COMPTABILITÉ
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS journal (
    id BIGSERIAL PRIMARY KEY,
    date_ecriture DATE NOT NULL,
    chantier VARCHAR(255),
    designation TEXT NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    mode_paiement VARCHAR(100),
    categorie VARCHAR(100),
    travaux VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: PERSONNEL
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS personnel (
    id BIGSERIAL PRIMARY KEY,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    prenom VARCHAR(255),
    poste VARCHAR(255),
    departement VARCHAR(255),
    telephone VARCHAR(50),
    email VARCHAR(255),
    date_embauche DATE,
    salaire_base DECIMAL(15,2),
    statut VARCHAR(50) DEFAULT 'actif', -- actif, inactif
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: POINTAGE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pointage (
    id BIGSERIAL PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    chantier VARCHAR(255),
    type VARCHAR(50) NOT NULL, -- arrivee, depart
    heure TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (matricule) REFERENCES personnel(matricule) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: LOGISTIQUE / STOCKS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS logistique (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(100) UNIQUE NOT NULL,
    designation TEXT NOT NULL,
    categorie VARCHAR(100),
    unite VARCHAR(50),
    quantite_stock DECIMAL(10,2) DEFAULT 0,
    prix_unitaire DECIMAL(15,2),
    fournisseur VARCHAR(255),
    chantier VARCHAR(255),
    date_entree DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: MOUVEMENTS STOCK
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS mouvements_stock (
    id BIGSERIAL PRIMARY KEY,
    reference_materiel VARCHAR(100) NOT NULL,
    type_mouvement VARCHAR(50) NOT NULL, -- entree, sortie
    quantite DECIMAL(10,2) NOT NULL,
    chantier VARCHAR(255),
    date_mouvement DATE NOT NULL,
    motif TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: DEVIS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS devis (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(100) UNIQUE NOT NULL,
    client VARCHAR(255) NOT NULL,
    projet VARCHAR(255),
    date_devis DATE NOT NULL,
    montant_ht DECIMAL(15,2) DEFAULT 0,
    montant_ttc DECIMAL(15,2) DEFAULT 0,
    statut VARCHAR(50) DEFAULT 'BROUILLON', -- BROUILLON, ENVOYE, ACCEPTE, REJETE, FACTURE
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: DEVIS_LOTS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS devis_lots (
    id BIGSERIAL PRIMARY KEY,
    devis_id BIGINT NOT NULL,
    position INTEGER NOT NULL,
    num VARCHAR(50) NOT NULL,
    titre TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (devis_id) REFERENCES devis(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: DEVIS_LIGNES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS devis_lignes (
    id BIGSERIAL PRIMARY KEY,
    devis_lot_id BIGINT NOT NULL,
    ref VARCHAR(100) NOT NULL,
    designation TEXT NOT NULL,
    unite VARCHAR(50),
    quantite DECIMAL(10,2) DEFAULT 1,
    prix_unitaire DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (devis_lot_id) REFERENCES devis_lots(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: ANTOKA (Avances employés)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS antoka (
    id BIGSERIAL PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL,
    employe VARCHAR(255) NOT NULL,
    date_octroi DATE NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    reste DECIMAL(15,2) NOT NULL,
    statut VARCHAR(50) DEFAULT 'en_cours', -- en_cours, rembourse, annule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: PAIEMENTS ANTOKA
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS antoka_paiements (
    id BIGSERIAL PRIMARY KEY,
    antoka_id BIGINT NOT NULL,
    date_paiement DATE NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (antoka_id) REFERENCES antoka(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: CREDITS FOURNISSEURS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credits_fournisseurs (
    id BIGSERIAL PRIMARY KEY,
    fournisseur VARCHAR(255) NOT NULL,
    commande VARCHAR(100),
    date_credit DATE NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    reste DECIMAL(15,2) NOT NULL,
    statut VARCHAR(50) DEFAULT 'en_cours', -- en_cours, regle, annule
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: PAIEMENTS CREDITS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS credits_paiements (
    id BIGSERIAL PRIMARY KEY,
    credit_id BIGINT NOT NULL,
    date_paiement DATE NOT NULL,
    montant DECIMAL(15,2) NOT NULL,
    mode_paiement VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (credit_id) REFERENCES credits_fournisseurs(id) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: CAISSE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS caisse (
    id BIGSERIAL PRIMARY KEY,
    date_operation DATE NOT NULL,
    type_operation VARCHAR(50) NOT NULL, -- entree, sortie
    montant DECIMAL(15,2) NOT NULL,
    motif TEXT NOT NULL,
    categorie VARCHAR(100),
    chantier VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: CATALOGUE PRIX
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS catalogue_prix (
    id BIGSERIAL PRIMARY KEY,
    reference VARCHAR(100) UNIQUE NOT NULL,
    designation TEXT NOT NULL,
    categorie VARCHAR(100),
    unite VARCHAR(50),
    prix_unitaire DECIMAL(15,2) NOT NULL,
    fournisseur VARCHAR(255),
    date_mise_a_jour DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: CONTRATS PRESTATAIRES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS contrats_prestataires (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(100) UNIQUE NOT NULL,
    prestataire VARCHAR(255) NOT NULL,
    type_contrat VARCHAR(100),
    date_debut DATE NOT NULL,
    date_fin DATE,
    montant DECIMAL(15,2),
    chantier VARCHAR(255),
    statut VARCHAR(50) DEFAULT 'actif', -- actif, termine, resilie
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: GANTT_TACHES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS gantt_taches (
    id BIGSERIAL PRIMARY KEY,
    tache TEXT NOT NULL,
    chantier VARCHAR(255),
    debut DATE NOT NULL,
    fin DATE NOT NULL,
    avancement INTEGER DEFAULT 0,
    couleur VARCHAR(50) DEFAULT 'blue',
    responsable VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: RAPPORTS CHANTIER
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rapports_chantier (
    id BIGSERIAL PRIMARY KEY,
    date_rapport DATE NOT NULL,
    chantier VARCHAR(255) NOT NULL,
    chef VARCHAR(255) NOT NULL,
    meteo VARCHAR(100),
    ouvriers_present INTEGER DEFAULT 0,
    travaux_realises TEXT,
    problemes TEXT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: CONTROLES INOPINÉS
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS controles (
    id BIGSERIAL PRIMARY KEY,
    date_controle DATE NOT NULL,
    chantier VARCHAR(255) NOT NULL,
    controleur VARCHAR(255) NOT NULL,
    type_controle VARCHAR(100),
    score INTEGER,
    observations TEXT,
    statut VARCHAR(50) DEFAULT 'conforme', -- conforme, observations, non_conforme
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: USERS (Authentification)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    nom VARCHAR(255),
    role VARCHAR(50) NOT NULL, -- admin, daf, chef, rh, controleur, technicien
    statut VARCHAR(50) DEFAULT 'actif', -- actif, inactif
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: CONGES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS conges (
    id BIGSERIAL PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    duree INTEGER NOT NULL,
    motif TEXT,
    statut VARCHAR(50) DEFAULT 'en_attente', -- en_attente, approuve, rejete
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (matricule) REFERENCES personnel(matricule) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE: SALAIRES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS salaires (
    id BIGSERIAL PRIMARY KEY,
    matricule VARCHAR(50) NOT NULL,
    mois INTEGER NOT NULL,
    annee INTEGER NOT NULL,
    jours_presents INTEGER DEFAULT 0,
    salaire_base DECIMAL(15,2),
    salaire_mensuel DECIMAL(15,2),
    prorata DECIMAL(15,2),
    statut VARCHAR(50) DEFAULT 'calcule', -- calcule, paye
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (matricule) REFERENCES personnel(matricule) ON DELETE CASCADE
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_projets_statut ON projets(statut);
CREATE INDEX IF NOT EXISTS idx_achats_statut ON achats(statut);
CREATE INDEX IF NOT EXISTS idx_achats_chantier ON achats(chantier);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal(date_ecriture);
CREATE INDEX IF NOT EXISTS idx_journal_chantier ON journal(chantier);
CREATE INDEX IF NOT EXISTS idx_personnel_matricule ON personnel(matricule);
CREATE INDEX IF NOT EXISTS idx_pointage_matricule ON pointage(matricule);
CREATE INDEX IF NOT EXISTS idx_pointage_date ON pointage(date);
CREATE INDEX IF NOT EXISTS idx_logistique_chantier ON logistique(chantier);
CREATE INDEX IF NOT EXISTS idx_devis_statut ON devis(statut);
CREATE INDEX IF NOT EXISTS idx_antoka_matricule ON antoka(matricule);
CREATE INDEX IF NOT EXISTS idx_credits_fournisseur ON credits_fournisseurs(fournisseur);
CREATE INDEX IF NOT EXISTS idx_caisse_date ON caisse(date_operation);
CREATE INDEX IF NOT EXISTS idx_gantt_chantier ON gantt_taches(chantier);
CREATE INDEX IF NOT EXISTS idx_rapports_chantier ON rapports_chantier(chantier);
CREATE INDEX IF NOT EXISTS idx_rapports_date ON rapports_chantier(date_rapport);
CREATE INDEX IF NOT EXISTS idx_controles_chantier ON controles(chantier);
CREATE INDEX IF NOT EXISTS idx_conges_matricule ON conges(matricule);
CREATE INDEX IF NOT EXISTS idx_salaires_matricule ON salaires(matricule);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) - Désactivé par défaut pour simplifier
-- ═══════════════════════════════════════════════════════════════════════════════
-- Pour activer RLS, décommentez les lignes ci-dessous et configurez les politiques
-- ALTER TABLE projets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE achats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE pointage ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE logistique ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE devis_lots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE devis_lignes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE antoka ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE credits_fournisseurs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE caisse ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE catalogue_prix ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contrats_prestataires ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE gantt_taches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE rapports_chantier ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE controles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conges ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE salaires ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- DONNÉES DE DÉMONSTRATION (OPTIONNEL)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Insérer un utilisateur admin par défaut
INSERT INTO users (email, role, nom, statut) 
VALUES ('admin@nysoa.mg', 'admin', 'Administrateur', 'actif')
ON CONFLICT (email) DO NOTHING;

-- Insérer quelques projets de démonstration
INSERT INTO projets (reference, nom, client, localisation, date_debut, date_fin_prevue, budget, statut, progression)
VALUES 
    ('PRJ-001', 'Résidence Les Palmiers', 'SCI Palmiers', 'Antananarivo', '2025-01-15', '2026-12-31', 500000000, 'en_cours', 75),
    ('PRJ-002', 'Centre Commercial', 'Promo Immo', 'Antananarivo', '2025-03-01', '2027-06-30', 750000000, 'en_cours', 45),
    ('PRJ-003', 'Bureau Ecobank', 'Ecobank Madagascar', 'Antananarivo', '2025-06-01', '2026-05-31', 300000000, 'en_cours', 90)
ON CONFLICT (reference) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIN DU SCRIPT
-- ═══════════════════════════════════════════════════════════════════════════════
