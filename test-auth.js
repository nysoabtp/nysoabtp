const { chromium } = require('playwright');

(async () => {
  // Lancement du navigateur en mode visible (headless: false) pour voir ce qui se passe
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();


  console.log("=== DÉBUT DU TEST DE CONNEXION ===");


  // Écoute active de la console pour capturer l'erreur "InvalidJWTToken"
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[CONSOLE ERROR] : ${msg.text()}`);
      if (msg.text().includes('InvalidJWTToken')) {
        console.error('❌ ERREUR DÉTECTÉE : Le token JWT est invalide ou expiré !');
      }
    }
  });


  try {
    // 1. Navigation directe vers la page d'administration
    console.log("Navigation vers la page d'administration...");
    await page.goto('https://nysoabtp.github.io/nysoabtp/admin.html');


    // NOTE : Si votre application redirige automatiquement vers le login, 
    // décommentez et adaptez les lignes ci-dessous pour remplir les champs.
    /*
    console.log("Tentative de connexion...");
    await page.fill('input[type="email"]', 'votre-email@domaine.com');
    await page.fill('input[type="password"]', 'votre-mot-de-passe');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin.html');
    */


    // 2. Attendre que la page charge et observer les requêtes Supabase (WebSockets)
    await page.waitForTimeout(5000);


    // 3. Tenter de cliquer sur un onglet sensible du DAF (ex: Budgets & Dotations)
    console.log("Tentative de navigation vers l'onglet Budgets & Dotations...");
    const budgetTab = page.locator('text=Budgets & Dotations');
    if (await budgetTab.isVisible()) {
      await budgetTab.click();
      await page.waitForTimeout(3000);
      console.log("✅ Clic sur Budgets réussi.");
    } else {
      console.log("⚠️ Menu 'Budgets & Dotations' non visible (l'interface est peut-être déjà bloquée).");
    }


  } catch (error) {
    console.error("Une erreur est survenue pendant le test :", error);
  }


  console.log("=== FIN DU TEST (Fermeture dans 10 secondes) ===");
  await page.waitForTimeout(10000);
  await browser.close();
})();
