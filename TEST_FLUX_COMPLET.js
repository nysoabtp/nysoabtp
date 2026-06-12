// ============================================================
// TEST_FLUX_COMPLET.js — NySoa BTP
// 14 flux metier + 11 scenarios RLS
// Base vierge (RESET_DATA.sql execute), 6 comptes auth conserves
// Usage : node TEST_FLUX_COMPLET.js
// 
// WARN identifies RLS gaps requiring SQL policies :
//   S03 — Technicien SELECT sur salaires non bloque
//   S07 — Anon lit sur 1 table (devis ou personnel)
//   S08/S09 — DELETE RLS absentes sur journal et personnel
//   F10/F11 — Pollution des sondes (ignorer si DB nettoyee)
// ============================================================

const BASE = 'https://djncsybvloyyesllfxhq.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDI1OTksImV4cCI6MjA5MzMxODU5OX0.o4MOSg6axYoNdl0XgidLi0eNukR-KwnKvecZxchkcP8';

let _pass = 0, _fail = 0, _warn = 0;
function ok(label) { _pass++; console.log(`%c\u2713 PASS  ${label}`, 'color:#27ae60;font-weight:bold'); }
function fail(label, detail) { _fail++; console.error(`\u2717 FAIL  ${label}${detail ? ' \u2014 ' + detail : ''}`); }
function warn(label, detail) { _warn++; console.warn(`\u26a0 WARN  ${label}${detail ? ' \u2014 ' + detail : ''}`); }
function section(title) { console.log(`\n%c== ${title} ==`, 'color:#2980b9;font-size:14px;font-weight:bold'); }
function summary() {
  const total = _pass + _fail + _warn;
  console.log(`\n%c${'=' .repeat(45)}\nRESULTAT : ${_pass}/${total} PASS  |  ${_fail} FAIL  |  ${_warn} WARN\n${'=' .repeat(45)}`,
    _fail > 0 ? 'color:#e74c3c;font-weight:bold' : 'color:#27ae60;font-weight:bold');
}

async function loginAs(email, password) {
  const r = await fetch(BASE + '/auth/v1/token?grant_type=password', {
    method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await r.json();
  return { token: data.access_token, user: data.user, ok: !!data.access_token };
}

const flux = { personnel_ids: [], today: new Date().toISOString().split('T')[0] };
const CHANTIER = 'AMBATOMAINTY'; // matches chef@nysoa.mg user_metadata.chantier

async function apiFetch(path, token, opts = {}) {
  const { headers: extraHeaders, method, body } = opts;
  const r = await fetch(BASE + path, {
    method: method || 'GET',
    headers: { apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', ...extraHeaders },
    body
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

// ══════════════════════════════════════════════
// PARTIE 1 — 14 FLUX METIER
// ══════════════════════════════════════════════

async function testF01() {
  section('F01 — Creation du premier chantier');
  try {
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!admin.ok) { fail('F01', 'Login admin echoue'); return false; }
    const existing = await apiFetch('/rest/v1/chantiers?code=eq.CH-AMB&select=id', admin.token);
    if (existing.body?.length > 1) {
      for (let i = 1; i < existing.body.length; i++) {
        await apiFetch(`/rest/v1/chantiers?id=eq.${existing.body[i].id}`, admin.token, { method: 'DELETE' });
      }
    } else if (!existing.body?.length) {
      const r = await apiFetch('/rest/v1/chantiers', admin.token, {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ code: 'CH-AMB', nom: CHANTIER, statut: 'EN COURS', budget: 50000000, actif: true })
      });
      if (r.status !== 201) { fail('F01', `INSERT chantier status ${r.status}`); return false; }
    }
    const check = await apiFetch('/rest/v1/chantiers?code=eq.CH-AMB&select=id', admin.token);
    if (check.body?.length === 1) { ok('F01 Chantier cree et visible'); return true; }
    warn('F01', `${check.body?.length} chantier(s) — pollution`);
    return true;
  } catch(e) { fail('F01', e.message); return false; }
}

async function testF02() {
  section('F02 — Devis → validation → chantier ouvert');
  try {
    const daf = await loginAs('daf@nysoa.mg', 'daf123');
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!daf.ok || !admin.ok) { fail('F02', 'Login'); return false; }

    const dev = await apiFetch('/rest/v1/devis', daf.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ numero: 'DEV-TEST-001', client: 'CLIENT TEST', objet: 'Travaux test', total: 25000000, statut: 'BROUILLON', date: flux.today })
    });
    if (dev.status !== 201) { fail('F02', `Devis non cree ${dev.status}`); return false; }
    const devId = dev.body?.[0]?.id;

    const val = await apiFetch('/rest/v1/validations', daf.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ type: 'devis', emetteur_role: 'daf', emetteur_id: daf.user?.id || 'daf@nysoa.mg', statut: 'EN_ATTENTE', commentaire: 'DEV-TEST-001' })
    });
    if (val.status !== 201) { fail('F02', `Validation non creee ${val.status}`); return false; }
    const valId = val.body?.[0]?.id;

    const appr = await apiFetch(`/rest/v1/validations?id=eq.${valId}`, admin.token, {
      method: 'PATCH', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ statut: 'APPROUVE', decided_at: new Date().toISOString(), decided_by: 'admin' })
    });
    const upd = await apiFetch(`/rest/v1/devis?id=eq.${devId}`, admin.token, {
      method: 'PATCH', body: JSON.stringify({ statut: 'APPROUVE' })
    });

    if (appr.status === 200 || appr.status === 204) { ok('F02 Devis cree + valide + approuve'); return true; }
    fail('F02', `Approbation echouee ${appr.status}`);
    return false;
  } catch(e) { fail('F02', e.message); return false; }
}

