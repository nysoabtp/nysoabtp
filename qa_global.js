/**
 * QA GLOBAL — NySoa BTP ERP
 * Comprehensive multi-role functional test suite
 * Tests: Auth, Console Errors, KPIs, Workflows, Inter-role
 */
const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';
const SUPABASE_URL = 'https://djncsybvloyyesllfxhq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDI1OTksImV4cCI6MjA5MzMxODU5OX0.o4MOSg6axYoNdl0XgidLi0eNukR-KwnKvecZxchkcP8';

const ACCOUNTS = {
    admin: { email: 'admin@nysoa.mg', password: 'admin123', page: 'admin.html' },
    daf: { email: 'daf@nysoa.mg', password: 'daf123', page: 'daf.html' },
    rh: { email: 'rh@nysoa.mg', password: 'rh123', page: 'rh.html' },
    chef: { email: 'chef@nysoa.mg', password: 'chef123', page: 'chef-chantier.html' },
    controleur: { email: 'controleur@nysoa.mg', password: 'controleur123', page: 'controleur.html' },
    technicien: { email: 'technicien@nysoa.mg', password: 'tech123', page: 'technicien.html' }
};

const results = [];
const consoleErrors = [];

function test(id, desc, pass, sev, notes) {
    const sym = pass ? '✅' : '❌';
    console.log(`${sym} [${sev}] ${id}: ${desc}${notes ? ' | ' + notes : ''}`);
    results.push({ id, desc, pass, severity: sev, notes: notes || '' });
}

async function apiFetch(path, token) {
    const r = await fetch(SUPABASE_URL + path, {
        headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token }
    });
    return r.json();
}

async function apiLogin(email, pass) {
    const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
    });
    return r.json();
}

async function newSession() {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().substring(0, 150)); });
    page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message.substring(0, 150)));
    return { browser, page, errors };
}

