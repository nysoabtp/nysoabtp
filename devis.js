// ============================================================
// NYSOA BTP — devis.js
// Module complet : éditeur de devis par lots, CRUD Supabase,
// import PDF (données extraites), export impression
// Dépendances : supabase.js (db, formatAriary, today, showNotification)
//               xlsx.full.min.js (pour export Excel)
// ============================================================

// ── ÉTAT GLOBAL ───────────────────────────────────────────────
let devisListe     = [];    // liste des devis pour le tableau
let devisEnCours   = null;  // { id?, numero, date, client, lieu, contact, objet, tva, statut, lots[] }
let devisModifie   = false;

// ── UTILITAIRES ───────────────────────────────────────────────
function fmtAr(n) {
    if (!n && n !== 0) return '—';
    return new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' Ar';
}

function lotTotal(lot) {
    return (lot.lignes || []).reduce((s, l) => s + (parseFloat(l.quantite) || 0) * (parseFloat(l.prix_unit) || 0), 0);
}

function devisTotal(d) {
    return (d.lots || []).reduce((s, lot) => s + lotTotal(lot), 0);
}

function numRomain(n) {
    const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV'];
    return r[n - 1] || String(n);
}

function totalEnLettres(n) {
    const MILLIONS = ['','un million','deux millions','trois millions','quatre millions','cinq millions',
        'six millions','sept millions','huit millions','neuf millions','dix millions','vingt millions',
        'trente millions','quarante millions','cinquante millions','soixante millions','soixante-dix millions',
        'quatre-vingts millions','quatre-vingt-dix millions','cent millions','cent dix millions'];
    const m = Math.floor(n / 1000000);
    const rest = Math.round(n % 1000000);
    const mStr = (m > 0 && m < MILLIONS.length) ? MILLIONS[m] : (m > 0 ? m + ' millions' : '');
    const rStr = rest > 0 ? rest.toLocaleString('fr-FR') + ' ' : '';
    return ('Arrêté à la somme de : ' + (mStr + (mStr && rest ? ' ' : '') + rStr + 'ariary').trim().toUpperCase() + '.').replace(/  +/g, ' ');
}

