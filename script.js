// ============================================================
// NYSOA BTP — script.js
// Toutes les données viennent de Supabase (supabase.js)
// localStorage = fallback de lecture seulement si Supabase échoue
// ============================================================

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const pageTitle = document.getElementById('page-title');

let sectionTitles = {
    'dashboard':  'Tableau de bord',
    'projets':    'Gestion des Projets/Chantiers',
    'achats':     'Gestion des Achats',
    'journal':    'Journal / Comptabilité',
    'logistique': 'Logistique / Gestion des Stocks',
    'personnel':  'Gestion du Personnel',
    'devis':      'Gestion des Devis',
    'proformat':  'Gestion des Proformats',
    'rapports':   'Rapports et Statistiques',
    'pointage':   'Pointage QR Code',
    'salaires':   'Calcul des Salaires',
    'suivi-chantier': 'Suivi Chantier',
    'antoka':    'Antoka — Acomptes Employés',
    'credits':   'Crédits Fournisseurs',
    'caisse':    'Caisse',
    'catalogue': 'Catalogue Prix',
    'contrats':  'Contrats'
};

// ── Helpers ──────────────────────────────────────────────────
function getStatusClass(status) {
    const map = {
        'En cours': 'active', 'EN COURS': 'active', 'Actif': 'active', 'active': 'active',
        'Livré': 'success', 'Terminé': 'success', 'TERMINE': 'success', 'OK': 'success',
        'En attente': 'warning', 'EN ATTENTE': 'warning', 'Bientôt terminé': 'warning',
        'En transit': 'active', 'Urgent': 'error', 'EN PANNE': 'error'
    };
    return map[status] || 'active';
}

// formatAriary et formatDate définis dans supabase.js

