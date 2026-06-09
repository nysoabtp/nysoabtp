-- ============================================================
-- SEED_DATA.sql — Données de test par scénario rôle
-- Exécuter dans Supabase SQL Editor après SUPABASE_SETUP.sql
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. CHANTIERS (23 uniques)
-- ══════════════════════════════════════════════════════════════
INSERT INTO chantiers (nom, code, client, budget, statut, progression) VALUES
    ('AMBATOMAINTY',       'CH-001', 'Mairie Ambatomainty',   150000000, 'EN COURS', 35),
    ('TRANO CHEF',         'CH-002', 'Chef de Région',        200000000, 'EN COURS', 50),
    ('AINA & DOMOINA',     'CH-003', 'Aina SARL',              80000000, 'EN COURS', 20),
    ('VAHATRA',            'CH-004', 'FJKM Vahatra',           95000000, 'EN COURS', 65),
    ('GASTRO AMBOHIMENA',  'CH-005', 'Gastro SARL',           120000000, 'EN PAUSE', 40),
    ('BRICOTECH MAGASIN',  'CH-006', 'Bricotech',             180000000, 'EN COURS', 15),
    ('DEPOT',              'CH-007', 'NySoa BTP',              50000000,  'EN COURS', 80),
    ('ANOSIBE',            'CH-008', 'Mairie Anosibe',         70000000,  'TERMINE', 100),
    ('FIANARANTSOA CENTRE', 'CH-009','Ville Fianar',          250000000, 'EN COURS', 10),
    ('ANTSIRABE',          'CH-010', 'Mairie Antsirabe',       110000000, 'EN PAUSE', 55)
ON CONFLICT (nom) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 2. PERSONNEL (par chantier, pour chaque rôle scénario)
-- ══════════════════════════════════════════════════════════════
INSERT INTO personnel (nom, metier, chantier, date_embauche, salaire_journalier, type_salaire) VALUES
    -- Équipe AMBATOMAINTY (scope Chef)
    ('Rakoto Jean',       'Maçon',        'AMBATOMAINTY', '2025-01-15', 25000, 'JOURNALIER'),
    ('Rasoa Marie',       'Femme de peine','AMBATOMAINTY', '2025-02-01', 15000, 'JOURNALIER'),
    ('Randria Paul',      'Chef d\'équipe','AMBATOMAINTY', '2024-11-01', 35000, 'MENSUEL'),
    ('Ravoavy Lala',      'Peintre',       'AMBATOMAINTY', '2025-03-10', 22000, 'JOURNALIER'),
    ('Rakotoson Koto',    'Chauffeur',     'AMBATOMAINTY', '2025-01-20', 20000, 'JOURNALIER'),
    ('Randrianarisoa Bema','Garde',        'AMBATOMAINTY', '2025-04-01', 12000, 'JOURNALIER'),
    ('Ramiandrisoa Vo',   'Maçon',        'AMBATOMAINTY', '2025-02-15', 25000, 'JOURNALIER'),
    ('Rajanera Tafita',   'Menuisier',     'AMBATOMAINTY', '2025-03-01', 28000, 'JOURNALIER'),
    ('Rahaingo Solo',     'Plombier',     'AMBATOMAINTY', '2025-04-10', 30000, 'JOURNALIER'),
    ('Rakotomalala Faly', 'Électricien',  'AMBATOMAINTY', '2025-05-01', 32000, 'JOURNALIER'),

    -- Équipe TRANO CHEF
    ('Rabe Pierre',       'Maçon',        'TRANO CHEF',   '2025-01-10', 25000, 'JOURNALIER'),
    ('Rasolofo Emma',     'Femme de peine','TRANO CHEF',   '2025-02-05', 15000, 'JOURNALIER'),
    ('Rakotobe James',    'Chef d\'équipe','TRANO CHEF',   '2024-10-01', 35000, 'MENSUEL'),
    ('Randrianaivo Soa',  'Peintre',       'TRANO CHEF',   '2025-03-15', 22000, 'JOURNALIER'),

    -- Équipe VAHATRA
    ('Razafy Mamy',       'Maçon',        'VAHATRA',      '2025-01-05', 25000, 'JOURNALIER'),
    ('Ravoahangy Haja',   'Femme de peine','VAHATRA',      '2025-02-10', 15000, 'JOURNALIER'),
    ('Ranaivoson Niry',   'Chef d\'équipe','VAHATRA',      '2024-09-01', 35000, 'MENSUEL'),
    ('Rakotoarisoa Bema', 'Charpentier',  'VAHATRA',      '2025-03-20', 30000, 'JOURNALIER'),

    -- Personnel administratif (pas de chantier)
    ('Rasamison Liva',    'Comptable',     NULL,           '2024-06-01', 500000, 'MENSUEL'),
    ('Ravelojaona Mino',  'Secrétaire',    NULL,           '2024-07-01', 400000, 'MENSUEL'),
    ('Randrianasolo Mamy','Chef RH',       NULL,           '2024-05-15', 600000, 'MENSUEL')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. POINTAGE (30 derniers jours, équipe AMBATOMAINTY)
