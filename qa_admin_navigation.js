/**
 * QA ADMIN NAVIGATION — NySoa BTP ERP
 * ================================================================
 * Test de navigation entre sections et ouverture/fermeture des
 * modales sur admin.html, avec détection d'affichage cassé.
 *
 * Vérification stricte via getComputedStyle() — pas l'attribut inline.
 *
 * USAGE : node qa_admin_navigation.js
 */

const { ACCOUNTS } = require('./qa-credentials.local.js');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://nysoabtp.github.io/nysoabtp';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const TEST_NAME = 'qa_admin_navigation';

if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

// ── Helpers ──────────────────────────────────────────────────────

function screenshotFilename(prefix) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${TEST_NAME}-${prefix}-${ts}.png`;
}

async function takeScreenshot(page, prefix, label) {
    try {
        const file = screenshotFilename(prefix);
        const filePath = path.join(SCREENSHOTS_DIR, file);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`      📸 Capture sauvegardée : screenshots/${file}`);
        return file;
    } catch (e) {
        console.log(`      ⚠️  Capture échouée : ${e.message}`);
        return null;
    }
}

async function checkDisplayBroken(page, context) {
    const checks = [];

    // 1. Overflow horizontal sur body
    const bodyOverflow = await page.evaluate(() => {
        const body = document.body;
        return body.scrollWidth > body.clientWidth;
    });
    if (bodyOverflow) {
        checks.push({ type: 'OVERFLOW_H', severity: 'HIGH', msg: 'overflow horizontal détecté sur <body>' });
    }

    // 2. Images cassées (naturalWidth === 0)
    const brokenImgs = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).filter(img => img.naturalWidth === 0 && img.complete).map(img => img.src || img.outerHTML.substring(0, 60));
    });
    if (brokenImgs.length) {
        checks.push({ type: 'BROKEN_IMG', severity: 'MED', msg: `images cassées: ${brokenImgs.slice(0, 3).join('; ')}` });
    }

    // 3. Deux sections visibles simultanément (devrait être exclusif)
    const visibleSections = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('[id^="section-"]'))
            .filter(s => getComputedStyle(s).display !== 'none')
            .map(s => s.id);
    });
    if (visibleSections.length > 1) {
        checks.push({ type: 'MULTI_SECTION', severity: 'HIGH', msg: `sections multiples visibles: ${visibleSections.join(', ')}` });
    }

    // 4. Plusieurs modales actives simultanément
    const visibleModals = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.modal'))
            .filter(m => getComputedStyle(m).display !== 'none')
            .map(m => m.id);
    });
    if (visibleModals.length > 1) {
        checks.push({ type: 'MULTI_MODAL', severity: 'HIGH', msg: `modales multiples visibles: ${visibleModals.join(', ')}` });
    }

    return checks;
}

// ── Test d'ouverture/fermeture de modale ────────────────────────

const CEO_MODALS = ['modal-budget-global', 'modal-dotation-felana', 'modal-recette', 'modal-credit-fournisseur'];

async function testModalOpenClose(page, modalId, openFn, closeFn, label) {
    const isCEO = CEO_MODALS.includes(modalId);
    const result = {
        label,
        modalId,
        displayAvant: null,
        displayApresOpen: null,
        displayApresClose: null,
        avantOk: false,
        ouvreOk: false,
        fermeOk: false,
        allOk: false,
        errors: [],
        displayBroken: [],
        screenshotOnFail: null,
    };

    // Reset PROPRE de la modale AVANT le test
    // Deux types de modales avec deux mécanismes de visibility distincts :
    // - non-CEO (modal-changement-mdp, validation-detail-modal) : CSS .active
    //   Le CSS .modal:not(.active) { display:none!important } gère l'état hidden.
    //   → On enlève .active (CSS prend le relais → none)
    // - CEO (modal-budget-global, etc.) : style.display inline
    //   → On restaure style.display='none' (inline takes over)
    const CEO_MODALS_LIST = ['modal-budget-global', 'modal-dotation-felana', 'modal-recette', 'modal-credit-fournisseur'];
    await page.evaluate(([id, ceoModals]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('active');
        if (ceoModals.includes(id)) {
            el.style.display = 'none'; // CEO uses inline style
        }
    }, [modalId, CEO_MODALS_LIST]);
    await page.waitForTimeout(200);

    // display avant — forcer re-render avec offsetHeight
    result.displayAvant = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return 'NOT_FOUND';
        el.offsetHeight;
        return getComputedStyle(el).display;
    }, modalId);
    result.avantOk = result.displayAvant === 'none' || result.displayAvant === 'NOT_FOUND';

    // ouvrir
    await openFn(page);
    await page.waitForTimeout(600);
    result.displayApresOpen = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return 'NOT_FOUND';
        el.offsetHeight;
        return getComputedStyle(el).display;
    }, modalId);
    result.ouvreOk = result.displayApresOpen !== 'none' && result.displayApresOpen !== 'NOT_FOUND';

    // vérifier display cassé après ouverture
    if (result.ouvreOk) {
        const broken = await checkDisplayBroken(page, 'modal-open');
        result.displayBroken.push(...broken);
    }

    // fermer
    await closeFn(page);
    await page.waitForTimeout(400);
    result.displayApresClose = await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (!el) return 'NOT_FOUND';
        el.offsetHeight;
        return getComputedStyle(el).display;
    }, modalId);
    result.fermeOk = result.displayApresClose === 'none';

    result.allOk = result.avantOk && result.ouvreOk && result.fermeOk && result.displayBroken.length === 0;

    return result;
}

// ── Test de navigation entre sections ───────────────────────────

async function testSectionNavigation(page, sectionName) {
    const result = {
        sectionName,
        targetVisible: false,
        othersHidden: true,
        navActiveOk: false,
        allOk: false,
        errors: [],
        displayBroken: [],
        screenshotOnFail: null,
    };

    // Cliquer sur le nav-item VIA page.evaluate (évite les pb de stale handle)
    await page.evaluate((name) => {
        const nav = Array.from(document.querySelectorAll('.nav-item'))
            .find(n => n.getAttribute('onclick') === `showSection('${name}')`);
        if (nav) nav.click();
        else console.warn('[QA DEBUG] Nav not found for:', name);
    }, sectionName);
    await page.waitForTimeout(600);

    // Vérifier que la section cible est visible
    const displayApres = await page.evaluate((name) => {
        const el = document.getElementById('section-' + name);
        return el ? getComputedStyle(el).display : 'NOT_FOUND';
    }, sectionName);
    result.targetVisible = displayApres !== 'none' && displayApres !== 'NOT_FOUND';

    // Vérifier que TOUTES les autres sections sont masquées
    const othersVisible = await page.evaluate((targetName) => {
        return Array.from(document.querySelectorAll('[id^="section-"]'))
            .filter(s => s.id !== 'section-' + targetName && getComputedStyle(s).display !== 'none')
            .map(s => s.id);
    }, sectionName);
    result.othersHidden = othersVisible.length === 0;

    // Vérifier que le nav-item correspondant a la classe active
    const hasActive = await page.evaluate((name) => {
        const nav = Array.from(document.querySelectorAll('.nav-item'))
            .find(n => n.getAttribute('onclick') === `showSection('${name}')`);
        return nav ? nav.classList.contains('active') : false;
    }, sectionName);

    // Vérifier qu'aucun autre nav-item showSection n'a la classe active
    const othersActive = await page.evaluate((name) => {
        return Array.from(document.querySelectorAll('.nav-item'))
            .filter(n => n.getAttribute('onclick') === `showSection('${name}')`)
            .filter(n => !n.classList.contains('active'))
            .map(n => n.getAttribute('onclick'));
    });
    result.navActiveOk = hasActive && othersActive.length === 0;

    // Vérifier display cassé
    result.displayBroken = await checkDisplayBroken(page, 'section-nav');

    result.allOk = result.targetVisible && result.othersHidden && result.navActiveOk && result.displayBroken.length === 0;

    return result;
}

// ── MAIN ─────────────────────────────────────────────────────────

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('QA ADMIN NAVIGATION — Sections & Modales');
    console.log(`URL  : ${BASE}/admin.html`);
    console.log(`Date : ${new Date().toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════════');

    const browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await ctx.newPage();

    const jsErrors = [];
    const consoleErrors = [];
    const failedRequests = [];

    page.on('pageerror', err => jsErrors.push(err.message.substring(0, 200)));
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 200));
    });
    page.on('requestfailed', req => {
        failedRequests.push(`${req.url().substring(0, 120)} — ${req.failure()?.errorText || 'unknown'}`);
    });
    page.on('response', resp => {
        const status = resp.status();
        if (status >= 400 && ['text/css', 'application/javascript', 'image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'].includes(resp.headers()['content-type']?.split(';')[0])) {
            failedRequests.push(`HTTP ${status}: ${resp.url().substring(0, 120)}`);
        }
    });

    // ── Authentification ──────────────────────────────────────────
    const account = ACCOUNTS.admin;
    if (!account) {
        console.error('🔴 Aucun compte "admin" dans qa-credentials.local.js — abandon.');
        await browser.close();
        process.exit(1);
    }

    console.log(`\n🔑 Connexion avec ${account.email}...`);
    await page.goto(`${BASE}/admin.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Vérifier redirection login si non authentifié
    if (page.url().includes('login')) {
        await page.fill('#email', account.email);
        await page.fill('#password', account.password);
        await page.click('#btn-login');
        await page.waitForTimeout(3500);
    }

    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
        console.error(`🔴 AUTH FAILED — toujours sur login : ${currentUrl}`);
        await browser.close();
        process.exit(1);
    }
    console.log(`✅ Authentifié — URL : ${currentUrl.substring(0, 80)}`);

    // ── Découverte dynamique des sections et modales ──────────────────
    const navItems = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.nav-item'))
            .filter(el => el.getAttribute('onclick') && el.getAttribute('onclick').startsWith("showSection("))
            .map(el => ({
                onclick: el.getAttribute('onclick'),
                text: el.textContent.trim().substring(0, 40),
                href: el.href || '',
            }));
    });

    // Extraire les noms de section depuis les onclick
    const sectionNames = navItems.map(n => {
        const m = n.onclick.match(/showSection\(['"]([^'"]+)['"]\)/);
        return m ? m[1] : null;
    }).filter(Boolean);

    // Découvrir les modales
    const modals = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.modal[id]')).map(el => el.id);
    });

    // Pour chaque modale, trouver le(s) déclencheur(s)
    const modalTriggers = await page.evaluate(() => {
        const triggers = {};
        document.querySelectorAll('[onclick]').forEach(el => {
            const match = el.getAttribute('onclick').match(/(?:openModal|openModalCEO)\(['"]([^'"]+)['"]\)/);
            if (match) {
                const id = match[1];
                if (!triggers[id]) triggers[id] = [];
                triggers[id].push(el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''));
            }
        });
        return triggers;
    });

    const sep1 = '─'.repeat(65);
    const results = { sections: [], modals: [], globalErrors: [] };

    // ── PHASE 1: NAVIGATION ENTRE SECTIONS ─────────────────────────
    console.log(`\n${sep1}`);
    console.log(`PHASE 1 — Navigation entre sections (${sectionNames.length} sections)`);
    console.log(sep1);

    for (const sectionName of sectionNames) {
        // Vérifier que le nav-item existe
        const navExists = await page.evaluate((name) => {
            return Array.from(document.querySelectorAll('.nav-item'))
                .some(n => n.getAttribute('onclick') === `showSection('${name}')`);
        }, sectionName);
        if (!navExists) {
            console.log(`  ⏭  showSection('${sectionName}') — nav-item introuvable, ignoré`);
            continue;
        }

        // Reset : cliquer sur le nav-item "import" pour revenir à un état propre
        await page.evaluate(() => {
            const importNav = Array.from(document.querySelectorAll('.nav-item'))
                .find(n => n.getAttribute('onclick') === "showSection('import')");
            if (importNav) importNav.click();
        });
        await page.waitForTimeout(500);

        const r = await testSectionNavigation(page, sectionName);
        results.sections.push({ sectionName, ...r });

        if (r.allOk) {
            console.log(`  ✅ section['${sectionName}'] — nav active, section visible, autres masquées`);
        } else {
            console.log(`  🔴 FAIL section['${sectionName}']`);
            if (!r.targetVisible) console.log(`     • section pas visible`);
            if (!r.othersHidden) console.log(`     • d'autres sections visibles`);
            if (!r.navActiveOk) console.log(`     • nav-item n'a pas .active`);
            for (const b of r.displayBroken) {
                console.log(`     • [${b.severity}] ${b.type} : ${b.msg}`);
            }
            await takeScreenshot(page, `section-${sectionName}`, sectionName);
        }
    }

    // ── PHASE 2: MODALES ────────────────────────────────────────────
    console.log(`\n${sep1}`);
    console.log(`PHASE 2 — Ouverture/Fermeture modales (${modals.length} modales)`);
    console.log(sep1);

    for (const modalId of modals) {
        const triggers = modalTriggers[modalId] || [];
        if (triggers.length === 0) {
            console.log(`  ⏭  ${modalId} — aucun déclencheur trouvé, ignoré`);
            continue;
        }

        // Ouvrir via JS — les listes doivent être passées comme argument de evaluate
        const CEO_MODALS_LIST2 = ['modal-budget-global', 'modal-dotation-felana', 'modal-recette', 'modal-credit-fournisseur'];
        const openFn = async (p) => {
            await p.evaluate(([id, ceoModals]) => {
                const isCEO = ceoModals.includes(id);
                const fn = isCEO ? window.openModalCEO : window.openModal;
                if (typeof fn === 'function') fn(id);
            }, [modalId, CEO_MODALS_LIST2]);
        };

        const closeFn = async (p) => {
            await p.evaluate(([id, ceoModals]) => {
                const isCEO = ceoModals.includes(id);
                const fn = isCEO ? window.closeModalCEO : window.closeModal;
                if (typeof fn === 'function') fn(id);
            }, [modalId, CEO_MODALS_LIST2]);
        };

        const r = await testModalOpenClose(page, modalId, openFn, closeFn, `modal[${modalId}]`);
        results.modals.push({ modalId, ...r });

        if (r.allOk) {
            console.log(`  ✅ ${modalId}`);
            console.log(`     Avant=${r.displayAvant} → Ouvert=${r.displayApresOpen} → Fermé=${r.displayApresClose}`);
        } else {
            console.log(`  🔴 FAIL ${modalId}`);
            console.log(`     Avant=${r.displayAvant} → Ouvert=${r.displayApresOpen} → Fermé=${r.displayApresClose}`);
            if (!r.avantOk) console.log(`     • État initial incorrect (attendu: none)`);
            if (!r.ouvreOk) console.log(`     • Ouverture échouée (display=${r.displayApresOpen})`);
            if (!r.fermeOk) console.log(`     • Fermeture échouée (display=${r.displayApresClose})`);
            for (const b of r.displayBroken) {
                console.log(`     • [${b.severity}] ${b.type} : ${b.msg}`);
            }
            await takeScreenshot(page, `modal-${modalId}`, modalId);
        }
    }

    // ── PHASE 3: ERREURS GLOBALES ───────────────────────────────────
    console.log(`\n${sep1}`);
    console.log(`PHASE 3 — Détection d'affichage cassé (globale)`);
    console.log(sep1);

    const globalBroken = await checkDisplayBroken(page, 'global-check');

    if (jsErrors.length > 0) {
        results.globalErrors.push({ type: 'JS_ERROR', msgs: jsErrors });
        console.log(`  ⚠️  ${jsErrors.length} erreur(s) JS console :`);
        jsErrors.forEach(e => console.log(`     • ${e.substring(0, 120)}`));
    } else {
        console.log(`  ✅ Aucune erreur JS console`);
    }

    if (failedRequests.length > 0) {
        results.globalErrors.push({ type: 'FAILED_RESOURCE', msgs: failedRequests });
        console.log(`  ⚠️  ${failedRequests.length} ressource(s) en échec :`);
        failedRequests.forEach(r => console.log(`     • ${r.substring(0, 120)}`));
    } else {
        console.log(`  ✅ Aucune ressource en échec`);
    }

    if (globalBroken.length > 0) {
        results.globalErrors.push({ type: 'DISPLAY_BROKEN', msgs: globalBroken });
        console.log(`  ⚠️  ${globalBroken.length} problème(s) d'affichage :`);
        globalBroken.forEach(b => console.log(`     • [${b.severity}] ${b.type} : ${b.msg}`));
        await takeScreenshot(page, 'global-broken', 'global-check');
    } else {
        console.log(`  ✅ Affichage normal (pas d'overflow, ni image cassée, ni sections multiples)`);
    }

    await browser.close();

    // ── RÉSUMÉ FINAL ─────────────────────────────────────────────────
    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`RÉSUMÉ`);
    console.log(`═══════════════════════════════════════════════════════════════`);

    const secPass = results.sections.filter(r => r.allOk).length;
    const secFail = results.sections.length - secPass;
    const modPass = results.modals.filter(r => r.allOk).length;
    const modFail = results.modals.length - modPass;

    console.log(`\n📋 SECTIONS (${results.sections.length} testées)`);
    for (const r of results.sections) {
        const sym = r.allOk ? '🟢' : '🔴';
        console.log(`  ${sym} ${r.sectionName}`);
        if (!r.allOk) {
            if (!r.targetVisible) console.log(`      → section pas visible`);
            if (!r.othersHidden) console.log(`      → autres sections visibles`);
            if (!r.navActiveOk) console.log(`      → nav-item sans .active`);
            r.displayBroken.forEach(b => console.log(`      → [${b.severity}] ${b.type}: ${b.msg}`));
        }
    }
    console.log(`  → ${secPass} pass | ${secFail} fail`);

    console.log(`\n📋 MODALES (${results.modals.length} testées)`);
    for (const r of results.modals) {
        const sym = r.allOk ? '🟢' : '🔴';
        console.log(`  ${sym} ${r.modalId}`);
        if (!r.allOk) {
            if (!r.avantOk) console.log(`      → avant≠none (=${r.displayAvant})`);
            if (!r.ouvreOk) console.log(`      → ouverture≠flex (=${r.displayApresOpen})`);
            if (!r.fermeOk) console.log(`      → fermeture≠none (=${r.displayApresClose})`);
            r.displayBroken.forEach(b => console.log(`      → [${b.severity}] ${b.type}: ${b.msg}`));
        }
    }
    console.log(`  → ${modPass} pass | ${modFail} fail`);

    console.log(`\n📋 ERREURS GLOBALES`);
    if (results.globalErrors.length === 0) {
        console.log(`  ✅ Aucune erreur détectée`);
    } else {
        for (const err of results.globalErrors) {
            console.log(`  ⚠️  ${err.type} : ${err.msgs.length} occurrence(s)`);
        }
    }

    const totalPass = secPass + modPass;
    const totalFail = secFail + modFail + results.globalErrors.length;
    const globalOk = results.globalErrors.length === 0;
    const allOk = totalFail === 0;

    console.log(`\n═══════════════════════════════════════════════════════════════`);
    console.log(`${allOk && globalOk ? '✅ TOUT EST PASS' : '🔴 ÉCHECS DÉTECTÉS'}`);
    console.log(`Sections: ${secPass}/${results.sections.length} pass | Modales: ${modPass}/${results.modals.length} pass | Erreurs globales: ${results.globalErrors.length}`);
    console.log(`═══════════════════════════════════════════════════════════════`);

    process.exit(allOk && globalOk ? 0 : 1);
}

main().catch(e => {
    console.error('FATAL:', e.message);
    process.exit(1);
});
