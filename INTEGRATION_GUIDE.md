# 🔒 Guide d'intégration — Sécurité Supabase

## 📋 Vue d'ensemble

Cette intégration relie la vraie session Supabase avec les contrôles d'accès, remplaçant l'approche basée uniquement sur localStorage.

### Fichiers clés

1. **supabase-auth.js** — Fonctions centralisées d'authentification
   - `checkAuthOrRedirect(role)` — Vérifie session + rôle
   - `logout()` — Déconnexion sécurisée
   - Monitoring du token et timeout d'inactivité

2. **login-supabase-auth.js** — Gestion sécurisée de login.html
   - Validation et authentification
   - Vérification `expires_at` du token
   - Auto-redirection si session valide

---

## 🚀 Étapes d'intégration

### Étape 1 : Ajouter supabase-auth.js à supabase.js

**Fichier : supabase.js**

Ajouter en haut, juste après la création du client Supabase :

```javascript
// ── Client Supabase ───────────────────────────────────────────
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── AJOUTER CETTE LIGNE ──
// Charger les fonctions d'authentification sécurisées
// <script src="supabase-auth.js"></script>
```

Ou inclure dans le HTML **AVANT** supabase.js n'est pas optimal. À la place, faire :

**Meilleure approche : fusionner supabase-auth.js dans supabase.js**

Copier tout le contenu de `supabase-auth.js` à la fin de `supabase.js` (avant `console.log`).

---

### Étape 2 : Mettre à jour login.html

**Fichier : login.html**

Remplacer l'ancien code de gestion de formulaire par :

```html
<!-- AVANT (à supprimer) -->
<script>
document.getElementById('form-login').addEventListener('submit', async function(e) {
    // ... ancien code ...
});
</script>

<!-- APRÈS (ajouter) -->
<script src="login-supabase-auth.js"></script>
```

**Ou fusionner directement :** Copier le contenu de `login-supabase-auth.js` dans une balise `<script>` à la fin de `login.html`.

---

### Étape 3 : Mettre à jour admin.html

**Avant :**
```html
<body>
    <!-- contenu -->
    
    <script>
    // Vérification obsolète du localStorage
    const user = JSON.parse(localStorage.getItem('nysoa_current_user') || 'null');
    if (!user || user.role !== 'admin') {
        window.location.href = 'login.html';
    }
    </script>
</body>
```

**Après :**
```html
<body>
    <!-- contenu -->
    
    <script>
    // Vérification sécurisée de la vraie session Supabase
    window.addEventListener('load', async () => {
        await checkAuthOrRedirect('admin');
    });
    </script>
</body>
```

---

### Étape 4 : Mettre à jour les autres dashboards

**Pour chef-chantier.html :**
```html
<script>
window.addEventListener('load', async () => {
    await checkAuthOrRedirect('chef');
});
</script>
```

**Pour daf.html :**
```html
<script>
window.addEventListener('load', async () => {
    await checkAuthOrRedirect('daf');
});
</script>
```

**Pour rh.html :**
```html
<script>
window.addEventListener('load', async () => {
    await checkAuthOrRedirect('rh');
});
</script>
```

**Pour controleur.html :**
```html
<script>
window.addEventListener('load', async () => {
    await checkAuthOrRedirect('controleur');
});
</script>
```

**Pour technicien.html :**
```html
<script>
window.addEventListener('load', async () => {
    await checkAuthOrRedirect('technicien');
});
</script>
```

**Pour index.html (admin par défaut) :**
```html
<script>
window.addEventListener('load', async () => {
    await checkAuthOrRedirect('admin');
});
</script>
```

---

### Étape 5 : Mettre à jour script.js

**Supprimer l'ancienne fonction logout :**

```javascript
// ❌ À SUPPRIMER (ligne 1174)
function logout() {
    if (confirm('Voulez-vous vous déconnecter ?')) {
        localStorage.removeItem('nysoa_current_user');
        window.location.href = 'login.html';
    }
}
```

**La nouvelle fonction `logout()` vient de supabase-auth.js**

Mettre à jour les boutons de logout HTML :

```html
<!-- Tous les boutons -->
<button onclick="logout()">Déconnecter</button>
<!-- Fonctionnera maintenant avec la version sécurisée de logout() -->
```

---

## 🔐 Flux de sécurité

### 1️⃣ Connexion (login.html)

