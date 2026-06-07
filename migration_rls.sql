-- Migration: Ajout colonne montant + Policies RLS anon key
-- Executer dans Supabase Dashboard > SQL Editor

-- 1. Ajouter colonne montant à commandes
ALTER TABLE commandes ADD COLUMN IF NOT EXISTS montant NUMERIC(15,2) DEFAULT 0;

-- 2. Mettre à jour montant à partir de prix * quantite existants
UPDATE commandes SET montant = COALESCE(prix, 0) * COALESCE(quantite, 1) WHERE montant = 0;

-- 3. Policies RLS pour l'anon key sur chaque table (lecture seule)
CREATE POLICY IF NOT EXISTS anon_select ON chantiers FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON personnel FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON devis FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON pointage_attendance FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON journal FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON conges FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON salaires FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON contrats FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON commandes FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON mouvements_stock FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON gantt_taches FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON rapports_chantier FOR SELECT USING (true);
CREATE POLICY IF NOT EXISTS anon_select ON controles_inopines FOR SELECT USING (true);

-- 4. Activer RLS sur les tables qui ne l'ont pas (optionnel)
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE conges ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE contrats ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mouvements_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_taches ENABLE ROW LEVEL SECURITY;
ALTER TABLE rapports_chantier ENABLE ROW LEVEL SECURITY;
ALTER TABLE controles_inopines ENABLE ROW LEVEL SECURITY;
