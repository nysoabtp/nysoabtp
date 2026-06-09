-- ============================================================
-- NYSOA BTP — sync_chantiers.sql
-- Insère les chantiers qui existent dans login.html (fallback)
-- mais pas encore dans la table `chantiers`
-- À exécuter dans Supabase SQL Editor
-- ============================================================

INSERT INTO chantiers (code, nom, statut, actif) VALUES
    ('CH-008', 'Residence Les Palmiers', 'EN COURS', true),
    ('CH-009', 'Centre Commercial',      'EN COURS', true),
    ('CH-010', 'Bureau Ecobank',         'EN COURS', true),
    ('CH-011', 'NYSOA',                  'EN COURS', true),
    ('CH-012', 'MANDANIRESAKA',          'EN COURS', true),
    ('CH-013', 'AUTRES',                 'EN COURS', true),
    ('CH-014', 'AMPEFY',                 'EN COURS', true),
    ('CH-015', 'VISY GASY',             'EN COURS', true),
    ('CH-016', 'AMBOHIMANABE',          'EN COURS', true),
    ('CH-017', 'HOMEOPHARMA',           'EN COURS', true),
    ('CH-018', 'AUTOBLOCANTS',          'EN COURS', true),
    ('CH-019', 'VOLAVITA',              'EN COURS', true),
    ('CH-020', 'GASTRO TULEAR',         'EN COURS', true),
    ('CH-021', 'FIANARA',               'EN COURS', true),
    ('CH-022', 'MAHAZOARIVO',           'EN COURS', true),
    ('CH-023', 'TOMBONTSOA',            'EN COURS', true)
ON CONFLICT (nom) DO NOTHING;

-- Vérification
SELECT code, nom, statut FROM chantiers ORDER BY code;