-- ══════════════════════════════════════════════════════════════
INSERT INTO pointage (date, chantier, nom_employe, type_pointage, salaire_journalier, nb_jours)
SELECT
    d::date,
    'AMBATOMAINTY',
    p.nom,
    'Présent',
    p.salaire_journalier,
    1
FROM generate_series(CURRENT_DATE - 30, CURRENT_DATE - 1, '1 day'::interval) AS d
CROSS JOIN (
    SELECT nom, salaire_journalier FROM personnel WHERE chantier = 'AMBATOMAINTY'
) p
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 6  -- Lundi à Samedi
  AND random() < 0.85  -- 85% de présence
LIMIT 200
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 4. JOURNAL COMPTABLE (écritures DAF)
-- ══════════════════════════════════════════════════════════════
INSERT INTO journal (date, chantier, designation, montant, categorie, mode_paiement) VALUES
    (CURRENT_DATE - 5,  'AMBATOMAINTY', 'Achat ciment 50 sacs',     1250000, 'Approvisionnement', 'Espèce'),
    (CURRENT_DATE - 5,  'AMBATOMAINTY', 'Achat fers à béton',       2400000, 'Approvisionnement', 'Chèque'),
    (CURRENT_DATE - 4,  'AMBATOMAINTY', 'Paie ouvriers S22',        3250000, 'Salaire',           'Virement'),
    (CURRENT_DATE - 3,  'AMBATOMAINTY', 'Location pelleteuse',       800000, 'Location',          'Espèce'),
    (CURRENT_DATE - 2,  'TRANO CHEF',   'Achat briques 1000u',      1500000, 'Approvisionnement', 'Chèque'),
    (CURRENT_DATE - 2,  'TRANO CHEF',   'Paie ouvriers S22',        2800000, 'Salaire',           'Virement'),
    (CURRENT_DATE - 7,  'VAHATRA',      'Achat peinture 20L',        450000, 'Approvisionnement', 'Espèce'),
    (CURRENT_DATE - 7,  'VAHATRA',      'Paie ouvriers S21',        2600000, 'Salaire',           'Virement'),
    (CURRENT_DATE - 10, 'AMBATOMAINTY', 'Transport matériaux',       350000, 'Transport',         'Espèce'),
    (CURRENT_DATE - 10, 'AMBATOMAINTY', 'Carburant groupe',          280000, 'Carburant',         'Espèce'),
    (CURRENT_DATE - 1,  NULL,          'Frais bancaires',            50000,  'Frais',             'Prélèvement'),
    (CURRENT_DATE - 1,  NULL,          'Électricité bureau',        180000,  'Facture',           'Chèque'),
    (CURRENT_DATE - 3,  'AMBATOMAINTY', 'Achat bois coffrage',       680000, 'Approvisionnement', 'Espèce'),
    (CURRENT_DATE - 6,  'GASTRO AMBOHIMENA', 'Achat carreaux',      2100000, 'Approvisionnement', 'Chèque'),
    (CURRENT_DATE - 6,  'GASTRO AMBOHIMENA', 'Maintenance grue',    1200000, 'Maintenance',       'Virement'),
    (CURRENT_DATE - 15, 'AMBATOMAINTY', 'Paie mensuels Juin',       5200000, 'Salaire',           'Virement'),
    (CURRENT_DATE - 15, 'TRANO CHEF',   'Paie mensuels Juin',       4800000, 'Salaire',           'Virement'),
    (CURRENT_DATE - 15, 'VAHATRA',      'Paie mensuels Juin',       5100000, 'Salaire',           'Virement'),
    (CURRENT_DATE - 20, 'AMBATOMAINTY', 'Achat tôles 50u',          3500000, 'Approvisionnement', 'Chèque'),
    (CURRENT_DATE - 20, 'AMBATOMAINTY', 'Catering équipe',           250000, 'Cantine',           'Espèce')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 5. SALAIRES (paie du mois courant)