// ── Notification ─────────────────────────────────────────────
function showNotification(message, type = 'info') {
    // Supprimer l'ancienne notification du même type
    document.querySelectorAll('.notification').forEach(n => n.remove());

    const colors = {
        success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
        error:   { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' },
        warning: { bg: '#fff3cd', text: '#856404', border: '#ffeeba' },
        info:    { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' }
    };
    const c = colors[type] || colors.info;

    const n = document.createElement('div');
    n.className = 'notification';
    n.textContent = message;
    n.style.cssText = `position:fixed;top:20px;right:20px;padding:15px 25px;
        background:${c.bg};color:${c.text};border:1px solid ${c.border};
        border-radius:5px;z-index:10000;animation:slideIn 0.3s ease;`;
    document.body.appendChild(n);
    setTimeout(() => { n.style.animation = 'slideOut 0.3s ease'; setTimeout(() => n.remove(), 300); }, 3000);
}

// Animations
const _animStyle = document.createElement('style');
_animStyle.textContent = `
    @keyframes slideIn  { from { transform:translateX(100%);opacity:0 } to { transform:translateX(0);opacity:1 } }
    @keyframes slideOut { from { transform:translateX(0);opacity:1 }    to { transform:translateX(100%);opacity:0 } }
`;
document.head.appendChild(_animStyle);

// ============================================================
// PROJETS / CHANTIERS — lit depuis Supabase via supabase.js
// ============================================================
async function loadProjetsTable() {
    const tbody = document.querySelector('#projets-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('chantiers').select('*').order('id');
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach((p, i) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', p.id);
        row.innerHTML = `
            <td>${p.code || 'PRJ-' + String(i+1).padStart(3,'0')}</td>
            <td>${p.nom}</td>
            <td>${p.client || '—'}</td>
            <td>${p.budget ? formatAriary(p.budget) : '—'}</td>
            <td>${formatDate(p.debut)}</td>
            <td>${formatDate(p.fin)}</td>
            <td><div class="progress-bar"><div class="progress" style="width:${p.progression||0}%"></div></div></td>
            <td><span class="status ${getStatusClass(p.statut)}">${p.statut || 'EN COURS'}</span></td>
            <td>
                <button class="btn-icon" title="Voir dépenses" onclick="voirChantier('${p.nom}')"><i class="fas fa-chart-bar"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteProjet('${p.id}',this)"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(row);
    });
    if (typeof reApplyChantierFilter === 'function') reApplyChantierFilter();
}

async function deleteProjet(id, btn) {
    if (!confirm('Supprimer ce projet ?')) return;
    const { error } = await db.from('chantiers').delete().eq('id', id);
    if (error) { showNotification('Erreur suppression', 'error'); return; }
    btn.closest('tr').remove();
    showNotification('Projet supprimé', 'success');
}

// ── Fiche détaillée d'un chantier avec postes de dépenses ────
async function voirChantier(nomChantier) {
    // Récupérer toutes les écritures de ce chantier
    const { data, error } = await db.from('journal')
        .select('date,designation,montant,categorie,travaux,mode_paiement')
        .eq('chantier', nomChantier)
        .order('date', { ascending: false });

    if (error) { showNotification('Erreur chargement', 'error'); return; }

    // Calculer totaux par catégorie
    const parCategorie = {};
    const parTravaux = {};
    let total = 0;
    (data || []).forEach(r => {
        const cat = r.categorie || 'AUTRES';
        const trav = r.travaux || 'NON DÉFINI';
        const m = parseFloat(r.montant) || 0;
        parCategorie[cat] = (parCategorie[cat] || 0) + m;
        parTravaux[trav]  = (parTravaux[trav]  || 0) + m;
        total += m;
    });

    // Trier par montant décroissant
    const sortedCat  = Object.entries(parCategorie).sort((a,b) => b[1]-a[1]);
    const sortedTrav = Object.entries(parTravaux).sort((a,b) => b[1]-a[1]);

    // Créer ou réutiliser le modal détail
    let modal = document.getElementById('modal-chantier-detail');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-chantier-detail';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const catRows = sortedCat.map(([cat, mont]) => {
        const pct = total > 0 ? (mont/total*100).toFixed(1) : 0;
        return `<tr>
            <td>${cat}</td>
            <td style="text-align:right;font-weight:600">${formatAriary(mont)}</td>
            <td style="text-align:right;color:#64748b">${pct}%</td>
            <td><div style="background:#e2e8f0;border-radius:4px;height:8px;width:100%">
                <div style="background:#0066cc;height:8px;border-radius:4px;width:${pct}%"></div>
            </div></td>
        </tr>`;
    }).join('');

    const travRows = sortedTrav.map(([trav, mont]) => {
        const pct = total > 0 ? (mont/total*100).toFixed(1) : 0;
        return `<tr>
            <td>${trav}</td>
            <td style="text-align:right;font-weight:600">${formatAriary(mont)}</td>
            <td style="text-align:right;color:#64748b">${pct}%</td>
            <td><div style="background:#e2e8f0;border-radius:4px;height:8px;width:100%">
                <div style="background:#16a34a;height:8px;border-radius:4px;width:${pct}%"></div>
            </div></td>
        </tr>`;
    }).join('');

    // Dernières écritures
    const lastRows = (data || []).slice(0,10).map(r => `
        <tr>
            <td>${formatDate(r.date)}</td>
            <td>${r.designation}</td>
            <td>${r.categorie || '—'}</td>
            <td>${r.travaux || '—'}</td>
            <td style="text-align:right;font-weight:600">${formatAriary(r.montant)}</td>
        </tr>`).join('');

    modal.innerHTML = `
        <div class="modal-content" style="max-width:800px;max-height:90vh;overflow-y:auto">
            <div class="modal-header" style="background:#1C2B3A;color:white;border-radius:8px 8px 0 0">
                <h3 style="color:white">🏗️ ${nomChantier} — Postes de dépenses</h3>
                <button class="close-modal" onclick="closeModal('modal-chantier-detail')" style="color:white">&times;</button>
            </div>
            <div class="modal-body">
                <div style="background:#f0f9ff;border:1px solid #0066cc;border-radius:8px;padding:15px;margin-bottom:20px;text-align:center">
                    <p style="font-size:13px;color:#0066cc;margin:0">TOTAL DÉPENSES</p>
                    <p style="font-size:28px;font-weight:700;color:#1C2B3A;margin:5px 0">${formatAriary(total)}</p>
                    <p style="font-size:12px;color:#64748b;margin:0">${(data||[]).length} écritures</p>
                </div>

                <h4 style="color:#1C2B3A;border-bottom:2px solid #0066cc;padding-bottom:6px">📊 Par catégorie</h4>
                <table class="table" style="margin-bottom:20px">
                    <thead><tr><th>Catégorie</th><th style="text-align:right">Montant</th><th style="text-align:right">%</th><th>Répartition</th></tr></thead>
                    <tbody>${catRows || '<tr><td colspan="4" style="text-align:center;color:#94a3b8">Aucune donnée</td></tr>'}</tbody>
                </table>

                <h4 style="color:#1C2B3A;border-bottom:2px solid #16a34a;padding-bottom:6px">🔨 Par type de travaux</h4>
                <table class="table" style="margin-bottom:20px">
                    <thead><tr><th>Travaux</th><th style="text-align:right">Montant</th><th style="text-align:right">%</th><th>Répartition</th></tr></thead>
                    <tbody>${travRows || '<tr><td colspan="4" style="text-align:center;color:#94a3b8">Aucune donnée</td></tr>'}</tbody>
                </table>

                <h4 style="color:#1C2B3A;border-bottom:2px solid #f59e0b;padding-bottom:6px">📋 Dernières écritures</h4>
                <table class="table">
                    <thead><tr><th>Date</th><th>Désignation</th><th>Catégorie</th><th>Travaux</th><th style="text-align:right">Montant</th></tr></thead>
                    <tbody>${lastRows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8">Aucune écriture</td></tr>'}</tbody>
                </table>

                <div style="text-align:center;margin-top:20px">
                    <button class="btn btn-secondary" onclick="exportChantierPDF('${nomChantier}',${total})">
                        <i class="fas fa-file-pdf"></i> Exporter PDF
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal('modal-chantier-detail')" style="margin-left:10px">
                        Fermer
                    </button>
                </div>
            </div>
        </div>`;

    modal.style.display = 'flex';
}

async function exportChantierPDF(nomChantier, total) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Fiche Chantier : ${nomChantier}`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Total dépenses : ${formatAriary(total)}`, 20, 35);
    doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 20, 45);
    doc.save(`chantier_${nomChantier.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`);
    showNotification('PDF exporté ✓', 'success');
}

// ============================================================
// ACHATS — lit depuis Supabase
// ============================================================
async function loadAchatsTable() {
    const tbody = document.querySelector('#achats-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('commandes').select('*').order('date', { ascending: false }).limit(200);
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach((a, i) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', a.id);
        const pu = a.prix_unitaire || (a.prix && a.quantite ? a.prix / a.quantite : a.prix || 0);
        const qte = a.quantite || 1;
        const total = pu * qte;
        row.innerHTML = `
            <td>CMD-${String(i+1).padStart(3,'0')}</td>
            <td>${a.chantier || '—'}</td>
            <td>${a.libelle || '—'}</td>
            <td class="montant">${formatAriary(pu)}</td>
            <td>${qte}</td>
            <td class="montant">${formatAriary(total)}</td>
            <td>${a.fournisseur || '—'}</td>
            <td>${formatDate(a.date)}</td>
            <td><span class="status ${getStatusClass(a.statut)}">${a.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir"      onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteAchatRow('${a.id}',this)"><i class="fas fa-trash"></i></button>
                <button class="btn-icon" title="Imprimer"  onclick="printRow(this)"><i class="fas fa-print"></i></button>
            </td>`;
        tbody.appendChild(row);
    });

    // Ré-appliquer le filtre chantier actif s'il y en a un
    if (typeof reApplyChantierFilter === 'function') reApplyChantierFilter();
}

async function deleteAchatRow(id, btn) {
    if (!confirm('Supprimer cet achat ?')) return;
    const { error } = await db.from('commandes').delete().eq('id', id);
    if (error) { showNotification('Erreur suppression', 'error'); return; }
    btn.closest('tr').remove();
    showNotification('Achat supprimé', 'success');
}

// ============================================================
// JOURNAL — lit depuis Supabase
// ============================================================
async function loadJournalTable() {
    const tbody = document.querySelector('#journal-table tbody') ||
                  document.getElementById('journal-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('journal').select('*').order('date', { ascending: false, nullsFirst: false }).limit(200);
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach((r, i) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', r.id);
        row.innerHTML = `
            <td>${formatDate(r.date)}</td>
            <td>${r.chantier || '—'}</td>
            <td>${r.designation}</td>
            <td>${formatAriary(r.montant)}</td>
            <td>${r.mode_paiement || '—'}</td>
            <td><span class="status ${getStatusClass(r.categorie)}">${r.categorie || '—'}</span></td>
            <td>${r.travaux || '—'}</td>
            <td>
                <button class="btn-icon" title="Supprimer" onclick="deleteJournalRow('${r.id}',this)"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(row);
    });

    // Mettre à jour les stats journal
    const recettes = data.filter(r => r.categorie === 'RECETTE').reduce((s,r) => s+(r.montant||0), 0);
    const depenses = data.filter(r => r.categorie !== 'RECETTE').reduce((s,r) => s+(r.montant||0), 0);
    const benefice = recettes - depenses;
    const elRec = document.getElementById('journal-stat-recettes');
    const elDep = document.getElementById('journal-stat-depenses');
    const elBen = document.getElementById('journal-stat-benefice');
    if (elRec) elRec.textContent = formatAriary(recettes);
    if (elDep) elDep.textContent = formatAriary(depenses);
    if (elBen) elBen.textContent = formatAriary(benefice);
    if (typeof reApplyChantierFilter === 'function') reApplyChantierFilter();
}

async function deleteJournalRow(id, btn) {
    if (!confirm('Supprimer cette écriture ?')) return;
    const { error } = await db.from('journal').delete().eq('id', id);
    if (error) { showNotification('Erreur suppression', 'error'); return; }
    btn.closest('tr').remove();
    showNotification('Écriture supprimée', 'success');
}

// ============================================================
// PERSONNEL — lit depuis Supabase
// ============================================================
function calculerAnciennete(dateEmbauche) {
    if (!dateEmbauche) return '—';
    const emb = new Date(dateEmbauche);
    const now = new Date();
    let annees = now.getFullYear() - emb.getFullYear();
    let mois = now.getMonth() - emb.getMonth();
    if (mois < 0) { annees--; mois += 12; }
    const parts = [];
    if (annees > 0) parts.push(annees + ' an' + (annees > 1 ? 's' : ''));
    if (mois > 0) parts.push(mois + ' mois');
    return parts.join(' ') || '0 mois';
}

async function loadPersonnelTable() {
    const tbody = document.getElementById('personnel-table-body') || document.querySelector('#personnel-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('personnel').select('*').order('nom');
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    // Populate chantier filter
    const chantiers = [...new Set(data.map(e => e.chantier).filter(Boolean))];
    const sel = document.getElementById('personnel-filter-chantier');
    if (sel && !sel.dataset.loaded) {
        sel.innerHTML = '<option value="">Tous chantiers</option>' + chantiers.map(c => `<option value="${c}">${c}</option>`).join('');
        sel.dataset.loaded = '1';
    }

    tbody.innerHTML = '';
    data.forEach((emp, i) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', emp.id);
        const anciennete = calculerAnciennete(emp.date_embauche);
        const typeSalaire = emp.type_salaire || 'JOURNALIER';
        const statut = emp.actif ? 'Actif' : 'Inactif';
        const statutClass = emp.actif ? 'success' : 'error';
        row.innerHTML = `
            <td>EMP-${String(i+1).padStart(3,'0')}</td>
            <td>${emp.nom}</td>
            <td>${emp.metier || '—'}</td>
            <td>${emp.chantier || '—'}</td>
            <td>${formatDate(emp.date_embauche)}</td>
            <td>${anciennete}</td>
            <td>${typeSalaire === 'MENSUEL' ? formatAriary(emp.salaire_journalier)+'/mois' : formatAriary(emp.salaire_journalier)+'/jour'}</td>
            <td><span class="status ${statutClass}">${statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Fin de contrat" onclick="finContrat('${emp.id}','${emp.nom.replace(/'/g,"\\'")}')"><i class="fas fa-times-circle"></i></button>
            </td>`;
        tbody.appendChild(row);
    });

    if (typeof reApplyChantierFilter === 'function') reApplyChantierFilter();
}
function finContrat(id, nom) {
    document.getElementById('fc-employe-id').value = id;
    document.getElementById('fc-employe-nom').textContent = nom;
    document.getElementById('fc-date-fin').value = new Date().toISOString().split('T')[0];
    document.getElementById('fc-motif').value = '';
    openModal('modal-fin-contrat');
}

async function submitFinContrat(e) {
    e.preventDefault();
    const id = document.getElementById('fc-employe-id').value;
    const dateFin = document.getElementById('fc-date-fin').value;
    const motif = document.getElementById('fc-motif').value;
    if (!id || !motif) { showNotification('Veuillez sélectionner un motif', 'error'); return; }
    const { error } = await db.from('personnel').update({ actif: false, date_fin: dateFin, motif_fin: motif }).eq('id', id);
    if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }
    closeModal('modal-fin-contrat');
    showNotification('Contrat terminé ✓', 'success');
    if (typeof loadPersonnelTable === 'function') loadPersonnelTable();
}

function filtrerPersonnelRecherche(val) {
    document.querySelectorAll('#personnel-table tbody tr').forEach(row => {
        const match = row.textContent.toLowerCase().includes(val.toLowerCase());
        row.style.display = match ? '' : 'none';
    });
}

function filtrerPersonnelDept(dept) {
    if (!dept) {
        document.querySelectorAll('#personnel-table tbody tr').forEach(row => row.style.display = '');
        return;
    }
    document.querySelectorAll('#personnel-table tbody tr').forEach(row => {
        const chantier = (row.dataset.chantier || row.cells[3]?.textContent || '').toLowerCase();
        row.style.display = chantier.includes(dept) ? '' : 'none';
    });
}

// LOGISTIQUE / STOCK — géré par stock.js (localStorage) 

// ============================================================
// POINTAGE — lit depuis Supabase
// ============================================================
async function loadPointageTable() {
    const tbody = document.getElementById('pointage-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">Chargement...</td></tr>';

    // ERR-15 CORRIGÉ : lecture sur pointage_attendance (données brutes réelles) et non sur la synthèse hebdomadaire 'pointage'
    const { data, error } = await db.from('pointage_attendance').select('*').order('date', { ascending: false }).limit(100);
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach(p => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', p.id);
        row.innerHTML = `
            <td>${formatDate(p.date)}</td>
            <td>${p.nom_employe}</td>
            <td>${p.chantier || '—'}</td>
            <td>${p.nb_jours}</td>
            <td>${formatAriary(p.salaire_journalier)}</td>
            <td>${formatAriary(p.total_avances)}</td>
            <td>
                <button class="btn-icon" title="Supprimer" onclick="deletePointageRow('${p.id}',this)"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(row);
    });
    if (typeof reApplyChantierFilter === 'function') reApplyChantierFilter();
}

async function deletePointageRow(id, btn) {
    if (!confirm('Supprimer ce pointage ?')) return;
    // ERR-15 CORRIGÉ : suppression dans pointage_attendance (table des pointages bruts)
    const { error } = await db.from('pointage_attendance').delete().eq('id', id);
    if (error) { showNotification('Erreur', 'error'); return; }
    btn.closest('tr').remove();
    showNotification('Pointage supprimé', 'success');
}

// ============================================================
// DASHBOARD STATS — depuis Supabase
// ============================================================
async function updateDashboardStats() {
    try {
        const [
            { count: nbChantiers },
            { count: nbPersonnel },
            { data: depData }
        ] = await Promise.all([
            db.from('chantiers').select('*', { count: 'exact', head: true }).eq('actif', true),
            db.from('personnel').select('*', { count: 'exact', head: true }).eq('actif', true),
            db.from('journal').select('montant').gte('date', `${new Date().getFullYear()}-01-01`)
        ]);
        let nbMat = 0;
        try {
            const { count } = await db.from('materiels').select('*', { count: 'exact', head: true });
            if (count !== null) nbMat = count;
        } catch(e) { /* table may not exist yet */ }

        const totalCA = (depData || []).reduce((s, r) => s + (r.montant || 0), 0);

        if (document.getElementById('dashboard-stat-projets'))
            document.getElementById('dashboard-stat-projets').textContent = nbChantiers || 0;
        if (document.getElementById('dashboard-stat-ca'))
            document.getElementById('dashboard-stat-ca').textContent =
                totalCA >= 1_000_000 ? (totalCA/1_000_000).toFixed(1) + 'MAr' : formatAriary(totalCA);
        if (document.getElementById('dashboard-stat-employes'))
            document.getElementById('dashboard-stat-employes').textContent = nbPersonnel || 0;
        if (document.getElementById('dashboard-stat-stock'))
            document.getElementById('dashboard-stat-stock').textContent = nbMat || 0;

        // Achats stats
        try {
                const { data: achats } = await db.from('commandes').select('prix, quantite, statut').gte('date', `${new Date().getFullYear()}-01-01`);
                if (achats) {
                    const totalDep = achats.reduce((s, r) => s + ((r.prix || 0) * (r.quantite || 1)), 0);
                const enAttente = achats.filter(r => r.statut === 'en_attente' || r.statut === 'attente').length;
                if (document.getElementById('achat-stat-commandes')) document.getElementById('achat-stat-commandes').textContent = achats.length;
                if (document.getElementById('achat-stat-depenses')) document.getElementById('achat-stat-depenses').textContent = formatAriary(totalDep);
                if (document.getElementById('achat-stat-attente')) document.getElementById('achat-stat-attente').textContent = enAttente;
            }
        } catch(_) {}

        // Personnel stats
        try {
            const { data: personnel } = await db.from('personnel').select('metier').eq('actif', true);
            if (personnel) {
                if (document.getElementById('personnel-stat-total')) document.getElementById('personnel-stat-total').textContent = personnel.length;
                const ouvriers = personnel.filter(p => !p.metier?.toLowerCase().includes('admin') && !p.metier?.toLowerCase().includes('cadre')).length;
                const cadres = personnel.length - ouvriers;
                if (document.getElementById('personnel-stat-ouvriers')) document.getElementById('personnel-stat-ouvriers').textContent = ouvriers;
                if (document.getElementById('personnel-stat-cadres')) document.getElementById('personnel-stat-cadres').textContent = cadres;
            }
        } catch(_) {}

        // Proformat stats
        try {
            const { data: devis } = await db.from('devis').select('statut, date');
            if (devis) {
                const mois = new Date().getMonth() + 1;
                const ceMois = devis.filter(d => d.date && new Date(d.date).getMonth() + 1 === mois);
                const convertis = devis.filter(d => d.statut === 'FACTURE');
                const attente = devis.filter(d => d.statut === 'BROUILLON' || d.statut === 'ENVOYE');
                if (document.getElementById('proformat-stat-mois')) document.getElementById('proformat-stat-mois').textContent = ceMois.length;
                if (document.getElementById('proformat-stat-convertis')) document.getElementById('proformat-stat-convertis').textContent = convertis.length;
                if (document.getElementById('proformat-stat-attente')) document.getElementById('proformat-stat-attente').textContent = attente.length;
            }
        } catch(_) {}

        loadRevenueChart();
        loadProjectChart();
    } catch(e) { console.error('updateDashboardStats:', e); }
}

// ============================================================
// CHARTS — depuis Supabase
// ============================================================
async function loadRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();

    // Calculer directement depuis la table journal (pas besoin de vue SQL)
    const annee = new Date().getFullYear();
    const { data } = await db.from('journal').select('date, montant').gte('date', `${annee}-01-01`);
    const byMonth = {};
    (data || []).forEach(r => {
        const m = new Date(r.date).toLocaleDateString('fr-FR', { month: 'short' });
        byMonth[m] = (byMonth[m] || 0) + (r.montant || 0);
    });

    if (!Object.keys(byMonth).length) {
        // graphique vide par défaut
        byMonth['Aucune donnée'] = 0;
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(byMonth),
            datasets: [{ label: 'Dépenses (Ar)', data: Object.values(byMonth),
                borderColor: '#E8631A', backgroundColor: 'rgba(232,99,26,0.1)', fill: true, tension: 0.4 }]
        },
        options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
    });
}

async function loadProjectChart() {
    const ctx = document.getElementById('projectChart');
    if (!ctx) return;
    const existing = Chart.getChart(ctx);
    if (existing) existing.destroy();

    const { data } = await db.from('chantiers').select('statut');
    const counts = { 'EN COURS': 0, 'TERMINE': 0, 'EN PAUSE': 0 };
    (data || []).forEach(r => { counts[r.statut] = (counts[r.statut] || 0) + 1; });

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{ data: Object.values(counts), backgroundColor: ['#0066cc','#28a745','#ffc107'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function initializeCharts() {
    loadRevenueChart();
    loadProjectChart();
}

// ============================================================
// LOAD ALL — appelé par supabase.js après connexion réussie
// ============================================================
async function chargerEmployesDatalistIndex() {
    const { data } = await db.from('personnel').select('nom').eq('actif', true).order('nom');
    if (!data) return;
    const dl = document.getElementById('manuel-employes-list');
    if (dl) {
        dl.innerHTML = data.map(emp => `<option value="${emp.nom}">`).join('');
    }
    const dlChantier = document.getElementById('manuel-chantier');
    if (dlChantier) {
        const { data: chantiers } = await db.from('chantiers').select('nom').order('nom');
        if (chantiers) {
            const first = dlChantier.options[0];
            dlChantier.innerHTML = '';
            if (first) dlChantier.appendChild(first);
            chantiers.forEach(c => {
                const opt = document.createElement('option');
                opt.value = opt.textContent = c.nom;
                dlChantier.appendChild(opt);
            });
        }
    }
}

async function loadAllData() {
    await Promise.all([
        loadProjetsTable(),
        loadAchatsTable(),
        loadJournalTable(),
        loadPersonnelTable(),
        loadLogistiqueTable(),
        loadPointageTable(),
        updateDashboardStats(),
        chargerEmployesDatalistIndex(),
    ]);
}

// ============================================================
// CHANTIERS SELECT — pour les formulaires
// ============================================================
async function loadChantiers() {
    const { data } = await db.from('chantiers').select('id, nom').order('nom');
    if (!data) return;
    document.querySelectorAll('select[id*="chantier"], select[name*="chantier"]').forEach(sel => {
        const first = sel.options[0];
        sel.innerHTML = '';
        if (first) sel.appendChild(first);
        data.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.nom;
            opt.textContent = c.nom;
            sel.appendChild(opt);
        });
    });
}

// ============================================================
// QR CODE / POINTAGE
// ============================================================
let html5QrCode;
let scannedEmployee = null;

function initializeQRScanner() {
    const qrReader = document.getElementById('qr-reader');
    if (!qrReader) return;
    html5QrCode = new Html5Qrcode("qr-reader");
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleQRScan(decodedText),
        () => {}
    ).catch(err => console.error('Scanner:', err));
}

function handleQRScan(decodedText) {
    try {
        const emp = JSON.parse(decodedText);
        scannedEmployee = emp;
        document.getElementById('qr-result').style.display = 'block';
        document.getElementById('qr-result-text').textContent = `Employé: ${emp.nom}`;
        document.getElementById('pointage-form').style.display = 'block';
        loadChantiers();
        showNotification('QR Code scanné ✓', 'success');
        if (html5QrCode) html5QrCode.stop();
    } catch { showNotification('QR Code invalide', 'error'); }
}

async function enregistrerPointage() {
    if (!scannedEmployee) { showNotification('Scannez un QR code d\'abord', 'error'); return; }
    const chantier = document.getElementById('chantier-select')?.value;
    if (!chantier) { showNotification('Sélectionnez un chantier', 'error'); return; }

    const { data: emp } = await db.from('personnel').select('id, salaire_journalier').eq('id', scannedEmployee.id).maybeSingle();
    const salaire = emp?.salaire_journalier || 0;

    const semaine = new Date();
    semaine.setDate(semaine.getDate() - semaine.getDay() + 1); // lundi

    const { error } = await db.from('pointage_attendance').insert({
        date:         semaine.toISOString().split('T')[0],
        chantier:           chantier,
        nom_employe:        scannedEmployee.nom,
        employe_id:         emp?.id || null,
        type_pointage:      'Arrivée',
        salaire_journalier: salaire,
        statut:             'present'
    });
    if (error) { showNotification('Erreur enregistrement', 'error'); return; }

    document.getElementById('qr-result').style.display = 'none';
    document.getElementById('pointage-form').style.display = 'none';
    scannedEmployee = null;
    loadPointageTable();
    if (html5QrCode) initializeQRScanner();
    showNotification('Pointage enregistré ✓', 'success');
}

async function enregistrerPointageManuel() {
    const nom = document.getElementById('manuel-nom')?.value;
    const chantier = document.getElementById('manuel-chantier')?.value;
    const date = document.getElementById('manuel-date')?.value;
    const type = document.getElementById('manuel-type')?.value;
    if (!nom) { showNotification('Saisissez un nom d\'employé', 'error'); return; }
    if (!chantier) { showNotification('Sélectionnez un chantier', 'error'); return; }
    if (!date) { showNotification('Sélectionnez une date', 'error'); return; }

    const { data: emp } = await db.from('personnel').select('id, salaire_journalier').eq('nom', nom).maybeSingle();
    const { error } = await db.from('pointage_attendance').insert({
        date: date,
        chantier: chantier,
        nom_employe: nom,
        employe_id: emp?.id || null,
        type_pointage: type === 'arrivee' ? 'Arrivée' : 'Départ',
        salaire_journalier: emp?.salaire_journalier || 0,
        statut: 'present'
    });
    if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }

    document.getElementById('manuel-nom').value = '';
    document.getElementById('manuel-date').value = '';
    loadPointageTable();
    showNotification('Pointage manuel enregistré ✓', 'success');
}

async function generateAllQRCodes() {
    const { data, error } = await db.from('personnel').select('*').eq('actif', true).order('nom');
    if (error) { showNotification('Erreur', 'error'); return; }

    const container = document.getElementById('qr-codes-container');
    if (!container) return;
    container.innerHTML = '';

    data.forEach(emp => {
        const div = document.createElement('div');
        div.style.cssText = 'text-align:center;padding:10px;border:1px solid #ddd;border-radius:5px;';
        const canvas = document.createElement('canvas');
        canvas.id = `qr-${emp.id}`;
        div.appendChild(canvas);
        div.innerHTML += `<p style="font-size:12px;font-weight:bold;margin-top:5px">${emp.nom}</p>
                          <p style="font-size:10px;color:#666">${emp.metier || ''}</p>`;
        container.appendChild(div);
        QRCode.toCanvas(canvas, JSON.stringify({
            id: emp.id, nom: emp.nom
        }), { width: 120, margin: 2, color: { dark: '#1C2B3A', light: '#ffffff' } });
    });
    showNotification(`${data.length} QR Codes générés ✓`, 'success');
}

// ============================================================
// FORMULAIRES — soumission vers Supabase
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Projet
    const formProjet = document.getElementById('form-projet');
    if (formProjet) formProjet.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const { error } = await db.from('chantiers').insert({
            nom:         fd.get('nom'),
            client:      fd.get('client'),
            budget:      parseFloat(fd.get('budget')) || 0,
            debut:       fd.get('debut') || null,
            fin:         fd.get('fin') || null,
            code:        'PRJ-' + Date.now().toString(36).toUpperCase(),
            progression: 0,
            statut:      'EN COURS',
            actif:       true,
        });
        if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }
        loadProjetsTable();
        updateDashboardStats();
        closeModal('modal-projet');
        this.reset();
        showNotification('Projet créé ✓', 'success');
    });

    // Achat
    const formAchat = document.getElementById('form-achat');
    if (formAchat) formAchat.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const pu = parseFloat(fd.get('prix_unitaire')) || 0;
        const qte = parseFloat(fd.get('quantite')) || 1;
        const total = pu * qte;
        const { error } = await db.from('commandes').insert({
            date:          fd.get('date') || new Date().toISOString().split('T')[0],
            chantier:      fd.get('chantier') || null,
            libelle:       fd.get('libelle'),
            quantite:      qte,
            prix_unitaire: pu,
            prix:          total,
            fournisseur:   fd.get('fournisseur'),
            mode_paiement: fd.get('mode_paiement') || null,
            statut:        'EN ATTENTE',
        });
        if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }
        loadAchatsTable();
        closeModal('modal-achat');
        this.reset();
        showNotification('Achat enregistré ✓', 'success');
    });

    // Employé
    const formEmploye = document.getElementById('form-employe');
    if (formEmploye) formEmploye.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const salaire = parseFloat(fd.get('salaire')) || 0;
        const { error } = await db.from('personnel').insert({
            nom:                fd.get('nom') + (fd.get('prenom') ? ' ' + fd.get('prenom') : ''),
            metier:             fd.get('poste') || fd.get('metier'),
            chantier:           fd.get('chantier') || fd.get('departement') || null,
            salaire_journalier: salaire,
            type_salaire:       fd.get('type_salaire') || 'JOURNALIER',
            date_embauche:      fd.get('date_embauche') || null,
            actif:              true,
        });
        if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }
        loadPersonnelTable();
        updateDashboardStats();
        closeModal('modal-employe');
        this.reset();
        showNotification('Employé ajouté ✓', 'success');
    });

    // Devis (local + Supabase)
    const formDevis = document.getElementById('form-devis');
    if (formDevis) formDevis.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const devis = Object.fromEntries(fd.entries());
        devis.id = 'DEV-' + Date.now();
        devis.date = new Date().toISOString();
        const liste = JSON.parse(localStorage.getItem('nysoa_devis') || '[]');
        liste.push(devis);
        localStorage.setItem('nysoa_devis', JSON.stringify(liste));
        // Sync Supabase
        try {
            await db.from('devis').insert({
                numero: devis.id,
                date: new Date().toISOString().split('T')[0],
                client: devis.client,
                objet: devis.projet + ' — ' + (devis.description || ''),
                total: parseFloat(devis.montant) || 0,
                statut: 'BROUILLON',
            });
        } catch (_) { /* offline — données sauvegardées en local */ }
        closeModal('modal-devis');
        this.reset();
        showNotification('Devis créé ✓', 'success');
    });

    // Proformat (local + Supabase)
    const formProformat = document.getElementById('form-proformat');
    if (formProformat) formProformat.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const pf = Object.fromEntries(fd.entries());
        pf.id = 'PF-' + Date.now();
        pf.date = new Date().toISOString();
        const liste = JSON.parse(localStorage.getItem('nysoa_proformats') || '[]');
        liste.push(pf);
        localStorage.setItem('nysoa_proformats', JSON.stringify(liste));
        try {
            await db.from('devis').insert({
                numero: pf.id,
                date: fd.get('date') || new Date().toISOString().split('T')[0],
                client: pf.client,
                objet: pf.projet + ' — ' + (pf.description || ''),
                total: parseFloat(pf.montant) || 0,
                statut: 'PROFORMAT',
            });
        } catch (_) { /* offline */ }
        closeModal('modal-proformat');
        this.reset();
        showNotification('Proformat créé ✓', 'success');
    });
});

// ============================================================
// EXPORT EXCEL
// ============================================================
function exportTableToExcel(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    showNotification('Export Excel réussi ✓', 'success');
}

function exportTableToPDF(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(filename, 14, 20);
    let y = 30;
    table.querySelectorAll('tr').forEach((row, ri) => {
        let x = 14;
        row.querySelectorAll('th,td').forEach(cell => {
            doc.setFontSize(ri === 0 ? 10 : 9);
            doc.text(cell.textContent.trim().substring(0,20), x, y);
            x += 35;
        });
        y += 8;
        if (y > 280) { doc.addPage(); y = 20; }
    });
    doc.save(`${filename}.pdf`);
    showNotification('Export PDF réussi ✓', 'success');
}

async function exportPointage() {
    const { data, error } = await db.from('pointage').select('*').order('date');
    if (error || !data.length) { showNotification('Aucun pointage', 'warning'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
        'Semaine du': r.date, 'Chantier': r.chantier, 'Employé': r.nom_employe,
        'Nb jours': r.nb_jours, 'Salaire/jour': r.salaire_journalier,
        'Total avances': r.total_avances, 'À payer': r.a_payer
    })));
    XLSX.utils.book_append_sheet(wb, ws, 'Pointage');
    XLSX.writeFile(wb, `pointage_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export pointage ✓', 'success');
}

// ============================================================
// MODALS & NAVIGATION
// ============================================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    // Charger les chantiers dans les selects du modal
    loadChantiers();
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

document.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) { e.target.classList.remove('active'); document.body.style.overflow = 'auto'; }
});

// Fermer avec Escape
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => {
            m.classList.remove('active'); document.body.style.overflow = 'auto';
        });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') { e.preventDefault(); window.print(); }
});

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', e => {
        const href = item.getAttribute('href');
        if (href && href !== '#') return; // laisser naviguer les liens externes
        e.preventDefault();
        const sectionId = item.getAttribute('data-section');
        // BUG-19 FIX: mémoriser si cette section était déjà active avant le clic
        const wasAlreadyActive = item.classList.contains('active');
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        sections.forEach(s => {
            s.classList.remove('active');
            if (s.id === sectionId) s.classList.add('active');
        });
        pageTitle.textContent = sectionTitles[sectionId] || 'Tableau de bord';
        if (!wasAlreadyActive) {
            if (sectionId === 'pointage')  setTimeout(initializeQRScanner, 500);
            if (sectionId === 'antoka')    setTimeout(loadAntoka, 100);
            if (sectionId === 'credits')   setTimeout(loadCredits, 100);
            if (sectionId === 'caisse')    setTimeout(loadCaisse, 100);
            if (sectionId === 'catalogue') setTimeout(loadCatalogue, 100);
            if (sectionId === 'contrats')  setTimeout(loadContrats, 100);
        }
    });
});

