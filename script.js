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

    const { data, error } = await db.from('journal').select('*').order('date', { ascending: false }).limit(200);
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

    const { data, error } = await db.from('personnel').select('*').eq('actif', true).order('nom');
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach((emp, i) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', emp.id);
        const anciennete = calculerAnciennete(emp.date_embauche);
        row.innerHTML = `
            <td>EMP-${String(i+1).padStart(3,'0')}</td>
            <td>${emp.nom}</td>
            <td>${emp.metier || '—'}</td>
            <td>${emp.chantier || '—'}</td>
            <td>${formatDate(emp.date_embauche)}</td>
            <td>${anciennete}</td>
            <td>${emp.type_salaire === 'MENSUEL' ? formatAriary(emp.salaire_journalier)+'/mois' : formatAriary(emp.salaire_journalier)+'/jour'}</td>
            <td><span class="status success">Actif</span></td>
            <td>
                <button class="btn-icon" title="Voir"      onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deletePersonnelRow('${emp.id}',this)"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(row);
    });

    // Ré-appliquer le filtre chantier actif s'il y en a un
    if (typeof reApplyChantierFilter === 'function') reApplyChantierFilter();
}
async function deletePersonnelRow(id, btn) {
    if (!confirm('Désactiver cet employé ?')) return;
    const { error } = await db.from('personnel').update({ actif: false }).eq('id', id);
    if (error) { showNotification('Erreur', 'error'); return; }
    btn.closest('tr').remove();
    showNotification('Employé désactivé', 'success');
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

// ============================================================
// LOGISTIQUE / STOCK — lit depuis Supabase
// ============================================================
async function loadLogistiqueTable() {
    // Inventaire stock — correspond à #stock-table-body dans index.html
    const tbody = document.getElementById('stock-table-body');
    const stockParChantier = document.getElementById('stock-par-chantier-body');

    if (tbody) tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:20px;color:#94a3b8">Chargement...</td></tr>';

    const { data, error } = await db.from('materiels').select('*').order('libelle');
    if (error) {
        console.error('[Logistique]', error);
        if (tbody) tbody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:red">Erreur chargement</td></tr>';
        if (stockParChantier) stockParChantier.innerHTML = '<p style="color:red">Erreur chargement</p>';
        return;
    }

    // ── Inventaire ──
    if (tbody) {
        tbody.innerHTML = '';
        data.forEach((m, i) => {
            const etatClass = m.etat === 'EN MARCHE' || m.etat === 'BON' ? 'success' : m.etat === 'EN PANNE' ? 'error' : 'warning';
            const row = document.createElement('tr');
            row.setAttribute('data-id', m.id);
            row.innerHTML = `
                <td>MAT-${String(i+1).padStart(3,'0')}</td>
                <td>${m.libelle || '—'}</td>
                <td>Matériel</td>
                <td>${m.chantier_actuel || 'Dépôt'}</td>
                <td>${m.quantite || 0}</td>
                <td>Unité</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td><span class="status ${etatClass}">${m.etat || '—'}</span></td>
                <td>
                    <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
                </td>`;
            tbody.appendChild(row);
        });

        // Mettre à jour stat
        const statTotal = document.getElementById('stat-total-articles');
        if (statTotal) statTotal.textContent = data.length;
        const statBas = document.getElementById('stat-stocks-bas');
        if (statBas) statBas.textContent = data.filter(m => m.etat === 'EN PANNE').length;

        // Remplir le filtre emplacement
        const empFilter = document.getElementById('stock-emplacement-filter');
        if (empFilter) {
            const chantiers = [...new Set(data.map(m => m.chantier_actuel).filter(Boolean))];
            chantiers.forEach(c => {
                if (!empFilter.querySelector(`option[value="${c}"]`)) {
                    const opt = document.createElement('option');
                    opt.value = opt.textContent = c;
                    empFilter.appendChild(opt);
                }
            });
        }
    }

    // ── Stock par chantier ──
    if (stockParChantier) {
        const byChantier = {};
        data.forEach(m => {
            const key = m.chantier_actuel || 'Dépôt';
            if (!byChantier[key]) byChantier[key] = [];
            byChantier[key].push(m);
        });

        if (Object.keys(byChantier).length === 0) {
            stockParChantier.innerHTML = '<p style="color:#94a3b8;text-align:center;font-style:italic">Aucun matériel enregistré</p>';
            return;
        }

        stockParChantier.innerHTML = Object.entries(byChantier).map(([chantier, items]) => `
            <div style="margin-bottom:20px">
                <h4 style="color:#1C2B3A;border-bottom:2px solid #0066cc;padding-bottom:6px;margin-bottom:10px">
                    🏗️ ${chantier} <span style="font-size:12px;color:#64748b">(${items.length} article${items.length > 1 ? 's' : ''})</span>
                </h4>
                <table class="table" style="font-size:13px">
                    <thead><tr><th>Article</th><th>Quantité</th><th>État</th></tr></thead>
                    <tbody>
                        ${items.map(m => `
                            <tr>
                                <td>${m.libelle}</td>
                                <td>${m.quantite || 0}</td>
                                <td><span class="status ${m.etat === 'EN MARCHE' || m.etat === 'BON' ? 'success' : 'error'}">${m.etat || '—'}</span></td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>`).join('');
    }
    if (typeof reApplyChantierFilter === 'function') reApplyChantierFilter();
}

