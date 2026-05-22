// ============================================================
// NYSOA BTP — Module Supabase
// Fichier 3/3 : Remplace localStorage par Supabase
// 
// CONFIGURATION :
//   1. Remplacez SUPABASE_URL et SUPABASE_ANON_KEY ci-dessous
//      avec vos valeurs depuis https://app.supabase.com
//      → Settings > API > Project URL & anon/public key
//   2. Ajoutez ce script dans index.html AVANT script.js :
//      <script src="supabase.js"></script>
// ============================================================

// ── CONFIGURATION — À modifier ───────────────────────────────
const SUPABASE_URL  = 'https://djncsybvloyyesllfxhq.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDI1OTksImV4cCI6MjA5MzMxODU5OX0.o4MOSg6axYoNdl0XgidLi0eNukR-KwnKvecZxchkcP8';

// ── Client Supabase (chargé via CDN) ─────────────────────────
// Ajoutez dans index.html, avant ce script :
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── UTILITAIRES ───────────────────────────────────────────────
function formatAriary(num) {
  if (!num && num !== 0) return '—';
  return new Intl.NumberFormat('fr-FR').format(num) + ' Ar';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

// ── AFFICHAGE DES ERREURS ─────────────────────────────────────
function handleError(err, context) {
  console.error(`[Supabase] ${context}:`, err);
  showNotification(`Erreur: ${err.message || context}`, 'error');
}

// ══════════════════════════════════════════════════════════════
// JOURNAL
// ══════════════════════════════════════════════════════════════

async function loadJournalTable() {
  const tbody = document.querySelector('#journal .table tbody') ||
                document.getElementById('journal-table-body');
  if (!tbody) return;

  const { data, error } = await db
    .from('journal')
    .select('*')
    .order('date', { ascending: false })
    .limit(200);

  if (error) return handleError(error, 'loadJournalTable');

  tbody.innerHTML = '';
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(r.date)}</td>
      <td>${r.chantier || '—'}</td>
      <td>${r.designation}</td>
      <td>${formatAriary(r.montant)}</td>
      <td>${r.mode_paiement || '—'}</td>
      <td><span class="status active">${r.categorie || '—'}</span></td>
      <td>${r.travaux || '—'}</td>
      <td>
        <button class="btn-icon" onclick="deleteJournal('${r.id}')"><i class="fas fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });

  updateJournalStats(data);
}

async function updateJournalStats(data) {
  if (!data) {
    const { data: d } = await db.from('journal').select('montant, categorie');
    data = d || [];
  }
  const total = data.reduce((s, r) => s + (r.montant || 0), 0);
  const recettes = data.filter(r => r.categorie === 'RECETTE').reduce((s, r) => s + r.montant, 0);
  const depenses = total - recettes;

  // Mettre à jour les stat-cards du journal
  const cards = document.querySelectorAll('#journal .stat-info h3');
  if (cards[0]) cards[0].textContent = formatAriary(recettes);
  if (cards[1]) cards[1].textContent = formatAriary(depenses);
  if (cards[2]) cards[2].textContent = formatAriary(recettes - depenses);
}

async function addJournalEntry(entry) {
  const { error } = await db.from('journal').insert({
    date: entry.date || today(),
    chantier:      entry.chantier,
    designation:   entry.designation,
    montant:       parseFloat(entry.montant) || 0,
    mode_paiement: entry.mode_paiement,
    categorie:     entry.categorie,
    travaux:       entry.travaux,
  });
  if (error) return handleError(error, 'addJournalEntry');
  showNotification('Écriture ajoutée ✓', 'success');
  loadJournalTable();
}

async function deleteJournal(id) {
  if (!confirm('Supprimer cette écriture ?')) return;
  const { error } = await db.from('journal').delete().eq('id', id);
  if (error) return handleError(error, 'deleteJournal');
  showNotification('Écriture supprimée', 'success');
  loadJournalTable();
}

// ══════════════════════════════════════════════════════════════
// ACHATS
// ══════════════════════════════════════════════════════════════

