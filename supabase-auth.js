// ============================================================
// NYSOA BTP — supabase-auth.js
// Gestion d'authentification sécurisée avec Supabase
// À inclure dans supabase.js AVANT les autres fonctions
// ============================================================

// ── CONFIGURATION ─────────────────────────────────────────────
const AUTH_CONFIG = {
    SESSION_TIMEOUT: 30 * 60 * 1000,        // 30 minutes d'inactivité
    INACTIVITY_WARNING: 25 * 60 * 1000,     // Warning après 25 min
    TOKEN_CHECK_INTERVAL: 60 * 1000,        // Vérifier token chaque minute
    VALID_ROLES: ['admin', 'daf', 'chef', 'rh', 'controleur', 'technicien'],
};

// ── MAPPING DES RÔLES PAR PAGE ────────────────────────────────
const PAGE_ROLES = {
    'index.html': ['admin'],
    'admin.html': ['admin'],
    'chef-chantier.html': ['chef'],
    'suivi-chantier.html': ['chef', 'controleur'],
    'daf.html': ['daf'],
    'rh.html': ['rh'],
    'controleur.html': ['controleur'],
    'technicien.html': ['technicien'],
    'pointage.html': ['admin', 'rh', 'chef'],
};

// ── SESSION STATE ─────────────────────────────────────────────
let lastActivityTime = Date.now();
let sessionWarningShown = false;
let tokenCheckInterval = null;

// ══════════════════════════════════════════════════════════════
// GESTION DE SESSION SUPABASE
// ══════════════════════════════════════════════════════════════

/**
 * Récupère la vraie session Supabase (NOT localStorage)
 * @returns {Object|null} Session avec user, access_token, expires_at, etc.
 */
async function getSupabaseSession() {
    try {
        const { data: { session }, error } = await db.auth.getSession();
        if (error) {
            console.warn('[Auth] Erreur récupération session:', error);
            return null;
        }
        return session;
    } catch (err) {
        console.error('[Auth] Exception getSession:', err);
        return null;
    }
}

/**
 * Vérifie si un token est expiré
 * @param {Object} session - Session Supabase
 * @returns {boolean} true si expiré
 */
function isTokenExpired(session) {
    if (!session || !session.expires_at) return true;
    const now = Math.floor(Date.now() / 1000);
    return session.expires_at <= now;
}

/**
 * Synchronise localStorage avec la vraie session Supabase
 * @param {Object} session - Session Supabase
 */
function syncLocalStorage(session) {
    if (session && session.user) {
        const role = session.user?.user_metadata?.role;
        if (role && AUTH_CONFIG.VALID_ROLES.includes(role)) {
            localStorage.setItem('nysoa_current_user', JSON.stringify({
                id: session.user.id,
                email: session.user.email,
                role: role,
                syncedAt: Date.now(),
            }));
            return true;
        }
    }
    // Session invalide → nettoyer localStorage
    localStorage.removeItem('nysoa_current_user');
    return false;
}

/**
 * Vérifie l'authentification ET l'autorisation
 * Fonction centralisée pour tous les dashboards
 * @param {string} expectedRole - Rôle attendu (ex: 'admin')
 * @returns {Promise<boolean>} true si autorisé, false sinon
 */
async function checkAuthOrRedirect(expectedRole = null) {
    // ── 1. Récupérer la vraie session Supabase ──
    const session = await getSupabaseSession();
    
    if (!session) {
        console.warn('[Auth] Aucune session Supabase active');
        window.location.href = 'login.html';
        return false;
    }
    
    // ── 2. Vérifier l'expiration du token ──
    if (isTokenExpired(session)) {
        console.warn('[Auth] Token expiré');
        // Essayer de déconnecter proprement
        try {
            await db.auth.signOut();
        } catch (err) {
            console.warn('[Auth] Erreur signOut:', err);
        }
        // Nettoyer et rediriger
        localStorage.removeItem('nysoa_current_user');
        window.location.href = 'login.html';
        return false;
    }
    
    // ── 3. Récupérer et valider le rôle ──
    const userRole = session.user?.user_metadata?.role;
    
    if (!userRole || !AUTH_CONFIG.VALID_ROLES.includes(userRole)) {
        console.error('[Auth] Rôle invalide ou manquant:', userRole);
        await db.auth.signOut();
        window.location.href = 'login.html';
        return false;
    }
    
    // ── 4. Vérifier l'autorisation pour cette page (si expectedRole fourni) ──
    if (expectedRole && expectedRole !== userRole) {
        console.error(`[Auth] Rôle insuffisant: ${userRole} vs ${expectedRole}`);
        if (typeof showNotification === 'function') {
            showNotification('Vous n\'avez pas accès à cette page', 'error');
        } else {
            alert('Vous n\'avez pas accès à cette page');
        }
        window.location.href = 'login.html';
        return false;
    }
    
    // ── 5. Synchroniser localStorage avec la session réelle ──
    syncLocalStorage(session);
    
    console.log(`[Auth] ✓ Authentification réussie pour ${userRole}`);
    return true;
}

