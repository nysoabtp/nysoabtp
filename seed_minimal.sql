-- Seed minimal pour démo fonctionnelle

-- Chantiers
INSERT INTO chantiers (id, nom, code, client, budget, debut, fin, statut, progression, actif) VALUES
  (1, 'AMBATOMAINTY', 'AMB-001', 'Commune Ambatomainty', 50000000, '2026-01-15', '2026-09-30', 'EN COURS', 45, true),
  (2, 'ANTSENAKELY', 'ANT-001', 'Société Antsenakely', 35000000, '2026-02-01', '2026-08-15', 'EN COURS', 30, true),
  (3, 'TRANO', 'TRA-001', 'Mairie Trano', 25000000, '2026-03-01', '2026-07-31', 'EN COURS', 20, true);

-- Personnel
INSERT INTO personnel (id, nom, metier, chantier, date_embauche, salaire_journalier, type_salaire, actif, statut_validation) VALUES
  (1, 'Rakoto Jean', 'Maçon', 'AMBATOMAINTY', '2025-06-01', 15000, 'JOURNALIER', true, 'VALIDE'),
  (2, 'Rasoa Marie', 'Conducteur d''engins', 'AMBATOMAINTY', '2025-07-15', 25000, 'JOURNALIER', true, 'VALIDE'),
  (3, 'Randria Paul', 'Électricien', 'ANTSENAKELY', '2025-08-01', 18000, 'JOURNALIER', true, 'VALIDE'),
  (4, 'Rabe Pierre', 'Plombier', 'ANTSENAKELY', '2025-09-01', 16000, 'JOURNALIER', true, 'VALIDE'),
  (5, 'Ranaivoson Niry', 'Manouvre', 'AMBATOMAINTY', '2025-10-01', 10000, 'JOURNALIER', true, 'VALIDE'),
  (6, 'Andria Lala', 'Chef d''équipe', 'TRANO', '2025-11-01', 20000, 'JOURNALIER', true, 'VALIDE');

-- Journal
INSERT INTO journal (date, chantier, designation, montant, mode_paiement, categorie) VALUES
  ('2026-06-01', 'AMBATOMAINTY', 'Avance client', 10000000, 'VIREMENT', 'RECETTE'),
  ('2026-06-02', 'AMBATOMAINTY', 'Achat ciment', -2500000, 'CHEQUE', 'MATERIAUX'),
  ('2026-06-03', 'AMBATOMAINTY', 'Paie juin S1', -1800000, 'ESPECE', 'SALAIRE'),
  ('2026-06-01', 'ANTSENAKELY', 'Avance client', 7000000, 'VIREMENT', 'RECETTE'),
  ('2026-06-02', 'ANTSENAKELY', 'Fers à béton', -1500000, 'CHEQUE', 'MATERIAUX'),
  ('2026-06-01', 'TRANO', 'Avance client', 5000000, 'VIREMENT', 'RECETTE');

-- Caisse
INSERT INTO caisse (date, designation, montant) VALUES
  ('2026-06-01', 'Solde initial AMBATOMAINTY', 5000000),
  ('2026-06-02', 'Achat petits matériels', -500000),
  ('2026-06-03', 'Transport personnel', -200000),
  ('2026-06-01', 'Solde initial ANTSENAKELY', 3000000),
  ('2026-06-02', 'Carburant', -400000),
  ('2026-06-01', 'Solde initial TRANO', 2000000);

-- Matériels
INSERT INTO materiels (libelle, etat, quantite, chantier_actuel, prix_unitaire, seuil_alerte) VALUES
  ('Ciment CPJ 42.5', 'EN MARCHE', 150, 'AMBATOMAINTY', 25000, 20),
  ('Fers à béton 12mm', 'EN MARCHE', 200, 'AMBATOMAINTY', 15000, 30),
  ('Briques', 'EN MARCHE', 5000, 'AMBATOMAINTY', 500, 500),
  ('Sable', 'EN MARCHE', 20, 'AMBATOMAINTY', 35000, 5),
  ('Ciment CPJ 42.5', 'EN MARCHE', 100, 'ANTSENAKELY', 25000, 20),
  ('Fers à béton 10mm', 'EN MARCHE', 150, 'ANTSENAKELY', 12000, 20),
  ('Ciment CPJ 42.5', 'EN MARCHE', 80, 'TRANO', 25000, 10);

