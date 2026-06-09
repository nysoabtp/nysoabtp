// ============================================================
// Import des données Excel vers Supabase
// Usage : node import_data.js
// ============================================================
const XLSX = require('xlsx');
const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://djncsybvloyyesllfxhq.supabase.co';
// SUPABASE_KEY — à configurer dans l'environnement d'exécution (ne pas hardcoder)
const SUPABASE_KEY = process.env.SUPABASE_KEY || 'REMPLACER_PAR_VOTRE_CLE';
const DATA_DIR = 'D:/Mandimby/donner';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function supabaseInsert(table, rows, batchSize = 500) {
    if (!rows.length) { console.log(`  -> ${table}: 0 ligne`); return; }
    let total = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        await new Promise((resolve, reject) => {
            const data = JSON.stringify(batch);
            const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer': 'return=minimal'
                }
            };
            const req = https.request(options, res => {
                total += batch.length;
                if (i > 0) process.stdout.write('\r');
                process.stdout.write(`  -> ${table}: ${total}/${rows.length} (batch ${i/batchSize+1})`);
                resolve();
            });
            req.on('error', e => reject(e));
            req.write(data);
            req.end();
        });
        await sleep(200);
    }
    console.log(`\n  -> ${table}: ${total} inserees`);
}

function serialDateToDate(serial) {
    if (!serial && serial !== 0) return null;
    if (typeof serial === 'string') return serial;
    return new Date((serial - 25569) * 86400 * 1000).toISOString().split('T')[0];
}

function readSheet(filePath, sheetName) {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[sheetName];
    return ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : [];
}

async function main() {
    console.log('=== IMPORT DONNEES NYSOA BTP ===\n');

    // ---- 1. IMPORT CATALOGUE PRIX ----
    console.log('1. CATALOGUE PRIX');
    const prixData = readSheet(`${DATA_DIR}/ACHAT 2026.xlsx`, 'PRIX');
    const cataloguePrix = [];
    for (let i = 3; i < prixData.length; i++) {
        const r = prixData[i];
        if (!r[0]) continue;
        cataloguePrix.push({
            designation: r[0],
            prix_unitaire: parseFloat(r[1]) || 0,
            unite: r[2] || 'unité',
            fournisseur: r[3] || '',
        });
    }
    await supabaseInsert('catalogue_prix', cataloguePrix);

    // ---- 2. IMPORT PERSONNEL ----
    console.log('\n2. PERSONNEL');
    const empData = readSheet(`${DATA_DIR}/PERSONNEL 2026.xlsx`, 'BASE');
    const personnel = [];
    for (let i = 1; i < empData.length; i++) {
        const r = empData[i];
        if (!r[1]) continue;
        personnel.push({
            nom: r[1],
            chantier: r[0] || '',
            salaire_journalier: parseFloat(r[2]) || 0,
            metier: r[3] || '',
            actif: true,
        });
    }
    await supabaseInsert('personnel', personnel);

    // ---- 3. IMPORT JOURNAL ----
    console.log('\n3. JOURNAL');
    const journalData = readSheet(`${DATA_DIR}/JOURNAL 2026.xlsx`, 'JOURNAL');
    const journal = [];
    for (let i = 2; i < journalData.length; i++) {
        const r = journalData[i];
        if (!r[2]) continue;
        const date = serialDateToDate(r[0]);
        if (!date) continue;
        journal.push({
            date: date,
            chantier: r[1] || '',
            designation: r[2] || '',
            montant: parseFloat(r[3]) || 0,
            mode_paiement: r[4] || '',
            categorie: r[5] || '',
            travaux: r[6] || '',
        });
    }
    await supabaseInsert('journal', journal);

    // ---- 4. IMPORT COMMANDES (DETAIL ACHAT) ----
    console.log('\n4. COMMANDES');
    const achatData = readSheet(`${DATA_DIR}/ACHAT 2026.xlsx`, 'DETAIL ACHAT');
    const commandes = [];
    for (let i = 1; i < achatData.length; i++) {
        const r = achatData[i];
        if (!r[2]) continue;
        const date = serialDateToDate(r[0]);
        if (!date) continue;
        commandes.push({
            date: date,
            chantier: r[1] || '',
            libelle: r[2] || '',
            quantite: parseFloat(r[3]) || 1,
            prix: parseFloat(r[4]) || 0,
            prix_unitaire: (parseFloat(r[4]) || 0) / (parseFloat(r[3]) || 1),
            fournisseur: r[5] || '',
            mode_paiement: r[6] || '',
            statut: 'OK',
        });
    }
    await supabaseInsert('commandes', commandes);

    // ---- 5. IMPORT CREDITS FOURNISSEURS ----
    console.log('\n5. CREDITS');
    const creditData = readSheet(`${DATA_DIR}/ACHAT 2026.xlsx`, 'RESUME');
    const credits = [];
    for (let i = 2; i < creditData.length; i++) {
        const r = creditData[i];
        if (!r[0]) continue;
        const mt = parseFloat(r[1]) || 0;
        const m1 = parseFloat(r[3]) || 0;
        const m2 = parseFloat(r[6]) || 0;
        const m3 = parseFloat(r[9]) || 0;
        credits.push({
            fournisseur: r[0],
            montant_total: mt,
            date1: serialDateToDate(r[2]),
            montant1: m1,
            reste1: mt - m1,
            date2: serialDateToDate(r[5]),
            montant2: m2,
            reste2: Math.max(0, mt - m1 - m2),
            date3: serialDateToDate(r[8]),
            montant3: m3,
            reste3: Math.max(0, mt - m1 - m2 - m3),
        });
    }
    await supabaseInsert('credits_fournisseurs', credits);

    // ---- 6. IMPORT CONTRATS ----
    console.log('\n6. CONTRATS');
    const contratData = readSheet(`${DATA_DIR}/PERSONNEL 2026.xlsx`, 'CONTRAT ENCOURS');
    const contrats = [];
    for (let i = 1; i < contratData.length; i++) {
        const r = contratData[i];
        if (!r[0]) continue;
        contrats.push({
            reference: r[0],
            client: r[1] || '',
            objet: r[0] || '',
            montant: parseFloat(r[3]) || 0,
            date_debut: serialDateToDate(r[4]),
            date_fin: serialDateToDate(r[5]),
            statut: 'EN COURS',
        });
    }
    await supabaseInsert('contrats', contrats);

    // ---- 7. IMPORT MATERIELS ----
    console.log('\n7. MATERIELS');
    const matData = readSheet(`${DATA_DIR}/LOGISTIQUE 2026.xlsx`, 'MATERIAUX');
    const materiels = [];
    for (let i = 1; i < matData.length; i++) {
        const r = matData[i];
        if (!r[2]) continue;
        materiels.push({
            libelle: r[2],
            etat: r[0] || 'EN MARCHE',
            quantite: parseFloat(r[1]) || 1,
            chantier_actuel: r[3] || '',
        });
    }
    await supabaseInsert('materiels', materiels);

    console.log('\n=== IMPORT TERMINE ===');
}

main().catch(console.error);