// ══════════════════════════════════════════════════════════════
// GESTION DE DÉCONNEXION
// ══════════════════════════════════════════════════════════════

/**
 * Déconnexion sécurisée complète
 */
async function logout() {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;
    
    try {
        // ── 1. Déconnecter côté Supabase ──
        const { error } = await db.auth.signOut();
        if (error) console.warn('[Auth] Erreur signOut:', error);
    } catch (err) {
        console.error('[Auth] Exception signOut:', err);
    }
    
    // ── 2. Nettoyer les stockages ──
    localStorage.removeItem('nysoa_current_user');
    localStorage.removeItem('nysoa_devis');
    localStorage.removeItem('nysoa_proformats');
    sessionStorage.clear();
    
    // ── 3. Arrêter le monitoring de session ──
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
        tokenCheckInterval = null;
    }
    
    // ── 4. Invalider le cache ──
    if ('caches' in window) {
        try {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        } catch (err) {
            console.warn('[Auth] Erreur vidage cache:', err);
        }
    }
    
    // ── 5. Message et redirection ──
    if (typeof showNotification === 'function') {
        showNotification('Déconnexion réussie', 'success');
    }
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

// ══════════════════════════════════════════════════════════════
// MONITORING DE SESSION
// ══════════════════════════════════════════════════════════════

/**
 * Réinitialise le timer d'activité
 */
function resetActivityTimer() {
    lastActivityTime = Date.now();
    sessionWarningShown = false;
}

/**
 * Affiche un avertissement de session expirée
 */
function showSessionExpiringWarning() {
    if (sessionWarningShown) return;
    sessionWarningShown = true;
    
    const modal = document.createElement('div');
    modal.id = 'session-expiring-modal';
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
            <p style="color: #666; margin-bottom: 20px;">Votre session expirera dans <strong id="warning-countdown">5</strong> minutes d'inactivité.</p>
            <div style="display: flex; gap: 10px;">
                <button onclick="resetActivityTimer(); document.getElementById('session-expiring-modal').remove()" style="flex:1; padding: 10px; background: #0066cc; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
                    Continuer
                </button>
                <button onclick="logout()" style="flex:1; padding: 10px; background: #6b7280; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Déconnecter
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Countdown
    let remaining = 300; // 5 minutes en secondes
    const countdownInterval = setInterval(() => {
        remaining--;
        const el = document.getElementById('warning-countdown');
        if (el) {
            el.textContent = Math.ceil(remaining / 60); // afficher en minutes
        }
        if (remaining <= 0) clearInterval(countdownInterval);
    }, 1000);
}

/**
 * Vérifie et renouvelle le token Supabase si nécessaire
 */
async function checkAndRefreshToken() {
    const session = await getSupabaseSession();
    
    if (!session) {
        console.warn('[Auth] Pas de session - redirection vers login');
        window.location.href = 'login.html';
        return;
    }
    
    // Vérifier l'expiration
    if (isTokenExpired(session)) {
        console.warn('[Auth] Token expiré');
        // Ne pas afficher de warning - juste redirect
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPage !== 'login.html') {
            try {
                await db.auth.signOut();
            } catch (err) {
                console.warn('[Auth] Erreur signOut:', err);
            }
            window.location.href = 'login.html';
        }
        return;
    }
    
    // Vérifier l'inactivité
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    
    // Warning à 5 minutes avant expiration (ou à 25 min d'inactivité)
    if (timeSinceLastActivity > AUTH_CONFIG.INACTIVITY_WARNING) {
        showSessionExpiringWarning();
    }
    
    // Logout après timeout
    if (timeSinceLastActivity > AUTH_CONFIG.SESSION_TIMEOUT) {
        console.log('[Auth] Timeout d\'inactivité - déconnexion automatique');
        try {
            await db.auth.signOut();
        } catch (err) {
            console.warn('[Auth] Erreur signOut lors du timeout:', err);
        }
        localStorage.removeItem('nysoa_current_user');
        window.location.href = 'login.html';
    }
}

/**
 * Initialise les listeners d'activité utilisateur
 */
function initActivityListeners() {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
        document.addEventListener(event, resetActivityTimer, { passive: true });
    });
    
    console.log('[Auth] Activity listeners initialisés');
}

/**
 * Initialise le monitoring périodique du token
 */
function initTokenMonitoring() {
    if (tokenCheckInterval) return; // Déjà initialisé
    
    tokenCheckInterval = setInterval(checkAndRefreshToken, AUTH_CONFIG.TOKEN_CHECK_INTERVAL);
    console.log('[Auth] Token monitoring démarré');
}

// ══════════════════════════════════════════════════════════════
// INITIALISATION AU DÉMARRAGE
// ══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    // Initialiser les listeners d'activité et monitoring
    // (SAUF sur login.html où on initialise différemment)
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage !== 'login.html') {
        initActivityListeners();
        initTokenMonitoring();
    }
});

console.log('[NYSOA BTP] supabase-auth.js chargé ✓');
