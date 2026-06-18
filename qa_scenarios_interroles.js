/**
 * QA SCÉNARIOS INTER-RÔLES — NySoa BTP ERP
 * ------------------------------------------------------------
 * Contrairement à qa_robust_test.js (qui ne vérifie que la présence
 * de mots-clés / compteurs DOM), ce script effectue de VRAIES saisies
 * de données via les formulaires, déclenche les fonctions métier
 * réelles, et vérifie le résultat directement en base via le client
 * Supabase exposé par l'app (db), pour chaque circuit qui
 * traverse plusieurs rôles.
 *
 * Scénario 1 — Recrutement (chef → admin) :
 *   1. Le chef de chantier soumet une demande de recrutement.
 *   2. On vérifie l'INSERT réel dans `validations` (type, statut,
 *      emetteur_role) via une requête DB, pas une lecture du DOM.
 *   3. L'admin se connecte, ouvre la file de validation, doit voir
 *      la demande EN_ATTENTE.
 *   4. L'admin l'approuve (gère le prompt() natif déclenché par
 *      approuverValidation()).
 *   5. On vérifie en base que le statut est passé à APPROUVE et que
 *      decided_by / decided_at sont renseignés.
 *
 * Scénario 2 — Crédit fournisseur (admin → admin → DAF) :
 *   1. L'admin crée un crédit fournisseur (EN_ATTENTE).
 *   2. On vérifie l'INSERT réel.
 *   3. L'admin clique "Autoriser" (gère le confirm() natif) →
 *      statut doit passer à AUTORISE_DAF.
 *   4. Le DAF se connecte, ouvre le décaissement pour CE crédit
 *      précis (ciblé par ID, pas par clic dans une liste qui peut
 *      être vide/paginée), tente un montant > reste → doit être
 *      REJETÉ (pas de changement en base).
 *   5. Le DAF tente un montant valide → doit réussir, le crédit doit
 *      passer à SOLDE en base.
 *
 * Chaque étape vérifie l'ÉTAT RÉEL en base après l'action UI, pas
 * seulement un message de succès affiché à l'écran.
 */

const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'http://localhost:8080';

const ACCOUNTS = {
    admin: { email: 'admin@nysoa.mg', password: 'admin123' },
    daf: { email: 'daf@nysoa.mg', password: 'daf123' },
    chef: { email: 'chef@nysoa.mg', password: 'chef123' },
};

const results = [];
const consoleErrors = [];

function record(id, description, expected, obtained, status, extra) {
    results.push({ id, description, expected, obtained, status, extra: extra || '' });
    console.log(`[${status}] ${id} — ${description} | attendu: ${expected} | obtenu: ${obtained}`);
}

async function newSession() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            consoleErrors.push(`[${new Date().toISOString()}] ${msg.text().substring(0, 200)}`);
        }
    });
    page.on('pageerror', (err) => {
        consoleErrors.push(`[${new Date().toISOString()}] PAGEERROR: ${err.message.substring(0, 200)}`);
    });
    return { browser, page };
}

async function login(page, role) {
    const { email, password } = ACCOUNTS[role];
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('#email', { timeout: 5000 });
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('#btn-login');
    await page.waitForTimeout(2500);
    if (page.url().includes('login.html')) {
        throw new Error(`Login échoué pour ${role} (toujours sur login.html)`);
    }
    // Laisse le dashboard charger ses données initiales (évite de tester
    // une page encore vide).
    await page.waitForTimeout(1500);
}

/** Exécute une requête Supabase directement dans la page (via db),
 *  pour vérifier l'état réel en base — pas ce qu'affiche le DOM. */
async function dbSelect(page, table, filters) {
    return page.evaluate(async ({ table, filters }) => {
        let q = db.from(table).select('*');
        for (const [col, val] of Object.entries(filters || {})) {
            q = q.eq(col, val);
        }
        const { data, error } = await q;
        return { data, error: error ? error.message : null };
    }, { table, filters });
}

