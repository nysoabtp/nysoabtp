# PROMPT AGENT — NYSOABTP

Copie-colle ce prompt dans OpenCode au démarrage de chaque session.

---

## Contexte projet
- Application web BTP (Bâtiment et Travaux Publics)
- Stack : HTML / CSS / JavaScript vanilla + Supabase (Auth + PostgreSQL + RLS + Management API)
- PWA installable sur mobile
- GitHub : https://github.com/nysoabtp/nysoabtp
- Tests automatisés : 78 tests (Puppeteer) dans le dossier temporaire
- Déploiement : GitHub Pages

## Fichiers clés
| Fichier | Rôle |
|---------|------|
| `supabase.js` | Connexion Supabase, checkAuthOrRedirect, logout, CRUD |
| `login.html` | Page de connexion avec comptes demo + fallback |
| `script.js` | Fonctions communes (modals, loadPersonnelTable, etc.) |
| `admin.html` | Dashboard admin (9 sections : import, backup, users, rapports, contrôles, validations, gantt, stock) |
| `chef-chantier.html` | Dashboard chef (8 sections : tableau de bord, chantiers, équipe, pointage, planning, matériaux, recrutement, rapports) |
| `daf.html` | Dashboard DAF (7 sections) |
| `rh.html` | Dashboard RH (paie, employés, congés, export, fin contrat) |
| `controleur.html` | Dashboard contrôleur (inspections, qualité, sécurité) |
| `technicien.html` | Dashboard technicien (projets, tâches, interventions) |
| `create_chef.js` | Script Node.js pour créer compte chef via service_role key |
| `migrate_all_chefs.js` | Migration batch des 24 comptes fallback → auth.users |
| `FIX_RLS_CHEF.sql` | RLS policies (personnel, pointage, salaires, chantiers, contrôles, rapports, validations) |
| `FIX_RLS_ALL_TABLES.sql` | RLS complémentaires (stocks, matériels, journal, devis, commandes, gantt, caisse) |
| `sync_chantiers.sql` | Synchronisation table chantiers |
| `pointage.html` | Page pointage dédiée (QR code + manuel) |
| `suivi-chantier.html` | Suivi avancement chantier |
| `sw.js` | Service Worker PWA |
| `manifest.json` | Manifest PWA |

## Rôles utilisateurs
```
admin      → admin.html
chef       → chef-chantier.html  (scope chantier via user_metadata.chantier)
controleur → controleur.html
daf        → daf.html
rh         → rh.html
technicien → technicien.html
```

## Règles strictes
1. Commenter le code en français
2. Ne jamais casser la connexion Supabase (client dans supabase.js)
3. Respecter les RLS : chaque requête doit être filtrée par rôle ET chantier si chef
4. Pas de dépendances npm pour le frontend — vanilla JS uniquement (les scripts Node.js peuvent utiliser @supabase/supabase-js)
5. Garder la compatibilité PWA (sw.js, manifest.json)
6. Les chefs sont scopés par `user_metadata.chantier` — ne jamais hardcoder dans le JS
7. Ne pas modifier supabase.js sans comprendre checkAuthOrRedirect et le fallback localStorage
8. Après modification, toujours vérifier avec les tests : `test_runner.js`, `test_advanced.js`, `test_remaining.js`, `test_depth.js`

## État actuel (Juin 2026)
- ✅ 78/78 tests passés
- ✅ RLS appliquées sur toutes les tables (22 policies)
- ✅ Fallback hardcodé des 24 chefs supprimé de login.html
- ✅ Admin UI pour création de compte (service_role key ou signUp)
- ✅ Email auto-généré depuis le nom du chantier
- ✅ Changement mot de passe sur toutes les pages
- ✅ 23 chantiers uniques dans la DB
- ✅ Comptes auth.users pour admin/daf/rh/controleur/technicien
- ❌ 24 chefs pas encore migrés vers auth.users (utiliser migrate_all_chefs.js)
- ❌ MANUEL_UTILISATEUR.md obsolète (encore les anciens comptes demo)

## Mission en 5 étapes

### ÉTAPE 1 — METTRE À JOUR LE MANUEL UTILISATEUR
- Lis `MANUEL_UTILISATEUR.md` existant (351 lignes)
- Compare avec le code réel dans tous les fichiers HTML
- Mets à jour les sections obsolètes :
  * Remplacer la liste des 24 comptes chef par la procédure de création admin
  * Ajouter section "Administrateur — Gestion des utilisateurs"
  * Ajouter section "Changer son mot de passe"
  * Ajouter section "Scope chantier — comment ça marche"
  * Ajouter section "Créer un nouveau chef de chantier"
- Ne pas supprimer les sections toujours valides (pointage, salaires, stock, etc.)

### ÉTAPE 2 — TESTER LE MANUEL
- Vérifie que chaque fonctionnalité décrite dans le manuel existe dans le code
- Signale les incohérences
- Corrige le manuel si nécessaire

### ÉTAPE 3 — CRÉER LE README.md
- Le projet n'a pas de README.md à la racine
- Crée-le avec :
  * Description du projet NySoa BTP
  * Stack technique
  * Accès rapide aux URLs GitHub Pages
  * Comptes de démonstration (admin@nysoa.mg, daf@nysoa.mg, etc.)
  * Guide connexion Supabase
  * Lien vers MANUEL_UTILISATEUR.md et AGENTS.md
  * Scripts utiles (create_chef.js, migrate_all_chefs.js)

### ÉTAPE 4 — GÉNÉRER LA LISTE D'ERREURS (ERRORS.md)
- Analyse chaque fichier JS et HTML
- Génère ERRORS.md avec :
  * CRITIQUE : bugs bloquants
  * MOYEN : problèmes de performance/UX
  * FAIBLE : améliorations mineures
  * Code concerné (fichier + ligne)
  * Cause probable
- Ne pas inventer d'erreurs — vérifier chaque alerte dans le code

### ÉTAPE 5 — DÉBOGUER
- Prends les CRITIQUES de ERRORS.md
- Corrige-les une par une
- Après chaque correction : fichier, ligne, ce qui a changé et pourquoi
- Génère DEBUG_REPORT.md avec toutes les corrections

## Format de réponse
```
✅ ÉTAPE X — [nom] — TERMINÉE
```
Passer à l'étape suivante automatiquement.