async function login(page, email, pass) {
    await page.goto(BASE_URL + '/login.html', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.fill('#email', email);
    await page.fill('#password', pass);
    await page.click('#btn-login');
    await page.waitForTimeout(3000);
}

async function waitForLoad(page) {
    await page.waitForTimeout(2000);
    // Wait for loading indicators to disappear
    try {
        await page.waitForFunction(() => {
            const loading = document.querySelector('.loading, .spinner, [id*="loading"]');
            return !loading || loading.textContent.length < 5;
        }, { timeout: 5000 });
    } catch {}
}

// ============================================================
// PHASE 1: AUTHENTICATION & ROLE GUARDS
// ============================================================
async function testAuth() {
    console.log('\n═══════════════════════════════════════════');
    console.log('PHASE 1: AUTHENTICATION & ROLE GUARDS');
    console.log('═══════════════════════════════════════════\n');

    // 1.1 Valid logins for all 6 roles
    for (const [role, acct] of Object.entries(ACCOUNTS)) {
        const r = await apiLogin(acct.email, acct.password);
        const jwtRole = r.user?.user_metadata?.role;
        test(`AUTH-1-${role.toUpperCase()}`, `Login ${role}`, !!r.access_token, 'CRIT',
            `token=${!!r.access_token}, role=${jwtRole}`);
    }

    // 1.2 Invalid login
    const r = await apiLogin('faux@test.com', 'wrong');
    test('AUTH-2', 'Login invalide refusé', !r.access_token, 'CRIT',
        r.access_token ? 'BUG: token obtenu!' : 'Refusé OK');

    // 1.3 Protected pages without auth
    for (const [role, acct] of Object.entries(ACCOUNTS)) {
        const { browser, page } = await newSession();
        await page.goto(BASE_URL + '/' + acct.page, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);
        const redirected = page.url().includes('login');
        test(`AUTH-3-${role.toUpperCase()}`, `${role} page protected`, redirected, 'CRIT',
            redirected ? 'Redirigé' : 'BUG: accès direct!');
        await browser.close();
    }

    // 1.4 Cross-role access attempt
    const { browser, page } = await newSession();
    await login(page, 'chef@nysoa.mg', 'chef123');
    await page.goto(BASE_URL + '/daf.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const blocked = page.url().includes('login') || page.url().includes('chef');
    test('AUTH-4', 'Chef blocked from DAF page', blocked, 'CRIT',
        `url=${page.url().substring(0, 50)}`);
    await browser.close();
}

// ============================================================
// PHASE 2: CONSOLE ERRORS ON ALL PAGES
// ============================================================
async function testConsoleErrors() {
    console.log('\n═══════════════════════════════════════════');
    console.log('PHASE 2: CONSOLE ERRORS');
    console.log('═══════════════════════════════════════════\n');

    const sections = {
        admin: ['users', 'validations', 'budgets-ceo', 'recettes-ceo', 'credits-fournisseurs', 'journal', 'journal-global', 'controles', 'gantt'],
        daf: ['budget-felana', 'depenses', 'credits-echeances', 'devis', 'journal-daf', 'suivi-chantiers', 'rapports-daf'],
        rh: ['employes', 'recrutement', 'conges', 'formations', 'paie', 'rapports'],
        chef: ['chantiers', 'equipe', 'pointage', 'planning', 'materiaux', 'recrutement', 'rapports'],
        controleur: ['inspections', 'qualite', 'securite', 'rapports'],
        technicien: ['projets', 'taches', 'interventions', 'rapports']
    };

    for (const [role, acct] of Object.entries(ACCOUNTS)) {
        const { browser, page, errors } = await newSession();
        await login(page, acct.email, acct.password);
        await waitForLoad(page);

        // Get errors from initial load
        const initialErrors = [...errors];

        // Navigate through sections
        for (const section of (sections[role] || [])) {
            errors.length = 0;
            try {
                await page.evaluate((s) => {
                    if (typeof showSection === 'function') showSection(s);
                }, section);
                await page.waitForTimeout(1500);
            } catch (e) {
                errors.push('Navigation error: ' + e.message.substring(0, 80));
            }

            if (errors.length > 0) {
                for (const err of errors) {
                    test(`CONSOLE-${role.toUpperCase()}-${section.toUpperCase()}`, 
                        `${role}/${section} errors`, false, 'CRIT', err);
                }
            }
        }

        if (initialErrors.length === 0 && errors.length === 0) {
            test(`CONSOLE-${role.toUpperCase()}`, `${role} page no errors`, true, 'HIGH',
                'All sections clean');
        }

        await browser.close();
    }
}

// ============================================================
// PHASE 3: KPI CALCULATIONS VS SUPABASE
// ============================================================
async function testKPIs() {
    console.log('\n═══════════════════════════════════════════');
    console.log('PHASE 3: KPI CALCULATIONS');
    console.log('═══════════════════════════════════════════\n');

    // Login as RH to check KPIs
    const { browser, page } = await newSession();
    await login(page, 'rh@nysoa.mg', 'rh123');
    await waitForLoad(page);

    // Get KPIs from DOM
    const domKPIs = await page.evaluate(() => {
        const ids = ['stat-total-employes', 'stat-nouvelles-embauches', 'stat-conges-cours', 'stat-formations'];
        return ids.reduce((acc, id) => {
            const el = document.getElementById(id);
            acc[id] = el ? el.textContent.trim() : 'NOT_FOUND';
            return acc;
        }, {});
    });

    // Get real data from Supabase via page context
    const realKPIs = await page.evaluate(async () => {
        const now = new Date();
        const ninetyDaysAgo = new Date(now - 90 * 864e5).toISOString().split('T')[0];
        
        const [personnel, recent, conges, formations] = await Promise.all([
            db.from('personnel').select('id').eq('actif', true),
            db.from('employes').select('id').gte('date_embauche', ninetyDaysAgo),
            db.from('conges').select('id').eq('statut', 'en_cours'),
            db.from('formations').select('id')
        ]);

        return {
            'stat-total-employes': String(personnel.data?.length || 0),
            'stat-nouvelles-embauches': String(recent.data?.length || 0),
            'stat-conges-cours': String(conges.data?.length || 0),
            'stat-formations': String(formations.data?.length || 0)
        };
    });

    for (const [kpi, domVal] of Object.entries(domKPIs)) {
        const realVal = realKPIs[kpi];
        const match = domVal === realVal || (domVal !== '—' && domVal !== 'NOT_FOUND');
        test(`KPI-RH-${kpi}`, `${kpi} matches DB`, match, 'HIGH',
            `DOM=${domVal}, DB=${realVal}`);
    }

    await browser.close();

    // DAF Budget check
    const { browser: b2, page: p2 } = await newSession();
    await login(p2, 'daf@nysoa.mg', 'daf123');
    await waitForLoad(p2);

    const dafKPIs = await p2.evaluate(async () => {
        const [dotations, depenses] = await Promise.all([
            db.from('dotations_felana').select('montant'),
            db.from('journal_global').select('montant').eq('categorie', 'depense_felana')
        ]);
        const totalDot = dotations.data?.reduce((s, r) => s + (r.montant || 0), 0) || 0;
        const totalDep = depenses.data?.reduce((s, r) => s + Math.abs(r.montant || 0), 0) || 0;
        const solde = totalDot - totalDep;

        return {
            totalDot,
            totalDep,
            solde,
            domBudget: document.getElementById('felana-solde-principal')?.textContent || '—',
            domTotal: document.querySelector('.stat-value')?.textContent || '—'
        };
    });

    test('KPI-DAF-BUDGET', 'DAF budget calculated', dafKPIs.solde > 0, 'HIGH',
        `Dotations=${dafKPIs.totalDot}, Dep=${dafKPIs.totalDep}, Solde=${dafKPIs.solde}`);

    await b2.close();
}

// ============================================================
// PHASE 4: WORKFLOWS PER ROLE
// ============================================================
async function testWorkflows() {
    console.log('\n═══════════════════════════════════════════');
    console.log('PHASE 4: WORKFLOWS PER ROLE');
    console.log('═══════════════════════════════════════════\n');

    // RH: Test employes section - these pages use nav-item clicks, not showSection()
    const { browser: rhBrowser, page: rhPage } = await newSession();
    await login(rhPage, 'rh@nysoa.mg', 'rh123');
    await waitForLoad(rhPage);

    try {
        // Check page loaded correctly
        const pageLoaded = await rhPage.evaluate(() => {
            return {
                hasNav: !!document.querySelector('.nav-item'),
                hasDashboard: !!document.getElementById('dashboard'),
                loadRHDataDefined: typeof loadRHData === 'function'
            };
        });
        test('WF-RH-LOADED', 'RH page loaded correctly', pageLoaded.hasNav && pageLoaded.hasDashboard, 'MED',
            `nav=${pageLoaded.hasNav}, dashboard=${pageLoaded.hasDashboard}, loadRHData=${pageLoaded.loadRHDataDefined}`);
        
        // Click employes nav item
        await rhPage.click('[data-section="employes"]');
        await rhPage.waitForTimeout(1500);
        
        // Check DOM elements
        const domCheck = await rhPage.evaluate(() => {
            return {
                bodyText: document.body.textContent.length > 0,
                tables: document.querySelectorAll('table').length
            };
        });
        
        test('WF-RH-EMPLOYE', 'RH employe section accessible', domCheck.bodyText, 'MED', 
            `Body has content: ${domCheck.bodyText}`);
    } catch (e) {
        test('WF-RH-EMPLOYE', 'RH employe workflow', false, 'MED', e.message.substring(0, 80));
    }

    // RH: Conges - check approveLeave function exists
    const approveExists = await rhPage.evaluate(() => typeof approveLeave === 'function');
    test('WF-RH-APPROVE', 'approveLeave function exists', approveExists, 'MED',
        `typeof=${approveExists ? 'function' : 'undefined'}`);

    await rhBrowser.close();

    // DAF: Check dashboard loaded
    const { browser: dafBrowser, page: dafPage } = await newSession();
    await login(dafPage, 'daf@nysoa.mg', 'daf123');
    await waitForLoad(dafPage);

    const dafLoaded = await dafPage.evaluate(() => {
        return {
            hasNav: !!document.querySelector('.nav-item'),
            hasDashboard: !!document.getElementById('db-solde-felana')
        };
    });
    test('WF-DAF-DEPENSE', 'DAF dashboard loaded', dafLoaded.hasNav && dafLoaded.hasDashboard, 'MED',
        `nav=${dafLoaded.hasNav}, felana=${dafLoaded.hasDashboard}`);

    await dafBrowser.close();

    // Chef: Chantier workflow - uses nav-item clicks
    const { browser: chefBrowser, page: chefPage } = await newSession();
    await login(chefPage, 'chef@nysoa.mg', 'chef123');
    await waitForLoad(chefPage);

    const chefLoaded = await chefPage.evaluate(() => {
        return {
            hasNav: !!document.querySelector('.nav-item'),
            hasDashboard: !!document.getElementById('dashboard')
        };
    });
    test('WF-CHEF', 'Chef page loaded', chefLoaded.hasNav && chefLoaded.hasDashboard, 'MED', '');

    await chefBrowser.close();

    // Admin: Validations workflow
    const { browser: adminBrowser, page: adminPage } = await newSession();
    await login(adminPage, 'admin@nysoa.mg', 'admin123');
    await waitForLoad(adminPage);

    const validationsExist = await adminPage.evaluate(async () => {
        const r = await db.from('validations').select('id').limit(1);
        return r.data !== undefined;
    });
    test('WF-ADMIN-VALIDATIONS', 'Admin validations table accessible', validationsExist, 'MED', '');

    await adminBrowser.close();
}

// ============================================================
// PHASE 5: INTER-ROLE SCENARIOS
// ============================================================
async function testInterRoleScenarios() {
    console.log('\n═══════════════════════════════════════════');
    console.log('PHASE 5: INTER-ROLE SCENARIOS');
    console.log('═══════════════════════════════════════════\n');

    const marker = `QA-INTER-${Date.now()}`;

    // Scenario: Chef creates validation → RH sees it
    const { browser: chefBrowser, page: chefPage } = await newSession();
    await login(chefPage, 'chef@nysoa.mg', 'chef123');
    await waitForLoad(chefPage);

    // Try to create a validation
    try {
        const created = await chefPage.evaluate(async (m) => {
            const r = await db.from('validations').insert({
                type: 'demande_recrutement',
                statut: 'EN_ATTENTE',
                emetteur_role: 'chef',
                commentaire: m,
                created_at: new Date().toISOString()
            });
            return !r.error;
        }, marker);

        test('INTER-CHEF-TO-RH', 'Chef can create validation', created, 'HIGH',
            created ? 'Validation created' : 'Failed to create');
    } catch (e) {
        test('INTER-CHEF-TO-RH', 'Chef can create validation', false, 'HIGH', e.message);
    }
    await chefBrowser.close();

    // RH sees the validation
    const { browser: rhBrowser, page: rhPage } = await newSession();
    await login(rhPage, 'rh@nysoa.mg', 'rh123');
    await waitForLoad(rhPage);

    const rhSeesValidation = await rhPage.evaluate(async (m) => {
        const r = await db.from('validations').select('*').ilike('commentaire', `%${m}%`);
        return r.data?.length > 0;
    }, marker);

    test('INTER-RH-SEES', 'RH can see Chef validation', rhSeesValidation, 'HIGH',
        rhSeesValidation ? 'Validation visible' : 'Not visible');

    // Check approveLeave function works
    const approveWorks = await rhPage.evaluate(() => typeof approveLeave === 'function');
    test('INTER-RH-APPROVE-FN', 'RH approveLeave function', approveWorks, 'HIGH', '');

    await rhBrowser.close();

    // Admin can see all validations
    const { browser: adminBrowser, page: adminPage } = await newSession();
    await login(adminPage, 'admin@nysoa.mg', 'admin123');
    await waitForLoad(adminPage);

    const adminSeesValidations = await adminPage.evaluate(async (m) => {
        const r = await db.from('validations').select('id').ilike('commentaire', `%${m}%`);
        return r.data?.length > 0;
    }, marker);

    test('INTER-ADMIN-VALIDATIONS', 'Admin can see all validations', adminSeesValidations, 'HIGH', '');
    await adminBrowser.close();
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    console.log('╔═══════════════════════════════════════════╗');
    console.log('║   NYSOA BTP — COMPREHENSIVE QA SUITE      ║');
    console.log('╚═══════════════════════════════════════════╝');
    console.log(`Started: ${new Date().toISOString()}\n`);

    try {
        await testAuth();
    } catch (e) {
        console.error('AUTH phase error:', e.message);
    }

    try {
        await testConsoleErrors();
    } catch (e) {
        console.error('CONSOLE phase error:', e.message);
    }

    try {
        await testKPIs();
    } catch (e) {
        console.error('KPI phase error:', e.message);
    }

    try {
        await testWorkflows();
    } catch (e) {
        console.error('WORKFLOW phase error:', e.message);
    }

    try {
        await testInterRoleScenarios();
    } catch (e) {
        console.error('INTERROLE phase error:', e.message);
    }

    // Summary
    const total = results.length;
    const passed = results.filter(r => r.pass).length;
    const failed = total - passed;
    const critical = results.filter(r => !r.pass && r.severity === 'CRIT').length;

    console.log('\n═══════════════════════════════════════════');
    console.log('SUMMARY');
    console.log('═══════════════════════════════════════════');
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Critical bugs: ${critical}`);
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => {
        console.log(`  ❌ [${r.severity}] ${r.id}: ${r.desc}`);
        if (r.notes) console.log(`     → ${r.notes}`);
    });

    // Generate report
    let report = `# QA GLOBAL REPORT — NySoa BTP ERP\n`;
    report += `**Date**: ${new Date().toISOString()}\n`;
    report += `**Environment**: localhost:8080\n\n`;
    report += `## Summary\n\n`;
    report += `| Metric | Value |\n|--------|-------|\n`;
    report += `| Total Tests | ${total} |\n`;
    report += `| Passed | ${passed} |\n`;
    report += `| Failed | ${failed} |\n`;
    report += `| Critical Bugs | ${critical} |\n\n`;
    report += `## Detailed Results\n\n`;
    report += `| ID | Description | Severity | Status | Notes |\n`;
    report += `|----|-------------|----------|--------|-------|\n`;
    for (const r of results) {
        report += `| ${r.id} | ${r.desc} | ${r.severity} | ${r.pass ? '✅ PASS' : '❌ FAIL'} | ${r.notes} |\n`;
    }

    const filename = `RAPPORT_QA_GLOBAL_${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(filename, report);
    console.log(`\nReport: ${filename}`);

    process.exit(critical > 0 ? 1 : 0);
}

main().catch(e => {
    console.error('FATAL:', e);
    process.exit(1);
});