-- ══════════════════════════════════════════════════════════════
INSERT INTO salaires (employe_nom, employe_id, mois, annee, nb_jours, salaire_base, net_a_payer)
SELECT
    p.nom,
    p.id,
    EXTRACT(MONTH FROM CURRENT_DATE)::integer,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
    22,
    CASE WHEN p.type_salaire = 'MENSUEL' THEN p.salaire_journalier ELSE p.salaire_journalier * 22 END,
    CASE WHEN p.type_salaire = 'MENSUEL' THEN p.salaire_journalier ELSE p.salaire_journalier * 22 END
FROM personnel p
WHERE p.actif = true
  AND (p.chantier = 'AMBATOMAINTY' OR p.chantier IS NULL)
  AND NOT EXISTS (
    SELECT 1 FROM salaires s WHERE s.employe_nom = p.nom
      AND s.mois = EXTRACT(MONTH FROM CURRENT_DATE)::integer
      AND s.annee = EXTRACT(YEAR FROM CURRENT_DATE)::integer
  )
LIMIT 20
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 6. RAPPORTS CHANTIER (pour Chef)
-- ══════════════════════════════════════════════════════════════
INSERT INTO rapports_chantier (date, chantier, meteo, ouvriers, travaux, problemes, actions) VALUES
    (CURRENT_DATE - 1, 'AMBATOMAINTY', 'Ensoleillé', 8,
     'Fondations coulées, coffrage étage en cours',
     'Retard livraison ciment',
     'Contacté fournisseur, livraison demain matin'),
    (CURRENT_DATE - 2, 'AMBATOMAINTY', 'Nuageux', 7,
     'Ferraillage poutres, installation échafaudage',
     NULL, NULL),
    (CURRENT_DATE - 3, 'AMBATOMAINTY', 'Pluie matin', 5,
     'Travaux intérieurs : électricité, plomberie',
     'Infiltration toiture existante',
     'Prévoir réfection toit semaine prochaine'),
    (CURRENT_DATE - 1, 'TRANO CHEF', 'Ensoleillé', 4,
     'Finition peinture, pose carrelage',
     NULL, NULL),
    (CURRENT_DATE - 2, 'VAHATRA', 'Ensoleillé', 3,
     'Charpente terminée, pose tôles débutée',
     NULL, NULL)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 7. CONTROLES INOPINES (pour Contrôleur)
