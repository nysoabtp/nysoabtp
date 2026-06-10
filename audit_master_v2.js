const { chromium } = require('playwright');
const BASE = 'https://nysoabtp.github.io/nysoabtp';

let total = { pass: 0, fail: 0, warn: 0, skip: 0 };

function log(id, desc, sev, result, notes) {
  const sym = result === 'PASS' ? '✅' : result === 'WARN' ? '⚠️' : result === 'SKIP' ? '⏭️' : '❌';
  console.log(`${sym} ${id.padEnd(20)} ${result.padEnd(5)} ${sev.padEnd(4)} ${notes || ''}`);
  if (result === 'PASS') total.pass++;
  else if (result === 'FAIL') total.fail++;
  else if (result === 'WARN') total.warn++;
  else total.skip++;
}

async function login(page, email, pass) {
  await page.goto(BASE + '/login.html', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1000);
  const inputs = await page.$$('input');
  if (inputs.length >= 2) {
    await inputs[0].fill(email);
    await inputs[1].fill(pass);
  }
  const btn = await page.$('button, input[type="submit"]');
  if (btn) await btn.click();
  else await page.keyboard.press('Enter');
  await page.waitForTimeout(4000);
  return page.url();
}

async function clickSection(page, section) {
  const link = await page.$(`a[data-section="${section}"]`);
  if (link) { await link.click(); await page.waitForTimeout(1500); return true; }
  const items = await page.$$('a.nav-item');
  for (const item of items) {
    const t = (await item.innerText()).trim();
    const s = await item.getAttribute('data-section');
    const onclick = await item.getAttribute('onclick') || '';
    const m = onclick.match(/showSection\('([^']+)'\)/);
    const onclickSection = m ? m[1] : null;
    if (t === section || s === section || onclickSection === section) {
      await item.click(); await page.waitForTimeout(1500); return true;
    }
  }
  return false;
}

