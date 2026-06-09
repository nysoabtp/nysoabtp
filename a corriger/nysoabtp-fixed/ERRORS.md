# ERRORS.md — Analyse des issues NySoa BTP

Généré le 2026-06-09 après test_scenarios.js (49/49 ✅).

---

## 🔴 CRITIQUE (21 issues)

### RLS / Sécurité base de données

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| C1 | `SUPABASE_SETUP.sql` | 227-246 | Politiques `allow_all` (`USING (true) WITH CHECK (true)`) sur TOUTES les tables — **annule toutes les RLS**. Supersédé par FIX_RLS mais le fichier initial est dangereux. |
| C2 | `SUPABASE_SETUP.sql` | 329 | `anon_all_salaires` : aucune restriction sur les salaires |
| C3 | `FIX_RLS_CHEF.sql` | 36-39 | `"RH Admin manage personnel"` : `FOR ALL USING` inclut DELETE — RH peut supprimer des employés |
| C4 | `FIX_RLS_ALL_TABLES.sql` | 37-41 | `"Admin manage materiels"` : `FOR ALL` pour admin + DAF — DAF peut supprimer du matériel |
| C5 | `FIX_RLS_ALL_TABLES.sql` | 56-59 | `"DAF Admin manage journal"` : `FOR ALL` inclut DELETE |
| C6 | `FIX_RLS_ALL_TABLES.sql` | 121-126 | `"Chef manage own gantt"` : INSERT seulement — Chef ne peut pas UPDATE/DELETE ses tâches Gantt |

### Authentification

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| C7 | `login.html` | 137-142 | Mots de passe en clair dans les `onclick="fillLogin('admin@nysoa.mg', 'admin123')"` |
| C8 | `login.html` | 215-221 | Tableau `users` avec hash base64 réversibles (`YWRtaW4xMjM=` = `admin123`) |
| C9 | `pointage.html` | 622-625 | Auth vérifiée UNIQUEMENT via localStorage (`nysoa_current_user`), pas Supabase `getSession()` |
| C10 | `suivi-chantier.html` | 699, 777 | Idem + `logout()` ne fait que `localStorage.removeItem` sans `db.auth.signOut()` |

### Technicien — localStorage only (perte données)

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| C11 | `technicien.html` | 441-452 | `loadInterventions()` : lit UNIQUEMENT dans `nysoa_interventions` (localStorage) |
| C12 | `technicien.html` | 454-471 | `loadTachesLocales()` : lit UNIQUEMENT les clés `nysoa_nouvelle_tache_*` (localStorage) |
| C13 | `technicien.html` | 554-565 | `submitNouvelleIntervention()` : écrit UNIQUEMENT dans localStorage — pas de table Supabase |
| C14 | `technicien.html` | 532-552 | `submitNouvelleTache()` : double écriture (Supabase chantiers.taches + localStorage) mais pas de synchro inverse |

### Empty catch blocks

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| C15 | `controleur.html` | 483 | `} catch(_) {}` — silence total |
| C16 | `technicien.html` | 461 | `try { ... } catch(_) {}` |
| C17 | `technicien.html` | 487 | `} catch(_) { initializeTechnicienCharts(); }` |
| C18 | `rh.html` | 745, 795 | `} catch(_) {}` × 2 |
| C19 | `daf.html` | 967 | `} catch(e) {}` |
| C20 | `suivi-chantier.html` | 727, 973, 1194, 1263, 1397, 1412 | `} catch(e) {}` × 6 |

### XSS potentiel

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| C21 | Tous `.html` | Massif | `innerHTML` utilisé 196+ fois sans assainissement des données utilisateur (`.message`, descriptions, etc.) |

---

## 🟡 MOYEN (37 issues)

