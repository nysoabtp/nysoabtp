// ============================================================
// NYSOA BTP — import-excel.js v3.0
// Import complet : ACHAT · JOURNAL · PERSONNEL · LOGISTIQUE
// Tous les onglets, toutes les données
// ============================================================

// ── UTILITAIRES ──────────────────────────────────────────────
function sheetToRows(wb, sheetName) {
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Onglet introuvable : "${sheetName}". Disponibles : ${wb.SheetNames.join(', ')}`);
    return XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
}

function toISODate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string') {
        const dmY = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dmY) return `${dmY[3]}-${dmY[2].padStart(2,'0')}-${dmY[1].padStart(2,'0')}`;
        const iso = val.match(/^(\d{4}-\d{2}-\d{2})/);
        if (iso) return iso[1];
    }
    return null;
}

function toNum(val, fallback = 0) {
    if (val === null || val === undefined || val === '') return fallback;
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.startsWith('=')) {
        try {
            const safe = val.slice(1).replace(/[^0-9+\-*/().]/g, '');
            const result = Function('"use strict"; return (' + safe + ')')();
            return isFinite(result) ? result : fallback;
        } catch { return fallback; }
    }
    const n = parseFloat(String(val).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : fallback;
}

async function batchInsert(table, rows, chunkSize = 50) {
    let inserted = 0, errors = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const { error } = await db.from(table).insert(rows.slice(i, i + chunkSize));
        if (error) { console.error(`[Import] ${table} chunk ${i}:`, error.message); errors += Math.min(chunkSize, rows.length - i); }
        else inserted += Math.min(chunkSize, rows.length - i);
    }
    return { inserted, errors };
}

function showMsg(msg, type = 'info') {
    if (typeof showNotification === 'function') showNotification(msg, type);
    else console.log(`[Import ${type}]`, msg);
}

// ── ENTRÉE PRINCIPALE ─────────────────────────────────────────
function importExcelFile(input, module) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true, raw: false });
            showMsg(`Lecture de ${file.name}…`, 'info');
            switch (module) {
                case 'achats':     await importAchats(wb);     break;
                case 'journal':    await importJournal(wb);    break;
                case 'personnel':  await importPersonnel(wb);  break;
                case 'logistique': await importLogistique(wb); break;
                case 'antoka':     await importAntoka(wb);     break;
                case 'caisse':     await importCaisse(wb);     break;
                case 'catalogue':  await importCatalogue(wb);  break;
                case 'contrats':   await importContrats(wb);   break;
                default: showMsg(`Module inconnu : ${module}`, 'error');
            }
        } catch (err) {
            console.error('[Import Excel]', err);
            showMsg('Erreur lecture Excel : ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
}

// ══════════════════════════════════════════════════════════════
// ACHAT_2026.xlsx — 4 onglets
// ══════════════════════════════════════════════════════════════
async function importAchats(wb) {
    let total = { inserted: 0, errors: 0 };

    // ── Onglet DETAIL ACHAT → table commandes
    if (wb.SheetNames.includes('DETAIL ACHAT')) {
        const rows = sheetToRows(wb, 'DETAIL ACHAT');
        const records = rows
            .filter(r => r['LIBELLES'] && r['PRIX'] !== null)
            .map(r => ({
                date: toISODate(r['DATE']), chantier: r['CHANTIER'] || null,
                libelle: String(r['LIBELLES']).trim(), quantite: toNum(r['QUANTITE'], 1),
                prix: toNum(r['PRIX']), fournisseur: r['FOURNISSEUR'] || null,
                mode_paiement: r['MODE DE PAIEMENT'] || null, statut: 'OK',
            }));
        const res = await batchInsert('commandes', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`DETAIL ACHAT : ${res.inserted} achats importés`, 'info');
    }

    // ── Onglet PRIX → table catalogue_prix
    if (wb.SheetNames.includes('PRIX')) {
        const rows = sheetToRows(wb, 'PRIX');
        const records = rows
            .filter(r => r['DESIGNATION'])
            .map(r => ({
                designation: String(r['DESIGNATION']).trim(),
                prix_unitaire: toNum(r['PRIX UNITAIRE']),
                unite: r['UNITE'] ? String(r['UNITE']).trim() : null,
                fournisseur: r['FOURNISSEUR'] ? String(r['FOURNISSEUR']).trim() : null,
            }));
        const res = await batchInsert('catalogue_prix', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`PRIX : ${res.inserted} articles catalogue importés`, 'info');
    }

    // ── Onglet RESUME → table credits_fournisseurs
    if (wb.SheetNames.includes('RESUME')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['RESUME'], { header: 1, defval: null, raw: false });
        // Ligne 0 = en-têtes fusionnés, Ligne 1 = sous-en-têtes, Ligne 2+ = données
        const records = [];
        for (const row of raw.slice(2)) {
            if (!row || !row[0]) continue;
            const fourn = String(row[0]).trim();
            if (!fourn || fourn === 'FOURNISSEUR') continue;
            records.push({
                fournisseur: fourn,
                montant_total: toNum(row[1]),
                date1: toISODate(row[2]), montant1: toNum(row[3]), reste1: toNum(row[4]),
                date2: toISODate(row[5]), montant2: toNum(row[6]), reste2: toNum(row[7]),
                date3: toISODate(row[8]), montant3: toNum(row[9]), reste3: toNum(row[10]),
            });
        }
        const res = await batchInsert('credits_fournisseurs', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`RESUME : ${res.inserted} crédits fournisseurs importés`, 'info');
    }

    // ── Onglet COMMANDE → table commandes (bons de commande)
    if (wb.SheetNames.includes('COMMANDE')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['COMMANDE'], { header: 1, defval: null, raw: false });
        let currentDate = null, currentChantier = null;
        const records = [];
        for (const row of raw.slice(2)) {
            if (!row) continue;
            if (row[0]) currentDate     = toISODate(row[0]);
            if (row[1]) currentChantier = String(row[1]).trim();
            const libelle = row[2] ? String(row[2]).trim() : null;
            if (!libelle) continue;
            records.push({
                date: currentDate, chantier: currentChantier,
                libelle, prix: toNum(row[3]),
                quantite: toNum(row[4], 1),
                statut: row[10] === 'OK' ? 'OK' : 'EN ATTENTE',
            });
        }
        const res = await batchInsert('commandes', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`COMMANDE : ${res.inserted} bons de commande importés`, 'info');
    }

    showMsg(`✓ ACHAT complet : ${total.inserted} enregistrements. Erreurs : ${total.errors}`,
        total.errors ? 'warning' : 'success');
    if (typeof loadAchatsTable === 'function') loadAchatsTable();
    if (typeof loadCatalogue   === 'function') loadCatalogue();
    if (typeof loadCredits     === 'function') loadCredits();
}

// ══════════════════════════════════════════════════════════════
// JOURNAL_2026.xlsx — 3 onglets
// ══════════════════════════════════════════════════════════════
async function importJournal(wb) {
    let total = { inserted: 0, errors: 0 };

    // ── Onglet JOURNAL → table journal
    if (wb.SheetNames.includes('JOURNAL')) {
        const rows = sheetToRows(wb, 'JOURNAL');
        const records = rows
            .filter(r => r['DESIGNATION'] && r['MONTANT'] !== null)
            .map(r => ({
                date: toISODate(r['DATE']), chantier: r['CHANTIER'] || null,
                designation: String(r['DESIGNATION']).trim(),
                montant: toNum(r['MONTANT']),
                mode_paiement: r['MODE DE PAIEMENT'] || null,
                categorie: r['CATEGORIE'] || null,
                travaux: r['TRAVAUX'] || null,
            }));
        const res = await batchInsert('journal', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`JOURNAL : ${res.inserted} écritures importées`, 'info');
    }

    // ── Onglet BUDGET FELANA → table caisse
    if (wb.SheetNames.includes('BUDGET FELANA')) {
        const rows = sheetToRows(wb, 'BUDGET FELANA');
        const records = rows
            .filter(r => r['DESIGNATION'] && r['MONTANT'] !== null)
            .map(r => ({
                date: toISODate(r['DATE']),
                solde_debut: toNum(r['DEBUT']),
                designation: String(r['DESIGNATION']).trim(),
                montant: toNum(r['MONTANT']),
                solde_fin: toNum(r['RESTE']),
            }));
        const res = await batchInsert('caisse', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`BUDGET FELANA : ${res.inserted} mouvements caisse importés`, 'info');
    }

    showMsg(`✓ JOURNAL complet : ${total.inserted} enregistrements. Erreurs : ${total.errors}`,
        total.errors ? 'warning' : 'success');
    if (typeof loadJournalTable === 'function') loadJournalTable();
    if (typeof loadCaisse       === 'function') loadCaisse();
}

// ══════════════════════════════════════════════════════════════
// PERSONNEL_2026.xlsx — 4 onglets
// ══════════════════════════════════════════════════════════════
async function importPersonnel(wb) {
    let total = { inserted: 0, errors: 0 };

    // ── Onglet SALAIRE MENSUEL → table personnel
    if (wb.SheetNames.includes('SALAIRE MENSUEL')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['SALAIRE MENSUEL'],
            { header: 1, defval: null, raw: false });
        let headerIdx = raw.findIndex(r => r && r.some(c => String(c||'').trim().toUpperCase() === 'NOMS'));
        if (headerIdx === -1) headerIdx = 0;
        const headers = raw[headerIdx].map(c => String(c||'').trim().toUpperCase());
        const iNom = headers.indexOf('NOMS'), iSal = headers.indexOf('SALAIRE');
        if (iNom !== -1 && iSal !== -1) {
            const records = raw.slice(headerIdx + 1)
                .filter(r => r && r[iNom] && String(r[iNom]).toUpperCase() !== 'TOTAL')
                .map(r => ({ nom: String(r[iNom]).trim(), salaire_journalier: toNum(r[iSal]), type_salaire: 'MENSUEL', actif: true }))
                .filter(r => r.salaire_journalier > 0);
            const res = await batchInsert('personnel', records);
            total.inserted += res.inserted; total.errors += res.errors;
            showMsg(`SALAIRE MENSUEL : ${res.inserted} employés importés`, 'info');
        }
    }

    // ── Onglet BASE → table personnel (journaliers)
    if (wb.SheetNames.includes('BASE')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['BASE'], { header: 1, defval: null, raw: false });
        const records = raw
            .filter(r => r && r[1] && r[2])
            .map(r => ({ nom: String(r[1]).trim(), chantier: r[0] ? String(r[0]).trim() : null, salaire_journalier: toNum(r[2]), metier: r[3] ? String(r[3]).trim() : null, type_salaire: 'JOURNALIER', actif: true }))
            .filter(r => r.salaire_journalier > 0 && r.salaire_journalier < 100000);
        const res = await batchInsert('personnel', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`BASE : ${res.inserted} journaliers importés`, 'info');
    }

    // ── Onglet POINTAGE ET AVANCE → table pointage
    if (wb.SheetNames.includes('POINTAGE ET AVANCE')) {
        const rows = sheetToRows(wb, 'POINTAGE ET AVANCE');
        const records = rows
            .filter(r => r['NOMS'] && r['SEMAINE DU'])
            .map(r => ({
                semaine_du: toISODate(r['SEMAINE DU']),
                chantier: r['CHANTIER'] || null,
                nom_employe: String(r['NOMS']).trim(),
                salaire_journalier: toNum(r['SALAIRE JOURNALIER']),
                nb_jours: toNum(r['NB JOURS']),
                total_avances: toNum(r['TOTAL AVANCES']),
                a_payer: toNum(r['A PAYER']),
            }));
        const res = await batchInsert('pointage', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`POINTAGE : ${res.inserted} lignes importées`, 'info');
    }

    // ── Onglet ANTOKA → table antoka
    if (wb.SheetNames.includes('ANTOKA')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['ANTOKA'],
            { header: 1, defval: null, raw: false });
        // Structure : colonnes = [NOM_EMPLOYE, PAYE, RESTE] répétées
        // Ligne 0 = noms des employés (tous les 3 colonnes)
        const records = [];
        const headerRow = raw[0] || [];
        // Trouver les noms des employés (colonnes index 0, 3, 6, 9...)
        for (let col = 0; col < headerRow.length; col += 3) {
            const employe = headerRow[col] ? String(headerRow[col]).trim() : null;
            if (!employe || employe === 'nan' || employe === 'PAYE' || employe === 'RESTE') continue;
            // Extraire le chantier du nom (entre parenthèses)
            const match = employe.match(/\(([^)]+)\)/);
            const chantier = match ? match[1] : null;
            // Lire les lignes de paiements
            let montantDepart = 0;
            let totalPaye = 0;
            for (const row of raw.slice(1)) {
                if (!row || !row[col]) continue;
                const val = String(row[col]).trim();
                if (val.toUpperCase() === 'DEPART') { montantDepart = toNum(row[col + 2]); continue; }
                const datePmt = toISODate(val);
                const montantPmt = toNum(row[col + 1]);
                if (datePmt && montantPmt > 0) { totalPaye += montantPmt; }
            }
            if (montantDepart > 0) {
                records.push({
                    employe, chantier,
                    montant_depart: montantDepart,
                    montant_paye: totalPaye,
                    reste: Math.max(0, montantDepart - totalPaye),
                    date: new Date().toISOString().split('T')[0],
                });
            }
        }
        const res = await batchInsert('antoka', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`ANTOKA : ${res.inserted} employés importés`, 'info');
    }

    // ── Onglet CONTRAT ENCOURS → table contrats
    if (wb.SheetNames.includes('CONTRAT ENCOURS')) {
        const rows = sheetToRows(wb, 'CONTRAT ENCOURS');
        const records = rows
            .filter(r => r['CONTRAT ENCOURS'] || r['PRESTATAIRE'])
            .map(r => ({
                designation: r['CONTRAT ENCOURS'] ? String(r['CONTRAT ENCOURS']).trim() : '—',
                prestataire: r['PRESTATAIRE'] ? String(r['PRESTATAIRE']).trim() : null,
                chantier: r['CHANTIER'] ? String(r['CHANTIER']).trim() : null,
                prix_convenu: r['PRIX CONVENU'] ? String(r['PRIX CONVENU']).trim() : null,
                date_debut: toISODate(r['DATE DE DEBUT']),
                date_fin_prevue: toISODate(r['DATE PREVUE FIN']),
                date_fin: toISODate(r['DATE FIN']),
                statut: 'EN COURS',
            }));
        const res = await batchInsert('contrats', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`CONTRATS : ${res.inserted} contrats importés`, 'info');
    }

    showMsg(`✓ PERSONNEL complet : ${total.inserted} enregistrements. Erreurs : ${total.errors}`,
        total.errors ? 'warning' : 'success');
    if (typeof loadPersonnelTable === 'function') loadPersonnelTable();
    if (typeof loadAntoka         === 'function') loadAntoka();
    if (typeof loadContrats       === 'function') loadContrats();
}

// ══════════════════════════════════════════════════════════════
// LOGISTIQUE_2026.xlsx — 3 onglets
// ══════════════════════════════════════════════════════════════
async function importLogistique(wb) {
    let total = { inserted: 0, errors: 0 };

    // ── Onglet MATERIAUX → table materiels
    if (wb.SheetNames.includes('MATERIAUX')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['MATERIAUX'],
            { header: 1, defval: null, raw: false });
        const records = raw.slice(1)
            .filter(r => r && r[2])
            .map(r => ({
                libelle: String(r[2]).trim(),
                etat: r[0] ? String(r[0]).trim() : 'EN MARCHE',
                quantite: toNum(r[1], 0),
                chantier_actuel: r.slice(3).filter(Boolean).slice(-1)[0] || null,
            }));
        const res = await batchInsert('materiels', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`MATERIAUX : ${res.inserted} matériels importés`, 'info');
    }

    // ── Onglet STOCKS → table stock (quantité = dernière colonne date)
    if (wb.SheetNames.includes('STOCKS')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['STOCKS'],
            { header: 1, defval: null, raw: false });
        const headerRow = raw[0] || [];
        // Trouver la dernière colonne date (quantité la plus récente)
        const lastDateCol = headerRow.length - 1;
        let refCounter = 1;
        const records = raw.slice(1)
            .filter(r => r && r[1])
            .map(r => ({
                reference: 'STK-' + String(refCounter++).padStart(3, '0'),
                nom: String(r[1]).trim(),
                categorie: 'Matériaux',
                quantite: toNum(r[lastDateCol], 0),
                unite: 'Unité',
                emplacement: r[0] ? String(r[0]).trim() : null,
                seuil_alerte: 0,
            }));
        const res = await batchInsert('stock', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`STOCKS : ${res.inserted} articles importés`, 'info');
    }

    // ── Onglet NECESSITE EN STOCK → table catalogue_prix (besoins à commander)
    if (wb.SheetNames.includes('NECESSITE EN STOCK')) {
        const rows = sheetToRows(wb, 'NECESSITE EN STOCK');
        const records = rows
            .filter(r => r['DESIGNATIONS'])
            .map(r => ({
                designation: String(r['DESIGNATIONS']).trim(),
                prix_unitaire: toNum(r['PRIX DE GROS']),
                fournisseur: r['FOURNISSEURS'] ? String(r['FOURNISSEURS']).trim() : null,
                unite: 'Unité',
            }));
        const res = await batchInsert('catalogue_prix', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`NECESSITE EN STOCK : ${res.inserted} articles ajoutés au catalogue`, 'info');
    }

    showMsg(`✓ LOGISTIQUE complet : ${total.inserted} enregistrements. Erreurs : ${total.errors}`,
        total.errors ? 'warning' : 'success');
    if (typeof loadLogistiqueTable === 'function') loadLogistiqueTable();
    if (typeof loadCatalogue       === 'function') loadCatalogue();
}

// ── Imports directs depuis les nouveaux modules ───────────────
async function importAntoka(wb)    { await importPersonnel(wb); }
async function importCaisse(wb)    { await importJournal(wb); }
async function importCatalogue(wb) { await importAchats(wb); }
async function importContrats(wb)  { await importPersonnel(wb); }

// ── Diagnostic ───────────────────────────────────────────────
function diagExcel(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        alert(`Onglets dans "${file.name}" :\n` + wb.SheetNames.map((s,i) => `  ${i+1}. ${s}`).join('\n'));
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
}

console.log('[NYSOA BTP] import-excel.js v3.0 chargé ✓');
