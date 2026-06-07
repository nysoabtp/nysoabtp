// ============================================================
// NYSOA BTP — auth-security.js
// Gestion sécurisée de l'authentification et des rôles
// À inclure dans toutes les pages HTML après supabase.js
// ============================================================

// ── CONFIGURATION ─────────────────────────────────────────────
const AUTH_CONFIG = {
    SESSION_TIMEOUT: 30 * 60 * 1000,  // 30 minutes
    INACTIVITY_WARNING: 25 * 60 * 1000, // Warning après 25 min
    TOKEN_VALIDATION_INTERVAL: 60000,   // Vérifier chaque minute
};

// ── MAPPING DES RÔLES AUTORISÉS PAR PAGE ──────────────────────
const ROLE_ACCESS_MAP = {
    'index.html': ['admin'],
    'admin.html': ['admin'],
    'chef-chantier.html': ['chef'],
    'daf.html': ['daf'],
    'rh.html': ['rh'],
    'controleur.html': ['controleur'],
    'technicien.html': ['technicien'],
    'pointage.html': ['admin', 'rh', 'chef'],
    'suivi-chantier.html': ['chef', 'controleur'],
};

const VALID_ROLES = ['admin', 'daf', 'chef', 'rh', 'controleur', 'technicien'];

// ── SESSION MANAGEMENT ─────────────────────────────────────────
let lastActivityTime = Date.now();
let sessionWarningShown = false;

/**
 * Réinitialise le timer d'activité utilisateur
 */
function resetSessionTimer() {
    lastActivityTime = Date.now();
    sessionWarningShown = false;
}

/**
 * Vérifie l'expiration de la session
 */
function checkSessionTimeout() {
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    const timeRemaining = AUTH_CONFIG.SESSION_TIMEOUT - timeSinceLastActivity;
    
    // ── Warning à 5 minutes avant expiration ──
    if (timeRemaining < 5 * 60 * 1000 && timeRemaining > 0 && !sessionWarningShown) {
        sessionWarningShown = true;
        showSessionWarning(Math.floor(timeRemaining / 1000));
    }
    
    // ── Timeout reached ──
    if (timeSinceLastActivity > AUTH_CONFIG.SESSION_TIMEOUT) {
        forceLogout('Votre session a expiré par inactivité');
    }
}

/**
 * Affiche un avertissement d'expiration imminente
 */
function showSessionWarning(secondsRemaining) {
    const modal = document.createElement('div');
    modal.id = 'session-warning-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; max-width: 400px; text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.3)">
            <h2 style="color: #dc2626; margin-bottom: 16px;">⏰ Session expire bientôt</h2>
            <p style="color: #666; margin-bottom: 20px;">Votre session expirera dans <strong id="warning-countdown">${secondsRemaining}</strong> secondes d'inactivité.</p>
            <div style="display: flex; gap: 10px;">
                <button onclick="resetSessionTimer(); document.getElementById('session-warning-modal').remove()" style="flex:1; padding: 10px; background: #0066cc; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    Continuer
                </button>
                <button onclick="forceLogout('Déconnexion manuelle')" style="flex:1; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Déconnecter
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Countdown
    let remaining = secondsRemaining;
    const countdownInterval = setInterval(() => {
        remaining--;
        const el = document.getElementById('warning-countdown');
        if (el) el.textContent = remaining;
        if (remaining <= 0) clearInterval(countdownInterval);
    }, 1000);
}

/**
 * Déconnexion forcée avec message
 */
async function forceLogout(reason = 'Déconnexion') {
    console.warn('[Auth] Force logout:', reason);
    
    try {
        // Déconnecter côté Supabase
        if (typeof db !== 'undefined') {
            await db.auth.signOut();
        }
    } catch (err) {
        console.error('[Auth] Erreur déconnexion Supabase:', err);
    }
    
    // Nettoyer tous les stockages
    clearAllStorage();
    
    // Afficher message et rediriger
    alert(reason);
    window.location.href = 'login.html';
}

/**
 * Nettoie tous les types de stockage
 */
function clearAllStorage() {
    // LocalStorage
    localStorage.removeItem('nysoa_current_user');
    localStorage.removeItem('nysoa_devis');
    localStorage.removeItem('nysoa_proformats');
    localStorage.removeItem('nysoa_session_token');
    localStorage.removeItem('nysoa_session_expiry');
    
    // SessionStorage
    sessionStorage.clear();
    
    // Cookies (s'il y en a)
    document.cookie.split(';').forEach(c => {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
        if (name.startsWith('nysoa_')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
        }
    });
}

// ── ROLE VERIFICATION ─────────────────────────────────────────

/**
 * Vérifie et valide un rôle utilisateur
 */
function isValidRole(role) {
    return VALID_ROLES.includes(role);
}

/**
 * Récupère l'utilisateur actuel du localStorage
 */
function getCurrentUser() {
    try {
        const stored = localStorage.getItem('nysoa_current_user');
        if (!stored) return null;
        
        const user = JSON.parse(stored);
        
        // Validation basique
        if (!user.email || !user.role) return null;
        if (!isValidRole(user.role)) return null;
        
        return user;
    } catch (err) {
        console.error('[Auth] Erreur parsing user:', err);
        return null;
    }
}

