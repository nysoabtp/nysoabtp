// ============================================================
// NYSOA BTP — supabase.js  (version sécurisée)
// Rôle : initialiser le client Supabase et démarrer l'appli
// Les fonctions load* sont dans script.js (une seule définition)
// ============================================================

// ── CONFIGURATION ─────────────────────────────────────────────
const SUPABASE_URL = 'https://djncsybvloyyesllfxhq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDI1OTksImV4cCI6MjA5MzMxODU5OX0.o4MOSg6a[...]

// ── Client Supabase ───────────────────────────────────────────
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── UTILITAIRES (définition unique ici, utilisés partout) ─────
function formatAriary(num) {
    if (!num && num !== 0) return '—';
    return new Intl.NumberFormat('fr-FR').format(num) + ' Ar';
}
function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR');
}
function today() {
    return new Date().toISOString().split('T')[0];
}
function handleError(err, context) {
    console.error(`[Supabase] ${context}:`, err);
    if (typeof showNotification === 'function')
        showNotification(`Erreur ${context}: ${err.message || ''}`, 'error');
}

// ══════════════════════════════════════════════════════════════
// GESTION D'AUTHENTIFICATION SÉCURISÉE
// ══════════════════════════════════════════════════════════════

// ── CONFIGURATION AUTH ──────────────────────────────────────
const AUTH_CONFIG = {
    SESSION_TIMEOUT: 30 * 60 * 1000,        // 30 minutes d'inactivité
    INACTIVITY_WARNING: 25 * 60 * 1000,     // Warning après 25 min
    TOKEN_CHECK_INTERVAL: 60 * 1000,        // Vérifier token chaque minute
    VALID_ROLES: ['admin', 'daf', 'chef', 'rh', 'controleur', 'technicien'],
};

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

/**
 * Récupère la vraie session Supabase (NOT localStorage)
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
 */
function isTokenExpired(session) {
    if (!session || !session.expires_at) return true;
    const now = Math.floor(Date.now() / 1000);
    return session.expires_at <= now;
}

/**
 * Synchronise localStorage avec la vraie session Supabase
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
    localStorage.removeItem('nysoa_current_user');
    return false;
}

/**
 * Vérifie l'authentification ET l'autorisation
 * @param {string} expectedRole - Rôle attendu (ex: 'admin')
 * @returns {Promise<boolean>} true si autorisé, false sinon
 */
async function checkAuthOrRedirect(expectedRole = null) {
    // 1. Récupérer la vraie session Supabase
    const session = await getSupabaseSession();
    
    if (!session) {
        console.warn('[Auth] Aucune session Supabase active');
        window.location.href = 'login.html';
        return false;
    }
    
    // 2. Vérifier l'expiration du token
    if (isTokenExpired(session)) {
        console.warn('[Auth] Token expiré');
        try {
            await db.auth.signOut();
        } catch (err) {
            console.warn('[Auth] Erreur signOut:', err);
        }
        localStorage.removeItem('nysoa_current_user');
        window.location.href = 'login.html';
        return false;
    }
    
    // 3. Récupérer et valider le rôle
    const userRole = session.user?.user_metadata?.role;
    
    if (!userRole || !AUTH_CONFIG.VALID_ROLES.includes(userRole)) {
        console.error('[Auth] Rôle invalide ou manquant:', userRole);
        await db.auth.signOut();
        window.location.href = 'login.html';
        return false;
    }
    
    // 4. Vérifier l'autorisation pour cette page
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
    
    // 5. Synchroniser localStorage avec la session réelle
    syncLocalStorage(session);
    
    console.log(`[Auth] ✓ Authentification réussie pour ${userRole}`);
    return true;
}

/**
 * Déconnexion sécurisée complète
 */
