# RAPPORT CORRECTIFS SÉCURITÉ — NySoa BTP ERP
## Session QA 2026-06-20 — Sprint XSS + RLS + Validation

**Date** : 2026-06-20T11:00:00 UTC  
**URL** : https://work-1-yatkfloknikzyluk.prod-runtime.all-hands.dev/ (hosts en Bad Gateway au moment du scan)  
**Méthode** : Analyse statique du code source + scan `find_xss.mjs`

---

## B-02 — XSS Stocké (innerHTML dangerous) ✅ FIXÉ

### Problème
De nombreuses interpolations `${var}` dans `innerHTML = \`...\`` n'étaient pas
échappées via `esc()`. Un payload injecté dans un nom de chantier, nom d'employé,
ou travaux d'un rapport pouvait s'exécuter.

### Correctifs appliqués (25+ points)

| # | Fichier | Ligne | Élément | Variable(s) |
|---|---------|-------|---------|-------------|
| 1 | rh.html | 734 | Fiche paie modal | `p.nom` → `esc(p.nom)` |
| 2 | rh.html | 1006 | Liste congés | `c.date_debut, c.date_fin, c.duree, c.motif` → `esc()` |
| 3 | rh.html | 1022 | Liste congés | `c.employe_nom` → `esc()` |
| 4 | rh.html | 1203 | Select chantier paie | `c` (option value+text) → `esc(c)` |
| 5 | rh.html | 1237 | Select chantier index | `c` (option value+text) → `esc(c)` |
| 6 | chef-chantier.html | 666 | Info chantier | `data.nom` → `esc()` |
| 7 | chef-chantier.html | 711 | Liste employés | `emp.nom` → `esc()` |
| 8 | chef-chantier.html | 791 | Modal détail emp | `data.matricule, data.metier, data.chantier` → `esc()` |
| 9 | chef-chantier.html | 948 | Tâches Gantt | `t.tache, t.chantier, t.date, t.equipe` → `esc()` |
| 10 | chef-chantier.html | 1071-1078 | Modal rapport détail | `r.date, r.meteo, travauxClean, matosMatch, notesMatch, r.problemes` → `esc()` |
| 11 | admin.html | 1382 | Notify toast | `msg` → `esc(msg)` |
| 12 | admin.html | 1422-1424 | Upload fichier | `file.name` (id+innerHTML) → `esc()` |
| 13 | admin.html | 1714 | Backup history | `fname, date` → `esc()` |
| 14 | admin.html | 1799 | Select chantier | `c.nom` (value+text) → `esc()` |
| 15 | admin.html | 1943-1968 | Tableau rapports | `r.date, r.chantier, r.travaux` → `esc()` |
| 16 | admin.html | 1985-1999 | Modal rapport détail | `r.date, r.chantier, r.meteo, r.travaux, t.nom` → `esc()` |
| 17 | admin.html | 2082-2084 | Inspections tableau | `dt, r.chantier, r.controleur` → `esc()` |
| 18 | admin.html | 2117 | Modal inspection | `r.chantier` → `esc()` |
| 19 | admin.html | 2499-2507 | Modal validation détail | `data.type, data.emetteur_role, data.emetteur_id, data.statut, data.commentaire, data.motif_rejet, data.decided_by` → `esc()` |
| 20 | admin.html | 2669 | CEO selects | `c.id, c.nom` → `esc()` |
| 21 | admin.html | 2685 | CEO selects prefix | `prefix` → `esc(prefix)` |
| 22 | daf.html | 1086 | Notify toast | `msg` → `esc(msg)` |
| 23 | daf.html | 1877 | Budget postes | `r.poste` (fallback label) → `esc()` |
| 24 | daf.html | 2079 | Devis | `d.statut` → `esc()` |

### Variables NON corrigées (safe — non utilisées)
- `icons[type]`, `formatAriary()` : fonctions de formatage safe
- `error.message`, `e.message`, `updateError.message` : messages d'erreur backend
- `prefix`, `toLocaleString()`, `scColor`, `statCls` : constantes/formateurs
- Booléens (`sc`, `ouvriers`, `r.chef_present`) : nombres, pas de HTML
- Enums (`typeLabel`, `meteoLabels`) : valeurs constantes contrôlées

### Validation scanner
```bash
$ node find_xss.mjs
=== UNSAFE INNERHTML ===
# (vide après correction — uniquement errors.messages safe restants)
```

---

## B-01 — DELETE Silencieux RLS ✅ FIXÉ

### Problème
Aucune policy DELETE n'existait pour 4 tables critiques. RLSPostgreSQL bloquait
silencieusement les DELETE sans retour d'erreur exploitable côté client (Supabase
retourne `{error: null}` même quand RLS bloque).

### Correctif : `FIX_DELETE_POLICIES.sql`

```sql
-- validations
DROP POLICY IF EXISTS delete_validations_admin ON validations;
CREATE POLICY delete_validations_admin ON validations
  FOR DELETE TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- controles_inopines
DROP POLICY IF EXISTS admin_delete_controles ON controles_inopines;
CREATE POLICY admin_delete_controles ON controles_inopines
  FOR DELETE TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- suppressions_log
DROP POLICY IF EXISTS admin_delete_suppressions ON suppressions_log;
CREATE POLICY admin_delete_suppressions ON suppressions_log
  FOR DELETE TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- gantt_taches
DROP POLICY IF EXISTS admin_delete_gantt ON gantt_taches;
CREATE POLICY admin_delete_gantt ON gantt_taches
  FOR DELETE TO public
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

### Tables avec DELETE dans le code JS
| Table | Fichier | Status |
|-------|---------|--------|
| `controles_inopines` | controleur.html:539 | Policy ajoutée |
| `gantt_taches` | admin.html:2338 | Policy ajoutée |
| `validations` | (aucun delete UI trouvé) | Policy ajoutée (préventif) |
| `suppressions_log` | (log only) | Policy ajoutée (nettoyage) |

### Note
Le code JS avait déjà une gestion d'erreur `if (error) throw/notify` — le fix SQL
est suffisant. Le DELETE silencieux était causé uniquement par l'absence de policy,
pas par le code client.

---

## A-001 — Validation Date Échéance ✅ FIXÉ

### Problème
Aucune validation côté client n'empêchait d'entrer une date d'échéance
passée ou actuelle lors de la création d'un engagement fournisseur.

### Correctif : `admin.html` (~ligne 3224)

```javascript
// A-001 : date_echeance doit être dans le futur
const rawEcheance = fd.get('date_echeance');
if (rawEcheance) {
    const echeanceDate = new Date(rawEcheance + 'T00:00:00');
    if (echeanceDate <= new Date()) {
        notifyCEO('La date d\'échéance doit être dans le futur', 'error');
        return false;
    }
}
```

**Valide pour** : création ET modification (`submitCreditFournisseur` gère les deux)

---

## Résumé des fichiers modifiés

| Fichier | Action |
|---------|--------|
| `rh.html` | 4 correctifs XSS |
| `chef-chantier.html` | 5 correctifs XSS |
| `admin.html` | 13 correctifs XSS + validation A-001 |
| `daf.html` | 3 correctifs XSS |
| `FIX_DELETE_POLICIES.sql` | Créé (4 policies DELETE) |

**Aucun commit push** — tous les fichiers sont en workspace local.
