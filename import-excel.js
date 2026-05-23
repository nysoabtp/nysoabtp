// ============================================================
// NYSOA BTP — import-excel.js
// Lecture des fichiers Excel locaux avec les bons onglets
// Mapping exact des colonnes Excel → tables Supabase
// ============================================================

/**
 * Fonction principale appelée par les boutons "Importer Excel"
 * @param {HTMLInputElement} input  - l'input file
 * @param {string}           module - 'achats' | 'journal' | 'personnel' | 'logistique'
 */
function importExcelFile(input, module) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
            showNotification(`Lecture de ${file.name}…`, 'info');

            switch (module) {
                case 'achats':    await importAchats(wb);    break;
                case 'journal':   await importJournal(wb);   break;
                case 'personnel': await importPersonnel(wb); break;
                case 'logistique': await importLogistique(wb); break;
                default:
                    showNotification(`Module inconnu : ${module}`, 'error');
            }
        } catch (err) {
            console.error('[Import Excel]', err);
            showNotification('Erreur lecture Excel : ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);

    // Reset pour permettre ré-import du même fichier
    input.value = '';
}

// ── Utilitaire : lire un onglet en JSON ──────────────────────
function sheetToRows(wb, sheetName) {
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Onglet introuvable : "${sheetName}". Onglets disponibles : ${wb.SheetNames.join(', ')}`);
    return XLSX.utils.sheet_to_json(ws, { defval: null });
}

// ── Normaliser une date Excel/JS → ISO string ─────────────────
function toISODate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return val.split('T')[0];
    return null;
}

// ── Insérer par lots de 50 ────────────────────────────────────
async function batchInsert(table, rows, chunkSize = 50) {
    let inserted = 0;
    let errors   = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await db.from(table).insert(chunk);
        if (error) {
            console.error(`[Import] ${table} chunk ${i}:`, error);
            errors += chunk.length;
        } else {
            inserted += chunk.length;
        }
    }
    return { inserted, errors };
}

// ══════════════════════════════════════════════════════════════
// ACHATS — onglet "DETAIL ACHAT"
// Colonnes : DATE, CHANTIER, LIBELLES, QUANTITE, PRIX, FOURNISSEUR, MODE DE PAIEMENT
// ══════════════════════════════════════════════════════════════
async function importAchats(wb) {
    const ONGLET = 'DETAIL ACHAT';
    let rows;
    try { rows = sheetToRows(wb, ONGLET); }
    catch (e) { showNotification(e.message, 'error'); return; }

    const records = rows
        .filter(r => r['LIBELLES'] && r['PRIX'])
        .map(r => ({
            date:          toISODate(r['DATE']),
            chantier:      r['CHANTIER']           || null,
            libelle:       r['LIBELLES']            || '',
            quantite:      parseFloat(r['QUANTITE'])|| 1,
            prix:          parseFloat(r['PRIX'])    || 0,
            fournisseur:   r['FOURNISSEUR']         || null,
            mode_paiement: r['MODE DE PAIEMENT']    || null,
            statut:        'EN ATTENTE',
        }));

    if (!records.length) { showNotification('Aucune ligne valide dans DETAIL ACHAT', 'warning'); return; }

    showNotification(`Import ${records.length} achats…`, 'info');
    const { inserted, errors } = await batchInsert('commandes', records);
    showNotification(`Achats importés : ${inserted} OK, ${errors} erreurs`, errors ? 'warning' : 'success');
    if (typeof loadAchatsTable === 'function') loadAchatsTable();
}

// ══════════════════════════════════════════════════════════════
// JOURNAL — onglet "JOURNAL"
// Colonnes : DATE, CHANTIER, DESIGNATION, MONTANT, MODE DE PAIEMENT, CATEGORIE, TRAVAUX
// ══════════════════════════════════════════════════════════════
async function importJournal(wb) {
    const ONGLET = 'JOURNAL';
    let rows;
    try { rows = sheetToRows(wb, ONGLET); }
    catch (e) { showNotification(e.message, 'error'); return; }

    const records = rows
        .filter(r => r['DESIGNATION'] && r['MONTANT'])
        .map(r => ({
            date:          toISODate(r['DATE']),
            chantier:      r['CHANTIER']            || null,
            designation:   r['DESIGNATION']         || '',
            montant:       parseFloat(r['MONTANT']) || 0,
            mode_paiement: r['MODE DE PAIEMENT']    || null,
            categorie:     r['CATEGORIE']           || null,
            travaux:       r['TRAVAUX']             || null,
        }));

    if (!records.length) { showNotification('Aucune ligne valide dans JOURNAL', 'warning'); return; }

    showNotification(`Import ${records.length} écritures…`, 'info');
    const { inserted, errors } = await batchInsert('journal', records);
    showNotification(`Journal importé : ${inserted} OK, ${errors} erreurs`, errors ? 'warning' : 'success');
    if (typeof loadJournalTable === 'function') loadJournalTable();
}

// ══════════════════════════════════════════════════════════════
// PERSONNEL — onglets "SALAIRE JOURNALIER" + "SALAIRE MENSUEL"
// Onglet POINTAGE ET AVANCE → table pointage
// ══════════════════════════════════════════════════════════════
async function importPersonnel(wb) {
    // ── 1. Personnel mensuel ──
    const mensuelRows = wb.SheetNames.includes('SALAIRE MENSUEL')
        ? sheetToRows(wb, 'SALAIRE MENSUEL')
        : [];

    const mensuelRecords = mensuelRows
        .filter(r => r['NOMS'] && r['SALAIRE'])
        .map(r => ({
            nom:               String(r['NOMS']).trim(),
            salaire_journalier: parseFloat(r['SALAIRE']) || 0,
            type_salaire:      'MENSUEL',
            actif:             true,
        }));

    // ── 2. Personnel journalier (BASE sheet: col 0=chantier, col 1=nom, col 2=salaire, col 3=metier) ──
    const baseRows = wb.SheetNames.includes('BASE')
        ? XLSX.utils.sheet_to_json(wb.Sheets['BASE'], { header: 1, defval: null })
        : [];

    const journalierRecords = baseRows
        .filter(r => r[1] && r[2] && parseFloat(r[2]) > 0 && parseFloat(r[2]) < 100000)
        .map(r => ({
            nom:               String(r[1]).trim(),
            chantier:          r[0] ? String(r[0]).trim() : null,
            salaire_journalier: parseFloat(r[2]) || 0,
            metier:            r[3] ? String(r[3]).trim() : null,
            type_salaire:      'JOURNALIER',
            actif:             true,
        }));

    const allPersonnel = [...mensuelRecords, ...journalierRecords];

    if (!allPersonnel.length) { showNotification('Aucun employé trouvé', 'warning'); return; }

    showNotification(`Import ${allPersonnel.length} employés…`, 'info');
    const { inserted: p1, errors: e1 } = await batchInsert('personnel', allPersonnel);

    // ── 3. Pointage ──
    let p2 = 0, e2 = 0;
    if (wb.SheetNames.includes('POINTAGE ET AVANCE')) {
        const ptRows = sheetToRows(wb, 'POINTAGE ET AVANCE');
        const ptRecords = ptRows
            .filter(r => r['NOMS'] && r['SEMAINE DU'])
            .map(r => ({
                semaine_du:         toISODate(r['SEMAINE DU']),
                chantier:           r['CHANTIER']              || null,
                nom_employe:        String(r['NOMS']).trim(),
                salaire_journalier: parseFloat(r['SALAIRE JOURNALIER']) || 0,
                nb_jours:           parseFloat(r['NB JOURS'])           || 0,
                total_avances:      parseFloat(r['TOTAL AVANCES'])      || 0,
                a_payer:            parseFloat(r['A PAYER'])            || 0,
            }));

        if (ptRecords.length) {
            const res = await batchInsert('pointage', ptRecords);
            p2 = res.inserted; e2 = res.errors;
        }
    }

    showNotification(
        `Personnel : ${p1} employés, ${p2} pointages importés. Erreurs : ${e1+e2}`,
        (e1+e2) ? 'warning' : 'success'
    );
    if (typeof loadPersonnelTable === 'function') loadPersonnelTable();
    if (typeof loadPointageTable  === 'function') loadPointageTable();
}

// ══════════════════════════════════════════════════════════════
// LOGISTIQUE — onglet "MATERIAUX"
// Colonnes : ETAT, QTT, LIBELLES, puis dates (chantier affecté)
// ══════════════════════════════════════════════════════════════
async function importLogistique(wb) {
    const ONGLET = 'MATERIAUX';
    let rawRows;
    try {
        rawRows = XLSX.utils.sheet_to_json(wb.Sheets[ONGLET], { header: 1, defval: null });
    } catch(e) { showNotification(e.message, 'error'); return; }

    // Ligne 0 = en-tête : ETAT, QTT, LIBELLES, date1, date2, ...
    // Ligne 1+ = données
    const records = rawRows.slice(1)
        .filter(r => r[2])  // LIBELLES obligatoire
        .map(r => ({
            libelle:         String(r[2]).trim(),
            etat:            r[0] ? String(r[0]).trim() : 'INCONNU',
            quantite:        parseFloat(r[1]) || 0,
            // Le dernier chantier non-null de la ligne (colonnes 3+)
            chantier_actuel: r.slice(3).filter(Boolean).slice(-1)[0] || null,
        }));

    if (!records.length) { showNotification('Aucun matériel trouvé dans MATERIAUX', 'warning'); return; }

    showNotification(`Import ${records.length} matériels…`, 'info');
    const { inserted, errors } = await batchInsert('materiels', records);
    showNotification(`Logistique importée : ${inserted} OK, ${errors} erreurs`, errors ? 'warning' : 'success');
    if (typeof loadLogistiqueTable === 'function') loadLogistiqueTable();
}

// ══════════════════════════════════════════════════════════════
// DIAGNOSTIC — affiche les onglets disponibles dans un fichier
// ══════════════════════════════════════════════════════════════
function diagExcel(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const msg = `Onglets trouvés dans "${file.name}" :\n` + wb.SheetNames.map((s,i) => `  ${i+1}. ${s}`).join('\n');
        alert(msg);
        console.log('[DiagExcel]', wb.SheetNames);
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
}

console.log('[NYSOA BTP] Module import-excel.js chargé ✓');
