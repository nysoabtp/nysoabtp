-- Supprimer toutes les anciennes policies qui écrasent les restrictions
DROP POLICY IF EXISTS "allow_all_caisse" ON caisse;
DROP POLICY IF EXISTS "allow_all_pointage" ON pointage;
DROP POLICY IF EXISTS "allow_all_devis" ON devis;
DROP POLICY IF EXISTS "allow_all_commandes" ON commandes;
DROP POLICY IF EXISTS "allow_all_journal" ON journal;
DROP POLICY IF EXISTS "anon_select_chantiers" ON chantiers;
DROP POLICY IF EXISTS "chef_select_materiels" ON materiels;
DROP POLICY IF EXISTS "chef_read_own_chantier" ON chantiers;
DROP POLICY IF EXISTS "chef_read_pointage_own_chantier" ON pointage;
DROP POLICY IF EXISTS "chef_read_own_materiels" ON materiels;
DROP POLICY IF EXISTS "chef_read_own_journal" ON journal;
DROP POLICY IF EXISTS "chef_read_own_devis" ON devis;
DROP POLICY IF EXISTS "chef_read_own_commandes" ON commandes;
DROP POLICY IF EXISTS "Chef read own chantier" ON chantiers;
DROP POLICY IF EXISTS "Chef read pointage own chantier" ON pointage;
DROP POLICY IF EXISTS "Chef read own materiels" ON materiels;
DROP POLICY IF EXISTS "Chef read own journal" ON journal;
DROP POLICY IF EXISTS "Chef read own devis" ON devis;
DROP POLICY IF EXISTS "Chef read own commandes" ON commandes;
DROP POLICY IF EXISTS "chef_select_chantiers" ON chantiers;
DROP POLICY IF EXISTS "admin_manage_chantiers" ON chantiers;
DROP POLICY IF EXISTS "admin_all_chantiers" ON chantiers;
DROP POLICY IF EXISTS "admin_daf_rh_read_all_chantiers" ON chantiers;
DROP POLICY IF EXISTS "admin_all_materiels" ON materiels;
DROP POLICY IF EXISTS "daf_devis" ON devis;
DROP POLICY IF EXISTS "chef_update_chantiers" ON chantiers;

-- Supprimer les anciennes policies personnel (pour les recréer propres sans conflit)
DROP POLICY IF EXISTS "rh_admin_manage_personnel" ON personnel;
DROP POLICY IF EXISTS "rh_all_personnel" ON personnel;
DROP POLICY IF EXISTS "rh_admin_daf_read_all_personnel" ON personnel;
DROP POLICY IF EXISTS "admin_all_personnel" ON personnel;
DROP POLICY IF EXISTS "chef_read_own_chantier_personnel" ON personnel;
DROP POLICY IF EXISTS "chef_select_personnel" ON personnel;
DROP POLICY IF EXISTS "chef_insert_own_chantier_personnel" ON personnel;
DROP POLICY IF EXISTS "chef_insert_personnel" ON personnel;

-- Policies chantiers
CREATE POLICY "admin_daf_all_chantiers" ON chantiers FOR ALL TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = ANY (ARRAY['admin', 'daf']));

CREATE POLICY "rh_read_chantiers" ON chantiers FOR SELECT TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = 'rh');

CREATE POLICY "chef_read_own_chantier" ON chantiers FOR SELECT TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = 'chef' 
    AND nom = auth.jwt()->'user_metadata'->>'chantier');

-- Policies pointage
CREATE POLICY "admin_daf_rh_all_pointage" ON pointage FOR ALL TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = ANY (ARRAY['admin', 'daf', 'rh']));

CREATE POLICY "chef_read_own_pointage" ON pointage FOR SELECT TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = 'chef' 
    AND chantier = auth.jwt()->'user_metadata'->>'chantier');

-- Policies materiels
CREATE POLICY "admin_daf_all_materiels" ON materiels FOR ALL TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = ANY (ARRAY['admin', 'daf']));

CREATE POLICY "chef_read_own_materiels" ON materiels FOR SELECT TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = 'chef' 
    AND chantier_actuel = auth.jwt()->'user_metadata'->>'chantier');

-- Policies journal
CREATE POLICY "admin_daf_rh_all_journal" ON journal FOR ALL TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = ANY (ARRAY['admin', 'daf', 'rh']));

CREATE POLICY "chef_read_own_journal" ON journal FOR SELECT TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = 'chef' 
    AND chantier = auth.jwt()->'user_metadata'->>'chantier');

-- Policies devis
CREATE POLICY "admin_daf_all_devis" ON devis FOR ALL TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = ANY (ARRAY['admin', 'daf']));

CREATE POLICY "chef_read_own_devis" ON devis FOR SELECT TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = 'chef' 
    AND chantier_id IN (SELECT id FROM chantiers WHERE nom = auth.jwt()->'user_metadata'->>'chantier'));

-- Policies caisse
CREATE POLICY "admin_daf_all_caisse" ON caisse FOR ALL TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = ANY (ARRAY['admin', 'daf']));

-- Policies commandes
CREATE POLICY "admin_daf_all_commandes" ON commandes FOR ALL TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = ANY (ARRAY['admin', 'daf']));

CREATE POLICY "chef_read_own_commandes" ON commandes FOR SELECT TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = 'chef' 
    AND chantier = auth.jwt()->'user_metadata'->>'chantier');

-- Policies personnel (version propre, garde les insert pour chef)
CREATE POLICY "admin_rh_daf_all_personnel" ON personnel FOR ALL TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = ANY (ARRAY['admin', 'rh', 'daf']));

CREATE POLICY "chef_read_own_personnel" ON personnel FOR SELECT TO authenticated 
  USING ((auth.jwt()->'user_metadata'->>'role') = 'chef' 
    AND chantier = auth.jwt()->'user_metadata'->>'chantier');

CREATE POLICY "chef_insert_own_chantier_personnel" ON personnel FOR INSERT TO authenticated 
  WITH CHECK ((auth.jwt()->'user_metadata'->>'role') = 'chef' 
    AND chantier = auth.jwt()->'user_metadata'->>'chantier');
