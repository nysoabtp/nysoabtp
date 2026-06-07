-- Ajouter les colonnes pour le pointage journalier (arrivée/départ)
ALTER TABLE public.pointage ADD COLUMN IF NOT EXISTS heure         TEXT;
ALTER TABLE public.pointage ADD COLUMN IF NOT EXISTS type_pointage TEXT;  -- 'Arrivée' ou 'Départ'
ALTER TABLE public.pointage ADD COLUMN IF NOT EXISTS statut        TEXT DEFAULT 'Validé';
ALTER TABLE public.pointage ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();
-- Note: nom_employe, date, chantier existent déjà
