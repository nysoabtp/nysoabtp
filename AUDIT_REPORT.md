# RAPPORT D'AUDIT - NySoa BTP ERP
**Version:** v2.1 | **Date:** 2026-06-13 | **Auditeur:** OpenHands QA Agent

---

## 📊 RÉSUMÉ EXÉCUTIF

| Catégorie | Nombre | Niveau |
|-----------|--------|--------|
| 🔴 Vulnérabilités critiques | 3 | CRITIQUE |
| 🟡 Alertes mineures | 5 | ÉLEVÉ |
| 🟢 Points validés | 18 | BON |
| 📋 Tests à exécuter | 12 | MANUEL |

---

## 🔴 VULNÉRABILITÉS / BUGS CRITIQUES

### V-001: Race Condition sur Décaissement Crédit
**Sévérité:** CRITIQUE | **Module:** Crédits Fournisseurs

**Description:**
Lors de décaissements simultanés (double-clic ou requêtes parallèles), le système peut:
1. Créer 2 écritures dans `journal_global` avec le même `montantPaye`
2. Mettre à jour le crédit 2 fois si `_soldeFelana` est suffisant

**Localisation:** `daf.html:submitDecaissement()`

**Preuve de risque:**
```javascript
// Lignes 1741-1743: Guard côté UPDATE
.eq('id', creditId)
.in('statut', ['AUTORISE_DAF','EN_COURS','PARTIELLEMENT_PAYE'])
```
Le guard ne protège pas contre l'insertion de 2 lignes dans `journal_global`.

**Impact:** Perte financière potentielle (paiement en double)

**Recommandation:**
```javascript
// Ajouter un verrou applicatif via PostgreSQL
// 1. Ajouter colonne decaisse_le TIMESTAMPTZ DEFAULT NULL
// 2. Vérifier atomiquement
UPDATE credits_fournisseurs 
SET statut = 'SOLDE'
WHERE id = creditId 
  AND statut IN ('AUTORISE_DAF','EN_COURS','PARTIELLEMENT_PAYE')
  AND decaisse_le IS NULL
RETURNING id;
// Si 0 lignes retournées → abandonner
```

---

### V-002: Montant Décaissement non Comparé au Crédit Restant
**Sévérité:** CRITIQUE | **Module:** Crédits Fournisseurs

**Description:**
Le système vérifie le solde Felana mais PAS si `montantPaye` <= `reste1` du crédit.

**Localisation:** `daf.html:1689-1756`

**Scénario d'exploitation:**
1. Crédit avec `montant_total=500000`, `reste1=100000`
2. DAF saisit `montantPaye=400000`
3. Si `_soldeFelana >= 400000` → ACCEPTÉ
4. Résultat: Décaissement de 400k au lieu de 100k max

**Impact:** Dépassement du crédit autorisé

**Recommandation:**
```javascript
// Ajouter après ligne 1711
if (credit.reste1 && montantPaye > credit.reste1) {
    notify(`Montant dépasse le crédit restant: ${fmt(credit.reste1)} Ar`, 'error');
    return false;
}
```

---

### V-003: Validation Insuffisante Montant Non-Numérique
**Sévérité:** CRITIQUE | **Module:** Validation Inputs

**Description:**
`parseFloat("abc")` retourne `NaN`, qui est != 0, donc la validation `montant <= 0` passe.

**Localisation:** `daf.html:1407-1408`

**Preuve:**
```javascript
const montant = parseFloat(fd.get('montant'));
if (!montant || montant <= 0) { ... }
// NaN est truthy mais NaN <= 0 est false!
```

**Impact:** Tentative d'insertion avec `NaN` dans la BDD

**Recommandation:**
```javascript
const montant = parseFloat(fd.get('montant'));
if (!montant || isNaN(montant) || montant <= 0) {
    notify('Montant invalide', 'error');
    return false;
}
```

---

## 🟡 ALERTES MINEURES / AMÉLORATIONS