-- ══════════════════════════════════════════════════════════════
INSERT INTO controles_inopines (chantier, datetime, controleur, chef_present, observations, score) VALUES
    ('AMBATOMAINTY',   CURRENT_TIMESTAMP - INTERVAL '2 days', 'controleur@nysoa.mg', 'Rakoto Jean',
     'Casques portés, échafaudage conforme, câbles apparents à sécuriser', 85),
    ('AMBATOMAINTY',   CURRENT_TIMESTAMP - INTERVAL '7 days', 'controleur@nysoa.mg', 'Randria Paul',
     'Bon ordre général, extinteurs à vérifier', 90),
    ('TRANO CHEF',     CURRENT_TIMESTAMP - INTERVAL '3 days', 'controleur@nysoa.mg', 'Rabe Pierre',
     'Non conforme : absence de garde-corps, câbles électriques non protégés', 45),
    ('VAHATRA',        CURRENT_TIMESTAMP - INTERVAL '5 days', 'controleur@nysoa.mg', 'Ranaivoson Niry',
     'Conforme : EPI portés, zone chantier bien délimitée', 95),
    ('AMBATOMAINTY',   CURRENT_TIMESTAMP - INTERVAL '14 days','controleur@nysoa.mg', 'Randria Paul',
     'Stock bien rangé, registre à jour', 88)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 8. GANTT TÂCHES (planning chantier)
-- ══════════════════════════════════════════════════════════════
INSERT INTO gantt_taches (tache, chantier, debut, fin, avancement, couleur, responsable) VALUES
    ('Fondations',            'AMBATOMAINTY', CURRENT_DATE - 30, CURRENT_DATE - 15, 100, 'green',  'Rakoto Jean'),
    ('Murs porteurs',         'AMBATOMAINTY', CURRENT_DATE - 20, CURRENT_DATE - 5,  80,  'blue',   'Randria Paul'),
    ('Toiture',               'AMBATOMAINTY', CURRENT_DATE - 10, CURRENT_DATE + 10, 30,  'orange', 'Rakoto Jean'),
    ('Électricité',           'AMBATOMAINTY', CURRENT_DATE - 5,  CURRENT_DATE + 15, 10,  'red',    'Rakotomalala Faly'),
    ('Plomberie',             'AMBATOMAINTY', CURRENT_DATE,      CURRENT_DATE + 20, 0,   'gray',   'Rahaingo Solo'),
    ('Finition peinture',     'AMBATOMAINTY', CURRENT_DATE + 15, CURRENT_DATE + 30, 0,   'gray',   'Ravoavy Lala'),
    ('Fondations',            'TRANO CHEF',   CURRENT_DATE - 25, CURRENT_DATE - 10, 100, 'green',  'Rabe Pierre'),
    ('Murs',                  'TRANO CHEF',   CURRENT_DATE - 15, CURRENT_DATE,      60,  'blue',   'Rakotobe James'),
    ('Toiture',               'TRANO CHEF',   CURRENT_DATE + 5,  CURRENT_DATE + 20, 0,   'gray',   'Rabe Pierre'),
    ('Charpente',             'VAHATRA',      CURRENT_DATE - 20, CURRENT_DATE - 5,  100, 'green',  'Ranaivoson Niry'),
    ('Couverture',            'VAHATRA',      CURRENT_DATE - 10, CURRENT_DATE + 5,  70,  'blue',   'Rakotoarisoa Bema')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 9. STOCKS CHANTIER (matériaux par chantier)
-- ══════════════════════════════════════════════════════════════
INSERT INTO stocks_chantier (chantier, materiau, quantite, unite, seuil_alerte) VALUES
    ('AMBATOMAINTY', 'Ciment CPJ 42.5',    120, 'sac',    30),
    ('AMBATOMAINTY', 'Fers à béton 10mm',  80,  'barre',  20),
    ('AMBATOMAINTY', 'Briques pleines',    1500,'unité',  300),
    ('AMBATOMAINTY', 'Sable fin',          5,   'm3',     2),
    ('AMBATOMAINTY', 'Gravier 15/25',      8,   'm3',     2),
    ('AMBATOMAINTY', 'Peinture blanche',   10,  'L',      5),
    ('TRANO CHEF',   'Ciment CPJ 42.5',    45,  'sac',    30),
    ('TRANO CHEF',   'Carreaux 33x33',     200, 'unité',  50),
    ('VAHATRA',      'Tôles bac acier',    40,  'unité',  10),
    ('VAHATRA',      'Bois charpente',     3,   'm3',     1)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 10. COMMANDES / ACHATS