-- Pointage (table hebdomadaire)
INSERT INTO pointage (chantier, nom_employe, nb_jours, salaire_journalier, a_payer, date) VALUES
  ('AMBATOMAINTY', 'Rakoto Jean', 5, 15000, 75000, '2026-06-08'),
  ('AMBATOMAINTY', 'Rasoa Marie', 5, 25000, 125000, '2026-06-08'),
  ('AMBATOMAINTY', 'Ranaivoson Niry', 4, 10000, 40000, '2026-06-08'),
  ('ANTSENAKELY', 'Randria Paul', 5, 18000, 90000, '2026-06-08'),
  ('ANTSENAKELY', 'Rabe Pierre', 5, 16000, 80000, '2026-06-08');

-- Devis (IDs explicites pour les lots)
INSERT INTO devis (id, numero, client, objet, chantier_id, statut, date, total) VALUES
  (1, 'DEV-2026-001', 'Commune Ambatomainty', 'Construction mur de soutènement', 1, 'ACCEPTE', '2026-05-15', 17700000),
  (2, 'DEV-2026-002', 'Société Antsenakely', 'Rénovation bureau', 2, 'SOUMIS', '2026-05-20', 10030000);

INSERT INTO devis_lots (id, devis_id, num, titre, position) VALUES
  (1, 1, 1, 'Maçonnerie', 1),
  (2, 1, 2, 'Ferraillage', 2),
  (3, 2, 1, 'Électricité', 1),
  (4, 2, 2, 'Plomberie', 2);

INSERT INTO devis_lignes (lot_id, devis_id, designation, unite, quantite, prix_unitaire) VALUES
  (1, 1, 'Mur parpaing 20cm', 'm²', 50, 120000),
  (1, 1, 'Fondation', 'm³', 30, 150000),
  (2, 1, 'Acier HA12', 'kg', 800, 5000),
  (3, 2, 'Câble 2.5mm²', 'm', 200, 3000),
  (4, 2, 'Tuyau PVC 32mm', 'm', 50, 8000);

-- Contrôles inopinés
INSERT INTO controles_inopines (chantier, datetime, controleur, observations) VALUES
  ('AMBATOMAINTY', '2026-06-09 10:00', 'controleur@nysoa.mg', 'Type: Structure - Conforme. Bonne exécution.'),
  ('ANTSENAKELY', '2026-06-08 14:30', 'controleur@nysoa.mg', 'Type: Électricité - Non conforme. Câblage à reprendre.');

-- Validations (workflow matériaux + recrutement)
INSERT INTO validations (type, statut, emetteur_role, emetteur_id, commentaire) VALUES
  ('materiaux', 'EN_ATTENTE', 'chef', 'AMBATOMAINTY', 'Ciment|20 sacs|Urgence: Normale'),
  ('recrutement', 'APPROUVE', 'chef', 'AMBATOMAINTY', 'Maçon|2 pers., 3 mois|Extension équipe');

-- Budget FELANA
INSERT INTO budget_felana (chantier_id, poste, annee, mois, montant_prevu, montant_reel, statut) VALUES
  (1, 'materiaux', 2026, 6, 5000000, 2500000, 'ACTIF'),
  (1, 'main_oeuvre', 2026, 6, 3000000, 1800000, 'ACTIF'),
  (2, 'materiaux', 2026, 6, 3500000, 1500000, 'ACTIF');

-- Commandes
INSERT INTO commandes (chantier, fournisseur, libelle, quantite, prix_unitaire, prix, statut) VALUES
  ('AMBATOMAINTY', 'Quincaillerie Antsirabe', 'Ciment CPJ 42.5', 50, 25000, 1250000, 'VALIDEE'),
  ('ANTSENAKELY', 'Acier Madagascar', 'Fers à béton 12mm', 100, 15000, 1500000, 'EN_ATTENTE');
