// ============================================================
// NYSOA BTP — auth-security-login.js
// Améliorations de sécurité pour login.html UNIQUEMENT
// À inclure dans login.html après supabase.js et auth-security.js
// ============================================================

/**
 * Gère la soumission du formulaire de connexion
 */
async function handleLoginSubmit(e) {
    e.preventDefault();
    hideMessages();
    
    const email = document.getElementById('email')?.value.trim();
    const password = document.getElementById('password')?.value;
    const btn = document.getElementById('btn-login');
    const loading = document.getElementById('loading');
    
    // ── Validation ──
    if (!email || !isValidEmail(email)) {
        showError('Email invalide');
        return;
    }
    
    if (!password || password.length < 6) {
        showError('Mot de passe invalide');
        return;
    }
    
    btn.disabled = true;
    loading.style.display = 'block';
    
    try {
        // ── Authentification Supabase ──
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        
        if (error) {
            throw error;
        }
        
        if (!data.user) {
            throw new Error('Authentification échouée');
        }
        
        // ── Récupérer et valider le rôle ──
        const role = data.user?.user_metadata?.role;
        
        // Validation du rôle
        if (!role || !['admin', 'daf', 'chef', 'rh', 'controleur', 'technicien'].includes(role)) {
            throw new Error(`Rôle invalide ou manquant: ${role}`);
        }
        
        // ── Vérifier que le token est valide ──
        if (!data.session || !data.session.access_token) {
            throw new Error('Token de session invalide');
        }
        
        // ── Stocker l'utilisateur de manière sécurisée ──
        setCurrentUser({
            email: data.user.email,
            role: role,
            id: data.user.id,
        });
        
        // ── Déterminer la destination selon le rôle ──
        const DASHBOARDS = {
            admin: 'index.html',
            daf: 'daf.html',
            chef: 'chef-chantier.html',
            rh: 'rh.html',
            controleur: 'controleur.html',
            technicien: 'technicien.html',
        };
        
        const destination = DASHBOARDS[role];
        
        if (!destination) {
            throw new Error('Destination de rôle inconnue');
        }
        
        showSuccess('Connexion réussie ! Redirection...');
        
        setTimeout(() => {
            window.location.href = destination;
        }, 800);
        
    } catch (err) {
        console.error('[Login] Erreur:', err);
        
        // ── Gestion des erreurs ──
        if (err.message?.includes('Invalid login credentials')) {
            showError('Email ou mot de passe incorrect');
        } else if (err.message?.includes('Rôle invalide')) {
            showError('Votre compte n\'a pas de rôle valide. Contactez l\'administrateur.');
        } else if (err.message?.includes('fetch')) {
            showError('Erreur de connexion. Vérifiez votre connexion internet.');
        } else {
            showError(err.message || 'Erreur de connexion');
        }
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
}

/**
 * Gère la redirection automatique si déjà connecté
 */
async function handleAutoRedirect() {
    try {
        // ── Vérifier une session active ──
        const { data } = await db.auth.getSession();
        
        if (data?.session) {
            const user = getCurrentUser();
            
            if (user && isValidRole(user.role)) {
                const DASHBOARDS = {
                    admin: 'index.html',
                    daf: 'daf.html',
                    chef: 'chef-chantier.html',
                    rh: 'rh.html',
                    controleur: 'controleur.html',
                    technicien: 'technicien.html',
                };
                
                // Redirection silencieuse
                window.location.href = DASHBOARDS[user.role] || 'index.html';
            }
        }
    } catch (err) {
        console.warn('[Login] Pas de session active:', err);
    }
}

/**
 * Initialise login.html après le DOM
 */
function initLoginPage() {
    // ── Attacher le handler du formulaire ──
    const form = document.getElementById('form-login');
    if (form) {
        form.removeEventListener('submit', handleLoginSubmit);
        form.addEventListener('submit', handleLoginSubmit);
    }
    
    // ── Vérifier la redirection auto ──
    setTimeout(handleAutoRedirect, 500);
    
    console.log('[Login] Initialisé ✓');
}

// Initialiser au chargement du DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoginPage);
} else {
    initLoginPage();
}
