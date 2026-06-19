/**
 * QA MODALES — NySoa BTP ERP
 * ================================================================
 * Test d'ouverture/fermeture des 4 modales dont le style inline
 * display:none a été supprimé.
 *
 * Vérification stricte via getComputedStyle() — pas l'attribut inline.
 *
 * USAGE : node qa_modal_openclose.js
 */

const { ACCOUNTS } = require('./qa-credentials.local.js');
const { chromium } = require('playwright');

const BASE = 'https://nysoabtp.github.io/nysoabtp';

const TESTS = [
    {
        name: 'modal-changement-mdp (admin.html)',
        file: 'admin.html',
        role: 'admin',
        openAction: async (page) => {
            // Cliquer sur le lien de menu qui ouvre la modale
            await page.evaluate(() => {
                const el = Array.from(document.querySelectorAll('*')).find(
                    e => e.getAttribute('onclick') === "openModal('modal-changement-mdp')"
                );
                if (el) el.click();
            });
        },
        modalId: 'modal-changement-mdp',
        closeAction: async (page) => {
            await page.evaluate(() => {
                const btn = document.querySelector('#modal-changement-mdp .close-modal, #modal-changement-mdp button[onclick*="closeModal"]');
                if (btn) btn.click();
            });
        },
    },
    {
        name: 'modal-nouvelle-depense (daf.html)',
        file: 'daf.html',
        role: 'daf',
        openAction: async (page) => {
            // Aller sur section depenses d'abord, puis ouvrir modale
            await page.evaluate(() => {
                if (typeof showSection === 'function') showSection('depenses');
            });
            await page.waitForTimeout(1500);
            await page.evaluate(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(
                    b => b.getAttribute('onclick') && b.getAttribute('onclick').includes("openModal('modal-nouvelle-depense')")
                );
                if (btn) btn.click();
            });
        },
        modalId: 'modal-nouvelle-depense',
        closeAction: async (page) => {
            await page.evaluate(() => {
                const btn = document.querySelector('#modal-nouvelle-depense .close-modal, #modal-nouvelle-depense button[onclick*="closeModal"]');
                if (btn) btn.click();
            });
        },
    },
    {
        name: 'modal-decaissement-credit (daf.html)',
        file: 'daf.html',
        role: 'daf',
        openAction: async (page) => {
            // Ouvrir la modale directement via openModal() (comme tous les autres tests).
            // On teste le mécanisme modal, pas le métier credits_fournisseurs.
            await page.evaluate(() => {
                if (typeof openModal === 'function') openModal('modal-decaissement-credit');
            });
        },
        modalId: 'modal-decaissement-credit',
        closeAction: async (page) => {
            await page.evaluate(() => {
                const btn = document.querySelector('#modal-decaissement-credit .close-modal, #modal-decaissement-credit button[onclick*="closeModal"]');
                if (btn) btn.click();
            });
        },
    },
    {
        name: 'modal-changement-mdp (daf.html)',
        file: 'daf.html',
        role: 'daf',
        openAction: async (page) => {
            await page.evaluate(() => {
                const el = Array.from(document.querySelectorAll('*')).find(
                    e => e.getAttribute('onclick') === "openModal('modal-changement-mdp')"
                );
                if (el) el.click();
            });
        },
        modalId: 'modal-changement-mdp',
        closeAction: async (page) => {
            await page.evaluate(() => {
                const btn = document.querySelector('#modal-changement-mdp .close-modal, #modal-changement-mdp button[onclick*="closeModal"]');
                if (btn) btn.click();
            });
        },
    },
];

function getDisplay(page, modalId) {
    return page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        return getComputedStyle(el).display;
    }, modalId);
}

async function runTest(test) {
    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    const url = `${BASE}/${test.file}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const account = ACCOUNTS[test.role];
    await page.fill('#email', account.email);
    await page.fill('#password', account.password);
    await page.click('#btn-login');
    await page.waitForTimeout(3000);

    const results = {};

    // a) display avant ouverture
    results.displayAvant = await getDisplay(page, test.modalId);
    results.avantOk = results.displayAvant === 'none';

    // b) ouvrir la modale
    await test.openAction(page);
    await page.waitForTimeout(500);
    results.displayApresOpen = await getDisplay(page, test.modalId);
    results.ouvreOk = results.displayApresOpen !== 'none' && results.displayApresOpen !== null;

    // c) fermer la modale
    await test.closeAction(page);
    await page.waitForTimeout(300);
    results.displayApresClose = await getDisplay(page, test.modalId);
    results.fermeOk = results.displayApresClose === 'none';

    results.allOk = results.avantOk && results.ouvreOk && results.fermeOk;
    results.errors = errors.filter(e => !e.includes('Warning') && !e.includes('warning'));

    const sep = '═'.repeat(60);
    console.log(`\n${sep}`);
    console.log(`TEST : ${test.name}`);
    console.log(sep);
    console.log(`  a) AVANT ouverture : getComputedStyle() = "${results.displayAvant}" ${results.avantOk ? '✅' : '❌ (attendu "none")'}`);
    console.log(`  b) APRES ouverture  : getComputedStyle() = "${results.displayApresOpen}" ${results.ouvreOk ? '✅' : '❌ (attendu != "none")'}`);
    console.log(`  c) APRES fermeture  : getComputedStyle() = "${results.displayApresClose}" ${results.fermeOk ? '✅' : '❌ (attendu "none")'}`);
    console.log(`  → ${results.allOk ? '🟢 PASS' : '🔴 FAIL'}`);
    if (results.errors.length) {
        console.log(`  ⚠️ Erreurs console : ${results.errors.map(e => e.substring(0, 100)).join(', ')}`);
    }

    await browser.close();
    return results;
}

async function main() {
    console.log('══════════════════════════════════════════════════════════════');
    console.log('QA MODALES — Ouverture / Fermeture');
    console.log(`URL : ${BASE}`);
    console.log('══════════════════════════════════════════════════════════════');

    const allResults = [];
    for (const test of TESTS) {
        try {
            const r = await runTest(test);
            allResults.push({ name: test.name, ...r });
        } catch (e) {
            console.error(`🔴 EXCEPTION sur ${test.name}: ${e.message}`);
            allResults.push({ name: test.name, allOk: false, error: e.message });
        }
    }

    console.log('\n══════════════════════════════════════════════════════════════');
    console.log('RÉSUMÉ');
    console.log('══════════════════════════════════════════════════════════════');
    const passed = allResults.filter(r => r.allOk).length;
    const failed = allResults.filter(r => !r.allOk).length;
    allResults.forEach(r => {
        console.log(`${r.allOk ? '🟢' : '🔴'} ${r.name}${r.error ? ' — EXCEPTION: ' + r.error : ''}`);
    });
    console.log(`\nTotal : ${passed} pass | ${failed} fail`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