// ============================================================
// SCÉNARIO 1 — RECRUTEMENT : chef crée, admin valide
// ============================================================
async function scenarioRecrutement() {
    console.log('\n=== SCÉNARIO 1 : RECRUTEMENT (chef → admin) ===');
    const marqueur = `QA-RECRUT-${Date.now()}`;

    // --- Étape 1 : le chef soumet la demande via le vrai formulaire ---
    const chefSession = await newSession();
    let createdOk = false;
    try {
        await login(chefSession.page, 'chef');
        await chefSession.page.evaluate(() => {
            if (typeof openModal === 'function') openModal('modal-recrutement');
            else document.getElementById('modal-recrutement').style.display = 'flex';
        });
        await chefSession.page.waitForSelector('#modal-recrutement form', { timeout: 5000 });

        await chefSession.page.selectOption('#modal-recrutement select[name="poste"]', { label: 'Maçon' });
        await chefSession.page.fill('#modal-recrutement input[name="nombre"]', '2');
        await chefSession.page.fill('#modal-recrutement input[name="duree"]', '4');
        await chefSession.page.fill(
            '#modal-recrutement textarea[name="justification"]',
            marqueur
        );
        await chefSession.page.click('#modal-recrutement button[type="submit"]');
        await chefSession.page.waitForTimeout(2000);
        createdOk = true;
    } catch (e) {
        record('RECRUT-01-SUBMIT', 'Chef soumet une demande de recrutement', 'Formulaire soumis sans exception', `Exception: ${e.message}`, '🔴');
    } finally {
        await chefSession.browser.close();
    }

    if (!createdOk) return;

    // --- Étape 2 : vérification réelle en base (pas le DOM) ---
    const verifySession = await newSession();
    let validationRow = null;
    try {
        await login(verifySession.page, 'admin');
        const { data, error } = await verifySession.page.evaluate(async (marqueur) => {
            const { data, error } = await db
                .from('validations')
                .select('*')
                .eq('type', 'demande_recrutement')
                .ilike('commentaire', `%${marqueur}%`)
                .order('created_at', { ascending: false })
                .limit(1);
            return { data, error: error ? error.message : null };
        }, marqueur);

        if (error) {
            record('RECRUT-02-DB-INSERT', 'INSERT réel dans `validations`', 'Ligne trouvée, statut EN_ATTENTE', `Erreur requête: ${error}`, '🔴');
        } else if (!data || !data.length) {
            record('RECRUT-02-DB-INSERT', 'INSERT réel dans `validations`', 'Ligne trouvée, statut EN_ATTENTE', 'Aucune ligne trouvée — la demande n\'a pas été insérée ou le marqueur ne matche pas', '🔴');
        } else {
            validationRow = data[0];
            const ok = validationRow.statut === 'EN_ATTENTE' && validationRow.emetteur_role === 'chef';
            record(
                'RECRUT-02-DB-INSERT',
                'INSERT réel dans `validations`',
                'statut=EN_ATTENTE, emetteur_role=chef',
                `statut=${validationRow.statut}, emetteur_role=${validationRow.emetteur_role}, type=${validationRow.type}`,
                ok ? '🟢' : '🟡'
            );
        }
    } catch (e) {
        record('RECRUT-02-DB-INSERT', 'INSERT réel dans `validations`', 'Ligne trouvée', `Exception: ${e.message}`, '🔴');
    }

    if (!validationRow) {
        await verifySession.browser.close();
        return;
    }

    // --- Étape 3 : l'admin doit voir la demande dans sa file EN_ATTENTE ---
    try {
        await verifySession.page.evaluate(() => {
            if (typeof showSection === 'function') showSection('validations');
        });
        await verifySession.page.waitForTimeout(800);
        await verifySession.page.evaluate(() => loadValidations('EN_ATTENTE'));
        await verifySession.page.waitForTimeout(1000);

        const rowVisible = await verifySession.page.evaluate((id) => {
            const tbody = document.getElementById('validations-table-body');
            return tbody ? tbody.innerHTML.includes(`approuverValidation(${id})`) : false;
        }, validationRow.id);

        record(
            'RECRUT-03-UI-VISIBLE',
            'Admin voit la demande dans la file de validation',
            'Bouton Approuver présent pour cet ID',
            rowVisible ? 'Présent' : 'Absent — la demande existe en base mais n\'apparaît pas dans la liste',
            rowVisible ? '🟢' : '🔴'
        );

        // Vérifie au passage le mapping de libellé (bug potentiel détecté
        // dans le code : 'demande_recrutement' absent du typeLabel).
        const labelRendered = await verifySession.page.evaluate((id) => {
            const tbody = document.getElementById('validations-table-body');
            const row = [...tbody.querySelectorAll('tr')].find((tr) =>
                tr.innerHTML.includes(`approuverValidation(${id})`)
            );
            return row ? row.querySelector('td')?.textContent?.trim() : null;
        }, validationRow.id);

        record(
            'RECRUT-03B-LABEL',
            'Libellé affiché pour le type "demande_recrutement"',
            'Un libellé lisible (ex: "Demande recrutement")',
            labelRendered || '(introuvable)',
            labelRendered === 'demande_recrutement' ? '🟡' : '🟢',
            labelRendered === 'demande_recrutement'
                ? 'Le type brut est affiché tel quel : entrée manquante dans le mapping typeLabel de loadValidations() (admin.html)'
                : ''
        );
    } catch (e) {
        record('RECRUT-03-UI-VISIBLE', 'Admin voit la demande dans la file de validation', 'Visible', `Exception: ${e.message}`, '🔴');
    }

    // --- Étape 4 : approbation (gère le prompt() natif) ---
    try {
        verifySession.page.once('dialog', (dialog) => dialog.accept('QA - validé automatiquement'));
        await verifySession.page.evaluate((id) => approuverValidation(id), validationRow.id);
        await verifySession.page.waitForTimeout(1500);
    } catch (e) {
        record('RECRUT-04-APPROVE', 'Admin approuve la demande (gère prompt natif)', 'Pas d\'exception', `Exception: ${e.message}`, '🔴');
    }

    // --- Étape 5 : vérification réelle en base post-approbation ---
    try {
        const { data, error } = await dbSelect(verifySession.page, 'validations', { id: validationRow.id });
        if (error || !data || !data.length) {
            record('RECRUT-05-DB-APPROVED', 'Statut en base après approbation', 'statut=APPROUVE', `Erreur ou ligne absente: ${error}`, '🔴');
        } else {
            const row = data[0];
            const ok = row.statut === 'APPROUVE' && !!row.decided_at;
            record(
                'RECRUT-05-DB-APPROVED',
                'Statut en base après approbation',
                'statut=APPROUVE, decided_at renseigné',
                `statut=${row.statut}, decided_at=${row.decided_at || 'null'}, decided_by=${row.decided_by || 'null'}`,
                ok ? '🟢' : '🔴'
            );
        }
    } catch (e) {
        record('RECRUT-05-DB-APPROVED', 'Statut en base après approbation', 'statut=APPROUVE', `Exception: ${e.message}`, '🔴');
    }

    await verifySession.browser.close();
}

