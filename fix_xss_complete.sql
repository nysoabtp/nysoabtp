-- XSS prevention triggers for all text-bearing tables
CREATE OR REPLACE FUNCTION sanitize_text_input()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Strip HTML tags from all text/JSON fields on key tables
  IF TG_TABLE_NAME = 'personnel' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.nom := regexp_replace(NEW.nom, '<[^>]+>', '', 'g');
    NEW.email := regexp_replace(NEW.email, '<[^>]+>', '', 'g');
    NEW.metier := regexp_replace(NEW.metier, '<[^>]+>', '', 'g');
  ELSIF TG_TABLE_NAME = 'chantiers' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.nom := regexp_replace(NEW.nom, '<[^>]+>', '', 'g');
    NEW.code := regexp_replace(NEW.code, '<[^>]+>', '', 'g');
  ELSIF TG_TABLE_NAME = 'rapports_chantier' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.chantier := regexp_replace(NEW.chantier, '<[^>]+>', '', 'g');
    NEW.travaux := regexp_replace(NEW.travaux, '<[^>]+>', '', 'g');
    NEW.problemes := regexp_replace(NEW.problemes, '<[^>]+>', '', 'g');
  ELSIF TG_TABLE_NAME = 'devis' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.chantier := regexp_replace(NEW.chantier, '<[^>]+>', '', 'g');
    NEW.client := regexp_replace(NEW.client, '<[^>]+>', '', 'g');
  ELSIF TG_TABLE_NAME = 'controles_inopines' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.chantier := regexp_replace(NEW.chantier, '<[^>]+>', '', 'g');
    NEW.controleur := regexp_replace(NEW.controleur, '<[^>]+>', '', 'g');
  ELSIF TG_TABLE_NAME = 'interventions' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.titre := regexp_replace(NEW.titre, '<[^>]+>', '', 'g');
    NEW.chantier := regexp_replace(NEW.chantier, '<[^>]+>', '', 'g');
    NEW.description := regexp_replace(NEW.description, '<[^>]+>', '', 'g');
    NEW.technicien := regexp_replace(NEW.technicien, '<[^>]+>', '', 'g');
  ELSIF TG_TABLE_NAME = 'journal' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.libelle := regexp_replace(NEW.libelle, '<[^>]+>', '', 'g');
  ELSIF TG_TABLE_NAME = 'pointage_attendance' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.nom_employe := regexp_replace(NEW.nom_employe, '<[^>]+>', '', 'g');
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to all relevant tables
DROP TRIGGER IF EXISTS trg_sanitize_personnel ON personnel;
CREATE TRIGGER trg_sanitize_personnel BEFORE INSERT OR UPDATE ON personnel FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

DROP TRIGGER IF EXISTS trg_sanitize_chantiers ON chantiers;
CREATE TRIGGER trg_sanitize_chantiers BEFORE INSERT OR UPDATE ON chantiers FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

DROP TRIGGER IF EXISTS trg_sanitize_rapports_chantier ON rapports_chantier;
CREATE TRIGGER trg_sanitize_rapports_chantier BEFORE INSERT OR UPDATE ON rapports_chantier FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

DROP TRIGGER IF EXISTS trg_sanitize_devis ON devis;
CREATE TRIGGER trg_sanitize_devis BEFORE INSERT OR UPDATE ON devis FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

DROP TRIGGER IF EXISTS trg_sanitize_controles_inopines ON controles_inopines;
CREATE TRIGGER trg_sanitize_controles_inopines BEFORE INSERT OR UPDATE ON controles_inopines FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

DROP TRIGGER IF EXISTS trg_sanitize_interventions ON interventions;
CREATE TRIGGER trg_sanitize_interventions BEFORE INSERT OR UPDATE ON interventions FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

DROP TRIGGER IF EXISTS trg_sanitize_journal ON journal;
CREATE TRIGGER trg_sanitize_journal BEFORE INSERT OR UPDATE ON journal FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

DROP TRIGGER IF EXISTS trg_sanitize_pointage ON pointage_attendance;
CREATE TRIGGER trg_sanitize_pointage BEFORE INSERT OR UPDATE ON pointage_attendance FOR EACH ROW EXECUTE FUNCTION sanitize_text_input();

-- Clean existing XSS data from personnel
UPDATE personnel SET nom = regexp_replace(nom, '<[^>]+>', '', 'g') WHERE nom ~ '<[^>]+>';
