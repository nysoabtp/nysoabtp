# NYSOA BTP — Tâches MVP

## J1-T1: Sécuriser clé Supabase (C1)
- [ ] Remplacer SUPABASE_KEY hardcodée par proxy Edge Function
- [ ] Ou ajouter RLS strictes : `USING (auth.role() = 'authenticated')`
- [ ] Supprimer les RLS `USING (true)` existantes
- Fichier: supabase.js

## J1-T2: Auth guard suivi-chantier (C4)
- [ ] Ajouter `await checkAuthOrRedirect(null)` en haut de suivi-chantier.html
- [ ] Supprimer le logout() local synchrone
- Fichier: suivi-chantier.html

## J1-T3: goToAdmin() sécurisé (I5)
- [ ] Remplacer vérification localStorage par `await checkAuthOrRedirect('admin')`
- Fichier: script.js

## J1-T4: QR Code sécurisé (I6)
- [ ] Remplacer `{id, nom, metier, chantier, salaire_journalier}` par `{id, nom}`
- [ ] Ajouter SELECT salaire_journalier FROM personnel au scan
- Fichier: script.js

## J2-T1: Table validations (N1)
- Exécuter: CREATE TABLE validations (id BIGSERIAL PRIMARY KEY, type TEXT NOT NULL, entite_id BIGINT, emetteur_role TEXT NOT NULL, emetteur_id TEXT, statut TEXT DEFAULT 'EN_ATTENTE', commentaire TEXT, motif_rejet TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), decided_at TIMESTAMPTZ, decided_by TEXT)

## J2-T2: Table devis + lignes (N2)
- Exécuter: CREATE TABLE devis (...) et CREATE TABLE devis_lignes (...)

## J2-T3: Colonne chantiers.devis_id (N3)
- Exécuter: ALTER TABLE chantiers ADD COLUMN devis_id + contrainte unique

## J2-T4: Table budget_felana (N4)
- Exécuter: CREATE TABLE budget_felana (...)

## J2-T5: Table conges (I3)
- Exécuter: CREATE TABLE conges (...)

## J2-T6: Colonnes personnel (N5, I2)
- Exécuter: ALTER TABLE personnel ADD chantier_id, compte_actif, statut_validation, type_salaire

## J2-T7: Colonnes caisse (m4)
- Exécuter: ALTER TABLE caisse ADD solde_debut, solde_fin

## J3-T1: Doublon id="budget" (C5)
- [ ] Renommer section id="budget" en id="budget-global" (ligne 271)
- [ ] Renommer section id="budget" en id="budget-chantier" (ligne 344)
- [ ] Mettre à jour toutes les références getElementById et querySelector
- [ ] Mettre à jour les nav-item data-section
- Fichier: daf.html

## J3-T2: Pointage manuel → bonne table (I1)
- [ ] Remplacer `db.from('pointage').insert(...)` par `db.from('pointage_attendance').insert(...)`
- [ ] Ajouter SELECT salaire_journalier FROM personnel avant insert
- [ ] Ajouter champ type_pointage = 'MANUEL'
- Fichier: script.js

## J3-T3: Type salaire explicite (I2)
- [ ] Supprimer seuil `salaire >= 100000 ? 'MENSUEL' : 'JOURNALIER'`
- [ ] Ajouter `<select name="type_salaire">` dans formulaire employé
- [ ] Lire `personnel.type_salaire` directement
- Fichiers: supabase.js, script.js

## J3-T4: Budgets localStorage → Supabase (C2)
- [ ] Supprimer `localStorage.setItem('nysoa_budgets', ...)`
- [ ] Remplacer par `db.from('budgets').upsert(...)`
- Fichier: daf.html

## J3-T5: Stock localStorage → Supabase (C3)
- [ ] Réécrire stockSave() : upsert vers db.from('materiels')
- [ ] Réécrire stockLoad() : SELECT * FROM materiels
- [ ] Conserver localStorage comme cache offline uniquement
- Fichier: stock.js

## J4-T1: Module Validations admin (N1)
- [ ] Ajouter section "Validations" dans admin.html
- [ ] Badge compteur "X en attente" dans navigation
- [ ] Tableau : Type, Émetteur, Date, Objet, Statut, Actions
- [ ] Fonction loadValidations() : SELECT * FROM validations WHERE statut = 'EN_ATTENTE'
- [ ] Fonction approuver(id, commentaire) → update statut + décision
- [ ] Fonction rejeter(id, motif) → update statut + motif_rejet
- [ ] Appliquer l'effet selon le type (activer chef, créer chantier, etc.)
- [ ] Historique avec filtres (rôle, type, date)
- Fichiers: admin.html, script.js

## J4-T2: Module Devis & Proforma (N2)
- [ ] Section "Devis & Proforma" dans daf.html
- [ ] Bouton "Nouveau devis" + formulaire (client, objet, lots, TVA, TTC)
- [ ] Tableau liste : Référence, Client, Montant, Statut, Actions
- [ ] Actions par statut (modifier, soumettre, PDF, envoyer, accepter/refuser)
- Fichier: daf.html

## J4-T3: Conversion Devis → Chantier (N3)
- [ ] Fonction convertirDevisEnChantier(devisId)
- [ ] Pré-remplissage fiche chantier (objet→nom, client, budget TTC, devis_id)
- [ ] Soumission à validation Admin
- [ ] Création effective après approbation
- Fichier: daf.html, script.js

## J5-T1: Comptes Chef scopés (N5)
- [ ] Onglet "Comptes chefs" dans rh.html
- [ ] Création compte : nom, email, mot de passe, sélection chantier
- [ ] Insertion dans personnel + validation Admin
- [ ] Scoping login : sessionStorage.setItem('chantier_id', ...)
- [ ] Filtrage RLS des requêtes par chantier_id
- Fichiers: rh.html, login.html, supabase.js

## J5-T2: Persister salaires (M4)
- [ ] Ajouter db.from('salaires').upsert() à la fin de calculateSalaries()
- Fichier: script.js

## J5-T3: Realtime complet (I7)
- [ ] Ajouter listeners postgres_changes pour materiels, personnel, chantiers, antoka, validations
- [ ] Déclencher refreshTable(table) à chaque changement
- Fichier: supabase.js

## J6-T1: Budget Felana (N4)
- [ ] Sous-onglet "Budget Felana" dans section Budget de daf.html
- [ ] Tableau : postes × mois avec montant prévu
- [ ] Calcul écart réel via journal (jointure par poste + mois)
- [ ] Alerte dépassement (seuil configurable)
- [ ] Cycle : BROUILLON → SOUMIS → APPROUVE → ACTIF
- Fichier: daf.html

## J6-T2: KPI Bénéfice net (N6)
- [ ] Fonction loadKpiBenefice() : recettes − dépenses
- [ ] Affichage en vert/rouge selon signe
- Fichier: admin.html

## J6-T3: Centraliser devis (I4)
- [ ] Supprimer soumission devis dans script.js
- [ ] Tout centraliser dans devis.js
- [ ] File d'attente offline (IndexedDB) pour sync
- Fichiers: script.js, devis.js

## J6-T4: PDF paie netFinal correct (m2)
- [ ] Passer netFinal en paramètre à exportPayslipPDF()
- [ ] Utiliser netFinal au lieu de emp.net dans le PDF
- Fichier: script.js