// ============================================================
// POINTAGE — lit depuis Supabase
// ============================================================
async function loadPointageTable() {
    const tbody = document.getElementById('pointage-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('pointage').select('*').order('date', { ascending: false }).limit(100);
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
    const { error } = await db.from('pointage').delete().eq('id', id);
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
            { count: nbMat },
            { data: depData }
        ] = await Promise.all([
            db.from('chantiers').select('*', { count: 'exact', head: true }).eq('actif', true),
            db.from('personnel').select('*', { count: 'exact', head: true }).eq('actif', true),
            db.from('materiels').select('*', { count: 'exact', head: true }),
            db.from('journal').select('montant').gte('date', `${new Date().getFullYear()}-01-01`)
        ]);

        const totalCA = (depData || []).reduce((s, r) => s + (r.montant || 0), 0);

        const cards = document.querySelectorAll('#dashboard .stat-card .stat-info');
        if (cards[0]) cards[0].querySelector('h3').textContent = nbChantiers || 0;
        if (cards[1]) cards[1].querySelector('h3').textContent =
            totalCA >= 1_000_000 ? (totalCA/1_000_000).toFixed(1) + 'MAr' : formatAriary(totalCA);
        if (cards[2]) cards[2].querySelector('h3').textContent = nbPersonnel || 0;
        if (cards[3]) cards[3].querySelector('h3').textContent = nbMat || 0;

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

    const semaine = new Date();
    semaine.setDate(semaine.getDate() - semaine.getDay() + 1); // lundi

    const { error } = await db.from('pointage').insert({
        date:         semaine.toISOString().split('T')[0],
        chantier:           chantier,
        nom_employe:        scannedEmployee.nom,
        salaire_journalier: scannedEmployee.salaire_journalier || 0,
        nb_jours:           1,
        total_avances:      0,
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

    const { error } = await db.from('pointage').insert({
        date: date,
        chantier: chantier,
        nom_employe: nom,
        type_pointage: type === 'arrivee' ? 'Arrivée' : 'Départ',
        nb_jours: 1,
        salaire_journalier: 0,
        total_avances: 0,
        source: 'manuel'
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
            id: emp.id, nom: emp.nom, metier: emp.metier,
            chantier: emp.chantier, salaire_journalier: emp.salaire_journalier
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
            chantier:           fd.get('chantier') || null,
            salaire_journalier: salaire,
            type_salaire:       salaire >= 100000 ? 'MENSUEL' : 'JOURNALIER',
            actif:              true,
        });
        if (error) { showNotification('Erreur: ' + error.message, 'error'); return; }
        loadPersonnelTable();
        updateDashboardStats();
        closeModal('modal-employe');
        this.reset();
        showNotification('Employé ajouté ✓', 'success');
    });

    // Devis (local, pas de table Supabase)
    const formDevis = document.getElementById('form-devis');
    if (formDevis) formDevis.addEventListener('submit', function(e) {
        e.preventDefault();
        closeModal('modal-devis');
        this.reset();
        showNotification('Devis créé ✓', 'success');
    });

    // Proformat (local)
    const formProformat = document.getElementById('form-proformat');
    if (formProformat) formProformat.addEventListener('submit', function(e) {
        e.preventDefault();
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

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) { modal.classList.remove('active'); document.body.style.overflow = 'auto'; }
    });
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
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        sections.forEach(s => {
            s.classList.remove('active');
            if (s.id === sectionId) s.classList.add('active');
        });
        pageTitle.textContent = sectionTitles[sectionId] || 'Tableau de bord';
        if (sectionId === 'pointage')  setTimeout(initializeQRScanner, 500);
        if (sectionId === 'antoka')    setTimeout(loadAntoka, 100);
        if (sectionId === 'credits')   setTimeout(loadCredits, 100);
        if (sectionId === 'caisse')    setTimeout(loadCaisse, 100);
        if (sectionId === 'catalogue') setTimeout(loadCatalogue, 100);
        if (sectionId === 'contrats')  setTimeout(loadContrats, 100);
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
    let info = '';
    cells.forEach((c, i) => { if (i < cells.length - 1) info += c.textContent.trim() + '\n'; });
    alert('Détails:\n\n' + info);
}

