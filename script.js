// ============================================================
// NYSOA BTP — script.js
// Toutes les données viennent de Supabase (supabase.js)
// localStorage = fallback de lecture seulement si Supabase échoue
// ============================================================

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const pageTitle = document.getElementById('page-title');

const sectionTitles = {
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
    'salaires':   'Calcul des Salaires'
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
                <button class="btn-icon" title="Voir"      onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteProjet('${p.id}',this)"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(row);
    });
}

async function deleteProjet(id, btn) {
    if (!confirm('Supprimer ce projet ?')) return;
    const { error } = await db.from('chantiers').delete().eq('id', id);
    if (error) { showNotification('Erreur suppression', 'error'); return; }
    btn.closest('tr').remove();
    showNotification('Projet supprimé', 'success');
}

// ============================================================
// ACHATS — lit depuis Supabase
// ============================================================
async function loadAchatsTable() {
    const tbody = document.querySelector('#achats-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('commandes').select('*').order('date', { ascending: false }).limit(200);
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach((a, i) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', a.id);
        row.innerHTML = `
            <td>CMD-${String(i+1).padStart(3,'0')}</td>
            <td>${a.fournisseur || '—'}</td>
            <td>${formatDate(a.date)}</td>
            <td>${formatAriary(a.prix_unitaire)}</td>
            <td><span class="status ${getStatusClass(a.statut)}">${a.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir"      onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteAchatRow('${a.id}',this)"><i class="fas fa-trash"></i></button>
                <button class="btn-icon" title="Imprimer"  onclick="printRow(this)"><i class="fas fa-print"></i></button>
            </td>`;
        tbody.appendChild(row);
    });
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
async function loadPersonnelTable() {
    const tbody = document.querySelector('#personnel-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('personnel').select('*').eq('actif', true).order('nom');
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach((emp, i) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', emp.id);
        row.innerHTML = `
            <td>EMP-${String(i+1).padStart(3,'0')}</td>
            <td>${emp.nom}</td>
            <td>${emp.metier || '—'}</td>
            <td>${emp.chantier || '—'}</td>
            <td>—</td>
            <td>${emp.type_salaire === 'MENSUEL' ? formatAriary(emp.salaire_journalier)+'/mois' : formatAriary(emp.salaire_journalier)+'/jour'}</td>
            <td><span class="status success">Actif</span></td>
            <td>
                <button class="btn-icon" title="Voir"      onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deletePersonnelRow('${emp.id}',this)"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(row);
    });
}

async function deletePersonnelRow(id, btn) {
    if (!confirm('Désactiver cet employé ?')) return;
    const { error } = await db.from('personnel').update({ actif: false }).eq('id', id);
    if (error) { showNotification('Erreur', 'error'); return; }
    btn.closest('tr').remove();
    showNotification('Employé désactivé', 'success');
}

// ============================================================
// LOGISTIQUE / STOCK — lit depuis Supabase
// ============================================================
async function loadLogistiqueTable() {
    const tbody = document.querySelector('#logistique-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('materiels').select('*').order('libelle');
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach((m, i) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', m.id);
        row.innerHTML = `
            <td>MAT-${String(i+1).padStart(3,'0')}</td>
            <td>${m.libelle}</td>
            <td>Matériel</td>
            <td>${m.quantite || '—'}</td>
            <td>—</td>
            <td>—</td>
            <td>${m.chantier_actuel || '—'}</td>
            <td><span class="status ${getStatusClass(m.etat)}">${m.etat}</span></td>`;
        tbody.appendChild(row);
    });
}

// ============================================================
// POINTAGE — lit depuis Supabase
// ============================================================
async function loadPointageTable() {
    const tbody = document.getElementById('pointage-table-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px">Chargement...</td></tr>';

    const { data, error } = await db.from('pointage').select('*').order('semaine_du', { ascending: false }).limit(100);
    if (error) { console.error(error); tbody.innerHTML = ''; return; }

    tbody.innerHTML = '';
    data.forEach(p => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', p.id);
        row.innerHTML = `
            <td>${formatDate(p.semaine_du)}</td>
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
async function loadAllData() {
    await Promise.all([
        loadProjetsTable(),
        loadAchatsTable(),
        loadJournalTable(),
        loadPersonnelTable(),
        loadLogistiqueTable(),
        loadPointageTable(),
        updateDashboardStats(),
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
        semaine_du:         semaine.toISOString().split('T')[0],
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
        const { error } = await db.from('commandes').insert({
            date:          fd.get('date') || new Date().toISOString().split('T')[0],
            chantier:      fd.get('chantier') || null,
            libelle:       fd.get('libelle') || fd.get('fournisseur'),
            quantite:      parseFloat(fd.get('quantite')) || 1,
            prix:          parseFloat(fd.get('montant')) || 0,
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
    const { data, error } = await db.from('pointage').select('*').order('semaine_du');
    if (error || !data.length) { showNotification('Aucun pointage', 'warning'); return; }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
        'Semaine du': r.semaine_du, 'Chantier': r.chantier, 'Employé': r.nom_employe,
        'Nb jours': r.nb_jours, 'Salaire/jour': r.salaire_journalier,
        'Total avances': r.total_avances, 'À payer': r.a_payer
    })));
    XLSX.utils.book_append_sheet(wb, wb, ws, 'Pointage');
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
        e.preventDefault();
        const sectionId = item.getAttribute('data-section');
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        sections.forEach(s => {
            s.classList.remove('active');
            if (s.id === sectionId) s.classList.add('active');
        });
        pageTitle.textContent = sectionTitles[sectionId] || 'Tableau de bord';
        if (sectionId === 'pointage') setTimeout(initializeQRScanner, 500);
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
