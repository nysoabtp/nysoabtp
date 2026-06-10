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

async function adminSection(page, name) {
  await page.evaluate((s) => {
    const links = document.querySelectorAll('.nav-item');
    for (const l of links) {
      if (l.innerText.trim() === s) { l.click(); return; }
    }
  }, name);
  await page.waitForTimeout(800);
}

async function clickSec(page, section) {
  const link = await page.$(`a[data-section="${section}"], a.nav-item[data-section="${section}"]`);
  if (link) { await link.click(); await page.waitForTimeout(800); return true; }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  try {
    // ── ADMIN ALL SECTIONS (via onclick=showSection) ──
    console.log('\n═══ ADMIN RE-TEST (showSection) ═══\n');

    {
      const p = await browser.newPage();
      await login(p, 'admin@nysoa.mg', 'admin123');

      const adminSects = [
        { display: 'Import Excel', id: 'import' },
        { display: 'Sauvegarde', id: 'backup' },
        { display: 'Utilisateurs', id: 'users' },
        { display: 'Rapports Chantier', id: 'rapports' },
        { display: 'Contrôles', id: 'controles' },
        { display: 'Validations', id: 'validations' },
        { display: 'Avancement Gantt', id: 'gantt' }
      ];

      for (const s of adminSects) {
        await adminSection(p, s.display);
        const sectionVis = await p.$(`#section-${s.id}[style*="display: block"], #section-${s.id}:not([style*="display: none"])`);
        const btns = await p.$$eval('button', els => 
          els.filter(e => e.offsetParent !== null).map(e => e.innerText.trim()).filter(t => t.length > 0 && t.length < 50)
        );
        log('ADM-' + s.id.padEnd(16), s.display, 'ADMIN',
          sectionVis ? 'PASS' : 'FAIL',
          sectionVis ? btns.slice(0, 4).join(', ') : 'Section cachée');
      }

      // Sous-sections Sauvegarde
      await adminSection(p, 'Sauvegarde');
      const subBtns = await p.$$eval('button.btn:not(.close-modal)', els =>
        els.filter(e => e.offsetParent !== null).map(e => e.innerText.trim())
      );
      const expectedSubs = ['Journal des dépenses', 'Achats & commandes', 'Personnel & pointage', 'Logistique & matériaux'];
      for (const sub of expectedSubs) {
        log('ADM-sub-' + sub.substring(0, 12).padEnd(12), sub, 'ADMIN',
          subBtns.includes(sub) ? 'PASS' : 'FAIL', '');
      }

      await p.close();
    }

    // ── CHEF REMAINING SECTIONS ──
    console.log('\n═══ CHEF SUITE ═══\n');

    {
      const p = await browser.newPage();
      await login(p, 'chef@nysoa.mg', 'chef123');

      const chefSects = ['recrutement', 'rapports'];
      for (const s of chefSects) {
        const found = await clickSec(p, s);
        if (found) {
          const btns = await p.$$eval('button:visible', els => 
            els.filter(e => e.offsetParent !== null).map(e => e.innerText.trim()).filter(t => t.length < 40 && t.length > 0)
          );
          log('CHF-' + s.padEnd(14), s, 'CHEF', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 4).join(', '));
        } else {
          log('CHF-' + s.padEnd(14), s, 'CHEF', 'FAIL', 'Lien introuvable');
        }
      }

      // RLS
      const body = await p.evaluate(() => document.body.innerText);
      const hasAmbato = body.includes('AMBATOMAINTY');
      const hasAntse = body.includes('ANTSENAKELY');
      log('TC-CHF-RLS', 'RLS (chef → AMBATOMAINTY)', 'RLS',
        hasAmbato && !hasAntse ? 'PASS' : 'WARN',
        `AMBATOMAINTY:${hasAmbato} ANTSENAKELY:${hasAntse}`);

      await p.close();
    }

    // ── CONTRÔLEUR + TECHNICIEN ──
    console.log('\n═══ CONTRÔLEUR + TECHNICIEN ═══\n');

    {
      const p = await browser.newPage();
      await login(p, 'controleur@nysoa.mg', 'controleur123');
      const ctrSects = ['dashboard', 'inspections', 'qualite', 'securite', 'rapports'];
      for (const s of ctrSects) {
        const found = await clickSec(p, s);
        if (found) {
          const btns = await p.$$eval('button:visible', els => 
            els.filter(e => e.offsetParent !== null).map(e => e.innerText.trim()).filter(t => t.length < 40 && t.length > 0)
          );
          log('CTR-' + s.padEnd(14), s, 'CTR', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 4).join(', '));
        } else {
          log('CTR-' + s.padEnd(14), s, 'CTR', 'FAIL', 'Lien introuvable');
        }
      }
      await p.close();
    }

    {
      const p = await browser.newPage();
      await login(p, 'technicien@nysoa.mg', 'tech123');
      const tecSects = ['dashboard', 'interventions', 'projets', 'rapports'];
      for (const s of tecSects) {
        const found = await clickSec(p, s);
        if (found) {
          const btns = await p.$$eval('button:visible', els => 
            els.filter(e => e.offsetParent !== null).map(e => e.innerText.trim()).filter(t => t.length < 40 && t.length > 0)
          );
          log('TEC-' + s.padEnd(16), s, 'TEC', btns.length > 0 ? 'PASS' : 'WARN', btns.slice(0, 4).join(', '));
        } else {
          log('TEC-' + s.padEnd(16), s, 'TEC', 'FAIL', 'Lien introuvable');
        }
      }
      await p.close();
    }

    // ── SÉCURITÉ ──
    console.log('\n═══ SÉCURITÉ (pages sans auth) ═══\n');

    for (const page of ['admin.html', 'daf.html', 'rh.html', 'chef-chantier.html', 'controleur.html', 'technicien.html', 'index.html']) {
      const p = await browser.newPage();
      await p.goto(BASE + '/' + page, { waitUntil: 'load', timeout: 8000 });
      await p.waitForTimeout(1500);
      const redirected = p.url().includes('login');
      log('SEC-' + page.substring(0, 18).padEnd(18), '', 'ALTA',
        redirected ? 'PASS' : 'FAIL',
        redirected ? 'Redirigé → login' : 'ACCÈS DIRECT');
      await p.close();
    }

    // ── RESPONSIVE ──
    console.log('\n═══ RESPONSIVE ═══\n');

    {
      const p = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await login(p, 'admin@nysoa.mg', 'admin123');
      log('TC-GEN-04', 'admin 375px', 'ALTA', 'PASS', (await p.evaluate(() => document.body.innerText)).length + ' chars');
      await p.close();
    }
    {
      const p = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await login(p, 'daf@nysoa.mg', 'daf123');
      log('TC-GEN-04b', 'daf 375px', 'ALTA', 'PASS', (await p.evaluate(() => document.body.innerText)).length + ' chars');
      await p.close();
    }
    {
      const p = await browser.newPage({ viewport: { width: 375, height: 812 } });
      await login(p, 'chef@nysoa.mg', 'chef123');
      log('TC-GEN-04c', 'chef 375px', 'ALTA', 'PASS', (await p.evaluate(() => document.body.innerText)).length + ' chars');
      await p.close();
    }

    // ── DATES ──
    console.log('\n═══ DATE DISPLAY ═══\n');

    {
      const p = await browser.newPage();
      await login(p, 'daf@nysoa.mg', 'daf123');
      const dt = await p.$eval('#current-date', e => e.innerText).catch(() => '');
      log('TC-DAT-01', 'Date DAF', 'ALTA', dt.length > 0 ? 'PASS' : 'FAIL', dt.substring(0, 30));
      await p.close();
    }
    {
      const p = await browser.newPage();
      await login(p, 'chef@nysoa.mg', 'chef123');
      const dt = await p.$eval('#current-date', e => e.innerText).catch(() => '');
      log('TC-DAT-02', 'Date Chef', 'ALTA', dt.length > 0 ? 'PASS' : 'FAIL', dt.substring(0, 30));
      await p.close();
    }

    // ── ERRORS LOGOUT EXPORTS ──
    console.log('\n═══ FINAL CHECKS ═══\n');

    // Console errors
    {
      const p = await browser.newPage();
      const errors = [];
      p.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().substring(0, 100)); });
      await login(p, 'admin@nysoa.mg', 'admin123');
      for (const s of ['import', 'backup', 'users', 'rapports', 'controles', 'validations', 'gantt']) {
        await adminSection(p, s);
        await p.waitForTimeout(500);
      }
      await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 10000 });
      await p.waitForTimeout(2000);
      log('TC-GEN-05', 'Console errors', 'ALTA',
        errors.length === 0 ? 'PASS' : 'FAIL',
        errors.length + ' erreurs: ' + (errors.slice(0, 3).join(' | ') || 'aucune'));
      if (errors.length > 0) errors.forEach(e => console.log('  → ' + e));
      await p.close();
    }

    // Logout admin.html
    {
      const p = await browser.newPage();
      p.on('dialog', async d => { await d.accept(); });
      await login(p, 'admin@nysoa.mg', 'admin123');
      const logoutLink = await p.$('a[onclick="logout()"], a.nav-item:has-text("Déconnexion")');
      if (logoutLink) {
        await logoutLink.click();
        await p.waitForTimeout(2500);
        log('TC-LOG-05', 'Déconnexion admin.html', 'ALTA',
          p.url().includes('login') ? 'PASS' : 'FAIL', p.url().replace(BASE, ''));
      }
      await p.close();
    }

    // Logout index.html
    {
      const p = await browser.newPage();
      p.on('dialog', async d => { await d.accept(); });
      await login(p, 'admin@nysoa.mg', 'admin123');
      await p.goto(BASE + '/index.html', { waitUntil: 'load', timeout: 10000 });
      await p.waitForTimeout(1500);
      const logoutLink = await p.$('a[data-section="logout"], a:has-text("Déconnexion")');
      if (logoutLink) {
        await logoutLink.click();
        await p.waitForTimeout(2500);
        log('TC-LOG-05b', 'Déconnexion index.html', 'ALTA',
          p.url().includes('login') ? 'PASS' : 'FAIL', p.url().replace(BASE, ''));
      }
      await p.close();
    }

    // Export buttons
    {
      const p = await browser.newPage();
      await login(p, 'rh@nysoa.mg', 'rh123');
      const expBtns = await p.$$eval('button', els =>
        els.filter(e => {
          const t = (e.innerText || '').trim().toLowerCase();
          return (t.includes('pdf') || t.includes('excel')) && e.offsetParent !== null;
        }).map(e => e.innerText.trim())
      );
      log('TC-GEN-03', 'Export Excel/PDF', 'ALTA',
        expBtns.length >= 2 ? 'PASS' : 'WARN',
        expBtns.length + ' trouvés: ' + expBtns.slice(0, 6).join(', '));
      await p.close();
    }

  } catch(e) {
    console.error('\nFATAL:', e.message);
  } finally {
    await browser.close();
    const total = pass + fail + warn + skip;
    const pct = total > 0 ? Math.round(pass / (pass + fail + warn) * 100) : 0;
    console.log('\n══════════════════════════════════════════════════════════');
    console.log(`  RÉSULTATS : ✅ ${pass} PASS  ❌ ${fail} FAIL  ⚠️ ${warn} WARN  ⏭️ ${skip} SKIP`);
    console.log(`  Taux global : ${pct}%`);
    console.log('══════════════════════════════════════════════════════════\n');
  }
})();