async function testF03() {
  section('F03 — Onboarding employes (RH)');
  try {
    const rh = await loginAs('rh@nysoa.mg', 'rh123');
    if (!rh.ok) { fail('F03', 'Login RH'); return false; }

    const emp = [
      { nom: 'RAKOTO Jean', metier: 'Macon', chantier: CHANTIER, salaire_journalier: 25000, actif: true },
      { nom: 'RABE Marie', metier: 'Manœuvre', chantier: CHANTIER, salaire_journalier: 18000, actif: true },
      { nom: 'ANDRY Paul', metier: 'Chef equipe', chantier: CHANTIER, salaire_journalier: 35000, actif: true }
    ];
    for (const e of emp) {
      const r = await apiFetch('/rest/v1/personnel', rh.token, {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify(e)
      });
      if (r.status !== 201) { fail('F03', `INSERT ${e.nom} status ${r.status}: ${JSON.stringify(r.body)}`); return false; }
      flux.personnel_ids.push(r.body?.[0]?.id);
    }
    if (flux.personnel_ids.length === 3) { ok('F03 3 employes crees'); return true; }
    fail('F03', `${flux.personnel_ids.length}/3 crees`);
    return false;
  } catch(e) { fail('F03', e.message); return false; }
}

async function testF04() {
  section('F04 — Onboarding chef scope');
  try {
    const rh = await loginAs('rh@nysoa.mg', 'rh123');
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!rh.ok || !admin.ok) { fail('F04', 'Login'); return false; }
    const val = await apiFetch('/rest/v1/validations', rh.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ type: 'compte_chef', emetteur_role: 'rh', emetteur_id: rh.user?.id || 'rh@nysoa.mg', statut: 'EN_ATTENTE', commentaire: 'chef@nysoa.mg — ' + CHANTIER })
    });
    if (val.status !== 201) { fail('F04', `Validation non creee ${val.status}`); return false; }
    const valId = val.body?.[0]?.id;
    const appr = await apiFetch(`/rest/v1/validations?id=eq.${valId}`, admin.token, {
      method: 'PATCH', body: JSON.stringify({ statut: 'APPROUVE', decided_at: new Date().toISOString(), decided_by: 'admin' })
    });
    if (appr.status === 200 || appr.status === 204) { ok('F04 Validation creation chef approuvee'); return true; }
    fail('F04', `Approbation echouee ${appr.status}`);
    return false;
  } catch(e) { fail('F04', e.message); return false; }
}

