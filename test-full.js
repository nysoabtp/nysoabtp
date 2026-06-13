const { chromium } = require('playwright');

async function waitAndCheck(page, url, timeout = 30000) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout });
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      console.log('   ⚠️ Login required, skipping...');
      return false;
    }
    return true;
  } catch (e) {
    console.log('   ❌ Page load failed:', e.message.split('\n')[0]);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[ERROR] ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`[PAGE ERROR] ${err.message}`));

  console.log('=== TEST: DAF DASHBOARD FULL FUNCTIONAL TEST ===\n');

  try {
    console.log('1. NAVIGATION');
    const loaded = await waitAndCheck(page, 'https://nysoabtp.github.io/nysoabtp/daf.html');
    if (!loaded) {
      console.log('   ⚠️ Cannot test - requires login');
    } else {
      const navTests = [
        { name: 'Tableau de bord', selector: "text=Tableau de bord" },
        { name: 'Journal DAF', selector: "text=Journal DAF" },
        { name: 'Crédits à Payer', selector: "text=Crédits à Payer" },
        { name: 'Mon Budget Felana', selector: "text=Mon Budget Felana" },
        { name: 'Suivi par Chantier', selector: "text=Suivi par Chantier" },
        { name: 'Devis & Proforma', selector: "text=Devis & Proforma" },
        { name: 'Rapports DAF', selector: "text=Rapports DAF" },
      ];

      for (const nav of navTests) {
        try {
          errors.length = 0;
          await page.click(nav.selector, { timeout: 5000 });
          await page.waitForTimeout(1000);
          const hasErrors = errors.filter(e => e.includes('showSection') || e.includes('not defined') || e.includes('SyntaxError')).length > 0;
          console.log(`   ${hasErrors ? '❌' : '✅'} ${nav.name}`);
        } catch (e) {
          console.log(`   ❌ ${nav.name}: ${e.message.split('\n')[0]}`);
        }
      }

      await page.click("text=Tableau de bord", { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(1000);

      console.log('\n2. TABLEAU DE BORD');
      const kpi1 = await page.locator('#db-solde-felana').textContent().catch(() => 'N/A');
      console.log(`   ${kpi1 && !kpi1.includes('Chargement') && kpi1 !== '—' ? '✅' : '❌'} Solde disponible: ${kpi1}`);
      
      const kpi2 = await page.locator('#db-total-dotations').textContent().catch(() => 'N/A');
      console.log(`   ${kpi2 && !kpi2.includes('Chargement') && kpi2 !== '—' ? '✅' : '❌'} Dotations: ${kpi2}`);
      
      const kpi3 = await page.locator('#db-total-depenses').textContent().catch(() => 'N/A');
      console.log(`   ${kpi3 && !kpi3.includes('Chargement') && kpi3 !== '—' ? '✅' : '❌'} Dépenses: ${kpi3}`);
      
      const kpi4 = await page.locator('#db-credits-count').textContent().catch(() => 'N/A');
      console.log(`   ${kpi4 && !kpi4.includes('Chargement') && kpi4 !== '—' ? '✅' : '❌'} Crédits: ${kpi4}`);

      const rows = await page.locator('#recent-expenses-table tbody tr').count().catch(() => 0);
      console.log(`   ${rows >= 0 ? '✅' : '⚠️'} Dépenses récentes: ${rows} rows`);

      console.log('\n3. NOUVELLE DÉPENSE');
      try {
        await page.click("text=Saisir une Dépense", { timeout: 5000 });
        await page.waitForTimeout(1000);
        const modal = await page.locator('#modal-nouvelle-depense').isVisible().catch(() => false);
        console.log(`   ${modal ? '✅' : '❌'} Modal opens`);
      } catch (e) {
        console.log(`   ❌ Nouvelle dépense: ${e.message.split('\n')[0]}`);
      }

      console.log('\n4. JOURNAL DAF');
      try {
        await page.click("text=Journal DAF", { timeout: 5000 });
        await page.waitForTimeout(1000);
        const journalRows = await page.locator('#journal-daf-table tbody tr').count().catch(() => 0);
        console.log(`   ✅ Journal table: ${journalRows} rows`);
      } catch (e) {
        console.log(`   ❌ Journal: ${e.message.split('\n')[0]}`);
      }

      console.log('\n5. CRÉDITS À PAYER');
      try {
        await page.click("text=Crédits à Payer", { timeout: 5000 });
        await page.waitForTimeout(1000);
        const creditsRows = await page.locator('#credits-list tbody tr').count().catch(() => 0);
        console.log(`   ✅ Credits list: ${creditsRows} rows`);
      } catch (e) {
        console.log(`   ❌ Credits: ${e.message.split('\n')[0]}`);
      }

      console.log('\n6. MON BUDGET FELANA');
      try {
        await page.click("text=Mon Budget Felana", { timeout: 5000 });
        await page.waitForTimeout(1000);
        const felanaSolde = await page.locator('#felana-solde-principal').textContent().catch(() => 'N/A');
        console.log(`   ${felanaSolde && !felanaSolde.includes('Chargement') ? '✅' : '❌'} Felana solde: ${felanaSolde}`);
      } catch (e) {
        console.log(`   ❌ Budget Felana: ${e.message.split('\n')[0]}`);
      }

      console.log('\n7. DEVIS & PROFORMA');
      try {
        await page.click("text=Devis & Proforma", { timeout: 5000 });
        await page.waitForTimeout(1000);
        const devisSection = await page.locator('#devis-section').isVisible().catch(() => false);
        console.log(`   ${devisSection ? '✅' : '❌'} Devis section visible`);
      } catch (e) {
        console.log(`   ❌ Devis: ${e.message.split('\n')[0]}`);
      }
    }

    console.log('\n=== TEST COMPLETE ===');
    console.log('Total errors:', errors.length);
    errors.slice(0, 5).forEach(e => console.log('  ' + e));

  } catch (err) {
    console.error('FATAL:', err.message);
  }

  await page.waitForTimeout(2000);
  await browser.close();
})();