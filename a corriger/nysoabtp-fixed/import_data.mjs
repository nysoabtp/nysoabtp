import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc0MjU5OSwiZXhwIjoyMDkzMzE4NTk5fQ.4kNQ8GZorsHKZl9SoHC8ErcHjuOjKNZkPTzfnHIw-oM';
const db = createClient('https://djncsybvloyyesllfxhq.supabase.co', KEY);
const DIR = 'D:/Mandimby/donner';

function excelDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') {
    if (v < 40000 || v > 80000) return null;
    const d = new Date((v - 25569) * 86400 * 1000);
    return d.toISOString().split('T')[0];
  }
  const s = String(v).trim();
  if (!s || s.length > 12 || /[a-zA-Z]{3,}/.test(s)) return null;
  const parts = s.split(/[/-]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
    return `${parts[2].padStart(2,'0')}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  }
  return null;
}

function safeNum(v) { 
  if (v === null || v === undefined || v === '') return 0;
  const s = String(v).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function safeStr(v) { 
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' || s.length > 100 ? null : s;
}

async function batchInsert(table, rows, batchSize = 100) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    try {
      const { error } = await db.from(table).insert(batch);
      if (!error) inserted += batch.length;
    } catch(e) {}
    if (inserted % 500 === 0) process.stdout.write(`  ${inserted}/${rows.length}...\r`);
  }
  return inserted;
}

async function importJournal() {
  console.log('\n=== IMPORT JOURNAL ===');
  const wb = XLSX.readFile(`${DIR}/JOURNAL 2026.xlsx`);
  const ws = wb.Sheets['JOURNAL'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }).slice(1);
  
  const payloads = rows
    .filter(r => r[2] && r[3] && excelDate(r[0]))
    .map(r => ({
      date_ecriture: excelDate(r[0]),
      chantier: safeStr(r[1]),
      designation: safeStr(r[2]) || '',
      montant: safeNum(r[3]),
      mode_paiement: safeStr(r[4]),
      categorie: safeStr(r[5]),
      travaux: safeStr(r[6])
    }))
    .filter(r => r.designation && r.montant > 0);

  const total = await batchInsert('journal', payloads);
  console.log(`  Importe: ${total}/${payloads.length}`);
}

async function importAchats() {
  console.log('\n=== IMPORT ACHATS ===');
  const wb = XLSX.readFile(`${DIR}/ACHAT 2026.xlsx`);
  const ws = wb.Sheets['DETAIL ACHAT'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }).slice(1);

  const payloads = rows
    .filter(r => r[0] && r[2] && excelDate(r[0]))
    .map(r => ({
      date_achat: excelDate(r[0]),
      chantier: safeStr(r[1]),
      libelle: safeStr(r[2]) || '',
      quantite: Math.max(1, safeNum(r[3]) || 1),
      prix: safeNum(r[4]),
      prix_unitaire: safeNum(r[4]),
      fournisseur: safeStr(r[5]),
      mode_paiement: safeStr(r[6]),
      statut: 'OK'
    }));

  const total = await batchInsert('commandes', payloads);
  console.log(`  Importe: ${total}/${payloads.length}`);
}

async function importPersonnel() {
  console.log('\n=== IMPORT PERSONNEL ===');
  const wb = XLSX.readFile(`${DIR}/PERSONNEL 2026.xlsx`);

  // Personnel
  const ws = wb.Sheets['BASE'];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }).slice(1);
  const existing = new Set();
  const { data: existingPers } = await db.from('personnel').select('nom');
  if (existingPers) existingPers.forEach(p => existing.add(p.nom));

  const pers = rows
    .filter(r => r[1] && !existing.has(safeStr(r[1])))
    .map(r => {
      const sal = safeNum(r[2]);
      return {
        nom: safeStr(r[1]),
        chantier_code: safeStr(r[0]),
        metier: safeStr(r[3]),
        salaire_journalier: sal,
        type_salaire: sal >= 100000 ? 'MENSUEL' : 'JOURNALIER',
        actif: true,
        date_embauche: '2024-01-01'
      };
    });

  let inserted = 0;
  for (const p of pers) {
    const { error } = await db.from('personnel').insert(p);
    if (!error) inserted++;
  }
  console.log(`  Personnel: ${inserted} nouveaux`);

  // Contrats
  console.log('\n  --- Contrats ---');
  const ws2 = wb.Sheets['CONTRAT ENCOURS'];
  const rows2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: null }).slice(2);
  const { data: existingCt } = await db.from('contrats').select('designation');
  const existingC = new Set((existingCt || []).map(c => c.designation));

  const contrats = rows2
    .filter(r => r[0] && !existingC.has(safeStr(r[0])))
    .map(r => ({
      designation: safeStr(r[0]),
      prestataire: safeStr(r[1]),
      chantier: safeStr(r[2]),
      date_debut: excelDate(r[4]),
      date_fin_prevue: excelDate(r[5])
    }))
    .filter(r => r.designation);

  const ct = await batchInsert('contrats', contrats);
  console.log(`  Contrats: ${ct}`);

  // Pointages - convert weekly to daily
  console.log('\n  --- Pointages (conversion hebdo -> jour) ---');
  const ws3 = wb.Sheets['POINTAGE ET AVANCE'];
  const rows3 = XLSX.utils.sheet_to_json(ws3, { header: 1, defval: null }).slice(2);
  const DAYS = ['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
  let pointages = [];
  let weeks = 0;

  for (const r of rows3) {
    if (!r[2]) continue;
    const weekStart = excelDate(r[0]);
    if (!weekStart) continue;
    const weekDate = new Date(weekStart);
    const nom = safeStr(r[2]);
    const chantier = safeStr(r[1]);
    if (!nom) continue;

    for (let d = 0; d < 7; d++) {
      const val = safeNum(r[3 + d]);
      if (val > 0) {
        const day = new Date(weekDate);
        day.setDate(day.getDate() + d);
        pointages.push({
          date: day.toISOString().split('T')[0],
          heure: '08:00',
          chantier,
          nom_employe: nom,
          type_pointage: 'Arrivée',
          statut: 'Validé'
        });
      }
    }
    weeks++;
    if (pointages.length >= 500) {
      await batchInsert('pointage_attendance', pointages.splice(0, 500));
    }
  }
  if (pointages.length > 0) await batchInsert('pointage_attendance', pointages);
  console.log(`  Pointages: ${weeks} semaines traitees`);
}

async function main() {
  console.log('=== IMPORT DONNEES ===');
  await importJournal();
  await importAchats();
  await importPersonnel();
  console.log('\n=== TERMINE ===');
}

main().catch(console.error);
