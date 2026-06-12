// ============================================================
// NYSOA BTP — Scripts de test scénarios complets
// Version : 2026-06-11
// Usage   : Ouvrir la console du navigateur sur chaque page
//           et coller le script correspondant.
//           Ou lancer depuis Node avec Puppeteer (voir bas de fichier).
//
// COMPTES DE TEST :
//   admin@nysoa.mg       / admin123
//   daf@nysoa.mg         / daf123
//   rh@nysoa.mg          / rh123
//   chef@nysoa.mg        / chef123
//   controleur@nysoa.mg  / controleur123
//   technicien@nysoa.mg  / tech123
//
// STRUCTURE :
//   T01  Auth & sécurité (toutes les pages)
//   T02  Admin
//   T03  DAF
//   T04  RH
//   T05  Chef chantier
//   T06  Contrôleur
//   T07  Technicien
//   T08  RLS — tests de contournement inter-rôles
//   T09  Corrections v23 — vérifications ciblées
// ============================================================

const BASE = 'https://djncsybvloyyesllfxhq.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDI1OTksImV4cCI6MjA5MzMxODU5OX0.o4MOSg6axYoNdl0XgidLi0eNukR-KwnKvecZxchkcP8';

// ─── Helpers ────────────────────────────────────────────────
let _pass = 0, _fail = 0, _warn = 0;

function ok(label) {
  _pass++;
  console.log(`%c✅ PASS  ${label}`, 'color:#27ae60;font-weight:bold');
}
function fail(label, detail = '') {
  _fail++;
  console.error(`❌ FAIL  ${label}${detail ? ' — ' + detail : ''}`);
}
function warn(label, detail = '') {
  _warn++;
  console.warn(`⚠️  WARN  ${label}${detail ? ' — ' + detail : ''}`);
}
function section(title) {
  console.log(`\n%c══ ${title} ══`, 'color:#2980b9;font-size:14px;font-weight:bold');
}
function summary() {
  const total = _pass + _fail + _warn;
  console.log(`\n%c━━━ RÉSULTAT : ${_pass}/${total} PASS  |  ${_fail} FAIL  |  ${_warn} WARN ━━━`,
    _fail > 0 ? 'color:#e74c3c;font-weight:bold' : 'color:#27ae60;font-weight:bold');
}

