# 🔒 SECURITY FIXES — Audit des bugs d'authentification et d'autorisation

## 📋 Résumé des corrections

Ce patch corrige **5 bugs critiques** liés à la gestion d'authentification et de sécurité :

### BUG #2 ✅ Pas de vérification de rôle au chargement
**Fichier:** `auth-security.js` (lignes 100-135)

**Correction:**
- ✅ Validation complète du rôle utilisateur au chargement
- ✅ Vérification que le rôle est dans la liste `VALID_ROLES`
- ✅ Redirection vers login si rôle invalide
- ✅ Stockage sécurisé de l'utilisateur avec timestamp

```javascript
function isValidRole(role) {
    return VALID_ROLES.includes(role);
}

function setCurrentUser(user) {
    if (!isValidRole(user.role)) {
        throw new Error(`Rôle invalide: ${user.role}`);
    }
    // ...
}
```

---

### BUG #4 ✅ Pas de gestion de déconnexion par rôle
**Fichier:** `auth-security.js` (lignes 164-200)

**Correction:**
- ✅ Fonction `secureLogout()` qui appelle `db.auth.signOut()`
- ✅ Nettoyage complet de tous les stockages (localStorage, sessionStorage)
- ✅ Vidage du cache du navigateur
- ✅ Gestion des erreurs gracieuse

```javascript
async function secureLogout() {
    await db.auth.signOut();  // ✅ Déconnecter côté Supabase
    clearAllStorage();         // ✅ Nettoyer localStorage
    // Invalider le cache du navigateur
    const names = await caches.keys();
    await Promise.all(names.map(name => caches.delete(name)));
}
```

**Utilisation dans les pages HTML:**
```html
<!-- Avant (INSÉCURISÉ) -->
<button onclick="logout()">Déconnecter</button>

<!-- Après (SÉCURISÉ) -->
<button onclick="secureLogout()">Déconnecter</button>
```

---

### BUG #5 ✅ Pas de contrôle d'accès par rôle sur les pages
**Fichier:** `auth-security.js` (lignes 137-160)

**Correction:**
- ✅ Fonction `checkPageAccess()` appelée au chargement de chaque page
- ✅ Mapping des rôles autorisés par page (ROLE_ACCESS_MAP)
- ✅ Redirection automatique vers login si accès non autorisé
- ✅ Notification d'erreur utilisateur

**Configuration des accès par page:**
```javascript
const ROLE_ACCESS_MAP = {
    'index.html': ['admin'],
    'admin.html': ['admin'],
    'chef-chantier.html': ['chef'],
    'daf.html': ['daf'],
    'rh.html': ['rh'],
    'controleur.html': ['controleur'],
    'technicien.html': ['technicien'],
    'pointage.html': ['admin', 'rh', 'chef'],  // Multi-rôle
};
```

**Intégration dans toutes les pages HTML:**
```html
<!-- Ajouter après supabase.js -->
<script src="auth-security.js"></script>

<!-- checkPageAccess() est appelé automatiquement au DOMContentLoaded -->
```

---

### BUG #6 ✅ Pas d'expiration de session
**Fichier:** `auth-security.js` (lignes 42-92)

**Correction:**
- ✅ Timeout de session après 30 minutes d'inactivité
- ✅ Warning utilisateur après 25 minutes
- ✅ Listeners d'activité (`mousedown`, `keydown`, `click`, etc.)
- ✅ Déconnexion forcée à l'expiration

**Configuration:**
```javascript
const AUTH_CONFIG = {
    SESSION_TIMEOUT: 30 * 60 * 1000,        // 30 minutes
    INACTIVITY_WARNING: 25 * 60 * 1000,     // Warning après 25 min
    TOKEN_VALIDATION_INTERVAL: 60000,       // Vérifier chaque minute
};
```

**Comportement:**
1. Utilisateur inactif pendant 25 min → Modal d'avertissement
2. Utilisateur peut cliquer "Continuer" → Réinitialise le timer
3. Après 30 min total → Force logout automatiquement
4. Toute activité (clic, frappe) → Réinitialise le timer

---

### BUG #7 ✅ Pas de protection CSRF ou XSS
**Fichier:** `auth-security.js` (lignes 202-265)

**Correction XSS:**
- ✅ Fonction `escapeHTML()` pour échapper les caractères dangereux
- ✅ Fonction `sanitizeInput()` pour nettoyer les entrées utilisateur
- ✅ Validation d'email avec regex

```javascript
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;  // textContent échappe automatiquement
    return div.innerHTML;
}

// Utilisation
const nomSecurise = escapeHTML(inputValue);
await db.from('personnel').insert({ nom: nomSecurise });
```

**Correction CSRF:**
- ✅ Génération de token CSRF unique par session
- ✅ Ajout automatique du token à tous les formulaires
- ✅ Validation du token pour les requêtes sensibles

```javascript
// Token généré automatiquement et stocké en sessionStorage
const csrfToken = getCSRFToken();

// Validation côté serveur (si applicable)
if (!validateCSRFToken(formData.csrf_token)) {
    throw new Error('Token CSRF invalide');
}
```