async function loadAchatsTable() {
  const tbody = document.querySelector('#achats .table tbody') ||
                document.getElementById('achats-table-body');
  if (!tbody) return;

  const { data, error } = await db
    .from('commandes')
    .select('*')
    .order('date', { ascending: false })
    .limit(200);

  if (error) return handleError(error, 'loadAchatsTable');

  tbody.innerHTML = '';
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(r.date)}</td>
      <td>${r.chantier || '—'}</td>
      <td>${r.libelle}</td>
      <td>${r.quantite}</td>
      <td>${formatAriary(r.prix)}</td>
      <td>${r.fournisseur || '—'}</td>
      <td>${r.mode_paiement || '—'}</td>
      <td><span class="status ${r.statut === 'OK' ? 'success' : 'warning'}">${r.statut}</span></td>
      <td>
        <button class="btn-icon" onclick="deleteAchat('${r.id}')"><i class="fas fa-trash"></i></button>
        <button class="btn-icon" onclick="printRow(this)"><i class="fas fa-print"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });

  updateAchatsStats(data);
}

async function updateAchatsStats(data) {
  if (!data) {
    const { data: d } = await db.from('commandes').select('prix, statut');
    data = d || [];
  }
  const total = data.reduce((s, r) => s + (r.prix || 0), 0);
  const enAttente = data.filter(r => r.statut === 'EN ATTENTE').length;
  const cards = document.querySelectorAll('#achats .stat-info h3');
  if (cards[0]) cards[0].textContent = data.length;
  if (cards[1]) cards[1].textContent = formatAriary(total);
  if (cards[2]) cards[2].textContent = enAttente;
}

async function addAchat(achat) {
  const { error } = await db.from('commandes').insert({
    date:    achat.date || today(),
    chantier:      achat.chantier,
    libelle:       achat.libelle,
    quantite:      parseFloat(achat.quantite) || 1,
    prix:          parseFloat(achat.prix) || 0,
    fournisseur:   achat.fournisseur,
    mode_paiement: achat.mode_paiement,
    statut:        'EN ATTENTE',
  });
  if (error) return handleError(error, 'addAchat');
  showNotification('Achat enregistré ✓', 'success');
  loadAchatsTable();
}

async function deleteAchat(id) {
  if (!confirm('Supprimer cet achat ?')) return;
  const { error } = await db.from('commandes').delete().eq('id', id);
  if (error) return handleError(error, 'deleteAchat');
  showNotification('Achat supprimé', 'success');
  loadAchatsTable();
}

// ══════════════════════════════════════════════════════════════
// PERSONNEL
// ══════════════════════════════════════════════════════════════