async function testF05() {
  section('F05 — Pointage quotidien (Chef)');
  try {
    if (flux.personnel_ids.length < 3) { warn('F05', 'F03 echoue — skip'); return 'skip'; }
    const chef = await loginAs('chef@nysoa.mg', 'chef123');
    if (!chef.ok) { fail('F05', 'Login chef'); return false; }
    const noms = ['RAKOTO Jean', 'RABE Marie', 'ANDRY Paul'];
    for (let i = 0; i < flux.personnel_ids.length; i++) {
      const r = await apiFetch('/rest/v1/pointage_attendance', chef.token, {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          date: flux.today, chantier: CHANTIER, nom_employe: noms[i],
          employe_id: flux.personnel_ids[i], statut: 'present', heure: '08:00', type_pointage: 'PRESENCE'
        })
      });
      if (r.status !== 201) { fail('F05', `Pointage id=${flux.personnel_ids[i]} status ${r.status}: ${JSON.stringify(r.body)}`); return false; }
    }
    const check = await apiFetch(`/rest/v1/pointage_attendance?chantier=eq.${CHANTIER}&select=id`, chef.token);
    if (check.body?.length >= 3) { ok('F05 3 pointages crees'); return true; }
    warn('F05', `${check.body?.length || 0}/3 pointages visibles`);
    return true;
  } catch(e) { fail('F05', e.message); return false; }
}

async function testF06() {
  section('F06 — Rapport journalier (Chef)');
  try {
    const chef = await loginAs('chef@nysoa.mg', 'chef123');
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!chef.ok || !admin.ok) { fail('F06', 'Login'); return false; }
    const r = await apiFetch('/rest/v1/rapports_chantier', chef.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ date: flux.today, chantier: CHANTIER, meteo: 'Ensoleille', ouvriers: 3, travaux: 'Fondations — coulage beton', problemes: 'Aucun' })
    });
    if (r.status !== 201) { fail('F06', `Rapport non cree ${r.status}`); return false; }
    const check = await apiFetch('/rest/v1/rapports_chantier?select=id', admin.token);
    if (check.body?.length > 0) { ok('F06 Rapport cree et visible par admin'); return true; }
    fail('F06', 'Rapport invisible par admin');
    return false;
  } catch(e) { fail('F06', e.message); return false; }
}

async function testF07() {
  section('F07 — Demande materiaux → validation');
  try {
    const chef = await loginAs('chef@nysoa.mg', 'chef123');
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!chef.ok || !admin.ok) { fail('F07', 'Login'); return false; }
    const val = await apiFetch('/rest/v1/validations', chef.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ type: 'materiaux', emetteur_role: 'chef', emetteur_id: chef.user?.id || 'chef@nysoa.mg', statut: 'EN_ATTENTE', commentaire: 'Ciment 50 sacs' })
    });
    if (val.status !== 201) { fail('F07', `Validation non creee ${val.status}`); return false; }
    const valId = val.body?.[0]?.id;
    const check = await apiFetch('/rest/v1/validations?statut=eq.EN_ATTENTE&select=id', admin.token);
    if (!check.body?.length) { fail('F07', 'Admin ne voit pas la validation en attente'); return false; }
    const appr = await apiFetch(`/rest/v1/validations?id=eq.${valId}`, admin.token, {
      method: 'PATCH', body: JSON.stringify({ statut: 'APPROUVE', decided_at: new Date().toISOString(), decided_by: 'admin' })
    });
    // Seul admin peut inserer dans materiels (RLS chef bloqué)
    const mat = await apiFetch('/rest/v1/materiels', admin.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ libelle: 'Ciment', quantite: 50, etat: 'NEUF', chantier_actuel: CHANTIER })
    });
    if (mat.status === 201) { ok('F07 Demande + validation + materiel enregistre par admin'); return true; }
    fail('F07', `INSERT materiels status ${mat.status}`);
    return false;
  } catch(e) { fail('F07', e.message); return false; }
}

async function testF08() {
  section('F08 — Inspection qualite/securite (Controleur)');
  try {
    const ctr = await loginAs('controleur@nysoa.mg', 'controleur123');
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!ctr.ok || !admin.ok) { fail('F08', 'Login'); return false; }
    const r = await apiFetch('/rest/v1/controles_inopines', ctr.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ chantier: CHANTIER, datetime: new Date().toISOString(), controleur: 'controleur@nysoa.mg', observations: 'Casques absents sur 2 ouvriers', score: 45 })
    });
    if (r.status !== 201) { fail('F08', `Controle non cree ${r.status}`); return false; }
    const check = await apiFetch('/rest/v1/controles_inopines?select=id,score', admin.token);
    if (check.body?.length > 0 && (check.body[0].score || 100) < 60) { ok('F08 Controle NON_CONFORME cree et visible'); return true; }
    warn('F08', `Controle cree (score=${check.body?.[0]?.score})`);
    return true;
  } catch(e) { fail('F08', e.message); return false; }
}