// ── CHARGEMENT LISTE DEVIS ────────────────────────────────────
async function loadDevisTable() {
    const tbody = document.getElementById('devis-tbody');
    const statTotal = document.getElementById('devis-stat-total');
    const statAcceptes = document.getElementById('devis-stat-acceptes');
    const statAttente = document.getElementById('devis-stat-attente');
    if (!tbody) return;

    const { data, error } = await db.from('devis').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) { handleError(error, 'loadDevisTable'); return; }
    devisListe = data || [];

    // Stats
    if (statTotal)   statTotal.textContent   = devisListe.length;
    if (statAcceptes) statAcceptes.textContent = devisListe.filter(d => d.statut === 'ACCEPTE').length;
    if (statAttente)  statAttente.textContent  = devisListe.filter(d => d.statut === 'ENVOYE' || d.statut === 'BROUILLON').length;

    tbody.innerHTML = '';
    if (!devisListe.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#888;padding:24px">Aucun devis — créez votre premier devis</td></tr>';
        return;
    }

    devisListe.forEach(d => {
        const statutCls = { ACCEPTE: 'success', REFUSE: 'danger', ENVOYE: 'warning', BROUILLON: '' }[d.statut] || '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${d.numero || '—'}</td>
            <td>${d.client || '—'}</td>
            <td>${d.objet ? d.objet.substring(0, 40) + (d.objet.length > 40 ? '…' : '') : '—'}</td>
            <td style="font-weight:600">${fmtAr(d.total)}</td>
            <td>${d.date ? new Date(d.date).toLocaleDateString('fr-FR') : '—'}</td>
            <td>30 jours</td>
            <td><span class="status ${statutCls}">${d.statut || 'BROUILLON'}</span></td>
            <td>
                <button class="btn-icon" title="Éditer" onclick="ouvrirEditeurDevis(${d.id})"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Imprimer" onclick="imprimerDevis(${d.id})"><i class="fas fa-print"></i></button>
                <button class="btn-icon" title="Dupliquer" onclick="dupliquerDevis(${d.id})"><i class="fas fa-copy"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="supprimerDevis(${d.id})" style="color:var(--red)"><i class="fas fa-trash"></i></button>
            </td>`;
        tbody.appendChild(tr);
    });
}

// ── OUVRIR ÉDITEUR (nouveau ou existant) ─────────────────────
async function ouvrirEditeurDevis(id = null) {
    try {
        if (id) {
            // Charger depuis Supabase
            const [{ data: dv, error: dvErr }, { data: lots }, { data: lignes }] = await Promise.all([
                db.from('devis').select('*').eq('id', id).single(),
                db.from('devis_lots').select('*').eq('devis_id', id).order('position'),
                db.from('devis_lignes').select('*').eq('devis_id', id).order('position'),
            ]);
            if (dvErr) throw dvErr;
            devisEnCours = { ...dv, lots: (lots || []).map(lot => ({
                ...lot,
                lignes: (lignes || []).filter(l => l.lot_id === lot.id),
            })) };
        } else {
            // Nouveau devis vierge — générer numéro
            let num = 'DEV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100);
            try {
                const { data: numData } = await db.rpc('next_devis_numero').single();
                if (numData) num = numData;
            } catch(e) { /* RPC absente : on garde le numéro aléatoire */ }

            devisEnCours = {
                id: null, numero: num, date: today(), client: '', lieu: '', contact: '',
                objet: '', tva: 0, statut: 'BROUILLON',
                lots: [{ _tmp: true, num: 'I', titre: 'Lot 1', lignes: [] }],
            };
        }
        devisModifie = false;
        renderEditeurDevis();
        document.getElementById('editeur-devis-overlay').style.display = 'flex';
    } catch(err) {
        console.error('[Devis] ouvrirEditeurDevis:', err);
        if (typeof showNotification === 'function')
            showNotification('Erreur ouverture devis : ' + (err.message || err), 'error');
    }
}

function fermerEditeurDevis() {
    if (devisModifie && !confirm('Des modifications non sauvegardées seront perdues. Continuer ?')) return;
    document.getElementById('editeur-devis-overlay').style.display = 'none';
    devisEnCours = null;
}

// ── RENDER ÉDITEUR ────────────────────────────────────────────
function renderEditeurDevis() {
    if (!devisEnCours) return;
    const d = devisEnCours;

    // En-tête
    document.getElementById('ed-numero').value  = d.numero  || '';
    document.getElementById('ed-date').value    = d.date    || today();
    document.getElementById('ed-client').value  = d.client  || '';
    document.getElementById('ed-lieu').value    = d.lieu    || '';
    document.getElementById('ed-contact').value = d.contact || '';
    document.getElementById('ed-objet').value   = d.objet   || '';
    document.getElementById('ed-statut').value  = d.statut  || 'BROUILLON';

    renderLots();
    updateTotauxEditeur();
}

function renderLots() {
    const container = document.getElementById('ed-lots-container');
    if (!container) return;
    container.innerHTML = '';

    (devisEnCours.lots || []).forEach((lot, li) => {
        const t = lotTotal(lot);
        const open = lot._open !== false;
        const div = document.createElement('div');
        div.className = 'ed-lot';
        div.innerHTML = `
        <div class="ed-lot-header" onclick="toggleEdLot(${li})">
            <span class="ed-lot-num">${lot.num}</span>
            <input class="ed-lot-titre" value="${(lot.titre || '').replace(/"/g,'&quot;')}"
                onclick="event.stopPropagation()"
                onchange="devisEnCours.lots[${li}].titre=this.value;devisModifie=true;updateTotauxEditeur()">
            <span class="ed-lot-total">${fmtAr(t)}</span>
            <i class="fas fa-chevron-${open ? 'up' : 'down'}" style="color:#888;font-size:12px"></i>
            <button class="btn-icon ed-del-lot" title="Supprimer ce lot" onclick="event.stopPropagation();supprimerLot(${li})"><i class="fas fa-trash"></i></button>
        </div>
        <div class="ed-lot-body" style="display:${open ? 'block' : 'none'}">
            <table class="ed-table">
                <thead><tr>
                    <th style="width:36px">Réf</th>
                    <th>Désignation</th>
                    <th style="width:54px;text-align:center">Unité</th>
                    <th style="width:70px;text-align:center">Qté</th>
                    <th style="width:110px;text-align:right">P.U. (Ar)</th>
                    <th style="width:120px;text-align:right">Total (Ar)</th>
                    <th style="width:28px"></th>
                </tr></thead>
                <tbody>
                ${(lot.lignes || []).map((l, ri) => {
                    const q = parseFloat(l.quantite) || 0;
                    const p = parseFloat(l.prix_unit) || 0;
                    return `<tr>
                        <td><input value="${(l.ref || '').replace(/"/g,'&quot;')}" style="width:32px;font-size:11px;color:#888"
                            onchange="edUpdateLigne(${li},${ri},'ref',this.value)"></td>
                        <td><input value="${(l.designation || '').replace(/"/g,'&quot;')}"
                            onchange="edUpdateLigne(${li},${ri},'designation',this.value)"></td>
                        <td><input value="${(l.unite || '').replace(/"/g,'&quot;')}" style="width:50px;text-align:center"
                            onchange="edUpdateLigne(${li},${ri},'unite',this.value)"></td>
                        <td><input value="${q}" type="number" step="any" style="width:66px;text-align:center"
                            onchange="edUpdateLigne(${li},${ri},'quantite',this.value)"></td>
                        <td><input value="${p.toLocaleString('fr-FR')}" style="width:106px;text-align:right"
                            onchange="edUpdateLigne(${li},${ri},'prix_unit',this.value.replace(/[\\s\u00a0]/g,''))"></td>
                        <td style="text-align:right;font-weight:600;font-size:13px">${Math.round(q * p).toLocaleString('fr-FR')}</td>
                        <td><button class="btn-icon" style="color:var(--red)" onclick="edSupprimerLigne(${li},${ri})"><i class="fas fa-times"></i></button></td>
                    </tr>`;
                }).join('')}
                </tbody>
            </table>
            <div class="ed-add-ligne" onclick="edAjouterLigne(${li})"><i class="fas fa-plus"></i> Ajouter une ligne</div>
        </div>`;
        container.appendChild(div);
    });
}

function toggleEdLot(li) {
    devisEnCours.lots[li]._open = devisEnCours.lots[li]._open === false ? true : false;
    renderLots();
}

function edUpdateLigne(li, ri, field, val) {
    devisEnCours.lots[li].lignes[ri][field] = val;
    devisModifie = true;
    renderLots();
    updateTotauxEditeur();
}

function edSupprimerLigne(li, ri) {
    devisEnCours.lots[li].lignes.splice(ri, 1);
    devisModifie = true;
    renderLots();
    updateTotauxEditeur();
}

function edAjouterLigne(li) {
    const lot = devisEnCours.lots[li];
    const n = lot.lignes.length + 1;
    lot.lignes.push({ ref: lot.num + '.' + n, designation: '', unite: '', quantite: 1, prix_unit: 0 });
    devisModifie = true;
    renderLots();
    updateTotauxEditeur();
}

function edAjouterLot() {
    const n = devisEnCours.lots.length + 1;
    devisEnCours.lots.push({ _tmp: true, num: numRomain(n), titre: 'Nouveau lot', lignes: [], _open: true });
    devisModifie = true;
    renderLots();
    updateTotauxEditeur();
}

function supprimerLot(li) {
    if (!confirm('Supprimer ce lot et toutes ses lignes ?')) return;
    devisEnCours.lots.splice(li, 1);
    // Renuméroter
    devisEnCours.lots.forEach((l, i) => { l.num = numRomain(i + 1); });
    devisModifie = true;
    renderLots();
    updateTotauxEditeur();
}

function updateTotauxEditeur() {
    const cont = document.getElementById('ed-sous-totaux');
    const elHT = document.getElementById('ed-total-ht');
    const elTTC = document.getElementById('ed-total-ttc');
    const elLettres = document.getElementById('ed-total-lettres');
    if (!cont || !devisEnCours) return;

    cont.innerHTML = '';
    let total = 0;
    (devisEnCours.lots || []).forEach(lot => {
        const t = lotTotal(lot);
        total += t;
        const row = document.createElement('div');
        row.className = 'ed-total-row';
        row.innerHTML = `<span>Lot ${lot.num} — ${lot.titre}</span><span>${fmtAr(t)}</span>`;
        cont.appendChild(row);
    });

    const tva = (parseFloat(document.getElementById('ed-tva')?.value) || 0) / 100;
    const ttc = total * (1 + tva);

    if (elHT)  elHT.textContent  = fmtAr(total);
    if (elTTC) elTTC.textContent = fmtAr(ttc);
    if (elLettres) elLettres.textContent = totalEnLettres(Math.round(ttc));
}

// ── SAUVEGARDER DEVIS ─────────────────────────────────────────
async function sauvegarderDevis() {
    const d = devisEnCours;
    if (!d) return;

    // Lire champs entête
    d.numero  = document.getElementById('ed-numero').value.trim();
    d.date    = document.getElementById('ed-date').value;
    d.client  = document.getElementById('ed-client').value.trim();
    d.lieu    = document.getElementById('ed-lieu').value.trim();
    d.contact = document.getElementById('ed-contact').value.trim();
    d.objet   = document.getElementById('ed-objet').value.trim();
    d.tva     = parseFloat(document.getElementById('ed-tva')?.value) || 0;
    d.statut  = document.getElementById('ed-statut').value;
    d.total   = devisTotal(d);

    if (!d.client) { showNotification('Le nom du client est requis', 'error'); return; }

    const btnSave = document.getElementById('btn-save-devis');
    if (btnSave) btnSave.disabled = true;
    showNotification('Sauvegarde en cours…', 'info');

    try {
        let devisId = d.id;

        // 1. Upsert entête devis
        const payload = {
            numero: d.numero, date: d.date, client: d.client,
            lieu: d.lieu, contact: d.contact, objet: d.objet,
            tva: d.tva, statut: d.statut, total: d.total,
        };

        if (devisId) {
            const { error } = await db.from('devis').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', devisId);
            if (error) throw error;
            // Supprimer anciens lots + lignes (cascade)
            await db.from('devis_lots').delete().eq('devis_id', devisId);
        } else {
            const { data, error } = await db.from('devis').insert(payload).select('id').single();
            if (error) throw error;
            devisId = data.id;
            devisEnCours.id = devisId;
        }

        // 2. Insérer lots et lignes
        for (let li = 0; li < d.lots.length; li++) {
            const lot = d.lots[li];
            const { data: lotData, error: lotErr } = await db.from('devis_lots').insert({
                devis_id: devisId, num: lot.num, titre: lot.titre, position: li,
            }).select('id').single();
            if (lotErr) throw lotErr;

            const lotId = lotData.id;
            const lignesPayload = (lot.lignes || []).map((l, ri) => ({
                devis_id: devisId, lot_id: lotId,
                ref: l.ref || '', designation: l.designation || '',
                unite: l.unite || '', quantite: parseFloat(l.quantite) || 0,
                prix_unit: parseFloat(String(l.prix_unit || 0).replace(/[\s\u00a0]/g, '')) || 0,
                position: ri,
            })).filter(l => l.designation);

            if (lignesPayload.length) {
                const { error: ligErr } = await db.from('devis_lignes').insert(lignesPayload);
                if (ligErr) throw ligErr;
            }
        }

        devisModifie = false;
        showNotification('Devis sauvegardé ✓', 'success');
        await loadDevisTable();

    } catch (err) {
        console.error('[Devis] Erreur sauvegarde:', err);
        showNotification('Erreur sauvegarde : ' + (err.message || ''), 'error');
    } finally {
        if (btnSave) btnSave.disabled = false;
    }
}

// ── SUPPRIMER DEVIS ───────────────────────────────────────────
async function supprimerDevis(id) {
    if (!confirm('Supprimer définitivement ce devis ?')) return;
    const { error } = await db.from('devis').delete().eq('id', id);
    if (error) { handleError(error, 'supprimerDevis'); return; }
    showNotification('Devis supprimé', 'success');
    await loadDevisTable();
}

// ── DUPLIQUER DEVIS ───────────────────────────────────────────
async function dupliquerDevis(id) {
    await ouvrirEditeurDevis(id);
    devisEnCours.id = null;
    const { data: numData } = await db.rpc('next_devis_numero').single().catch(() => ({ data: null }));
    devisEnCours.numero = numData || ('DEV-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 900) + 100));
    devisEnCours.statut = 'BROUILLON';
    devisEnCours.date = today();
    renderEditeurDevis();
    showNotification('Devis dupliqué — modifiez puis sauvegardez', 'info');
}

// ── IMPRESSION ────────────────────────────────────────────────
async function imprimerDevis(id) {
    const [{ data: dv }, { data: lots }, { data: lignes }] = await Promise.all([
        db.from('devis').select('*').eq('id', id).single(),
        db.from('devis_lots').select('*').eq('devis_id', id).order('position'),
        db.from('devis_lignes').select('*').eq('devis_id', id).order('position'),
    ]);
    if (!dv) { showNotification('Devis introuvable', 'error'); return; }

    const lotsAvecLignes = (lots || []).map(lot => ({
        ...lot, lignes: (lignes || []).filter(l => l.lot_id === lot.id),
    }));
    const total = lotsAvecLignes.reduce((s, lot) =>
        s + lot.lignes.reduce((ss, l) => ss + (l.total || 0), 0), 0);
    const tva = (dv.tva || 0) / 100;
    const ttc = total * (1 + tva);

    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
<title>Devis ${dv.numero}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:20mm}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #1C2B3A}
  .firm-name{font-size:18px;font-weight:700;color:#1C2B3A}.firm-sub{font-size:11px;color:#555;margin-top:2px}
  .devis-title{text-align:right}.devis-title h1{font-size:28px;font-weight:700;letter-spacing:2px;color:#1C2B3A}
  .devis-title p{font-size:12px;color:#555;margin-top:3px}
  .client-block{background:#f5f6fa;border-radius:6px;padding:10px 14px;margin-bottom:14px}
  .client-block strong{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.5px}
  .client-block p{font-size:13px;margin-top:2px}
  .objet{margin-bottom:14px;font-size:13px;font-weight:600;color:#1C2B3A}
  .lot{margin-bottom:10px}
  .lot-header{background:#1C2B3A;color:white;padding:7px 10px;font-size:12px;font-weight:600;border-radius:4px 4px 0 0}
  table{width:100%;border-collapse:collapse}
  th{background:#f5f6fa;font-size:11px;font-weight:600;padding:6px 8px;border:1px solid #ddd;text-align:left}
  td{padding:5px 8px;border:1px solid #e8e8e8;font-size:12px}
  td.num,td.qt,td.pu,td.tot{text-align:right}
  .sous-total{text-align:right;padding:6px 8px;font-size:12px;font-weight:600;background:#f9f9f9;border:1px solid #ddd;border-top:none}
  .totaux{margin-left:auto;margin-top:14px;width:280px;border:1px solid #ddd;border-radius:4px;overflow:hidden}
  .totaux-row{display:flex;justify-content:space-between;padding:6px 12px;font-size:12px;border-bottom:1px solid #eee}
  .totaux-row:last-child{font-weight:700;font-size:13px;background:#1C2B3A;color:white;border-bottom:none}
  .lettres{margin-top:10px;font-size:11px;font-style:italic;color:#555}
  .signature{margin-top:28px;display:flex;justify-content:space-between}
  .sig-block{width:200px;text-align:center;border-top:1px solid #1C2B3A;padding-top:6px;font-size:11px;color:#555}
  @media print{body{padding:10mm}@page{margin:10mm}}
</style></head><body>
<div class="header">
  <div><div class="firm-name">NySoa BTP</div>
    <div class="firm-sub">Lot 0708 k Ambohimena Antsirabe</div>
    <div class="firm-sub">+261 34 99 498 49 · hhajatiana15@gmail.com</div>
  </div>
  <div class="devis-title"><h1>DEVIS</h1>
    <p>N° ${dv.numero}</p>
    <p>Date : ${new Date(dv.date).toLocaleDateString('fr-FR')}</p>
  </div>
</div>
<div class="client-block">
  <strong>Client</strong><p>${dv.client}</p>
  ${dv.lieu ? `<strong>Lieu des travaux</strong><p>${dv.lieu}</p>` : ''}
</div>
<div class="objet">Objet : ${dv.objet || '—'}</div>
<table style="margin-bottom:4px">
  <thead><tr><th style="width:36px">#</th><th>Désignation</th><th style="width:50px;text-align:center">Unité</th>
    <th style="width:60px;text-align:right">Qté</th><th style="width:100px;text-align:right">P.U. (Ar)</th>
    <th style="width:110px;text-align:right">Total (Ar)</th></tr></thead>
</table>
${lotsAvecLignes.map(lot => {
    const st = lot.lignes.reduce((s, l) => s + (l.total || 0), 0);
    return `<div class="lot">
      <div class="lot-header">Lot ${lot.num} — ${lot.titre}</div>
      <table><tbody>
      ${lot.lignes.map(l => `<tr>
        <td style="color:#888;font-size:11px">${l.ref || ''}</td>
        <td>${l.designation}</td>
        <td class="qt">${l.unite || ''}</td>
        <td class="qt">${(parseFloat(l.quantite) || 0).toLocaleString('fr-FR')}</td>
        <td class="pu">${(parseFloat(l.prix_unit) || 0).toLocaleString('fr-FR')}</td>
        <td class="tot">${Math.round(l.total || 0).toLocaleString('fr-FR')}</td>
      </tr>`).join('')}
      </tbody></table>
      <div class="sous-total">Sous-total Lot ${lot.num} : ${Math.round(st).toLocaleString('fr-FR')} Ar</div>
    </div>`;
}).join('')}
<div class="totaux">
  ${dv.tva > 0 ? `<div class="totaux-row"><span>Total HT</span><span>${Math.round(total).toLocaleString('fr-FR')} Ar</span></div>
  <div class="totaux-row"><span>TVA (${dv.tva}%)</span><span>${Math.round(total * tva).toLocaleString('fr-FR')} Ar</span></div>` : ''}
  <div class="totaux-row"><span>TOTAL GÉNÉRAL</span><span>${Math.round(ttc).toLocaleString('fr-FR')} Ar</span></div>
</div>
<div class="lettres">${totalEnLettres(Math.round(ttc))}</div>
<div class="signature">
  <div class="sig-block">Lu et approuvé — Le Client<br><br><br></div>
  <div class="sig-block">Le Gérant<br>HAJATIANA Hasiniaina Rivoherilaza</div>
</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
}

// ── IMPORT PDF — pré-remplir l'éditeur depuis un devis PDF ────
// Appelé par le bouton "Importer depuis PDF" dans l'éditeur.
// L'utilisateur fournit les données extraites (texte ou JSON).
// Cette version accepte un objet JS structuré (ex: extrait par IA)
function preRemplirDepuisPDF(data) {
    /*  data = {
          client, lieu, objet, date,
          lots: [{num, titre, lignes: [{ref, designation, unite, quantite, prix_unit}]}]
        }
    */
    if (!devisEnCours) return;
    if (data.client)  devisEnCours.client  = data.client;
    if (data.lieu)    devisEnCours.lieu    = data.lieu;
    if (data.objet)   devisEnCours.objet   = data.objet;
    if (data.date)    devisEnCours.date    = data.date;
    if (data.lots && data.lots.length) devisEnCours.lots = data.lots.map(lot => ({ ...lot, _open: false }));
    devisModifie = true;
    renderEditeurDevis();
    showNotification('Données PDF chargées ✓', 'success');
}

// Données du PDF Ambohimanabe — appelé par le bouton dédié
function chargerDevisAmbohimanabe() {
    preRemplirDepuisPDF({
        client: 'Mr Herman AMBOHIMANABE',
        lieu:   'Antsirabe',
        objet:  'Travaux de construction d\'une toilette, de bordure des gazon et de plomberie Antsirabe',
        date:   '2026-04-17',
        lots: [
          {num:'I', titre:'Installation et replis de chantier', lignes:[
            {ref:'1.1',designation:'Installation et replis de chantier',unite:'FFT',quantite:1,prix_unit:500000},
            {ref:'1.2',designation:'Evacuation des débris de chantier',unite:'FFT',quantite:1,prix_unit:900000},
          ]},
          {num:'II', titre:'Maçonnerie', lignes:[
            {ref:'2.1',designation:'Fouille (Concerne : Fondation)',unite:'mL',quantite:33,prix_unit:10000},
            {ref:'2.2',designation:'Confection béton de propreté dosé 250kg/m³',unite:'m³',quantite:1.98,prix_unit:250000},
            {ref:'2.3',designation:'Mise en œuvre maçonnerie moellon épaisseur 35cm',unite:'m²',quantite:13.20,prix_unit:65000},
            {ref:'2.4',designation:'Confection poteau en BA dosé 350kg/m³',unite:'m³',quantite:1.44,prix_unit:650000},
            {ref:'2.5',designation:'Confection chainage, linteau et chéneau en BA 350kg/m³',unite:'m³',quantite:2.64,prix_unit:650000},
            {ref:'2.6',designation:'Maçonnerie brique 22cm hourdée mortier de terre (Mur et regard)',unite:'m²',quantite:41.34,prix_unit:45000},
            {ref:'2.7',designation:'Mise en œuvre hérisonnage',unite:'m³',quantite:30,prix_unit:38000},
            {ref:'2.8',designation:'Confection dallage en BO dosé 300kg/m³',unite:'m³',quantite:1.44,prix_unit:350000},
            {ref:'2.9',designation:'Confection dalle auvent en BA dosée 350kg/m³',unite:'m³',quantite:0.60,prix_unit:750000},
            {ref:'2.10',designation:'Enduit finition en mortier de ciment',unite:'m²',quantite:82.68,prix_unit:25000},
          ]},
          {num:'III', titre:'Toiture', lignes:[
            {ref:'3.1',designation:'Fourniture et montage panne C 80mm',unite:'ml',quantite:37.50,prix_unit:30000},
            {ref:'3.2',designation:'Fourniture et pose toiture 0,40mm + accessoires',unite:'m²',quantite:27,prix_unit:65000},
          ]},
          {num:'IV', titre:'Tuyauterie et assainissement', lignes:[
            {ref:'4.1',designation:'Fourniture et installation plomberie complète toilette',unite:'Ens',quantite:1,prix_unit:2200000},
            {ref:'4.2',designation:'Création chéneau métallique',unite:'ml',quantite:7,prix_unit:52000},
            {ref:'4.3',designation:'Fourniture et pose tuyau PVC 100 (Descente EP, évacuation puisard)',unite:'ml',quantite:54,prix_unit:15000},
            {ref:'4.4',designation:'Confection fosse septique y compris toutes sujétions',unite:'Ens',quantite:1,prix_unit:2945000},
          ]},
          {num:'V', titre:'Ouverture', lignes:[
            {ref:'5.1',designation:'Fourniture et pose porte métallique alu 0,90m×2,1m (entrée toilette)',unite:'Uté',quantite:2,prix_unit:850000},
            {ref:'5.2',designation:'Fourniture et pose porte MDF 80cm×210cm',unite:'Uté',quantite:6,prix_unit:850000},
            {ref:'5.3',designation:'Fourniture et pose fenêtre coulissante 0,80m×0,45m',unite:'Uté',quantite:8,prix_unit:300000},
          ]},
          {num:'VI', titre:'Electricité', lignes:[
            {ref:'6.1',designation:'Fourniture et installation électrique complète intérieure',unite:'Ens',quantite:1,prix_unit:2800000},
          ]},
          {num:'VII', titre:'Carrelage', lignes:[
            {ref:'7.1',designation:'Fourniture et pose carrelage pour sol',unite:'m²',quantite:35,prix_unit:95000},
            {ref:'7.2',designation:'Fourniture et pose carrelage mural',unite:'m²',quantite:91.11,prix_unit:95000},
          ]},
          {num:'VIII', titre:'Plafonnage', lignes:[
            {ref:'8.1',designation:'Fourniture et pose plafond placoplâtre y compris sujétions',unite:'m²',quantite:30,prix_unit:85000},
          ]},
          {num:'IX', titre:'Peinture', lignes:[
            {ref:'9.1',designation:'Fourniture et application deux couches enduit bessier',unite:'m³',quantite:45,prix_unit:9500},
            {ref:'9.2',designation:'Fourniture et application deux couches peinture à l\'huile',unite:'m²',quantite:49,prix_unit:15000},
            {ref:'9.3',designation:'Fourniture et application deux couches peinture à l\'eau',unite:'m²',quantite:90,prix_unit:12000},
          ]},
          {num:'X', titre:'Divers (toilette)', lignes:[
            {ref:'10.1',designation:'Fourniture et installation coffrage',unite:'Ens',quantite:1,prix_unit:850000},
            {ref:'10.2',designation:'Fourniture et pose surpresseur 21L',unite:'Uté',quantite:1,prix_unit:1500000},
          ]},
          {num:'XI', titre:'Bordure extérieur — Divers', lignes:[
            {ref:'11.1',designation:'Fouille (Fondation)',unite:'ml',quantite:327,prix_unit:10000},
            {ref:'11.2',designation:'Confection béton de propreté dosé 250kg/m³',unite:'m³',quantite:13.08,prix_unit:250000},
            {ref:'11.3',designation:'Confection semelle fondation poteau BA 350kg/m³ (0,4×0,4×0,6m)',unite:'Uté',quantite:38,prix_unit:72000},
            {ref:'11.4',designation:'Confection muret bordure maçonnée moellon (ép.0,25m, h.0,40m)',unite:'m²',quantite:82.80,prix_unit:65000},
            {ref:'11.5',designation:'Confection muret soutènement moellon (ép.0,40m, h.0,60m)',unite:'m²',quantite:32.90,prix_unit:80000},
            {ref:'11.6',designation:'Fourniture et pose bordure béton allée 50×30×15cm',unite:'Uté',quantite:170,prix_unit:45000},
            {ref:'11.7',designation:'Finition enduit de ciment (chaperon)',unite:'m²',quantite:164.50,prix_unit:25000},
            {ref:'11.8',designation:'Finition joints surfaces apparentes (bordure)',unite:'m²',quantite:127,prix_unit:15000},
            {ref:'11.9',designation:'Fourniture et pose poteau galvanisé 6cm h.2m + peinture',unite:'Uté',quantite:38,prix_unit:49000},
            {ref:'11.10',designation:'Fourniture et pose grillage vert 2,03m×2m',unite:'Uté',quantite:37,prix_unit:190000},
          ]},
          {num:'XII', titre:'Terrassement', lignes:[
            {ref:'12.1',designation:'Terrassement allée carrossable vers parking',unite:'m³',quantite:264.60,prix_unit:25000},
            {ref:'12.2',designation:'Mise en œuvre pouzzolane pour allée carrossable',unite:'m³',quantite:132.30,prix_unit:40000},
          ]},
          {num:'XIII', titre:'Plomberie et divers', lignes:[
            {ref:'13.1',designation:'Fourniture et installation tuyauterie PEHD diam.32mm + raccords',unite:'ml',quantite:71,prix_unit:48000},
            {ref:'13.2',designation:'Fourniture et pose nourrice distribution double vanne',unite:'Uté',quantite:4,prix_unit:207000},
            {ref:'13.3',designation:'Fourniture et pose accessoires de raccordement (distribution)',unite:'Ens',quantite:1,prix_unit:900000},
            {ref:'13.4',designation:'Confection local technique gestion distribution d\'eau',unite:'Ens',quantite:1,prix_unit:1100000},
          ]},
        ]
    });
}

// ── INIT ──────────────────────────────────────────────────────
// Insère le devis Ambohimanabe dans Supabase s'il n'existe pas encore
async function seedDevisAmbohimanabe() {
    try {
        const { data, error } = await db.from('devis')
            .select('id').eq('client', 'Mr Herman AMBOHIMANABE').limit(1);
        if (error || (data && data.length > 0)) return; // déjà présent

        // Construire les données
        const donnees = {
            client: 'Mr Herman AMBOHIMANABE',
            lieu:   'Antsirabe',
            objet:  "Travaux de construction d'une toilette, de bordure des gazon et de plomberie Antsirabe",
            date:   '2026-04-17',
            lots: [
              {num:'I', titre:'Installation et replis de chantier', lignes:[
                {ref:'1.1',designation:'Installation et replis de chantier',unite:'FFT',quantite:1,prix_unit:500000},
                {ref:'1.2',designation:'Evacuation des débris de chantier',unite:'FFT',quantite:1,prix_unit:900000},
              ]},
              {num:'II', titre:'Maçonnerie', lignes:[
                {ref:'2.1',designation:'Fouille (Concerne : Fondation)',unite:'mL',quantite:33,prix_unit:10000},
                {ref:'2.2',designation:'Confection béton de propreté dosé 250kg/m³',unite:'m³',quantite:1.98,prix_unit:250000},
                {ref:'2.3',designation:'Mise en œuvre maçonnerie moellon épaisseur 35cm',unite:'m²',quantite:13.20,prix_unit:65000},
                {ref:'2.4',designation:'Confection poteau en BA dosé 350kg/m³',unite:'m³',quantite:1.44,prix_unit:650000},
                {ref:'2.5',designation:'Confection chainage, linteau et chéneau en BA 350kg/m³',unite:'m³',quantite:2.64,prix_unit:650000},
                {ref:'2.6',designation:'Maçonnerie brique 22cm hourdée mortier de terre',unite:'m²',quantite:41.34,prix_unit:45000},
                {ref:'2.7',designation:'Mise en œuvre hérisonnage',unite:'m³',quantite:30,prix_unit:38000},
                {ref:'2.8',designation:'Confection dallage en BO dosé 300kg/m³',unite:'m³',quantite:1.44,prix_unit:350000},
                {ref:'2.9',designation:'Confection dalle auvent en BA dosée 350kg/m³',unite:'m³',quantite:0.60,prix_unit:750000},
                {ref:'2.10',designation:'Enduit finition en mortier de ciment',unite:'m²',quantite:82.68,prix_unit:25000},
              ]},
              {num:'III', titre:'Toiture', lignes:[
                {ref:'3.1',designation:'Fourniture et montage panne C 80mm',unite:'ml',quantite:37.50,prix_unit:30000},
                {ref:'3.2',designation:'Fourniture et pose toiture 0,40mm + accessoires',unite:'m²',quantite:27,prix_unit:65000},
              ]},
              {num:'IV', titre:'Tuyauterie et assainissement', lignes:[
                {ref:'4.1',designation:'Fourniture et installation plomberie complète toilette',unite:'Ens',quantite:1,prix_unit:2200000},
                {ref:'4.2',designation:'Création chéneau métallique',unite:'ml',quantite:7,prix_unit:52000},
                {ref:'4.3',designation:'Fourniture et pose tuyau PVC 100',unite:'ml',quantite:54,prix_unit:15000},
                {ref:'4.4',designation:'Confection fosse septique y compris toutes sujétions',unite:'Ens',quantite:1,prix_unit:2945000},
              ]},
              {num:'V', titre:'Ouverture', lignes:[
                {ref:'5.1',designation:'Fourniture et pose porte métallique alu 0,90m×2,1m',unite:'Uté',quantite:2,prix_unit:850000},
                {ref:'5.2',designation:'Fourniture et pose porte MDF 80cm×210cm',unite:'Uté',quantite:6,prix_unit:850000},
                {ref:'5.3',designation:'Fourniture et pose fenêtre coulissante 0,80m×0,45m',unite:'Uté',quantite:8,prix_unit:300000},
              ]},
              {num:'VI', titre:'Electricité', lignes:[
                {ref:'6.1',designation:'Fourniture et installation électrique complète intérieure',unite:'Ens',quantite:1,prix_unit:2800000},
              ]},
              {num:'VII', titre:'Carrelage', lignes:[
                {ref:'7.1',designation:'Fourniture et pose carrelage pour sol',unite:'m²',quantite:35,prix_unit:95000},
                {ref:'7.2',designation:'Fourniture et pose carrelage mural',unite:'m²',quantite:91.11,prix_unit:95000},
              ]},
              {num:'VIII', titre:'Plafonnage', lignes:[
                {ref:'8.1',designation:'Fourniture et pose plafond placoplâtre y compris sujétions',unite:'m²',quantite:30,prix_unit:85000},
              ]},
              {num:'IX', titre:'Peinture', lignes:[
                {ref:'9.1',designation:'Fourniture et application deux couches enduit bessier',unite:'m³',quantite:45,prix_unit:9500},
                {ref:'9.2',designation:'Fourniture et application deux couches peinture à l'huile',unite:'m²',quantite:49,prix_unit:15000},
                {ref:'9.3',designation:'Fourniture et application deux couches peinture à l'eau',unite:'m²',quantite:90,prix_unit:12000},
              ]},
              {num:'X', titre:'Divers (toilette)', lignes:[
                {ref:'10.1',designation:'Fourniture et installation coffrage',unite:'Ens',quantite:1,prix_unit:850000},
                {ref:'10.2',designation:'Fourniture et pose surpresseur 21L',unite:'Uté',quantite:1,prix_unit:1500000},
              ]},
              {num:'XI', titre:'Bordure extérieur — Divers', lignes:[
                {ref:'11.1',designation:'Fouille (Fondation)',unite:'ml',quantite:327,prix_unit:10000},
                {ref:'11.2',designation:'Confection béton de propreté dosé 250kg/m³',unite:'m³',quantite:13.08,prix_unit:250000},
                {ref:'11.3',designation:'Confection semelle fondation poteau BA 350kg/m³',unite:'Uté',quantite:38,prix_unit:72000},
                {ref:'11.4',designation:'Confection muret bordure maçonnée moellon',unite:'m²',quantite:82.80,prix_unit:65000},
                {ref:'11.5',designation:'Confection muret soutènement moellon',unite:'m²',quantite:32.90,prix_unit:80000},
                {ref:'11.6',designation:'Fourniture et pose bordure béton allée 50×30×15cm',unite:'Uté',quantite:170,prix_unit:45000},
                {ref:'11.7',designation:'Finition enduit de ciment (chaperon)',unite:'m²',quantite:164.50,prix_unit:25000},
                {ref:'11.8',designation:'Finition joints surfaces apparentes (bordure)',unite:'m²',quantite:127,prix_unit:15000},
                {ref:'11.9',designation:'Fourniture et pose poteau galvanisé 6cm h.2m + peinture',unite:'Uté',quantite:38,prix_unit:49000},
                {ref:'11.10',designation:'Fourniture et pose grillage vert 2,03m×2m',unite:'Uté',quantite:37,prix_unit:190000},
              ]},
              {num:'XII', titre:'Terrassement', lignes:[
                {ref:'12.1',designation:'Terrassement allée carrossable vers parking',unite:'m³',quantite:264.60,prix_unit:25000},
                {ref:'12.2',designation:'Mise en œuvre pouzzolane pour allée carrossable',unite:'m³',quantite:132.30,prix_unit:40000},
              ]},
              {num:'XIII', titre:'Plomberie et divers', lignes:[
                {ref:'13.1',designation:'Fourniture et installation tuyauterie PEHD diam.32mm + raccords',unite:'ml',quantite:71,prix_unit:48000},
                {ref:'13.2',designation:'Fourniture et pose nourrice distribution double vanne',unite:'Uté',quantite:4,prix_unit:207000},
                {ref:'13.3',designation:'Fourniture et pose accessoires de raccordement',unite:'Ens',quantite:1,prix_unit:900000},
                {ref:'13.4',designation:'Confection local technique gestion distribution d'eau',unite:'Ens',quantite:1,prix_unit:1100000},
              ]},
            ]
        };

        // Calculer le total
        const total = donnees.lots.reduce((s, lot) =>
            s + lot.lignes.reduce((ss, l) => ss + l.quantite * l.prix_unit, 0), 0);

        // Générer numéro
        let num = 'DEV-2026-001';
        try {
            const { data: nd } = await db.rpc('next_devis_numero').single();
            if (nd) num = nd;
        } catch(e) {}

        // Insérer entête
        const { data: devisData, error: devisErr } = await db.from('devis').insert({
            numero: num, date: donnees.date, client: donnees.client,
            lieu: donnees.lieu, objet: donnees.objet,
            tva: 0, statut: 'ENVOYE', total: total,
        }).select('id').single();
        if (devisErr) { console.error('[Seed Ambohimanabe]', devisErr); return; }

        const devisId = devisData.id;

        // Insérer lots et lignes
        for (let li = 0; li < donnees.lots.length; li++) {
            const lot = donnees.lots[li];
            const { data: lotData, error: lotErr } = await db.from('devis_lots').insert({
                devis_id: devisId, num: lot.num, titre: lot.titre, position: li,
            }).select('id').single();
            if (lotErr) continue;

            const lignesPayload = lot.lignes.map((l, ri) => ({
                devis_id: devisId, lot_id: lotData.id,
                ref: l.ref, designation: l.designation,
                unite: l.unite, quantite: l.quantite, prix_unit: l.prix_unit,
                position: ri,
            }));
            if (lignesPayload.length) await db.from('devis_lignes').insert(lignesPayload);
        }

        console.log('[NySoa] Devis Ambohimanabe importé ✓');
    } catch(e) {
        console.error('[Seed Ambohimanabe] Erreur:', e);
    }
}

// Démarrage robuste — fonctionne que DOMContentLoaded soit passé ou non
async function initDevis() {
    if (document.getElementById('devis-tbody')) {
        await seedDevisAmbohimanabe();
        await loadDevisTable();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDevis);
} else {
    // DOM déjà prêt — mais Supabase (db) doit être disponible
    if (typeof db !== 'undefined') {
        initDevis();
    } else {
        // Attendre que supabase.js initialise db
        document.addEventListener('DOMContentLoaded', initDevis);
    }
}

// Aussi appeler lors de la navigation vers la section devis
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-item[data-section="devis"]').forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(loadDevisTable, 200);
        });
    });
});

console.log('[NYSOA BTP] devis.js chargé ✓');

// ── SAUVEGARDER DIRECTEMENT LE DEVIS AMBOHIMANABE ────────────
// Appelé par le bouton : ouvre l'éditeur, charge les données,
// sauvegarde automatiquement dans Supabase, puis affiche dans la liste.
async function importerDevisAmbohimanabe() {
    showNotification('Import Ambohimanabe en cours…', 'info');
    await ouvrirEditeurDevis(null);
    chargerDevisAmbohimanabe();
    // Petite pause pour laisser renderEditeurDevis() s'exécuter
    await new Promise(r => setTimeout(r, 100));
    await sauvegarderDevis();
    document.getElementById('editeur-devis-overlay').style.display = 'none';
    devisEnCours = null;
    await loadDevisTable();
    showNotification('Devis Ambohimanabe ajouté à la liste ✓', 'success');
}

// ── FILTRE PAR STATUT ─────────────────────────────────────────
function filtrerDevis(statut) {
    const rows = document.querySelectorAll('#devis-tbody tr');
    rows.forEach(row => {
        if (!statut) { row.style.display = ''; return; }
        const statusEl = row.querySelector('.status');
        row.style.display = (statusEl && statusEl.textContent.trim() === statut) ? '' : 'none';
    });
}