async function loadPersonnelTable() {
  const tbody = document.querySelector('#personnel .table tbody') ||
                document.getElementById('personnel-table-body');
  if (!tbody) return;

  const { data, error } = await db
    .from('personnel')
    .select('*')
    .eq('actif', true)
    .order('nom');

  if (error) return handleError(error, 'loadPersonnelTable');

  tbody.innerHTML = '';
  data.forEach((r, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>EMP-${String(i+1).padStart(3,'0')}</td>
      <td>${r.nom}</td>
      <td>${r.metier || '—'}</td>
      <td>${r.chantier || '—'}</td>
      <td>—</td>
      <td>${r.type_salaire === 'MENSUEL' ? formatAriary(r.salaire_journalier) + '/mois' : formatAriary(r.salaire_journalier) + '/jour'}</td>
      <td><span class="status success">Actif</span></td>
      <td>
        <button class="btn-icon" onclick="editPersonnel('${r.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn-icon" onclick="deletePersonnel('${r.id}')"><i class="fas fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });

  updatePersonnelStats(data);
  // Refresh chantier dropdown in pointage
  loadChantiers();
}

async function updatePersonnelStats(data) {
  const cards = document.querySelectorAll('#personnel .stat-info h3');
  if (cards[0]) cards[0].textContent = data.length;
  if (cards[1]) cards[1].textContent = data.filter(p => p.type_salaire === 'JOURNALIER').length;
  if (cards[2]) cards[2].textContent = data.filter(p => p.type_salaire === 'MENSUEL').length;
}

async function addPersonnel(emp) {
  const { error } = await db.from('personnel').insert({
    nom:               emp.nom + (emp.prenom ? ' ' + emp.prenom : ''),
    chantier:     emp.chantier,
    salaire_journalier: parseFloat(emp.salaire) || 0,
    metier:            emp.metier,
    type_salaire:      parseFloat(emp.salaire) >= 100000 ? 'MENSUEL' : 'JOURNALIER',
  });
  if (error) return handleError(error, 'addPersonnel');
  showNotification('Employé ajouté ✓', 'success');
  loadPersonnelTable();
}

async function deletePersonnel(id) {
  if (!confirm('Désactiver cet employé ?')) return;
  const { error } = await db.from('personnel').update({ actif: false }).eq('id', id);
  if (error) return handleError(error, 'deletePersonnel');
  showNotification('Employé désactivé', 'success');
  loadPersonnelTable();
}

// ══════════════════════════════════════════════════════════════
// LOGISTIQUE / MATERIAUX
// ══════════════════════════════════════════════════════════════

async function loadLogistiqueTable() {
  const tbody = document.querySelector('#logistique .table tbody') ||
                document.getElementById('logistique-table-body');
  if (!tbody) return;

  const { data, error } = await db
    .from('materiels')
    .select('*')
    .order('etat')
    .order('libelle');

  if (error) return handleError(error, 'loadLogistiqueTable');

  tbody.innerHTML = '';
  data.forEach((r, i) => {
    const statusClass = r.etat === 'EN MARCHE' ? 'success' : r.etat === 'EN PANNE' ? 'error' : 'warning';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>MAT-${String(i+1).padStart(3,'0')}</td>
      <td>${r.libelle}</td>
      <td>Outillage</td>
      <td>${r.quantite || '—'}</td>
      <td>—</td>
      <td>—</td>
      <td>${r.chantier_actuel || '—'}</td>
      <td><span class="status ${statusClass}">${r.etat}</span></td>`;
    tbody.appendChild(tr);
  });

  // Stats
  const cardsL = document.querySelectorAll('#logistique .stat-info h3');
  if (cardsL[0]) cardsL[0].textContent = data.length;
  if (cardsL[1]) cardsL[1].textContent = data.filter(m => m.etat === 'EN PANNE').length;
}

// ══════════════════════════════════════════════════════════════
// POINTAGE
// ══════════════════════════════════════════════════════════════

async function loadPointageTable() {
  const tbody = document.getElementById('pointage-table-body');
  if (!tbody) return;

  const { data, error } = await db
    .from('pointage')
    .select('*')
    .order('semaine_du', { ascending: false })
    .limit(100);

  if (error) return handleError(error, 'loadPointageTable');

  tbody.innerHTML = '';
  data.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(r.semaine_du)}</td>
      <td>${r.nom_employe}</td>
      <td>${r.chantier || '—'}</td>
      <td>Journée</td>
      <td>${r.nb_jours} jrs</td>
      <td><span class="status success">Validé</span></td>
      <td>
        <button class="btn-icon" onclick="deletePointage('${r.id}')"><i class="fas fa-trash"></i></button>
      </td>`;
    tbody.appendChild(tr);
  });
}

async function enregistrerPointage() {
  if (!scannedEmployee) {
    showNotification('Veuillez scanner un QR code', 'error');
    return;
  }
  const chantier = document.getElementById('chantier-select')?.value;
  if (!chantier) {
    showNotification('Veuillez sélectionner un chantier', 'error');
    return;
  }

  const semaine = new Date();
  semaine.setDate(semaine.getDate() - semaine.getDay() + 1); // Lundi

  const { error } = await db.from('pointage').insert({
    semaine_du:        semaine.toISOString().split('T')[0],
    chantier:          chantier,
    nom_employe:       scannedEmployee.nom,
    salaire_journalier: scannedEmployee.salaire_journalier || 0,
    nb_jours:          1,
    a_payer:           scannedEmployee.salaire_journalier || 0,
  });

  if (error) return handleError(error, 'enregistrerPointage');
  showNotification('Pointage enregistré ✓', 'success');
  document.getElementById('qr-result').style.display = 'none';
  scannedEmployee = null;
  loadPointageTable();
}

async function deletePointage(id) {
  if (!confirm('Supprimer ce pointage ?')) return;
  const { error } = await db.from('pointage').delete().eq('id', id);
  if (error) return handleError(error, 'deletePointage');
  showNotification('Pointage supprimé', 'success');
  loadPointageTable();
}

// ══════════════════════════════════════════════════════════════
// CHANTIERS — liste déroulante
// ══════════════════════════════════════════════════════════════

async function loadChantiers() {
  const { data, error } = await db.from('chantiers').select('id, nom').order('code');
  if (error || !data) return;

  // Remplir tous les selects "chantier"
  document.querySelectorAll('select[id*="chantier"], select[name*="chantier"]').forEach(sel => {
    const current = sel.value;
    const placeholder = sel.options[0];
    sel.innerHTML = '';
    if (placeholder) sel.appendChild(placeholder);
    data.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.nom;
      opt.textContent = c.nom;
      if (c.code === current) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

// ══════════════════════════════════════════════════════════════
// DASHBOARD — statistiques en temps réel
// ══════════════════════════════════════════════════════════════

async function updateDashboardStats() {
  // Projets / chantiers
  const { count: nbChantiers } = await db
    .from('chantiers').select('*', { count: 'exact', head: true })
    .eq('actif', true);

  // Total dépenses journal (année en cours)
  const annee = new Date().getFullYear();
  const { data: depData } = await db
    .from('journal')
    .select('montant')
    .gte('date', `${annee}-01-01`);
  const totalDep = (depData || []).reduce((s, r) => s + r.montant, 0);

  // Personnel actif
  const { count: nbPersonnel } = await db
    .from('personnel').select('*', { count: 'exact', head: true })
    .eq('actif', true);

  // Matériaux total
  const { count: nbMat } = await db
    .from('materiels').select('*', { count: 'exact', head: true });

  // Mettre à jour les stat-cards du dashboard
  const cards = document.querySelectorAll('#dashboard .stat-card .stat-info');
  if (cards[0]) cards[0].querySelector('h3').textContent = nbChantiers || 0;
  if (cards[1]) cards[1].querySelector('h3').textContent = formatAriary(totalDep);
  if (cards[2]) cards[2].querySelector('h3').textContent = nbPersonnel || 0;
  if (cards[3]) cards[3].querySelector('h3').textContent = nbMat || 0;

  // Mettre à jour les graphiques
  loadRevenueChart();
  loadProjectChart();
}

async function loadRevenueChart() {
  const { data } = await db
    .from('v_depenses_par_mois')
    .select('mois, total')
    .order('mois');

  if (!data || !data.length) return;

  // Regrouper par mois
  const byMonth = {};
  data.forEach(r => {
    const m = new Date(r.mois).toLocaleDateString('fr-FR', { month: 'short' });
    byMonth[m] = (byMonth[m] || 0) + r.total;
  });

  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;

  // Détruire l'ancien chart si existe
  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Object.keys(byMonth),
      datasets: [{
        label: 'Dépenses (Ar)',
        data: Object.values(byMonth),
        borderColor: '#E8631A',
        backgroundColor: 'rgba(232,99,26,0.1)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function loadProjectChart() {
  const { data } = await db.from('chantiers').select('statut');
  if (!data) return;

  const counts = { 'EN COURS': 0, 'TERMINE': 0, 'EN PAUSE': 0 };
  data.forEach(r => { counts[r.statut] = (counts[r.statut] || 0) + 1; });

  const ctx = document.getElementById('projectChart');
  if (!ctx) return;

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['#0066cc','#28a745','#ffc107'] }]
    },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

// ══════════════════════════════════════════════════════════════
// QR CODE — enrichi avec données Supabase
// ══════════════════════════════════════════════════════════════

async function generateAllQRCodes() {
  const { data, error } = await db.from('personnel').select('*').eq('actif', true).order('nom');
  if (error) return handleError(error, 'generateAllQRCodes');

  const container = document.getElementById('qr-codes-container');
  if (!container) return;
  container.innerHTML = '';

  data.forEach((emp, i) => {
    const div = document.createElement('div');
    div.style.cssText = 'text-align:center;padding:10px;border:1px solid #ddd;border-radius:5px;';

    const canvas = document.createElement('canvas');
    canvas.id = `qr-${emp.id}`;
    div.appendChild(canvas);

    div.innerHTML += `<p style="font-size:12px;font-weight:bold;margin-top:5px">${emp.nom}</p>
                      <p style="font-size:10px;color:#666">${emp.metier || ''}</p>`;
    container.appendChild(div);

    QRCode.toCanvas(canvas, JSON.stringify({
      id: emp.id,
      nom: emp.nom,
      metier: emp.metier,
      chantier: emp.chantier,
      salaire_journalier: emp.salaire_journalier
    }), { width: 120, margin: 2, color: { dark: '#1C2B3A', light: '#ffffff' } });
  });

  showNotification(`${data.length} QR Codes générés ✓`, 'success');
}

// ══════════════════════════════════════════════════════════════
// EXPORT EXCEL depuis Supabase
// ══════════════════════════════════════════════════════════════

async function exportJournalToExcel() {
  const { data, error } = await db.from('journal').select('*').order('date');
  if (error) return handleError(error, 'exportJournalToExcel');

  const ws = XLSX.utils.json_to_sheet(data.map(r => ({
    'Date':             r.date,
    'Chantier':         r.chantier,
    'Désignation':      r.designation,
    'Montant (Ar)':     r.montant,
    'Mode paiement':    r.mode_paiement,
    'Catégorie':        r.categorie,
    'Travaux':          r.travaux,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Journal 2026');
  XLSX.writeFile(wb, `JOURNAL_NYSOA_${new Date().toISOString().split('T')[0]}.xlsx`);
  showNotification('Export Journal Excel ✓', 'success');
}

async function exportPointageToExcel() {
  const { data, error } = await db.from('pointage').select('*').order('semaine_du');
  if (error) return handleError(error, 'exportPointageToExcel');

  const ws = XLSX.utils.json_to_sheet(data.map(r => ({
    'Semaine du':       r.semaine_du,
    'Chantier':         r.chantier,
    'Employé':          r.nom_employe,
    'Nb jours':         r.nb_jours,
    'Salaire/jour':     r.salaire_journalier,
    'Total avances':    r.total_avances,
    'À payer':          r.a_payer,
  })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pointage 2026');
  XLSX.writeFile(wb, `POINTAGE_NYSOA_${new Date().toISOString().split('T')[0]}.xlsx`);
  showNotification('Export Pointage Excel ✓', 'success');
}

// ══════════════════════════════════════════════════════════════
// INITIALISATION — remplace initializeData() de script.js
// ══════════════════════════════════════════════════════════════

async function initSupabase() {
  console.log('[Supabase] Connexion...', SUPABASE_URL);
  try {
    // Test de connexion
    const { error } = await db.from('chantiers').select('code').limit(1);
    if (error) throw error;
    console.log('[Supabase] ✓ Connecté');
    showNotification('Connecté à Supabase ✓', 'success');

    // Charger toutes les données
    await Promise.all([
      updateDashboardStats(),
      loadJournalTable(),
      loadAchatsTable(),
      loadPersonnelTable(),
      loadLogistiqueTable(),
      loadPointageTable(),
      loadChantiers(),
    ]);

  } catch (err) {
    console.error('[Supabase] Erreur connexion:', err);
    showNotification('⚠ Supabase non configuré — mode localStorage actif', 'warning');
    // Fallback : garder localStorage (script.js original)
    if (typeof initializeData === 'function') initializeData();
    if (typeof loadAllData === 'function') loadAllData();
  }
}

// Démarrage automatique
document.addEventListener('DOMContentLoaded', initSupabase);

// ── Écoute temps réel (live updates) ─────────────────────────
db.channel('nysoa-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'journal' },
      () => loadJournalTable())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'achats' },
      () => loadAchatsTable())
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pointage' },
      () => loadPointageTable())
  .subscribe();

console.log('[NYSOA BTP] Module Supabase chargé ✓');