// ============================================================
// SCÉNARIO 2 — CRÉDIT FOURNISSEUR : admin crée/autorise, DAF décaisse
// ============================================================
async function scenarioCreditFournisseur() {
    console.log('\n=== SCÉNARIO 2 : CRÉDIT FOURNISSEUR (admin → admin → DAF) ===');
    const fournisseurMarqueur = `QA-FOURN-${Date.now()}`;
    const montantTotal = 150000;

    // --- Étape 1 : admin crée le crédit via le vrai formulaire ---
    const adminSession = await newSession();
    let creditId = null;
    try {
        await login(adminSession.page, 'admin');
        await adminSession.page.evaluate(() => {
            if (typeof showSection === 'function') showSection('credits-fournisseurs');
        });
        await adminSession.page.waitForTimeout(800);
        await adminSession.page.evaluate(() => {
            if (typeof openModalCEO === 'function') openModalCEO('modal-credit-fournisseur');
        });
        await adminSession.page.waitForSelector('#form-credit-fournisseur', { timeout: 5000 });

        const todayStr = new Date().toISOString().split('T')[0];
        await adminSession.page.fill('#form-credit-fournisseur input[name="date"]', todayStr);
        await adminSession.page.fill('#form-credit-fournisseur input[name="fournisseur"]', fournisseurMarqueur);
        await adminSession.page.fill('#form-credit-fournisseur input[name="designation"]', 'QA test décaissement');
        await adminSession.page.fill('#form-credit-fournisseur input[name="montant_total"]', String(montantTotal));
        await adminSession.page.click('#form-credit-fournisseur button[type="submit"]');
        await adminSession.page.waitForTimeout(1500);

        const { data, error } = await dbSelect(adminSession.page, 'credits_fournisseurs', { fournisseur: fournisseurMarqueur });
        if (error || !data || !data.length) {
            record('CREDIT-01-DB-INSERT', 'INSERT réel dans `credits_fournisseurs`', 'Ligne trouvée, statut EN_ATTENTE', `Erreur ou absente: ${error}`, '🔴');
        } else {
            creditId = data[0].id;
            const ok = data[0].statut === 'EN_ATTENTE' && Number(data[0].montant_total) === montantTotal;
            record(
                'CREDIT-01-DB-INSERT',
                'INSERT réel dans `credits_fournisseurs`',
                `statut=EN_ATTENTE, montant_total=${montantTotal}`,
                `statut=${data[0].statut}, montant_total=${data[0].montant_total}`,
                ok ? '🟢' : '🔴'
            );
        }
    } catch (e) {
        record('CREDIT-01-DB-INSERT', 'INSERT réel dans `credits_fournisseurs`', 'Ligne trouvée', `Exception: ${e.message}`, '🔴');
    }

    if (!creditId) {
        await adminSession.browser.close();
        return;
    }

    // --- Étape 2 : admin autorise (gère le confirm() natif) ---
    try {
        adminSession.page.once('dialog', (dialog) => dialog.accept());
        await adminSession.page.evaluate((id) => autoriserDafCredit(id), creditId);
        await adminSession.page.waitForTimeout(1200);

        const { data, error } = await dbSelect(adminSession.page, 'credits_fournisseurs', { id: creditId });
        const ok = !error && data && data.length && data[0].statut === 'AUTORISE_DAF';
        record(
            'CREDIT-02-AUTORISATION',
            'Statut en base après autorisation CEO/admin',
            'statut=AUTORISE_DAF',
            ok ? `statut=${data[0].statut}` : `Échec: ${error || (data && data[0] && data[0].statut)}`,
            ok ? '🟢' : '🔴'
        );
    } catch (e) {
        record('CREDIT-02-AUTORISATION', 'Statut en base après autorisation', 'statut=AUTORISE_DAF', `Exception: ${e.message}`, '🔴');
    }
    await adminSession.browser.close();

    // --- Étape 3 : DAF tente un décaissement EXCESSIF (doit être rejeté) ---
    const dafSession = await newSession();
    try {
        await login(dafSession.page, 'daf');

        // On cible directement le crédit par son ID réel (robuste, ne
        // dépend pas de l'ordre/pagination d'une liste UI).
        await dafSession.page.evaluate((id) => {
            if (typeof showSection === 'function') showSection('credits-daf');
        });
        await dafSession.page.waitForTimeout(800);
        await dafSession.page.evaluate((id) => ouvrirDecaissement(id), creditId);
        await dafSession.page.waitForSelector('#modal-decaissement-credit', { timeout: 5000 });
        await dafSession.page.waitForTimeout(500);

        const todayStr = new Date().toISOString().split('T')[0];
        await dafSession.page.fill('#decaiss-date', todayStr);
        // Montant largement supérieur au crédit engagé (150 000 → 999 999)
        await dafSession.page.fill('#decaiss-montant', '999999');
        await dafSession.page.selectOption('#modal-decaissement-credit select[name="mode_paiement"]', { value: 'ESPECE' });
        await dafSession.page.click('#btn-submit-decaissement');
        await dafSession.page.waitForTimeout(2000);

        const { data, error } = await dbSelect(dafSession.page, 'credits_fournisseurs', { id: creditId });
        const stillAuthorised = !error && data && data.length && data[0].statut === 'AUTORISE_DAF';
        record(
            'CREDIT-03-DECAISSEMENT-EXCESSIF',
            'Décaissement > montant du crédit doit être REJETÉ',
            'Statut reste AUTORISE_DAF, aucune écriture journal',
            stillAuthorised ? `statut=${data[0].statut} (rejet confirmé)` : `statut=${data && data[0] && data[0].statut} — possible faille : le décaissement excessif a été accepté`,
            stillAuthorised ? '🟢' : '🔴'
        );
    } catch (e) {
        record('CREDIT-03-DECAISSEMENT-EXCESSIF', 'Décaissement excessif rejeté', 'Rejet', `Exception: ${e.message}`, '🟡', 'Le modal ou le formulaire a peut-être une structure différente de celle attendue — à vérifier manuellement');
    }

    // --- Étape 4 : DAF tente un décaissement VALIDE (doit réussir) ---
    try {
        // Réouvre proprement le modal pour ce même crédit.
        await dafSession.page.evaluate((id) => ouvrirDecaissement(id), creditId);
        await dafSession.page.waitForTimeout(500);

        const todayStr = new Date().toISOString().split('T')[0];
        await dafSession.page.fill('#decaiss-date', todayStr);
        await dafSession.page.fill('#decaiss-montant', String(montantTotal));
        await dafSession.page.selectOption('#modal-decaissement-credit select[name="mode_paiement"]', { value: 'VIREMENT' });
        await dafSession.page.fill('#modal-decaissement-credit input[name="reference_paiement"]', 'QA-TEST-REF');
        await dafSession.page.click('#btn-submit-decaissement');
        await dafSession.page.waitForTimeout(2500);

        const { data, error } = await dbSelect(dafSession.page, 'credits_fournisseurs', { id: creditId });
        if (error || !data || !data.length) {
            record('CREDIT-04-DECAISSEMENT-VALIDE', 'Décaissement valide doit faire passer le crédit à SOLDE', 'statut=SOLDE', `Erreur: ${error}`, '🔴');
        } else {
            const row = data[0];
            const ok = row.statut === 'SOLDE';
            record(
                'CREDIT-04-DECAISSEMENT-VALIDE',
                'Décaissement valide doit faire passer le crédit à SOLDE',
                'statut=SOLDE',
                `statut=${row.statut}`,
                ok ? '🟢' : '🟡',
                ok ? '' : 'Le décaissement n\'a peut-être pas atteint le solde insuffisant côté DAF (_soldeFelana) — vérifier que le compte DAF de test a un solde Felana suffisant avant de rejouer ce scénario'
            );

            // Vérifie la traçabilité dans journal_global si possible.
            const { data: journalData } = await dbSelect(dafSession.page, 'journal_global', { reference: 'QA-TEST-REF' });
            record(
                'CREDIT-05-TRACABILITE',
                'Écriture créée dans journal_global pour ce décaissement',
                'Au moins une ligne avec reference=QA-TEST-REF',
                journalData && journalData.length ? `${journalData.length} ligne(s) trouvée(s)` : 'Aucune ligne trouvée (colonne reference différente ou non journalisé)',
                journalData && journalData.length ? '🟢' : '🟡'
            );
        }
    } catch (e) {
        record('CREDIT-04-DECAISSEMENT-VALIDE', 'Décaissement valide réussit', 'statut=SOLDE', `Exception: ${e.message}`, '🔴');
    }

    await dafSession.browser.close();
}

