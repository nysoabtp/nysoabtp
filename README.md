# NySoa BTP — ERP de gestion BTP

Application web de gestion intégrée pour les entreprises de Bâtiment et Travaux Publics. 6 rôles, dashboard par profil, Supabase en backend.

## Stack

- **Frontend** : HTML / CSS / JavaScript vanilla (PWA)
- **Backend** : Supabase (PostgreSQL + Auth + RLS + Management API)
- **Déploiement** : GitHub Pages
- **Tests** : Puppeteer (49 scénarios manuels automatisés)

## Accès rapide

| Lien | Description |
|------|-------------|
| [Application](https://nysoabtp.github.io/nysoabtp/login.html) | Page de connexion |
| [Documentation](MANUEL_UTILISATEUR.md) | Manuel utilisateur complet |

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|-------------|
| Administrateur | `admin@nysoa.mg` | `admin123` |
| DAF | `daf@nysoa.mg` | `daf123` |
| RH | `rh@nysoa.mg` | `rh123` |
| Chef chantier | `chef@nysoa.mg` | `chef123` |
| Contrôleur | `controleur@nysoa.mg` | `controleur123` |
| Technicien | `technicien@nysoa.mg` | `tech123` |

## Rôles

| Rôle | Page | Périmètre |
|------|------|-----------|
| **Admin** | `admin.html` | Import, utilisateurs, backups, contrôles, validations, Gantt |
| **DAF** | `daf.html` | Comptabilité, budgets, devis, factures, rapports |
| **RH** | `rh.html` | Employés, paie, congés, formations, recrutement |
| **Chef chantier** | `chef-chantier.html` | Scope chantier (équipe, pointage, matériaux, planning, rapports) |
| **Contrôleur** | `controleur.html` | Inspections qualité/sécurité |
| **Technicien** | `technicien.html` | Projets, tâches, interventions |

## Scripts utiles

| Script | Description |
|--------|-------------|
| `create_chef.js` | Créer un compte chef via service_role Supabase |
| `migrate_all_chefs.js` | Migrer tous les comptes fallback vers auth.users |
| `test_manual.js` | Guide interactif de tests manuels (lancez `node test_manual.js`) |

## Base de données

Tables principales : `chantiers`, `personnel`, `pointage_attendance`, `salaires`, `controles_inopines`, `rapports_chantier`, `stocks_chantier`, `materiels`, `journal`, `devis`, `gantt_taches`, `caisse`.

## Développement

```bash
# Cloner
git clone https://github.com/nysoabtp/nysoabtp.git

# Installer les dépendances (scripts Node uniquement)
npm install @supabase/supabase-js

# Lancer les tests manuels guidés
node test_manual.js
```

## Licence

Propriétaire — NySoa BTP 
# Force rebuild Sat Jun 13 11:37:02 UTC 2026
