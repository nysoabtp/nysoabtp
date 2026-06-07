// ══════════════════════════════════════════════════════════════
// NYSOA BTP — modules_new.js
// Modules : Antoka · Crédit Fournisseurs · Caisse · Catalogue Prix · Contrats
// ══════════════════════════════════════════════════════════════

/* ────────────────────────────────────────────────────────────
   UTILITAIRES COMMUNS
   ──────────────────────────────────────────────────────────── */
function fmt(n) {
    if (n === null || n === undefined || n === '') return '—';
    return Number(n).toLocaleString('fr-FR') + ' Ar';
}
function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR');
}

/* ══════════════════════════════════════════════════════════════
   MODULE 1 — ANTOKA (acomptes employés)
   ══════════════════════════════════════════════════════════════ */
async function loadAntoka() {
    const el = document.getElementById('antoka-tbody');
    if (!el) return;
    el.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i> Chargement...</td></tr>';
    try {
        const { data, error } = await db.from('antoka').select('*').order('employe');
        if (error) throw error;
        const rows = data || [];
        const totalDepart = rows.reduce((s,r)=>s+(r.montant_depart||0),0);
        const totalPaye   = rows.reduce((s,r)=>s+(r.montant_paye||0),0);
        const totalReste  = rows.reduce((s,r)=>s+(r.reste||0),0);
        document.getElementById('antoka-total-depart') && (document.getElementById('antoka-total-depart').textContent = fmt(totalDepart));
        document.getElementById('antoka-total-paye')   && (document.getElementById('antoka-total-paye').textContent   = fmt(totalPaye));
        document.getElementById('antoka-total-reste')  && (document.getElementById('antoka-total-reste').textContent  = fmt(totalReste));
        if (!rows.length) { el.innerHTML = '<tr><td colspan="13" style="text-align:center;padding:30px;color:var(--text-muted)">Aucun antoka enregistré</td></tr>'; return; }
        el.innerHTML = rows.map(r => {
            const pct = r.montant_depart ? Math.round((r.montant_paye||0)/r.montant_depart*100) : 0;
            const color = pct===100 ? 'var(--green)' : pct>50 ? 'var(--orange)' : 'var(--red)';
            return `<tr>
                <td style="font-weight:600">${r.employe||'—'}</td>
                <td>${r.chantier||'—'}</td>
                <td style="font-family:monospace">${fmt(r.montant_depart)}</td>
                <td style="color:var(--green);font-family:monospace">${fmt(r.montant_paye)}</td>
                <td style="color:${r.reste>0?'var(--red)':'var(--green)'};font-weight:600;font-family:monospace">${fmt(r.reste)}</td>
                <td style="font-family:monospace">${fmt(r.tranche1)}</td>
                <td>${fmtDate(r.date_tranche1)}</td>
                <td style="font-family:monospace">${fmt(r.tranche2)}</td>
                <td>${fmtDate(r.date_tranche2)}</td>
                <td style="font-family:monospace">${fmt(r.tranche3)}</td>
                <td>${fmtDate(r.date_tranche3)}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px">
                        <div style="flex:1;height:6px;background:var(--border);border-radius:10px;overflow:hidden">
                            <div style="width:${pct}%;height:100%;background:${color};border-radius:10px"></div>
                        </div>
                        <span style="font-size:0.75rem;color:var(--text-muted);min-width:30px">${pct}%</span>
                    </div>
                </td>
                <td>
                    <button class="btn-icon" title="Ajouter paiement" onclick="openAntokaPayment(${r.id},'${(r.employe||'').replace(/'/g,"\\'")}',${r.reste||0})"><i class="fas fa-plus"></i></button>
                    <button class="btn-icon" title="Supprimer" onclick="deleteAntoka(${r.id})" style="color:var(--red)"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) {
        el.innerHTML = `<tr><td colspan="13" style="text-align:center;padding:30px;color:var(--red)">${e.message}</td></tr>`;
    }
}

function openAntokaPayment(id, employe, reste) {
    document.getElementById('ap-id').value = id;
    document.getElementById('ap-employe').textContent = employe;
    document.getElementById('ap-reste').textContent = fmt(reste);
    document.getElementById('ap-montant').value = '';
    document.getElementById('modal-antoka-payment').classList.add('active');
}

async function saveAntokaPayment() {
    const id     = document.getElementById('ap-id').value;
    const montant = parseFloat(document.getElementById('ap-montant').value)||0;
    const date    = document.getElementById('ap-date').value;
    if (!montant || !date) { alert('Remplissez montant et date'); return; }
    try {
        const { data: row } = await db.from('antoka').select('montant_paye,montant_depart').eq('id',id).single();
        const newPaye  = (row.montant_paye||0) + montant;
        const newReste = (row.montant_depart||0) - newPaye;
        const { error } = await db.from('antoka').update({ montant_paye: newPaye, reste: Math.max(0,newReste), date }).eq('id', id);
        if (error) throw error;
        document.getElementById('modal-antoka-payment').classList.remove('active');
        loadAntoka();
        showNotification('Paiement antoka enregistré ✓', 'success');
    } catch(e) { alert(e.message); }
}

async function saveAntoka(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const depart = parseFloat(fd.get('montant_depart'))||0;
    const paye   = parseFloat(fd.get('montant_paye'))||0;
    const t1 = parseFloat(fd.get('tranche1'))||0;
    const t2 = parseFloat(fd.get('tranche2'))||0;
    const t3 = parseFloat(fd.get('tranche3'))||0;
    const obj = {
        employe: fd.get('employe'), chantier: fd.get('chantier'),
        montant_depart: depart, montant_paye: paye,
        reste: Math.max(0, depart - paye), date: fd.get('date'), motif: fd.get('motif'),
        tranche1: t1, date_tranche1: fd.get('date_tranche1')||null,
        tranche2: t2, date_tranche2: fd.get('date_tranche2')||null,
        tranche3: t3, date_tranche3: fd.get('date_tranche3')||null
    };
    const { error } = await db.from('antoka').insert([obj]);
    if (error) { alert(error.message); return; }
    document.getElementById('modal-antoka').classList.remove('active');
    e.target.reset();
    loadAntoka();
    showNotification('Antoka ajouté ✓', 'success');
}

async function deleteAntoka(id) {
    if (!confirm('Supprimer cet antoka ?')) return;
    await db.from('antoka').delete().eq('id', id);
    loadAntoka();
    showNotification('Supprimé', 'success');
}

/* ══════════════════════════════════════════════════════════════
   MODULE 2 — CRÉDIT FOURNISSEURS
   ══════════════════════════════════════════════════════════════ */
async function loadCredits() {
    const el = document.getElementById('credits-tbody');
    if (!el) return;
    el.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    try {
        const { data, error } = await db.from('credits_fournisseurs').select('*').order('fournisseur');
        if (error) throw error;
        const rows = data || [];
        const totalDette = rows.reduce((s,r)=>s+(r.montant_total||0),0);
        const totalReste = rows.reduce((s,r)=>s+(r.reste1||0)+(r.reste2||0)+(r.reste3||0),0);
        document.getElementById('credit-total-dette') && (document.getElementById('credit-total-dette').textContent = fmt(totalDette));
        document.getElementById('credit-total-reste') && (document.getElementById('credit-total-reste').textContent = fmt(totalReste));
        if (!rows.length) { el.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:30px">Aucun crédit enregistré</td></tr>'; return; }
        el.innerHTML = rows.map(r => {
            const totalPayé = (r.montant1||0)+(r.montant2||0)+(r.montant3||0);
            const resteTotal = (r.montant_total||0) - totalPayé;
            return `<tr>
                <td style="font-weight:600">${r.fournisseur}</td>
                <td style="font-family:monospace">${fmt(r.montant_total)}</td>
                <td style="color:var(--green);font-family:monospace">${fmt(totalPayé)}</td>
                <td style="color:${resteTotal>0?'var(--red)':'var(--green)'};font-weight:600;font-family:monospace">${fmt(resteTotal)}</td>
                <td>${fmtDate(r.date1)||'—'}</td>
                <td style="font-family:monospace">${fmt(r.montant1)}</td>
                <td>${fmtDate(r.date2)||'—'}</td>
                <td style="font-family:monospace">${fmt(r.montant2)}</td>
                <td>${fmtDate(r.date3)||'—'}</td>
                <td style="font-family:monospace">${fmt(r.montant3)}</td>
                <td>
                    <button class="btn-icon" title="Ajouter échéance" onclick="openCreditPayment(${r.id})"><i class="fas fa-plus"></i></button>
                    <button class="btn-icon" title="Supprimer" onclick="deleteCredit(${r.id})" style="color:var(--red)"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) { el.innerHTML = `<tr><td colspan="11" style="color:var(--red);padding:20px">${e.message}</td></tr>`; }
}

async function saveCredit(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const mt = parseFloat(fd.get('montant_total'))||0;
    const m1 = parseFloat(fd.get('montant1'))||0;
    const m2 = parseFloat(fd.get('montant2'))||0;
    const m3 = parseFloat(fd.get('montant3'))||0;
    const obj = {
        fournisseur: fd.get('fournisseur'), montant_total: mt,
        date1: fd.get('date1')||null, montant1: m1, reste1: mt - m1,
        date2: fd.get('date2')||null, montant2: m2, reste2: Math.max(0, mt - m1 - m2),
        date3: fd.get('date3')||null, montant3: m3, reste3: Math.max(0, mt - m1 - m2 - m3)
    };
    const { error } = await db.from('credits_fournisseurs').insert([obj]);
    if (error) { alert(error.message); return; }
    document.getElementById('modal-credit').classList.remove('active');
    e.target.reset(); loadCredits();
    showNotification('Crédit fournisseur ajouté ✓', 'success');
}

async function deleteCredit(id) {
    if (!confirm('Supprimer ?')) return;
    await db.from('credits_fournisseurs').delete().eq('id',id);
    loadCredits(); showNotification('Supprimé', 'success');
}

/* ══════════════════════════════════════════════════════════════
   MODULE 3 — CAISSE (Budget interne)
   ══════════════════════════════════════════════════════════════ */
async function loadCaisse() {
    const el = document.getElementById('caisse-tbody');
    if (!el) return;
    el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    try {
        const { data, error } = await db.from('caisse').select('*').order('date',{ascending:false}).limit(200);
        if (error) throw error;
        const rows = data || [];
        const soldeActuel = rows.length ? (rows[0].solde_fin||0) : 0;
        const totalEntrees = rows.filter(r=>(r.solde_fin||0)>(r.solde_debut||0)).reduce((s,r)=>s+(r.montant||0),0);
        const totalSorties = rows.filter(r=>(r.solde_fin||0)<(r.solde_debut||0)).reduce((s,r)=>s+(r.montant||0),0);
        document.getElementById('caisse-solde')   && (document.getElementById('caisse-solde').textContent   = fmt(soldeActuel));
        document.getElementById('caisse-entrees') && (document.getElementById('caisse-entrees').textContent = fmt(totalEntrees));
        document.getElementById('caisse-sorties') && (document.getElementById('caisse-sorties').textContent = fmt(totalSorties));
        document.getElementById('caisse-nb')      && (document.getElementById('caisse-nb').textContent      = rows.length);
        if (!rows.length) { el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px">Caisse vide</td></tr>'; return; }
        el.innerHTML = rows.map(r => {
            const type = (r.solde_fin||0) > (r.solde_debut||0) ? 'entree' : 'sortie';
            const color = type === 'entree' ? 'var(--green)' : 'var(--red)';
            const sign  = type === 'entree' ? '+' : '-';
            return `<tr>
            <td>${fmtDate(r.date)}</td>
            <td>${r.designation||'—'}</td>
            <td style="color:${color};font-family:monospace">${sign}${fmt(r.montant)}</td>
            <td style="font-family:monospace;font-weight:600">${fmt(r.solde_fin)}</td>
            <td><button class="btn-icon" onclick="deleteCaisse(${r.id})" style="color:var(--red)"><i class="fas fa-trash"></i></button></td>
        </tr>`;}).join('');
    } catch(e) { el.innerHTML = `<tr><td colspan="5" style="color:var(--red);padding:20px">${e.message}</td></tr>`; }
}

function ouvrirModalCaisse(type) {
    document.getElementById('caisse-type-input').value = type;
    const title = document.getElementById('modal-caisse-title');
    if (title) title.textContent = type === 'entree' ? 'Entrée de caisse' : 'Sortie de caisse';
    document.getElementById('modal-caisse').classList.add('active');
}

async function saveCaisse(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const montant = parseFloat(fd.get('montant'))||0;
    const type = fd.get('type') || 'sortie';
    const { data: last } = await db.from('caisse').select('solde_fin').order('date',{ascending:false}).limit(1);
    const soldeDebut = last && last.length ? (last[0].solde_fin||0) : 0;
    const soldeFin   = type === 'entree' ? soldeDebut + montant : Math.max(0, soldeDebut - montant);
    const obj = { date: fd.get('date'), designation: fd.get('designation'), montant, solde_debut: soldeDebut, solde_fin: soldeFin };
    const { error } = await db.from('caisse').insert([obj]);
    if (error) { alert(error.message); return; }
    document.getElementById('modal-caisse').classList.remove('active');
    e.target.reset(); loadCaisse();
    showNotification('Mouvement caisse ajouté ✓', 'success');
}

async function deleteCaisse(id) {
    if (!confirm('Supprimer ce mouvement ?')) return;
    await db.from('caisse').delete().eq('id',id);
    loadCaisse(); showNotification('Supprimé', 'success');
}

/* ══════════════════════════════════════════════════════════════
   MODULE 4 — CATALOGUE PRIX
   ══════════════════════════════════════════════════════════════ */
async function loadCatalogue() {
    const el = document.getElementById('catalogue-tbody');
    if (!el) return;
    const search = (document.getElementById('catalogue-search')||{}).value||'';
    const fourn  = (document.getElementById('catalogue-fourn')||{}).value||'';
    el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    try {
        let q = db.from('catalogue_prix').select('*').order('designation');
        if (search) q = q.ilike('designation', `%${search}%`);
        if (fourn)  q = q.eq('fournisseur', fourn);
        const { data, error } = await q;
        if (error) throw error;
        const rows = data || [];
        document.getElementById('catalogue-count') && (document.getElementById('catalogue-count').textContent = rows.length + ' articles');
        if (!rows.length) { el.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px">Aucun article trouvé</td></tr>'; return; }
        el.innerHTML = rows.map(r => `<tr>
            <td style="font-weight:500">${r.designation||'—'}</td>
            <td style="font-family:monospace;color:var(--blue);font-weight:600">${fmt(r.prix_unitaire)}</td>
            <td>${r.unite||'—'}</td>
            <td><span style="background:var(--blue-bg);color:var(--blue);padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:600">${r.fournisseur||'—'}</span></td>
            <td>
                <button class="btn-icon" title="Utiliser dans commande" onclick="usePrix('${(r.designation||'').replace(/'/g,"\\'")}',${r.prix_unitaire||0})"><i class="fas fa-cart-plus"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deletePrix(${r.id})" style="color:var(--red)"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`).join('');
    } catch(e) { el.innerHTML = `<tr><td colspan="5" style="color:var(--red);padding:20px">${e.message}</td></tr>`; }
}

function usePrix(designation, pu) {
    showNotification(`${designation} — ${pu.toLocaleString('fr-FR')} Ar copié`, 'info');
}

async function savePrix(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = { designation: fd.get('designation'), prix_unitaire: parseFloat(fd.get('prix_unitaire'))||0, unite: fd.get('unite'), fournisseur: fd.get('fournisseur') };
    const { error } = await db.from('catalogue_prix').insert([obj]);
    if (error) { alert(error.message); return; }
    document.getElementById('modal-prix').classList.remove('active');
    e.target.reset(); loadCatalogue();
    showNotification('Article ajouté au catalogue ✓', 'success');
}

async function deletePrix(id) {
    if (!confirm('Supprimer cet article du catalogue ?')) return;
    await db.from('catalogue_prix').delete().eq('id',id);
    loadCatalogue(); showNotification('Supprimé', 'success');
}

/* ══════════════════════════════════════════════════════════════
   MODULE 5 — CONTRATS PRESTATAIRES
   ══════════════════════════════════════════════════════════════ */
async function loadContrats() {
    const el = document.getElementById('contrats-tbody');
    if (!el) return;
    el.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fas fa-spinner fa-spin"></i></td></tr>';
    try {
        const { data, error } = await db.from('contrats').select('*').order('created_at',{ascending:false});
        if (error) throw error;
        const rows = data || [];
        document.getElementById('contrats-count') && (document.getElementById('contrats-count').textContent = rows.filter(r=>r.statut==='EN COURS').length + ' en cours');
        if (!rows.length) { el.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px">Aucun contrat</td></tr>'; return; }
        el.innerHTML = rows.map(r => {
            const statusColor = r.statut==='EN COURS' ? 'var(--green)' : r.statut==='TERMINE' ? 'var(--blue)' : 'var(--orange)';
            const statusBg    = r.statut==='EN COURS' ? 'var(--green-bg)' : r.statut==='TERMINE' ? 'var(--blue-bg)' : 'var(--orange-bg)';
            return `<tr>
                <td style="font-weight:600">${r.designation||'—'}</td>
                <td>${r.prestataire||'—'}</td>
                <td>${r.chantier||'—'}</td>
                <td style="font-family:monospace">${r.prix_convenu||'—'}</td>
                <td>${fmtDate(r.date_debut)}</td>
                <td><span style="background:${statusBg};color:${statusColor};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600">${r.statut}</span></td>
                <td>
                    <button class="btn-icon" title="Terminer" onclick="cloturerContrat(${r.id})"><i class="fas fa-check"></i></button>
                    <button class="btn-icon" title="Supprimer" onclick="deleteContrat(${r.id})" style="color:var(--red)"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join('');
    } catch(e) { el.innerHTML = `<tr><td colspan="7" style="color:var(--red);padding:20px">${e.message}</td></tr>`; }
}

async function saveContrat(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = {
        designation: fd.get('designation'), prestataire: fd.get('prestataire'),
        chantier: fd.get('chantier'), prix_convenu: fd.get('prix_convenu'),
        date_debut: fd.get('date_debut')||null, date_fin_prevue: fd.get('date_fin_prevue')||null,
        statut: 'EN COURS'
    };
    const { error } = await db.from('contrats').insert([obj]);
    if (error) { alert(error.message); return; }
    document.getElementById('modal-contrat').classList.remove('active');
    e.target.reset(); loadContrats();
    showNotification('Contrat ajouté ✓', 'success');
}

async function cloturerContrat(id) {
    if (!confirm('Marquer ce contrat comme terminé ?')) return;
    const today = new Date().toISOString().split('T')[0];
    await db.from('contrats').update({ statut:'TERMINE', date_fin: today }).eq('id',id);
    loadContrats(); showNotification('Contrat clôturé ✓', 'success');
}

async function deleteContrat(id) {
    if (!confirm('Supprimer ce contrat ?')) return;
    await db.from('contrats').delete().eq('id',id);
    loadContrats(); showNotification('Supprimé', 'success');
}

/* ══════════════════════════════════════════════════════════════
   INITIALISATION — fermer modals en cliquant dehors
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    ['modal-antoka','modal-antoka-payment','modal-credit','modal-caisse','modal-prix','modal-contrat'].forEach(id => {
        const m = document.getElementById(id);
        if (m) m.addEventListener('click', e => { if(e.target === m) m.classList.remove('active'); });
    });
});
