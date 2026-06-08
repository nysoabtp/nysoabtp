# NYSOA BTP — Spécification Fonctionnelle v4

## Contexte
ERP de gestion de chantier BTP pour PME malgache. Stack : Vanilla JS + Supabase + GitHub Pages + PWA. 6 rôles avec validation centralisée via Admin.

## Rôles et fichiers

| Rôle | Fichier | Responsabilités |
|------|---------|-----------------|
| Admin | admin.html | Validation centralisée, KPI globaux, gestion utilisateurs, import/export, Gantt |
| DAF | daf.html | Comptabilité, Budget Felana, Devis & Proforma, Caisse, Crédits, Antoka |
| RH | rh.html | Employés, Comptes chefs scopés, Congés, Recrutement, Paie |
| Chef de chantier | chef-chantier.html | Pointage, matériaux, rapports, planning — scopé à 1 chantier |
| Contrôleur | controleur.html | Inspections qualité/sécurité |
| Technicien | technicien.html | Interventions, tâches, rapports terrain |

## Circuit de validation (NOUVEAU)
Toutes les demandes transitent par une table `validations` et sont approuvées/rejetées par Admin :

| Émetteur | Type de demande | Table |
|----------|-----------------|-------|
| Chef chantier | Demande matériaux | validations |
| Chef chantier | Demande recrutement | validations |
| DAF | Écriture comptable | validations |
| DAF | Devis/Proforma | validations + devis |
| DAF | Conversion Devis→Chantier | validations + chantiers |
| RH | Création compte chef | validations + personnel |
| RH | Demande congé | validations + conges |
| Technicien | Rapport intervention | validations |
| Contrôleur | Rapport inspection | validations |

**Cycle de vie**: EN_ATTENTE → APPROUVE (commentaire optionnel) / REJETE (motif requis) → ARCHIVE

## Modules à implémenter

### N1 — Circuit de validation (Admin)
- Badge compteur "X en attente"
- Tableau : Type, Émetteur, Date, Objet, Statut, Actions
- ✅ Approuver (commentaire optionnel) / ❌ Rejeter (motif obligatoire)
- Historique (filtre par rôle, type, date)

### N2 — Devis & Proforma (DAF)
- Création : client, objet, lots (désignation, qté, PU), TVA, total TTC
- Cycle : BROUILLON → SOUMIS → APPROUVE → ENVOYE → ACCEPTE/REFUSE
- Actions par statut : modifier, soumettre, exporter PDF, enregistrer réponse
- Conversion Devis ACCEPTE → Chantier (N3)

### N3 — Conversion Devis → Chantier
- Pré-remplissage : nom ← objet, client ← client, budget ← montant TTC
- Soumis à validation Admin avant création
- Traçabilité via `chantiers.devis_id` (contrainte unique)

### N4 — Budget Felana (DAF)
- Tableau : postes (matériaux, main-d'oeuvre, équipements, divers) × mois
- Comparaison automatique réel vs prévu via journal comptable
- Alerte dépassement (seuil configurable en %)
- Cycle : BROUILLON → SOUMIS → APPROUVE → ACTIF

### N5 — Compte Chef scopé (RH)
- Création compte avec `chantier_id` obligatoire
- 1 chef ↔ 1 chantier (filtrage RLS automatique)
- Cycle : EN_ATTENTE → APPROUVE (activation) / REJETE
- Désactivation possible

### N6 — KPI Bénéfice net (Admin)
- Calcul dynamique : Recettes − Dépenses
- Indicateur coloré : vert (positif) / rouge (négatif)

## Anomalies critiques à corriger

| ID | Problème | Fichier | Correction |
|----|----------|---------|------------|
| C1 | Clé Supabase hardcodée | supabase.js:9 | Proxy / RLS strictes |
| C2 | Budgets localStorage | daf.html:773 | Migrer vers Supabase |
| C3 | Stock localStorage | stock.js:11 | Migrer vers materiels |
| C4 | suivi-chantier.html sans auth | suivi-chantier.html:776 | checkAuthOrRedirect() |
| C5 | Doublon id="budget" | daf.html:271,344 | Renommer sections |
| I1 | Pointage mauvaise table | script.js:716 | → pointage_attendance |
| I2 | Type salaire par seuil | supabase.js:200 | Champ type_salaire explicite |
| I3 | Table conges manquante | SUPABASE_SETUP.sql | CREATE TABLE conges |
| I4 | Devis double écriture | script.js:844, devis.js | Centraliser devis.js |
| I5 | goToAdmin() falsifiable | script.js:1555 | checkAuthOrRedirect() |
| I6 | QR Code salaire exposé | script.js:736 | Encode {id, nom} uniquement |
| I7 | Realtime incomplet | supabase.js:149 | Ajouter listeners |

## Parcours utilisateur (8 phases)

1. **Authentification** — login.html avec redirection par rôle
2. **Création chantier** — Admin crée, DAF fait devis → conversion
3. **Gestion RH** — RH crée employés + comptes chefs, Admin valide
4. **Opérations quotidiennes** — Pointage (QR/manuel), matériaux, rapports
5. **Finances & compta** — Journal, caisse, crédits, antoka, budget Felana
6. **Calcul salaires** — Agrégation pointages → net (brut − déductions CNaPS/OSTIE)
7. **Suivi & contrôle** — Inspections qualité/sécurité, Gantt, rapports
8. **Administration** — Import Excel, sauvegarde, gestion utilisateurs

## Plan MVP — 6 jours

**J1** — Sécurité & infrastructure : C1, C4, I5, I6
**J2** — Base de données : toutes les tables SQL
**J3** — Bugs critiques code : C5, I1, I2, C2, C3
**J4** — Modules prioritaires : N1 (validations), N2+N3 (devis → chantier)
**J5** — Modules importants : N5 (chefs scopés), M4, I7
**J6** — Modules complémentaires : N4 (Felana), N6 (KPI), I4, m2

## Schémas SQL

Voir `docs/supabase-schema.sql` pour les CREATE TABLE et ALTER TABLE complets.
