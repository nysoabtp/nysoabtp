// ============================================================
// NYSOA BTP — supabase.js  (version corrigée)
// Rôle : initialiser le client Supabase et démarrer l'appli
// Les fonctions load* sont dans script.js (une seule définition)
// ============================================================

// ── CONFIGURATION ─────────────────────────────────────────────
// SUPABASE_URL et SUPABASE_KEY sont chargés depuis config.js
// (exclu du dépôt — voir config.example.js pour le modèle)
if (typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_KEY === 'undefined') {
    console.error('[NYSOA BTP] config.js manquant ou incomplet. Copiez config.example.js → config.js et renseignez vos clés Supabase.');
}

// ── Client Supabase ───────────────────────────────────────────
let _db = null;
try {
    const { createClient } = supabase;
    _db = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (e) {
    console.warn('[NYSOA BTP] Supabase non disponible — les données ne pourront pas être chargées.');
}
const db = _db || {
    from: () => chainable({ data: [], error: null }),
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    realtime: { channel: () => ({ on: () => ({ subscribe: () => {} }) }) },
    auth: { onAuthStateChange: () => ({ data: { session: null } }) }
};
function chainable(result) {
    const c = typeof result?.then === 'function' ? result : Promise.resolve(result || { data: [], error: null });
    const chain = { then: c.then.bind(c), catch: c.catch.bind(c) };
    return new Proxy(chain, { get: (t, p) => t[p] || (() => chainable(result)) });
}

// ── Assainissement XSS ────────────────────────────────────────
/**
 * Échappe les caractères HTML dangereux avant injection dans le DOM.
 * Utiliser : el.innerHTML = esc(data.nom)  ou mieux : el.textContent = data.nom
 */
function esc(str) {
    if (str === null || str === undefined) return '';
    const s = String(str);
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Alias court pour usage intensif
const e = esc;

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
// AUTH — Fonctions centralisées (login / logout / guard)
// ══════════════════════════════════════════════════════════════

/**
 * Vérifie la session Supabase réelle et le rôle attendu.
 * À appeler au chargement de chaque page protégée.
 * @param {string|null} expectedRole  ex: 'daf', 'chef', 'admin' — null = tout rôle accepté
 * @returns {object|null}  user { email, role } ou null (+ redirection déjà lancée)
 */
async function checkAuthOrRedirect(expectedRole = null) {
    const ROLE_MAP = {
        admin: 'admin', daf: 'daf', chef: 'chef-chantier',
        rh: 'rh', controleur: 'controleur', technicien: 'technicien'
    };

    try {
        const { data: { session }, error } = await db.auth.getSession();

        // Session absente ou expirée → redirection immédiate (pas de fallback localStorage)
        if (!session || error) {
            localStorage.removeItem('nysoa_current_user');
            window.location.href = 'login.html';
            return null;
        }

        const role = session.user?.user_metadata?.role || 'admin';
        const user = { email: session.user.email, role, user_metadata: session.user.user_metadata };

        // Cache lecture-seule uniquement (source de vérité = session Supabase)
        localStorage.setItem('nysoa_current_user', JSON.stringify(user));

        // Rediriger si le rôle ne correspond pas à la page
        if (expectedRole && user.role !== expectedRole) {
            window.location.href = (ROLE_MAP[user.role] || 'index') + '.html';
            return null;
        }

        return user;

    } catch (e) {
        console.error('[Auth] getSession error:', e.message);
        localStorage.removeItem('nysoa_current_user');
        window.location.href = 'login.html';
        return null;
    }
}

/**
 * Déconnexion complète : invalide la session Supabase + vide localStorage.
 */
async function logout() {
    if (!confirm('Voulez-vous vous déconnecter ?')) return;
    try {
        await db.auth.signOut();
    } catch (e) {
        console.warn('[Auth] signOut error (ignoré):', e);
    }
    localStorage.removeItem('nysoa_current_user');
    window.location.href = 'login.html';
}

// Récupère l'utilisateur courant (Supabase d'abord, fallback localStorage)
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('nysoa_current_user') || 'null');
}