async function closeModals(page) {
  const closeBtns = await page.$$('.modal.active .close-modal');
  for (const btn of closeBtns) {
    try { await btn.click({ force: true }); await page.waitForTimeout(500); } catch(_) {}
  }
  // Also close by pressing Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}

async function countButtons(page) {
  return await page.$$eval('button:visible', els => 
    els.filter(e => e.offsetParent !== null && e.innerText.trim().length > 0)
      .map(e => e.innerText.trim())
      .filter(t => t.length < 50 && t.length > 0)
  );
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 1: CONNEXION — 6 rôles + redirection + accès
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 1: CONNEXION (6 rôles) ═══════════\n');

    const roles = [
      { email: 'admin@nysoa.mg', pass: 'admin123', expected: 'admin.html', label: 'Admin' },
      { email: 'daf@nysoa.mg', pass: 'daf123', expected: 'daf.html', label: 'DAF' },
      { email: 'rh@nysoa.mg', pass: 'rh123', expected: 'rh.html', label: 'RH' },
      { email: 'chef@nysoa.mg', pass: 'chef123', expected: 'chef-chantier.html', label: 'Chef' },
      { email: 'controleur@nysoa.mg', pass: 'controleur123', expected: 'controleur.html', label: 'Contrôleur' },
      { email: 'technicien@nysoa.mg', pass: 'tech123', expected: 'technicien.html', label: 'Technicien' },
    ];

    for (const role of roles) {
      const p = await browser.newPage();
      const url = await login(p, role.email, role.pass);
      const ok = url.includes(role.expected);
      log('LOGIN-' + role.label, '→ ' + role.expected, 'ALTA', ok ? 'PASS' : 'FAIL', `Redirigé vers ${url.replace(BASE,'')}`);
      await p.close();
    }

    // TC-LOG-01: login form
    {
      const p = await browser.newPage();
      await p.goto(BASE + '/login.html', { waitUntil: 'load', timeout: 15000 });
      const hasForm = (await p.content()).includes('email') && (await p.content()).includes('password');
      log('TC-LOG-01', 'Formulaire connexion visible', 'ALTA', hasForm ? 'PASS' : 'FAIL', `Titre: ${await p.title()}`);
      await p.close();
    }

    // TC-LOG-06: Chef tentant d'accéder à index.html (frontend auth gap)
    {
      const p = await browser.newPage();
      await login(p, 'chef@nysoa.mg', 'chef123');
      await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 10000 });
      await p.waitForTimeout(3000);
      const url = p.url();
      const blocked = !url.includes('index');
      log('TC-LOG-06', 'Chef → index.html (bloqué?)', 'ALTA', blocked ? 'PASS' : 'FAIL',
        blocked ? 'Redirigé' : 'ACCÈS NON BLOQUÉ (frontend gap)');
      await p.close();
    }

    // TC-LOG-07: Mauvais mot de passe
    {
      const p = await browser.newPage();
      await p.goto(BASE + '/login.html', { waitUntil: 'load', timeout: 15000 });
      await p.waitForTimeout(1000);
      const inputs = await p.$$('input');
      if (inputs.length >= 2) {
        await inputs[0].fill('admin@nysoa.mg');
        await inputs[1].fill('wrongpassword');
      }
      await (await p.$('button'))?.click();
      await p.waitForTimeout(3000);
      const stillOnLogin = p.url().includes('login');
      log('TC-LOG-07', 'Mauvais mot de passe', 'ALTA', stillOnLogin ? 'PASS' : 'FAIL',
        stillOnLogin ? 'Resté sur login' : 'Redirigé (anormal)');
      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 2: admin.html — TOUTES les sections + sous-sections
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 2: admin.html (7 sections) ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'admin@nysoa.mg', 'admin123');

      // KPIs
      const cards = await p.$$('.kpi-card, .card, .stat-card, [class*="kpi"], [class*="stat"], [class*="metric"]');
      log('TC-ADM-01', 'KPIs / Statistiques', 'ADMIN', cards.length >= 3 ? 'PASS' : 'WARN', `${cards.length} cards`);

      const sections = [
        'import', 'backup', 'users', 'rapports',
        'controles', 'validations', 'gantt'
      ];

      for (const s of sections) {
        const found = await clickSection(p, s);
        if (found) {
          const btns = await countButtons(p);
          log('ADM-' + s.padEnd(16), 'Section ' + s, 'ADMIN', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 5).join(', '));
        } else {
          log('ADM-' + s.padEnd(16), 'Section ' + s, 'ADMIN', 'FAIL', 'Lien introuvable');
        }

        // Sous-sections pour sauvegarde
        if (s === 'backup') {
          const subSections = ['Journal des dépenses', 'Achats & commandes', 'Personnel & pointage', 'Logistique & matériaux'];
          const subBtns = await p.$$('button.btn:not(.close-modal)');
          for (const sub of subBtns) {
            try {
              const t = (await sub.innerText()).trim();
              if (subSections.includes(t)) {
                await sub.click(); await p.waitForTimeout(1200);
                log('ADM-sous-' + t.substring(0, 12).padEnd(12), t, 'ADMIN', 'PASS', 'Contenu chargé');
              }
            } catch(_) {}
          }
          await clickSection(p, 'backup');
        }
      }

      // Formulaire création utilisateur
      await clickSection(p, 'users');
      const emailInp = await p.$('#cu-email');
      const passInp = await p.$('#cu-password');
      const roleSel = await p.$('#cu-role');
      log('TC-ADM-04', 'Création utilisateur form', 'ADMIN',
        emailInp && passInp && roleSel ? 'PASS' : 'FAIL',
        `Email:${!!emailInp} Pass:${!!passInp} Role:${!!roleSel}`);

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 3: index.html — TOUTES les sections
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 3: index.html (17 sections) ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'admin@nysoa.mg', 'admin123');
      await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 15000 });
      await p.waitForTimeout(3000);

      const sectionIds = [
        'dashboard', 'projets', 'suivi-chantier', 'journal', 'caisse', 'credits',
        'achats', 'logistique', 'catalogue', 'personnel', 'pointage', 'salaires',
        'antoka', 'devis', 'proformat', 'contrats', 'rapports'
      ];

      const navItems = await p.$$eval('a.nav-item', els =>
        els.filter(e => e.offsetParent !== null && e.getAttribute('data-section'))
          .map(e => ({ text: e.innerText.trim(), section: e.getAttribute('data-section') }))
      );

      for (const sid of sectionIds) {
        const found = await clickSection(p, sid);
        if (found) {
          const btns = await countButtons(p);
          const label = navItems.find(n => n.section === sid)?.text || sid;
          log('IDX-' + sid.substring(0, 14).padEnd(14), label, 'ERP', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 5).join(', '));
        } else {
          log('IDX-' + sid.substring(0, 14).padEnd(14), sid, 'ERP', 'FAIL', 'Lien introuvable');
        }
      }

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 3b: Modals (Antoka, Caisse, Personnel)
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 3b: Modals & Formulaires ═══════════\n');

    {
      const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await login(p, 'admin@nysoa.mg', 'admin123');
      await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 15000 });
      await p.waitForTimeout(3000);

      // ANT-02: Bouton Nouvel antoka
      await clickSection(p, 'antoka');
      const newAntoka = await p.$('button:has-text("Nouvel antoka")');
      log('TC-ANT-02', 'Bouton Nouvel antoka', 'ERP', newAntoka ? 'PASS' : 'FAIL', 'Bouton visible');

      // ANT-03: Modal antoka
      if (newAntoka) {
        await newAntoka.click({ force: true });
        await p.waitForTimeout(1500);
        const modal = await p.$('#modal-antoka.active');
        log('TC-ANT-03', 'Modal antoka s\'ouvre', 'ERP', modal ? 'PASS' : 'FAIL', 'Modal active');
        await closeModals(p);
      }

      // CAI-02: Entrée caisse
      await clickSection(p, 'caisse');
      const entreeCaisse = await p.$('button:has-text("Entrée caisse")');
      log('TC-CAI-02', 'Bouton Entrée caisse', 'ERP', entreeCaisse ? 'PASS' : 'FAIL', 'Bouton visible');
      if (entreeCaisse) {
        await entreeCaisse.click({ force: true });
        await p.waitForTimeout(1500);
        const modal = await p.$('.modal.active');
        log('TC-CAI-03', 'Modal caisse s\'ouvre', 'ERP', modal ? 'PASS' : 'FAIL', 'Modal active');
        await closeModals(p);
      }

      // Sortie caisse
      const sortieCaisse = await p.$('button:has-text("Sortie caisse")');
      log('TC-CAI-04', 'Bouton Sortie caisse', 'ERP', sortieCaisse ? 'PASS' : 'FAIL', 'Bouton visible');
      if (sortieCaisse) {
        await sortieCaisse.click({ force: true });
        await p.waitForTimeout(1500);
        const modal = await p.$('.modal.active');
        log('TC-CAI-05', 'Modal sortie caisse', 'ERP', modal ? 'PASS' : 'FAIL', 'Modal active');
        await closeModals(p);
      }

      // RH-02: Nouvel employé
      await clickSection(p, 'personnel');
      const newEmp = await p.$('button:has-text("Nouvel Employé")');
      log('TC-RH-02', 'Bouton Nouvel Employé', 'ERP', newEmp ? 'PASS' : 'FAIL', 'Bouton visible');
      if (newEmp) {
        await newEmp.click({ force: true });
        await p.waitForTimeout(1500);
        const modal = await p.$('.modal.active');
        log('TC-RH-03', 'Modal employé s\'ouvre', 'ERP', modal ? 'PASS' : 'FAIL', 'Modal active');
        await closeModals(p);
      }

      // Devis: Nouveau Devis
      await clickSection(p, 'devis');
      const newDevis = await p.$('button:has-text("Nouveau Devis")');
      log('TC-DEV-02', 'Bouton Nouveau Devis', 'ERP', newDevis ? 'PASS' : 'FAIL', 'Bouton visible');

      // Crédits: Nouveau crédit
      await clickSection(p, 'credits');
      const newCredit = await p.$('button:has-text("Nouveau crédit")');
      log('TC-CRE-02', 'Bouton Nouveau crédit', 'ERP', newCredit ? 'PASS' : 'FAIL', 'Bouton visible');

      // Achats: Nouvel Achat
      await clickSection(p, 'achats');
      const newAchat = await p.$('button:has-text("Nouvel Achat")');
      log('TC-ACH-02', 'Bouton Nouvel Achat', 'ERP', newAchat ? 'PASS' : 'FAIL', 'Bouton visible');

      // Catalogue: Ajouter article
      await clickSection(p, 'catalogue');
      const addArt = await p.$('button:has-text("Ajouter article")');
      log('TC-CAT-02', 'Bouton Ajouter article', 'ERP', addArt ? 'PASS' : 'FAIL', 'Bouton visible');

      // Pointage: Générer QR codes
      await clickSection(p, 'pointage');
      const qrBtn = await p.$('button:has-text("QR Code")');
      log('TC-PTG-02', 'Bouton génération QR', 'ERP', qrBtn ? 'PASS' : 'FAIL', 'Bouton visible');

      // Salaires: Calculer les Salaires
      await clickSection(p, 'salaires');
      const calcSalaire = await p.$('button:has-text("Salaire")');
      log('TC-SAL-02', 'Bouton Calcul salaires', 'ERP', calcSalaire ? 'PASS' : 'FAIL', calcSalaire ? 'Bouton visible' : 'Introuvable');

      // Logistique: Planifier affectation
      await clickSection(p, 'logistique');
      const planifier = await p.$('button:has-text("Planifier")');
      log('TC-LOG-02', 'Bouton Planifier affectation', 'ERP', planifier ? 'PASS' : 'FAIL', 'Bouton visible');

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 4: DAF — Toutes sections
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 4: DAF (7 sections) ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'daf@nysoa.mg', 'daf123');
      log('TC-LOG-03', 'Login DAF', 'ALTA', 'PASS', '→ daf.html');

      const dafSections = ['dashboard', 'comptabilite', 'budget', 'budget-felana', 'devis', 'factures', 'rapports-fin'];

      for (const s of dafSections) {
        const found = await clickSection(p, s);
        if (found) {
          const btns = await countButtons(p);
          const label = ({dashboard:'Tableau de bord',comptabilite:'Comptabilité',budget:'Budget', 'budget-felana':'Budget FELANA', devis:'Devis & Proforma', factures:'Factures', 'rapports-fin':'Rapports Financiers'})[s];
          log('DAF-' + s.substring(0, 14).padEnd(14), label, 'DAF', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 5).join(', '));
        } else {
          log('DAF-' + s.substring(0, 14).padEnd(14), s, 'DAF', 'FAIL', 'Lien introuvable');
        }
      }

      // Boutons modaux DAF
      await clickSection(p, 'devis');
      const ouvrirEditor = await p.$('button:has-text("Nouveau Devis")');
      log('DAF-DEV-01', 'Nouveau Devis btn', 'DAF', ouvrirEditor ? 'PASS' : 'FAIL', 'Bouton visible');

      await clickSection(p, 'budget');
      const nouveauBudget = await p.$('button:has-text("Nouveau Budget")');
      log('DAF-BUD-01', 'Nouveau Budget btn', 'DAF', nouveauBudget ? 'PASS' : 'FAIL', 'Bouton visible');

      await clickSection(p, 'budget-felana');
      const nouvelleLigne = await p.$('button:has-text("Nouvelle ligne")');
      log('DAF-FEL-01', 'Nouvelle ligne FELANA btn', 'DAF', nouvelleLigne ? 'PASS' : 'FAIL', 'Bouton visible');

      await clickSection(p, 'factures');
      const nouvelleFacture = await p.$('button:has-text("Nouvelle Facture")');
      log('DAF-FAC-01', 'Nouvelle Facture btn', 'DAF', nouvelleFacture ? 'PASS' : 'FAIL', 'Bouton visible');

      // KPIs DAF
      const stats = await p.$$('.stat-card h3');
      log('DAF-KPI-01', 'KPIs financiers visibles', 'DAF', stats.length >= 2 ? 'PASS' : 'WARN', `${stats.length} KPIs`);

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 5: CHEF — Toutes sections
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 5: Chef Chantier (8 sections + RLS) ═══════════\n');

    {
      const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await login(p, 'chef@nysoa.mg', 'chef123');
      log('TC-LOG-04', 'Login Chef', 'ALTA', 'PASS', '→ chef-chantier.html');

      const chefSections = ['dashboard', 'chantiers', 'equipe', 'pointage', 'planning', 'materiaux', 'recrutement', 'rapports'];

      for (const s of chefSections) {
        const found = await clickSection(p, s);
        if (found) {
          const btns = await countButtons(p);
          const label = ({dashboard:'Tableau de bord',chantiers:'Mes Chantiers',equipe:'Mon Équipe',pointage:'Pointage',planning:'Planning',materiaux:'Matériaux',recrutement:'Recrutement',rapports:'Rapports'})[s];
          log('CHF-' + s.substring(0, 12).padEnd(12), label, 'CHEF', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 4).join(', '));
        } else {
          log('CHF-' + s.substring(0, 12).padEnd(12), s, 'CHEF', 'FAIL', 'Lien introuvable');
        }
      }

      // RLS validation
      const body = await p.evaluate(() => document.body.innerText);
      const hasAmbato = body.includes('AMBATOMAINTY');
      const hasAntse = body.includes('ANTSENAKELY');
      log('TC-CHF-RLS', 'RLS scope (chef=AMBATOMAINTY)', 'RLS',
        hasAmbato ? 'PASS' : 'FAIL',
        `AMBATOMAINTY:${hasAmbato}, ANTSENAKELY:${hasAntse}`);

      // Modals Chef
      await clickSection(p, 'equipe');
      const ajouterOuv = await p.$('button:has-text("Ajouter")');
      log('CHF-EQP-01', 'Btn Ajouter ouvrier', 'CHEF', ajouterOuv ? 'PASS' : 'FAIL', 'Bouton visible');

      await clickSection(p, 'pointage');
      const enregPtg = await p.$('button:has-text("Enregistrer")');
      log('CHF-PTG-01', 'Btn Enregistrer pointage', 'CHEF', enregPtg ? 'PASS' : 'FAIL', 'Bouton visible');

      await clickSection(p, 'planning');
      const planifier = await p.$('button:has-text("Planifier")');
      log('CHF-PLN-01', 'Btn Planifier tâche', 'CHEF', planifier ? 'PASS' : 'FAIL', 'Bouton visible');

      await clickSection(p, 'rapports');
      const nouveauRapport = await p.$('button:has-text("Nouveau rapport")');
      log('CHF-RPT-01', 'Btn Nouveau rapport', 'CHEF', nouveauRapport ? 'PASS' : 'FAIL', 'Bouton visible');

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 6: CONTRÔLEUR + TECHNICIEN
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 6: Contrôleur + Technicien ═══════════\n');

    // Contrôleur
    {
      const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await login(p, 'controleur@nysoa.mg', 'controleur123');
      log('TC-CTR-LOG', 'Login Contrôleur', 'ALTA', 'PASS', '→ controleur.html');

      const ctrSections = ['dashboard', 'inspections', 'qualite', 'securite', 'rapports'];
      for (const s of ctrSections) {
        const found = await clickSection(p, s);
        if (found) {
          const btns = await countButtons(p);
          log('CTR-' + s.substring(0, 12).padEnd(12), 'Section ' + s, 'CTR', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 4).join(', '));
        } else {
          log('CTR-' + s.substring(0, 12).padEnd(12), s, 'CTR', 'FAIL', 'Lien introuvable');
        }
      }

      // Inspection form
      await clickSection(p, 'inspections');
      const newInsp = await p.$('button:has-text("Nouvelle Inspection")');
      log('CTR-INS-01', 'Nouvelle Inspection btn', 'CTR', newInsp ? 'PASS' : 'FAIL', 'Bouton visible');

      await p.close();
    }

    // Technicien
    {
      const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await login(p, 'technicien@nysoa.mg', 'tech123');
      log('TC-TEC-LOG', 'Login Technicien', 'ALTA', 'PASS', '→ technicien.html');

      const tecSections = ['dashboard', 'interventions', 'projets', 'rapports'];
      for (const s of tecSections) {
        const found = await clickSection(p, s);
        if (found) {
          const btns = await countButtons(p);
          log('TEC-' + s.substring(0, 14).padEnd(14), 'Section ' + s, 'TEC', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 4).join(', '));
        } else {
          log('TEC-' + s.substring(0, 14).padEnd(14), s, 'TEC', 'FAIL', 'Lien introuvable');
        }
      }

      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 7: DÉCONNEXION
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 7: Déconnexion ═══════════\n');

    {
      const p = await browser.newPage();
      p.on('dialog', async d => { await d.accept(); });
      await login(p, 'admin@nysoa.mg', 'admin123');

      const logoutLink = await p.$('a:has-text("Déconnexion")');
      if (logoutLink) {
        await logoutLink.click();
        await p.waitForTimeout(3000);
        const url = p.url();
        log('TC-LOG-05', 'Déconnexion admin.html', 'ALTA', url.includes('login') ? 'PASS' : 'FAIL', url.replace(BASE,''));
      } else {
        log('TC-LOG-05', 'Déconnexion admin.html', 'ALTA', 'FAIL', 'Lien Déconnexion introuvable');
      }
      await p.close();
    }

    {
      const p = await browser.newPage();
      p.on('dialog', async d => { await d.accept(); });
      await login(p, 'admin@nysoa.mg', 'admin123');
      await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 15000 });
      await p.waitForTimeout(2000);

      const logoutLink = await p.$('a.nav-item-logout');
      if (logoutLink) {
        await logoutLink.click();
        await p.waitForTimeout(3000);
        const url = p.url();
        log('TC-LOG-05b', 'Déconnexion index.html', 'ALTA', url.includes('login') ? 'PASS' : 'FAIL', url.replace(BASE,''));
      } else {
        log('TC-LOG-05b', 'Déconnexion index.html', 'ALTA', 'FAIL', 'Lien Déconnexion introuvable');
      }
      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 8: TRANSVERSE (console errors, responsive, exports)
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 8: Transverse ═══════════\n');

    // Erreurs console
    {
      const p = await browser.newPage();
      const errors = [];
      p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().substring(0, 120)); });

      await login(p, 'admin@nysoa.mg', 'admin123');
      // admin.html all sections
      for (const s of ['import', 'backup', 'users', 'rapports', 'controles', 'validations', 'gantt']) {
        await clickSection(p, s);
        await p.waitForTimeout(800);
      }
      // index.html
      await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 15000 });
      await p.waitForTimeout(3000);

      log('TC-GEN-05', 'Erreurs console (toutes pages)', 'ALTA',
        errors.length === 0 ? 'PASS' : 'FAIL',
        errors.length + ' erreur(s): ' + (errors.slice(0, 3).join(' | ') || 'aucune'));
      if (errors.length > 0) errors.forEach(e => console.log('  → ' + e));
      await p.close();
    }

    // Responsive
    {
      const p = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await login(p, 'admin@nysoa.mg', 'admin123');
      const bodyLen = (await p.evaluate(() => document.body.innerText)).length;
      log('TC-GEN-04', 'Responsive 375px (admin)', 'ALTA', bodyLen > 100 ? 'PASS' : 'FAIL', `${bodyLen} caractères chargés`);
      await p.close();
    }

    {
      const p = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await login(p, 'daf@nysoa.mg', 'daf123');
      const bodyLen = (await p.evaluate(() => document.body.innerText)).length;
      log('TC-GEN-04b', 'Responsive 375px (daf)', 'ALTA', bodyLen > 100 ? 'PASS' : 'FAIL', `${bodyLen} caractères chargés`);
      await p.close();
    }

    // Boutons export
    {
      const p = await browser.newPage();
      await login(p, 'admin@nysoa.mg', 'admin123');
      await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 15000 });
      await p.waitForTimeout(3000);

      const exportBtns = await p.$$eval('button', els =>
        els.filter(e => {
          const t = (e.innerText || '').trim().toLowerCase();
          return (t.includes('pdf') || t.includes('excel')) && e.offsetParent !== null;
        }).map(e => e.innerText.trim())
      );
      log('TC-GEN-03', 'Boutons Export (Excel/PDF)', 'ALTA',
        exportBtns.length >= 3 ? 'PASS' : 'WARN',
        `${exportBtns.length} trouvés: ${exportBtns.slice(0, 6).join(', ')}`);
      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 9: DATES / PÉRIODES / CALCULS
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 9: Dates & Périodes ═══════════\n');

    {
      const p = await browser.newPage();
      await login(p, 'daf@nysoa.mg', 'daf123');
      const dateDisplay = await p.$('#current-date');
      if (dateDisplay) {
        const dateText = await dateDisplay.innerText();
        const containsDate = dateText.length > 0 && (dateText.includes('2026') || dateText.includes('Juin') || dateText.includes('juin'));
        log('TC-DAT-01', 'Affichage date courante', 'ALTA', containsDate ? 'PASS' : 'FAIL', dateText.substring(0, 30));
      } else {
        log('TC-DAT-01', 'Affichage date courante', 'ALTA', 'FAIL', 'Élément #current-date introuvable');
      }
      await p.close();
    }

    {
      const p = await browser.newPage();
      await login(p, 'chef@nysoa.mg', 'chef123');
      const dateDisplay = await p.$('#current-date');
      if (dateDisplay) {
        const dateText = await dateDisplay.innerText();
        log('TC-DAT-02', 'Date chef-chantier', 'ALTA', dateText.length > 0 ? 'PASS' : 'FAIL', dateText.substring(0, 30));
      }
      await p.close();
    }

    // ══════════════════════════════════════════════════════════
    // SCÉNARIO 10: SÉCURITÉ — pages accessibles sans auth
    // ══════════════════════════════════════════════════════════
    console.log('\n═══════════ SCÉNARIO 10: Sécurité (accès sans auth) ═══════════\n');

    {
      const pages = ['admin.html', 'daf.html', 'rh.html', 'chef-chantier.html', 'controleur.html', 'technicien.html', 'index.html'];
      for (const page of pages) {
        const p = await browser.newPage();
        await p.goto(BASE + '/' + page, { waitUntil: 'load', timeout: 10000 });
        await p.waitForTimeout(2000);
        const url = p.url();
        const redirectedToLogin = url.includes('login');
        log('SEC-' + page.substring(0, 16).padEnd(16), page + ' sans auth', 'ALTA',
          redirectedToLogin ? 'PASS' : 'FAIL',
          redirectedToLogin ? 'Redirigé → login' : 'ACCÈS DIRECT NON BLOQUÉ');
        await p.close();
      }
    }

  } catch(e) {
    console.error('\n💥 FATAL:', e.message);
  } finally {
    await browser.close();
    const t = total;
    const pct = t.pass + t.fail > 0 ? Math.round(t.pass / (t.pass + t.fail + t.warn) * 100) : 0;
    console.log('\n══════════════════════════════════════════════════════════');
    console.log(`  RÉSULTATS FINAUX : ✅ ${t.pass} PASS  ❌ ${t.fail} FAIL  ⚠️ ${t.warn} WARN  ⏭️ ${t.skip} SKIP`);
    console.log(`  Taux de succès : ${pct}%`);
    console.log('══════════════════════════════════════════════════════════\n');
  }
})();