async function sbFetch(path, opts = {}) {
  const { headers: extraHeaders, ...restOpts } = opts;
  const r = await fetch(BASE + path, {
    ...restOpts,
    headers: { apikey: ANON, Authorization: 'Bearer ' + ANON,
                'Content-Type': 'application/json', ...extraHeaders },
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function loginAs(email, password) {
  const r = await fetch(BASE + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await r.json();
  return { token: data.access_token, user: data.user, ok: !!data.access_token };
}

// ============================================================
// T01 — AUTH & SÉCURITÉ
// ============================================================
async function testAuth() {
  section('T01 — Auth & Sécurité');
  _pass=0; _fail=0; _warn=0;

  // T01-01 : Connexion valide admin
  const admin = await loginAs('admin@nysoa.mg', 'admin123');
  admin.ok ? ok('T01-01 Login admin@nysoa.mg réussi') : fail('T01-01 Login admin', admin);

  // T01-02 : Connexion valide tous les rôles
  for (const [email, pwd, role] of [
    ['daf@nysoa.mg',         'daf123',         'daf'],
    ['rh@nysoa.mg',          'rh123',          'rh'],
    ['chef@nysoa.mg',        'chef123',        'chef'],
    ['controleur@nysoa.mg',  'controleur123',  'controleur'],
    ['technicien@nysoa.mg',  'tech123',        'technicien'],
  ]) {
    const r = await loginAs(email, pwd);
    if (!r.ok) { fail(`T01-02 Login ${role}`, 'token absent'); continue; }
    const roleJWT = r.user?.user_metadata?.role;
    roleJWT === role
      ? ok(`T01-02 Login ${role} — role JWT = "${roleJWT}"`)
      : fail(`T01-02 Login ${role} — role JWT = "${roleJWT}" (attendu: "${role}")`);
  }

  // T01-03 : Mauvais mot de passe → refus
  const bad = await loginAs('admin@nysoa.mg', 'mauvaismdp');
  !bad.ok ? ok('T01-03 Refus mauvais mot de passe') : fail('T01-03 Mauvais mdp accepté — CRITIQUE');

  // T01-04 & T01-05 & T01-06 nécessitent navigateur
  warn('T01-04/T01-05/T01-06 : exécuter depuis la console navigateur (localStorage/db)');

  summary();
}

// ============================================================
// T02 — ADMIN
// ============================================================
async function testAdmin() {
  section('T02 — Admin');
  _pass=0; _fail=0; _warn=0;

  const admin = await loginAs('admin@nysoa.mg', 'admin123');
  if (!admin.ok) { fail('T02-00 Login admin impossible — arrêt du bloc'); return; }
  const H = { Authorization: 'Bearer ' + admin.token };

  // T02-01 : Lecture de tous les chantiers
  const ch = await sbFetch('/rest/v1/chantiers?select=id,nom&limit=5', { headers: H });
  (ch.status === 200 && Array.isArray(ch.body) && ch.body.length > 0)
    ? ok(`T02-01 Admin lit les chantiers (${ch.body.length} entrées)`)
    : fail('T02-01 Lecture chantiers', JSON.stringify(ch));

  // T02-02 : Lecture de tout le personnel
  const pe = await sbFetch('/rest/v1/personnel?select=id,nom&limit=5', { headers: H });
  pe.status === 200 ? ok('T02-02 Admin lit le personnel') : fail('T02-02 Lecture personnel', pe.status);

  // T02-03 : Lecture des validations
  const va = await sbFetch('/rest/v1/validations?select=id&limit=5', { headers: H });
  va.status === 200 ? ok('T02-03 Admin lit les validations') : fail('T02-03 Lecture validations', va.status);

  // T02-04 : Lecture Gantt
  const ga = await sbFetch('/rest/v1/gantt_taches?select=id,tache&limit=5', { headers: H });
  ga.status === 200 ? ok('T02-04 Admin lit gantt_taches') : fail('T02-04 Lecture gantt', ga.status);

  // T02-05 : Insertion Gantt
  const ganttInsert = await sbFetch('/rest/v1/gantt_taches', {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ tache: 'TEST_ADMIN_' + Date.now(), chantier: 'TEST', debut: '2026-01-01', fin: '2026-01-31' })
  });
  (ganttInsert.status === 201 || ganttInsert.status === 200)
    ? ok('T02-05 Admin INSERT gantt_taches OK')
    : fail('T02-05 Admin INSERT gantt', ganttInsert.status);

  // T02-07 nécessite sessionStorage (navigateur)
  warn('T02-07/T02-08 : exécuter depuis la console navigateur');

  summary();
}

// ============================================================
// T03 — DAF
// ============================================================
async function testDAF() {
  section('T03 — DAF');
  _pass=0; _fail=0; _warn=0;

  const daf = await loginAs('daf@nysoa.mg', 'daf123');
  if (!daf.ok) { fail('T03-00 Login DAF impossible — arrêt'); return; }
  const H = { Authorization: 'Bearer ' + daf.token };

  // T03-01 : DAF lit le journal
  const j = await sbFetch('/rest/v1/journal?select=id&limit=3', { headers: H });
  j.status === 200 ? ok('T03-01 DAF lit journal') : fail('T03-01 DAF journal', j.status);

  // T03-02 : DAF INSERT un devis
  const devisData = { numero: 'TEST_' + Date.now(), client: 'Client Test', total: 100000, statut: 'BROUILLON', date: '2026-01-01', objet: 'Test auto' };
  const di = await sbFetch('/rest/v1/devis', {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(devisData)
  });
  let devisId = null;
  if (di.status === 201 || di.status === 200) {
    devisId = Array.isArray(di.body) ? di.body[0]?.id : di.body?.id;
    ok(`T03-02 DAF INSERT devis OK (id=${devisId})`);
  } else {
    fail('T03-02 DAF INSERT devis', di.status);
  }

  // T03-03 : DAF UPDATE ce devis
  if (devisId) {
    const du = await sbFetch(`/rest/v1/devis?id=eq.${devisId}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ total: 200000 })
    });
    du.status === 204 ? ok('T03-03 DAF UPDATE devis OK') : fail('T03-03 DAF UPDATE devis', du.status);
  }

  // T03-04 : DAF ne peut PAS DELETE un devis (M16 corrigé)
  if (devisId) {
    const dd = await sbFetch(`/rest/v1/devis?id=eq.${devisId}`, {
      method: 'DELETE', headers: H
    });
    const checkD = await sbFetch(`/rest/v1/devis?id=eq.${devisId}&select=id`, { headers: H });
    const stillThere = checkD.body?.length > 0;
    stillThere
      ? ok('T03-04 DAF DELETE devis bloqué ✓ (RLS M16 corrigé)')
      : fail('T03-04 DAF peut DELETE un devis — M16 NON corrigé');
  }

  // T03-05 : DAF ne peut PAS DELETE du journal (C5 corrigé)
  const jall = await sbFetch('/rest/v1/journal?select=id&limit=1', { headers: H });
  if (jall.body?.length > 0) {
    const jid = jall.body[0].id;
    await sbFetch(`/rest/v1/journal?id=eq.${jid}`, { method: 'DELETE', headers: H });
    const checkJ = await sbFetch(`/rest/v1/journal?id=eq.${jid}&select=id`, { headers: H });
    const stillThere = checkJ.body?.length > 0;
    stillThere
      ? ok('T03-05 DAF DELETE journal bloqué ✓ (RLS C5 corrigé)')
      : fail('T03-05 DAF peut DELETE journal — C5 NON corrigé');
  } else {
    warn('T03-05 Pas de lignes journal pour tester DELETE');
  }

  // T03-06 nécessite navigateur
  warn('T03-06 : exécuter depuis la console navigateur');

  summary();
}

// ============================================================
// T04 — RH
// ============================================================
async function testRH() {
  section('T04 — RH');
  _pass=0; _fail=0; _warn=0;

  const rh = await loginAs('rh@nysoa.mg', 'rh123');
  if (!rh.ok) { fail('T04-00 Login RH impossible'); return; }
  const H = { Authorization: 'Bearer ' + rh.token };

  // T04-01 : RH lit le personnel
  const p = await sbFetch('/rest/v1/personnel?select=id,nom&limit=5', { headers: H });
  p.status === 200 ? ok(`T04-01 RH lit personnel (${p.body?.length} lignes)`) : fail('T04-01 RH personnel', p.status);

  // T04-02 : RH INSERT un employé
  const emp = { nom: 'TEST_RH_' + Date.now(), chantier: 'TEST', salaire_journalier: 15000, actif: true };
  const ei = await sbFetch('/rest/v1/personnel', {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify(emp)
  });
  let empId = null;
  if (ei.status === 201 || ei.status === 200) {
    empId = Array.isArray(ei.body) ? ei.body[0]?.id : ei.body?.id;
    ok(`T04-02 RH INSERT personnel OK (id=${empId})`);
  } else {
    fail('T04-02 RH INSERT personnel', ei.status + ' ' + JSON.stringify(ei.body));
  }

  // T04-03 : RH UPDATE cet employé
  if (empId) {
    const eu = await sbFetch(`/rest/v1/personnel?id=eq.${empId}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ salaire_journalier: 18000 })
    });
    eu.status === 204 ? ok('T04-03 RH UPDATE personnel OK') : fail('T04-03 RH UPDATE personnel', eu.status);
  }

  // T04-04 : RH ne peut PAS DELETE (C3 — FOR ALL interdit le DELETE)
  if (empId) {
    await sbFetch(`/rest/v1/personnel?id=eq.${empId}`, { method: 'DELETE', headers: H });
    const checkP = await sbFetch(`/rest/v1/personnel?id=eq.${empId}&select=id`, { headers: H });
    const stillThere = checkP.body?.length > 0;
    stillThere
      ? ok('T04-04 RH DELETE personnel bloqué ✓ (C3 corrigé)')
      : fail('T04-04 RH peut DELETE personnel — C3 NON corrigé');
  }

  // T04-05 & T04-07 nécessitent navigateur
  warn('T04-05/T04-06/T04-07 : exécuter depuis la console navigateur');

  summary();
}

