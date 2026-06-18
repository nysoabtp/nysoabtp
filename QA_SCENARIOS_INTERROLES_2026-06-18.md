# QA SCÉNARIOS INTER-RÔLES — NySoa BTP ERP
## Date: 2026-06-18T07:27:30.404Z
## Méthode: Playwright + vérification réelle en base via db (pas de lecture DOM seule)

> Ce rapport teste des **circuits complets entre rôles** (création par un rôle, traitement/validation par un autre), avec vérification de l'état réel en base de données après chaque action UI, y compris la gestion des dialogues natifs (`prompt()`/`confirm()`) déclenchés par le code métier.

## Résumé

| Statut | Nombre |
|---|---|
| 🟢 Réussis | 9 |
| 🟡 Attention | 0 |
| 🔴 Échecs | 0 |
| **Total** | **9** |

## Détail

| ID | Description | Attendu | Obtenu | Statut | Notes |
|---|---|---|---|---|---|
| RECRUT-02-DB-INSERT | INSERT réel dans `validations` | statut=EN_ATTENTE, emetteur_role=chef | statut=EN_ATTENTE, emetteur_role=chef, type=demande_recrutement | 🟢 |  |
| RECRUT-03-UI-VISIBLE | Admin voit la demande dans la file de validation | Bouton Approuver présent pour cet ID | Présent | 🟢 |  |
| RECRUT-03B-LABEL | Libellé affiché pour le type "demande_recrutement" | Un libellé lisible (ex: "Demande recrutement") | Demande recrutement | 🟢 |  |
| RECRUT-05-DB-APPROVED | Statut en base après approbation | statut=APPROUVE, decided_at renseigné | statut=APPROUVE, decided_at=2026-06-18T07:27:04.365+00:00, decided_by=admin | 🟢 |  |
| CREDIT-01-DB-INSERT | INSERT réel dans `credits_fournisseurs` | statut=EN_ATTENTE, montant_total=150000 | statut=EN_ATTENTE, montant_total=150000 | 🟢 |  |
| CREDIT-02-AUTORISATION | Statut en base après autorisation CEO/admin | statut=AUTORISE_DAF | statut=AUTORISE_DAF | 🟢 |  |
| CREDIT-03-DECAISSEMENT-EXCESSIF | Décaissement > montant du crédit doit être REJETÉ | Statut reste AUTORISE_DAF, aucune écriture journal | statut=AUTORISE_DAF (rejet confirmé) | 🟢 |  |
| CREDIT-04-DECAISSEMENT-VALIDE | Décaissement valide doit faire passer le crédit à SOLDE | statut=SOLDE | statut=SOLDE | 🟢 |  |
| CREDIT-05-TRACABILITE | Écriture créée dans journal_global pour ce décaissement | Au moins une ligne avec reference=QA-TEST-REF | 2 ligne(s) trouvée(s) | 🟢 |  |

## Erreurs console JS observées pendant les scénarios

- [2026-06-18T07:27:21.871Z] Failed to load resource: the server responded with a status of 400 ()
- [2026-06-18T07:27:22.967Z] Failed to load resource: the server responded with a status of 400 ()
- [2026-06-18T07:27:29.751Z] Failed to load resource: the server responded with a status of 400 ()

## Échecs critiques 🔴

Aucun.
