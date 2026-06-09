// ============================================================
// NYSOA BTP — create_chef.js
// Crée un compte chef dans auth.users + chantier si nécessaire
// Usage : node create_chef.js <email> <password> "<chantier>"
// Ex.   : node create_chef.js chef.trano@nysoa.mg chef123 "TRANO CHEF"
//
// Prérequis : définir SUPABASE_SERVICE_ROLE dans variables d'env
//   $env:SUPABASE_SERVICE_ROLE = "votre_service_role_key"
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://djncsybvloyyesllfxhq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;
if (!SERVICE_ROLE_KEY) {
    console.error('Erreur : variable SUPABASE_SERVICE_ROLE non définie');
    console.error('  $env:SUPABASE_SERVICE_ROLE = "votre_clé_service_role"');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createChef(email, password, chantier) {
    // 1. Créer l'utilisateur dans auth.users
    console.log(`Création chef : ${email} → ${chantier}`);
    const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { role: 'chef', chantier }
    });
    if (error) {
        console.error(`✗ Erreur création ${email} : ${error.message}`);
        return false;
    }
    console.log(`  ✓ Auth user créé : ${data.user?.id}`);

    // 2. Créer le chantier s'il n'existe pas
    const { data: existing } = await db.from('chantiers').select('id').eq('nom', chantier).limit(1);
    if (!existing || existing.length === 0) {
        const code = 'CH-' + Date.now().toString(36).toUpperCase();
        const { error: err2 } = await db.from('chantiers').insert({
            nom: chantier,
            code: code,
            statut: 'EN COURS',
            actif: true
        });
        if (err2) {
            console.warn(`  ⚠ Chantier non créé : ${err2.message}`);
        } else {
            console.log(`  ✓ Chantier créé : ${chantier} (${code})`);
        }
    } else {
        console.log(`  ✓ Chantier existe déjà : ${chantier}`);
    }
    return true;
}

// ── CLI ───────────────────────────────────────────────────────
const [email, password, ...chantierParts] = process.argv.slice(2);
if (!email || !password || chantierParts.length === 0) {
    console.log('Usage: node create_chef.js <email> <password> "<chantier>"');
    console.log('  $env:SUPABASE_SERVICE_ROLE = "..."');
    process.exit(1);
}

createChef(email, password, chantierParts.join(' '))
    .then(ok => process.exit(ok ? 0 : 1))
    .catch(err => { console.error(err); process.exit(1); });
