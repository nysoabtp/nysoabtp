-- Créer une table dédiée aux pointages journaliers (arrivée/départ)
-- La table existante `pointage` est réservée aux synthèses hebdo de paie
CREATE TABLE IF NOT EXISTS pointage_attendance (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    heure TIME NOT NULL,
    chantier TEXT,
    nom_employe TEXT NOT NULL,
    matricule TEXT,
    type_pointage TEXT NOT NULL,  -- 'Arrivée' ou 'Départ'
    statut TEXT DEFAULT 'Validé',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_attendance_date ON pointage_attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_employe ON pointage_attendance(nom_employe);
CREATE INDEX IF NOT EXISTS idx_attendance_chantier ON pointage_attendance(chantier);