**Intégration dans les formulaires HTML:**
```html
<form id="form-employe">
    <!-- Le token CSRF est ajouté automatiquement par auth-security.js -->
    <input type="hidden" name="csrf_token" id="csrf_token">
    
    <label>Nom</label>
    <input type="text" name="nom" required>
    
    <button type="submit">Ajouter</button>
</form>

<script>
// Sanitization lors de la soumission
const form = document.getElementById('form-employe');
form.addEventListener('submit', async (e) => {
    const fd = new FormData(form);
    const nom = sanitizeInput(fd.get('nom'));
    
    await db.from('personnel').insert({ nom });
});
</script>
```

---

## 🚀 Comment intégrer les corrections

### Étape 1: Ajouter les fichiers de sécurité
```bash
git add auth-security.js
git add auth-security-login.js
git add auth-security-fallback.js
```

### Étape 2: Mettre à jour `login.html`
Remplacer l'ancien `login.html` par `login-secure.html`:
```html
<!-- Ajouter ces scripts à la fin de login.html (après Supabase) -->
<script src="auth-security.js"></script>
<script src="auth-security-login.js"></script>
<script src="auth-security-fallback.js"></script>
```

### Étape 3: Mettre à jour tous les dashboards
Ajouter à chaque page (index.html, admin.html, chef-chantier.html, etc.) :
```html
<!-- Après supabase.js, avant script.js -->
<script src="auth-security.js"></script>
```

### Étape 4: Mettre à jour script.js
Remplacer la fonction `logout()` :
```javascript
// AVANT (insécurisé)
function logout() {
    if (confirm('Voulez-vous vous déconnecter ?')) {
        localStorage.removeItem('nysoa_current_user');
        window.location.href = 'login.html';
    }
}

// APRÈS (sécurisé) - utiliser secureLogout() de auth-security.js
<!-- Pas besoin de définir logout() - il est fourni par auth-security.js -->
```

Mettre à jour les boutons HTML :
```html
<!-- AVANT -->
<button onclick="logout()">Déconnecter</button>

<!-- APRÈS -->
<button onclick="secureLogout()">Déconnecter</button>
```

### Étape 5: Mettre à jour les formulaires
Sanitizer toutes les entrées utilisateur :
```javascript
// Avant
const { error } = await db.from('personnel').insert({
    nom: fd.get('nom'),  // ❌ Pas d'échappement
});

// Après
const { error } = await db.from('personnel').insert({
    nom: sanitizeInput(fd.get('nom')),  // ✅ Échappé
});
```

---

## 📊 Checklist de vérification

- [ ] `auth-security.js` inclus dans toutes les pages
- [ ] `auth-security-login.js` inclus dans `login.html`
- [ ] Tous les boutons logout utilisent `secureLogout()`
- [ ] Toutes les entrées utilisateur utilisent `sanitizeInput()`
- [ ] ROLE_ACCESS_MAP est correct pour chaque page
- [ ] Timeout de session fonctionne (test: 1 min d'inactivité)
- [ ] Warning de session s'affiche avant expiration
- [ ] Token CSRF présent dans tous les formulaires
- [ ] Tests de sécurité en navigateur (DevTools) passent

---

## 🧪 Tests de sécurité

### Test 1: Vérification de rôle au chargement
```javascript
// DevTools Console
localStorage.setItem('nysoa_current_user', JSON.stringify({
    email: 'attacker@mail.com',
    role: 'admin'  // Rôle faux
}));
window.location.reload();
// ✅ Devrait rediriger vers login.html
```

### Test 2: Protection XSS
```javascript
// Tenter d'injecter du HTML
const malicious = '<img src=x onerror="alert(123)">';
const safe = escapeHTML(malicious);
console.log(safe);
// ✅ Devrait retourner du HTML échappé (pas d'exécution de code)
```

### Test 3: Timeout de session
1. Connectez-vous
2. Restez inactif pendant 25 minutes
3. Un modal d'avertissement doit s'afficher
4. Attendez 5 minutes de plus sans interagir
5. ✅ Devrait être déconnecté automatiquement

### Test 4: Logout sécurisé
1. Connectez-vous
2. Vérifiez dans DevTools → Application → LocalStorage : `nysoa_current_user` présent
3. Cliquez sur Déconnecter
4. ✅ LocalStorage doit être vidé
5. ✅ Cache du navigateur doit être vidé
6. ✅ Redirection vers `login.html`

---

## ⚠️ Problèmes connus et TODO

### 1. Secrets Supabase toujours en clair (BUG #1)
**Status:** ❌ Non corrigé dans ce patch  
**Raison:** Nécessite configuration serveur (variables d'environnement)  
**Solution:** Mettre en place un proxy serveur ou des variables d'env

### 2. Fallback sans bcrypt (BUG #3)
**Status:** ⚠️ Partiellement corrigé  
**Correction:** La fonction `fallbackLogin()` est maintenant plus sécurisée
**TODO:** Installer `bcryptjs` et implémenter le vrai hashing

```bash
npm install bcryptjs
```

```javascript
// À mettre en place
import bcrypt from 'bcryptjs';

// Hash un mot de passe
const hashedPassword = await bcrypt.hash(password, 10);

// Comparer
const isMatch = await bcrypt.compare(password, hashedPassword);
```

---

## 📚 Documentation supplémentaire

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth)
- [XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

---

**Version:** 1.0  
**Date:** 2026-06-07  
**Auteur:** GitHub Copilot Security Audit  
**Status:** ✅ Prêt pour review
