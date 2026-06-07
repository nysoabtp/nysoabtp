// ============================================================
// NYSOA BTP — login-supabase-auth.js
// Gestion sécurisée de login.html avec vérification de token
// À inclure AVANT supabase.js dans login.html
// ============================================================

/**
 * Gère la soumission du formulaire de connexion
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('email')?.value?.trim();
    const password = document.getElementById('password')?.value;
    const btn = document.getElementById('btn-login');
    const loading = document.getElementById('loading');
    const errorEl = document.getElementById('error-msg');
    const successEl = document.getElementById('success-msg');
    
    // ── Validation ──
    if (!email || !password) {
        if (errorEl) {
            errorEl.textContent = 'Veuillez remplir tous les champs';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        if (errorEl) {
            errorEl.textContent = 'Email invalide';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    if (password.length < 6) {
        if (errorEl) {
            errorEl.textContent = 'Mot de passe trop court';
            errorEl.style.display = 'block';
        }
        return;
    }
    
    btn.disabled = true;
    if (loading) loading.style.display = 'block';
    
    try {
        // ── Authentification Supabase ──
        const { data, error } = await db.auth.signInWithPassword({
            email,
            password,
        });
        
        if (error) {
            throw error;
        }
        
        if (!data.session || !data.user) {
            throw new Error('Authentification échouée');
        }
        
        // ── Récupérer et valider le rôle ──
        const role = data.user.user_metadata?.role;
        
        const VALID_ROLES = ['admin', 'daf', 'chef', 'rh', 'controleur', 'technicien'];
        if (!role || !VALID_ROLES.includes(role)) {
            throw new Error(`Rôle invalide: ${role || 'manquant'}`);
        }
        
        // ── Vérifier l'expiration du token ──
        if (data.session.expires_at) {
            const now = Math.floor(Date.now() / 1000);
            if (data.session.expires_at <= now) {
                throw new Error('Token expiré');
            }
        }
        
        // ── Synchroniser localStorage ──
        localStorage.setItem('nysoa_current_user', JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            role: role,
            syncedAt: Date.now(),
        }));
        
        // ── Déterminer la destination ──
        const DASHBOARDS = {
            admin: 'index.html',
            daf: 'daf.html',
            chef: 'chef-chantier.html',
            rh: 'rh.html',
            controleur: 'controleur.html',
            technicien: 'technicien.html',
        };
        
        const destination = DASHBOARDS[role];
        
        if (successEl) {
            successEl.textContent = 'Connexion réussie ! Redirection...';
            successEl.style.display = 'block';
        }
        
        setTimeout(() => {
            window.location.href = destination;
        }, 800);
        
    } catch (err) {
        console.error('[Login] Erreur:', err);
        
        let message = err.message || 'Erreur de connexion';
        
        if (message.includes('Invalid login credentials')) {
            message = 'Email ou mot de passe incorrect';
        } else if (message.includes('Rôle invalide')) {
            message = 'Votre compte n\'a pas de rôle valide. Contactez l\'administrateur.';
        } else if (message.includes('Token expiré')) {
            message = 'Le token est expiré. Veuillez réessayer.';
        }
        
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.style.display = 'block';
        }
    } finally {
        btn.disabled = false;
        if (loading) loading.style.display = 'none';
    }
}

/**
 * Redirection automatique si déjà connecté
 * Vérifie la vraie session Supabase (pas juste localStorage)
 */
async function handleAutoRedirect() {
    try {
        // ── Récupérer la session réelle ──
        const { data: { session }, error } = await db.auth.getSession();
        
        if (error || !session) {
            console.log('[Login] Pas de session active');
            return;
        }
        
        // ── Vérifier l'expiration ──
        if (session.expires_at) {
            const now = Math.floor(Date.now() / 1000);
            if (session.expires_at <= now) {
                console.warn('[Login] Token expiré - signOut');
                await db.auth.signOut();
                return;
            }
        }
        
        // ── Récupérer le rôle ──
        const role = session.user?.user_metadata?.role;
        const VALID_ROLES = ['admin', 'daf', 'chef', 'rh', 'controleur', 'technicien'];
        
        if (!role || !VALID_ROLES.includes(role)) {
            console.warn('[Login] Rôle invalide - signOut');
            await db.auth.signOut();
            return;
        }
        
        // ── Synchroniser localStorage ──
        localStorage.setItem('nysoa_current_user', JSON.stringify({
            id: session.user.id,
            email: session.user.email,
            role: role,
            syncedAt: Date.now(),
        }));
        
        // ── Redirection ──
        const DASHBOARDS = {
            admin: 'index.html',
            daf: 'daf.html',
            chef: 'chef-chantier.html',
            rh: 'rh.html',
            controleur: 'controleur.html',
            technicien: 'technicien.html',
        };
        
        const destination = DASHBOARDS[role];
        console.log('[Login] Redirection automatique vers', destination);
        window.location.href = destination;
        
    } catch (err) {
        console.warn('[Login] Erreur auto-redirection:', err);
    }
}

/**
 * Initialise login.html
 */
function initLoginPage() {
    // Attacher le handler du formulaire
    const form = document.getElementById('form-login');
    if (form) {
        form.removeEventListener('submit', handleLoginSubmit);
        form.addEventListener('submit', handleLoginSubmit);
    }
    
    // Vérifier la redirection auto après un délai
    // (pour laisser Supabase.js se charger)
    setTimeout(handleAutoRedirect, 1000);
    
    console.log('[Login] Initialisé ✓');
}

// Initialiser au chargement du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}