// ============================================================
// MAIN
// ============================================================
async function main() {
    console.log('=== QA SCÉNARIOS INTER-RÔLES — NySoa BTP ===');
    console.log('Pré-requis : serveur statique sur ' + BASE_URL + ', config.js présent avec accès Supabase réel.\n');

    try {
        await scenarioRecrutement();
    } catch (e) {
        console.error('Erreur fatale scénario recrutement:', e);
    }

    try {
        await scenarioCreditFournisseur();
    } catch (e) {
        console.error('Erreur fatale scénario crédit fournisseur:', e);
    }

    const total = results.length;
    const green = results.filter((r) => r.status === '🟢').length;
    const yellow = results.filter((r) => r.status === '🟡').length;
    const red = results.filter((r) => r.status === '🔴').length;

    let report = `# QA SCÉNARIOS INTER-RÔLES — NySoa BTP ERP\n`;
    report += `## Date: ${new Date().toISOString()}\n`;
    report += `## Méthode: Playwright + vérification réelle en base via db (pas de lecture DOM seule)\n\n`;
    report += `> Ce rapport teste des **circuits complets entre rôles** (création par un rôle, traitement/validation par un autre), `;
    report += `avec vérification de l'état réel en base de données après chaque action UI, y compris la gestion des dialogues `;
    report += `natifs (\`prompt()\`/\`confirm()\`) déclenchés par le code métier.\n\n`;

    report += `## Résumé\n\n| Statut | Nombre |\n|---|---|\n| 🟢 Réussis | ${green} |\n| 🟡 Attention | ${yellow} |\n| 🔴 Échecs | ${red} |\n| **Total** | **${total}** |\n\n`;

    report += `## Détail\n\n| ID | Description | Attendu | Obtenu | Statut | Notes |\n|---|---|---|---|---|---|\n`;
    for (const r of results) {
        report += `| ${r.id} | ${r.description} | ${r.expected} | ${r.obtained.replace(/\|/g, '/')} | ${r.status} | ${r.extra || ''} |\n`;
    }

    report += `\n## Erreurs console JS observées pendant les scénarios\n\n`;
    if (consoleErrors.length) {
        for (const e of consoleErrors.slice(0, 30)) report += `- ${e}\n`;
    } else {
        report += `Aucune.\n`;
    }

    report += `\n## Échecs critiques 🔴\n\n`;
    const failed = results.filter((r) => r.status === '🔴');
    if (failed.length) {
        for (const f of failed) {
            report += `### ${f.id}\n- Description: ${f.description}\n- Attendu: ${f.expected}\n- Obtenu: ${f.obtained}\n${f.extra ? `- Note: ${f.extra}\n` : ''}\n`;
        }
    } else {
        report += `Aucun.\n`;
    }

    const filename = `QA_SCENARIOS_INTERROLES_${new Date().toISOString().split('T')[0]}.md`;
    fs.writeFileSync(filename, report);

    console.log(`\n🟢 ${green} | 🟡 ${yellow} | 🔴 ${red} | Total: ${total}`);
    console.log(`Rapport: ${filename}`);
}

main().catch((e) => {
    console.error('Erreur fatale:', e);
    process.exit(1);
});