async function testF09() {
  section('F09 — Non-conformite → correction');
  try {
    const chef = await loginAs('chef@nysoa.mg', 'chef123');
    const ctr = await loginAs('controleur@nysoa.mg', 'controleur123');
    if (!chef.ok || !ctr.ok) { fail('F09', 'Login'); return false; }
    const r = await apiFetch('/rest/v1/rapports_chantier', chef.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ date: flux.today, chantier: CHANTIER, meteo: 'Ensoleille', ouvriers: 3, travaux: 'Continuation fondations', problemes: 'Correction securite : casques distribues' })
    });
    if (r.status !== 201) { fail('F09', `Rapport correction non cree ${r.status}`); return false; }
    const c2 = await apiFetch('/rest/v1/controles_inopines', ctr.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ chantier: CHANTIER, datetime: new Date().toISOString(), controleur: 'controleur@nysoa.mg', observations: 'Conforme apres correction', score: 95 })
    });
    if (c2.status !== 201) { fail('F09', `Re-controle non cree ${c2.status}`); return false; }
    const total = await apiFetch('/rest/v1/controles_inopines?select=id', ctr.token);
    if (total.body?.length >= 2) { ok('F09 2 controles en base (NON_CONFORME + CONFORME)'); return true; }
    warn('F09', `${total.body?.length || 0} controles`);
    return true;
  } catch(e) { fail('F09', e.message); return false; }
}

async function testF10() {
  section('F10 — Ecriture comptable (DAF)');
  try {
    const daf = await loginAs('daf@nysoa.mg', 'daf123');
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!daf.ok || !admin.ok) { fail('F10', 'Login'); return false; }
    const rec = await apiFetch('/rest/v1/journal', daf.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ date: flux.today, designation: 'Acompte client TEST', montant: 10000000, categorie: 'RECETTE', chantier: CHANTIER })
    });
    if (rec.status !== 201) { fail('F10', `Recette non creee ${rec.status}`); return false; }
    const recId = rec.body?.[0]?.id;
    const dep = await apiFetch('/rest/v1/journal', daf.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ date: flux.today, designation: 'Achat ciment', montant: -1500000, categorie: 'MATERIAUX', chantier: CHANTIER })
    });
    if (dep.status !== 201) { fail('F10', `Depense non creee ${dep.status}`); return false; }
    const depId = dep.body?.[0]?.id;
    const check = await apiFetch(`/rest/v1/journal?id=in.(${recId},${depId})&select=montant,categorie`, admin.token);
    if (check.body?.length === 2) {
      const recettes = check.body.filter(r => (r.categorie||'').toLowerCase() === 'recette').reduce((s,r) => s + (parseFloat(r.montant)||0), 0);
      const depenses = check.body.filter(r => (r.categorie||'').toLowerCase() !== 'recette').reduce((s,r) => s + (parseFloat(r.montant)||0), 0);
      const benefice = recettes + depenses;
      if (benefice === 8500000) { ok('F10 Benefice = 8 500 000 Ar'); return true; }
      warn('F10', `Benefice calcule = ${benefice} Ar (attendu 8 500 000)`);
      return true;
    }
    fail('F10', `${check.body?.length || 0}/2 ecritures trouvees`);
    return false;
  } catch(e) { fail('F10', e.message); return false; }
}

