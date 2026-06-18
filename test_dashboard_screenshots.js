/**
 * Dashboard Audit - Screenshots et Vérifications
 * ADMIN, DAF, RH
 */

const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8080';
const ACCOUNTS = [
    { role: 'admin', email: 'admin@nysoa.mg', password: 'admin123' },
    { role: 'daf', email: 'daf@nysoa.mg', password: 'daf123' },
    { role: 'rh', email: 'rh@nysoa.mg', password: 'rh123' },
];

async function login(page, account) {
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', account.email);
    await page.fill('#password', account.password);
    await page.click('#btn-login');
    await page.waitForTimeout(4000);
    return !page.url().includes('login.html');
}

async function captureDashboard(page, role) {
    await page.screenshot({ path: `SCREENSHOT_${role.toUpperCase()}_dashboard.png`, fullPage: true });
    
    const state = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        
        // Détecter "Chargement..."
        const hasChargement = bodyText.includes('Chargement...') || 
                              bodyText.includes('Chargement') ||
                              bodyText.includes('Loading...');
        
        // Détecter tableaux
        const tables = Array.from(document.querySelectorAll('table')).map(t => ({
            id: t.id || t.className,
            rowCount: t.querySelectorAll('tbody tr').length,
            hasData: t.querySelectorAll('tbody tr').length > 0
        }));
        
        // KPIs (valeurs numériques ou "—")
        const kpiPattern = /(\d+[\d\s.,]*\s*(Ar|MGA|€|$)|—)/g;
        const kpiValues = bodyText.match(kpiPattern) || [];
        
        // Chercher les sections spécifiques
        const sections = {
            utilisateurs: bodyText.includes('Utilisateur') || bodyText.includes('utilisateur'),
            rapports: bodyText.includes('Rapport'),
            controles: bodyText.includes('Contrôle') || bodyText.includes('Contrôle'),
            gantt: bodyText.includes('Gantt'),
            personnel: bodyText.includes('Personnel') || bodyText.includes('employé'),
        };
        
        return {
            hasChargement,
            tables,
            kpiValues: kpiValues.slice(0, 10),
            sections,
            bodyLength: bodyText.length
        };
    });
    
    return state;
}

async function auditAdmin(page) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('ADMIN DASHBOARD AUDIT');
    console.log('═══════════════════════════════════════════════════\n');
    
    const state = await captureDashboard(page, 'admin');
    
    console.log('📊 Tableaux trouvés:');
    state.tables.forEach(t => {
        const status = t.hasData ? '✅ Données' : '⚠️ Vide';
        console.log(`   ${t.id}: ${t.rowCount} lignes ${status}`);
    });
    
    console.log('\n📋 Sections détectées:');
    Object.entries(state.sections).forEach(([key, found]) => {
        console.log(`   ${key}: ${found ? '✅ Présente' : '❌ Absente'}`);
    });
    
    console.log('\n⏳ États de chargement:');
    console.log(`   "Chargement..." visible: ${state.hasChargement ? '⚠️ OUI' : '✅ Non'}`);
    
    return state;
}

async function auditDAF(page) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('DAF DASHBOARD AUDIT');
    console.log('═══════════════════════════════════════════════════\n');
    
    const state = await captureDashboard(page, 'daf');
    
    console.log('📊 KPIs Dashboard:');
    state.kpiValues.slice(0, 5).forEach(v => {
        const isPlaceholder = v.includes('—') || v === '—';
        console.log(`   ${v}: ${isPlaceholder ? '⚠️ Placeholder' : '✅ Valeur'}`);
    });
    
    console.log('\n📊 Tableaux:');
    state.tables.forEach(t => {
        const status = t.hasData ? '✅ Données' : '⚠️ Vide';
        console.log(`   ${t.id}: ${t.rowCount} lignes ${status}`);
    });
    
    console.log('\n⏳ États de chargement:');
    console.log(`   "Chargement..." visible: ${state.hasChargement ? '⚠️ OUI' : '✅ Non'}`);
    
    return state;
}