// Date
function updateDate() {
    const el = document.getElementById('current-date');
    if (el) el.textContent = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}
updateDate();

// Recherche globale
const searchBox = document.querySelector('.search-box input');
if (searchBox) searchBox.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    const activeSection = document.querySelector('.section.active');
    if (activeSection) {
        activeSection.querySelectorAll('tbody tr').forEach(row => {
            row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
        });
    }
});

// Filtres
document.querySelectorAll('.filter-select').forEach(select => {
    select.addEventListener('change', function() {
        const val = this.value;
        const table = this.closest('.card')?.querySelector('table tbody');
        if (!table) return;
        table.querySelectorAll('tr').forEach(row => {
            if (!val) { row.style.display = ''; return; }
            const status = row.querySelector('.status');
            row.style.display = status && status.textContent.toLowerCase().includes(val.replace('_',' ')) ? '' : 'none';
        });
    });
});

// Fonctions utilitaires UI
function viewRow(button) {
    const cells = button.closest('tr').querySelectorAll('td');
    const headers = button.closest('table').querySelectorAll('th');
    let html = '<table style="width:100%;border-collapse:collapse">';
    cells.forEach((c, i) => {
        if (i < cells.length - 1) {
            const label = headers[i] ? headers[i].textContent.trim() : `Colonne ${i + 1}`;
            html += `<tr><td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;width:40%">${label}</td><td style="padding:8px;border-bottom:1px solid #ddd">${c.textContent.trim()}</td></tr>`;
        }
    });
    html += '</table>';
    const modal = document.getElementById('modal-view') || (() => {
        const m = document.createElement('div');
        m.id = 'modal-view';
        m.className = 'modal';
        m.style.cssText = 'display:flex;position:fixed;z-index:9999;left:0;top:0;width:100%;height:100%;background:rgba(0,0,0,0.5);align-items:center;justify-content:center';
        m.innerHTML = '<div class="modal-content" style="background:white;border-radius:12px;padding:25px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto"><span class="close" style="float:right;font-size:24px;cursor:pointer">&times;</span><h2 style="margin-bottom:20px">Détails</h2><div id="view-details"></div></div>';
        document.body.appendChild(m);
        m.querySelector('.close').onclick = () => { m.style.display = 'none'; };
        m.onclick = (e) => { if (e.target === m) m.style.display = 'none'; };
        return m;
    })();
    modal.querySelector('#view-details').innerHTML = html;
    modal.style.display = 'flex';
}

