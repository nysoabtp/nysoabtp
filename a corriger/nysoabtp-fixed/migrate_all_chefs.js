// ============================================================
// NYSOA BTP — migrate_all_chefs.js
// Migre les 24 comptes chef du fallback hardcodé → auth.users
//
// Usage : node migrate_all_chefs.js
// Prérequis : $env:SUPABASE_SERVICE_ROLE = "..."
// ============================================================
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://djncsybvloyyesllfxhq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;
if (!SERVICE_ROLE_KEY) {
    console.error('Erreur : variable SUPABASE_SERVICE_ROLE non définie');
    process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Tous les chefs du fallback avec leur chantier
const CHEFS = [
    { email: 'chef@nysoa.mg',                chantier: 'TRANO CHEF AMBATOMAINTY' },
    { email: 'chef.trano-chef@nysoa.mg',     chantier: 'TRANO CHEF' },
    { email: 'chef.ambatomainty@nysoa.mg',   chantier: 'AMBATOMAINTY' },
    { email: 'chef.aina-et-domoina@nysoa.mg',chantier: 'AINA & DOMOINA' },
    { email: 'chef.vahatra@nysoa.mg',        chantier: 'VAHATRA' },
    { email: 'chef.gastro-ambohimena@nysoa.mg', chantier: 'GASTRO AMBOHIMENA' },
    { email: 'chef.bricotech-magasin@nysoa.mg', chantier: 'BRICOTECH MAGASIN' },
    { email: 'chef.depot@nysoa.mg',          chantier: 'DEPOT' },
    { email: 'chef.residence-les-palmiers@nysoa.mg', chantier: 'Residence Les Palmiers' },
    { email: 'chef.centre-commercial@nysoa.mg', chantier: 'Centre Commercial' },
    { email: 'chef.bureau-ecobank@nysoa.mg', chantier: 'Bureau Ecobank' },
    { email: 'chef.nysoa@nysoa.mg',          chantier: 'NYSOA' },
    { email: 'chef.mandaniresaka@nysoa.mg',  chantier: 'MANDANIRESAKA' },
    { email: 'chef.autres@nysoa.mg',         chantier: 'AUTRES' },
    { email: 'chef.ampefy@nysoa.mg',         chantier: 'AMPEFY' },
    { email: 'chef.visy-gasy@nysoa.mg',     chantier: 'VISY GASY' },
    { email: 'chef.ambohimanabe@nysoa.mg',  chantier: 'AMBOHIMANABE' },
    { email: 'chef.homeopharma@nysoa.mg',   chantier: 'HOMEOPHARMA' },
    { email: 'chef.autoblocants@nysoa.mg',  chantier: 'AUTOBLOCANTS' },
    { email: 'chef.volavita@nysoa.mg',      chantier: 'VOLAVITA' },
    { email: 'chef.gastro-tulear@nysoa.mg', chantier: 'GASTRO TULEAR' },
    { email: 'chef.fianara@nysoa.mg',       chantier: 'FIANARA' },
    { email: 'chef.mahazoarivo@nysoa.mg',   chantier: 'MAHAZOARIVO' },
    { email: 'chef.tombontsoa@nysoa.mg',    chantier: 'TOMBONTSOA' },
];

async function migrateAll() {
    let success = 0, failed = 0;

    // Phase 1 : créer tous les chantiers manquants
    console.log('═══ Phase 1 : Création des chantiers ═══');
    const chantiersUniques = [...new Set(CHEFS.map(c => c.chantier))];
    for (const nom of chantiersUniques) {
        const { data: existing } = await db.from('chantiers').select('id').eq('nom', nom).limit(1);
        if (!existing || existing.length === 0) {
            const code = 'CH-' + Date.now().toString(36).toUpperCase().slice(0, 6);
            const { error } = await db.from('chantiers').insert({ nom, code, statut: 'EN COURS', actif: true });
            if (error) console.warn(`  ⚠ ${nom} : ${error.message}`);
            else console.log(`  ✓ ${nom}`);
        } else {
            console.log(`  - ${nom} (existe déjà)`);
        }
    }

    // Phase 2 : créer les comptes auth
    console.log('\n═══ Phase 2 : Création des comptes auth ═══');
    for (const chef of CHEFS) {
        try {
            const { data, error } = await db.auth.admin.createUser({
                email: chef.email,
                password: 'chef123',
                email_confirm: true,
                user_metadata: { role: 'chef', chantier: chef.chantier }
            });
            if (error) {
                // Si déjà existant, ce n'est pas grave
                if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                    console.log(`  - ${chef.email} (existe déjà)`);
                } else {
                    throw error;
                }
            } else {
                console.log(`  ✓ ${chef.email} → ${chef.chantier}`);
                success++;
            }
        } catch (e) {
            console.error(`  ✗ ${chef.email} : ${e.message}`);
            failed++;
        }
    }

    console.log(`\n═══ Résultat : ${success} créés, ${failed} échecs, ${CHEFS.length - success - failed} déjà existants ═══`);
    process.exit(failed > 0 ? 1 : 0);
}

migrateAll();
