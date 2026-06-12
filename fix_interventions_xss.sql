-- 1. Create interventions table
CREATE TABLE IF NOT EXISTS interventions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  titre TEXT NOT NULL DEFAULT 'Intervention',
  chantier TEXT,
  description TEXT,
  date_debut DATE DEFAULT CURRENT_DATE,
  technicien TEXT,
  statut TEXT DEFAULT 'EN COURS' CHECK (statut IN ('EN COURS','TERMINÉ','ANNULE')),
  priorite TEXT DEFAULT 'NORMALE' CHECK (priorite IN ('NORMALE','HAUTE','URGENTE')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY technicien_select_all ON interventions
  FOR SELECT TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'technicien');

CREATE POLICY technicien_insert_own ON interventions
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() -> 'user_metadata' ->> 'role' = 'technicien');

CREATE POLICY technicien_update_own ON interventions
  FOR UPDATE TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'technicien');

CREATE POLICY admin_all_interventions ON interventions
  FOR ALL TO authenticated
  USING (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin');

-- 4. XSS prevention trigger on personnel
CREATE OR REPLACE FUNCTION sanitize_text_input()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'personnel' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.nom := regexp_replace(NEW.nom, '<[^>]+>', '', 'g');
    NEW.email := regexp_replace(NEW.email, '<[^>]+>', '', 'g');
    NEW.fonction := regexp_replace(NEW.fonction, '<[^>]+>', '', 'g');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sanitize_personnel ON personnel;
CREATE TRIGGER trg_sanitize_personnel
  BEFORE INSERT OR UPDATE ON personnel
  FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

-- 5. Auto-update updated_at for interventions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_interventions_updated_at ON interventions;
CREATE TRIGGER trg_interventions_updated_at
  BEFORE UPDATE ON interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