function printRow(button) {
    const row = button.closest('tr');
    const headers = button.closest('table').querySelectorAll('th');
    const cells = row.querySelectorAll('td');
    let content = '<table border="1" style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">';
    content += '<thead><tr>';
    headers.forEach(h => { if (h.textContent.trim() !== 'Actions') content += `<th style="padding:10px;background:#1C2B3A;color:white;text-align:left">${h.textContent.trim()}</th>`; });
    content += '</tr></thead><tbody><tr>';
    cells.forEach((c, i) => {
        if (i < cells.length - 1) content += `<td style="padding:10px;border:1px solid #ddd">${c.textContent.trim()}</td>`;
    });
    content += '</tr></tbody></table>';
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Impression</title><style>body{font-family:Arial,sans-serif;padding:40px}h2{color:#1C2B3A;margin-bottom:20px}@media print{body{padding:20px}}</style></head><body><h2>NySoa BTP — Détail</h2>${content}<script>setTimeout(function(){window.print();window.close();},500);<\/script></body></html>`);
    w.document.close();
}

function exportChart(canvasId, format) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) { showNotification("Graphique introuvable — ouvrez d'abord la section concernée", 'warning'); return; }
    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) { showNotification('jsPDF non chargé', 'error'); return; }
        const doc = new jsPDF();
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 190, 100);
        doc.save(`${canvasId}.pdf`);
    } else if (format === 'excel') {
        const chart = Chart.getChart(canvas);
        if (!chart) { showNotification('Graphique non initialisé — cliquez sur la section du graphique puis réessayez', 'warning'); return; }
        const data = chart.data;
        const headers = ['Libellé', ...data.datasets.map(d => d.label)];
        const rows = data.labels.map((label, i) => [label, ...data.datasets.map(d => d.data[i])]);
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Données');
        XLSX.writeFile(wb, `${canvasId}.xlsx`);
    }
    showNotification('Graphique exporté ✓', 'success');
}

