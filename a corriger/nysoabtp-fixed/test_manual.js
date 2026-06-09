/**
 * test_manual.js — Guide interactif de tests manuels NySoa BTP
 * 
 * Usage : node test_manual.js
 * 
 * Ce script vous guide pas à pas à travers chaque fonctionnalité.
 * Vous validez visuellement chaque étape. Les résultats sont sauvegardés.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const q = (query) => new Promise(resolve => rl.question(query, resolve));

const results = { pass: 0, fail: 0, skipped: 0, details: [] };
const LOG_FILE = path.join(__dirname, 'test_manual_log.json');
const CONFIG_FILE = path.join(__dirname, 'test_manual_config.json');

// Load progress if exists
let progress = {};
if (fs.existsSync(LOG_FILE)) {
  try { progress = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8')); } catch(e) {}
}

async function ask(question, defaultValue) {
  const answer = await q(question + ' (O/n/x=exit) ');
  const a = answer.trim().toLowerCase();
  if (a === 'x') { await saveAndExit(); process.exit(0); }
  if (a === '' || a === 'o' || a === 'y') return true;
  if (a === 'n') return false;
  return defaultValue !== undefined ? defaultValue : false;
}

async function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log('  ' + title);
  console.log('='.repeat(60));
}

async function step(id, description, instruction) {
  if (progress[id] !== undefined) {
    const prev = progress[id];
    if (prev.status === 'pass') { results.pass++; console.log(`  ↻ ${id}: déjà validé ✓`); return true; }
    if (prev.status === 'skip') { results.skipped++; console.log(`  ↻ ${id}: déjà ignoré`); return false; }
  }
  console.log('\n--- ' + id + ': ' + description);
  console.log('  ▶ ' + instruction);
  const ok = await ask('  ✓ Fonctionne ?');
  if (ok) {
    results.pass++;
    progress[id] = { status: 'pass', description, timestamp: new Date().toISOString() };
  } else {
    const note = await q('  ✗ Décris le problème (ou Entrée pour ignorer) : ');
    if (note.trim()) {
      results.fail++;
      progress[id] = { status: 'fail', description, note: note.trim(), timestamp: new Date().toISOString() };
    } else {
      results.skipped++;
      progress[id] = { status: 'skip', description, timestamp: new Date().toISOString() };
    }
  }
  saveProgress();
  return ok;
}

function saveProgress() {
  fs.writeFileSync(LOG_FILE, JSON.stringify(progress, null, 2), 'utf8');
  results.details = Object.values(progress);
}

async function saveAndExit() {
  saveProgress();
  console.log('\n' + '-'.repeat(40));
  console.log('RÉSULTATS : ✓ ' + results.pass + '  ✗ ' + results.fail + '  - ' + results.skipped + ' ignorés');
  if (results.fail > 0) {
    console.log('\nProblèmes :');
    for (const [id, p] of Object.entries(progress)) {
      if (p.status === 'fail') console.log('  ✗ ' + id + ': ' + (p.note || ''));
    }
  }
  rl.close();
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║     TESTS MANUELS — ERP NySoa BTP            ║');
  console.log('║     O = OK / n = NON / x = quitter          ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('Ouvre ton navigateur sur https://nysoabtp.github.io/nysoabtp/');
  const ready = await q('\nPrêt ? (Entrée pour commencer) ');
  if (ready.toLowerCase() === 'x') { rl.close(); return; }

  // ═══════════════════════════════
  // 1. CONNEXION
  // ═══════════════════════════════
  await section('1. CONNEXION');
  await step('LOG-1', 'Page de connexion', 'Va sur login.html. Vérifie que le formulaire email + mot de passe + bouton "Se connecter" sont visibles.');
  await step('LOG-2', 'Comptes de démo', 'Vérifie que des boutons de comptes rapides sont affichés (admin, daf, rh...). Clique sur admin.');

  const loginRoles = [
    { id: 'LOG-ADMIN', role: 'admin', email: 'admin@nysoa.mg', pwd: 'admin123' },
    { id: 'LOG-DAF', role: 'daf', email: 'daf@nysoa.mg', pwd: 'daf123' },
    { id: 'LOG-RH', role: 'rh', email: 'rh@nysoa.mg', pwd: 'rh123' },
  ];
  for (const r of loginRoles) {
    await step(r.id, 'Connexion ' + r.role, 'Connecte-toi avec ' + r.email + ' / ' + r.pwd + '. Vérifie que tu arrives bien sur le dashboard ' + r.role);
    if (!await ask('Déconnecté ? Prêt pour le suivant ?')) break;
  }

  // ═══════════════════════════════
  // 2. ADMIN
  // ═══════════════════════════════
  await section('2. ADMIN');
  await step('ADM-1', 'Dashboard admin', 'Connecte-toi en admin. Vérifie que la sidebar a 9 sections (Import, Backup, Supabase, Utilisateurs, Rapports, Contrôles, Validations, Gantt, Stock).');
  await step('ADM-2', 'Import Excel', 'Clique "Import Excel". Vérifie qu\'un input fichier est visible avec un bouton "Importer".');
  await step('ADM-3', 'Sauvegarde', 'Clique "Sauvegarde". Vérifie qu\'un bouton "Sauvegarder" ou "Backup" est présent.');
  await step('ADM-4', 'Supabase', 'Clique "Supabase". Vérifie que les infos de connexion Supabase sont affichées (URL, status).');
  await step('ADM-5', 'Utilisateurs', 'Clique "Utilisateurs". Vérifie qu\'un formulaire de création d\'utilisateur est visible (email, mot de passe, rôle).');
  await step('ADM-6', 'Contrôles', 'Clique "Contrôles". Vérifie un tableau/liste des contrôles inopinés.');
  await step('ADM-7', 'Validations', 'Clique "Validations". Vérifie les filtres (En attente, Approuvé, Refusé).');
  await step('ADM-8', 'Avancement Gantt', 'Clique "Avancement Gantt". Vérifie qu\'une section "Gantt" ou planning s\'affiche.');

  // ═══════════════════════════════
  // 3. DAF
  // ═══════════════════════════════
  await section('3. DAF');
  await step('DAF-1', 'Dashboard DAF', 'Connecte-toi en DAF. Vérifie la sidebar : Tableau de bord, Comptabilité, Budget, Budget FELANA, Devis, Factures, Rapports Financiers.');
  await step('DAF-2', 'Comptabilité - Journal', 'Va dans Comptabilité. Vérifie que le journal comptable s\'affiche avec un bouton "Nouvelle écriture".');
  await step('DAF-3', 'Nouvelle écriture', 'Clique "Nouvelle écriture". Vérifie le modal avec date, libellé, débit, crédit, catégorie. Annule.');
  await step('DAF-4', 'Budget FELANA', 'Va dans "Budget FELANA". Vérifie le tableau avec des lignes de budget.');
  await step('DAF-5', 'Devis & Proforma', 'Va dans "Devis & Proforma". Vérifie tableau des devis.');
  await step('DAF-6', 'Factures', 'Va dans "Factures". Vérifie le tableau + bouton "Nouvelle Facture".');

  // ═══════════════════════════════
  // 4. RH
  // ═══════════════════════════════
  await section('4. RH');
  await step('RH-1', 'Dashboard RH', 'Connecte-toi en RH. Vérifie la sidebar : Employés, Recrutement, Congés, Formations, Paie, Rapports.');
  await step('RH-2', 'Employés', 'Va dans "Employés". Vérifie tableau + bouton "Nouvel employé".');
  await step('RH-3', 'Nouvel employé', 'Clique "Nouvel employé". Vérifie le modal (nom, prénom, poste, département, date, salaire). Annule.');
  await step('RH-4', 'Congés', 'Va dans "Congés". Vérifie que le tableau + bouton "Nouvelle demande" sont présents.');
  await step('RH-5', 'Paie', 'Va dans "Paie". Vérifie le tableau + bouton "Générer fiches" + "Export global" + "Réajuster".');
  await step('RH-6', 'Export paie', 'Vérifie qu\'il y a "Export global" et "Export chantier" dans la section Paie.');

  // ═══════════════════════════════
  // 5. CHEF DE CHANTIER
  // ═══════════════════════════════
  await section('5. CHEF DE CHANTIER');
  await step('CHF-1', 'Dashboard chef', 'Connecte-toi en chef (chef@nysoa.mg / chef123). Vérifie que le tableau de bord affiche le nom du chantier scope.');
  await step('CHF-2', 'Sidebar complète', 'Vérifie les 8 sections : Tableau de bord, Mes Chantiers, Mon Équipe, Pointage, Planning, Matériaux, Recrutement, Rapports.');
  await step('CHF-3', 'Mon Équipe', 'Va dans "Mon Équipe". Vérifie le tableau du personnel pour ce chantier.');
  await step('CHF-4', 'Pointage', 'Va dans "Pointage". Vérifie le formulaire manuel avec sélection employé + date + statut.');
  await step('CHF-5', 'Planning', 'Va dans "Planning". Vérifie le planning des tâches.');
  await step('CHF-6', 'Matériaux', 'Va dans "Matériaux". Vérifie la liste des matériaux/stock + bouton "Demande".');
  await step('CHF-7', 'Rapports', 'Va dans "Rapports". Vérifie tableau + bouton "Nouveau rapport".');

  // ═══════════════════════════════
  // 6. CONTROLEUR
  // ═══════════════════════════════
  await section('6. CONTROLEUR');
  await step('CTR-1', 'Dashboard contrôleur', 'Connecte-toi en contrôleur (controleur@nysoa.mg / controleur123). Vérifie sidebar : Tableau de bord, Inspections, Qualité, Sécurité, Rapports.');
  await step('CTR-2', 'Inspections', 'Va dans "Inspections". Vérifie tableau + bouton "Nouvelle Inspection".');
  await step('CTR-3', 'Nouvelle Inspection', 'Clique "Nouvelle Inspection". Vérifie le modal avec sélection chantier + checklists qualité/sécurité.');
  await step('CTR-4', 'Qualité', 'Va dans "Qualité". Vérifie les checklists (cases à cocher).');
  await step('CTR-5', 'Sécurité', 'Va dans "Sécurité". Vérifie les checklists sécurité.');

  // ═══════════════════════════════
  // 7. TECHNICIEN
  // ═══════════════════════════════
  await section('7. TECHNICIEN');
  await step('TEC-1', 'Dashboard technicien', 'Connecte-toi en technicien (technicien@nysoa.mg / tech123). Vérifie sidebar : Tableau de bord, Mes Projets, Tâches, Interventions, Rapports.');
  await step('TEC-2', 'Mes Projets', 'Va dans "Mes Projets". Vérifie tableau des projets.');
  await step('TEC-3', 'Tâches', 'Va dans "Tâches". Vérifie tableau + bouton "Nouvelle tâche".');
  await step('TEC-4', 'Interventions', 'Va dans "Interventions". Vérifie tableau + bouton "Nouvelle intervention".');

  // ═══════════════════════════════
  // 8. FONCTIONS TRANSVERSES
  // ═══════════════════════════════
  await section('8. FONCTIONS TRANSVERSES');
  await step('GEN-1', 'Changement mot de passe', 'Connecté en n\'importe quel rôle, cherche le bouton "Changer mot de passe" en haut à droite. Clique et vérifie le modal.');
  await step('GEN-2', 'Déconnexion', 'Vérifie que le bouton "Déconnexion" fonctionne et ramène à login.html.');
  await step('GEN-3', 'Responsive mobile', 'Réduis la fenêtre à 375px de large. Vérifie que la sidebar est responsive ou masquée avec un menu burger.');
  await step('GEN-4', 'PWA - Installable', 'Vérifie que le navigateur propose "Installer l\'application" (icône + dans la barre d\'adresse).');

  // ═══════════════════════════════
  // FIN
  // ═══════════════════════════════
  await saveAndExit();
}

main().catch(e => { console.error(e); rl.close(); });