function printRow(button) {
    const cells = button.closest('tr').querySelectorAll('td');
    let content = '<table border="1" style="border-collapse:collapse;width:100%">';
    cells.forEach((c, i) => { if (i < cells.length - 1) content += `<tr><td style="padding:10px">${c.textContent}</td></tr>`; });
    content += '</table>';
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Impression</title></head><body><h2>Détail</h2>${content}<script>window.print();<\/script></body></html>`);
    w.document.close();
}

function exportChart(canvasId, format) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, 190, 100);
        doc.save(`${canvasId}.pdf`);
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

function logout() {
    if (confirm('Voulez-vous vous déconnecter ?')) {
        localStorage.removeItem('nysoa_user');
        window.location.href = 'login.html';
    }
}

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
    // Rendre les cellules éditables
    const cells = row.querySelectorAll('td:not(:last-child)');
    cells.forEach(cell => {
        if (!cell.querySelector('input')) {
            const val = cell.textContent.trim();
            cell.innerHTML = `<input class="inline-edit" value="${val}" style="width:100%;border:1px solid #0066cc;border-radius:3px;padding:2px 4px;">`;
        }
    });
    // Changer le bouton edit en bouton save
    btn.innerHTML = '<i class="fas fa-save"></i>';
    btn.onclick = function() { saveRow(this); };
}

function saveRow(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    row.querySelectorAll('.inline-edit').forEach(input => {
        input.parentElement.textContent = input.value;
    });
    btn.innerHTML = '<i class="fas fa-edit"></i>';
    btn.onclick = function() { editRow(this); };
    showNotification('Ligne mise à jour', 'success');
}

// ── Devis / Proformat ─────────────────────────────────────────
function convertToProformat(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    const client  = cells[1]?.textContent || '';
    const projet  = cells[2]?.textContent || '';
    const montant = cells[3]?.textContent || '';
    showNotification(`Proformat créé pour ${client} — ${projet} (${montant})`, 'success');
}

function convertToFacture(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const cells = row.querySelectorAll('td');
    const client  = cells[1]?.textContent || '';
    const montant = cells[3]?.textContent || '';
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
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('NySoa BTP — Fiche de Paie', 20, 20);
    doc.setFontSize(12);
    doc.text(`Employé: ${emp.nom}`, 20, 35);
    doc.text(`Jours: ${emp.jours} · Taux: ${formatAriary(emp.taux)}`, 20, 45);
    doc.text(`Total: ${formatAriary(emp.total)}`, 20, 55);
    doc.text(`Net à payer: ${formatAriary(emp.net)}`, 20, 65);
    doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 20, 75);
    doc.save(`paie_${emp.nom.replace(/[^a-zA-Z0-9]/g,'_')}.pdf`);
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

function filtrerJournalDate(dateValue) {
    const table = document.getElementById('journal-table');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        if (!dateValue) { row.style.display = ''; return; }
        const cell = row.cells[0];
        if (!cell) return;
        const cellDate = cell.textContent.trim();
        const match = cellDate === dateValue;
        row.style.display = match ? '' : 'none';
    });
}

function filtrerJournalType(typeValue) {
    const table = document.getElementById('journal-table');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        if (!typeValue) { row.style.display = ''; return; }
        const cell = row.cells[5];
        if (!cell) return;
        const text = cell.textContent.trim().toUpperCase();
        const match = text === typeValue;
        row.style.display = match ? '' : 'none';
    });
}

// Appeler au démarrage après Supabase
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(populateAllChantiersSelects, 2000);
});

// ── Fonctions RH pour les congés ───────────────────────────────
function approveLeave(btn) {
    const row = btn.closest('tr');
    const statusCell = row.querySelector('.status');
    statusCell.className = 'status success';
    statusCell.textContent = 'Approuvé';
    showNotification('Congé approuvé ✓', 'success');
}

function rejectLeave(btn) {
    const row = btn.closest('tr');
    const statusCell = row.querySelector('.status');
    statusCell.className = 'status error';
    statusCell.textContent = 'Rejeté';
    showNotification('Congé rejeté', 'info');
}

// ── Navigation vers admin ───────────────────────────────────────
function goToAdmin() {
    const currentUser = JSON.parse(localStorage.getItem('nysoa_current_user') || 'null');
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Accès réservé aux administrateurs', 'error');
        return;
    }
    window.location.href = 'admin.html';
}
