# MATRICE DE TESTS - NySoa BTP ERP
## Version: v2.1 | Date: 2026-06-13

---

## MODULE 1: DOTATIONS FELANA

### T1.1 - Création Dotation Classique (Liée à Chantier)
| ID | Description | Entrée | Résultat Attendu | Statut |
|----|-------------|--------|------------------|--------|
| T1.1.1 | Dotation valide avec chantier_id | chantier_id=5, montant=500000, motif="Achat matériaux" | INSERT dans dotations_felana + journal_global (visible_daf=TRUE) | 🔴 À TESTER |
| T1.1.2 | Vérifier traçabilité | Création dotation | journal_id présent dans dotations_felana | 🔴 À TESTER |
| T1.1.3 | Montant minimum | montant=1 | Accepté et inséré | 🟡 MINIME |

### T1.2 - Dotation Hors-Chantier
| ID | Description | Entrée | Résultat Attendu | Statut |
|----|-------------|--------|------------------|--------|
| T1.2.1 | Dotation avec flag | hors_chantier=TRUE, chantier_id=NULL | INSERT accepté, chantier_id=NULL | 🟢 VALIDÉ |
| T1.2.2 | Radio toggle | Sélection "Hors chantier" | Select chantier masqué, valeur = NULL | 🟢 VALIDÉ |
| T1.2.3 | Journal visible | Dotation hors-chantier | visible_daf=TRUE dans journal_global | 🟢 VALIDÉ |

### T1.3 - Cas d'Erreur Dotation
| ID | Description | Entrée | Résultat Attendu | Statut |
|----|-------------|--------|------------------|--------|
| T1.3.1 | Sans chantier ET sans flag | chantier_id=NULL, hors_chantier=FALSE | ❌ REJETÉ: "Sélectionner un chantier ou choisir Hors chantier" | 🔴 RISQUE |
| T1.3.2 | Montant négatif | montant=-100000 | ❌ REJETÉ: "Montant invalide" | 🟢 VALIDÉ |
| T1.3.3 | Montant = 0 | montant=0 | ❌ REJETÉ: "Montant invalide" | 🟢 VALIDÉ |
| T1.3.4 | Montant non numérique | montant="abc" | ❌ REJETÉ: "Montant invalide" | 🟡 AMÉLIORABLE |
| T1.3.5 | Motif vide | motif="" | ❌ REJETÉ: "Motif requis" | 🟢 VALIDÉ |
| T1.3.6 | Caractères spéciaux dans montant | montant="500000; DROP TABLE..." | ❌ parseFloat → NaN → REJETÉ | 🟡 AMÉLIORABLE |

---

## MODULE 2: CRÉDITS FOURNISSEURS

### T2.1 - Circuit d'Approbation
| ID | Description | Entrée | Résultat Attendu | Statut |
|----|-------------|--------|------------------|--------|
| T2.1.1 | Flux normal | Credit EN_ATTENTE → autoriserDafCredit() | Statut → AUTORISE_DAF | 🟢 VALIDÉ |
| T2.1.2 | Guard statut | Credit SOLDE → autoriserDafCredit() | 0 lignes mises à jour, pas d'erreur | 🟡 AMÉLIORABLE |
| T2.1.3 | Double autorisation | Double clic sur bouton | UPDATE avec eq('statut','EN_ATTENTE') = 0 rows | 🟢 VALIDÉ |

### T2.2 - Décaissement Crédit
| ID | Description | Entrée | Résultat Attendu | Statut |
|----|-------------|--------|------------------|--------|
| T2.2.1 | Solde insuffisant | montantPaye > _soldeFelana | ❌ REJETÉ: "SOLDE INSUFFISANT" | 🟢 VALIDÉ |
| T2.2.2 | Vérif statut avant débit | Crédit non-AUTORISE_DAF | ❌ REJETÉ: "ce credit n'est plus autorisé" | 🟢 VALIDÉ |
| T2.2.3 | Guard double-submit | UPDATE avec .in('statut',['AUTORISE_DAF',...]) | Évite double paiement | 🟢 VALIDÉ |
| T2.2.4 | Traçabilité | Décaissement | journal_paiement_id, decaisse_par, date_soldee enregistrés | 🟢 VALIDÉ |

### T2.3 - Cas Limites Crédits
| ID | Description | Entrée | Résultat Attendu | Statut |
|----|-------------|--------|------------------|--------|
| T2.3.1 | Montant > crédit restant | montantPaye > credit.reste1 | ⚠️ Autorisé mais solde insuffisant côté DB | 🔴 RISQUE |
| T2.3.2 | Requêtes simultanées | 2 clics simultanés sur "Décaisser" | 1 seul INSERT dans journal, 1 seul UPDATE crédit | 🔴 RISQUE |

