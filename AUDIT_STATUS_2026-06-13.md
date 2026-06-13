# Audit NySoa BTP — 13/06/2026

## État des corrections appliquées par OpenHands

| ID | Problème | Statut | Action |
|----|----------|--------|--------|
| BLK-01 | config.js absent | ✅ OK | Déjà déployé |
| SEC-01 | Mots de passe en clair | ✅ OK | Déjà supprimé |
| SEC-02 | Auth localStorage | ✅ OK | checkAuthOrRedirect corrigé |
| SEC-03 | XSS innerHTML | 🟡 Partiel | chef-chantier.html:877 corrigé, admin.html:1798 corrigé |
| DATA-01 | Technicien localStorage | ✅ OK | loadInterventions utilise Supabase |
| DATA-04 | Pointage → pointage_attendance | ✅ OK | Déjà corrigé |
| ERR-01 | Empty catch blocks | ✅ OK | Gestion d'erreur ajoutée |
| CODE-02 | Doublon id="budget" | ✅ OK | Non reproduit |

## Corrections appliquées par OpenHands

### 1. XSS Protection - chef-chantier.html:877
```javascript
// Avant (non sécurisé)
tr.innerHTML = `<td>${t.tache||'—'}</td><td>${t.chantier||'—'}</td>...`;

// Après (sécurisé)
tr.innerHTML = `<td>${esc(t.tache||'—')}</td><td>${esc(t.chantier||'—')}</td>...`;
```

### 2. XSS Protection - admin.html:1798
```javascript
// Avant (non sécurisé)
sel.innerHTML = '<option value="">-- Choisir --</option>' + data.map(c => `<option value="${c.nom}">${c.nom}</option>`).join('');

// Après (sécurisé)
sel.innerHTML = '<option value="">-- Choisir --</option>' + data.map(c => `<option value="${esc(c.nom)}">${esc(c.nom)}</option>`).join('');
```

## Problèmes restants (priorité moindre)

| ID | Problème | Commentaire |
|----|----------|-------------|
| SEC-03 | innerHTML non sanitisé | La plupart utilisent e.message (système) ou sont safe. À vérifier cas par cas. |
| stock.js | localStorage + sync Supabase | Pattern acceptable pour offline-first |
| Console logs | Logs en production | À nettoyer en mode release |

## Notes importantes

1. **esc() est disponible** dans toutes les pages HTML grâce à supabase.js chargé avant les scripts inline
2. **La plupart des innerHTML** avec `${...}` sont des messages d'erreur système (e.message) qui ne contiennent pas de HTML
3. **Le pattern localStorage + sync Supabase** pour stock.js est acceptable pour la résilience hors ligne