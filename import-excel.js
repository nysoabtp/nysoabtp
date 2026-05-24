// ============================================================
// NYSOA BTP — import-excel.js  (version robuste)
// Gère les formules Excel non résolues, colonnes parasites,
// lignes vides, QTT manquante, SALAIRE MENSUEL multi-lignes
// ============================================================

function importExcelFile(input, module) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            // raw: true  → garde les formules comme strings lisibles
            // cellDates  → dates converties en objets Date
            const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true, raw: false });
            showNotification(`Lecture de ${file.name}…`, 'info');
            switch (module) {
                case 'achats':     await importAchats(wb);     break;
                case 'journal':    await importJournal(wb);    break;
                case 'personnel':  await importPersonnel(wb);  break;
                case 'logistique': await importLogistique(wb); break;
                default: showNotification(`Module inconnu : ${module}`, 'error');
            }
        } catch (err) {
            console.error('[Import Excel]', err);
            showNotification('Erreur lecture Excel : ' + err.message, 'error');
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
}

// ── Lire un onglet → tableau d'objets ────────────────────────
function sheetToRows(wb, sheetName) {
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Onglet introuvable : "${sheetName}". Disponibles : ${wb.SheetNames.join(', ')}`);
    return XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
}

// ── Date Excel/string/JS → ISO YYYY-MM-DD ────────────────────
function toISODate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().split('T')[0];
    if (typeof val === 'string') {
        // Format DD/MM/YYYY
        const dmY = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dmY) return `${dmY[3]}-${dmY[2].padStart(2,'0')}-${dmY[1].padStart(2,'0')}`;
        // Format YYYY-MM-DD
        const isoM = val.match(/^(\d{4}-\d{2}-\d{2})/);
        if (isoM) return isoM[1];
    }
    return null;
}

// ── Convertir une valeur en nombre, même si c'est une formule
//    Excel résolue sous forme de string (ex: "297000") ────────
function toNum(val, fallback = 0) {
    if (val === null || val === undefined || val === '') return fallback;
    if (typeof val === 'number') return val;
    // Cas formule non résolue ex: "=247500+49500" → on l'évalue
    if (typeof val === 'string' && val.startsWith('=')) {
        try {
            // Évaluation sécurisée : on n'accepte que les opérateurs +−×÷ et chiffres
            const safe = val.slice(1).replace(/[^0-9+\-*/().]/g, '');
            // eslint-disable-next-line no-new-func
            const result = Function('"use strict"; return (' + safe + ')')();
            return isFinite(result) ? result : fallback;
        } catch { return fallback; }
    }
    const n = parseFloat(String(val).replace(/\s/g, '').replace(',', '.'));
    return isFinite(n) ? n : fallback;
}

// ── Insérer par lots de 50 ───────────────────────────────────
async function batchInsert(table, rows, chunkSize = 50) {
    let inserted = 0, errors = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await db.from(table).insert(chunk);
        if (error) { console.error(`[Import] ${table} chunk ${i}:`, error); errors += chunk.length; }
        else inserted += chunk.length;
    }
    return { inserted, errors };
}

// ══════════════════════════════════════════════════════════════
// ACHATS — onglet "DETAIL ACHAT"
// Robustesse : PRIX peut être une formule Excel (=247500+49500)
//              ou un string numérique → on résout avec toNum()
// ══════════════════════════════════════════════════════════════
async function importAchats(wb) {
    let rows;
    try { rows = sheetToRows(wb, 'DETAIL ACHAT'); }
    catch (e) { showNotification(e.message, 'error'); return; }

    let skipped = 0;
    const records = [];
    for (const r of rows) {
        // Ignorer lignes sans libellé
        if (!r['LIBELLES']) { skipped++; continue; }
        const prix = toNum(r['PRIX']);
        // Ignorer lignes sans prix du tout (même après résolution de formule)
        if (!r['PRIX'] && r['PRIX'] !== 0) { skipped++; continue; }
        records.push({
            date:          toISODate(r['DATE']),
            chantier:      r['CHANTIER']        || null,
            libelle:       String(r['LIBELLES']).trim(),
            quantite:      toNum(r['QUANTITE'], 1),
            prix:          prix,
            fournisseur:   r['FOURNISSEUR']     || null,
            mode_paiement: r['MODE DE PAIEMENT']|| null,
            statut:        'EN ATTENTE',
        });
    }

    if (!records.length) { showNotification('Aucune ligne valide dans DETAIL ACHAT', 'warning'); return; }
    showNotification(`Import ${records.length} achats (${skipped} lignes vides ignorées)…`, 'info');
    const { inserted, errors } = await batchInsert('commandes', records);
    showNotification(`Achats : ${inserted} importés, ${errors} erreurs`, errors ? 'warning' : 'success');
    if (typeof loadAchatsTable === 'function') loadAchatsTable();
}

// ══════════════════════════════════════════════════════════════
// JOURNAL — onglet "JOURNAL"
// Robustesse : colonne parasite "Colonne 1" ignorée naturellement
//              MONTANT peut être string numérique → toNum()
// ══════════════════════════════════════════════════════════════
async function importJournal(wb) {
    let rows;
    try { rows = sheetToRows(wb, 'JOURNAL'); }
    catch (e) { showNotification(e.message, 'error'); return; }

    let skipped = 0;
    const records = [];
    for (const r of rows) {
        if (!r['DESIGNATION'] || r['MONTANT'] === null || r['MONTANT'] === undefined) { skipped++; continue; }
        const montant = toNum(r['MONTANT']);
        records.push({
            date:          toISODate(r['DATE']),
            chantier:      r['CHANTIER']            || null,
            designation:   String(r['DESIGNATION']).trim(),
            montant:       montant,
            mode_paiement: r['MODE DE PAIEMENT']    || null,
            categorie:     r['CATEGORIE']           || null,
            travaux:       r['TRAVAUX']             || null,
        });
    }

    if (!records.length) { showNotification('Aucune ligne valide dans JOURNAL', 'warning'); return; }
    showNotification(`Import ${records.length} écritures (${skipped} ignorées)…`, 'info');
    const { inserted, errors } = await batchInsert('journal', records);
    showNotification(`Journal : ${inserted} importés, ${errors} erreurs`, errors ? 'warning' : 'success');
    if (typeof loadJournalTable === 'function') loadJournalTable();
}

// ══════════════════════════════════════════════════════════════
// PERSONNEL — SALAIRE MENSUEL + BASE (journaliers) + POINTAGE
// Robustesse :
//   - SALAIRE MENSUEL : ligne 0 = en-têtes fusionnés (mois),
//     ligne 1 = sous-en-têtes → on cherche NOMS et SALAIRE
//     qui peuvent être en ligne 0 ou 1
//   - Lignes TOTAL avec formules ignorées (nom = "TOTAL")
//   - SALAIRE peut être formule → toNum()
//   - BASE : filtre col[2] < 100000 pour journaliers
//   - POINTAGE : NB JOURS et A PAYER peuvent être formules
// ══════════════════════════════════════════════════════════════
async function importPersonnel(wb) {

    // ── 1. Mensuel ──
    const mensuelRecords = [];
    if (wb.SheetNames.includes('SALAIRE MENSUEL')) {
        // Lire brut pour trouver les vraies colonnes NOMS et SALAIRE
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['SALAIRE MENSUEL'],
            { header: 1, defval: null, raw: false });

        // Trouver la ligne d'en-tête qui contient "NOMS"
        let headerIdx = raw.findIndex(r => r && r.some(c => String(c||'').trim().toUpperCase() === 'NOMS'));
        if (headerIdx === -1) headerIdx = 0;
        const headers = raw[headerIdx].map(c => String(c||'').trim().toUpperCase());
        const iNom    = headers.indexOf('NOMS');
        const iSal    = headers.indexOf('SALAIRE');

        if (iNom !== -1 && iSal !== -1) {
            for (const row of raw.slice(headerIdx + 1)) {
                if (!row || !row[iNom]) continue;
                const nom = String(row[iNom]).trim();
                if (!nom || nom.toUpperCase() === 'TOTAL') continue; // ignorer ligne TOTAL
                const salaire = toNum(row[iSal]);
                if (salaire <= 0) continue;
                mensuelRecords.push({
                    nom, salaire_journalier: salaire, type_salaire: 'MENSUEL', actif: true,
                });
            }
        }
    }

    // ── 2. Journaliers (BASE) ──
    const journalierRecords = [];
    if (wb.SheetNames.includes('BASE')) {
        const baseRaw = XLSX.utils.sheet_to_json(wb.Sheets['BASE'],
            { header: 1, defval: null, raw: false });
        for (const r of baseRaw) {
            if (!r || !r[1] || !r[2]) continue;
            const sal = toNum(r[2]);
            if (sal <= 0 || sal >= 100000) continue; // journalier seulement
            journalierRecords.push({
                nom:                String(r[1]).trim(),
                chantier:           r[0] ? String(r[0]).trim() : null,
                salaire_journalier: sal,
                metier:             r[3] ? String(r[3]).trim() : null,
                type_salaire:       'JOURNALIER',
                actif:              true,
            });
        }
    }

    const allPersonnel = [...mensuelRecords, ...journalierRecords];
    if (!allPersonnel.length) { showNotification('Aucun employé trouvé', 'warning'); return; }

    showNotification(`Import ${allPersonnel.length} employés…`, 'info');
    const { inserted: p1, errors: e1 } = await batchInsert('personnel', allPersonnel);

    // ── 3. Pointage ──
    let p2 = 0, e2 = 0;
    if (wb.SheetNames.includes('POINTAGE ET AVANCE')) {
        const ptRows = sheetToRows(wb, 'POINTAGE ET AVANCE');
        const ptRecords = [];
        for (const r of ptRows) {
            if (!r['NOMS'] || !r['SEMAINE DU']) continue;
            ptRecords.push({
                semaine_du:         toISODate(r['SEMAINE DU']),
                chantier:           r['CHANTIER']         || null,
                nom_employe:        String(r['NOMS']).trim(),
                salaire_journalier: toNum(r['SALAIRE JOURNALIER']),
                nb_jours:           toNum(r['NB JOURS']),
                total_avances:      toNum(r['TOTAL AVANCES']),
                a_payer:            toNum(r['A PAYER']),
            });
        }
        if (ptRecords.length) {
            const res = await batchInsert('pointage', ptRecords);
            p2 = res.inserted; e2 = res.errors;
        }
    }

    showNotification(
        `Personnel : ${p1} employés + ${p2} pointages importés. Erreurs : ${e1+e2}`,
        (e1+e2) ? 'warning' : 'success'
    );
    if (typeof loadPersonnelTable === 'function') loadPersonnelTable();
    if (typeof loadPointageTable  === 'function') loadPointageTable();
}

// ══════════════════════════════════════════════════════════════
// LOGISTIQUE — onglet "MATERIAUX"
// Robustesse : QTT peut être vide → 0 (pas de blocage)
//              ETAT vide → 'INCONNU'
// ══════════════════════════════════════════════════════════════
async function importLogistique(wb) {
    let rawRows;
    try {
        rawRows = XLSX.utils.sheet_to_json(wb.Sheets['MATERIAUX'],
            { header: 1, defval: null, raw: false });
    } catch(e) { showNotification(e.message, 'error'); return; }

    let skipped = 0;
    const records = rawRows.slice(1)
        .filter(r => {
            if (!r || !r[2]) { skipped++; return false; }
            return true;
        })
        .map(r => ({
            libelle:         String(r[2]).trim(),
            etat:            r[0] ? String(r[0]).trim() : 'INCONNU',
            // QTT vide → 0, pas de blocage
            quantite:        toNum(r[1], 0),
            // Dernier chantier non-null sur la ligne (colonnes 3+)
            chantier_actuel: r.slice(3).filter(Boolean).slice(-1)[0] || null,
        }));

    if (!records.length) { showNotification('Aucun matériel trouvé dans MATERIAUX', 'warning'); return; }
    showNotification(`Import ${records.length} matériels (${skipped} lignes vides ignorées)…`, 'info');

    // Sync localStorage stock pour affichage immédiat
    try {
        const existants = JSON.parse(localStorage.getItem('nysoa_stock_articles') || '[]');
        const merged = [...existants];
        records.forEach((r, idx) => {
            const ref = 'STK-IMP-' + String(idx + 1).padStart(3, '0');
            const exist = merged.find(a => a.nom.toLowerCase() === r.libelle.toLowerCase());
            if (exist) {
                exist.quantite     = r.quantite || exist.quantite;
                exist.etat         = r.etat     || exist.etat;
                if (r.chantier_actuel) exist.emplacement = r.chantier_actuel;
            } else {
                merged.push({
                    ref,
                    nom:           r.libelle,
                    categorie:     'Matériaux',
                    emplacement:   r.chantier_actuel || 'Entrepôt central',
                    quantite:      r.quantite || 0,
                    unite:         'Unité',
                    prix_unitaire: 0,
                    seuil_alerte:  0,
                    notes:         `État : ${r.etat || '—'}`,
                });
            }
        });
        localStorage.setItem('nysoa_stock_articles', JSON.stringify(merged));
    } catch(e) { console.warn('Sync localStorage stock:', e); }

    const { inserted, errors } = await batchInsert('materiels', records);
    showNotification(`Logistique : ${inserted} importés, ${errors} erreurs`, errors ? 'warning' : 'success');
    if (typeof loadLogistiqueTable === 'function') loadLogistiqueTable();
}

// ══════════════════════════════════════════════════════════════
// DIAGNOSTIC — liste les onglets d'un fichier
// ══════════════════════════════════════════════════════════════
function diagExcel(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const msg = `Onglets dans "${file.name}" :\n` + wb.SheetNames.map((s,i) => `  ${i+1}. ${s}`).join('\n');
        alert(msg);
        console.log('[DiagExcel]', wb.SheetNames);
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
}

console.log('[NYSOA BTP] Module import-excel.js (robuste) chargé ✓');