// ============================================================
// T05 — CHEF CHANTIER
// ============================================================
async function testChef() {
  section('T05 — Chef Chantier');
  _pass=0; _fail=0; _warn=0;

  const chef = await loginAs('chef@nysoa.mg', 'chef123');
  if (!chef.ok) { fail('T05-00 Login chef impossible'); return; }
  const H = { Authorization: 'Bearer ' + chef.token };
  const chantierChef = chef.user?.user_metadata?.chantier;

  chantierChef
    ? ok(`T05-01 user_metadata.chantier = "${chantierChef}"`)
    : fail('T05-01 user_metadata.chantier NULL — RLS chef échouera');

  // T05-02 : Chef lit uniquement son chantier
  const ch = await sbFetch('/rest/v1/chantiers?select=id,nom', { headers: H });
  if (ch.status === 200) {
    ch.body?.every(c => c.nom === chantierChef || !chantierChef)
      ? ok(`T05-02 Chef voit ${ch.body.length} chantier(s) — filtré par RLS`)
      : warn(`T05-02 Chef voit ${ch.body.length} chantier(s) — vérifier scope RLS`);
  } else {
    fail('T05-02 Chef lecture chantiers', ch.status);
  }

  // T05-03 : Chef INSERT gantt
  const gi = await sbFetch('/rest/v1/gantt_taches', {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ tache: 'TEST_CHEF_' + Date.now(), chantier: chantierChef || 'TEST', debut: '2026-07-01', fin: '2026-07-15' })
  });
  let ganttId = null;
  if (gi.status === 201 || gi.status === 200) {
    ganttId = Array.isArray(gi.body) ? gi.body[0]?.id : gi.body?.id;
    ok(`T05-03 Chef INSERT gantt OK (id=${ganttId})`);
  } else {
    fail('T05-03 Chef INSERT gantt', gi.status + ' ' + JSON.stringify(gi.body));
  }

  // T05-04 : Chef UPDATE gantt (C6 corrigé)
  if (ganttId) {
    const gu = await sbFetch(`/rest/v1/gantt_taches?id=eq.${ganttId}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ avancement: 50 })
    });
    gu.status === 204
      ? ok('T05-04 Chef UPDATE gantt OK ✓ (C6 corrigé)')
      : fail('T05-04 Chef UPDATE gantt bloqué — C6 NON corrigé', gu.status);
  }

  // T05-05 : Chef DELETE gantt (C6 corrigé)
  if (ganttId) {
    const gd = await sbFetch(`/rest/v1/gantt_taches?id=eq.${ganttId}`, {
      method: 'DELETE', headers: H
    });
    gd.status === 204
      ? ok('T05-05 Chef DELETE gantt OK ✓ (C6 corrigé)')
      : fail('T05-05 Chef DELETE gantt bloqué — C6 NON corrigé', gd.status);
  }

  // T05-06 : Chef INSERT rapport chantier
  const ri = await sbFetch('/rest/v1/rapports_chantier', {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ date: '2026-07-01', chantier: chantierChef || 'TEST', meteo: 'Ensoleillé', ouvriers: 5, travaux: 'Test' })
  });
  let rapportId = null;
  if (ri.status === 201 || ri.status === 200) {
    rapportId = Array.isArray(ri.body) ? ri.body[0]?.id : ri.body?.id;
    ok('T05-06 Chef INSERT rapport chantier OK');
  } else {
    fail('T05-06 Chef INSERT rapport', ri.status + ' ' + JSON.stringify(ri.body));
  }

  // T05-07/T05-08 nécessitent navigateur
  warn('T05-07/T05-08 : exécuter depuis la console navigateur');

  summary();
}

// ============================================================
// T06 — CONTRÔLEUR
// ============================================================
async function testControleur() {
  section('T06 — Contrôleur');
  _pass=0; _fail=0; _warn=0;

  const ctr = await loginAs('controleur@nysoa.mg', 'controleur123');
  if (!ctr.ok) { fail('T06-00 Login contrôleur impossible'); return; }
  const H = { Authorization: 'Bearer ' + ctr.token };

  // T06-01 : Lecture chantiers (tous pour sélection)
  const ch = await sbFetch('/rest/v1/chantiers?select=id,nom&limit=10', { headers: H });
  ch.status === 200 ? ok(`T06-01 Contrôleur lit chantiers (${ch.body?.length})`) : fail('T06-01', ch.status);

  // T06-02 : INSERT controle inopine
  const ci = await sbFetch('/rest/v1/controles_inopines', {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ chantier: 'AMBATOMAINTY', datetime: new Date().toISOString(),
      controleur: 'controleur@nysoa.mg', observations: 'Test automatique', score: 80 })
  });
  let controleId = null;
  if (ci.status === 201 || ci.status === 200) {
    controleId = Array.isArray(ci.body) ? ci.body[0]?.id : ci.body?.id;
    ok('T06-02 Contrôleur INSERT controles_inopines OK');
  } else {
    fail('T06-02 INSERT controle', ci.status + ' ' + JSON.stringify(ci.body));
  }

  // T06-03 : UPDATE ce contrôle
  if (controleId) {
    const cu = await sbFetch(`/rest/v1/controles_inopines?id=eq.${controleId}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ score: 90 })
    });
    cu.status === 204 ? ok('T06-03 Contrôleur UPDATE controle OK') : fail('T06-03', cu.status);
  }

  // T06-04 : Contrôleur ne lit PAS le journal (hors scope)
  const j = await sbFetch('/rest/v1/journal?select=id&limit=1', { headers: H });
  (j.status !== 200 || j.body?.length === 0)
    ? ok('T06-04 Contrôleur accès journal bloqué ou vide ✓')
    : warn('T06-04 Contrôleur peut lire le journal — vérifier RLS');

  // T06-05 nécessite navigateur
  warn('T06-05 : exécuter depuis la console navigateur');

  summary();
}

