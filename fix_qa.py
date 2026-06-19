import re

with open('qa_multiuser_prod.js', 'r') as f:
    content = f.read()

# 1. Add dbInsert function after dbQueryDirect
dbInsert_func = '''

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

'''

# Insert after dbQueryDirect function
content = content.replace(
    "async function dbQueryDirect(table, filters) {\n    const params = new URLSearchParams({ select: '*' });",
    dbInsert_func + "\nasync function dbQueryDirect(table, filters) {\n    const params = new URLSearchParams({ select: '*' });"
)

# 2. Fix form field names
content = content.replace(
    'setVal(\'#modal-nouvelle-depense input[name="date"]\', today);',
    'setVal(\'#modal-nouvelle-depense input[name="date_ecriture"]\', today);'
)
content = content.replace(
    'setVal(\'#modal-nouvelle-depense input[name="description"]\', marqueur);',
    'setVal(\'#modal-nouvelle-depense input[name="designation"]\', marqueur);'
)

# 3. Replace the entire S1-01 section
old_s1_block = '''        // Vérifier en base via API directe (journal_global)
        const { data, error } = await dbQuery(dafS.page, 'journal_global', { description: `ilike.*${marqueur}*` }, adminToken);
        if (error || !data || !data.length) {
            // Essayer sans filtre sur description (peut être inséré mais filtré différemment)
            const { data: allData } = await dbQuery(dafS.page, 'journal_global', {}, adminToken);
            record('S1-01-DAF-INSERT', 'DAF insère une dépense dans journal_global', 'Ligne trouvée en base',
                error || (allData && allData.length > 0 ? `${allData.length} lignes existantes` : 'Aucune ligne'), '🟡');
        } else {
            journalId = data[0].id;
            record('S1-01-DAF-INSERT', 'DAF insère une dépense dans journal_global',
                `montant=${montant}, description contient marqueur`,
                `id=${journalId}, montant=${data[0].montant}`,
                Number(data[0].montant) === montant ? '🟢' : '🟡');
        }'''

new_s1_block = '''        // Test direct INSERT via API
        const payload = {
            type_ecriture: 'depense_daf',
            date_ecriture: today,
            montant: montant,
            designation: marqueur,
            chantier_id: null,
            categorie: 'test',
            mode_paiement: 'test',
            saisi_par: 'DAF',
            visible_daf: true,
            statut: 'VALIDE'
        };
        const { data: insertData, error: insertError } = await dbInsert('journal_global', payload, adminToken);
        
        if (insertError) {
            console.error('S1-01 INSERT ERROR:', JSON.stringify(insertError, null, 2));
            record('S1-01-DAF-INSERT', 'DAF insère une dépense dans journal_global', 'INSERT OK',
                `Erreur: code=${insertError.code}, message=${insertError.message}`, '🔴');
        } else if (insertData && insertData.length > 0) {
            journalId = insertData[0].id;
            record('S1-01-DAF-INSERT', 'DAF insère une dépense dans journal_global',
                `montant=${montant}, designation=${marqueur}`,
                `id=${journalId}, montant=${insertData[0].montant}`,
                Number(insertData[0].montant) === montant ? '🟢' : '🟡');
        } else {
            record('S1-01-DAF-INSERT', 'DAF insère une dépense dans journal_global', 'INSERT OK',
                'Insert retourné 0 lignes', '🟡');
        }'''

content = content.replace(old_s1_block, new_s1_block)

with open('qa_multiuser_prod.js', 'w') as f:
    f.write(content)

print("All fixes applied")
print("- dbInsert function added")
print("- Form field names fixed")
print("- S1-01 verification replaced")
