/**
 * AUTH-001: Test d'authentification Chef de Chantier
 * Vérifie que le chef peut se connecter et voir les données正确es:
 * - Dashboard affiche "antsenakely"
 * - Tableau personnel avec 3 employés (RAZAFIMANDIMBY, RABE, ANDRIAMATSATSOA)
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8080';

async function main() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   AUTH-001: Test Authentification Chef de Chantier');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const results = [];
    
    try {
        // 1. Connexion
        console.log('[1/3] Connexion avec chef@nysoa.mg...');
        await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
        await page.fill('#email', 'chef@nysoa.mg');
        await page.fill('#password', 'chef123');
        await page.click('#btn-login');
        await page.waitForTimeout(3000);
        
        const isLoggedIn = !page.url().includes('login.html');
        results.push({
            test: 'LOGIN',
            passed: isLoggedIn,
            details: `URL: ${page.url()}`
        });
        console.log(`   ${isLoggedIn ? '✅' : '❌'} Connexion: ${isLoggedIn ? 'Succès' : 'Échec'}`);
        
        if (!isLoggedIn) {
            console.log('❌ Échec de connexion - Impossible de continuer');
            await browser.close();
            return;
        }
        
        // 2. Vérifier que "antsenakely" est affiché dans le dashboard
        console.log('\n[2/3] Vérification dashboard "antsenakely"...');
        await page.waitForTimeout(2000);
        
        const dashboardText = await page.evaluate(() => {
            return document.body.innerText;
        });
        
        const hasAntsenakely = dashboardText.toLowerCase().includes('antsenakely');
        results.push({
            test: 'DASHBOARD_CHANTIER',
            passed: hasAntsenakely,
            details: hasAntsenakely ? '"antsenakely" trouvé dans le dashboard' : '"antsenakely" non trouvé'
        });
        console.log(`   ${hasAntsenakely ? '✅' : '❌'} Dashboard: ${hasAntsenakely ? '"antsenakely" visible' : 'Non visible'}`);
        
        // Chercher spécifiquement le nom du chantier
        const chantierElement = await page.evaluate(() => {
            const elements = document.querySelectorAll('*');
            for (const el of elements) {
                if (el.textContent && el.textContent.trim().toLowerCase() === 'antsenakely') {
                    return { tag: el.tagName, class: el.className, text: el.textContent.trim() };
                }
            }
            return null;
        });
        
        if (chantierElement) {
            console.log(`   📍 Élément trouvé: <${chantierElement.tag}> ${chantierElement.class}`);
        }
        
        // 3. Vérifier le tableau personnel avec 3 employés
        console.log('\n[3/3] Vérification tableau personnel (3 employés)...');
        await page.waitForTimeout(2000);
        
        const employees = await page.evaluate(() => {
            // Chercher dans le tableau du personnel
            const tables = document.querySelectorAll('table');
            const employees = [];
            
            for (const table of tables) {
                const rows = table.querySelectorAll('tbody tr, tr');
                for (const row of rows) {
                    const cells = row.querySelectorAll('td, th');
                    const rowText = Array.from(cells).map(c => c.textContent.trim()).join(' ');
                    if (rowText.includes('RAZAFIMANDIMBY') || 
                        rowText.includes('RABE') || 
                        rowText.includes('ANDRIAMATSATSOA')) {
                        employees.push(rowText.substring(0, 100));
                    }
                }
            }
            
            return employees;
        });
        
        const hasRazafimandimby = employees.some(e => e.includes('RAZAFIMANDIMBY'));
        const hasRabe = employees.some(e => e.includes('RABE'));
        const hasAndriamatsatsoa = employees.some(e => e.includes('ANDRIAMATSATSOA'));
        
        results.push({
            test: 'EMPLOYE_RAZAFIMANDIMBY',
            passed: hasRazafimandimby,
            details: hasRazafimandimby ? 'Employé trouvé' : 'Employé non trouvé'
        });
        results.push({
            test: 'EMPLOYE_RABE',
            passed: hasRabe,
            details: hasRabe ? 'Employé trouvé' : 'Employé non trouvé'
        });
        results.push({
            test: 'EMPLOYE_ANDRIAMATSATSOA',
            passed: hasAndriamatsatsoa,
            details: hasAndriamatsatsoa ? 'Employé trouvé' : 'Employé non trouvé'
        });
        
        console.log(`   ${hasRazafimandimby ? '✅' : '❌'} RAZAFIMANDIMBY`);
        console.log(`   ${hasRabe ? '✅' : '❌'} RABE`);
        console.log(`   ${hasAndriamatsatsoa ? '✅' : '❌'} ANDRIAMATSATSOA`);
        
        const totalEmployees = employees.length;
        const allEmployeesFound = hasRazafimandimby && hasRabe && hasAndriamatsatsoa;
        
        results.push({
            test: 'TOTAL_EMPLOYEES',
            passed: totalEmployees >= 3,
            details: `${totalEmployees} employés trouvés`
        });
        
        // Vérifier qu'aucun tableau n'est vide
        const emptyTables = await page.evaluate(() => {
            const tables = document.querySelectorAll('table');
            const empty = [];
            for (const table of tables) {
                const rows = table.querySelectorAll('tbody tr');
                if (rows.length === 0) {
                    empty.push(table.id || table.className || 'table sans ID');
                }
            }
            return empty;
        });
        
        results.push({
            test: 'NO_EMPTY_TABLES',
            passed: emptyTables.length === 0,
            details: emptyTables.length === 0 ? 'Aucun tableau vide' : `Tableaux vides: ${emptyTables.join(', ')}`
        });
        
    } catch (e) {
        console.log(`❌ Erreur: ${e.message}`);
        results.push({
            test: 'EXCEPTION',
            passed: false,
            details: e.message
        });
    }
    
    await browser.close();
    
    // Résumé
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`   RÉSULTAT: ${passed}/${total} tests réussis`);
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    // Générer le rapport
    const report = `# AUTH-001: Test Authentification Chef de Chantier

**Date**: ${new Date().toISOString()}
**Résultat**: ${passed}/${total} PASS

## Tests

| Test | Statut | Détail |
|------|--------|--------|
${results.map(r => `| ${r.test} | ${r.passed ? '✅' : '❌'} | ${r.details} |`).join('\n')}

## Conclusion

${passed === total ? '✅ Tous les tests réussis - Chef de chantier fonctionnel' : `⚠️ ${passed}/${total} réussis`}
`;

    require('fs').writeFileSync('AUTH_001_REPORT.md', report);
    console.log('📄 Rapport: AUTH_001_REPORT.md');
    
    process.exit(passed === total ? 0 : 1);
}

main().catch(e => {
    console.error('Erreur fatale:', e);
    process.exit(1);
});
