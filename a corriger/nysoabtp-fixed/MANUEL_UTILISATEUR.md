# Manuel d'utilisation — ERP NySoa BTP

---

## Sommaire

1. [Connexion](#1-connexion)
2. [Rôles et accès](#2-rôles-et-accès)
3. [Administrateur](#3-administrateur)
4. [DAF — Direction Administrative et Financière](#4-daf--direction-administrative-et-financière)
5. [RH — Ressources Humaines](#5-rh--ressources-humaines)
6. [Chef de chantier](#6-chef-de-chantier)
7. [Contrôleur](#7-contrôleur)
8. [Technicien](#8-technicien)
9. [Fonctions transverses](#9-fonctions-transverses)
10. [Dépannage](#10-dépannage)

---

## 1. Connexion

### Page de connexion
- URL : `login.html`
- Saisir **email** et **mot de passe**
- Cliquer **Se connecter**

### Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Administrateur | `admin@nysoa.mg` | `admin123` |
| DAF | `daf@nysoa.mg` | `daf123` |
| RH | `rh@nysoa.mg` | `rh123` |
| Chef chantier | `chef@nysoa.mg` | `chef123` |
| Contrôleur | `controleur@nysoa.mg` | `controleur123` |
| Technicien | `technicien@nysoa.mg` | `tech123` |

Cliquer sur un email pour le remplir automatiquement, puis saisir le mot de passe.

---

## 2. Rôles et accès

Chaque rôle a son propre tableau de bord, accessible après connexion :

| Rôle | Page | Rôle |
|------|------|------|
| **Admin** | `admin.html` | Gère les utilisateurs, imports, backups, contrôles, validations |
| **DAF** | `daf.html` | Comptabilité, budgets, devis, factures, rapports financiers |
| **RH** | `rh.html` | Employés, paie, congés, formations, recrutement |
| **Chef chantier** | `chef-chantier.html` | Gère son chantier : équipe, pointage, matériaux, planning |
| **Contrôleur** | `controleur.html` | Inspections qualité/sécurité sur tous les chantiers |
| **Technicien** | `technicien.html` | Projets, tâches, interventions techniques |

### Scope chantier (Chef)
Le Chef de chantier voit uniquement les données de **son chantier**.
- Le chantier est défini dans `user_metadata.chantier` (JWT)
- Toutes ses requêtes sont filtrées automatiquement par RLS (Row Level Security)
- Exemple : un chef affecté à `AMBATOMAINTY` ne voit que les employés, pointages et stocks de ce chantier

---

## 3. Administrateur

### Dashboard
La sidebar contient 9 sections :

#### Import Excel
1. Cliquer **Import Excel**
2. Sélectionner un fichier `.xlsx`
3. Cliquer **Importer**
4. Les données sont chargées dans la base Supabase

#### Sauvegarde
1. Cliquer **Sauvegarde**
2. Cliquer **Sauvegarder maintenant**
3. Les données sont exportées

#### Supabase
Affiche la configuration Supabase (URL, statut de connexion).

#### Utilisateurs — Gestion des comptes
Créer un nouvel utilisateur :
1. Remplir le formulaire :
   - **Email** (ou laisser vide pour génération automatique)
   - **Mot de passe**
   - **Rôle** : admin, daf, rh, chef, controleur, technicien
   - **Chantier** (uniquement pour le rôle chef)
2. Cliquer **Créer l'utilisateur**

Remarques :
- L'email est généré automatiquement depuis le nom du chantier pour les chefs (ex: `ambatomainty@nysoa.mg`)
- Le compte est créé dans Supabase Auth + un profil dans la table `personnel`

#### Rapports Chantier
Liste tous les rapports de chantier. Filtres disponibles.

#### Contrôles
Liste tous les contrôles inopinés effectués par les contrôleurs.

#### Validations
Filtres : En attente, Approuvé, Refusé.

#### Avancement Gantt
Diagramme de Gantt de l'avancement des chantiers.

---

## 4. DAF — Direction Administrative et Financière

### Dashboard
Indicateurs financiers : budget, dépenses, recettes.

### Sections

#### Comptabilité
- **Journal comptable** : liste toutes les écritures
- **Nouvelle écriture** : ajouter une ligne (date, libellé, débit, crédit, catégorie, chantier)
- **Filtres** : par type (Recette/Dépense), chantier, catégorie

#### Budget
Gestion budgétaire globale.

#### Budget FELANA
Budget dédié FELANA :
- Tableau des lignes budgétaires
- Ajouter une nouvelle ligne (poste, montant, chantier)

#### Devis & Proforma
- Tableau des devis
- Créer / modifier / suivre les devis

#### Factures
- Tableau des factures
- Bouton **Nouvelle Facture**

#### Rapports Financiers
- Export des rapports
- Téléchargement en PDF/Excel

---

## 5. RH — Ressources Humaines

### Dashboard
Statistiques : effectif total, nouveaux employés, congés en cours, formations.

### Sections

#### Employés
- Tableau du personnel (82 employés)
- **Nouvel employé** : formulaire (nom, prénom, poste, département, date embauche, salaire)
- Filtres par département / chantier
- Désactiver un employé (icône supprimer)

#### Recrutement
- Suivi des recrutements en cours
- Nouvelle demande de recrutement

#### Congés
- Tableau des demandes de congés
- **Nouvelle demande** : employé, dates, motif

#### Formations
- Plan de formation
- Suivi des formations effectuées

#### Paie
- **Générer fiches** : calcule les salaires depuis les pointages
- Tableau : employé, jours, taux, brut, avances, net
- **Fiche de paie** : détail revenus/déductions, export PDF
- **Export global** : télécharger toutes les fiches
- **Export chantier** : filtrer par chantier
- **Réajuster salaires** : modal d'indexation des salaires

#### Rapports
Statistiques RH exportables.

---

## 6. Chef de chantier

Le Chef est **scopé par chantier** — il ne voit que les données de son affectation.

### Dashboard
Indicateurs : nombre d'ouvriers, pointage du jour, alertes stock, planning.

### Sections

#### Mes Chantiers
Liste des chantiers assignés. Informations : statut, budget, avancement.

#### Mon Équipe
Tableau du personnel affecté au chantier.
- Ajouter un ouvrier (nom, métier, date embauche, salaire journalier)

#### Pointage
**Pointage manuel :**
1. Sélectionner l'employé dans la liste déroulante
2. Choisir la date et le statut (Présent, Absent, etc.)
3. Cliquer **Enregistrer**

#### Planning
Planification des tâches du chantier.
- **Nouvelle tâche** : nom, date, équipe, priorité

#### Matériaux
Gestion des matériaux et stocks du chantier.
- **Demande de matériaux** : matériau, quantité, motif

#### Recrutement
Demande de recrutement pour le chantier.

#### Rapports
Rapports journaliers du chantier :
- Météo, nombre d'ouvriers, travaux effectués, problèmes
- Créer, modifier, supprimer des rapports

---

## 7. Contrôleur

### Dashboard
Activité récente : 3 dernières inspections.

### Sections

#### Inspections
- Tableau de toutes les inspections
- **Nouvelle Inspection** :
  1. Sélectionner un chantier
  2. Remplir les checklists qualité et sécurité
  3. Ajouter des observations
  4. Le statut "Non conforme" est détecté automatiquement
- Supprimer une inspection

#### Qualité
Checklists qualité (7 éléments).
- Cocher/décocher les critères respectés
- Persisté en localStorage

#### Sécurité
Checklists sécurité (7 éléments).
- Vérifications sécurité sur le chantier

#### Rapports
Export des inspections.

---

## 8. Technicien

### Dashboard
Statistiques : projets en cours, tâches, interventions.

### Sections

#### Mes Projets
Tableau des projets techniques.

#### Tâches
- Tableau des tâches
- **Nouvelle tâche** : description, priorité, échéance

#### Interventions
- Tableau des interventions
- **Nouvelle intervention** : type, lieu, description, durée

#### Rapports
Rapports techniques.

---

## 9. Fonctions transverses

### Changer son mot de passe
1. Connecté, cliquer le bouton **Changer le mot de passe** (en haut à droite)
2. Saisir le nouveau mot de passe
3. Confirmer

### Déconnexion
Cliquer **Déconnexion** en haut à droite. Retour à la page de connexion.

### Créer un nouveau Chef de chantier (Admin uniquement)
Depuis le dashboard Admin > **Utilisateurs** :
1. Sélectionner rôle **chef**
2. Saisir ou générer l'email (ex: `chantier@nysoa.mg`)
3. Saisir un mot de passe
4. **Important :** renseigner le champ **Chantier** (doit correspondre exactement à un nom dans la table `chantiers`)
5. Cliquer **Créer**

Le nouveau chef pourra se connecter et verra uniquement son chantier.

### Mode hors-ligne
L'application est une PWA : elle peut fonctionner sans connexion internet pour les fonctionnalités de base (saisies locales).

### Installation PWA
Sur mobile : le navigateur propose "Installer l'application" (icône dans la barre d'adresse).

---

## 10. Données de test

Des données de test sont disponibles dans `SEED_DATA.sql` à exécuter dans Supabase SQL Editor.

### Par rôle

| Rôle | Données visibles | Scénario |
|------|-----------------|----------|
| **Admin** | Tout | Gérer utilisateurs, valider demandes, consulter Gantt global |
| **DAF** | Journal (200+ lignes), Budget FELANA, Devis, Factures | Voir écritures comptables, gérer trésorerie |
| **RH** | Employés (10+), salaires, congés | Gérer paie, exporter fiches, réajuster salaires |
| **Chef chantier** | Scope AMBATOMAINTY uniquement | Voir équipe (9 ouvriers), pointage (30j), stock, planning, rapports |
| **Contrôleur** | Inspections (5), checklists qualité/sécurité | Créer inspection, voir activité récente |
| **Technicien** | Projets, tâches, interventions | Gérer interventions techniques |

### Comptes de connexion (données de test)

Les comptes Supabase Auth doivent être créés via Admin > Utilisateurs avant utilisation.

### Réinitialiser les données

```sql
-- Pour repartir à zéro (attention: supprime tout)
TRUNCATE personnel, pointage, journal, salaires, rapports_chantier,
         controles_inopines, gantt_taches, stocks_chantier, commandes,
         validations, caisse RESTART IDENTITY CASCADE;
-- Puis re-exécuter SEED_DATA.sql
```

---

## 11. Dépannage

### Problèmes courants

| Problème | Solution |
|----------|----------|
| Connexion refusée | Vérifier email/mot de passe. Contacter l'admin si le compte n'existe pas |
| Page blanche après connexion | Attendre le chargement. Vider le cache navigateur |
| "Erreur 401" ou "RLS policy" | L'utilisateur n'a pas les droits pour cette action. Vérifier le rôle |
| Données non chargées | Vérifier la connexion internet. Recharger la page |
| Chef ne voit aucun employé | Vérifier que le champ `chantier` du compte correspond exactement au nom dans la DB |

### Support
- Contacter l'administrateur système
- Ouvrir une issue sur https://github.com/nysoabtp/nysoabtp/issues