async function logout() {
    if (!confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) return;
    
    try {
        // 1. Déconnecter côté Supabase
        const { error } = await db.auth.signOut();
        if (error) console.warn('[Auth] Erreur signOut:', error);
    } catch (err) {
        console.error('[Auth] Exception signOut:', err);
    }
    
    // 2. Nettoyer les stockages
    localStorage.removeItem('nysoa_current_user');
    localStorage.removeItem('nysoa_devis');
    localStorage.removeItem('nysoa_proformats');
    sessionStorage.clear();
    
    // 3. Arrêter le monitoring de session
    if (tokenCheckInterval) {
        clearInterval(tokenCheckInterval);
        tokenCheckInterval = null;
    }
    
    // 4. Invalider le cache
    if ('caches' in window) {
        try {
            const names = await caches.keys();
            await Promise.all(names.map(name => caches.delete(name)));
        } catch (err) {
            console.warn('[Auth] Erreur vidage cache:', err);
        }
    }
    
    // 5. Message et redirection
    if (typeof showNotification === 'function') {
        showNotification('Déconnexion réussie', 'success');
    }
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
}

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
    
    let remaining = 300;
    const countdownInterval = setInterval(() => {
        remaining--;
        const el = document.getElementById('warning-countdown');
        if (el) {
            el.textContent = Math.ceil(remaining / 60);
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
    
    if (isTokenExpired(session)) {
        console.warn('[Auth] Token expiré');
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
    
    const timeSinceLastActivity = Date.now() - lastActivityTime;
    
    if (timeSinceLastActivity > AUTH_CONFIG.INACTIVITY_WARNING) {
        showSessionExpiringWarning();
    }
    
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
    if (tokenCheckInterval) return;
    
    tokenCheckInterval = setInterval(checkAndRefreshToken, AUTH_CONFIG.TOKEN_CHECK_INTERVAL);
    console.log('[Auth] Token monitoring démarré');
}

// ══════════════════════════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════════════════════════
async function initSupabase() {
    console.log('[Supabase] Connexion…', SUPABASE_URL);
    try {
        const { error } = await db.from('chantiers').select('code').limit(1);
        if (error) throw error;
        console.log('[Supabase] ✓ Connecté');
        if (typeof showNotification === 'function')
            showNotification('Connecté à Supabase ✓', 'success');

        // Charger toutes les données via les fonctions de script.js
        if (typeof loadAllData === 'function') await loadAllData();

        // Initialiser le module devis (seed + liste)
        if (typeof initDevis === 'function') await initDevis();

        // Charger les nouveaux modules
        if (typeof loadAntoka    === 'function') await loadAntoka();
        if (typeof loadCredits   === 'function') await loadCredits();
        if (typeof loadCaisse    === 'function') await loadCaisse();
        if (typeof loadCatalogue === 'function') await loadCatalogue();
        if (typeof loadContrats  === 'function') await loadContrats();

    } catch (err) {
        console.error('[Supabase] Erreur connexion:', err);
        if (typeof showNotification === 'function')
            showNotification('⚠ Supabase hors ligne — vérifiez la connexion', 'warning');
    }
}

document.addEventListener('DOMContentLoaded', initSupabase);

// ── Temps réel ────────────────────────────────────────────────
db.channel('nysoa-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'journal' },
        () => { if (typeof loadJournalTable === 'function') loadJournalTable(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' },
        () => { if (typeof loadAchatsTable === 'function') loadAchatsTable(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage' },
        () => { if (typeof loadPointageTable === 'function') loadPointageTable(); })
    .subscribe();

// ══════════════════════════════════════════════════════════════
// FONCTIONS CRUD FORMULAIRES (ajout depuis modals)
// ══════════════════════════════════════════════════════════════

async function addJournalEntry(entry) {
    const { error } = await db.from('journal').insert({
        date:          entry.date || today(),
        chantier:      entry.chantier      || null,
        designation:   entry.designation,
        montant:       parseFloat(entry.montant) || 0,
        mode_paiement: entry.mode_paiement || null,
        categorie:     entry.categorie     || null,
        travaux:       entry.travaux       || null,
    });
    if (error) return handleError(error, 'addJournalEntry');
    showNotification('Écriture ajoutée ✓', 'success');
    if (typeof loadJournalTable === 'function') loadJournalTable();
}

async function addAchat(achat) {
    const pu = parseFloat(achat.prix_unitaire) || 0;
    const qte = parseFloat(achat.quantite) || 1;
    const { error } = await db.from('commandes').insert({
        date:          achat.date || today(),
        chantier:      achat.chantier      || null,
        libelle:       achat.libelle,
        quantite:      qte,
        prix_unitaire: pu,
        prix:          pu * qte,
        fournisseur:   achat.fournisseur   || null,
        mode_paiement: achat.mode_paiement || null,
        statut:        'EN ATTENTE',
    });
    if (error) return handleError(error, 'addAchat');
    showNotification('Achat enregistré ✓', 'success');
    if (typeof loadAchatsTable === 'function') loadAchatsTable();
}

async function addPersonnel(emp) {
    const { error } = await db.from('personnel').insert({
        nom:               emp.nom + (emp.prenom ? ' ' + emp.prenom : ''),
        chantier:          emp.chantier    || null,
        salaire_journalier: parseFloat(emp.salaire) || 0,
        metier:            emp.metier      || null,
        date_embauche:     emp.date_embauche || null,
        type_salaire:      parseFloat(emp.salaire) >= 100000 ? 'MENSUEL' : 'JOURNALIER',
        actif:             true,
    });
    if (error) return handleError(error, 'addPersonnel');
    showNotification('Employé ajouté ✓', 'success');
    if (typeof loadPersonnelTable === 'function') loadPersonnelTable();
}

async function deletePersonnel(id) {
    if (!confirm('Désactiver cet employé ?')) return;
    const { error } = await db.from('personnel').update({ actif: false }).eq('id', id);
    if (error) return handleError(error, 'deletePersonnel');
    showNotification('Employé désactivé', 'success');
    if (typeof loadPersonnelTable === 'function') loadPersonnelTable();
}

async function deleteJournal(id) {
    if (!confirm('Supprimer cette écriture ?')) return;
    const { error } = await db.from('journal').delete().eq('id', id);
    if (error) return handleError(error, 'deleteJournal');
    showNotification('Écriture supprimée', 'success');
    if (typeof loadJournalTable === 'function') loadJournalTable();
}

async function deleteAchat(id) {
    if (!confirm('Supprimer cet achat ?')) return;
    const { error } = await db.from('commandes').delete().eq('id', id);
    if (error) return handleError(error, 'deleteAchat');
    showNotification('Achat supprimé', 'success');
    if (typeof loadAchatsTable === 'function') loadAchatsTable();
}

// ── Export Excel depuis Supabase ──────────────────────────────
async function exportJournalToExcel() {
    const { data, error } = await db.from('journal').select('*').order('date');
    if (error) return handleError(error, 'exportJournalToExcel');
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
        'Date': r.date, 'Chantier': r.chantier, 'Désignation': r.designation,
        'Montant (Ar)': r.montant, 'Mode paiement': r.mode_paiement,
        'Catégorie': r.categorie, 'Travaux': r.travaux,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Journal 2026');
    XLSX.writeFile(wb, `JOURNAL_NYSOA_${today()}.xlsx`);
    showNotification('Export Journal Excel ✓', 'success');
}

async function exportPointageToExcel() {
    const { data, error } = await db.from('pointage').select('*').order('date');
    if (error) return handleError(error, 'exportPointageToExcel');
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
        'Semaine du': r.date, 'Chantier': r.chantier, 'Employé': r.nom_employe,
        'Nb jours': r.nb_jours, 'Salaire/jour': r.salaire_journalier,
        'Total avances': r.total_avances, 'À payer': r.a_payer,
    })));
    const wb2 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb2, ws, 'Pointage 2026');
    XLSX.writeFile(wb2, `POINTAGE_NYSOA_${today()}.xlsx`);
    showNotification('Export Pointage Excel ✓', 'success');
}

// ──────────────────────────────────────────────────────────────
// INITIALISATION AUTH AU DÉMARRAGE (pages non-login)
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    if (currentPage !== 'login.html') {
        initActivityListeners();
        initTokenMonitoring();
    }
});

console.log('[NYSOA BTP] supabase.js chargé ✓');
