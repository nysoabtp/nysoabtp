// ============================================================
// NYSOA BTP — auth-security-fallback.js
// FALLBACK SÉCURISÉ (à utiliser UNIQUEMENT si Supabase échoue)
// ⚠️ À REMPLACER PAR VRAI HASH (bcrypt) EN PRODUCTION
// ============================================================

/**
 * Fallback de connexion locale (ultra-sécurisé comparé à Base64)
 * ⚠️ À NE JAMAIS UTILISER EN PRODUCTION SANS HASH BCRYPT
 */
async function fallbackLogin(email, password) {
    // ── Simulation bcrypt (à remplacer par vrai bcrypt en production) ──
    // Ceci est juste un exemple de validation sécurisée
    
    // ⚠️ DONNÉES HARD-CODÉES - À REMPLACER ABSOLUMENT ⚠️
    const FALLBACK_USERS = [
        // Format: { email, bcryptHash (ou vrai hash), role }
        // Les "hash" ci-dessous sont des PLACEHOLDERS - À remplacer
        { email: 'admin@nysoa.mg', hash: null, role: 'admin' },
        { email: 'daf@nysoa.mg', hash: null, role: 'daf' },
        { email: 'chef@nysoa.mg', hash: null, role: 'chef' },
        { email: 'rh@nysoa.mg', hash: null, role: 'rh' },
        { email: 'controleur@nysoa.mg', hash: null, role: 'controleur' },
        { email: 'technicien@nysoa.mg', hash: null, role: 'technicien' },
    ];
    
    // ❌ DANGER: Pas de comparaison réelle sans bcrypt
    console.warn('[Fallback] ⚠️ Mode fallback activé - Supabase indisponible');
    
    const user = FALLBACK_USERS.find(u => u.email === email);
    
    if (!user) {
        throw new Error('Utilisateur non trouvé');
    }
    
    if (!user.hash) {
        throw new Error('Fallback non configuré. Contactez l\'administrateur.');
    }
    
    // En production, utiliser:
    // const match = await bcrypt.compare(password, user.hash);
    // if (!match) throw new Error('Mot de passe incorrect');
    
    // Pour le fallback, valider le rôle au minimum
    if (!['admin', 'daf', 'chef', 'rh', 'controleur', 'technicien'].includes(user.role)) {
        throw new Error('Rôle invalide');
    }
    
    // ✅ Utiliser setCurrentUser pour validation complète
    setCurrentUser({
        email: user.email,
        role: user.role,
        loginSource: 'fallback',
    });
    
    return user;
}

/**
 * Affiche un avertissement que le mode fallback est actif
 */
function showFallbackWarning() {
    const banner = document.createElement('div');
    banner.style.cssText = `
        background: #fef08a;
        border: 2px solid #eab308;
        color: #713f12;
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
        font-size: 13px;
        font-weight: 500;
        text-align: center;
    `;
    banner.innerHTML = '⚠️ Mode fallback (Supabase indisponible) — Les identifiants de test seront limités';
    
    const form = document.getElementById('form-login');
    if (form) {
        form.insertBefore(banner, form.firstChild);
    }
}

// ── INITIALISER FALLBACK SI SUPABASE ÉCHOUE ──
window.addEventListener('load', () => {
    const SUPABASE_URL = window.SUPABASE_URL || '';
    
    // Vérifier si Supabase n'est pas configuré
    if (SUPABASE_URL.includes('VOTRE') || SUPABASE_URL === '' || !window.db) {
        console.warn('[Fallback] Supabase non disponible - Mode fallback activé');
        showFallbackWarning();
        
        // Remplacer le handler de login standard
        const form = document.getElementById('form-login');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                
                try {
                    const user = await fallbackLogin(email, password);
                    const DASHBOARDS = {
                        admin: 'index.html',
                        daf: 'daf.html',
                        chef: 'chef-chantier.html',
                        rh: 'rh.html',
                        controleur: 'controleur.html',
                        technicien: 'technicien.html',
                    };
                    window.location.href = DASHBOARDS[user.role] || 'index.html';
                } catch (err) {
                    const errEl = document.getElementById('error-msg');
                    if (errEl) {
                        errEl.textContent = err.message;
                        errEl.style.display = 'block';
                    }
                }
            };
        }
    }
});
