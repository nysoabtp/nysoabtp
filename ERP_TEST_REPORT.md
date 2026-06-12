# ERP Test Report - NySoa BTP
**Date:** 2026-06-12
**URL:** https://nysoabtp.github.io/nysoabtp/

## Vérification Tables Vides

⚠️ Note: Les tokens JWT ont expiré pendant les tests. Vérification via navigateur uniquement.

### Tables observées (via navigateur):
| Table | Statut |
|-------|--------|
| Projets/Chantiers | ✅ VIDE (dashboard montre 0) |
| Employés | ✅ VIDE (dashboard montre 0) |
| Stock | ⚠️ DONNÉES (5 articles Ciment persistent) |

---

## Tests de Rôles

### 1. ADMIN
| Test | Résultat | Notes |
|------|----------|-------|
| 1.1 Login admin | ✅ OK | admin@nysoa.mg / admin123 |
| 1.2 Dashboard charge | ✅ OK | 0 Projets, 0 Employés |
| 1.3 Déconnexion | ✅ OK | Redirection vers login.html |
| 1.4 Créer chantier | ⏳ À TESTER | Nécessite token valide |
| 1.5 Créer employé | ⏳ À TESTER | Nécessite token valide |
| 1.6 Créer devis | ⏳ À TESTER | Nécessite token valide |
| 1.7 Import Excel | ⏳ À TESTER | Interface visible |
| 1.8 Page Utilisateurs | ⏳ À TESTER | Bouton visible |

### 2. CHEF CHANTIER
| Test | Résultat | Notes |
|------|----------|-------|
| 2.1 Login chef | ⏳ À CRÉER | Compte inexistant |
| 2.2 Redirection | ⏳ À TESTER | - |
| 2.3 Liste chantiers | ⏳ À TESTER | - |
| 2.4 Pointer employé | ⏳ À TESTER | - |

### 3. RH
| Test | Résultat | Notes |
|------|----------|-------|
| 3.1 Login RH | ⏳ À CRÉER | Compte inexistant |
| 3.2 rh.html | ⏳ À TESTER | - |
| 3.3 Ajouter congé | ⏳ À TESTER | - |
| 3.4 Ajouter recrutement | ⏳ À TESTER | - |

### 4. DAF
| Test | Résultat | Notes |
|------|----------|-------|
| 4.1 Login DAF | ⏳ À CRÉER | Compte inexistant |
| 4.2 daf.html | ⏳ À TESTER | - |
| 4.3 Dépenses | ⏳ À TESTER | - |
| 4.4 Crédits fournisseurs | ⏳ À TESTER | - |

### 5. CONTRÔLEUR
| Test | Résultat | Notes |
|------|----------|-------|
| 5.1 Login contrôleur | ⏳ À CRÉER | Compte inexistant |
| 5.2 controleur.html | ⏳ À TESTER | - |
| 5.3 Rapports chantiers | ⏳ À TESTER | - |

### 6. TECHNICIEN
| Test | Résultat | Notes |
|------|----------|-------|
| 6.1 Login technicien | ⏳ À CRÉER | Compte inexistant |
| 6.2 technicien.html | ⏳ À TESTER | - |
| 6.3 Matériels disponibles | ⏳ À TESTER | - |

### 7. Sécurité Inter-Rôles
| Test | Résultat | Notes |
|------|----------|-------|
| 7.1 Chef → admin.html | ⏳ À TESTER | - |
| 7.2 Tech → daf.html | ⏳ À TESTER | - |
| 7.3 RH → chef-chantier.html | ⏳ À TESTER | - |

### 8. Déconnexion
| Test | Résultat | Notes |
|------|----------|-------|
| 8.1 Déconnexion admin | ✅ OK | Retour login.html |

---

## Comptes à Créer
Pour continuer les tests, créer ces comptes dans Supabase Auth:

| Rôle | Email suggéré | Mot de passe |
|------|---------------|--------------|
| Chef | chef@nysoa.mg | chef123 |
| RH | rh@nysoa.mg | rh123 |
| DAF | daf@nysoa.mg | daf123 |
| Contrôleur | controleur@nysoa.mg | controleur123 |
| Technicien | technicien@nysoa.mg | technicien123 |

---

## Observations
1. **Session admin persiste** — même après déconnexion, le navigateur garde la session
2. **Données résiduelles** — 5 articles de stock (STK-SB-1 à STK-SB-5) persistent malgré le reset
3. **RLS bloque les DELETE massifs** — nécessite service_role ou suppression ligne par ligne

## Recommandations
1. Renouveler le token JWT pour continuer les tests API
2. Créer les comptes de test pour chaque rôle
3. Vérifier pourquoi les stocks persistent après reset
4. Tester manuellement chaque scénario avec les comptes créés