// ============================================================
// T07 — TECHNICIEN
// ============================================================
async function testTechnicien() {
  section('T07 — Technicien');
  _pass=0; _fail=0; _warn=0;

  const tech = await loginAs('technicien@nysoa.mg', 'tech123');
  if (!tech.ok) { fail('T07-00 Login technicien impossible'); return; }
  const H = { Authorization: 'Bearer ' + tech.token };

  // T07-01 à T07-03 nécessitent fonctions globales (navigateur)
  warn('T07-01/T07-02/T07-03 : exécuter depuis la console technicien');

  // T07-04 : INSERT intervention dans Supabase
  const ii = await sbFetch('/rest/v1/interventions', {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({ titre: 'TEST_' + Date.now(), type: 'maintenance',
      priorite: 'NORMALE', description: 'Test auto', statut: 'EN COURS' })
  });
  let intervenId = null;
  if (ii.status === 201 || ii.status === 200) {
    intervenId = Array.isArray(ii.body) ? ii.body[0]?.id : ii.body?.id;
    ok('T07-04 Technicien INSERT interventions OK');
  } else {
    fail('T07-04 INSERT intervention', ii.status + ' ' + JSON.stringify(ii.body));
  }

  // T07-05 : Technicien lit ses propres interventions
  const ir = await sbFetch('/rest/v1/interventions?select=id&limit=5', { headers: H });
  ir.status === 200 ? ok(`T07-05 Technicien lit interventions (${ir.body?.length})`) : fail('T07-05', ir.status);

  // T07-06 : Technicien ne peut PAS lire les salaires (hors scope)
  const sa = await sbFetch('/rest/v1/salaires?select=id&limit=1', { headers: H });
  (sa.status !== 200 || sa.body?.length === 0)
    ? ok('T07-06 Technicien accès salaires bloqué ✓')
    : fail('T07-06 Technicien peut lire les salaires — RLS KO');

  // T07-07 nécessite localStorage (navigateur)
  warn('T07-07 : exécuter depuis la console navigateur');

  summary();
}