-- ══════════════════════════════════════════════════════════════
INSERT INTO commandes (date, chantier, libelle, quantite, prix_unitaire, fournisseur, statut) VALUES
    (CURRENT_DATE - 5,  'AMBATOMAINTY', 'Ciment CPJ 42.5',     50,  25000, 'Fournisseur Tanà',  'LIVRÉE'),
    (CURRENT_DATE - 3,  'AMBATOMAINTY', 'Fers à béton 10mm',   40,  12000, 'Acier Malagasy',     'LIVRÉE'),
    (CURRENT_DATE - 1,  'AMBATOMAINTY', 'Briques pleines',     2000, 650,  'Briqueterie Fianar', 'EN ATTENTE'),
    (CURRENT_DATE - 7,  'TRANO CHEF',   'Peinture acrylique',  20,  35000, 'Peintures Mad',      'LIVRÉE'),
    (CURRENT_DATE - 2,  'VAHATRA',      'Tôles bac acier',     30,  45000, 'Tôles Malagasy',     'EN ATTENTE')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 11. VALIDATIONS (demandes Chef pour Admin)
-- ══════════════════════════════════════════════════════════════
INSERT INTO validations (type, emetteur_role, emetteur_id, chantier, commentaire, statut, created_at) VALUES
    ('Achat urgents',       'chef', 1, 'AMBATOMAINTY', 'Achat ciment supplémentaire urgence',        'APPROUVE',   CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('Recrutement',         'chef', 1, 'AMBATOMAINTY', 'Besoin d\'un maçon supplémentaire',           'EN_ATTENTE', CURRENT_TIMESTAMP - INTERVAL '2 days'),
    ('Location engin',      'chef', 1, 'AMBATOMAINTY', 'Location pelleteuse pour terrassement',       'EN_ATTENTE', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('Achat matériaux',     'chef', 1, 'TRANO CHEF',   'Complément carrelage salle',                  'REFUSE',     CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 12. CAISSE (mouvements trésorerie)
-- ══════════════════════════════════════════════════════════════
INSERT INTO caisse (date, designation, montant, type, solde_debut, solde_fin) VALUES
    (CURRENT_DATE,  'Solde initial',        5000000, 'entree', 0,        5000000),
    (CURRENT_DATE - 5, 'Achat ciment',      1250000, 'sortie', 5000000, 3750000),
    (CURRENT_DATE - 4, 'Achat fer',         2400000, 'sortie', 3750000, 1350000),
    (CURRENT_DATE - 3, 'Location pelleteuse',800000, 'sortie', 1350000,  550000),
    (CURRENT_DATE - 1, 'Apport DAF',        3000000, 'entree', 550000,  3550000)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- VÉRIFICATION : données insérées
-- ══════════════════════════════════════════════════════════════
SELECT 'chantiers' AS tbl, COUNT(*) FROM chantiers
UNION ALL SELECT 'personnel', COUNT(*) FROM personnel
UNION ALL SELECT 'pointage', COUNT(*) FROM pointage
UNION ALL SELECT 'journal', COUNT(*) FROM journal
UNION ALL SELECT 'salaires', COUNT(*) FROM salaires
UNION ALL SELECT 'rapports_chantier', COUNT(*) FROM rapports_chantier
UNION ALL SELECT 'controles_inopines', COUNT(*) FROM controles_inopines
UNION ALL SELECT 'gantt_taches', COUNT(*) FROM gantt_taches
UNION ALL SELECT 'stocks_chantier', COUNT(*) FROM stocks_chantier
UNION ALL SELECT 'commandes', COUNT(*) FROM commandes
UNION ALL SELECT 'validations', COUNT(*) FROM validations
UNION ALL SELECT 'caisse', COUNT(*) FROM caisse
ORDER BY tbl;