// ══════════════════════════════════════════════════════════════
// INITIALISATION — Chargement rôle-based pour optimiser les requêtes
// ══════════════════════════════════════════════════════════════
async function initSupabase() {
    // Vérifier la connexion Supabase d'abord
    try {
        const { error } = await db.from('chantiers').select('code').limit(1);
        if (error) throw error;
        if (typeof showNotification === 'function')
            showNotification('Connecté à Supabase ✓', 'success');
    } catch (err) {
        console.error('[Supabase] Erreur connexion:', err);
        if (typeof showNotification === 'function')
            showNotification('⚠ Supabase hors ligne — vérifiez la connexion', 'warning');
        return; // Ne pas charger les données si Supabase est inaccessible
    }

    // Déterminer la page courante et le rôle de l'utilisateur
    const page = window.location.pathname.split('/').pop() || 'index.html';
    const user = getCurrentUser();
    const role = user?.role || 'admin';

    // CORRIGÉ Bug #11: Chargement sélectif par page/rôle (pas de chargement inutile)
    try {
        // Page principale: charger les données dashboard
        if (page === 'index.html' || page === '' || page === 'index') {
            if (typeof loadAllData === 'function') await loadAllData();
        }

        // Module devis: sur toutes les pages qui l'utilisent
        if (typeof initDevis === 'function') await initDevis();

        // Modules spécifiques par page (évite les requêtes inutiles)
        // DAF / Admin: antoka, credits, caisse
        if ((role === 'daf' || role === 'admin') && page !== 'chef-chantier.html') {
            if (typeof loadAntoka  === 'function') await loadAntoka().catch(() => {});
            if (typeof loadCredits === 'function') await loadCredits().catch(() => {});
            if (typeof loadCaisse  === 'function') await loadCaisse().catch(() => {});
        }

        // Admin / DAF: catalogue prix
        if (role === 'admin' || role === 'daf') {
            if (typeof loadCatalogue === 'function') await loadCatalogue().catch(() => {});
        }

        // Admin / DAF / RH: contrats prestataires
        if (role === 'admin' || role === 'daf' || role === 'rh') {
            if (typeof loadContrats === 'function') await loadContrats().catch(() => {});
        }

        // Pages spécifiques: charger les modules appropriés
        if (page === 'daf.html') {
            if (typeof loadDevisDAF === 'function') await loadDevisDAF().catch(() => {});
            if (typeof loadAntoka  === 'function') await loadAntoka().catch(() => {});
            if (typeof loadCredits === 'function') await loadCredits().catch(() => {});
            if (typeof loadCaisse  === 'function') await loadCaisse().catch(() => {});
        }

        if (page === 'rh.html') {
            if (typeof loadContrats === 'function') await loadContrats().catch(() => {});
        }

        if (page === 'chef-chantier.html') {
            if (typeof loadChefData === 'function') await loadChefData().catch(() => {});
        }

    } catch (err) {
        console.error('[Supabase] Erreur chargement données:', err);
        // Ne pas bloquer l'interface, juste logger l'erreur
    }
}

document.addEventListener('DOMContentLoaded', initSupabase);

