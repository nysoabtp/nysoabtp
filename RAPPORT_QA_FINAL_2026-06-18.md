# RAPPORT FINAL — Validation des tests QA Scénarios Inter-Rôles

**Date** : 2026-06-18  
**Script** : `qa_scenarios_interroles.js`  
**Environnement** : localhost:8080 + Supabase production

---

## Résumé des tests

| Statut | Nombre |
|--------|--------|
| 🟢 Réussis | 7 |
| 🟡 Attention | 0 |
| 🔴 Échecs | 1 |
| **Total** | **8 tests exécutés** |

> **Note** : CREDIT-05-TRACABILITE n'a pas été exécuté car il dépend de CREDIT-04.

---

## Détail des 9 tests

| ID | Description | Statut | Résultat |
|----|-------------|--------|----------|
| RECRUT-02-DB-INSERT | INSERT dans `validations` | 🟢 | statut=EN_ATTENTE, emetteur_role=chef ✅ |
| RECRUT-03-UI-VISIBLE | Admin voit demande EN_ATTENTE | 🟢 | Bouton Approuver présent ✅ |
| RECRUT-03B-LABEL | Libellé type recrutement | 🟢 | `Demande recrutement` ✅ |
| RECRUT-05-DB-APPROVED | Statut APPROUVE après validation | 🟢 | decided_at et decided_by renseignés ✅ |
| CREDIT-01-DB-INSERT | INSERT crédit fournisseur | 🟢 | montant_total=150000 ✅ |
| CREDIT-02-AUTORISATION | Autorisation → AUTORISE_DAF | 🟢 | ✅ |
| CREDIT-03-DECAISSEMENT-EXCESSIF | Rejet montant excessif | 🟢 | Statut reste AUTORISE_DAF ✅ |
| CREDIT-04-DECAISSEMENT-VALIDE | Décaissement → SOLDE | 🔴 | Erreur: null |
| CREDIT-05-TRACABILITE | Écriture dans journal_global | — | Non exécuté |

---

## 🔴 Analyse CREDIT-04-DECAISSEMENT-VALIDE

### Message d'erreur exact
```
Erreur: null
```

La requête `dbSelect()` retourne `{ data: null, error: null }` — pas d'erreur SQL mais aucune ligne retournée.

### Investigation

| Étape | Résultat |
|-------|----------|
| RPC `decaisser_credit` | ✅ `success: true, journal_id: 15` |
| Colonnes écrites en base | ✅ `statut=SOLDE`, `decaisse_le`, `date_soldee`, `reference_paiement`, `decaisse_par`, `journal_paiement_id` tous remplis |
| Lecture depuis DAF après RPC | ❌ `data: null` (0 lignes retournées) |
| Lecture depuis ADMIN après RPC | ✅ Crédit visible avec `statut=SOLDE` |

### Cause identifiée : Bug RLS sur `credits_fournisseurs`

La politique RLS (Row Level Security) pour le rôle DAF filtre les crédits par statut :
- ✅ DAF peut lire : `AUTORISE_DAF`, `EN_COURS`, `PARTIELLEMENT_PAYE`
- ❌ DAF **ne peut pas** lire : `SOLDE`

Après la RPC qui passe le crédit à `SOLDE`, le test DAF ne peut plus accéder à la ligne pour vérifier le statut.

### Ce que ce n'est PAS

| Éliminé | Raison |
|---------|--------|
| Erreur de colonne manquante | Les colonnes existent et sont bien remplies |
| Bug dans la RPC | Fonctionne parfaitement |
| Régression des correctifs SQL | Tous les correctifs sont opérationnels |

---

## Erreurs console JavaScript

```
[error] Failed to load resource: the server responded with a status of 400 ()
[error] Failed to load resource: the server responded with a status of 400 ()
[error] Failed to load resource: the server responded with a status of 400 ()
```

Ces erreurs correspondent aux requêtes REST échouées (lecture via `.single()` quand RLS bloque l'accès).

---

## Correctifs validés

| Correctif | Statut |
|-----------|--------|
| `categorie` ajoutée sur `journal_global` | ✅ Opérationnel |
| `date_soldee`, `reference_paiement`, `notes_paiement_daf`, `decaisse_par`, `journal_paiement_id` ajoutées sur `credits_fournisseurs` | ✅ Opérationnel |
| `demande_recrutement: 'Demande recrutement'` ajouté au mapping `typeLabel` dans `admin.html` | ✅ Opérationnel |

---

## Correctifs de code applicatif validés

| Fichier | Correctif | Statut |
|---------|-----------|--------|
| `devis.js` | `imprimerDevis()` : `devis_lot_id` → `lot_id` | ✅ Appliqué |
| `devis.js` | `imprimerDevis()` : `prix_unitaire` → `prix_unit` (4 occurrences) | ✅ Appliqué |
| `admin.html` | Mapping `typeLabel` : ajout `demande_recrutement` | ✅ Appliqué et validé |

---

## Bugs restants

| ID | Type | Gravité | Description |
|----|------|---------|-------------|
| CREDIT-04 | RLS | Moyenne | Politique DAF exclut les crédits `SOLDE` de la lecture |

---

## Recommandations

1. **Corriger la politique RLS** sur `credits_fournisseurs` pour permettre à DAF de lire les crédits `SOLDE`, OU modifier le script QA pour vérifier le statut depuis le compte admin.

2. **Rejouer les tests QA** après correction RLS pour valider le scénario complet.

---

## Fichiers modifiés durant cette session

| Fichier | Action |
|---------|--------|
| `admin.html` | Correctif `typeLabel` |
| `devis.js` | Correctif `imprimerDevis()` |
| `qa_scenarios_interroles.js` | Correction `window.db` → `db` (script QA) |

---

*Rapport généré automatiquement par Playwright QA — NySoa BTP ERP*
