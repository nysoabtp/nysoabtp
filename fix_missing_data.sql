-- Ajouter les chantiers manquants
INSERT INTO chantiers (code, nom, client, budget, debut, fin, statut, actif) 
SELECT 'PRJ-AMB', 'AMBATOMAINTY', 'Ply', 100000000, '2026-06-09', '2026-07-09', 'EN COURS', true
WHERE NOT EXISTS (SELECT 1 FROM chantiers WHERE nom ILIKE 'AMBATOMAINTY');

INSERT INTO chantiers (code, nom, client, budget, debut, fin, statut, actif) 
SELECT 'PRJ-TRA', 'TRANO', 'Ply', 100000000, '2026-06-09', '2026-07-09', 'EN COURS', true
WHERE NOT EXISTS (SELECT 1 FROM chantiers WHERE nom ILIKE 'TRANO');

-- Assigner le devis à un chantier ANTSENAKELY
UPDATE devis SET chantier_id = (SELECT id FROM chantiers WHERE nom ILIKE 'ANTSENAKELY' LIMIT 1)
WHERE chantier_id IS NULL AND id = 2;

-- Donner des materiels à ANTSENAKELY (depuis ceux sans chantier ou BRICOTECH MAGASIN)
UPDATE materiels SET chantier_actuel = 'ANTSENAKELY'
WHERE id IN (SELECT id FROM materiels WHERE chantier_actuel IS NULL OR chantier_actuel = 'BRICOTECH MAGASIN' LIMIT 15);
