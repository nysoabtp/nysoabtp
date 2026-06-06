# Manuel d'utilisation — ERP NySoa BTP

---

## Sommaire

1. [Connexion](#1-connexion)
2. [Tableau de bord](#2-tableau-de-bord)
3. [Projets / Chantiers](#3-projets--chantiers)
4. [Achats](#4-achats)
5. [Journal comptable](#5-journal-comptable)
6. [Personnel](#6-personnel)
7. [Pointage](#7-pointage)
8. [Salaires](#8-salaires)
9. [Caisse interne](#9-caisse-interne)
10. [Antoka (Acomptes)](#10-antoka-acomptes)
11. [Crédits fournisseurs](#11-crédits-fournisseurs)
12. [Catalogue prix](#12-catalogue-prix)
13. [Contrats](#13-contrats)
14. [Stock](#14-stock)
15. [Devis](#15-devis)

---

## 1. Connexion

### Page de connexion
- URL : `login.html`
- Saisir **email** et **mot de passe**
- Cliquer **Se connecter**

### Comptes de démonstration
| Rôle | Email |
|------|-------|
| Administrateur | `admin@nysoa.mg` |
| DAF | `daf@nysoa.mg` |
| Chef chantier | `chef@nysoa.mg` |
| RH | `rh@nysoa.mg` |
| Contrôleur | `controleur@nysoa.mg` |
| Technicien | `technicien@nysoa.mg` |

Cliquer sur un compte pour remplir l'email, puis saisir le mot de passe.

---

## 2. Tableau de bord

La page d'accueil après connexion affiche :

- **Statistiques** : nombre de projets, employés actifs, budget total
- **Graphiques** : dépenses par mois, répartition par catégorie
- **Activités récentes** : dernières écritures, achats, pointages
- **Alertes** : stock faible, échéances à venir

Navigation par menu latéral gauche.

---

## 3. Projets / Chantiers

### Ajouter un projet
1. Aller dans l'onglet **Projets**
2. Cliquer **Nouveau projet**
3. Remplir : nom, client, budget, dates début/fin
4. Cliquer **Enregistrer**

### Modifier le statut
- Cliquer sur le statut d'un projet pour le changer
- Statuts disponibles : **EN COURS**, **TERMINÉ**, **EN PAUSE**

### Barre de progression
- Ajuster le pourcentage de progression
- La couleur change automatiquement (vert > 50%, orange > 25%, rouge < 25%)

---

## 4. Achats

### Enregistrer un achat
1. Aller dans **Achats**
2. Cliquer **Nouvel achat**
3. Remplir :
   - **Libellé** — nom de l'article
   - **Prix unitaire** — montant par unité
   - **Quantité** — nombre d'articles
   - **Fournisseur** — nom du vendeur
   - **Date** — date de l'achat
4. Cliquer **Enregistrer**

Le total est calculé automatiquement : `prix unitaire × quantité`.

### Importer depuis Excel
1. Cliquer **Importer Excel**
2. Sélectionner un fichier `.xlsx` ou `.xls`
3. Associer les colonnes si demandé

---

## 5. Journal comptable

### Ajouter une écriture
1. Aller dans **Journal**
2. Cliquer **Nouvelle écriture**
3. Remplir :
   - **Date**
   - **Chantier** (optionnel)
   - **Désignation** — description de l'opération
   - **Montant** — en Ariary
   - **Catégorie** : Salaire, Antoka, Approvisionnement, etc.
   - **Mode de paiement** : Espèce, Chèque, Mobile Money, Virement
   - **Type de travaux** : Maçonnerie, Plomberie, etc.
4. Cliquer **Enregistrer**

### Filtrer
- Par type : **Recette** ou **Dépense**
- Par chantier
- Par catégorie

### Exporter
- Cliquer **Exporter** pour télécharger en Excel

---

## 6. Personnel

### Ajouter un employé
1. Aller dans **Personnel**
2. Cliquer **Nouvel employé**
3. Remplir :
   - **Nom**, **Prénom**
   - **Poste**, **Département**
   - **Date d'embauche** — l'ancienneté est calculée automatiquement
   - **Salaire** — montant en Ariary
4. Cliquer **Enregistrer**

### Colonnes du tableau
| Colonne | Description |
|---------|-------------|
| Matricule | Identifiant unique (EMP-001...) |
| Nom | Nom de l'employé |
| Métier | Fonction occupée |
| Chantier | Affectation actuelle |
| Date embauche | Date d'entrée |
| Ancienneté | Calculée automatiquement (X ans Y mois) |
| Salaire | Montant + type (journalier/mensuel) |
| Statut | Actif ou inactif |

### Désactiver un employé
- Cliquer l'icône **supprimer** — l'employé est désactivé (pas supprimé définitivement)

---

## 7. Pointage

### Pointage par QR Code
1. Aller dans **Pointage**
2. Chaque employé a un QR Code unique
3. Scanner le QR Code avec la caméra
4. L'arrivée/départ est enregistré automatiquement

### Pointage manuel
1. Dans la section **Pointage Manuel**
2. Saisir ou sélectionner le **nom de l'employé**
3. Choisir le **chantier**
4. Sélectionner la **date**
5. Choisir le **type** : Arrivée ou Départ
6. Cliquer **Enregistrer**

### Visualiser les pointages
- Tableau récapitulatif : employé, jours travaillés, salaire, avances

---

## 8. Salaires

### Calculer les salaires
1. Aller dans **Salaires**
2. Cliquer **Calculer salaires**
3. Le système regroupe tous les pointages par employé

### Tableaux
- **Journaliers** : employés payés à la journée
- **Mensuels** : employés payés au mois

### Colonnes
| Colonne | Description |
|---------|-------------|
| Employé | Nom |
| Jours | Nombre de jours travaillés |
| Taux | Salaire journalier ou mensuel |
| Total brut | `jours × taux` |
| Avances | Montant des avances déduit |
| Net à payer | `total brut − avances` |

### Fiche de paie
1. Cliquer le bouton **Fiche** dans une ligne de salaire
2. La fiche affiche :
   - **Revenus** : salaire de base, heures sup (50% du taux), primes (5%)
   - **Déductions** : avances, retenues (2%), CNaPS (1%), OSTIE (0.5%)
   - **Net à payer**
3. Cliquer **Exporter PDF** pour télécharger

---

## 9. Caisse interne

### Enregistrer une entrée
1. Cliquer **Entrée caisse**
2. Remplir : date, montant, désignation
3. Cliquer **Enregistrer**

### Enregistrer une sortie
1. Cliquer **Sortie caisse**
2. Remplir : date, montant, désignation
3. Cliquer **Enregistrer**

### Statistiques affichées
- **Solde actuel** — balance actuelle
- **Total entrées** — somme des entrées
- **Total sorties** — somme des sorties
- **Nb mouvements** — nombre d'opérations

### Supprimer un mouvement
- Cliquer l'icône **corbeille** à droite de la ligne

---

## 10. Antoka (Acomptes)

### Ajouter un antoka
1. Aller dans **Antoka**
2. Cliquer **Nouvel antoka**
3. Remplir :
   - **Employé**
   - **Chantier**
   - **Montant accordé**
   - **Déjà remboursé**
   - **Date**, **Motif**
   - **Tranches de remboursement** (jusqu'à 3 tranches avec montant + date)
4. Cliquer **Enregistrer**

### Ajouter un paiement
1. Cliquer **+** dans la colonne Actions
2. Saisir **montant remboursé** et **date**
3. Cliquer **Confirmer**

### Barre de progression
- Verte : remboursé à 100%
- Orange : remboursé à plus de 50%
- Rouge : moins de 50% remboursé

---

## 11. Crédits fournisseurs

### Ajouter un crédit
1. Aller dans **Crédits Fournisseurs**
2. Cliquer **Nouveau crédit**
3. Remplir :
   - **Fournisseur**
   - **Montant total**
   - **3 échéances** (date + montant par échéance)
4. Cliquer **Enregistrer**

### Statistiques
- **Total dettes** — somme de tous les crédits
- **Reste à payer** — somme des montants restants

---

## 12. Catalogue prix

### Ajouter un article
1. Aller dans **Catalogue Prix**
2. Cliquer **Ajouter article**
3. Remplir : désignation, prix unitaire, unité, fournisseur
4. Cliquer **Enregistrer**

### Rechercher
- Utiliser le champ de recherche par désignation
- Filtrer par fournisseur

---

## 13. Contrats

### Ajouter un contrat
1. Aller dans **Contrats**
2. Cliquer **Nouveau contrat**
3. Remplir : désignation, prestataire, chantier, prix, dates
4. Cliquer **Enregistrer**

---

## 14. Stock

### Ajouter un article
1. Aller dans **Stock**
2. Cliquer **Nouvel article**
3. Remplir : nom, catégorie, quantité, unité, prix, seuil d'alerte
4. Cliquer **Enregistrer**

### Mouvements
- **Entrée** : approvisionnement
- **Sortie** : utilisation chantier
- **Transfert** : entre emplacements

### Alertes
- Les articles en dessous du seuil d'alerte sont surlignés en rouge

---

## 15. Devis

### Créer un devis
1. Aller dans **Devis**
2. Cliquer **Nouveau devis**
3. L'éditeur de devis s'ouvre :
   - Remplir : client, lieu, contact, objet
   - Ajouter des **lots** avec désignation, quantité, prix unitaire
   - Chaque lot peut avoir des sous-lignes
4. Cliquer **Sauvegarder**

### Statuts
- **BROUILLON** : en cours d'édition
- **ENVOYÉ** : transmis au client
- **ACCEPTÉ** : validé par le client
- **REFUSÉ** : rejeté

### Imprimer
- Cliquer **Imprimer** pour générer un PDF imprimable

---

## Raccourcis et astuces

| Action | Comment faire |
|--------|---------------|
| Importer Excel | Bouton **Importer Excel** dans chaque module |
| Exporter Excel | Bouton **Exporter** dans les tableaux |
| Filtrer par chantier | Utiliser les filtres en haut des tableaux |
| Rechercher | Champ de recherche dans Catalogue et Stock |
| Mode déconnecté | L'application fonctionne en offline (Service Worker) |

---

## Support

Pour toute question ou anomalie :
- Contacter l'administrateur système
- Ouvrir une issue sur https://github.com/nysoabtp/nysoabtp/issues