function resetAllData() {
    if (!confirm('Réinitialiser toutes les données ? Cette action est irréversible.')) return;
    loadAllData();
    showNotification('Données rechargées depuis Supabase', 'info');
}

function printSection() { window.print(); }

// Mobile sidebar
function addMobileMenuButton() {
    if (window.innerWidth <= 768 && !document.querySelector('.mobile-menu-btn')) {
        const header = document.querySelector('.header');
        if (!header) return;
        const btn = document.createElement('button');
        btn.className = 'mobile-menu-btn';
        btn.innerHTML = '<i class="fas fa-bars"></i>';
        btn.style.cssText = 'background:#0066cc;border:none;font-size:1.5rem;cursor:pointer;color:white;margin-right:15px;padding:8px 12px;border-radius:8px;';
        btn.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) sidebar.style.transform = sidebar.style.transform === 'translateX(0px)' ? 'translateX(-100%)' : 'translateX(0px)';
        });
        header.querySelector('.header-left')?.prepend(btn);
    }
}
window.addEventListener('resize', addMobileMenuButton);
addMobileMenuButton();

// ============================================================
// DÉMARRAGE — supabase.js appelle initSupabase() qui charge tout
// Si supabase.js n'est pas disponible, on ne fait rien
// ============================================================
console.log('NySoa Construct ERP — script.js chargé ✓');

// ── Soumission formulaire Journal ─────────────────────────────
async function submitJournalForm(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addJournalEntry({
        date:          fd.get('date'),
        chantier:      fd.get('chantier'),
        designation:   fd.get('designation'),
        montant:       fd.get('montant'),
        mode_paiement: fd.get('mode_paiement'),
        categorie:     fd.get('categorie'),
        travaux:       fd.get('travaux'),
    });
    closeModal('modal-journal');
    e.target.reset();
    // Réinitialiser les filtres pour que la nouvelle écriture soit visible
    const dateFilter = document.getElementById('journal-date-filter');
    const typeFilter = document.getElementById('journal-type-filter');
    if (dateFilter) dateFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    // Réinitialiser aussi le filtre chantier global si actif
    if (typeof currentChantierFilter !== 'undefined') {
        const cfSelect = document.getElementById('cf-select-journal');
        if (cfSelect) cfSelect.value = '';
        if (typeof clearGlobalChantierFilter === 'function') clearGlobalChantierFilter();
    }
}

// ── Remplir le select chantier du modal journal ────────────────
async function populateJournalChantiersSelect() {
    const sel = document.getElementById('journal-chantier-select');
    if (!sel) return;
    const { data } = await db.from('chantiers').select('nom').order('nom');
    (data || []).forEach(c => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = c.nom;
        sel.appendChild(opt);
    });
}
// Appeler au démarrage
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(populateJournalChantiersSelect, 1500);
});

// ============================================================
// FONCTIONS MANQUANTES — ajoutées lors de l'audit
// ============================================================

// ── Navigation / UI ──────────────────────────────────────────
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

// logout() est défini dans supabase.js (centralisé avec db.auth.signOut)
// Cette déclaration locale est supprimée pour éviter le doublon.

// ── Actions sur les lignes de tableau ────────────────────────
function deleteRow(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    if (!confirm('Supprimer cette ligne ?')) return;
    const id = row.dataset.id;
    const table = row.dataset.table;
    if (id && table) {
        db.from(table).delete().eq('id', id).then(({ error }) => {
            if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }
            row.remove();
            showNotification('Ligne supprimée ✓', 'success');
        });
    } else {
        row.remove();
    }
}

function editRow(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td:not(:last-child)');
    cells.forEach(cell => {
        if (!cell.querySelector('input')) {
            const val = cell.textContent.trim();
            cell.innerHTML = `<input class="inline-edit" value="${val.replace(/"/g, '&quot;')}" style="width:100%;border:1px solid #0066cc;border-radius:3px;padding:2px 4px;">`;
        }
    });
    btn.innerHTML = '<i class="fas fa-save"></i>';
    btn.onclick = function() { saveRow(this); };
}

function saveRow(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const id = row.dataset.id;
    const table = row.dataset.table;
    const updates = {};
    row.querySelectorAll('.inline-edit').forEach((input, idx) => {
        const val = input.value;
        input.parentElement.textContent = val;
        const key = `col_${idx}`;
        updates[key] = val;
    });
    btn.innerHTML = '<i class="fas fa-edit"></i>';
    btn.onclick = function() { editRow(this); };
    if (id && table) {
        const headers = row.closest('table').querySelectorAll('th');
        const payload = {};
        let colIdx = 0;
        row.querySelectorAll('td:not(:last-child)').forEach((td, i) => {
            const label = headers[i]?.textContent.trim().toLowerCase().replace(/[^a-z_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || `col_${i}`;
            payload[label] = td.textContent.trim();
        });
        db.from(table).update(payload).eq('id', id).then(({ error }) => {
            if (error) showNotification('Erreur: ' + error.message, 'error');
            else showNotification('Ligne mise à jour ✓', 'success');
        });
    } else {
        showNotification('Ligne mise à jour (local)', 'success');
    }
}

// ── Devis / Proformat ─────────────────────────────────────────
async function convertToProformat(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    const client  = cells[1]?.textContent || '';
    const projet  = cells[2]?.textContent || '';
    const montant = cells[3]?.textContent || '';
    const id = row.dataset.id;
    if (id) {
        const { error } = await db.from('devis').update({ statut: 'ENVOYE' }).eq('id', id);
        if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }
    }
    showNotification(`Proformat créé pour ${client} — ${projet} (${montant})`, 'success');
}

async function convertToFacture(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    const client  = cells[1]?.textContent || '';
    const montant = cells[3]?.textContent || '';
    const id = row.dataset.id;
    if (id) {
        const { error } = await db.from('devis').update({ statut: 'FACTURE' }).eq('id', id);
        if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }
    }
    showNotification(`Facture créée pour ${client} (${montant})`, 'success');
}

// ── Salaires ──────────────────────────────────────────────────
async function calculateSalaries() {
    const { data: pointages, error } = await db
        .from('pointage')
        .select('*')
        .order('nom_employe');

    if (error) { showNotification('Erreur chargement pointage', 'error'); return; }

    const bodyJ = document.getElementById('salaires-journaliers-body');
    const bodyM = document.getElementById('salaires-mensuels-body');
    if (bodyJ) bodyJ.innerHTML = '';
    if (bodyM) bodyM.innerHTML = '';

    // Grouper par employé
    const byEmp = {};
    pointages.forEach(p => {
        if (!byEmp[p.nom_employe]) byEmp[p.nom_employe] = { jours: 0, salaire_j: p.salaire_journalier, avances: 0, a_payer: 0 };
        byEmp[p.nom_employe].jours    += p.nb_jours || 0;
        byEmp[p.nom_employe].avances  += p.total_avances || 0;
        byEmp[p.nom_employe].a_payer  += p.a_payer || 0;
    });

    // Récupérer le personnel pour distinguer journalier/mensuel
    const { data: personnel } = await db.from('personnel').select('nom, type_salaire, salaire_journalier').eq('actif', true);
    const empMap = {};
    (personnel || []).forEach(p => { empMap[p.nom] = p; });

    Object.entries(byEmp).forEach(([nom, data]) => {
        const emp = empMap[nom] || {};
        const total = data.jours * (data.salaire_j || 0);
        const avances = data.avances || 0;
        const net = Math.max(0, total - avances);
        const isMensuel = emp.type_salaire === 'MENSUEL';
        const empData = { nom, jours: data.jours, taux: data.salaire_j, total, avances, net, type: isMensuel ? 'Mensuel' : 'Journalier' };

        const tr = document.createElement('tr');
        if (isMensuel && bodyM) {
            tr.innerHTML = `
                <td>${nom}</td>
                <td>${data.jours}</td>
                <td>${formatAriary(emp.salaire_journalier || 0)}</td>
                <td>${formatAriary(total)}</td>
                <td class="montant" style="color:var(--red)">${formatAriary(avances)}</td>
                <td class="montant" style="font-weight:700;color:var(--green)">${formatAriary(net)}</td>
                <td><button class="btn-small" onclick='showPayslipModal(${JSON.stringify(empData).replace(/'/g, "\\'")})'><i class="fas fa-file-invoice"></i> Fiche</button></td>`;
            bodyM.appendChild(tr);
        } else if (bodyJ) {
            tr.innerHTML = `
                <td>${nom}</td>
                <td>${data.jours}</td>
                <td>${formatAriary(data.salaire_j)}</td>
                <td>${formatAriary(total)}</td>
                <td class="montant" style="color:var(--red)">${formatAriary(avances)}</td>
                <td class="montant" style="font-weight:700;color:var(--green)">${formatAriary(net)}</td>
                <td><button class="btn-small" onclick='showPayslipModal(${JSON.stringify(empData).replace(/'/g, "\\'")})'><i class="fas fa-file-invoice"></i> Fiche</button></td>`;
            bodyJ.appendChild(tr);
        }
    });

    showNotification('Salaires calculés ✓', 'success');
}

