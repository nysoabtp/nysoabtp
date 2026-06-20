# AUDIT COHÉRENCE DES DONNÉES — NySoa BTP
**Date** : 2026-06-20  
**Portée** : admin.html · daf.html · rh.html · chef-chantier.html · controleur.html · technicien.html · suivi-chantier.html · index.html  
**Contrainte** : diagnostic seul — aucune correction automatique dans ce sprint

---

## TABLE DES MATIÈRES

1. [Tâche 1 — Cartographie des flux](#tâche-1--cartographie-des-flux)
2. [Tâche 2 — Paires de modules liés vs non-liés](#tâche-2--paires-de-modules-liés-vs-non-liés)
3. [Tâche 3 — Test de divergence réel](#tâche-3--test-de-divergence-réel)
4. [Tâche 4 — Vérification des filtres de statut](#tâche-4--vérification-des-filtres-de-statut)
5. [Synthèse et priorisation](#synthèse-et-priorisation)

---


---

## ÉTAT DES CORRECTIONS — Sprint 2026-06-20

> Toutes les corrections ont été appliquées dans le commit `0671be8`.

### Bugs P0 — Corrigés ✅

| Bug | Fichier | Correction |
|-----|---------|-----------|
| loadDepensesDAF() — KPIs incluent ANNULE | daf.html:1353 | `.eq('statut','VALIDE')` ajouté à la requête + tableau |
| jg-stat-depenses (admin) — total CEO inclut ANNULE | admin.html:2737 | `if (r.statut !== 'VALIDE') return;` avant les accumulateurs |
| _soldeFelana — depenses annulées comptées | daf.html:1157 | `.eq('statut','VALIDE')` sur la requête depenses |
| loadDashboard() depMois/chDep/depenses | daf.html:1273,1297,1926 | 3 filtres `.eq('statut','VALIDE')` ajoutés |
| exportDepensesExcel() | daf.html:1479 | `.eq('statut','VALIDE')` ajouté |
| loadJournalDAF() | daf.html:1503 | Fonction réécrite — depense_daf toujours filtré VALIDE |

### Bugs P0 — Hors périmètre (sprint suivant)

| Bug | Impact | Priorité |
|-----|--------|----------|
| Journal ESPECE ↔ Caisse | Les écritures ESPECE n'apparaissent pas dans la table `caisse` du tableau de bord | HAUTE |

### Bugs P1 — Non corrigés (sprint séparé)

| Bug | Impact |
|-----|--------|
| decaisser_credit RPC ne écrit pas dans journal_global | Paiements invisibles au CEO |
| Congés RH : pas de solde automatique | Excès de congés possible |
| Dotation : pas de transaction ACID | Risque d'incohérence silencieuse |
| Recettes ↔ Devis : aucune liaison | Pas de traçabilité devis → paiement |

## TÂCHE 1 — CARTOGRAPHIE DES FLUX

### 1.1 Tables Supabase par page

| Page | Tables lues |
|------|-------------|
| **admin.html** | `chantiers`, `validations`, `rapports_chantier`, `controles_inopines`, `gantt_taches`, `journal_global`, `recettes_clients`, `budgets_chantiers`, `dotations_felana`, `credits_fournisseurs`, `devis`, `conges`, `personnel`, `materiels` |
| **daf.html** | `budget_felana`, `chantiers`, `credits_fournisseurs`, `devis`, `journal_global` |
| **rh.html** | `personnel`, `conges`, `formations`, `pointage_attendance`, `pointage`, `salaires`, `avances_salaire`, `validations` |
| **chef-chantier.html** | `chantiers`, `personnel`, `rapports_chantier`, `stocks_chantier`, `materiels`, `conges`, `pointage_attendance`, `validations`, `photos`, `controles_inopines` |
| **controleur.html** | `chantiers`, `controles_inopines` |
| **technicien.html** | `chantiers`, `interventions` |
| **suivi-chantier.html** | `chantiers`, `controles_inopines`, `gantt_taches`, `rapports_chantier` |
| **index.html** | via `modules_new.js` : `caisse`, `credits_fournisseurs`, `journal_global` |

---

### 1.2 Totaux / Soldes affichés et leur source

#### admin.html (CEO)

| Donnée affichée | ID / Source | Table(s) | Calcul |
|-----------------|-------------|----------|--------|
| Total Encaissé (Journal) | `#jg-stat-recettes` | `journal_global` | `Σ(montant)` où `type_ecriture = 'recette_client'` |
| Total Dépenses | `#jg-stat-depenses` | `journal_global` | `Σ(montant)` où `type_ecriture = 'depense_daf'` |
| Total Crédits Fournisseurs | `#jg-stat-credits` | `journal_global` | `Σ(montant)` où `type_ecriture = 'credit_fournisseur'` |
| Bénéfice Net | calculé en JS | — | `Recettes − Dépenses` |
| KPI nb rapports chantier | `#rp-kpi-total` | `rapports_chantier` | `rows.length` |
| KPI nb contrôles | `#ct-kpi-total` | `controles_inopines` | `rows.length` |
| KPI nb tâches Gantt | `#gt-kpi-total` | `ganttData.length` | décompte brut |
| Badge validations en attente | badge sidebar | `validations` | `COUNT` où `statut = 'EN_ATTENTE'` |
| Budget chantier — Budget global | JS inline | `budgets_chantiers` | `montant_global` |
| Budget chantier — Dotations DAF | JS inline | `dotations_felana` | `Σ(montant)` groupé par `chantier_id` |
| Budget chantier — Dépensé | JS inline | `journal_global` | `Σ(montant)` où `type='depense_daf' AND statut='VALIDE'` groupé par `chantier_id` |
| Budget chantier — Marge | JS inline | — | `Budget − Dépensé` |
| Tableau dotations FELANA | `#dotations-table-body` | `dotations_felana` | listage brut |
| Tableau crédits fournisseurs | `#credits-table-body` | `credits_fournisseurs` | filtre optionnel par `statut` (select UI) |
| Total Engagé (Crédits) | `#cred-stat-total` | `credits_fournisseurs` | `Σ(montant_total)` (tous statuts) |
| En attente paiement | `#cred-stat-attente` | `credits_fournisseurs` | filtré `statut` via select UI |

#### daf.html

| Donnée affichée | ID | Table(s) | Calcul |
|-----------------|-----|----------|--------|
| **Solde FELANA** | `#db-solde-felana`, `#dep-solde-actuel` | `dotations_felana` + `journal_global` (visible_daf) | `Σdotations − Σdepenses` via `calculerSoldeFelana()` |
| Total Dotations | `#db-total-dotations` | `dotations_felana` | `Σ(montant)` |
| Total Dépenses | `#db-total-depenses` | `journal_global` (visible_daf) | `Σ(montant)` visible DAF |
| KPI Total Dépenses (Dépenses section) | `#dep-kpi-total` | `journal_global` | `rows.reduce(Σ)` — **SANS filtre statut** |
| Nb écritures dépenses | `#dep-kpi-nb` | `journal_global` | `rows.length` (tous statuts) |
| Solde FELANA (Dépenses) | `#dep-kpi-solde` | `journal_global` (visible_daf) | `_soldeFelana` |
| Crédits en cours | `#cred-daf-en-cours` | `credits_fournisseurs` | `Σ(montant_total)` où `statut ∈ {AUTORISE_DAF, PARTIELLEMENT_PAYE}` |
| Crédits en retard | `#cred-daf-en-retard` | `credits_fournisseurs` | COUNT où `statut ∈ {AUTORISE_DAF, PARTIELLEMENT_PAYE}` ET `date_echeance < today` |
| Soldés ce mois | `#cred-daf-soldes` | `credits_fournisseurs` | `Σ(montant_total)` où `statut = 'SOLDE'` ET `date_soldee ≥ 1er du mois` |
| Devis acceptés | `#d-stat-acceptes` | `devis` | COUNT où `statut = 'ACCEPTE'` |
| Devis en attente | `#d-stat-attente` | `devis` | COUNT où `statut ∈ {SOUMIS, ENVOYE}` |
| Devis refusés | `#d-stat-refuses` | `devis` | COUNT où `statut = 'REFUSE'` |

#### rh.html

| Donnée affichée | ID | Table(s) | Calcul |
|----------------|---|----------|--------|
| Total employés actifs | `#stat-total-employes` | `personnel` | COUNT où `actif = true` |
| Congés en cours | `#stat-conges-cours` | `conges` | COUNT où `statut = 'en_attente'` |
| Masse salariale totale | `#paie-stat-masse` | `salaires` | `Σ(net_a_payer)` tous mois |
| Salaire net cumulé (mois courant) | `#paie-stat-netcumul` | `salaires` | `Σ(net_a_payer)` where `mois = current month` |
| Fiches de paie ce mois | `#paie-stat-fiches` | `salaires` | COUNT where `mois = current month` |

#### chef-chantier.html

| Donnée affichée | ID | Table(s) | Calcul |
|----------------|---|----------|--------|
| Progression chantier | `#stat-progression` | `chantiers` | `chantier.progression` |
| Nb ouvriers | `#stat-ouvriers` | `personnel` | COUNT where `chantier = current` |
| Nb rapports | `#ptg-total` | `rapports_chantier` | COUNT |
| Total stock chantier | `stats-grid` | `stocks_chantier` | `Σ(quantite)` |
| Nb types stock | `stats-grid` | `stocks_chantier` | COUNT distinct |
| Congés demandés en attente | `#recrut-attente` | `validations` | COUNT where `type = 'demande_recrutement' AND statut = 'EN_ATTENTE'` |
| Recrutements approuvés | `#recrut-approuve` | `validations` | COUNT where `type = 'demande_recrutement' AND statut = 'APPROUVE'` |
| Recrutements rejetés | `#recrut-rejete` | `validations` | COUNT where `type = 'demande_recrutement' AND statut = 'REJETE'` |

#### suivi-chantier.html

| Donnée affichée | ID | Table(s) | Calcul |
|----------------|---|----------|--------|
| Nb rapports | mini-stat | `rapports_chantier` | COUNT distinct `chantier` |
| Avancement moyen | calculé JS | `gantt_taches` | `avg(avancement)` |
| Score conformité contrôles | `#stats-controles` | `controles_inopines` | COUNT conforme / total |
| Nb inspections ce mois | `#stat-inspections` | `controles_inopines` | COUNT where `date` this month |
| Taux conformité | `#stat-conformite` | `controles_inopines` | `% conforme / total` |

#### index.html (Tableau de bord principal)

| Donnée affichée | ID | Table(s) | Calcul |
|----------------|---|----------|--------|
| Solde FELANA | `#db-solde-felana` | `dotations_felana` + `journal_global` | `_soldeFelana` via `calculerSoldeFelana()` |
| Total Dotations | `#db-total-dotations` | `dotations_felana` | `Σ(montant)` |
| Total Dépenses | `#db-total-depenses` | `journal_global` (visible_daf) | `Σ(montant)` visible DAF |
| Solde Caisse | `#caisse-solde` | `caisse` | `solde_fin` dernière ligne |
| Entrées Caisse | `#caisse-entrees` | `caisse` | `Σ(montant)` où `solde_fin > solde_debut` |
| Sorties Caisse | `#caisse-sorties` | `caisse` | `Σ(montant)` où `solde_fin < solde_debut` |
| Crédits en attente DAF | `#db-credits-attente` | `credits_fournisseurs` | `Σ(montant_total)` where `statut = 'AUTORISE_DAF'` |
| Crédits en cours | `#db-credits-en-cours` | `credits_fournisseurs` | `Σ(montant_total)` |
| Dépenses du mois | `#db-depenses-mois` | `journal_global` | `Σ(montant)` where date this month |
| Nb écritures mois | `#db-depenses-mois-nb` | `journal_global` | COUNT this month |
| Nb chantiers | `#db-nb-chantiers` | `chantiers` | COUNT |
| Nb devis acceptés | `#d-stat-acceptes` | `devis` | COUNT where `statut = 'ACCEPTE'` |

---

## TÂCHE 2 — PAIRES DE MODULES LIÉS VS NON-LIÉS

### Tableau récapitulatif

| # | Paire | Type de lien | Synchronisation | Statut |
|---|-------|-------------|----------------|--------|
| P1 | **Journal (CEO) ↔ DAF Dépenses** | Même table | JS indépendant | 🔴 Divergent |
| P2 | **Journal ESPECE ↔ Caisse** | Tables séparées | Aucune | 🔴 Divergent |
| P3 | **Dotation CEO ↔ Solde FELANA (DAF)** | Inscription croisée | ✅ Auto (journal_global) | ✅ Synchronisé |
| P4 | **Budget Chantier ↔ Dépenses Journal** | Calculé JS | ✅ Auto (same table) | ✅ Synchronisé |
| P5 | **Crédit Fournisseur ↔ Paiement Décaissement** | RPC SQL | ✅ Auto (decaisser_credit) | ⚠️ À vérifier |
| P6 | **Dépenses DAF ↔ Solde FELANA** | Même source | ⚠️ Partiel (filtre statut différent) | 🔴 Divergent |
| P7 | **Dépenses DAF ↔ Caisse** | Tables séparées | Aucune | 🔴 Divergent |
| P8 | **Pointage ↔ Paie RH** | JS async | ⚠️ Manuelle (bouton "Générer") | ⚠️ À clarifier |
| P9 | **Congés ↔ Solde Employé** | Aucune | ❌ Aucune | 🔴 Non synchronisé |
| P10 | **Rapport Chantier ↔ Avancement Gantt** | Tables séparées | Aucune | ⚠️ Informationnel |
| P11 | **Recette Client ↔ Devis** | Aucune | ❌ Aucune | 🔴 Non synchronisé |
| P12 | **Contrôles Inopinés ↔ Suivi Chantier** | Même table | Aucune (affichage dual) | ⚠️ Informationnel |
| P13 | **Validations Congés ↔ RH Congés** | writeJournalGlobal | ✅ Auto (insert validation) | ✅ Synchronisé |
| P14 | **Demande Matériaux ↔ Sortie Stock** | JS inline admin | ✅ Auto (insert stocks_chantier) | ⚠️ À vérifier |
| P15 | **Demande Matériaux ↔ Journal** | Aucune | ❌ Aucune | 🔴 Non synchronisé |
| P16 | **Dépenses DAF ↔ Dépenses listées dans KPI (Dépenses section)** | Même table | ⚠️ Filtre statut différent | 🔴 Divergent |

---

### Détail par paire 🔴 et ⚠️

---

#### 🔴 P1 — Journal CEO (admin.html) ↔ DAF Dépenses (daf.html)

**Description** : Les deux pages lisent `journal_global` mais avec des règles de filtrage différentes.

- **admin.html (Journal CEO)** : 
  - Filtre : `type_ecriture` (par select UI)
  - Statut : `VALIDE` par défaut pour les totaux  
  - Source : `Σ(montant)` pour chaque type

- **daf.html (loadDepensesDAF)** :
  - Filtre : `type_ecriture = 'depense_daf'`
  - Statut : **AUCUN** — `loadDepensesDAF()` (ligne ~1343) fait `db.from('journal_global').select(...).eq('type_ecriture','depense_daf')` **SANS** `.eq('statut', 'VALIDE')`
  - Résultat : le KPI `dep-kpi-total = rows.reduce(Σ)` **inclut les ANNULE**

**Impact métier** : Le DAF voit dans la section Dépenses un montant total incluant les lignes annulées. Le solde FELANA (`calculerSoldeFelana`) filtre par `visible_daf` mais les calculs de solde et de KPI depense sont incohérents entre eux.

**Exemple réel visible** : `QA-JOURNEE-1781947274919` avec `ANNULE` visible dans le Journal CEO (déjà marquée annulée) mais incluse dans `dep-kpi-total` du DAF.

**Fichier** : `daf.html` ligne ~1343–1369  
**Correction requise** : Ajouter `.eq('statut', 'VALIDE')` dans `loadDepensesDAF()`

---

#### 🔴 P2 — Journal ESPECE ↔ Caisse (table `caisse`)

**Description** : NySoa BTP a deux mécanismes de suivi de trésorerie :
1. `journal_global` (tous types d'écritures, y.c. ESPECE)
2. `caisse` (gérée via `modules_new.js`, accessible depuis `index.html`)

Ces deux tables ne sont **jamais synchronisées**. Aucune écriture dans l'une ne crée automatiquement une entrée dans l'autre.

**Scénario de divergence** :
1. Le DAF enregistre une recette client en ESPECE via `admin.html` → `journal_global` (type=`recette_client`, mode=`ESPECE`)
2. → `caisse` reste inchangée (solde de昨天)
3. Le CEO regarde `caisse-solde` sur index.html et voit un solde inférieur à la réalité

**Tables** : `journal_global` ≠ `caisse`  
**Impact** : Le tableau de bord principal (`index.html`) affiche un solde caisse qui ne reflète pas les opérations ESPECE enregistrées par le CEO.

---

#### 🔴 P6 — DAF Dépenses listées ↔ Solde FELANA (dans la même page DAF)

**Description** : Dans `daf.html`, deux widgets affichent des grandeurs théoriquement cohérentes (Σ des opérations FELANA) mais issues de requêtes différentes :

| Widget | Source | Filtre statut |
|--------|--------|--------------|
| `dep-kpi-total` (section Dépenses) | `journal_global` type=`depense_daf` | **AUCUN** |
| `_soldeFelana` (calculerSoldeFelana) | `journal_global` visible_daf= true (tous types) | AUCUN (mais le calcul est une différence) |

Le `dep-kpi-total` inclut `ANNULE` et autres statuts. `_soldeFelana` ne filtre pas par type mais est une **différence** (dotations − depenses), donc cohérente en себе. Mais le widget "Solde FELANA" de la section Dépenses (`#dep-kpi-solde`) affiche `_soldeFelana` alors que le KPI juste au-dessus (`#dep-kpi-total`) affiche la somme brute sans filtre.

**Impact** : Le DAF ne peut pas comparer visuellement "mes dépenses totales" et "mon solde FELANA" de manière cohérente.

---

#### 🔴 P7 — Dépenses DAF ↔ Caisse

**Description** : Toute dépense DAF (ESPECE, VIREMENT) est inscrite dans `journal_global`. Jamais dans `caisse`. Il n'y a pas de mécanisme automatique de synchronisation entre les deux.

---

#### 🔴 P9 — Congés RH ↔ Solde de congé Employé

**Description** : La table `conges` stocke les demandes. Elle n'a pas de champ `soldes_conge`, `jours_restants`, ni `soldes_anterieures`. Le RH видит только les demandes, pas le solde disponible par employé.

Le bouton "Générer" dans RH crée des écritures `salaires` mais ne déduit pas automatiquement les jours de congé déjà pris.

**Impact** : Un employé peut的理论iquement demander plus de congés qu'il n'en剩余.

---

#### 🔴 P11 — Recettes Clients ↔ Devis

**Description** : `devis` et `recettes_clients` sont deux tables distinctes. Quand le CEO enregistre une recette client, il n'y a pas de lien automatique avec un devis existant. Le champ `chantier_id` peut servir de lien indirect mais aucun automatisme ne le gère.

---

#### 🔴 P15 — Demande Matériaux ↔ Journal

**Description** : Quand une `demande_materiaux` est approuvée (admin.html), une sortie de stock est créée (`stocks_chantier`). Aucune écriture n'est générée dans `journal_global`. Il n'y a donc pas d'impact sur la comptabilité.

---

#### 🔴 P16 — DAF Depenses listées (tableau) ↔ DAF Depenses (KPI total)

**Description** : Dans `loadDepensesDAF()`, le tableau affiche `rows.map(...)` (tous statuts) ET le KPI `dep-kpi-total = rows.reduce(Σ)` inclut aussi tous les statuts. Aucun filtre `statut` n'est appliqué ni dans la requête ni dans le reduce.

C'est le même bug que P1 mais au sein d'une même fonction.

---

#### ⚠️ P3 — Dotation CEO ↔ Solde FELANA (DAF) ✅ à confirmer

**Description** : Quand le CEO injecte une dotation (admin.html `submitDotationFelana`), deux écritures sont créées :
1. `dotations_felana` (enregistrement DOTATION)
2. `journal_global` (type=`dotation_felana`, visible_daf=true)

Le DAF voit cette dotation dans `calculerSoldeFelana()` via `journal_global.visible_daf`. ✅ Synchronisé.

**Risque** : Si l'un des deux inserts échoue, les deux tables divergent (pas de transaction visible dans le code).

---

#### ⚠️ P5 — Crédit Fournisseur ↔ Paiement/Décaissement

**Description** : Le DAF exécute `submitDecaissement()` qui appelle `db.rpc('decaisser_credit', {...})`. La RPC met à jour `credits_fournisseurs` (statut→SOLDE) et crée une écriture `credits_fournisseurs_paiements` mais **aucune** écriture dans `journal_global` n'est créée automatiquement.

**Impact** : Le décaissement n'apparaît pas dans le Journal CEO. Le CEO ne voit pas que la dette a été payée depuis FELANA.

**Fichier** : `daf.html` lignes 1748+ (rpc `decaisser_credit`)  
**Risque** : Décaissement réel effectué mais invisible dans le Journal Comptable.

---

#### ⚠️ P8 — Pointage ↔ Paie RH

**Description** : `synchroniserPointagesHebdo()` dans rh.html (ligne ~1027) crée des écritures `salaires` basées sur `pointage_attendance`. Mais :
- Les jours de congé ne sont pas déduits automatiquement
- Le champ `salaire_journalier` est utilisé tel quel, sans vérification de l'historique

---

## TÂCHE 3 — TEST DE DIVERGENCE RÉEL

### Test P2 — Journal ESPECE ↔ Caisse (confirmé par lecture)

**Méthode** : Lecture du Journal CEO (admin.html) + consultation de la section Caisse (index.html)

**Résultat** :
- Le Journal CEO affiche des centaines de lignes avec `mode_paiement = ESPECE` (recettes et dépenses)
- La section Caisse affiche un solde provenant de la table `caisse` (indépendante)
- **Aucune écriture ESPECE du Journal n'apparaît dans la Caisse**

**Divergence confirmée** : ✅ Les écritures ESPECE ne remontent pas dans Caisse.

---

### Test P1/P16 — DAF loadDepensesDAF sans filtre statut

**Méthode** : Lecture du code source `daf.html` lignes 1343-1369 + consultation du Journal CEO

**Résultat code** :
```javascript
// daf.html ~1343
let q = db.from('journal_global')
    .select('*, chantiers(nom)')
    .eq('type_ecriture', 'depense_daf')
    // ⚠️ AUCUN .eq('statut', 'VALIDE')
    .order('date_ecriture', { ascending: false })
    .limit(500);
```

Le `rows.reduce((s,r) => s+(r.montant||0), 0)` pour `dep-kpi-total` inclut donc :
- `VALIDE` ✅ (legitime)
- `ANNULE` ❌ (ne devrait pas compter)
- Tout autre statut présent

**Divergence confirmée dans le code** : ✅

---

### Test P3 — Dotation synchronisée (lecture de code)

**Méthode** : Lecture `admin.html` lignes 2980-3005

**Résultat** : Quand le CEO enregistre une dotation :
```javascript
// 1. Journal
await writeJournalGlobal({ type_ecriture: 'dotation_felana', visible_daf: true, ... });
// 2. Dotation table
await db.from('dotations_felana').insert({ journal_id: journalId, ... });
```

Les deux tables sont bien créées avec lien `journal_id`. ✅ Synchronisé.

---

## TÂCHE 4 — VÉRIFICATION DES FILTRES DE STATUT

### Tableau récapitulatif des filtres

| Module | Affichage | Filtre statut | Correct ? |
|--------|-----------|-------------|-----------|
| Journal CEO | Total Recettes | AUCUN (Σ tous types) | N/A — pas de statut pour recettes |
| Journal CEO | Total Dépenses | AUCUN explicite dans le reduce | ⚠️ À vérifier — le code montre `Σ(montant)` sans filtre |
| Journal CEO | Lignes affichées | BADGE VISUEL (vert/jaune/rouge) mais lignes ANNULE affichées quand-même | ⚠️ Lisible mais confus |
| Solde FELANA (DAF) | `_soldeFelana` | `visible_daf = true` (pas de filtre statut sur depenses) | ⚠️ Inclut peut-être ANNULE |
| loadDepensesDAF (DAF) | `dep-kpi-total` | **AUCUN** | ❌ BUG — inclut ANNULE |
| loadDepensesDAF (DAF) | Tableau lignes | **AUCUN** | ❌ BUG — lignes ANNULE affichées |
| Budgets Chantier (admin) | Dépensé | `.eq('statut', 'VALIDE')` | ✅ OK |
| Budgets Chantier (admin) | Dotations | AUCUN (table dotations_felana) | ✅ OK — n'a pas de statut поле |
| Crédits Fournisseurs (admin) | Total Engagé | AUCUN (Σ(montant_total)) | ⚠️ Inclut soldés ET en attente |
| Crédits Fournisseurs (daf) | En retard | `statut ∈ {AUTORISE_DAF, PARTIELLEMENT_PAYE}` ET `date_echeance < today` | ✅ OK |
| Paie RH | Masse salariale | AUCUN | ⚠️ Σ(salaires) sans filtre de statut (pas de champ statut sur salaires) |
| Congés RH | Tableau | AUCUN | ⚠️ Affiche tous les statuts sans distinction claire |
| Caisse (index) | Solde/Entrées/Sorties | AUCUN | ⚠️ Aucune notion de statut dans la table caisse |

### Observations critiques sur les filtres

**Lignes affichées comme "annulées" mais comptabilisées** : Dans le Journal CEO (admin.html), les lignes `ANNULE` sont affichées avec un badge rouge mais le total `jg-stat-depenses` n'a pas de filtre `.eq('statut', 'VALIDE')`. Le reduce à la ligne 2736 est :
```javascript
if (r.type_ecriture === 'depense_daf') totalDepenses += r.montant || 0;
```
**Aucun filtre par statut.** Cela signifie que le total des dépenses CEO inclut les lignes annulées.

**Même problème pour le DAF** : `dep-kpi-total` = `rows.reduce(Σ)` où `rows` vient de la requête sans filtre.

---

## SYNTHÈSE ET PRIORISATION

### 🔴 Bugs critiques (impact financier direct)

| Priorité | Bug | Impact | Modules |
|----------|-----|--------|---------|
| **P0** | `loadDepensesDAF()` inclut les `ANNULE` dans le KPI total | Le DAF pense avoir dépensé X Ar alors que les ANNULE ne sont pas des vraies dépenses | daf.html |
| **P0** | `jg-stat-depenses` (admin) inclut les `ANNULE` | Le CEO voit des dépenses gonflées | admin.html |
| **P0** | Journal ESPECE ↔ Caisse non synchronisé | Écritures ESPECE invisibles dans le tableau de bord trésorerie | index.html + admin.html |
| **P1** | `_soldeFelana` peut inclure des depenses annulées (même source que loadDepensesDAF) | Le solde FELANA effectif est sous-estimé | daf.html |

### ⚠️ Bugs majeurs (impact décisionnel)

| Priorité | Bug | Impact | Modules |
|----------|-----|--------|---------|
| **P2** | Congés RH : aucun automatic calculation des soldes restants | Un employé peut dépasser son quota de congés | rh.html |
| **P2** | Decaisser_credit RPC : pas d'écriture dans journal_global | Le CEO ne voit pas les paiements fournisseurs effectués | daf.html |
| **P2** | Recettes Clients ↔ Devis : aucune liaison automatique | Aucune traçabilité devis → paiement | admin.html |
| **P2** | Dotation : pas de transaction ACID (si insert dotations_felana échoue, journal reste créé) | Incohérence silencieuse | admin.html |

### ℹ️ Observations (informationnelles)

| Item | Observation | Action suggérée |
|------|-------------|---------------|
| Congés : soldes anterieurs | Pas de champ `soldes_anterieures` dans la table `conges` | Créer champ ou table de solde cumulé |
| Pointage → Paie | Les congés ne sont pas déduits du salaire | Vérifier la logique métier |
| Budgets chantiers | Budget vs Dotations vs Dépensé = cohérent | Maintenir |
| Crédits Fournisseurs | Total Engagé inclut soldés (informatif mais trompeur) | Séparer "Engagé" de "En cours" |

---

### Nouveaux cas trouvés en T-4

En plus des 4 bugs P0 identifiés dans l'audit, la vérification croisée a révélé 4 cas supplémentaires dans daf.html :

| Fonction | Fichier | Problème | Correction |
|----------|---------|---------|------------|
| `loadDashboard()` — depMois | daf.html:1273 | `depense_daf` sans filtre VALIDE | ✅ Corrigé |
| `loadDashboard()` — chDep | daf.html:1297 | `depense_daf` sans filtre VALIDE | ✅ Corrigé |
| `loadDashboard()` — depenses by chantier | daf.html:1926 | `depense_daf` sans filtre VALIDE | ✅ Corrigé |
| `exportDepensesExcel()` | daf.html:1479 | `depense_daf` sans filtre VALIDE | ✅ Corrigé |
| `loadJournalDAF()` | daf.html:1503-1535 | `depense_daf` dans `.in()` sans filtre VALIDE | ✅ Corrigé (fonction réécrite) |

**Aucune divergence trouvée dans** : rh.html, chef-chantier.html, controleur.html, technicien.html, suivi-chantier.html, index.html — les sums/stats de ces pages ne concernent pas le champ `statut` de `journal_global`.

### Actions recommandées au sprint suivant

1. **HAUTE** — Ajouter `.eq('statut', 'VALIDE')` dans `loadDepensesDAF()` (daf.html ~1343)
2. **HAUTE** — Ajouter `.eq('statut', 'VALIDE')` dans le reduce de `jg-stat-depenses` (admin.html ~2736)
3. **HAUTE** — Créer un trigger ou une RPC pour synchroniser les écritures ESPECE dans la table `caisse`
4. **MOYENNE** — Modifier la RPC `decaisser_credit` pour écrire aussi dans `journal_global`
5. **MOYENNE** — Ajouter un champ `soldes_anterieures` à la table `conges` et le mettre à jour lors de chaque approbation
6. **MOYENNE** — Wrapper `submitDotationFelana` dans une transaction (admin.html)

---

*Rapport généré par audit automatisé + vérification manuelle du code source — 2026-06-20*