### localStorage/Supabase conflit

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| M1 | `login.html` | 196, 224, 248 | `localStorage.setItem('nysoa_current_user', ...)` après connexion — doublon avec session Supabase |
| M2 | `supabase.js` | 44-68 | `checkAuthOrRedirect()` réécrit `localStorage` même si session Supabase OK |
| M3-M9 | `rh.html:1190`, `daf.html:1086`, `chef.html:1107`, `controleur.html:630/671`, `technicien.html:599`, `pointage.html:622` | `JSON.parse(localStorage.getItem('nysoa_current_user'))` pour `changePassword()` — devrait utiliser Supabase `getUser()` |
| M10 | `admin.html` | 1350-1357 | Tableau `DEFAULT_USERS` hardcodé (7 comptes) — bypass Supabase |

### Chef chantier

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| M11 | `chef-chantier.html` | 1076 | Photos chargées depuis URL non configurée — pas de bucket Supabase défini |
| M12 | `chef-chantier.html` | - | Équipe scope : 1 seule ligne (le chantier du compte démo a peu ou pas de personnel) |
| M13 | `FIX_RLS_CHEF.sql` | 16-20 | Policy chef : si `user_metadata.chantier` est NULL, la policy échoue |

### RLS

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| M14 | `FIX_RLS_CHEF.sql` | 23-26 | DAF peut READ personnel mais pas INSERT/UPDATE |
| M15 | `FIX_RLS_CHEF.sql` | 70-74 | RH peut inserer pointage sur n'importe quel chantier (pas de restriction) |
| M16 | `FIX_RLS_ALL_TABLES.sql` | 79-83 | DAF peut DELETE des devis (`FOR ALL`) |
| M17 | `FIX_RLS_ALL_TABLES.sql` | 103-107 | DAF peut DELETE des commandes |
| M18 | `sync_chantiers.sql` | 25 | `ON CONFLICT (nom)` suppose UNIQUE sur `nom` — vérifier contrainte |

### UX/Manque fonctionnalités

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| M19 | - | - | "Changer mot de passe" : texte du bouton non trouvé par les tests |
| M20 | - | - | Section "Validations" dans admin introuvable par clic nav (fallback showSection OK) |
| M21 | - | - | Scroll horizontal à 375px (body=415px) — non responsive |
| M22 | - | - | Service Worker pas enregistré en navigation headless |
| M23 | `technicien.html` | 389-414 | `downloadReport()` peut ne pas être accessible (défini dans script.js mais pas importé explicitement) |
| M24 | `sync_chantiers.sql` | 8-25 | 16 chantiers insérés — vérifier que la contrainte UNIQUE sur `nom` existe |
| M25 | `FIX_COLONNES.sql` | 8 | `UPDATE journal SET date = date_ecriture` — `date_ecriture` peut ne pas exister |

### Admin

| ID | Fichier | Ligne | Problème |
|----|---------|-------|----------|
| M26 | `admin.html` | 469-474, 1230-1237 | Clé `service_role` stockée en sessionStorage — volable si XSS |

---

## 🔵 FAIBLE (consoles logs, redondances)

| ID | Fichier | Nombre |
|----|---------|--------|
| F1 | Tous `.html` | 17 `console.warn/error/log` laissés en production (admin:2, chef-chantier:4, login:2, pointage:1, index:2, supabase.js:3, enhancements.js:1, technicien:1) |
| F2 | `controleur.html` | 2 fonctions définies mais jamais appelées directement (`viewInspection`, `deleteInspection` — utilisées via onclick dynamique) |

---

## Top 10 priorités de correction

```
P1  🔴  C7/C8   login.html — Mots de passe en clair + hash base64
P2  🔴  C1/C2   SUPABASE_SETUP.sql — Policies allow_all à supprimer/corriger
P3  🔴  C9/C10  pointage.html, suivi-chantier.html — Auth localStorage seulement
P4  🔴  C11-C14 technicien.html — Persistance localStorage only, pas de table Supabase
P5  🔴  C3-C6   RLS — DELETE abusifs, Chef UPDATE manquant
P6  🟡  M10     admin.html — DEFAULT_USERS à supprimer
P7  🔴  C15-C20 Empty catch blocks — erreurs silencieuses
P8  🟡  M1-M9   Conflit localStorage vs Supabase session
P9  🟡  M19-M22 UX — Bouton mot de passe, responsive, SW
P10 🔵  F1      Nettoyer les console.log
```