/**
 * Stocke l'utilisateur de manière sécurisée
 */
function setCurrentUser(user) {
    // Validation
    if (!user || !user.email || !user.role) {
        throw new Error('User object invalide');
    }
    
    if (!isValidRole(user.role)) {
        throw new Error(`Rôle invalide: ${user.role}`);
    }
    
    // Ajouter timestamp pour validation de session
    const userWithTimestamp = {
        ...user,
        loginTime: Date.now(),
    };
    
    localStorage.setItem('nysoa_current_user', JSON.stringify(userWithTimestamp));
}

/**
 * Vérifie que l'utilisateur a accès à la page actuelle
 */
function checkPageAccess() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const user = getCurrentUser();
    
    // ── Pas d'utilisateur connecté ──
    if (!user) {
        // Exceptions : pages de login
        if (currentPage === 'login.html' || currentPage === '') return true;
        window.location.href = 'login.html';
        return false;
    }
    
    // ── Vérifier les permissions d'accès ──
    const allowedRoles = ROLE_ACCESS_MAP[currentPage];
    
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.warn(`[Auth] Accès refusé pour ${user.email} (${user.role}) à ${currentPage}`);
        if (typeof showNotification === 'function') {
            showNotification('Vous n\'avez pas accès à cette page', 'error');
        } else {
            alert('Vous n\'avez pas accès à cette page');
        }
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

/**
 * Initialise les listeners d'activité
 */
function initActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
        document.addEventListener(event, resetSessionTimer, { passive: true });
    });
}

/**
 * Initialise la vérification périodique de session
 */
function initSessionMonitoring() {
    // Vérifier toutes les minutes
    setInterval(checkSessionTimeout, AUTH_CONFIG.TOKEN_VALIDATION_INTERVAL);
}

// ── XSS PROTECTION ────────────────────────────────────────────

/**
 * Échappe les caractères HTML dangereux
 */
function escapeHTML(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Nettoie une chaîne d'entrée utilisateur
 */
function sanitizeInput(input) {
    if (!input) return '';
    return escapeHTML(input).trim();
}

/**
 * Valide une adresse email
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ── CSRF PROTECTION ──────────────────────────────────────────

/**
 * Génère un token CSRF unique
 */
function generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Initialise le protection CSRF
 */
function initCSRFProtection() {
    let csrfToken = sessionStorage.getItem('nysoa_csrf_token');
    
    if (!csrfToken) {
        csrfToken = generateCSRFToken();
        sessionStorage.setItem('nysoa_csrf_token', csrfToken);
    }
    
    // Ajouter le token à tous les formulaires
    document.querySelectorAll('form').forEach(form => {
        if (!form.querySelector('input[name="csrf_token"]')) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'csrf_token';
            input.value = csrfToken;
            form.insertBefore(input, form.firstChild);
        }
    });
}

/**
 * Valide un token CSRF
 */
function validateCSRFToken(token) {
    return token === sessionStorage.getItem('nysoa_csrf_token');
}

/**
 * Obtient le token CSRF pour les requêtes AJAX
 */
function getCSRFToken() {
    return sessionStorage.getItem('nysoa_csrf_token') || '';
}

// ── LOGOUT SÉCURISÉ ──────────────────────────────────────────

/**
 * Déconnexion sécurisée complète
 */
async function secureLogout() {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;
    
    try {
        // 1. Déconnecter côté Supabase
        if (typeof db !== 'undefined') {
            const { error } = await db.auth.signOut();
            if (error) console.warn('[Auth] Erreur signOut:', error);
        }
    } catch (err) {
        console.error('[Auth] Exception lors du signOut:', err);
    }
    
    // 2. Nettoyer les données sensibles
    clearAllStorage();
    
    // 3. Invalider le cache du navigateur
    if ('caches' in window) {
        try {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        } catch (err) {
            console.warn('[Auth] Erreur vidage cache:', err);
        }
    }
    
    // 4. Afficher notification et rediriger
    if (typeof showNotification === 'function') {
        showNotification('Déconnexion réussie', 'success');
    }
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// ── INITIALISATION AUTOMATIQUE ───────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // 1. Vérifier l'accès à la page
    checkPageAccess();
    
    // 2. Initialiser les listeners d'activité
    initActivityListeners();
    
    // 3. Initialiser le monitoring de session
    initSessionMonitoring();
    
    // 4. Initialiser la protection CSRF
    initCSRFProtection();
    
    // 5. Mettre à jour le logout button
    const logoutBtn = document.querySelector('[onclick*="logout"], .logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = secureLogout;
    }
    
    console.log('[Auth Security] Initialisé ✓');
});

// ── EXPORTS POUR UTILISATION DIRECTE ───────────────────────
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getCurrentUser,
        setCurrentUser,
        isValidRole,
        checkPageAccess,
        escapeHTML,
        sanitizeInput,
        isValidEmail,
        getCSRFToken,
        validateCSRFToken,
        secureLogout,
        forceLogout,
    };
}