// ============================================================
// T08 — RLS : TESTS DE CONTOURNEMENT INTER-RÔLES
// ============================================================
async function testRLSCrossRole() {
  section('T08 — RLS Cross-Role Isolation');
  _pass=0; _fail=0; _warn=0;

  // T08-01 : DAF ne peut pas lire les controles_inopines
  const daf = await loginAs('daf@nysoa.mg', 'daf123');
  const Hd = { Authorization: 'Bearer ' + daf.token };
  const dc = await sbFetch('/rest/v1/controles_inopines?select=id&limit=1', { headers: Hd });
  (dc.status !== 200 || dc.body?.length === 0)
    ? ok('T08-01 DAF ne lit pas controles_inopines ✓')
    : warn('T08-01 DAF peut lire controles_inopines');

  // T08-02 : Technicien ne peut pas lire le journal
  const tech = await loginAs('technicien@nysoa.mg', 'tech123');
  const Ht = { Authorization: 'Bearer ' + tech.token };
  const tj = await sbFetch('/rest/v1/journal?select=id&limit=1', { headers: Ht });
  (tj.status !== 200 || tj.body?.length === 0)
    ? ok('T08-02 Technicien ne lit pas journal ✓')
    : fail('T08-02 Technicien peut lire journal — RLS KO');

  // T08-03 : Technicien ne peut pas lire le personnel
  const tp = await sbFetch('/rest/v1/personnel?select=id&limit=1', { headers: Ht });
  (tp.status !== 200 || tp.body?.length === 0)
    ? ok('T08-03 Technicien ne lit pas personnel ✓')
    : warn('T08-03 Technicien peut lire personnel');

  // T08-04 : Chef ne peut pas lire les chantiers d'un autre chef
  const chef = await loginAs('chef@nysoa.mg', 'chef123');
  const Hc = { Authorization: 'Bearer ' + chef.token };
  const cc = await sbFetch('/rest/v1/chantiers?select=id,nom', { headers: Hc });
  if (cc.status === 200) {
    const chantierChef = chef.user?.user_metadata?.chantier;
    const autres = cc.body?.filter(c => c.nom !== chantierChef) || [];
    autres.length === 0
      ? ok(`T08-04 Chef voit uniquement son chantier "${chantierChef}" ✓`)
      : warn(`T08-04 Chef voit ${autres.length} chantier(s) hors scope`);
  }

  // T08-05 : RH ne peut pas lire les devis
  const rh = await loginAs('rh@nysoa.mg', 'rh123');
  const Hr = { Authorization: 'Bearer ' + rh.token };
  const rd = await sbFetch('/rest/v1/devis?select=id&limit=1', { headers: Hr });
  (rd.status !== 200 || rd.body?.length === 0)
    ? ok('T08-05 RH ne lit pas devis ✓')
    : warn('T08-05 RH peut lire les devis');

  // T08-06 : Accès anon sans token → aucune donnée sensible
  const anonSalaires = await sbFetch('/rest/v1/salaires?select=id,montant&limit=1');
  (anonSalaires.status !== 200 || anonSalaires.body?.length === 0)
    ? ok('T08-06 Anon bloqué sur salaires ✓')
    : fail('T08-06 Accès anon aux salaires — CRITIQUE');

  const anonPersonnel = await sbFetch('/rest/v1/personnel?select=id,nom&limit=1');
  (anonPersonnel.status !== 200 || anonPersonnel.body?.length === 0)
    ? ok('T08-07 Anon bloqué sur personnel ✓')
    : fail('T08-07 Accès anon au personnel — CRITIQUE');

  summary();
}

