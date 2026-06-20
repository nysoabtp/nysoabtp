-- ══════════════════════════════════════════════════════════════
-- SEED_MATERIELS.sql — Seed du stock sur la vraie table `materiels`
-- ══════════════════════════════════════════════════════════════
-- CONTEXTE (audit 2026-06-20) :
-- Les tentatives précédentes d'insertion dans `stocks`, `mouvements_stock`
-- et `besoins_stock` échouaient car RLS bloque par défaut — mais ces
-- tables ne sont PAS utilisées par l'application (aucun db.from() dessus
-- dans tout le front-end). Ce ne sont pas des tables à corriger, ce sont
-- des tables orphelines d'un schéma antérieur.
--
-- La vraie table de stock, utilisée par stock.js (sync localStorage ↔
-- Supabase) et lue par admin.html, est `materiels`. Elle a déjà des
-- policies RLS fonctionnelles pour admin/daf (cf. FIX_RLS_ALL_TABLES.sql /
-- rls_fix_complete.sql) : il suffit d'exécuter ce script connecté en tant
-- qu'utilisateur admin (ou via le SQL editor Supabase, qui bypass RLS).
--
-- IMPORTANT : si votre instance a ajouté manuellement des colonnes
-- prix_unitaire / fournisseur / seuil_alerte sur materiels (référencées
-- par stock.js mais absentes de SUPABASE_SETUP.sql), décommentez les
-- lignes correspondantes ci-dessous. Sinon, laissez tel quel — ce script
-- ne renseigne que les colonnes du schéma canonique (libelle, etat,
-- quantite, chantier_actuel).
-- ══════════════════════════════════════════════════════════════


INSERT INTO materiels (libelle, etat, quantite, chantier_actuel) VALUES
    ('Ciment 50kg',           'BON', 200, 'AMBATOMAINTY'),
    ('Fer à béton 12mm',      'BON', 150, 'AMBATOMAINTY'),
    ('Sable de rivière (m3)', 'BON', 40,  'AMBATOMAINTY'),
    ('Brouette',              'BON', 6,   'AMBATOMAINTY'),
    ('Bétonnière',            'BON', 1,   'AMBATOMAINTY'),


    ('Ciment 50kg',           'BON', 180, 'TRANO CHEF'),
    ('Parpaing 20x20x40',     'BON', 500, 'TRANO CHEF'),
    ('Tôle ondulée 2m',       'BON', 80,  'TRANO CHEF'),
    ('Échafaudage (lot)',     'BON', 4,   'TRANO CHEF'),


    ('Peinture blanche 20L',  'BON', 25,  'AINA & DOMOINA'),
    ('Carrelage 40x40 (m2)',  'BON', 120, 'AINA & DOMOINA'),
    ('Colle carrelage 25kg',  'BON', 30,  'AINA & DOMOINA'),


    ('Tuyau PVC 100mm (6m)',  'BON', 60,  'VAHATRA'),
    ('Robinetterie (lot)',     'BON', 15,  'VAHATRA'),


    ('Câble électrique 2.5mm (rouleau)', 'BON', 18, 'BRICOTECH MAGASIN'),
    ('Disjoncteur 20A',       'BON', 40,  'BRICOTECH MAGASIN'),


    ('Ciment 50kg',           'BON', 300, 'DEPOT'),
    ('Fer à béton 12mm',      'BON', 250, 'DEPOT'),
    ('Sable de rivière (m3)', 'BON', 90,  'DEPOT'),
    ('Gravillon (m3)',        'BON', 70,  'DEPOT'),
    ('Brouette',              'BON', 10,  'DEPOT'),
    ('Pelle',                 'BON', 20,  'DEPOT'),
    ('Pioche',                'BON', 15,  'DEPOT'),
    ('Bétonnière',            'EN PANNE', 1, 'DEPOT')
ON CONFLICT DO NOTHING;


-- Vérification
SELECT chantier_actuel, COUNT(*) AS nb_articles, SUM(quantite) AS qte_totale
FROM materiels
GROUP BY chantier_actuel
ORDER BY chantier_actuel;