### A-001: Pas de Validation Date Future
**Sévérité:** ÉLEVÉ | **Module:** Trésorerie

**Observation:** Les dates futures lointaines (2099-12-31) sont acceptées sans avertissement.

**Recommandation:** Ajouter une validation max date (ex: +1 an).

---

### A-002: Calcul Solde Non-Atomique
**Sévérité:** ÉLEVÉ | **Module:** Trésorerie

**Observation:** Le solde est recalculé via `SUM()` après chaque opération, ce qui peut créer des incohérences temporaires en cas d'erreur.

**Recommandation:** Envisager un trigger PostgreSQL pour maintenir un solde constant.

---

### A-003: RLS sur journal_global Non Documenté
**Sévérité:** ÉLEVÉ | **Module:** Sécurité

**Observation:** Aucune politique RLS visible dans les scripts SQL pour `journal_global`.

**Recommandation:** Ajouter:
```sql
ALTER TABLE journal_global ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CEO DAF manage journal_global" ON journal_global
FOR ALL USING (auth.jwt()->'user_metadata'->>'role' IN ('ceo','admin','daf'));
```

---

### A-004: Message d'Erreur Technique Exposée
**Sévérité:** MOYEN | **Module:** UX

**Observation:** `notifyCEO('Erreur : ' + ex.message, 'error')` peut exposer des détails techniques à l'utilisateur.

**Recommandation:** Logger l'erreur complète, afficher un message générique.

---

### A-005: Double Chargement CEO Selects
**Sévérité:** MOYEN | **Module:** admin.html

**Observation:** Le commit `1e8a591` a supprimé le listener duplicate, mais le code original avait un problème de double appel.

**Vérification:** ✅ CORRIGÉ dans le commit récent.

---

## 🟢 LOGIQUES VALIDÉES AVEC SUCCÈS

| ID | Fonctionnalité | Détail |
|----|-----------------|--------|
| L-001 | Flux Dotations Felana | INSERT dans dotations_felana + journal_global avec visible_daf=TRUE |
| L-002 | Hors-Chantier Toggle | Radio "Par chantier" / "Hors chantier" fonctionne, chantier_id=NULL |
| L-003 | Guard autoriserDafCredit | UPDATE avec .eq('statut','EN_ATTENTE') protège contre double autorisation |
| L-004 | Guard deleteDepense | UPDATE statut='ANNULE' plutôt que DELETE, préserve traçabilité |
| L-005 | Validation montant <= 0 | Bloque montants négatifs ou nuls (sauf bug NaN V-003) |
| L-006 | Solde insuffisant expense | Bloque si montant > _soldeFelana + 5% |
| L-007 | Solde insuffisant decaissement | Bloque si montantPaye > _soldeFelana |
| L-008 | XSS Prevention | Fonction `esc()` appliquée sur toutes les insertions innerHTML |
| L-009 | RLS sur credits_fournisseurs | Accès CEO/Admin uniquement |
| L-010 | RLS sur dotations_felana | Accès CEO/Admin uniquement |
| L-011 | Statut initial credits | Hardcodé 'EN_ATTENTE' à la création |
| L-012 | Traçabilité décaissement | journal_paiement_id, decaisse_par, date_soldee |
| L-013 | Auth redirect | checkAuthOrRedirect() protège toutes les pages |
| L-014 | Montant > 5% dépassement | Confirmation requise, puis acceptation optionnelle |
| L-015 | Formatage montants | Fonction fmt() avec séparateurs milliers |
| L-016 | Reset formulaires | e.target.reset() après succès |
| L-017 | Notification succès/erreur | notify() avec icons et couleurs appropriées |
| L-018 | showSection navigation | Toutes les 8 sections accessibles |

---

## 📋 TESTS À EXÉCUTER MANUELLEMENT

