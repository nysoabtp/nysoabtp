# NYSOA BTP Constitution

## Core Principles

### I. Vanilla-First
Vanilla JS + HTML + CSS prioritaire. Aucune dépendance framework frontend sans justification écrite. Utiliser des Web Components natifs si réutilisabilité nécessaire. Le code doit tourner sur GitHub Pages sans build step obligatoire.

### II. Supabase as Backend
Supabase est l'unique backend : auth, base de données PostgreSQL, stockage fichiers. Toute logique métier complexe va dans des Edge Functions ou des triggers PostgreSQL. Les appels Supabase passent par un module `supabase-client.js` centralisé.

### III. Contexte Malgache (NON-NEGOTIABLE)
Toute l'interface est en français. Les formats (dates, monnaie, nombres) suivent la locale fr-MG. Les rôles utilisateurs (Admin, DG, DAF, Chef de chantier, Magasinier, Comptable) reflètent la hiérarchie réelle d'une PME BTP à Madagascar. Le système de validation (Admin en dernier ressort) est obligatoire pour toute action financière.

### IV. PWA Offline-First
Fonctionne offline avec Service Worker et Cache API. Les données critiques sont synchronisées via localStorage + IndexedDB avec queue de sync quand la connexion revient. Le manifest.json et le Service Worker sont générés à la racine.

### V. Spécification-Driven (SDD)
Toute implémentation part d'une spec écrite et validée. Toute déviation de la spec doit être documentée et approuvée. La spec est la source de vérité, pas le code.

## Stack Technique

- **Frontend**: HTML5 + CSS3 + Vanilla JS (ES Modules)
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Hosting**: GitHub Pages + Supabase Cloud
- **PWA**: Service Worker + Cache API + Manifest
- **Auth**: Supabase Auth (email + session cookies)
- **Base de données**: PostgreSQL via Supabase (migrations SQL dans `supabase/`)

## Workflow de Développement

1. `/speckit.specify` → Écrire la spec complète d'une fonctionnalité
2. `/speckit.plan` → Plan technique avec découpage en tâches
3. `/speckit.tasks` → Générer des tâches actionnables
4. Implémenter en suivant la spec
5. Tester sur GitHub Pages (branche `main` = production)
6. Itérer via `/speckit.clarify` si ambiguïté

## Governance

Cette constitution prime sur toute autre pratique. Tout amendement nécessite une mise à jour de ce document et une revue complète du projet. Le principe de réalité terrain malgache (contexte des PME BTP, accès internet intermittent, utilisateurs non-techniciens) guide toutes les décisions techniques.

**Version**: 1.0.0 | **Ratifié**: 2026-06-08
