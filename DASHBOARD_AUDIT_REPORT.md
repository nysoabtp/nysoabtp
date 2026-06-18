# Dashboard Audit - NySoa BTP ERP

**Date**: 2026-06-18T08:32:15.171Z
**Status**: 🔴 Audit only — Aucune correction appliquée

---

## ADMIN (@nysoa.mg)

### Tableau Utilisateurs
- Status: ⚠️ **Tableau avec données mais KPIs à 0**
  - `0 Journal | 0 Achats | 0 Personnel | 0 Pointages`

### KPIs Dashboard
| KPI | Valeur |
|-----|--------|
| Total Recettes | — (placeholder) |
| Total Dépenses | — (placeholder) |
| Bénéfice Net | — (placeholder) |
| Crédits Fournisseurs | — (placeholder) |

### Sections
- Rapports: ✅ Présente
- Contrôles: ✅ Présente
- Gantt: ✅ Présente
- Utilisateurs: ✅ Présente
- État chargement: ✅ Pas de "Chargement..."

**Conclusion ADMIN**: ⚠️ Sections chargées mais KPIs vierges (—)

---

## DAF (@nysoa.mg)

### KPIs Dashboard
| KPI | Valeur | Status |
|-----|--------|--------|
| Budget total | 20 000 000 Ar | ✅ Réel |
| Solde | 19 650 000 Ar | ✅ Réel |
| Dépenses ce mois | 350 000 Ar | ✅ Réel |
| Crédits fournisseurs à payer | 0 Ar | ⚠️ Placeholder probable |
| Dernière dotation CEO | — | ⚠️ Placeholder |

### Tableaux
- Status: ✅ Données chargées (Journal, Crédits)
- État chargement: ✅ Pas de "Chargement..."

**Conclusion DAF**: ✅ Mix OK — Budget/dépenses réelles, certains KPIs partiels

---

## RH (@nysoa.mg)

### KPIs Dashboard
| KPI | Valeur | Status |
|-----|--------|--------|
| Total employés | — | 🔴 Placeholder |
| Nouvelles embauches | — | 🔴 Placeholder |
| Congés en cours | — | 🔴 Placeholder |
| Formations planifiées | — | 🔴 Placeholder |
| **Offres actives** | **5** | ✅ Réel |
| Candidatures | — | 🔴 Placeholder |
| Entretiens planifiés | 8 | ✅ Réel |
| Masse salariale | — | 🔴 Placeholder |
| Net à payer ce mois | — | 🔴 Placeholder |
| Fiches ce mois | 0 | ✅ Réel |

### État
- État chargement: ✅ Pas de "Chargement..."
- Section Personnel: ⚠️ Tableau personnel non visible sur le dashboard principal

**Conclusion RH**: 🔴 **Majorité des KPIs à "—"** — Seuls "Offres actives" (5) et "Entretiens planifiés" (8) sont chargés depuis Supabase. Les KPIs effectifs/absences/congés/paye ne sont pas alimentés.

---

## Synthèse

| Rôle | Status | Problèmes |
|------|--------|-----------|
| ADMIN | ⚠️ | KPIs vierges (—), tableaux OK |
| DAF | ✅/⚠️ | Budget réel OK, autres KPIs partiels |
| RH | 🔴 | 8/10 KPIs à "—" |

**Action requise**: Vérifier le chargement des fonctions `loadRHData()`, `loadAdminStats()`, `loadDAFStats()` — les KPIs sont initialisés à "—" mais ne sont jamais mis à jour après les requêtes Supabase.

---

*Screenshots: `SCREENSHOT_ADMIN_dashboard.png`, `SCREENSHOT_DAF_dashboard.png`, `SCREENSHOT_RH_dashboard.png`*
