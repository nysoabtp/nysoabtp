const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8080';
const PROTECTED_PAGES = [
    'rh.html', 'admin.html', 'daf.html', 'suivi-chantier.html',
    'pointage.html', 'technicien.html', 'controleur.html',
];

const results = [];

async function testPage(pageName) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    try {
        const page = await context.newPage();
        await page.goto(`${BASE_URL}/${pageName}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForTimeout(1000);
        const finalUrl = page.url();
        const redirectedToLogin = finalUrl.includes('login.html');
        const notOnProtectedPage = !finalUrl.includes(pageName);
        const passed = redirectedToLogin || notOnProtectedPage;
        results.push({ page: pageName, finalUrl, redirectedToLogin, notOnProtectedPage, passed });
        console.log(`${passed ? '✅' : '❌'} ${pageName} → ${finalUrl}`);
    } catch (e) {
        results.push({ page: pageName, finalUrl: 'ERROR', redirectedToLogin: false, notOnProtectedPage: false, passed: false });
        console.log(`❌ ${pageName} - ERREUR: ${e.message}`);
    } finally {
        await browser.close();
    }
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   SEC-001: Test de Redirection de Sécurité');
    console.log('═══════════════════════════════════════════════════════════════\n');
    for (const page of PROTECTED_PAGES) {
        await testPage(page);
        await new Promise(r => setTimeout(r, 500));
    }
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`   RÉSULTAT: ${passed}/${total} pages protégées`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    const report = `# SEC-001: Test de Redirection de Sécurité

**Date**: ${new Date().toISOString()}
**Résultat**: ${passed}/${total} PASS

## Pages Testées

| Page | URL Finale | → login | ∄ protected | Statut |
|------|------------|---------|-------------|--------|
${results.map(r => `| ${r.page} | ${r.finalUrl} | ${r.redirectedToLogin ? '✅' : '❌'} | ${r.notOnProtectedPage ? '✅' : '❌'} | ${r.passed ? '✅ PASS' : '❌ FAIL'} |`).join('\n')}

## Conclusion

${passed === total ? '✅ Toutes les pages protégées redirigent correctement' : '❌ Certaines pages ne redirigent pas correctement'}
`;
    require('fs').writeFileSync('SEC_001_REDIRECT_REPORT.md', report);
    console.log('\n📄 Rapport: SEC_001_REDIRECT_REPORT.md');
    process.exit(passed === total ? 0 : 1);
}

main().catch(e => { console.error('Erreur fatale:', e); process.exit(1); });