---

## MODULE 3: TRÉSORERIE ET JOURNAL GLOBAL

### T3.1 - Écritures Dépenses DAF
| ID | Description | Entrée | Résultat Attendu | Statut |
|----|-------------|--------|------------------|--------|
| T3.1.1 | Dépense avec solde OK | montant=100000, _soldeFelana=500000 | INSERT réussi, solde mis à jour | 🟢 VALIDÉ |
| T3.1.2 | Dépense légère dépassement | montant=_soldeFelana+1% | Confirmation demandée | 🟢 VALIDÉ |
| T3.1.3 | Dépense >5% dépassement | montant=_soldeFelana+10% | ❌ REJETÉ | 🟢 VALIDÉ |
| T3.1.4 | Annulation dépense | deleteDepense(id) | statut → ANNULE, pas de DELETE | 🟢 VALIDÉ |

### T3.2 - Cohérence des Soldes
| ID | Description | Méthode | Statut |
|----|-------------|---------|--------|
| T3.2.1 | Calcul solde | SUM(dotations) - SUM(dépenses) WHERE visible_daf=TRUE | 🔴 À VÉRIFIER |
| T3.2.2 | Ligne par ligne | Chaque INSERT met à jour le solde | 🟡 NON ATOMIQUE |

### T3.3 - Validation des Inputs
| ID | Description | Entrée | Résultat | Statut |
|----|-------------|---------|----------|--------|
| T3.3.1 | Date future lointaine | date=2099-12-31 | Accepté (pas de validation) | 🟡 AMÉLIORABLE |
| T3.3.2 | XSS dans désignation | designation="<script>alert(1)</script>" | ❌ Non échappé côté SQL | 🔴 RISQUE |
| T3.3.3 | SQL injection | designation="'; DELETE FROM..." | ❌ Paramétré par Supabase | 🟢 VALIDÉ |

---

## MODULE 4: SÉCURITÉ ET RLS

### T4.1 - Politiques RLS
| Table | RLS | Politique Chef | Politique Admin/DAF | Statut |
|-------|-----|----------------|---------------------|--------|
| journal_global | ? | ? | ? | 🔴 À VÉRIFIER |
| dotations_felana | ? | ? | ? | 🔴 À VÉRIFIER |
| credits_fournisseurs | ? | AUCUN (DAF/Admin only) | Lecture/Écriture | 🟢 VALIDÉ |

### T4.2 - Authentification
| ID | Description | Résultat Attendu | Statut |
|----|-------------|------------------|--------|
| T4.2.1 | Accès admin.html sans auth | Redirection → login.html | 🟢 VALIDÉ |
| T4.2.2 | Accès daf.html sans auth | Redirection → login.html | 🟢 VALIDÉ |
| T4.2.3 | Token expiré | Comportement ? | 🔴 À TESTER |

---

## MODULE 5: INTERFACE ET UX

### T5.1 - Navigation
| ID | Élément | Résultat | Statut |
|----|---------|----------|--------|
| T5.1.1 | Nav items admin | 8 onglets fonctionnels | 🟢 VALIDÉ |
| T5.1.2 | showSection() | Fonctionne sur toutes sections | 🟢 VALIDÉ |
| T5.1.3 | Modals | Ouverture/fermeture correcte | 🟢 VALIDÉ |

### T5.2 - Feedback Utilisateur
| ID | Scénario | Notification Attendue | Statut |
|----|----------|----------------------|--------|
| T5.2.1 | Erreur SQL | Message clair avec détails | 🟡 AMÉLIORABLE |
| T5.2.2 | Succès | notify('... ✓', 'success') | 🟢 VALIDÉ |

---

## RÉSUMÉ DES RISQUES IDENTIFIÉS

| Priorité | ID | Description | Module |
|----------|----|-------------|--------|
| 🔴 CRITIQUE | T2.3.1 | Pas de vérification montant vs crédit restant | Crédits |
| 🔴 CRITIQUE | T2.3.2 | Race condition sur décaissement simultané | Crédits |
| 🔴 CRITIQUE | T3.3.2 | XSS potentiel dans désignation | Sécurité |
| 🔴 CRITIQUE | T1.3.1 | Cas limite: ni chantier ni flag | Dotations |
| 🟡 ÉLEVÉ | T3.2.2 | Calcul solde non atomique | Trésorerie |
| 🟡 ÉLEVÉ | T4.1.1 | RLS sur journal_global non documenté | RLS |
| 🟡 ÉLEVÉ | T3.3.1 | Pas de validation date future | Validation |
| 🟢 OK | - | Autres validations frontend | - |