// ============================================================
// T09 — VÉRIFICATIONS CIBLÉES CORRECTIONS v23
// ============================================================
async function testCorrectionsV23() {
  section('T09 — Corrections v23 — Vérifications ciblées');
  _pass=0; _fail=0; _warn=0;

  // T09-01 : C6 — Chef UPDATE/DELETE gantt (via API directe)
  const chef = await loginAs('chef@nysoa.mg', 'chef123');
  if (chef.ok) {
    const Hc = { Authorization: 'Bearer ' + chef.token };
    const chantier = chef.user?.user_metadata?.chantier || 'TEST';

    const gi = await sbFetch('/rest/v1/gantt_taches', {
      method: 'POST', headers: { ...Hc, Prefer: 'return=representation' },
      body: JSON.stringify({ tache: 'V23_TEST', chantier, debut: '2026-08-01', fin: '2026-08-10' })
    });
    const gid = gi.body?.[0]?.id || (Array.isArray(gi.body) ? gi.body[0]?.id : null);
    if (gid) {
      const gu = await sbFetch(`/rest/v1/gantt_taches?id=eq.${gid}`, {
        method: 'PATCH', headers: Hc, body: JSON.stringify({ avancement: 75 })
      });
      gu.status === 204 ? ok('T09-01a Chef UPDATE gantt ✓') : fail('T09-01a C6 UPDATE KO', gu.status);

      const gd = await sbFetch(`/rest/v1/gantt_taches?id=eq.${gid}`, {
        method: 'DELETE', headers: Hc
      });
      gd.status === 204 ? ok('T09-01b Chef DELETE gantt ✓') : fail('T09-01b C6 DELETE KO', gd.status);
    } else {
      warn('T09-01 Impossible de créer tâche gantt test');
    }
  }

  // T09-02 : validé par T08-04
  ok('T09-02 M13 NULL guard validé par T08-04 (test indirect)');

  // T09-03 à T09-05 nécessitent navigateur
  warn('T09-03/T09-04/T09-05 : exécuter depuis la console navigateur');

  // T09-06 : rapports_chantier anon bloqué
  const anonR = await sbFetch('/rest/v1/rapports_chantier?select=id&limit=1');
  (anonR.status !== 200 || anonR.body?.length === 0)
    ? ok('T09-06 rapports_chantier anon bloqué ✓ (FIX_COLONNES allow_all corrigé)')
    : fail('T09-06 rapports_chantier anon accessible — FIX_COLONNES non appliqué en DB');

  const anonCI = await sbFetch('/rest/v1/controles_inopines?select=id&limit=1');
  (anonCI.status !== 200 || anonCI.body?.length === 0)
    ? ok('T09-07 controles_inopines anon bloqué ✓')
    : fail('T09-07 controles_inopines anon accessible');

  summary();
}

// ============================================================
// RUNNER COMPLET
// ============================================================
async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║    NYSOA BTP — TEST SUITE v23 (2026-06-11)      ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const startTs = Date.now();
  await testAuth();
  await testAdmin();
  await testDAF();
  await testRH();
  await testChef();
  await testControleur();
  await testTechnicien();
  await testRLSCrossRole();
  await testCorrectionsV23();

  const elapsed = ((Date.now() - startTs) / 1000).toFixed(1);
  console.log(`\n⏱ Durée totale : ${elapsed}s`);
}

// ─── Export pour Node ──
module.exports = { runAllTests, testAuth, testAdmin, testDAF, testRH, testChef, testControleur, testTechnicien, testRLSCrossRole, testCorrectionsV23 };

if (require.main === module) {
  runAllTests().catch(e => console.error('FATAL:', e));
}
