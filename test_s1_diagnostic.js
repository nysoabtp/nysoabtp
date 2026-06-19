/**
 * S1-01 Diagnostic Test — DAF Insert into journal_global
 * Captures detailed Supabase error response
 */

const SUPABASE_URL = 'https://djncsybvloyyesllfxhq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDI1OTksImV4cCI6MjA5MzMxODU5OX0.o4MOSg6axYoNdl0XgidLi0eNukR-KwnKvecZxchkcP8';

const ACCOUNTS = {
    daf:  { email: 'daf@nysoa.mg', password: 'daf123' },
    admin: { email: 'admin@nysoa.mg', password: 'admin123' }
};

async function apiLogin(email, pass) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ email, password: pass })
    });
    const data = await r.json().catch(() => null);
    return data?.access_token || null;
}

async function dbQuery(table, filters, token) {
    const params = new URLSearchParams({ select: '*' });
    for (const [k, v] of Object.entries(filters || {}))
        params.append(k, `eq.${v}`);
    const headers = { apikey: ANON_KEY, Authorization: `Bearer ${token || ANON_KEY}` };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, { headers });
    
    let errorDetail = null;
    if (!res.ok) {
        try {
            const errorBody = await res.json();
            errorDetail = {
                message: errorBody.message,
                details: errorBody.details,
                hint: errorBody.hint,
                code: errorBody.code,
                status: res.status
            };
        } catch (_) {
            errorDetail = { status: res.status, raw: await res.text() };
        }
    }
    
    const data = await res.json().catch(() => null);
    return { data, error: errorDetail };
}

async function dbInsert(table, payload, token) {
    const headers = {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token || ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
    
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
    });
    
    let errorDetail = null;
    let data = null;
    
    if (res.ok) {
        data = await res.json().catch(() => null);
    } else {
        try {
            const errorBody = await res.json();
            errorDetail = {
                message: errorBody.message,
                details: errorBody.details,
                hint: errorBody.hint,
                code: errorBody.code,
                status: res.status
            };
        } catch (_) {
            errorDetail = { status: res.status, raw: await res.text() };
        }
    }
    
    return { data, error: errorDetail };
}

async function main() {
    console.log('════════════════════════════════════════════');
    console.log('S1-01 Diagnostic — DAF Insert into journal_global');
    console.log('════════════════════════════════════════════\n');
    
    const today = new Date().toISOString().split('T')[0];
    const marqueur = `QA-S1-DIAG-${Date.now()}`;
    const payload = {
        type_ecriture: 'depense_daf',
        date_ecriture: today,
        montant: 50000,
        designation: marqueur,
        chantier_id: null,
        categorie: 'test',
        mode_paiement: 'virement',
        saisi_par: 'DAF',
        visible_daf: true,
        statut: 'VALIDE'
    };
    
    // Test 1: Admin inserts into journal_global (should work)
    console.log('--- Test 1: Admin INSERT into journal_global ---');
    const adminToken = await apiLogin(ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    console.log('Admin token obtained:', adminToken ? 'YES' : 'NO');
    
    const adminInsert = await dbInsert('journal_global', payload, adminToken);
    if (adminInsert.error) {
        console.error('ADMIN INSERT FAILED:', JSON.stringify(adminInsert.error, null, 2));
    } else {
        console.log('ADMIN INSERT SUCCESS:', JSON.stringify(adminInsert.data, null, 2));
    }
    
    // Test 2: DAF inserts into journal_global (the actual test)
    console.log('\n--- Test 2: DAF INSERT into journal_global ---');
    const dafToken = await apiLogin(ACCOUNTS.daf.email, ACCOUNTS.daf.password);
    console.log('DAF token obtained:', dafToken ? 'YES' : 'NO');
    
    const dafInsert = await dbInsert('journal_global', payload, dafToken);
    if (dafInsert.error) {
        console.error('DAF INSERT FAILED:', JSON.stringify(dafInsert.error, null, 2));
        console.log('\n=== ERROR SUMMARY ===');
        console.log('Code:', dafInsert.error.code);
        console.log('Message:', dafInsert.error.message);
        console.log('Details:', dafInsert.error.details);
        console.log('Hint:', dafInsert.error.hint);
        console.log('Status:', dafInsert.error.status);
    } else {
        console.log('DAF INSERT SUCCESS:', JSON.stringify(dafInsert.data, null, 2));
    }
    
    // Test 3: Check journal_global columns
    console.log('\n--- Test 3: Check journal_global schema ---');
    const schemaResult = await fetch(`${SUPABASE_URL}/rest/v1/?ref=journal_global`, {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` }
    });
    console.log('Schema query status:', schemaResult.status);
    
    // Test 4: Query existing data as DAF
    console.log('\n--- Test 4: DAF SELECT from journal_global ---');
    const dafSelect = await dbQuery('journal_global', {}, dafToken);
    if (dafSelect.error) {
        console.error('DAF SELECT FAILED:', JSON.stringify(dafSelect.error, null, 2));
    } else {
        console.log('DAF SELECT SUCCESS, rows:', dafSelect.data?.length || 0);
    }
    
    // Cleanup
    console.log('\n--- Cleanup ---');
    if (adminInsert.data && adminInsert.data[0]) {
        const id = adminInsert.data[0].id;
        const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/journal_global?id=eq.${id}`, {
            method: 'DELETE',
            headers: { apikey: ANON_KEY, Authorization: `Bearer ${adminToken}` }
        });
        console.log(`Deleted test row id=${id}, status=${deleteRes.status}`);
    }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
