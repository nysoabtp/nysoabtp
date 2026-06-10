ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pointage ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiels ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE devis ENABLE ROW LEVEL SECURITY;
ALTER TABLE caisse ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chef read own chantier" ON chantiers;
DROP POLICY IF EXISTS "Chef read pointage own chantier" ON pointage;
DROP POLICY IF EXISTS "Chef read own materiels" ON materiels;
DROP POLICY IF EXISTS "Chef read own journal" ON journal;
DROP POLICY IF EXISTS "Chef read own devis" ON devis;
DROP POLICY IF EXISTS "Chef read own commandes" ON commandes;

CREATE POLICY "Chef read own chantier" ON chantiers FOR SELECT TO authenticated USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND nom = auth.jwt()->'user_metadata'->>'chantier');
CREATE POLICY "Chef read pointage own chantier" ON pointage FOR SELECT TO authenticated USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
CREATE POLICY "Chef read own materiels" ON materiels FOR SELECT TO authenticated USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier_actuel = auth.jwt()->'user_metadata'->>'chantier');
CREATE POLICY "Chef read own journal" ON journal FOR SELECT TO authenticated USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
CREATE POLICY "Chef read own devis" ON devis FOR SELECT TO authenticated USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier_id IN (SELECT id FROM chantiers WHERE nom = auth.jwt()->'user_metadata'->>'chantier'));
CREATE POLICY "Chef read own commandes" ON commandes FOR SELECT TO authenticated USING (auth.jwt()->'user_metadata'->>'role' = 'chef' AND chantier = auth.jwt()->'user_metadata'->>'chantier');