async function auditRH(page) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('RH DASHBOARD AUDIT');
    console.log('═══════════════════════════════════════════════════\n');
    
    const state = await captureDashboard(page, 'rh');
    
    console.log('📊 KPIs Dashboard:');
    state.kpiValues.slice(0, 5).forEach(v => {
        const isPlaceholder = v.includes('—') || v === '—';
        console.log(`   ${v}: ${isPlaceholder ? '⚠️ Placeholder' : '✅ Valeur'}`);
    });
    
    console.log('\n📋 Sections RH:');
    const rhSections = ['Effectif', 'Congés', 'Absent', 'Paie', 'Recrutement'];
    rhSections.forEach(section => {
        const found = state.sections.personnel || state.bodyLength > 50000;
        console.log(`   ${section}: ${found ? '✅ Détectée' : '—'}`);
    });
    
    console.log('\n⏳ États de chargement:');
    console.log(`   "Chargement..." visible: ${state.hasChargement ? '⚠️ OUI' : '✅ Non'}`);
    
    return state;
}

async function main() {
    const results = {};
    
    for (const account of ACCOUNTS) {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
        const page = await context.newPage();
        
        console.log(`\n🔐 Connexion ${account.role}...`);
        const loggedIn = await login(page, account);
        
        if (!loggedIn) {
            console.log(`❌ Échec connexion pour ${account.role}`);
            await browser.close();
            continue;
        }
        
        console.log(`✅ Connecté en tant que ${account.role}`);
        
        if (account.role === 'admin') {
            results.admin = await auditAdmin(page);
        } else if (account.role === 'daf') {
            results.daf = await auditDAF(page);
        } else if (account.role === 'rh') {
            results.rh = await auditRH(page);
        }
        
        await browser.close();
    }
    
    // Générer le rapport
    console.log('\n\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   RAPPORT D\'AUDIT DASHBOARD');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    let report = `# Dashboard Audit - NySoa BTP ERP

**Date**: ${new Date().toISOString()}

## ADMIN (@nysoa.mg)

### Tableau Utilisateurs
${results.admin ? `
- Lignes dans le tableau: ${results.admin.tables.find(t => t.id.includes('user'))?.rowCount || 'N/A'}
- Status: ${results.admin.tables.find(t => t.hasData) ? '✅ Avec données' : '⚠️ Vide ou non trouvé'}
` : '❌ Non testé'}

### Sections
${results.admin ? `
- Rapports: ${results.admin.sections.rapports ? '✅ Présente' : '❌ Absente'}
- Contrôles: ${results.admin.sections.controles ? '✅ Présente' : '❌ Absente'}
- Gantt: ${results.admin.sections.gantt ? '✅ Présente' : '❌ Absente'}
- Utilisateurs: ${results.admin.sections.utilisateurs ? '✅ Présente' : '❌ Absente'}
- État chargement: ${results.admin.hasChargement ? '⚠️ "Chargement..." visible' : '✅ Pas de chargement'}
` : '❌ Non testé'}

## DAF (@nysoa.mg)

### KPIs Dashboard
${results.daf ? `
- Budget/Dépenses/Solde: ${results.daf.kpiValues.length > 0 ? results.daf.kpiValues.slice(0,3).join(', ') : 'N/A'}
- Status: ${results.daf.kpiValues.some(v => !v.includes('—')) ? '✅ Valeurs réelles' : '⚠️ Placeholders ("—")'}
` : '❌ Non testé'}

### Tableaux
${results.daf ? `
- Tableaux avec données: ${results.daf.tables.filter(t => t.hasData).length}/${results.daf.tables.length}
- État chargement: ${results.daf.hasChargement ? '⚠️ "Chargement..." visible' : '✅ Pas de chargement'}
` : '❌ Non testé'}

## RH (@nysoa.mg)

### KPIs Dashboard
${results.rh ? `
- Effectif/Absences/Congés: ${results.rh.kpiValues.length > 0 ? results.rh.kpiValues.slice(0,3).join(', ') : 'N/A'}
- Status: ${results.rh.kpiValues.some(v => !v.includes('—')) ? '✅ Valeurs réelles' : '⚠️ Placeholders ("—")'}
` : '❌ Non testé'}

### État
${results.rh ? `
- État chargement: ${results.rh.hasChargement ? '⚠️ "Chargement..." visible' : '✅ Pas de chargement'}
` : '❌ Non testé'}

---

*Screenshots disponibles: SCREENSHOT_ADMIN_dashboard.png, SCREENSHOT_DAF_dashboard.png, SCREENSHOT_RH_dashboard.png*
`;
    
    require('fs').writeFileSync('DASHBOARD_AUDIT_REPORT.md', report);
    console.log('📄 Rapport généré: DASHBOARD_AUDIT_REPORT.md');
    console.log('📸 Screenshots: SCREENSHOT_*_dashboard.png');
}

main().catch(e => {
    console.error('Erreur fatale:', e);
    process.exit(1);
});
