const { chromium } = require('playwright');
const BASE = 'https://nysoabtp.github.io/nysoabtp';

let pass = 0, fail = 0, warn = 0, skip = 0;

function log(id, desc, sev, result, notes) {
  const sym = result === 'PASS' ? '✅' : result === 'WARN' ? '⚠️' : result === 'SKIP' ? '⏭️' : '❌';
  console.log(`${sym} ${id.padEnd(22)} ${result.padEnd(5)} ${sev.padEnd(4)} ${notes || ''}`);
  if (result === 'PASS') pass++; else if (result === 'FAIL') fail++; else if (result === 'WARN') warn++; else skip++;
}

async function login(page, email, pass) {
  await page.goto(BASE + '/login.html', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(800);
  const inputs = await page.$$('input');
  if (inputs.length >= 2) { await inputs[0].fill(email); await inputs[1].fill(pass); }
  const btn = await page.$('button, input[type="submit"]');
  if (btn) await btn.click(); else await page.keyboard.press('Enter');
  await page.waitForTimeout(3500);
  return page.url();
}

async function clickSec(page, section) {
  const link = await page.$(`a[data-section="${section}"]`);
  if (link) { await link.click(); await page.waitForTimeout(800); return true; }
  return false;
}

async function countBtns(page) {
  return await page.$$eval('button', els =>
    els.filter(e => e.offsetParent !== null).map(e => e.innerText.trim()).filter(t => t.length < 50 && t.length > 0)
  );
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    // ══════════════════════════════════════════════════════════
    // RH — 7 sections
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ RH (7 sections) ═══════════\n');

    {
      const p = await browser.newPage();
      const url = await login(p, 'rh@nysoa.mg', 'rh123');
      log('LOGIN-RH', 'Redirection', 'RH', url.includes('rh.html') ? 'PASS' : 'FAIL', url.replace(BASE, ''));

      const sections = ['dashboard', 'employes', 'recrutement', 'conges', 'formations', 'paie', 'rapports'];
      for (const s of sections) {
        const found = await clickSec(p, s);
        if (found) {
          const btns = await countBtns(p);
          log('RH-' + s.padEnd(14), s, 'RH', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 4).join(', '));
        } else {
          log('RH-' + s.padEnd(14), s, 'RH', 'FAIL', 'Lien introuvable');
        }
      }

      // Modals RH
      await clickSec(p, 'employes');
      const newEmp = await p.$('button:has-text("Nouvel Employé")');
      log('RH-EMP-01', 'Nouvel Employé btn', 'RH', newEmp ? 'PASS' : 'FAIL', '');

      await clickSec(p, 'recrutement');
      const newRec = await p.$('button:has-text("Nouvelle offre")');
      log('RH-REC-01', 'Nouvelle offre btn', 'RH', newRec ? 'PASS' : 'FAIL', '');

      await clickSec(p, 'formations');
      const newForm = await p.$('button:has-text("Formation")');
      log('RH-FOR-01', 'Nouvelle formation btn', 'RH', newForm ? 'PASS' : 'FAIL', '');

      await clickSec(p, 'paie');
      const genFiches = await p.$('button:has-text("Générer fiches")');
      const genPaie = await p.$('button:has-text("Générer")');
      log('RH-PAI-01', 'Génération fiches paie', 'RH', genFiches ? 'PASS' : 'FAIL', genFiches ? 'Générer fiches' : '');

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // CONTRÔLEUR — sections WARN détaillées
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ CONTRÔLEUR (inspections + qualite) ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'controleur@nysoa.mg', 'controleur123');

      // Inspections: vérifier le formulaire
      await clickSec(p, 'inspections');
      const formInspection = await p.$('#form-inspection');
      log('CTR-FRM-01', 'Formulaire inspection', 'CTR', formInspection ? 'PASS' : 'FAIL', '');

      if (formInspection) {
        const inputs = await p.$$eval('#form-inspection input, #form-inspection select, #form-inspection textarea', els => els.length);
        log('CTR-FRM-02', 'Champs formulaire', 'CTR', inputs >= 3 ? 'PASS' : 'WARN', inputs + ' champs');
      }

      // Qualité: vérifier les checkboxes
      await clickSec(p, 'qualite');
      const checkboxes = await p.$$('.checklist-item input[type="checkbox"]');
      log('CTR-QLT-01', 'Checklist qualité', 'CTR', checkboxes.length > 0 ? 'PASS' : 'FAIL', checkboxes.length + ' items');

      // Sécurité
      await clickSec(p, 'securite');
      const secCheckboxes = await p.$$('.checklist-item input[type="checkbox"]');
      log('CTR-SEC-01', 'Checklist sécurité', 'CTR', secCheckboxes.length > 0 ? 'PASS' : 'FAIL', secCheckboxes.length + ' items');

      // Sélection chantier dans le formulaire inspection (avec RLS fix)
      await clickSec(p, 'inspections');
      await p.waitForTimeout(3000); // Attendre le chargement asynchrone des chantiers
      const chantierSelect = await p.$('#inspection-chantier');
      if (chantierSelect) {
        const opts = await p.$$eval('#inspection-chantier option', els => els.filter(e => e.value).map(e => e.value));
        log('CTR-INS-02', 'Liste chantiers inspection', 'CTR', opts.length > 0 ? 'PASS' : 'FAIL', opts.length + ' chantiers: ' + opts.slice(0, 3).join(', '));
      }

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // TECHNICIEN — toutes sections avec les bons IDs
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ TECHNICIEN (5 sections) ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'technicien@nysoa.mg', 'tech123');

      const sections = ['dashboard', 'projets', 'taches', 'interventions', 'rapports'];
      for (const s of sections) {
        const found = await clickSec(p, s);
        if (found) {
          const btns = await countBtns(p);
          log('TEC-' + s.padEnd(14), s, 'TEC', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 4).join(', '));
        } else {
          log('TEC-' + s.padEnd(14), s, 'TEC', 'FAIL', 'Lien introuvable');
        }
      }

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // CHEF — sections manquantes détaillées
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ CHEF (Chantiers + formulaires) ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'chef@nysoa.mg', 'chef123');

      // Mes Chantiers: vérifier qu'il y a bien les données
      await clickSec(p, 'chantiers');
      const chantierBody = await p.$('#projets-table tbody');
      if (chantierBody) {
        const rows = await p.$$eval('#projets-table tbody tr', els => els.length);
        log('CHF-CHT-01', 'Tableau chantier (données)', 'CHEF', rows > 0 && rows <= 2 ? 'PASS' : 'WARN', rows + ' lignes');
      }

      // Pointage: QR scanner et formulaire
      await clickSec(p, 'pointage');
      const scanBtn = await p.$('button:has-text("Scan")');
      log('CHF-PTG-02', 'Bouton scan QR', 'CHEF', scanBtn ? 'PASS' : 'FAIL', '');

      const ptgForm = await p.$('form[onsubmit*="enregistrerPointage"]');
      log('CHF-PTG-03', 'Formulaire pointage manuel', 'CHEF', ptgForm ? 'PASS' : 'FAIL', '');

      // Planning
      await clickSec(p, 'planning');
      const planningForm = await p.$('form[onsubmit*="submitPlanning"]');
      log('CHF-PLN-02', 'Formulaire planning', 'CHEF', planningForm ? 'PASS' : 'FAIL', '');

      // Matériaux: demandes
      await clickSec(p, 'materiaux');
      const demMat = await p.$('button:has-text("Demande")');
      log('CHF-MAT-01', 'Demande matériaux btn', 'CHEF', demMat ? 'PASS' : 'FAIL', '');

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // ADMIN — sections restantes détaillées
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ ADMIN (validations + formulaires) ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'admin@nysoa.mg', 'admin123');

      // Validations: onglets
      await clickSec(p, 'validations');
      const valTabs = await p.$$eval('button', els =>
        els.filter(e => ['En attente', 'Approuvées', 'Rejetées', 'Toutes'].includes(e.innerText.trim())).map(e => e.innerText.trim())
      );
      log('ADM-VAL-01', 'Onglets validations', 'ADMIN', valTabs.length >= 3 ? 'PASS' : 'WARN', valTabs.join(', '));

      // Gantt
      await clickSec(p, 'gantt');
      const newTask = await p.$('button:has-text("Nouvelle tâche")');
      log('ADM-GNT-01', 'Nouvelle tâche Gantt', 'ADMIN', newTask ? 'PASS' : 'FAIL', '');

      // Import: vérifier le drag-drop
      await clickSec(p, 'import');
      const dropZone = await p.$('#drop-zone, .drop-zone, [ondrop]');
      log('ADM-IMP-01', 'Zone import Excel', 'ADMIN', dropZone ? 'PASS' : 'FAIL', '');

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // DAF — sections manquantes
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ DAF (Comptabilité + formulaires) ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'daf@nysoa.mg', 'daf123');

      // Comptabilité: nouvelle écriture
      await clickSec(p, 'comptabilite');
      const newEcriture = await p.$('button:has-text("Nouvelle")');
      log('DAF-CPT-01', 'Nouvelle écriture comptable', 'DAF', newEcriture ? 'PASS' : 'FAIL', '');

      // Budget FELANA: formulaire
      await clickSec(p, 'budget-felana');
      const felanaForm = await p.$('#felana-form');
      log('DAF-FEL-02', 'Formulaire FELANA', 'DAF', felanaForm ? 'PASS' : 'FAIL', '');

      // Devis: éditeur
      await clickSec(p, 'devis');
      const editorBtn = await p.$('button[onclick*="ouvrirEditeurDevis"]');
      log('DAF-DEV-02', 'Éditeur devis ouvrable', 'DAF', editorBtn ? 'PASS' : 'FAIL', '');

      await p.close();
    }

  } catch(e) {
    console.error('\nFATAL:', e.message);
  } finally {
    await browser.close();
    const total = pass + fail + warn + skip;
    const pct = total > 0 ? Math.round(pass / (pass + fail + warn) * 100) : 0;
    console.log('\n══════════════════════════════════════════════════════════');
    console.log(`  RÉSULTATS COMPLÉMENTAIRES : ✅ ${pass} PASS  ❌ ${fail} FAIL  ⚠️ ${warn} WARN  ⏭️ ${skip} SKIP`);
    console.log(`  Taux : ${pct}%`);
    console.log('══════════════════════════════════════════════════════════\n');
  }
})();