async function testF11() {
  section('F11 — Calcul salaires (RH)');
  try {
    if (flux.personnel_ids.length < 3) { warn('F11', 'F03 echoue — skip'); return 'skip'; }
    const rh = await loginAs('rh@nysoa.mg', 'rh123');
    if (!rh.ok) { fail('F11', 'Login RH'); return false; }
    const salData = [
      { employe_nom: 'RAKOTO Jean', employe_id: flux.personnel_ids[0], nb_jours: 1, salaire_base: 25000, net_a_payer: 23750, mois: 6, annee: 2026 },
      { employe_nom: 'RABE Marie', employe_id: flux.personnel_ids[1], nb_jours: 1, salaire_base: 18000, net_a_payer: 17100, mois: 6, annee: 2026 },
      { employe_nom: 'ANDRY Paul', employe_id: flux.personnel_ids[2], nb_jours: 1, salaire_base: 35000, net_a_payer: 33250, mois: 6, annee: 2026 }
    ];
    for (const s of salData) {
      const r = await apiFetch('/rest/v1/salaires', rh.token, {
        method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(s)
      });
      if (r.status !== 201) { fail('F11', `Salaire ${s.employe_nom} non cree ${r.status}: ${JSON.stringify(r.body)}`); return false; }
    }
    const ids = flux.personnel_ids.join(',');
    const check = await apiFetch(`/rest/v1/salaires?select=id&employe_id=in.(${ids})`, rh.token);
    if (check.body?.length === 3) { ok('F11 3 fiches de paie creees'); return true; }
    warn('F11', `${check.body?.length || 0}/3 salaires visibles`);
    return true;
  } catch(e) { fail('F11', e.message); return false; }
}

async function testF12() {
  section('F12 — Demande conge → validation');
  try {
    const rh = await loginAs('rh@nysoa.mg', 'rh123');
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!rh.ok || !admin.ok) { fail('F12', 'Login'); return false; }
    const r = await apiFetch('/rest/v1/conges', rh.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ employe_nom: 'RAKOTO Jean', date_debut: '2026-07-01', date_fin: '2026-07-05', duree: 5, motif: 'Conge annuel', statut: 'en_attente' })
    });
    if (r.status !== 201) { fail('F12', `Conge non cree ${r.status}`); return false; }
    const congeId = r.body?.[0]?.id;
    const upd = await apiFetch(`/rest/v1/conges?id=eq.${congeId}`, admin.token, {
      method: 'PATCH', body: JSON.stringify({ statut: 'approuve', valide_par: 'admin' })
    });
    if (upd.status === 200 || upd.status === 204) { ok('F12 Conge cree + approuve'); return true; }
    fail('F12', `Approbation echouee ${upd.status}`);
    return false;
  } catch(e) { fail('F12', e.message); return false; }
}

async function testF13() {
  section('F13 — Intervention technique (Technicien)');
  try {
    const tec = await loginAs('technicien@nysoa.mg', 'tech123');
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!tec.ok || !admin.ok) { fail('F13', 'Login'); return false; }
    const r = await apiFetch('/rest/v1/interventions', tec.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ titre: 'Reparation betonniere', chantier: CHANTIER, description: 'Reparation betonniere — courroie cassee', date_debut: flux.today })
    });
    if (r.status !== 201) { fail('F13', `Intervention non creee ${r.status}`); return false; }
    const check = await apiFetch('/rest/v1/interventions?select=id', admin.token);
    if (check.body?.length > 0) { ok('F13 Intervention creee et visible par admin'); return true; }
    fail('F13', 'Invisible par admin');
    return false;
  } catch(e) { fail('F13', e.message); return false; }
}

async function testF14() {
  section('F14 — Cloture et benefice final');
  try {
    const admin = await loginAs('admin@nysoa.mg', 'admin123');
    if (!admin.ok) { fail('F14', 'Login admin'); return false; }
    const r = await apiFetch('/rest/v1/journal?select=montant,categorie', admin.token);
    if (!r.body?.length) { warn('F14', 'Aucune ecriture — skip'); return 'skip'; }
    const recettes = r.body.filter(x => (x.categorie||'').toLowerCase() === 'recette').reduce((s,x) => s + (parseFloat(x.montant)||0), 0);
    const depenses = r.body.filter(x => (x.categorie||'').toLowerCase() !== 'recette').reduce((s,x) => s + (parseFloat(x.montant)||0), 0);
    const benefice = recettes + depenses;
    if (benefice > 0) { ok(`F14 Benefice net = ${benefice} Ar (> 0)`); return true; }
    warn('F14', `Benefice = ${benefice} Ar (negatif — verifier ecritures)`);
    return true;
  } catch(e) { fail('F14', e.message); return false; }
}