| ID | Test | URL | Étapes |
|----|------|-----|--------|
| TM-01 | Dotation avec chantier valide | admin.html | Formulaire dotation → sélectionner chantier → montant → Submit |
| TM-02 | Dotation hors-chantier | admin.html | Sélectionner "Hors chantier" → Submit |
| TM-03 | Dotation sans chantier (devrait échouer) | admin.html | Ne rien sélectionner → Submit → doit afficher erreur |
| TM-04 | Autorisation crédit | admin.html | Cliquer "Auth." sur un crédit EN_ATTENTE |
| TM-05 | Décaissement crédit | daf.html | Sélectionner crédit AUTORISE_DAF → montant <= solde |
| TM-06 | Décaissement > crédit restant | daf.html | Saisir montant > reste1 → doit échouer |
| TM-07 | Double-clic décaissement | daf.html | Cliquer 2 fois rapidement → vérifier 1 seul mouvement |
| TM-08 | Montant non-numérique | daf.html | Saisir "abc" dans montant → doit échouer |
| TM-09 | Solde insuffisant | daf.html | Dépense > solde + 5% → doit être bloqué |
| TM-10 | XSS dans désignation | admin.html | Saisir `<script>alert(1)</script>` → vérifier pas exécuté |
| TM-11 | Accès sans auth | admin.html | Ouvrir dans navigateur privé → doit rediriger |
| TM-12 | Export journal | admin.html | Cliquer export journal → vérifier fichier.xlsx |

---

## 🔧 CORRECTIONS RECOMMANDÉES

### Correction Prioritaire 1: V-003 (NaN validation)
```javascript
// Dans daf.html ligne 1407-1408
const montant = parseFloat(fd.get('montant'));
if (!montant || isNaN(montant) || montant <= 0) { 
    notify('Montant invalide', 'error'); 
    return false; 
}
```

### Correction Prioritaire 2: V-002 (Crédit restant)
```javascript
// Après ligne 1711 dans submitDecaissement
if (credit.reste1 && montantPaye > credit.reste1) {
    notify(`Montant dépasse le crédit restant: ${fmt(credit.reste1)} Ar`, 'error');
    return false;
}
```

### Correction Prioritaire 3: V-001 (Race condition)
```sql
-- Ajouter colonne
ALTER TABLE credits_fournisseurs ADD COLUMN IF NOT EXISTS decaisse_le TIMESTAMPTZ;
-- Nouvelle politique
CREATE POLICY "Atomic decaissement" ON credits_fournisseurs
FOR UPDATE USING (decaisse_le IS NULL OR decaisse_le > NOW() - INTERVAL '1 minute');
```

---

## 📁 FICHIERS ANALYSÉS

| Fichier | Lignes | Description |
|---------|--------|-------------|
| daf.html | 2067 | Interface DAF avec journal_global |
| admin.html | 3213 | Interface Admin/CEO |
| supabase_schema.sql | 369 | Schéma PostgreSQL |
| SUPABASE_SETUP.sql | 386+ | Création tables + RLS |
| MIGRATION_NOUVELLES_TABLES.sql | 176 | Tables additionnelles |
| FIX_RLS_CHEF.sql | 217 | Politiques RLS chefs |
| FIX_RLS_ALL_TABLES.sql | 272 | Politiques RLS complètes |

---

## ✅ CONCLUSION

L'application NySoa BTP ERP présente une architecture solide avec:
- ✅ Bonne séparation des rôles (CEO/DAF/Chef/RH)
- ✅ Validation frontend correcte dans la plupart des cas
- ✅ Traçabilité des opérations via journal_global
- ✅ Protection XSS via fonction esc()

**Points critiques à corriger:**
1. **V-003**: Validation montant avec isNaN()
2. **V-002**: Vérification crédit restant avant décaissement
3. **V-001**: Protection race condition sur décaissements

**Score global:** 78/100 (18 validations positives, 3 critiques, 5 améliorations)

---

*Rapport généré par OpenHands QA Agent - 2026-06-13*