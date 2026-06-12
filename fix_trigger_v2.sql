CREATE OR REPLACE FUNCTION sanitize_text_input()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
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
    NEW.objet := regexp_replace(NEW.objet, '<[^>]+>', '', 'g');
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
    NEW.designation := regexp_replace(NEW.designation, '<[^>]+>', '', 'g');
  ELSIF TG_TABLE_NAME = 'pointage_attendance' AND TG_OP IN ('INSERT','UPDATE') THEN
    NEW.nom_employe := regexp_replace(NEW.nom_employe, '<[^>]+>', '', 'g');
  END IF;
  RETURN NEW;
END;
$$;