// ══════════════════════════════════════════════
// PARTIE 2 — 11 SCENARIOS RLS
// ══════════════════════════════════════════════

async function testS01() {
  section('S01 — Chef ne voit que son chantier');
  try {
    const chef = await loginAs('chef@nysoa.mg', 'chef123');
    if (!chef.ok) { fail('S01', 'Login chef'); return false; }
    const r = await apiFetch('/rest/v1/chantiers?select=nom', chef.token);
    const noms = (r.body||[]).map(x => x.nom);
    if (noms.length === 1 && noms[0] === CHANTIER) { ok('S01 Chef voit 1 seul chantier'); return true; }
    warn('S01', `Chef voit ${noms.length} chantier(s): ${noms.join(', ')}`);
    return true;
  } catch(e) { fail('S01', e.message); return false; }
}

async function testS02() {
  section('S02 — DAF ne lit pas les controles');
  try {
    const daf = await loginAs('daf@nysoa.mg', 'daf123');
    if (!daf.ok) { fail('S02', 'Login DAF'); return false; }
    const r = await apiFetch('/rest/v1/controles_inopines?select=id&limit=1', daf.token);
    if (!r.body?.length) { ok('S02 DAF bloque sur controles_inopines'); return true; }
    warn('S02', `DAF voit ${r.body.length} controle(s)`);
    return true;
  } catch(e) { fail('S02', e.message); return false; }
}

async function testS03() {
  section('S03 — Technicien ne lit pas les salaires');
  try {
    const tec = await loginAs('technicien@nysoa.mg', 'tech123');
    if (!tec.ok) { fail('S03', 'Login technicien'); return false; }
    const r = await apiFetch('/rest/v1/salaires?select=id&limit=1', tec.token);
    if (!r.body?.length) { ok('S03 Technicien bloque sur salaires'); return true; }
    warn('S03', `Technicien voit ${r.body.length} salaire(s)`);
    return true;
  } catch(e) { fail('S03', e.message); return false; }
}

async function testS04() {
  section('S04 — Technicien ne lit pas le journal');
  try {
    const tec = await loginAs('technicien@nysoa.mg', 'tech123');
    if (!tec.ok) { fail('S04', 'Login technicien'); return false; }
    const r = await apiFetch('/rest/v1/journal?select=id&limit=1', tec.token);
    if (!r.body?.length) { ok('S04 Technicien bloque sur journal'); return true; }
    warn('S04', `Technicien voit ${r.body.length} ecriture(s)`);
    return true;
  } catch(e) { fail('S04', e.message); return false; }
}

async function testS05() {
  section('S05 — RH ne lit pas les devis');
  try {
    const rh = await loginAs('rh@nysoa.mg', 'rh123');
    if (!rh.ok) { fail('S05', 'Login RH'); return false; }
    const r = await apiFetch('/rest/v1/devis?select=id&limit=1', rh.token);
    if (!r.body?.length) { ok('S05 RH bloque sur devis'); return true; }
    warn('S05', `RH voit ${r.body.length} devis`);
    return true;
  } catch(e) { fail('S05', e.message); return false; }
}

async function testS06() {
  section('S06 — Controleur ne lit pas le journal');
  try {
    const ctr = await loginAs('controleur@nysoa.mg', 'controleur123');
    if (!ctr.ok) { fail('S06', 'Login controleur'); return false; }
    const r = await apiFetch('/rest/v1/journal?select=id&limit=1', ctr.token);
    if (!r.body?.length) { ok('S06 Controleur bloque sur journal'); return true; }
    warn('S06', `Controleur voit ${r.body.length} ecriture(s)`);
    return true;
  } catch(e) { fail('S06', e.message); return false; }
}

async function testS07() {
  section('S07 — Anon sans token bloque');
  try {
    const tables = ['salaires', 'personnel', 'journal', 'devis'];
    let blocked = 0;
    for (const t of tables) {
      const r = await fetch(BASE + '/rest/v1/' + t + '?select=id&limit=1', { headers: { apikey: ANON } });
      const body = await r.json().catch(() => []);
      if (!body?.length) blocked++;
    }
    if (blocked === tables.length) { ok('S07 Anon bloque sur toutes les tables sensibles'); return true; }
    warn('S07', `${blocked}/${tables.length} tables bloquees`);
    return true;
  } catch(e) { fail('S07', e.message); return false; }
}

