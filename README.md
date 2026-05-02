# NYSOA BTP — PWA

Application de gestion de chantiers BTP, installable sur mobile (PWA).

## Déploiement sur GitHub Pages (5 étapes)

### 1. Créer le dépôt GitHub
- Va sur [github.com](https://github.com) → **New repository**
- Nom : `nysoa-btp`
- Visibilité : **Public** (obligatoire pour GitHub Pages gratuit)
- Cliquer **Create repository**

### 2. Uploader les fichiers
Dans le dépôt vide, clique **"uploading an existing file"** et glisse-dépose :
```
index.html
manifest.json
sw.js
icons/
  icon-192.png
  icon-512.png
```
Puis cliquer **Commit changes**.

### 3. Activer GitHub Pages
- Aller dans **Settings** → **Pages**
- Source : **Deploy from a branch**
- Branch : `main` / `root`
- Cliquer **Save**

### 4. Obtenir l'URL
Après ~2 minutes, l'URL sera :
```
https://TON-USERNAME.github.io/nysoa-btp/
```

### 5. Installer sur le téléphone

**Android (Chrome) :**
1. Ouvrir l'URL dans Chrome
2. Bandeau "Ajouter à l'écran d'accueil" → Installer
3. L'icône NYSOA BTP apparaît sur l'écran d'accueil

**iPhone (Safari uniquement) :**
1. Ouvrir l'URL dans Safari
2. Icône Partager → "Sur l'écran d'accueil" → Ajouter

## Structure des fichiers
```
nysoa-btp/
├── index.html        ← Application complète (PWA)
├── manifest.json     ← Config installation mobile
├── sw.js             ← Service Worker (mode offline)
└── icons/
    ├── icon-192.png  ← Icône Android
    └── icon-512.png  ← Icône splash screen
```

## Prochaines étapes — connexion Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Exécuter `nysoa_01_schema.sql` puis `nysoa_02_migration.sql`
3. Remplacer les données statiques dans `index.html` par des appels API Supabase

---
NYSOA BTP v1.0 — Mai 2026