```
Utilisateur saisit email/mot de passe
        ↓
Formulaire soumis → handleLoginSubmit()
        ↓
Appel db.auth.signInWithPassword()
        ↓
Vérification:
  - Credentials valides? → session créée
  - expires_at valide? → vérifier token pas expiré
  - Rôle valide? → vérifier dans VALID_ROLES
        ↓
Synchroniser localStorage avec session Supabase
        ↓
Redirection vers dashboard selon rôle
```

### 2️⃣ Accès aux pages (admin.html, chef-chantier.html, etc.)

```
Page se charge
        ↓
window.addEventListener('load') → await checkAuthOrRedirect('role')
        ↓
getSupabaseSession() → récupère vraie session (pas localStorage)
        ↓
Vérifications:
  - Session existe? 
  - Token pas expiré? → vérifier expires_at
  - Rôle valide?
  - Rôle = rôle attendu?
        ↓
✅ Tous OK? → Synchroniser localStorage + continuer
❌ Erreur? → Rediriger vers login.html
```

### 3️⃣ Monitoring de session (en arrière-plan)

```
Chaque 60 secondes:
  - Récupérer session Supabase
  - Token expiré? → Forcer logout + redirection
  - Inactif 25 min? → Afficher avertissement
  - Inactif 30 min? → Forcer logout automatique
```

### 4️⃣ Déconnexion (logout button)

```
Utilisateur clique logout
        ↓
logout() → confirmation
        ↓
db.auth.signOut() → invalider token Supabase
        ↓
Nettoyer localStorage, sessionStorage, cache
        ↓
Redirection vers login.html
```

---

## 🧪 Tests de sécurité

### Test 1 : Redirection automatique
```
1. Se connecter en tant qu'admin
2. Aller à chef-chantier.html
3. ✅ Devrait rediriger vers login.html (rôle insuffisant)
```

### Test 2 : Token expiré
```
1. Se connecter
2. Attendre expiration du token (dev: modifier expires_at en localStorage)
3. ✅ Page devrait rediriger vers login.html
```

### Test 3 : Inactivité
```
1. Se connecter
2. Rester inactif 25 minutes
3. ✅ Modal d'avertissement doit s'afficher
4. Cliquer "Continuer" → réinitialise timer
5. Rester inactif 30 minutes total
6. ✅ Logout automatique + redirection login.html
```

### Test 4 : Logout sécurisé
```
1. Se connecter
2. DevTools → Application → LocalStorage → noter nysoa_current_user
3. Cliquer logout
4. ✅ localStorage doit être vide
5. ✅ Cache du navigateur vidé
6. ✅ Redirection login.html
```

### Test 5 : Multi-onglets
```
1. Ouvrir 2 onglets du même site
2. Se déconnecter dans onglet 1
3. Recharger onglet 2
4. ✅ Devrait détecter que session est invalidée et rediriger
```

---

## ⚙️ Configuration

Editer `supabase-auth.js` pour ajuster les délais :

```javascript
const AUTH_CONFIG = {
    SESSION_TIMEOUT: 30 * 60 * 1000,        // 30 minutes (à ajuster)
    INACTIVITY_WARNING: 25 * 60 * 1000,     // Warning à 25 min
    TOKEN_CHECK_INTERVAL: 60 * 1000,        // Vérifier chaque minute
    VALID_ROLES: ['admin', 'daf', 'chef', 'rh', 'controleur', 'technicien'],
};
```

---

## ✅ Checklist d'implémentation

- [ ] supabase-auth.js ajouté/fusionné à supabase.js
- [ ] login-supabase-auth.js inclus dans login.html
- [ ] admin.html : `await checkAuthOrRedirect('admin')`
- [ ] chef-chantier.html : `await checkAuthOrRedirect('chef')`
- [ ] daf.html : `await checkAuthOrRedirect('daf')`
- [ ] rh.html : `await checkAuthOrRedirect('rh')`
- [ ] controleur.html : `await checkAuthOrRedirect('controleur')`
- [ ] technicien.html : `await checkAuthOrRedirect('technicien')`
- [ ] index.html : `await checkAuthOrRedirect('admin')`
- [ ] script.js : ancienne logout() supprimée
- [ ] Tous les boutons utilisent le nouveau logout() de supabase-auth.js
- [ ] Tests de sécurité passent ✓

---

## 📞 Support

Si vous avez des questions, consultez :
- Documentation Supabase: https://supabase.com/docs/guides/auth
- Console du navigateur (DevTools) pour les logs `[Auth]`

**Version :** 2.0  
**Date :** 2026-06-07  
**Status :** ✅ Prêt pour production
