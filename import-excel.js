// ============================================================
// NYSOA BTP — import-excel.js v4.0
// Import complet : ACHAT · JOURNAL · PERSONNEL · LOGISTIQUE
// Tous les onglets, toutes les données — CORRIGÉ
// ============================================================

// ── UTILITAIRES ──────────────────────────────────────────────
function sheetToRows(wb, sheetName) {
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Onglet introuvable : "${sheetName}". Disponibles : ${wb.SheetNames.join(', ')}`);
    // FIX: raw:true + dateNF pour avoir les dates comme objets Date via cellDates du workbook
    return XLSX.utils.sheet_to_json(ws, { defval: null, raw: false, dateNF: 'yyyy-mm-dd' });
}

function toISODate(val) {
    if (!val) return null;
    // Objet Date JavaScript
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    if (typeof val === 'string') {
        const s = val.trim();
        // yyyy-mm-dd déjà ISO
        if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
        // dd/mm/yyyy  ← format Excel français (jour PUIS mois)
        const dmY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dmY) {
            const day = dmY[1].padStart(2, '0');
            const mon = dmY[2].padStart(2, '0');
            const yr  = dmY[3];
            // Valider que c'est une vraie date
            const test = new Date(`${yr}-${mon}-${day}`);
            if (!isNaN(test.getTime())) return `${yr}-${mon}-${day}`;
        }
        // mm/dd/yyyy (format US possible selon OS)
        const mdY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (mdY) {
            // Tenter d/m/Y en priorité (fichiers Madagascar = français)
            const day = mdY[1].padStart(2, '0');
            const mon = mdY[2].padStart(2, '0');
            const yr  = mdY[3];
            if (parseInt(day) <= 12) {
                // Ambigu : forcer interprétation dd/mm/yyyy
                const test = new Date(`${yr}-${mon}-${day}`);
                if (!isNaN(test.getTime())) return `${yr}-${mon}-${day}`;
            }
        }
        // Texte libre contenant une date (ex: "SAKAFO SEM DU 09/02")
        const embedded = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
        if (embedded) {
            const day = embedded[1].padStart(2, '0');
            const mon = embedded[2].padStart(2, '0');
            const yr  = embedded[3] || '2026';
            const test = new Date(`${yr}-${mon}-${day}`);
            if (!isNaN(test.getTime())) return `${yr}-${mon}-${day}`;
        }
    }
    // Numéro de série Excel (nombre entier)
    if (typeof val === 'number' && val > 0 && val < 100000) {
        const d = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(d.getTime())) {
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
        }
    }
    return null;
}

function toNum(val, fallback = 0) {
    if (val === null || val === undefined || val === '') return fallback;
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.startsWith('=')) {
        // Formule non évaluée → retourner fallback (valeur calculée absente)
        return fallback;
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

// FIX: Résoudre les formules de type "=SUM(...)" ou "=348100+O17"
// en retournant null si non calculable (valeur textuelle = formule brute)
function resolveVal(val) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string' && val.startsWith('=')) return null;
    return val;
}

// ── ENTRÉE PRINCIPALE ─────────────────────────────────────────
function importExcelFile(input, module) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            // FIX: cellDates:true pour décoder les dates Excel correctement
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
// ACHAT_2026.xlsx — 5 onglets (BASE · COMMANDE · DETAIL ACHAT · RESUME · PRIX)
// ══════════════════════════════════════════════════════════════
async function importAchats(wb) {
    let total = { inserted: 0, errors: 0 };

    // ── Onglet BASE → table references_achat (chantiers / fournisseurs / modes paiement)
    // FIX: onglet BASE ignoré auparavant. Structure : col0=chantier, col1=fournisseur,
    //      col2=mode_paiement, col3=statut (OK/NOK)
    if (wb.SheetNames.includes('BASE')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['BASE'], { header: 1, defval: null, raw: false });
        const records = [];
        for (const row of raw) {
            if (!row || !row[0]) continue;
            const chantier = String(row[0]).trim();
            if (!chantier) continue;
            records.push({
                chantier:       chantier,
                fournisseur:    row[1] ? String(row[1]).trim() : null,
                mode_paiement:  row[2] ? String(row[2]).trim() : null,
                statut:         row[3] ? String(row[3]).trim() : null,
            });
        }
        const res = await batchInsert('references_achat', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`BASE : ${res.inserted} références importées`, 'info');
    }

    // ── Onglet DETAIL ACHAT → table commandes
    if (wb.SheetNames.includes('DETAIL ACHAT')) {
        const rows = sheetToRows(wb, 'DETAIL ACHAT');
        const records = rows
            .filter(r => r['LIBELLES'] && r['PRIX'] !== null)
            .map(r => ({
                date:           toISODate(r['DATE']),
                chantier:       r['CHANTIER'] || null,
                libelle:        String(r['LIBELLES']).trim(),
                quantite:       toNum(r['QUANTITE'], 1),
                prix:           toNum(r['PRIX']),
                fournisseur:    r['FOURNISSEUR'] || null,
                mode_paiement:  r['MODE DE PAIEMENT'] || null,
                statut:         'OK',
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
                designation:    String(r['DESIGNATION']).trim(),
                prix_unitaire:  toNum(r['PRIX UNITAIRE']),
                unite:          r['UNITE'] ? String(r['UNITE']).trim() : null,
                fournisseur:    r['FOURNISSEUR'] ? String(r['FOURNISSEUR']).trim() : null,
            }));
        const res = await batchInsert('catalogue_prix', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`PRIX : ${res.inserted} articles catalogue importés`, 'info');
    }

    // ── Onglet RESUME → table credits_fournisseurs
    // FIX: Ligne 1 = en-têtes fusionnés, Ligne 2 = sous-en-têtes, Ligne 3+ = données
    //      Les formules non évaluées (=...) sont traitées comme null
    if (wb.SheetNames.includes('RESUME')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['RESUME'], { header: 1, defval: null, raw: false });
        const records = [];
        for (const row of raw.slice(2)) {
            if (!row || !row[0]) continue;
            const fourn = String(row[0]).trim();
            if (!fourn || fourn === 'FOURNISSEUR') continue;
            records.push({
                fournisseur:    fourn,
                montant_total:  toNum(resolveVal(row[1])),
                date1:          toISODate(resolveVal(row[2])),
                montant1:       toNum(resolveVal(row[3])),
                reste1:         toNum(resolveVal(row[4])),
                date2:          toISODate(resolveVal(row[5])),
                montant2:       toNum(resolveVal(row[6])),
                reste2:         toNum(resolveVal(row[7])),
                date3:          toISODate(resolveVal(row[8])),
                montant3:       toNum(resolveVal(row[9])),
                reste3:         toNum(resolveVal(row[10])),
            });
        }
        const res = await batchInsert('credits_fournisseurs', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`RESUME : ${res.inserted} crédits fournisseurs importés`, 'info');
    }

    // ── Onglet COMMANDE → table commandes (bons de commande)
    // FIX: Double ligne d'en-tête → données réelles à partir de la ligne 3 (index 2)
    //      Structure : col0=DATE, col1=CHANTIER, col2=COMMANDE(libelle), col3=PU,
    //                  col4=DEMANDE_QTT, col5=DEMANDE_MONTANT(formule), col6=APPROUVE_QTT,
    //                  col7=APPROUVE_MONTANT(formule), col8=DATE_ACHAT,
    //                  col9=DATE_LIVRAISON, col10=OK/NOK
    if (wb.SheetNames.includes('COMMANDE')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['COMMANDE'], { header: 1, defval: null, raw: false });
        let currentDate = null, currentChantier = null;
        const records = [];
        for (const row of raw.slice(2)) { // FIX: slice(2) car 2 lignes d'en-tête
            if (!row) continue;
            if (resolveVal(row[0])) currentDate     = toISODate(resolveVal(row[0]));
            if (row[1])             currentChantier = String(row[1]).trim();
            const libelle = row[2] ? String(row[2]).trim() : null;
            if (!libelle) continue;
            records.push({
                date:             currentDate,
                chantier:         currentChantier,
                libelle:          libelle,
                prix:             toNum(resolveVal(row[3])),        // PU
                quantite:         toNum(resolveVal(row[4]), 1),     // DEMANDE QUANTITE
                quantite_approuve: toNum(resolveVal(row[6]), 0),    // APPROUVE QUANTITE
                date_achat:       toISODate(resolveVal(row[8])),
                date_livraison:   toISODate(resolveVal(row[9])),
                statut:           row[10] && String(row[10]).trim().toUpperCase() === 'OK' ? 'OK' : 'EN ATTENTE',
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
// JOURNAL_2026.xlsx — 7 onglets
// BASE · BUDGET FELANA · JOURNAL · RESUME · DIAGRAMME ·
// DEPENSES PAR CHANTIER · DETAILS PAR CHANTIER
// ══════════════════════════════════════════════════════════════
async function importJournal(wb) {
    let total = { inserted: 0, errors: 0 };

    // ── Onglet JOURNAL → table journal
    if (wb.SheetNames.includes('JOURNAL')) {
        const rows = sheetToRows(wb, 'JOURNAL');
        const records = rows
            .filter(r => r['DESIGNATION'] && r['MONTANT'] !== null)
            .map(r => ({
                date:           toISODate(r['DATE']),
                chantier:       r['CHANTIER'] || null,
                designation:    String(r['DESIGNATION']).trim(),
                montant:        toNum(r['MONTANT']),
                mode_paiement:  r['MODE DE PAIEMENT'] || null,
                categorie:      r['CATEGORIE'] || null,
                travaux:        r['TRAVAUX'] || null,
            }));
        const res = await batchInsert('journal', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`JOURNAL : ${res.inserted} écritures importées`, 'info');
    }

    // ── Onglet BUDGET FELANA → table caisse
    // FIX: La colonne DEBUT contient des formules Excel (=E2, =20000+360000...)
    //      → on ignore DEBUT (calculé) et on garde seulement DATE, DESIGNATION, MONTANT, RESTE
    if (wb.SheetNames.includes('BUDGET FELANA')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['BUDGET FELANA'],
            { header: 1, defval: null, raw: false });
        // Ligne 0 = en-tête : DATE | DEBUT | DESIGNATION | MONTANT | RESTE
        const records = [];
        for (const row of raw.slice(1)) {
            if (!row || !row[2]) continue; // DESIGNATION obligatoire
            const designation = String(row[2]).trim();
            if (!designation) continue;
            const montant = toNum(resolveVal(row[3]));
            if (montant === 0 && !designation) continue;
            records.push({
                date:           toISODate(resolveVal(row[0])),
                solde_debut:    toNum(resolveVal(row[1])),   // null si formule
                designation:    designation,
                montant:        montant,
                solde_fin:      toNum(resolveVal(row[4])),   // null si formule
            });
        }
        const res = await batchInsert('caisse', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`BUDGET FELANA : ${res.inserted} mouvements caisse importés`, 'info');
    }

    // ── Onglet DIAGRAMME → table journal_resume
    // FIX: Onglet ignoré auparavant. Contient les totaux par rubrique et catégorie.
    // Structure : col0=RUBRIQUES, col1=MONTANT_TRANO, col2=%(formule),
    //             col15=CATEGORIE, col16=MONTANT_CAT, col17=%(formule)
    if (wb.SheetNames.includes('DIAGRAMME')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['DIAGRAMME'],
            { header: 1, defval: null, raw: false });
        const records = [];
        for (const row of raw.slice(1)) {
            if (!row) continue;
            // Rubrique chantier (cols 0-1)
            if (row[0] && typeof resolveVal(row[1]) === 'number') {
                records.push({
                    type:       'RUBRIQUE',
                    libelle:    String(row[0]).trim(),
                    montant:    toNum(resolveVal(row[1])),
                });
            }
            // Catégorie (cols 15-16)
            if (row[15] && typeof resolveVal(row[16]) === 'number') {
                records.push({
                    type:       'CATEGORIE',
                    libelle:    String(row[15]).trim(),
                    montant:    toNum(resolveVal(row[16])),
                });
            }
        }
        const res = await batchInsert('journal_resume', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`DIAGRAMME : ${res.inserted} totaux importés`, 'info');
    }

    showMsg(`✓ JOURNAL complet : ${total.inserted} enregistrements. Erreurs : ${total.errors}`,
        total.errors ? 'warning' : 'success');
    if (typeof loadJournalTable === 'function') loadJournalTable();
    if (typeof loadCaisse       === 'function') loadCaisse();
}

// ══════════════════════════════════════════════════════════════
// PERSONNEL_2026.xlsx — 8 onglets
// BASE · DEMANDE BUDGET · SALAIRE MENSUEL · POINTAGE ET AVANCE ·
// SALAIRE JOURNALIER · ANTOKA · CONTRAT ENCOURS · NOTE EVALUATION
// ══════════════════════════════════════════════════════════════
async function importPersonnel(wb) {
    let total = { inserted: 0, errors: 0 };

    // ── Onglet SALAIRE MENSUEL → table personnel (mensuels)
    // FIX: 2 lignes d'en-tête fusionnées. Ligne 1 = mois, Ligne 2 = AVANCE1/AVANCE2/à PAYER
    //      Données réelles à partir de la ligne 4 (index 3 après les 2 en-têtes + 1 vide)
    //      Colonnes fixes : col0=NOMS, col1=SALAIRE, puis 3 cols par mois (12 mois = 36 cols)
    if (wb.SheetNames.includes('SALAIRE MENSUEL')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['SALAIRE MENSUEL'],
            { header: 1, defval: null, raw: false });
        // Trouver la ligne d'en-tête contenant "NOMS"
        let headerIdx = raw.findIndex(r => r && r.some(c => String(c||'').trim().toUpperCase() === 'NOMS'));
        if (headerIdx === -1) headerIdx = 0;

        const moisLabels = ['JANVIER','FEVRIER','MARS','AVRIL','MAI','JUIN',
                            'JUILLET','AOUT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DECEMBRE'];

        // Construire la liste des employés mensuels
        const records = [];
        for (const row of raw.slice(headerIdx + 2)) { // +2 pour sauter les 2 lignes d'en-tête
            if (!row || !row[0]) continue;
            const nom = String(row[0]).trim();
            if (!nom || nom.toUpperCase() === 'TOTAL' || nom.toUpperCase() === 'NOMS') continue;
            const salaire = toNum(resolveVal(row[1]));
            if (salaire <= 0) continue;

            // Construire les paiements mensuels (12 mois × 3 colonnes = cols 2 à 37)
            const paiements = {};
            moisLabels.forEach((mois, i) => {
                const baseCol = 2 + (i * 3);
                paiements[`avance1_${mois.toLowerCase()}`]  = toNum(resolveVal(row[baseCol]));
                paiements[`avance2_${mois.toLowerCase()}`]  = toNum(resolveVal(row[baseCol + 1]));
                paiements[`a_payer_${mois.toLowerCase()}`]  = toNum(resolveVal(row[baseCol + 2]));
            });

            records.push({
                nom,
                salaire_journalier: salaire,
                type_salaire: 'MENSUEL',
                actif: true,
                ...paiements,
            });
        }
        const res = await batchInsert('personnel', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`SALAIRE MENSUEL : ${res.inserted} employés importés`, 'info');
    }

    // ── Onglet BASE → table personnel (journaliers)
    // FIX: La ligne 1 est vide (None, None, None). Les données démarrent à la ligne 2.
    //      Structure : col0=chantier, col1=nom, col2=salaire, col3=metier
    if (wb.SheetNames.includes('BASE')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['BASE'], { header: 1, defval: null, raw: false });
        const records = raw
            .slice(1) // FIX: ignorer ligne 1 vide
            .filter(r => r && r[1] && r[2]) // nom et salaire obligatoires
            .map(r => ({
                nom:                String(r[1]).trim(),
                chantier:           r[0] ? String(r[0]).trim() : null,
                salaire_journalier: toNum(r[2]),
                metier:             r[3] ? String(r[3]).trim() : null,
                type_salaire:       'JOURNALIER',
                actif:              true,
            }))
            .filter(r => r.salaire_journalier > 0 && r.salaire_journalier < 1000000); // FIX: seuil relevé
        const res = await batchInsert('personnel', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`BASE : ${res.inserted} journaliers importés`, 'info');
    }

    // ── Onglet POINTAGE ET AVANCE → table pointage
    // FIX: Colonnes jours L/M/M/J/V/S/D à indices 3-9, NB JOURS=col10 (formule),
    //      SALAIRE JOURNALIER=col11 (ArrayFormula), avances=cols 12-17,
    //      TOTAL AVANCES=col18, A PAYER=col19
    //      On lit directement les colonnes nommées avec sheet_to_json mais les
    //      formules ArrayFormula ne donnent pas de valeur → on calcule nous-mêmes
    if (wb.SheetNames.includes('POINTAGE ET AVANCE')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['POINTAGE ET AVANCE'],
            { header: 1, defval: null, raw: false });
        const records = [];
        for (const row of raw.slice(1)) { // skip header
            if (!row) continue;
            const semaine = resolveVal(row[0]);
            const nom     = row[2];
            if (!semaine || !nom) continue;
            const nomStr = String(nom).trim();
            if (!nomStr || nomStr === 'NOMS') continue;

            // FIX: Calculer nb_jours depuis les colonnes individuelles (L=3,M=4,M=5,J=6,V=7,S=8,D=9)
            const jourCols = [row[3], row[4], row[5], row[6], row[7], row[8], row[9]];
            const nb_jours_calc = jourCols.reduce((sum, v) => sum + toNum(resolveVal(v), 0), 0);

            // FIX: nb_jours peut être formule → utiliser valeur calculée
            const nb_jours = toNum(resolveVal(row[10]), nb_jours_calc) || nb_jours_calc;

            // FIX: salaire_journalier peut être ArrayFormula → utiliser col 11
            const salaire_jrn = toNum(resolveVal(row[11]));

            // FIX: Calculer total_avances depuis colonnes individuelles (cols 12-17)
            const avanceCols = [row[12], row[13], row[14], row[15], row[16], row[17]];
            const total_avances_calc = avanceCols.reduce((sum, v) => sum + toNum(resolveVal(v), 0), 0);
            const total_avances = toNum(resolveVal(row[18]), total_avances_calc) || total_avances_calc;

            // FIX: a_payer = (nb_jours * salaire_jrn) - total_avances si formule
            const a_payer_raw = resolveVal(row[19]);
            const a_payer = toNum(a_payer_raw,
                salaire_jrn > 0 ? Math.round(((nb_jours * salaire_jrn) - total_avances) / 100) * 100 : 0
            );

            records.push({
                semaine_du:         toISODate(semaine),
                chantier:           row[1] ? String(row[1]).trim() : null,
                nom_employe:        nomStr,
                salaire_journalier: salaire_jrn,
                nb_jours:           nb_jours,
                total_avances:      total_avances,
                a_payer:            a_payer,
                // FIX: stocker les jours individuels
                j_lundi:            toNum(resolveVal(row[3])),
                j_mardi:            toNum(resolveVal(row[4])),
                j_mercredi:         toNum(resolveVal(row[5])),
                j_jeudi:            toNum(resolveVal(row[6])),
                j_vendredi:         toNum(resolveVal(row[7])),
                j_samedi:           toNum(resolveVal(row[8])),
                j_dimanche:         toNum(resolveVal(row[9])),
            });
        }
        const res = await batchInsert('pointage', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`POINTAGE : ${res.inserted} lignes importées`, 'info');
    }

    // ── Onglet DEMANDE BUDGET → table demande_budget
    // FIX: Onglet ignoré auparavant. Structure mixte : cols 0-6 = demandes hebdo,
    //      cols 5-7 = détails avances individuelles
    if (wb.SheetNames.includes('DEMANDE BUDGET')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['DEMANDE BUDGET'],
            { header: 1, defval: null, raw: false });
        const records = [];
        for (const row of raw.slice(1)) {
            if (!row || !row[0]) continue;
            const date = toISODate(resolveVal(row[0]));
            if (!date) continue;
            records.push({
                date:                date,
                salaire_mensuel:     toNum(resolveVal(row[1])),
                salaire_journalier:  toNum(resolveVal(row[2])),
                antoka:              toNum(resolveVal(row[3])),
                avances:             toNum(resolveVal(row[4])),
                autres:              toNum(resolveVal(row[5])),
                total:               toNum(resolveVal(row[6])),
            });
        }
        const res = await batchInsert('demande_budget', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`DEMANDE BUDGET : ${res.inserted} demandes importées`, 'info');
    }

    // ── Onglet ANTOKA → table antoka
    // FIX: Formules dans la colonne RESTE (=C2-B3 etc.) → resolveVal retourne null,
    //      on calcule reste = montant_depart - montant_paye
    //      Les libellés de paiement textuels (ex: "SAKAFO SEM DU 09/02") sont acceptés
    //      comme date si une date y est extractible
    if (wb.SheetNames.includes('ANTOKA')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['ANTOKA'],
            { header: 1, defval: null, raw: false });
        const records = [];
        const headerRow = raw[0] || [];
        for (let col = 0; col < headerRow.length; col += 3) {
            const employe = headerRow[col] ? String(headerRow[col]).trim() : null;
            if (!employe || employe === 'PAYE' || employe === 'RESTE' || employe === 'nan') continue;
            const match = employe.match(/\(([^)]+)\)/);
            const chantier = match ? match[1] : null;
            let montantDepart = 0;
            let totalPaye = 0;
            const paiements = [];
            for (const row of raw.slice(1)) {
                if (!row || row[col] === null || row[col] === undefined) continue;
                const val = String(row[col]).trim();
                if (val.toUpperCase() === 'DEPART') {
                    // FIX: montant depart peut être formule → resolveVal
                    montantDepart = toNum(resolveVal(row[col + 2]));
                    continue;
                }
                // FIX: même si libellé textuel, tenter extraction date
                const datePmt = toISODate(val) || toISODate(resolveVal(row[col]));
                const montantPmt = toNum(resolveVal(row[col + 1]));
                if (montantPmt > 0) {
                    totalPaye += montantPmt;
                    paiements.push({ date: datePmt || val, montant: montantPmt });
                }
            }
            if (montantDepart > 0 || totalPaye > 0) {
                records.push({
                    employe,
                    chantier,
                    montant_depart: montantDepart,
                    montant_paye:   totalPaye,
                    reste:          Math.max(0, montantDepart - totalPaye),
                    date:           new Date().toISOString().split('T')[0],
                    nb_paiements:   paiements.length,
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
                designation:    r['CONTRAT ENCOURS'] ? String(r['CONTRAT ENCOURS']).trim() : '—',
                prestataire:    r['PRESTATAIRE'] ? String(r['PRESTATAIRE']).trim() : null,
                chantier:       r['CHANTIER'] ? String(r['CHANTIER']).trim() : null,
                prix_convenu:   r['PRIX CONVENU'] ? String(r['PRIX CONVENU']).trim() : null,
                date_debut:     toISODate(r['DATE DE DEBUT']),
                date_fin_prevue: toISODate(r['DATE PREVUE FIN']),
                date_fin:       toISODate(r['DATE FIN']),
                statut:         'EN COURS',
            }));
        const res = await batchInsert('contrats', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`CONTRATS : ${res.inserted} contrats importés`, 'info');
    }

    // ── Onglet NOTE EVALUATION ET APPRECIATION → table evaluations
    // FIX: Onglet ignoré auparavant. Structure : NOMS | NOTES | EVALUATION MENSUEL
    if (wb.SheetNames.includes('NOTE EVALUATION ET APPRECIATION')) {
        const rows = sheetToRows(wb, 'NOTE EVALUATION ET APPRECIATION');
        const records = rows
            .filter(r => r['NOMS'])
            .map(r => ({
                nom:                String(r['NOMS']).trim(),
                notes:              toNum(r['NOTES']),
                evaluation_mensuel: r['EVALUATION MENSUEL'] ? String(r['EVALUATION MENSUEL']).trim() : null,
            }));
        if (records.length > 0) {
            const res = await batchInsert('evaluations', records);
            total.inserted += res.inserted; total.errors += res.errors;
            showMsg(`EVALUATIONS : ${res.inserted} évaluations importées`, 'info');
        }
    }

    showMsg(`✓ PERSONNEL complet : ${total.inserted} enregistrements. Erreurs : ${total.errors}`,
        total.errors ? 'warning' : 'success');
    if (typeof loadPersonnelTable === 'function') loadPersonnelTable();
    if (typeof loadAntoka         === 'function') loadAntoka();
    if (typeof loadContrats       === 'function') loadContrats();
}

// ══════════════════════════════════════════════════════════════
// LOGISTIQUE_2026.xlsx — 4 onglets (BASE · MATERIAUX · STOCKS · NECESSITE EN STOCK)
// ══════════════════════════════════════════════════════════════
async function importLogistique(wb) {
    let total = { inserted: 0, errors: 0 };

    // ── Onglet BASE → table references_logistique (chantiers / états équipements)
    // FIX: Onglet ignoré auparavant. Structure : col0=chantier, col1=etat
    if (wb.SheetNames.includes('BASE')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['BASE'], { header: 1, defval: null, raw: false });
        const records = raw
            .filter(r => r && r[0])
            .map(r => ({
                chantier: String(r[0]).trim(),
                etat:     r[1] ? String(r[1]).trim() : null,
            }));
        const res = await batchInsert('references_logistique', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`BASE : ${res.inserted} références chantiers importées`, 'info');
    }

    // ── Onglet MATERIAUX → table materiels
    // FIX: L'en-tête ligne 1 = ETAT | QTT | LIBELLES | dates...
    //      Les colonnes à partir de col 3 sont des dates de localisation
    //      col[last] = localisation la plus récente
    if (wb.SheetNames.includes('MATERIAUX')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['MATERIAUX'],
            { header: 1, defval: null, raw: false });
        const headerRow = raw[0] || [];
        // Trouver la dernière colonne date (localisation la plus récente)
        const dateCols = headerRow.slice(3).filter(v => v !== null);
        const lastDateLabel = dateCols.length > 0 ? dateCols[dateCols.length - 1] : null;

        const records = raw.slice(1)
            .filter(r => r && r[2])
            .map(r => ({
                libelle:        String(r[2]).trim(),
                etat:           r[0] ? String(r[0]).trim() : 'EN MARCHE',
                quantite:       toNum(r[1], 0),
                // FIX: stocker toutes les localisations comme historique JSON
                chantier_actuel: r.slice(3).filter(v => v !== null && v !== undefined).slice(-1)[0] || null,
                derniere_date:   lastDateLabel ? String(lastDateLabel) : null,
            }));
        const res = await batchInsert('materiels', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`MATERIAUX : ${res.inserted} matériels importés`, 'info');
    }

    // ── Onglet STOCKS → table stock
    // FIX: col0=CHANTIER, col1=DESIGNATION, col2..N = quantités par date
    //      La 1ère colonne est CHANTIER (ignorée auparavant)
    //      On prend la quantité de la DERNIÈRE colonne date non-null
    if (wb.SheetNames.includes('STOCKS')) {
        const raw = XLSX.utils.sheet_to_json(wb.Sheets['STOCKS'],
            { header: 1, defval: null, raw: false });
        const headerRow = raw[0] || [];
        // Trouver le dernier index de colonne date valide
        let lastValidDateCol = 1;
        for (let i = 2; i < headerRow.length; i++) {
            if (headerRow[i] !== null && headerRow[i] !== undefined) lastValidDateCol = i;
        }
        let refCounter = 1;
        const records = raw.slice(1)
            .filter(r => r && r[1]) // FIX: col1=DESIGNATION
            .map(r => ({
                reference:      'STK-' + String(refCounter++).padStart(3, '0'),
                nom:            String(r[1]).trim(),
                categorie:      'Matériaux',
                quantite:       toNum(r[lastValidDateCol], 0), // FIX: dernière date valide
                unite:          'Unité',
                emplacement:    r[0] ? String(r[0]).trim() : null, // FIX: CHANTIER importé
                seuil_alerte:   0,
            }));
        const res = await batchInsert('stock', records);
        total.inserted += res.inserted; total.errors += res.errors;
        showMsg(`STOCKS : ${res.inserted} articles importés`, 'info');
    }

    // ── Onglet NECESSITE EN STOCK → table catalogue_prix
    // FIX: Colonne TRAVAUX (col0) ignorée auparavant → maintenant importée
    if (wb.SheetNames.includes('NECESSITE EN STOCK')) {
        const rows = sheetToRows(wb, 'NECESSITE EN STOCK');
        const records = rows
            .filter(r => r['DESIGNATIONS'])
            .map(r => ({
                designation:    String(r['DESIGNATIONS']).trim(),
                prix_unitaire:  toNum(r['PRIX DE GROS']),
                fournisseur:    r['FOURNISSEURS'] ? String(r['FOURNISSEURS']).trim() : null,
                unite:          'Unité',
                travaux:        r['TRAVAUX'] ? String(r['TRAVAUX']).trim() : null, // FIX: colonne ajoutée
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

// ── Alias pour les modules métier ────────────────────────────
// Ces alias sont intentionnels — les fonctions de base sont polyvalentes :
//   importPersonnel(wb) : gère BASE, SALAIRE MENSUEL, ANTOKA, CONTRAT ENCOURS
//   importJournal(wb)   : gère JOURNAL et CAISSE
//   importAchats(wb)    : gère ACHATS, REFERENCES, CATALOGUE_PRIX, CREDITS
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

console.log('[NYSOA BTP] import-excel.js v4.0 chargé ✓');
