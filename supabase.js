// ============================================================
// NYSOA BTP — supabase.js  (version corrigée)
// Rôle : initialiser le client Supabase et démarrer l'appli
// Les fonctions load* sont dans script.js (une seule définition)
// ============================================================

// ── CONFIGURATION ─────────────────────────────────────────────
const SUPABASE_URL = 'https://djncsybvloyyesllfxhq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDI1OTksImV4cCI6MjA5MzMxODU5OX0.o4MOSg6axYoNdl0XgidLi0eNukR-KwnKvecZxchkcP8';

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
// AUTH — Fonctions centralisées (login / logout / guard)
// ══════════════════════════════════════════════════════════════

/**
 * Vérifie la session Supabase réelle et le rôle attendu.
 * À appeler au chargement de chaque page protégée.
 * @param {string|null} expectedRole  ex: 'daf', 'chef', 'admin' — null = tout rôle accepté
 * @returns {object|null}  user { email, role } ou null (+ redirection déjà lancée)
 */
async function checkAuthOrRedirect(expectedRole = null) {
    let user = null;

    try {
        const { data: { session: sbSession }, error } = await db.auth.getSession();
        if (sbSession && !error) {
            const expiresAt = (sbSession.expires_at || 0) * 1000;
            if (Date.now() <= expiresAt) {
                const role = sbSession.user?.user_metadata?.role || 'admin';
                user = { email: sbSession.user.email, role, user_metadata: sbSession.user.user_metadata };
                localStorage.setItem('nysoa_current_user', JSON.stringify(user));
            } else {
                await db.auth.signOut();
            }
        }
    } catch (e) {
        console.warn('[Auth] getSession failed, fallback localStorage:', e.message);
    }

    // Fallback localStorage si Supabase non configuré
    if (!user) {
        const stored = localStorage.getItem('nysoa_current_user');
        if (stored) {
            try { user = JSON.parse(stored); } catch (_) { user = null; }
        }
    }

    if (!user) {
        localStorage.removeItem('nysoa_current_user');
        window.location.href = 'login.html';
        return null;
    }

    // Rediriger si le rôle ne correspond pas à la page
    if (expectedRole && user.role !== expectedRole) {
        const roleMap = {
            admin: 'admin',
            daf: 'daf',
            chef: 'chef-chantier',
            rh: 'rh',
            controleur: 'controleur',
            technicien: 'technicien'
        };
        window.location.href = (roleMap[user.role] || 'index') + '.html';
        return null;
    }

    return user;
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

console.log('[NYSOA BTP] auth.js fonctions chargées ✓');

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

        // Charger toutes les données uniquement sur la page principale (index)
        const page = window.location.pathname.split('/').pop() || 'index.html';
        if (page === 'index.html' || page === '' || page === 'index') {
            if (typeof loadAllData === 'function') await loadAllData();
        }

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
        () => { if (typeof loadDevisTable === 'function') loadDevisTable(); if (typeof loadDevisDAF === 'function') loadDevisDAF(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'validations' },
        () => { if (typeof loadValidationCount === 'function') loadValidationCount(); })
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

console.log('[NYSOA BTP] supabase.js chargé ✓');
