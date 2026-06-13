const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log("=== TEST DAF DASHBOARD DEBUG ===\n");

    // Listen to console messages
    page.on('console', msg => {
        const text = msg.text();
        if (msg.type() === 'error') {
            console.log(`[CONSOLE ERROR]: ${text}`);
        } else if (text.includes('journal_global') || text.includes('Supabase') || text.includes('error') || text.includes('Error')) {
            console.log(`[CONSOLE ${msg.type()}]: ${text}`);
        }
    });

    // Listen to page errors
    page.on('pageerror', error => {
        console.log(`[PAGE ERROR]: ${error.message}`);
    });

    try {
        // 1. Login as DAF
        console.log("1. Logging in as DAF...");
        await page.goto('https://nysoabtp.github.io/nysoabtp/login.html');
        await page.fill('input[type="email"]', 'daf@nysoa.mg');
        await page.fill('input[type="password"]', 'daf123');
        await page.click('button[type="submit"]');
        
        // Wait for redirect to daf.html
        await page.waitForURL('**/daf.html', { timeout: 15000 });
        console.log("   ✓ Logged in, on daf.html");

        // 2. Wait for data to load
        console.log("\n2. Waiting for data to load (8 seconds)...");
        await page.waitForTimeout(8000);

        // 3. Check the actual KPIs using the real element IDs
        console.log("\n3. Checking actual KPI elements...");
        const kpiSelectors = [
            { id: 'db-solde-felana', name: 'Solde Felana' },
            { id: 'db-total-dotations', name: 'Total Dotations' },
            { id: 'db-total-depenses', name: 'Total Dépenses' },
            { id: 'db-depenses-mois', name: 'Dépenses mois' },
            { id: 'db-credits-attente', name: 'Crédits attente' },
            { id: 'db-dotation-last', name: 'Dernière dotation' },
            { id: 'db-nb-chantiers', name: 'Nb chantiers' }
        ];

        for (const kpi of kpiSelectors) {
            const el = await page.$(`#${kpi.id}`);
            if (el) {
                const text = await el.textContent();
                console.log(`   ${kpi.name}: "${text.trim()}"`);
            } else {
                console.log(`   ${kpi.name}: NOT FOUND (#${kpi.id})`);
            }
        }

        // 4. Check Felana budget section
        console.log("\n4. Checking Felana Budget...");
        const felanaSolde = await page.$('#felana-solde');
        if (felanaSolde) {
            console.log(`   Felana Solde: "${await felanaSolde.textContent()}"`);
        } else {
            console.log("   Felana Solde: NOT FOUND");
        }

        // 5. Check Budget Felana section
        console.log("\n5. Checking Budget Felana section...");
        const felanaSections = ['#felana-solde-dispo', '#felana-dotations', '#felana-depenses', '#felana-taux'];
        for (const id of felanaSections) {
            const el = await page.$(id);
            if (el) {
                console.log(`   ${id}: "${await el.textContent()}"`);
            } else {
                console.log(`   ${id}: NOT FOUND`);
            }
        }

        // 6. Try to query Supabase directly in the page context
        console.log("\n6. Testing Supabase query directly in page...");
        const result = await page.evaluate(async () => {
            try {
                // Wait for Supabase client to be ready
                if (typeof db === 'undefined') {
                    return { error: 'db is not defined' };
                }
                const { data, error } = await db.from('journal_global').select('*').limit(10);
                return { 
                    count: data?.length || 0, 
                    error: error?.message || null, 
                    sample: data?.slice(0, 2).map(r => ({id: r.id, type: r.type_ecriture, montant: r.montant}))
                };
            } catch (e) {
                return { error: e.message };
            }
        });
        console.log(`   Query result:`, JSON.stringify(result, null, 2));

        // 7. Check if calculateSoldeFelana was called
        console.log("\n7. Calling calculerSoldeFelana directly...");
        const felanaResult = await page.evaluate(async () => {
            try {
                if (typeof calculerSoldeFelana !== 'function') {
                    // List all functions containing 'felana' or 'Solde'
                    const allFunctions = Object.keys(window).filter(k => 
                        typeof window[k] === 'function' && 
                        (k.toLowerCase().includes('felana') || k.toLowerCase().includes('solde'))
                    );
                    return { 
                        error: 'calculerSoldeFelana is not a function', 
                        availableFunctions: allFunctions,
                        hasLoadChantiersSelects: typeof loadChantiersSelects === 'function',
                        hasLoadDashboard: typeof loadDashboard === 'function',
                        hasLoadDepensesDAF: typeof loadDepensesDAF === 'function'
                    };
                }
                const result = await calculerSoldeFelana();
                return result;
            } catch (e) {
                return { error: e.message };
            }
        });
        console.log(`   Result:`, JSON.stringify(felanaResult, null, 2));

    } catch (error) {
        console.error("\nERROR:", error.message);
    }

    console.log("\n=== TEST COMPLETE (Closing in 5 seconds) ===");
    await page.waitForTimeout(5000);
    await browser.close();
})();