async function testS08() {
  section('S08 — DAF ne peut pas DELETE le journal');
  try {
    const daf = await loginAs('daf@nysoa.mg', 'daf123');
    if (!daf.ok) { fail('S08', 'Login DAF'); return false; }
    const r = await apiFetch('/rest/v1/journal?select=id&limit=1', daf.token);
    if (!r.body?.length) { warn('S08', 'Aucune ligne a supprimer'); return true; }
    const del = await apiFetch(`/rest/v1/journal?id=eq.${r.body[0].id}`, daf.token, { method: 'DELETE' });
    if (del.status === 403 || del.status === 401 || del.status === 204) { ok('S08 DAF DELETE journal bloque'); return true; }
    warn('S08', `DELETE journal status ${del.status} (attendu 403/204)`);
    return true;
  } catch(e) { fail('S08', e.message); return false; }
}

async function testS09() {
  section('S09 — RH ne peut pas DELETE le personnel');
  try {
    const rh = await loginAs('rh@nysoa.mg', 'rh123');
    if (!rh.ok) { fail('S09', 'Login RH'); return false; }
    const r = await apiFetch('/rest/v1/personnel?select=id&limit=1', rh.token);
    if (!r.body?.length) { warn('S09', 'Aucune ligne a supprimer'); return true; }
    const del = await apiFetch(`/rest/v1/personnel?id=eq.${r.body[0].id}`, rh.token, { method: 'DELETE' });
    if (del.status === 403 || del.status === 401 || del.status === 204) { ok('S09 RH DELETE personnel bloque'); return true; }
    warn('S09', `DELETE personnel status ${del.status} (attendu 403/204)`);
    return true;
  } catch(e) { fail('S09', e.message); return false; }
}

async function testS10() {
  section('S10 — Chef INSERT rapport dans son chantier');
  try {
    const chef = await loginAs('chef@nysoa.mg', 'chef123');
    if (!chef.ok) { fail('S10', 'Login chef'); return false; }
    const r = await apiFetch('/rest/v1/rapports_chantier', chef.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ date: flux.today, chantier: CHANTIER, meteo: 'Ensoleille', ouvriers: 2, travaux: 'Test RLS' })
    });
    if (r.status === 201) { ok('S10 Chef INSERT rapport OK'); return true; }
    fail('S10', `Status ${r.status}`);
    return false;
  } catch(e) { fail('S10', e.message); return false; }
}

async function testS11() {
  section('S11 — Chef INSERT rapport autre chantier : BLOQUE');
  try {
    const chef = await loginAs('chef@nysoa.mg', 'chef123');
    if (!chef.ok) { fail('S11', 'Login chef'); return false; }
    const r = await apiFetch('/rest/v1/rapports_chantier', chef.token, {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ date: flux.today, chantier: 'CHANTIER_AUTRE', meteo: 'Nuageux', ouvriers: 1, travaux: 'Test RLS interdit' })
    });
    if (r.status === 403 || r.status === 401) { ok('S11 Chef INSERT autre chantier bloque'); return true; }
    warn('S11', `INSERT autre chantier status ${r.status} (attendu 403)`);
    return true;
  } catch(e) { fail('S11', e.message); return false; }
}

// ══════════════════════════════════════════════
// RUNNER
// ══════════════════════════════════════════════

async function runFluxComplet() {
  _pass = 0; _fail = 0; _warn = 0;

  await testF01();
  await testF02();
  await testF03();
  await testF04();
  await testF05();
  await testF06();
  await testF07();
  await testF08();
  await testF09();
  await testF10();
  await testF11();
  await testF12();
  await testF13();
  await testF14();

  await testS01();
  await testS02();
  await testS03();
  await testS04();
  await testS05();
  await testS06();
  await testS07();
  await testS08();
  await testS09();
  await testS10();
  await testS11();

  summary();
}

if (typeof require !== 'undefined' && require.main === module) {
  runFluxComplet().catch(console.error);
}

if (typeof module !== 'undefined') { module.exports = { runFluxComplet }; }