async function exportSalaires() {
    const bodyJ = document.getElementById('salaires-journaliers-body');
    const bodyM = document.getElementById('salaires-mensuels-body');
    const wb = XLSX.utils.book_new();

    if (bodyJ) {
        const wsJ = XLSX.utils.table_to_sheet(bodyJ.closest('table'));
        XLSX.utils.book_append_sheet(wb, wsJ, 'Journaliers');
    }
    if (bodyM) {
        const wsM = XLSX.utils.table_to_sheet(bodyM.closest('table'));
        XLSX.utils.book_append_sheet(wb, wsM, 'Mensuels');
    }
    XLSX.writeFile(wb, `SALAIRES_NYSOA_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export salaires Excel ✓', 'success');
}

// ── Fiche de Paie ─────────────────────────────────────────────
function showPayslipModal(emp) {
    const body = document.getElementById('payslip-modal-body');
    if (!body) return;

    const primes = Math.round(emp.total * 0.05);
    const heuresSup = Math.round(emp.taux * 0.5 * Math.min(emp.jours, 4));
    const cnaps = Math.round(emp.total * 0.01);
    const ostie = Math.round(emp.total * 0.005);
    const retenues = Math.round(emp.total * 0.02);
    const deductions = emp.avances + cnaps + ostie + retenues;
    const netFinal = Math.max(0, emp.total + primes + heuresSup - deductions);

    const dateStr = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });

    body.innerHTML = `
        <div class="payslip">
            <div class="payslip-header">
                <h3>NySoa BTP — Fiche de Paie</h3>
                <p>${dateStr} · ${emp.type}</p>
            </div>
            <div class="payslip-body">
                <div style="display:flex;justify-content:space-between;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #1C2B3A">
                    <div><strong style="font-size:1rem">${emp.nom}</strong></div>
                    <div style="text-align:right;font-size:0.8rem;color:var(--text-muted)">
                        Jours travaillés: <strong>${emp.jours}</strong><br>
                        Taux: <strong>${formatAriary(emp.taux)}</strong>
                    </div>
                </div>

                <div class="payslip-section">
                    <h4>Revenus</h4>
                    <div class="payslip-row"><span class="label">Salaire de base</span><span class="value payslip-earning">${formatAriary(emp.total)}</span></div>
                    <div class="payslip-row"><span class="label">Heures supplémentaires</span><span class="value payslip-earning">${formatAriary(heuresSup)}</span></div>
                    <div class="payslip-row"><span class="label">Primes</span><span class="value payslip-earning">${formatAriary(primes)}</span></div>
                    <div class="payslip-row" style="border-top:1px solid var(--border);padding-top:6px;margin-top:4px">
                        <span class="label" style="font-weight:700">Total revenus</span>
                        <span class="value" style="font-weight:700;color:var(--green)">${formatAriary(emp.total + primes + heuresSup)}</span>
                    </div>
                </div>

                <div class="payslip-section">
                    <h4>Déductions</h4>
                    <div class="payslip-row"><span class="label">Avances</span><span class="value payslip-deduction">-${formatAriary(emp.avances)}</span></div>
                    <div class="payslip-row"><span class="label">Retenues</span><span class="value payslip-deduction">-${formatAriary(retenues)}</span></div>
                    <div class="payslip-row"><span class="label">CNaPS (1%)</span><span class="value payslip-deduction">-${formatAriary(cnaps)}</span></div>
                    <div class="payslip-row"><span class="label">OSTIE (0.5%)</span><span class="value payslip-deduction">-${formatAriary(ostie)}</span></div>
                    <div class="payslip-row" style="border-top:1px solid var(--border);padding-top:6px;margin-top:4px">
                        <span class="label" style="font-weight:700">Total déductions</span>
                        <span class="value" style="font-weight:700;color:var(--red)">-${formatAriary(deductions)}</span>
                    </div>
                </div>
            </div>
            <div class="payslip-total">
                <span class="label">NET À PAYER</span>
                <span class="value">${formatAriary(netFinal)}</span>
            </div>
        </div>
        <div style="text-align:center;margin-top:16px">
            <button class="btn btn-secondary" onclick="exportPayslipPDF(${JSON.stringify(emp).replace(/'/g, "\\'")})">
                <i class="fas fa-file-pdf"></i> Exporter PDF
            </button>
            <button class="btn btn-secondary" onclick="closeModal('modal-payslip')" style="margin-left:8px">
                Fermer
            </button>
        </div>`;

    openModal('modal-payslip');
}

function exportPayslipPDF(emp) {
    const primes = Math.round(emp.total * 0.05);
    const heuresSup = Math.round(emp.taux * 0.5 * Math.min(emp.jours, 4));
    const cnaps = Math.round(emp.total * 0.01);
    const ostie = Math.round(emp.total * 0.005);
    const retenues = Math.round(emp.total * 0.02);
    const totalRevenus = emp.total + primes + heuresSup;
    const deductions = emp.avances + cnaps + ostie + retenues;
    const netFinal = Math.max(0, totalRevenus - deductions);
    const dateStr = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    const left = 20, right = 190;
    const l = (txt) => { doc.text(txt, left, y); y += 7; };
    const sep = () => { y += 3; };

    doc.setFontSize(16);
    doc.text('NySoa BTP — Fiche de Paie', left, y); y += 10;
    doc.setFontSize(10);
    doc.text(dateStr + ' · ' + (emp.type || 'JOURNALIER'), left, y); y += 4;
    doc.setFontSize(8);
    doc.text('Lot 0708 k Ambohimena Antsirabe · +261 34 99 498 49', left, y); y += 10;

    doc.setDrawColor(28, 43, 58);
    doc.line(left, y, right, y); y += 3;
    doc.setFontSize(12);
    doc.text(emp.nom, left, y);
    doc.setFontSize(10);
    doc.text('Jours: ' + emp.jours + '  Taux: ' + formatAriary(emp.taux), right - 40, y, { align: 'right' });
    y += 10;

    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    l('REVENUS');
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    l('Salaire de base           ' + formatAriary(emp.total));
    l('Heures supplémentaires    ' + formatAriary(heuresSup));
    l('Primes (5%)               ' + formatAriary(primes));
    doc.setFont(undefined, 'bold');
    l('Total revenus             ' + formatAriary(totalRevenus));
    doc.setFont(undefined, 'normal');
    sep();

    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    l('DEDUCTIONS');
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    l('Avances                   -' + formatAriary(emp.avances));
    l('Retenues (2%)              -' + formatAriary(retenues));
    l('CNaPS (1%)                 -' + formatAriary(cnaps));
    l('OSTIE (0.5%)               -' + formatAriary(ostie));
    doc.setFont(undefined, 'bold');
    l('Total déductions           -' + formatAriary(deductions));
    doc.setFont(undefined, 'normal');
    sep();

    doc.setDrawColor(28, 43, 58);
    doc.line(left, y, right, y); y += 3;
    doc.setFontSize(14); doc.setFont(undefined, 'bold');
    l('NET À PAYER               ' + formatAriary(netFinal));
    doc.setFont(undefined, 'normal');
    sep();

    doc.setFontSize(8); doc.setTextColor(128);
    l('Généré le ' + new Date().toLocaleString('fr-FR'));
    doc.setTextColor(0);

    doc.save('paie_' + emp.nom.replace(/[^a-zA-Z0-9]/g,'_') + '.pdf');
    showNotification('PDF exporté ✓', 'success');
}

console.log('[NYSOA BTP] Toutes les fonctions chargées ✓');

// ── Remplir dynamiquement tous les selects chantier depuis Supabase ──
async function populateAllChantiersSelects() {
    const { data, error } = await db.from('chantiers').select('nom').order('nom');
    if (error || !data) return;
    const noms = data.map(c => c.nom);

    // Tous les selects qui doivent lister les chantiers
    const selectIds = [
        'journal-chantier-select',
        'mouvement-chantier-select',
        'chantier-select'
    ];
    const selectNames = ['chantier'];

    selectIds.forEach(id => {
        const sel = document.getElementById(id);
        if (!sel) return;
        // Garder la première option
        const first = sel.options[0];
        sel.innerHTML = '';
        sel.appendChild(first);
        noms.forEach(nom => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = nom;
            sel.appendChild(opt);
        });
    });

    // Aussi les selects par name="chantier" dans les formulaires
    document.querySelectorAll('select[name="chantier"]').forEach(sel => {
        const first = sel.options[0];
        sel.innerHTML = '';
        if (first) sel.appendChild(first);
        noms.forEach(nom => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = nom;
            sel.appendChild(opt);
        });
    });
}

// ── Charger les détails complets d'un chantier ──────────────────
async function loadProjetDetails(id) {
    const { data, error } = await db.from('chantiers').select('*').eq('id', id).single();
    if (error || !data) return;
    // Afficher dans une alert formatée (ou modal si disponible)
    alert(`CHANTIER : ${data.nom}\nCode : ${data.code || '—'}\nClient : ${data.client || '—'}\nBudget : ${data.budget ? data.budget.toLocaleString('fr-FR') + ' Ar' : '—'}\nDébut : ${data.debut || '—'}\nFin prévue : ${data.fin || '—'}\nProgression : ${data.progression || 0}%\nStatut : ${data.statut}`);
}

// ── Fonctions de filtrage pour les tables ───────────────────────
function filtrerTableParStatut(tableId, statut, statutColIndex) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        if (!statut) { row.style.display = ''; return; }
        const cell = row.cells[statutColIndex];
        if (!cell) return;
        const text = cell.textContent.toLowerCase();
        const match = text.includes(statut.toLowerCase()) || 
                     (statut === 'en_cours' && text.includes('en cours')) ||
                     (statut === 'termine' && text.includes('terminé'));
        row.style.display = match ? '' : 'none';
    });
}

// BUG-01 FIX: les deux filtres opèrent en AND via applyJournalFilters()
function _getJournalFilterDate() {
    const el = document.getElementById('journal-filter-date') || document.querySelector('[onchange*="filtrerJournalDate"]');
    return el ? el.value : '';
}
function _getJournalFilterType() {
    const el = document.getElementById('journal-filter-type') || document.querySelector('[onchange*="filtrerJournalType"]');
    return el ? el.value : '';
}

function applyJournalFilters() {
    const table = document.getElementById('journal-table');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');

    const dateValue = _getJournalFilterDate();
    let filterFormatted = '';
    if (dateValue) {
        const [y, m, d] = dateValue.split('-');
        filterFormatted = `${d}/${m}/${y}`;
    }

    const typeValue = _getJournalFilterType();

    rows.forEach(row => {
        let showByDate = true;
        let showByType = true;

        if (filterFormatted) {
            const cell = row.cells[0];
            const raw = cell ? cell.textContent.trim() : '';
            // BUG-17 FIX: normaliser la date cellule dd/mm/yyyy même si format court (1/6/2026)
            const parts = raw.split('/');
            const cellDate = parts.length === 3
                ? `${parts[0].padStart(2,'0')}/${parts[1].padStart(2,'0')}/${parts[2]}`
                : raw;
            showByDate = cellDate === filterFormatted;
        }

        if (typeValue) {
            const cell = row.cells[5];
            const text = cell ? cell.textContent.trim().toUpperCase() : '';
            showByType = text.includes(typeValue.toUpperCase());
        }

        row.style.display = (showByDate && showByType) ? '' : 'none';
    });
}

function filtrerJournalDate(dateValue) {
    applyJournalFilters();
}

function filtrerJournalType(typeValue) {
    applyJournalFilters();
}

// Appeler au démarrage après Supabase
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(populateAllChantiersSelects, 2000);
});

// ── Navigation vers admin ───────────────────────────────────────
async function goToAdmin() {
    // ERR-16 CORRIGÉ : contrôle d'accès basé sur la session Supabase réelle,
    // non plus sur le localStorage client falsifiable.
    try {
        const { data: { session }, error } = await db.auth.getSession();
        if (!session || error) {
            showNotification('Session expirée — reconnectez-vous', 'error');
            window.location.href = 'login.html';
            return;
        }
        const role = session.user?.user_metadata?.role || '';
        if (role !== 'admin') {
            showNotification('Accès réservé aux administrateurs', 'error');
            return;
        }
        window.location.href = 'admin.html';
    } catch (e) {
        showNotification('Erreur vérification session : ' + e.message, 'error');
    }
}

// ── Helpers pour rapports ────────────────────────────────────────
function parseMoisAnnee(nom) {
    const moisMap = { 'janvier':1,'février':2,'fevrier':2,'mars':3,'avril':4,'mai':5,'juin':6,'juillet':7,'août':8,'aout':8,'septembre':9,'octobre':10,'novembre':11,'décembre':12,'decembre':12 };
    const n = nom.toLowerCase();
    let mois, annee;
    for (const [m, v] of Object.entries(moisMap)) { if (n.includes(m)) { mois = v; break; } }
    const match = n.match(/\b(20\d{2})\b/);
    if (match) annee = parseInt(match[1]);
    return { mois, annee };
}

function exportToPDF(doc, nom, headers, rows) {
    const { jsPDF } = window.jspdf;
    if (!doc) doc = new jsPDF();
    doc.setFontSize(16); doc.text(nom, 14, 20);
    doc.setFontSize(9);
    let y = 30;
    const pageW = doc.internal.pageSize.width;
    doc.setFillColor(28, 43, 58); doc.setTextColor(255, 255, 255);
    doc.rect(14, y - 4, pageW - 28, 7, 'F');
    let x = 14;
    headers.forEach(h => { doc.text(h, x + 1, y + 1); x += pageW / headers.length; });
    doc.setTextColor(0); y += 10;
    rows.forEach((r, i) => {
        if (y > 270) { doc.addPage(); y = 20; doc.setFontSize(9); }
        if (i % 2 === 0) { doc.setFillColor(245, 247, 250); doc.rect(14, y - 4, pageW - 28, 6, 'F'); }
        let cx = 14;
        const vals = typeof r === 'object' ? Object.values(r) : [r];
        vals.forEach((v, vi) => {
            const txt = v ? (typeof v === 'string' ? v.substring(0, 22) : String(v)) : '—';
            doc.text(txt, cx + 1, y); cx += pageW / Math.max(vals.length, headers.length);
        });
        y += 7;
    });
    return doc;
}

function exportToXLSX(nom, headers, rows) {
    const wb = XLSX.utils.book_new();
    const data2 = rows.map(r => Object.assign({}, r));
    const ws = XLSX.utils.json_to_sheet(data2);
    XLSX.utils.book_append_sheet(wb, ws, nom.substring(0, 31));
    XLSX.writeFile(wb, `${nom.replace(/[^a-zA-Z0-9]/g,'_')}.xlsx`);
}

// ── Téléchargement des rapports ─────────────────────────────────
async function downloadReport(btn) {
    const li = btn.closest('li');
    if (!li) return;
    const icon = li.querySelector('i');
    const span = li.querySelector('span');
    if (!span) return;
    const format = icon?.className?.includes('fa-file-pdf') ? 'pdf' : 'xlsx';
    const nom = span.textContent.trim();
    showNotification(`Génération de « ${nom} »...`, 'info');

    try {
        const n = nom.toLowerCase();
        const { mois, annee } = parseMoisAnnee(nom);
        let rows = [], headers = [], filename = nom.replace(/[^a-zA-Z0-9]/g,'_');

        // Ordre: du plus spécifique au plus général (évite 'bilan' qui attrape tout)

        // ── INCIDENT ──
        if (n.includes('incident')) {
            const { data } = await db.from('chantiers').select('nom,statut,progression,debut,fin').order('nom');
            rows = (data || []).slice(0, 20).map(r => ({ Chantier: r.nom, Statut: r.statut, Progression: r.progression+'%' }));
            if (!rows.length) { showNotification('Aucun incident', 'warning'); return; }
            headers = ['Chantier', 'Statut', 'Progression'];

        // ── RAPPORT JOURNALIER (chef-chantier: 'Rapport journalier - 13/05/2026') ──
        } else if (n.includes('journalier') && n.includes('rapport')) {
            const { data } = await db.from('journal').select('date,designation,montant,categorie,chantier').order('date', { ascending: false }).limit(100);
            const jour = nom.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (jour) { const j = `${jour[3]}-${jour[2]}-${jour[1]}`; rows = (data||[]).filter(r => r.date && r.date.startsWith(j)); }
            else { rows = data || []; }
            if (!rows.length) { showNotification('Aucune écriture pour ce jour', 'warning'); return; }
            headers = ['Date', 'Désignation', 'Montant (Ar)', 'Catégorie', 'Chantier'];

        // ── GALERIE PHOTOS ──
        } else if (n.includes('galerie')) {
            const { data } = await db.from('chantiers').select('nom,debut,fin,statut').order('nom');
            rows = (data || []).slice(0, 20).map(r => ({ Chantier: r.nom, Période: (r.debut||'—')+' → '+(r.fin||'—'), Statut: r.statut }));
            if (!rows.length) { showNotification('Aucune galerie', 'warning'); return; }
            headers = ['Chantier', 'Période', 'Statut'];

        // ── MASSE SALARIALE (avant effectif, avant bilan) ──
        } else if (n.includes('masse salariale')) {
            const { data: personnel } = await db.from('personnel').select('nom,metier,chantier,salaire_journalier').eq('actif', true);
            const { data: salaires } = await db.from('salaires').select('employe,montant,mois,annee').order('mois', { ascending: false }).limit(200);
            const emp = personnel || [];
            const moisCharge = (mois && annee) ? (salaires||[]).filter(s => s.mois === String(mois).padStart(2,'0') && s.annee === annee) : (salaires||[]);
            let totalMasse = 0;
            rows = emp.map(e => {
                const s = (moisCharge||[]).filter(s => s.employe === e.nom);
                const total = s.reduce((sum, s) => sum + (s.montant||0), 0);
                totalMasse += total;
                return { Nom: e.nom, Métier: e.metier, Chantier: e.chantier, Journalier: (e.salaire_journalier||0).toLocaleString('fr-FR'), Total_Mois: total.toLocaleString('fr-FR') };
            });
            rows.push({ Nom: '', Métier: '', Chantier: 'MASSE SALARIALE TOTALE', Journalier: '', Total_Mois: totalMasse.toLocaleString('fr-FR') });
            if (!rows.length) { showNotification('Aucune donnée salariale', 'warning'); return; }
            headers = ['Nom', 'Métier', 'Chantier', 'Journalier (Ar)', 'Total Mois (Ar)'];

        // ── CONGÉS / ABSENCES (avant bilan) ──
        } else if (n.includes('congé') || n.includes('absence') || n.includes('solde congés')) {
            const { data } = await db.from('conges').select('employe_nom,type,date_debut,date_fin,statut,valide_par').order('date_debut', { ascending: false }).limit(200);
            rows = data || [];
            if (!rows.length) {
                const { data: p } = await db.from('personnel').select('nom,metier,chantier').eq('actif', true).limit(50);
                rows = (p || []).map(x => ({ employe_nom: x.nom, type: '—', date_debut: '—', date_fin: '—', statut: 'ACTIF' }));
            }
            if (!rows.length) { showNotification('Aucune donnée congés', 'warning'); return; }
            headers = ['Employé', 'Type', 'Début', 'Fin', 'Statut'];

        // ── SÉCURITÉ / CONTRÔLE (avant bilan) ──
        } else if (n.includes('sécurité') || n.includes('contrôle')) {
            const { data } = await db.from('chantiers').select('nom,statut,progression').order('nom');
            rows = data || []; if (!rows.length) { showNotification('Aucune donnée', 'warning'); return; }
            headers = ['Chantier', 'Statut', 'Progression %'];

        // ── RECRUTEMENT / EMBAUCHE (avant bilan) ──
        } else if (n.includes('recrutement') || n.includes('embauche')) {
            const { data } = await db.from('personnel').select('nom,metier,chantier,date_embauche,type_salaire,salaire_journalier').eq('actif', true).order('date_embauche', { ascending: false }).limit(100);
            rows = data || []; if (!rows.length) { showNotification('Aucun recrutement', 'warning'); return; }
            headers = ['Nom', 'Métier', 'Chantier', 'Date embauche', 'Type', 'Salaire (Ar)'];

        // ── EFFECTIF ──
        } else if (n.includes('effectif')) {
            const { data } = await db.from('personnel').select('nom,metier,chantier,type_salaire,salaire_journalier').eq('actif', true).order('nom');
            rows = data || [];
            if (!rows.length) { showNotification('Aucun employé actif', 'warning'); return; }
            headers = ['Nom', 'Métier', 'Chantier', 'Type Salaire', 'Salaire (Ar)'];

        // ── STOCK (inventaire / mouvement / valorisation) ──
        } else if (n.includes('inventaire')) {
            const { data } = await db.from('commandes').select('designation,fournisseur,quantite,prix,statut,date').order('date', { ascending: false }).limit(200);
            rows = data || [];
            if (!rows.length) { showNotification('Aucun stock', 'warning'); return; }
            const totalVal = rows.reduce((s,r) => s + (r.quantite||0) * (r.prix||0), 0);
            rows.push({ designation: 'VALORISATION TOTALE', fournisseur: '', quantite: '', prix: '', statut: totalVal.toLocaleString('fr-FR') + ' Ar' });
            headers = ['Désignation', 'Fournisseur', 'Qté', 'Prix Unit (Ar)', 'Statut'];

        } else if (n.includes('mouvement')) {
            const { data } = await db.from('commandes').select('designation,date,statut,quantite,prix,fournisseur').order('date', { ascending: false }).limit(200);
            rows = data || [];
            if (!rows.length) { showNotification('Aucun mouvement', 'warning'); return; }
            headers = ['Article', 'Date', 'Statut', 'Qté', 'Prix (Ar)', 'Fournisseur'];

        } else if (n.includes('valorisation')) {
            const { data } = await db.from('commandes').select('designation,quantite,prix,statut,fournisseur').order('designation');
            rows = data || [];
            if (!rows.length) { showNotification('Aucun article', 'warning'); return; }
            const totalStock = rows.reduce((s,r) => s + (r.quantite||0) * (r.prix||0), 0);
            rows = rows.map(r => ({ Article: r.designation, Qté: r.quantite||0, PU: (r.prix||0).toLocaleString('fr-FR'), Total: ((r.quantite||0)*(r.prix||0)).toLocaleString('fr-FR'), Fournisseur: r.fournisseur||'—' }));
            rows.push({ Article: 'VALORISATION TOTALE', Qté: '', PU: '', Total: totalStock.toLocaleString('fr-FR') + ' Ar', Fournisseur: '' });
            headers = ['Article', 'Qté', 'Prix Unit (Ar)', 'Total (Ar)', 'Fournisseur'];

        // ── QUALITÉ ──
        } else if (n.includes('qualité')) {
            const { data } = await db.from('chantiers').select('nom,statut,progression').order('nom');
            rows = data || [];
            if (!rows.length) { showNotification('Aucune donnée qualité', 'warning'); return; }
            headers = ['Chantier', 'Statut', 'Progression %'];

        // ── AVANCEMENT / CHANTIERS ──
        } else if (n.includes('avancement') || n.includes('chantier')) {
            const { data } = await db.from('chantiers').select('nom,client,budget,debut,fin,progression,statut').order('nom');
            rows = data || [];
            if (!rows.length) { showNotification('Aucune donnée chantier', 'warning'); return; }
            headers = ['Chantier', 'Client', 'Budget (Ar)', 'Début', 'Fin', 'Progression %', 'Statut'];

        // ── TECHNIQUE / INTERVENTION ──
        } else if (n.includes('intervention') || n.includes('technique')) {
            const { data } = await db.from('chantiers').select('nom,statut,debut,fin').order('nom');
            rows = data || []; if (!rows.length) { showNotification('Aucune donnée', 'warning'); return; }
            headers = ['Chantier', 'Statut', 'Début', 'Fin'];

        // ── CHECKLIST ──
        } else if (n.includes('checklist')) {
            const { data } = await db.from('chantiers').select('nom,statut,debut,fin,progression').order('nom');
            rows = data || []; if (!rows.length) { showNotification('Aucune donnée', 'warning'); return; }
            headers = ['Chantier', 'Statut', 'Début', 'Fin', 'Progression %'];

        // ── BILAN (financier — après conges/sécurité/recrutement) ──
        } else if (n.includes('bilan')) {
            const { data } = await db.from('journal').select('categorie,montant,date').order('date', { ascending: false });
            const all = data || [];
            const filtered = (mois || annee) ? all.filter(r => {
                if (!r.date) return false; const d = new Date(r.date);
                if (annee && d.getFullYear() !== annee) return false;
                if (mois && d.getMonth() + 1 !== mois) return false;
                return true;
            }) : all;
            const recettes = filtered.filter(r => r.categorie === 'RECETTE' || r.montant > 0).reduce((s,r) => s + (r.montant||0), 0);
            const depenses = filtered.filter(r => r.categorie !== 'RECETTE' && r.montant < 0).reduce((s,r) => s + Math.abs(r.montant||0), 0);
            const catMap = {};
            filtered.forEach(r => { const c = r.categorie || 'AUTRES'; catMap[c] = (catMap[c]||0) + (r.montant||0); });
            rows = [
                { Rubrique: 'TOTAL RECETTES', Montant: recettes.toLocaleString('fr-FR') + ' Ar' },
                { Rubrique: 'TOTAL DÉPENSES', Montant: depenses.toLocaleString('fr-FR') + ' Ar' },
                { Rubrique: 'SOLDE', Montant: (recettes - depenses).toLocaleString('fr-FR') + ' Ar' },
            ];
            Object.entries(catMap).forEach(([c,m]) => { rows.push({ Rubrique: '  ' + c, Montant: m.toLocaleString('fr-FR') + ' Ar' }); });
            headers = ['Rubrique', 'Montant'];
            if (!rows.length) { showNotification('Aucune donnée pour ce bilan', 'warning'); return; }

        // ── COMPTE RÉSULTAT ──
        } else if (n.includes('résultat')) {
            const { data } = await db.from('journal').select('categorie,montant,date');
            const all = data || [];
            const filtered = (mois || annee) ? all.filter(r => {
                if (!r.date) return false; const d = new Date(r.date);
                if (annee && d.getFullYear() !== annee) return false;
                if (mois && d.getMonth() + 1 !== mois) return false;
                return true;
            }) : all;
            const produits = filtered.filter(r => r.categorie === 'RECETTE' || r.montant > 0).reduce((s,r) => s + (r.montant||0), 0);
            const charges = filtered.filter(r => r.categorie !== 'RECETTE' && r.montant < 0).reduce((s,r) => s + Math.abs(r.montant||0), 0);
            rows = [
                { Rubrique: 'Produits (Recettes)', Montant: produits.toLocaleString('fr-FR') },
                { Rubrique: 'Charges (Dépenses)', Montant: charges.toLocaleString('fr-FR') },
                { Rubrique: 'RÉSULTAT NET', Montant: (produits - charges).toLocaleString('fr-FR') },
            ];
            headers = ['Rubrique', 'Montant (Ar)'];
            if (!rows.length) { showNotification('Aucune donnée pour ce rapport', 'warning'); return; }

        // ── BUDGÉTAIRE ──
        } else if (n.includes('budgét') || n.includes('budget')) {
            const { data: jdata } = await db.from('journal').select('date,designation,montant,categorie,chantier').order('date', { ascending: false }).limit(500);
            const all = jdata || [];
            const filtered = (mois || annee) ? all.filter(r => {
                if (!r.date) return false; const d = new Date(r.date);
                if (annee && d.getFullYear() !== annee) return false;
                if (mois && d.getMonth() + 1 !== mois) return false;
                return true;
            }) : all;
            if (!filtered.length) { showNotification('Aucune écriture pour cette période', 'warning'); return; }
            const catMap = {};
            filtered.forEach(r => { const c = r.categorie || 'AUTRES'; catMap[c] = (catMap[c]||0) + (r.montant||0); });
            rows = Object.entries(catMap).map(([c,m]) => ({ Catégorie: c, Montant: m.toLocaleString('fr-FR') + ' Ar', Pct: (m/(filtered.reduce((s,r)=>s+Math.abs(r.montant||0),0)||1)*100).toFixed(1) + '%' }));
            headers = ['Catégorie', 'Montant (Ar)', '%'];

        // ── TRÉSORERIE / RENTABILITÉ / PRÉVISION ──
        } else if (n.includes('trésorerie') || n.includes('rentabilité') || n.includes('prévision')) {
            const { data } = await db.from('journal').select('date,designation,montant,categorie,mode_paiement,chantier').order('date', { ascending: false }).limit(500);
            const all = data || [];
            const filtered = (mois || annee) ? all.filter(r => {
                if (!r.date) return false; const d = new Date(r.date);
                if (annee && d.getFullYear() !== annee) return false;
                if (mois && d.getMonth() + 1 !== mois) return false;
                return true;
            }) : all;
            if (!filtered.length && !all.length) { showNotification('Aucune écriture', 'warning'); return; }
            const totalIn = filtered.filter(r => r.montant > 0).reduce((s,r)=>s+(r.montant||0),0);
            const totalOut = filtered.filter(r => r.montant < 0).reduce((s,r)=>s+Math.abs(r.montant||0),0);
            rows = filtered.map(x => ({ Date: x.date||'—', Désignation: (x.designation||'').substring(0,25), Montant: (x.montant||0).toLocaleString('fr-FR'), Catégorie: x.categorie||'—' }));
            rows.push({ Date: '', Désignation: '', Montant: '', Catégorie: '' });
            rows.push({ Date: '', Désignation: 'TOTAL ENCAISSEMENTS', Montant: totalIn.toLocaleString('fr-FR'), Catégorie: '' });
            rows.push({ Date: '', Désignation: 'TOTAL DÉCAISSEMENTS', Montant: totalOut.toLocaleString('fr-FR'), Catégorie: '' });
            rows.push({ Date: '', Désignation: 'SOLDE', Montant: (totalIn - totalOut).toLocaleString('fr-FR'), Catégorie: '' });
            headers = ['Date', 'Désignation', 'Montant (Ar)', 'Catégorie'];

        // ── JOURNALIER / MENSUEL (périodique générique) ──
        } else if (n.includes('journalier') || n.includes('mensuel')) {
            const { data } = await db.from('journal').select('date,designation,montant,categorie,chantier').order('date', { ascending: false }).limit(200);
            rows = data || []; if (!rows.length) { showNotification('Aucune écriture', 'warning'); return; }
            headers = ['Date', 'Désignation', 'Montant (Ar)', 'Catégorie', 'Chantier'];

        } else {
            showNotification(`Rapport « ${nom} » non reconnu`, 'error');
            return;
        }

        if (format === 'pdf') { const doc = exportToPDF(null, nom, headers, rows); doc.save(`${filename}.pdf`); }
        else { exportToXLSX(nom, headers, rows); }
        showNotification(`${nom} téléchargé ✓`, 'success');
    } catch (e) {
        console.error('[Rapport]', e);
        showNotification('Erreur génération rapport', 'error');
    }
}

// Délégation : clic sur bouton dans les listes de rapports
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.report-list').forEach(ul => {
        ul.addEventListener('click', e => {
            const btn = e.target.closest('button.btn-small');
            if (btn) downloadReport(btn);
        });
    });
});