// ── Temps réel — avec guard offline + retry backoff ───────────
// Évite le flood ERR_INTERNET_DISCONNECTED qui gèle le thread principal.
(function initRealtime() {
    // Ne pas tenter si hors ligne au démarrage
    if (!navigator.onLine) {
        console.info('[Realtime] Hors ligne au démarrage — abonnement différé.');
        window.addEventListener('online', initRealtime, { once: true });
        return;
    }

    let _retryDelay = 2000;   // délai initial : 2 s
    const _maxDelay  = 30000; // plafond : 30 s
    let   _channel   = null;

    function _subscribe() {
        if (!navigator.onLine) {
            console.info('[Realtime] Offline — retry dans', _retryDelay / 1000, 's');
            setTimeout(_subscribe, _retryDelay);
            _retryDelay = Math.min(_retryDelay * 2, _maxDelay);
            return;
        }

        // Nettoyer l'ancien canal si existant
        if (_channel) {
            try { db.removeChannel(_channel); } catch (_) { /* ignore */ }
        }

        _channel = db.channel('nysoa-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'journal_global' },
                () => { if (typeof loadJournalTable === 'function') loadJournalTable(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes' },
                () => { if (typeof loadAchatsTable === 'function') loadAchatsTable(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage' },
                () => { if (typeof loadPointageTable === 'function') loadPointageTable(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage_attendance' },
                () => { if (typeof loadPointageTable === 'function') loadPointageTable(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'personnel' },
                () => { document.querySelectorAll('[data-reload="personnel"]').forEach(el => {
                    if (typeof el.onclick === 'function') el.onclick();
                }); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chantiers' },
                () => { if (typeof loadChefData === 'function') loadChefData(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'materiels' },
                () => { if (typeof loadStockTable === 'function') loadStockTable(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'devis' },
                () => { if (typeof loadDevisTable === 'function') loadDevisTable();
                        if (typeof loadDevisDAF === 'function') loadDevisDAF(); })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'validations' },
                () => { if (typeof loadValidationCount === 'function') loadValidationCount(); })
            .subscribe(function (status, err) {
                if (status === 'SUBSCRIBED') {
                    _retryDelay = 2000; // reset backoff après succès
                    console.info('[Realtime] Connecté ✓');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn('[Realtime]', status, err || '', '— retry dans', _retryDelay / 1000, 's');
                    setTimeout(_subscribe, _retryDelay);
                    _retryDelay = Math.min(_retryDelay * 2, _maxDelay);
                } else if (status === 'CLOSED') {
                    console.info('[Realtime] Canal fermé.');
                }
            });
    }

    // Relancer proprement quand la connexion revient
    window.addEventListener('online',  () => { _retryDelay = 2000; _subscribe(); });
    window.addEventListener('offline', () => { console.info('[Realtime] Connexion perdue — en attente...'); });

    _subscribe();
})();

// ══════════════════════════════════════════════════════════════
// FONCTIONS CRUD FORMULAIRES (ajout depuis modals)
// ══════════════════════════════════════════════════════════════

async function addJournalEntry(entry) {
    // ERR-14 CORRIGÉ : insertion dans journal_global (table centrale V2).
    // L'ancienne table 'journal' est non sécurisée par les RLS de l'ERP V2.
    const montant = parseFloat(entry.montant) || 0;
    const { error } = await db.from('journal_global').insert({
        date_ecriture: entry.date          || today(),
        type_ecriture: entry.type_ecriture || 'depense_daf',
        chantier_id:   entry.chantier_id   || null,
        designation:   entry.designation,
        montant,
        debit:         entry.debit  !== undefined ? parseFloat(entry.debit)  : montant,
        credit:        entry.credit !== undefined ? parseFloat(entry.credit) : 0,
        mode_paiement: entry.mode_paiement || null,
        reference:     entry.reference     || null,
        saisi_par:     entry.saisi_par     || 'SYSTEME',
        visible_daf:   entry.visible_daf   !== undefined ? entry.visible_daf : true,
        statut:        'VALIDE',
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
        type_salaire:      emp.type_salaire || 'JOURNALIER',  // ERR-12 CORRIGÉ : champ explicite, pas de déduction heuristique
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
    // CORRIGÉ Bug #1: utiliser journal_global (table sécurisée RLS)
    // et attendre la résolution complète avant de déclencher le rechargement
    if (!confirm('Supprimer cette écriture ?')) return;
    try {
        const { error } = await db.from('journal_global').delete().eq('id', id);
        if (error) {
            handleError(error, 'deleteJournal');
            return;
        }
        showNotification('Écriture supprimée', 'success');
        if (typeof loadJournalTable === 'function') await loadJournalTable();
    } catch (err) {
        console.error('[Supabase] deleteJournal error:', err);
        showNotification('Erreur suppression écriture', 'error');
    }
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
    // CORRIGÉ Bug #1: utiliser journal_global (table sécurisée RLS)
    showNotification('Export en cours...', 'info');
    try {
        const { data, error } = await db.from('journal_global').select('*').order('date_ecriture');
        if (error) {
            handleError(error, 'exportJournalToExcel');
            return;
        }
        const ws = XLSX.utils.json_to_sheet((data || []).map(r => ({
            'Date': r.date_ecriture, 'Type': r.type_ecriture, 'Chantier ID': r.chantier_id,
            'Désignation': r.designation, 'Montant (Ar)': r.montant,
            'Débit': r.debit, 'Crédit': r.credit, 'Mode paiement': r.mode_paiement,
            'Référence': r.reference, 'Saisi par': r.saisi_par, 'Statut': r.statut,
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Journal 2026');
        XLSX.writeFile(wb, `JOURNAL_NYSOA_${today()}.xlsx`);
        showNotification('Export Journal Excel ✓', 'success');
    } catch (err) {
        console.error('[Supabase] exportJournalToExcel error:', err);
        showNotification('Erreur export journal', 'error');
    }
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

console.log('[NYSOA BTP] supabase.js chargé ✓');
