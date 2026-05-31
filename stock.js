/**
 * NySoa BTP — stock.js  (version Supabase)
 * Bug 5 corrigé : localStorage → stock_articles / stock_mouvements / stock_affectations
 *
 * Dépendances globales : db (supabase.js), showNotification, formatAriary, today
 * Tables Supabase : stock_articles, stock_mouvements, stock_affectations
 */

'use strict';

// ── Données par défaut (seed au premier démarrage) ─────────────
const DEFAULT_ARTICLES = [
    { ref:'STK-001', nom:'Ciment Portland',  categorie:'Matériaux',  emplacement:'Entrepôt central', quantite:450,  unite:'Sac',    prix_unitaire:6000,   seuil_alerte:100,  notes:'' },
    { ref:'STK-002', nom:'Sable de rivière', categorie:'Matériaux',  emplacement:'TRANO CHEF',        quantite:25,   unite:'m³',     prix_unitaire:22500,  seuil_alerte:30,   notes:'Résidence Les Palmiers' },
    { ref:'STK-003', nom:'Acier HA 12 mm',   categorie:'Matériaux',  emplacement:'Entrepôt A',        quantite:2500, unite:'m',      prix_unitaire:750,    seuil_alerte:500,  notes:'' },
    { ref:'STK-004', nom:'Brique creuse',     categorie:'Matériaux',  emplacement:'TRANO CHEF',        quantite:8500, unite:'Unité',  prix_unitaire:400,    seuil_alerte:2000, notes:'' },
    { ref:'STK-005', nom:'Gravier 8/15',      categorie:'Matériaux',  emplacement:'AMBATOMAINTY',      quantite:18,   unite:'m³',     prix_unitaire:30000,  seuil_alerte:20,   notes:'Centre Commercial' },
    { ref:'STK-006', nom:'Bétonnière 300L',   categorie:'Outillage',  emplacement:'TRANO CHEF',        quantite:2,    unite:'Unité',  prix_unitaire:850000, seuil_alerte:1,    notes:'' },
    { ref:'STK-007', nom:'Niveau laser',      categorie:'Équipement', emplacement:'Entrepôt central',  quantite:3,    unite:'Unité',  prix_unitaire:320000, seuil_alerte:1,    notes:'' },
    { ref:'STK-008', nom:'Peinture blanche',  categorie:'Consommable',emplacement:'AINA & DOMOINA',    quantite:40,   unite:'Bidon',  prix_unitaire:35000,  seuil_alerte:10,   notes:'Finitions bureau' },
];

// ── Cache en mémoire (évite les requêtes redondantes) ──────────
let _articles    = null;
let _mouvements  = null;
let _affectations = null;

// ══════════════════════════════════════════════════════════════
// COUCHE DONNÉES — Supabase
// ══════════════════════════════════════════════════════════════

async function getArticles() {
    if (_articles) return _articles;
    const { data, error } = await db.from('stock_articles').select('*').order('ref');
    if (error) { console.error('[stock] getArticles:', error); return []; }
    _articles = data;
    return _articles;
}

async function getMouvements() {
    if (_mouvements) return _mouvements;
    const { data, error } = await db.from('stock_mouvements').select('*').order('date', { ascending: false });
    if (error) { console.error('[stock] getMouvements:', error); return []; }
    _mouvements = data;
    return _mouvements;
}

async function getAffectations() {
    if (_affectations) return _affectations;
    const { data, error } = await db.from('stock_affectations').select('*').order('date_prevue');
    if (error) { console.error('[stock] getAffectations:', error); return []; }
    _affectations = data;
    return _affectations;
}

function invalidateCache() {
    _articles     = null;
    _mouvements   = null;
    _affectations = null;
}

// ── Seed données initiales (si tables vides) ───────────────────
async function stockInitData() {
    const { count, error } = await db
        .from('stock_articles')
        .select('*', { count: 'exact', head: true });
    if (error || count > 0) return;

    const { error: insErr } = await db.from('stock_articles').insert(DEFAULT_ARTICLES);
    if (insErr) console.error('[stock] seed articles:', insErr);
    else console.log('[stock] ✓ Articles initiaux insérés');
}

// ══════════════════════════════════════════════════════════════
// UTILITAIRES PURES (pas de I/O)
// ══════════════════════════════════════════════════════════════

function getStockStatut(art) {
    if (art.quantite <= 0)                                        return { label:'Épuisé',    cls:'error' };
    if (art.seuil_alerte && art.quantite <= art.seuil_alerte)    return { label:'Stock bas',  cls:'warning' };
    return { label:'OK', cls:'success' };
}

function emplacementLabel(val) {
    if (!val) return '—';
    const depots = ['Entrepôt central','Entrepôt A','Entrepôt B','DEPOT'];
    return depots.includes(val) ? `🏠 ${val}` : `🏗️ ${val}`;
}

function fmtDate(dateStr) {
    if (!dateStr) return '—';
    // Supabase retourne ISO (2026-05-31), on affiche fr-FR
    return new Date(dateStr).toLocaleDateString('fr-FR');
}

// ══════════════════════════════════════════════════════════════
// RENDU HTML
// ══════════════════════════════════════════════════════════════

function renderArticleRow(art) {
    const statut = getStockStatut(art);
    const valeur = art.quantite * (art.prix_unitaire || 0);
    const alerteIcon = statut.cls !== 'success'
        ? `<i class="fas fa-exclamation-triangle" style="color:#f59e0b;margin-right:4px" title="${statut.label}"></i>`
        : '';
    return `
        <tr data-ref="${art.ref}" data-emplacement="${art.emplacement}" data-categorie="${art.categorie}"
            style="cursor:pointer" onclick="openStockDetail('${art.ref}')">
            <td><strong>${art.ref}</strong></td>
            <td>${alerteIcon}${art.nom}</td>
            <td><span style="font-size:0.78rem;background:#f1f5f9;padding:2px 8px;border-radius:12px">${art.categorie}</span></td>
            <td>${emplacementLabel(art.emplacement)}</td>
            <td style="font-weight:${statut.cls !== 'success' ? '700' : '400'};color:${statut.cls === 'error' ? '#ef4444' : statut.cls === 'warning' ? '#d97706' : 'inherit'}">
                ${Number(art.quantite).toLocaleString('fr-FR')}
            </td>
            <td>${art.unite}</td>
            <td>${art.prix_unitaire ? Number(art.prix_unitaire).toLocaleString('fr-FR') + ' Ar' : '—'}</td>
            <td style="font-weight:600">${valeur > 0 ? valeur.toLocaleString('fr-FR') + ' Ar' : '—'}</td>
            <td>${art.seuil_alerte || '—'}</td>
            <td><span class="status ${statut.cls}">${statut.label}</span></td>
            <td onclick="event.stopPropagation()">
                <button class="btn-icon" title="Voir détail" onclick="openStockDetail('${art.ref}')"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Entrée stock" onclick="quickMouvement('${art.ref}','Entrée')"><i class="fas fa-arrow-down" style="color:#10b981"></i></button>
                <button class="btn-icon" title="Sortie stock" onclick="quickMouvement('${art.ref}','Sortie')"><i class="fas fa-arrow-up" style="color:#ef4444"></i></button>
                <button class="btn-icon" title="Planifier affectation" onclick="openAffectationModal('${art.ref}')" style="color:#7c3aed"><i class="fas fa-calendar-plus"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editArticle('${art.ref}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteArticle('${art.ref}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
}

function renderMouvementRow(m) {
    const icon = m.type === 'Entrée' ? '📥' : m.type === 'Sortie' ? '📤' : '🔄';
    const cls  = m.type === 'Entrée' ? 'success' : m.type === 'Sortie' ? 'error' : 'active';
    return `
        <tr>
            <td>${fmtDate(m.date)}</td>
            <td><span class="status ${cls}">${icon} ${m.type}</span></td>
            <td>${m.nom_article}<br><small style="color:#94a3b8">${m.article_ref}</small></td>
            <td><strong>${Number(m.quantite).toLocaleString('fr-FR')}</strong></td>
            <td>${m.emplacement_source ? emplacementLabel(m.emplacement_source) : '—'}</td>
            <td>${m.emplacement_dest   ? emplacementLabel(m.emplacement_dest)   : '—'}</td>
            <td>${m.chantier           ? emplacementLabel(m.chantier)           : '—'}</td>
            <td style="max-width:180px;white-space:normal;font-size:0.82rem">${m.motif || '—'}</td>
            <td style="font-size:0.82rem;color:#64748b">${m.saisi_par || '—'}</td>
        </tr>`;
}

// ══════════════════════════════════════════════════════════════
// CHARGEMENT TABLEAUX
// ══════════════════════════════════════════════════════════════

let _stockFilter = { emplacement: '', categorie: '', search: '' };

async function loadStockTable() {
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:#94a3b8;padding:20px">
        <i class="fas fa-spinner fa-spin"></i> Chargement…</td></tr>`;

    const articles = await getArticles();

    const visible = articles.filter(a => {
        if (_stockFilter.emplacement && a.emplacement !== _stockFilter.emplacement) return false;
        if (_stockFilter.categorie   && a.categorie   !== _stockFilter.categorie)   return false;
        if (_stockFilter.search) {
            const s = _stockFilter.search.toLowerCase();
            if (!a.nom.toLowerCase().includes(s) && !a.ref.toLowerCase().includes(s)) return false;
        }
        return true;
    });

    tbody.innerHTML = visible.length
        ? visible.map(renderArticleRow).join('')
        : `<tr><td colspan="11" style="text-align:center;color:#94a3b8;font-style:italic;padding:20px">Aucun article trouvé</td></tr>`;
}

let _mvtFilter = { article: '', type: '' };

async function loadMouvementsTable() {
    const tbody = document.getElementById('mouvement-table-body');
    if (!tbody) return;

    const mouvements = await getMouvements();

    const visible = mouvements.filter(m => {
        if (_mvtFilter.article && m.article_ref !== _mvtFilter.article) return false;
        if (_mvtFilter.type    && m.type        !== _mvtFilter.type)    return false;
        return true;
    });

    tbody.innerHTML = visible.length
        ? visible.map(renderMouvementRow).join('')
        : `<tr><td colspan="9" style="text-align:center;color:#94a3b8;font-style:italic;padding:20px">Aucun mouvement enregistré</td></tr>`;
}

async function filterMouvements() {
    _mvtFilter.article = document.getElementById('mouvement-filter-article')?.value || '';
    _mvtFilter.type    = document.getElementById('mouvement-filter-type')?.value    || '';
    await loadMouvementsTable();
}

// ══════════════════════════════════════════════════════════════
// STATISTIQUES
// ══════════════════════════════════════════════════════════════

async function updateStockStats() {
    const articles   = await getArticles();
    const mouvements = await getMouvements();

    const total    = articles.length;
    const bas      = articles.filter(a => a.seuil_alerte && a.quantite <= a.seuil_alerte).length;
    const valeur   = articles.reduce((s, a) => s + a.quantite * (a.prix_unitaire || 0), 0);

    const now = new Date();
    const thisMois = mouvements.filter(m => {
        const d = new Date(m.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const el = id => document.getElementById(id);
    if (el('stat-total-articles'))  el('stat-total-articles').textContent  = total;
    if (el('stat-stocks-bas'))      el('stat-stocks-bas').textContent      = bas;
    if (el('stat-valeur-stock'))    el('stat-valeur-stock').textContent    = valeur.toLocaleString('fr-FR') + ' Ar';
    if (el('stat-mouvements-mois')) el('stat-mouvements-mois').textContent = thisMois;
}

// ══════════════════════════════════════════════════════════════
// VUE PAR CHANTIER
// ══════════════════════════════════════════════════════════════

async function renderStockParChantier() {
    const container = document.getElementById('stock-par-chantier-body');
    if (!container) return;

    const articles = await getArticles();
    const groupes  = {};

    articles.forEach(a => {
        const key = a.emplacement || 'Sans emplacement';
        if (!groupes[key]) groupes[key] = [];
        groupes[key].push(a);
    });

    if (!Object.keys(groupes).length) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;font-style:italic">Aucun stock défini</p>';
        return;
    }

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px">';

    Object.entries(groupes).forEach(([emplacement, arts]) => {
        const isChantier = !['Entrepôt central','Entrepôt A','Entrepôt B','DEPOT'].includes(emplacement);
        const titre  = isChantier ? `🏗️ ${emplacement}` : `🏠 ${emplacement}`;
        const valTot = arts.reduce((s, a) => s + a.quantite * (a.prix_unitaire || 0), 0);
        const hasBas = arts.some(a => a.seuil_alerte && a.quantite <= a.seuil_alerte);

        html += `
            <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
                <div style="background:${isChantier ? 'linear-gradient(135deg,#0066cc,#3388dd)' : '#f8fafc'};padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:700;color:${isChantier ? 'white' : '#1e293b'};font-size:0.9rem">${titre}</span>
                    ${hasBas ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600"><i class="fas fa-exclamation-triangle"></i> Alerte</span>` : ''}
                </div>
                <div style="padding:12px 16px">
                    <div style="display:flex;gap:16px;margin-bottom:10px;font-size:0.82rem;color:#64748b">
                        <span><strong style="color:#1e293b">${arts.length}</strong> article(s)</span>
                        <span>Valeur : <strong style="color:#0066cc">${valTot.toLocaleString('fr-FR')} Ar</strong></span>
                    </div>
                    <table style="width:100%;font-size:0.8rem;border-collapse:collapse">
                        <thead><tr style="background:#f8fafc">
                            <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600">Article</th>
                            <th style="padding:5px 8px;text-align:right;color:#64748b;font-weight:600">Qté</th>
                            <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600">Statut</th>
                        </tr></thead>
                        <tbody>
                            ${arts.map(a => {
                                const st = getStockStatut(a);
                                return `<tr style="border-top:1px solid #f1f5f9">
                                    <td style="padding:5px 8px">${a.nom}</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:600">${Number(a.quantite).toLocaleString('fr-FR')} ${a.unite}</td>
                                    <td style="padding:5px 8px"><span class="status ${st.cls}" style="font-size:0.72rem">${st.label}</span></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
// PEUPLEMENT SELECTS
// ══════════════════════════════════════════════════════════════

async function populateStockSelects() {
    const articles = await getArticles();

    const emplacements = ['Entrepôt central', 'Entrepôt A', 'Entrepôt B', 'DEPOT'];
    const uniq = [...new Set([...emplacements, ...articles.map(a => a.emplacement)])].filter(Boolean);

    // Filtre emplacement principal
    const emplacFilter = document.getElementById('stock-emplacement-filter');
    if (emplacFilter) {
        const cur = emplacFilter.value;
        emplacFilter.innerHTML = `<option value="">— Tous les emplacements —</option>` +
            uniq.map(e => `<option value="${e}" ${e===cur?'selected':''}>${emplacementLabel(e)}</option>`).join('');
    }

    // Form nouvel article
    const formEmpl = document.getElementById('stock-form-emplacement');
    if (formEmpl) {
        formEmpl.innerHTML = uniq.map(e => `<option value="${e}">${emplacementLabel(e)}</option>`).join('');
    }

    // Modal mouvement — article select
    const artSelect = document.getElementById('mouvement-article-select');
    if (artSelect) {
        artSelect.innerHTML = `<option value="">Sélectionner un article…</option>` +
            articles.map(a => `<option value="${a.ref}">${a.nom} (${a.ref}) — ${a.quantite} ${a.unite}</option>`).join('');
    }

    // Modal mouvement — source, dest
    ['mouvement-source-select','mouvement-dest-select'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) sel.innerHTML = `<option value="">—</option>` +
            uniq.map(e => `<option value="${e}">${emplacementLabel(e)}</option>`).join('');
    });

    // Modal mouvement — chantier (depuis Supabase)
    const chanSelect = document.getElementById('mouvement-chantier-select');
    if (chanSelect) {
        const { data: chantiers } = await db.from('chantiers').select('nom').eq('actif', true).order('nom');
        chanSelect.innerHTML = `<option value="">— Aucun —</option>` +
            (chantiers || []).map(c => `<option value="${c.nom}">${c.nom}</option>`).join('');
    }

    // Filtre mouvement — article
    const mvtArtFilter = document.getElementById('mouvement-filter-article');
    if (mvtArtFilter) {
        mvtArtFilter.innerHTML = `<option value="">Tous les articles</option>` +
            articles.map(a => `<option value="${a.ref}">${a.nom}</option>`).join('');
    }
}

// ══════════════════════════════════════════════════════════════
// FILTRES INVENTAIRE
// ══════════════════════════════════════════════════════════════

function stockFilterByEmplacement(val) { _stockFilter.emplacement = val; loadStockTable(); }
function stockFilterByCategorie(val)   { _stockFilter.categorie   = val; loadStockTable(); }
function stockSearch(val)              { _stockFilter.search      = val; loadStockTable(); }

function stockResetFilters() {
    _stockFilter = { emplacement:'', categorie:'', search:'' };
    ['stock-emplacement-filter','stock-categorie-filter','stock-search'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    loadStockTable();
}

// ══════════════════════════════════════════════════════════════
// CRUD ARTICLES
// ══════════════════════════════════════════════════════════════

async function deleteArticle(ref) {
    if (!confirm('Supprimer cet article du stock ? Les mouvements associés seront conservés.')) return;
    const { error } = await db.from('stock_articles').delete().eq('ref', ref);
    if (error) {
        showNotification('Impossible de supprimer : ' + (error.message || ''), 'error');
        return;
    }
    invalidateCache();
    await refreshStock();
    showNotification('Article supprimé', 'info');
}

function editArticle(ref) {
    // On pré-charge depuis le cache si disponible, sinon Supabase
    const doEdit = (art) => {
        if (!art) { showNotification('Article introuvable', 'error'); return; }
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Modifier : ${art.nom}</h3>
                    <button onclick="this.closest('.modal').remove()" style="background:none;border:none;font-size:1.4rem;cursor:pointer">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group"><label>Désignation</label><input type="text" id="ea-nom" value="${art.nom}"></div>
                        <div class="form-group"><label>Catégorie</label>
                            <select id="ea-cat">
                                ${['Matériaux','Outillage','Équipement','Consommable'].map(c => `<option value="${c}" ${c===art.categorie?'selected':''}>${c}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Quantité</label><input type="number" id="ea-qte" value="${art.quantite}" step="any"></div>
                        <div class="form-group"><label>Unité</label><input type="text" id="ea-unite" value="${art.unite}"></div>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Prix unitaire (Ar)</label><input type="number" id="ea-prix" value="${art.prix_unitaire||0}" step="any"></div>
                        <div class="form-group"><label>Seuil alerte</label><input type="number" id="ea-seuil" value="${art.seuil_alerte||0}" step="any"></div>
                    </div>
                    <div class="form-group"><label>Notes</label><textarea id="ea-notes" rows="2">${art.notes||''}</textarea></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn btn-primary" onclick="saveEditArticle('${ref}')">Enregistrer</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    };

    if (_articles) {
        doEdit(_articles.find(a => a.ref === ref));
    } else {
        db.from('stock_articles').select('*').eq('ref', ref).single()
            .then(({ data }) => doEdit(data));
    }
}

async function saveEditArticle(ref) {
    const updates = {
        nom:          document.getElementById('ea-nom').value,
        categorie:    document.getElementById('ea-cat').value,
        quantite:     parseFloat(document.getElementById('ea-qte').value) || 0,
        unite:        document.getElementById('ea-unite').value,
        prix_unitaire:parseFloat(document.getElementById('ea-prix').value) || 0,
        seuil_alerte: parseFloat(document.getElementById('ea-seuil').value) || 0,
        notes:        document.getElementById('ea-notes').value,
        updated_at:   new Date().toISOString(),
    };
    const { error } = await db.from('stock_articles').update(updates).eq('ref', ref);
    if (error) { showNotification('Erreur modification : ' + error.message, 'error'); return; }
    document.querySelector('.modal.active')?.remove();
    invalidateCache();
    await refreshStock();
    showNotification('Article mis à jour ✓', 'success');
}

// ── Formulaire nouvel article ──────────────────────────────────
function initStockForm() {
    const form = document.getElementById('form-stock');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd = new FormData(this);

        // Générer une ref unique
        const articles = await getArticles();
        const maxNum = articles.reduce((max, a) => {
            const n = parseInt(a.ref.replace('STK-', '')) || 0;
            return Math.max(max, n);
        }, 0);
        const newRef = 'STK-' + String(maxNum + 1).padStart(3, '0');

        const art = {
            ref:          newRef,
            nom:          fd.get('nom'),
            categorie:    fd.get('categorie'),
            emplacement:  fd.get('emplacement'),
            quantite:     parseFloat(fd.get('quantite')) || 0,
            unite:        fd.get('unite'),
            prix_unitaire:parseFloat(fd.get('prix_unitaire')) || 0,
            seuil_alerte: parseFloat(fd.get('seuil_alerte')) || 0,
            notes:        fd.get('notes') || '',
        };

        const { error } = await db.from('stock_articles').insert(art);
        if (error) { showNotification('Erreur création : ' + error.message, 'error'); return; }

        // Mouvement d'entrée initial si quantite > 0
        if (art.quantite > 0) {
            await db.from('stock_mouvements').insert({
                date:              today(),
                type:              'Entrée',
                article_ref:       newRef,
                nom_article:       art.nom,
                quantite:          art.quantite,
                emplacement_source:'',
                emplacement_dest:  art.emplacement,
                chantier:          '',
                motif:             'Stock initial',
                saisi_par:         '',
            });
        }

        invalidateCache();
        closeModal('modal-stock');
        this.reset();
        await refreshStock();
        showNotification(`Article ${art.nom} créé ✓`, 'success');
    });
}

// ── Formulaire mouvement ───────────────────────────────────────
function initMouvementForm() {
    const form = document.getElementById('form-mouvement');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const fd  = new FormData(this);
        const type   = fd.get('type');
        const artRef = fd.get('article_ref');
        const qte    = parseFloat(fd.get('quantite')) || 0;
        const src    = fd.get('emplacement_source') || '';
        const dest   = fd.get('emplacement_dest')   || '';
        const chant  = fd.get('chantier')            || '';

        if (!type || !artRef || !qte) {
            showNotification('Veuillez remplir tous les champs obligatoires', 'error');
            return;
        }

        // Récupérer l'article depuis Supabase (source de vérité)
        const { data: art, error: artErr } = await db
            .from('stock_articles').select('*').eq('ref', artRef).single();
        if (artErr || !art) { showNotification('Article introuvable', 'error'); return; }

        // Vérifier stock suffisant
        if ((type === 'Sortie' || type === 'Transfert') && qte > art.quantite) {
            showNotification(`Stock insuffisant : seulement ${art.quantite} ${art.unite} disponibles`, 'error');
            return;
        }

        // Calculer nouvelle quantité
        let newQte = art.quantite;
        if (type === 'Entrée')              newQte += qte;
        else if (type === 'Sortie')         newQte -= qte;
        else if (type === 'Transfert')      newQte -= qte;

        // Mettre à jour l'article
        const { error: updErr } = await db.from('stock_articles')
            .update({ quantite: newQte, updated_at: new Date().toISOString() })
            .eq('ref', artRef);
        if (updErr) { showNotification('Erreur mise à jour stock : ' + updErr.message, 'error'); return; }

        // Si transfert : incrémenter (ou créer) l'article à la destination
        if (type === 'Transfert' && dest) {
            const { data: destArt } = await db.from('stock_articles')
                .select('ref, quantite').eq('ref', artRef + '-' + dest).single();
            if (destArt) {
                await db.from('stock_articles')
                    .update({ quantite: destArt.quantite + qte, updated_at: new Date().toISOString() })
                    .eq('ref', artRef + '-' + dest);
            } else {
                await db.from('stock_articles').insert({
                    ...art,
                    ref:        artRef + '-' + dest,
                    emplacement: dest,
                    quantite:   qte,
                });
            }
        }

        // Enregistrer le mouvement
        const dateVal = fd.get('date');
        const { error: mvtErr } = await db.from('stock_mouvements').insert({
            date:               dateVal || today(),
            type,
            article_ref:        artRef,
            nom_article:        art.nom,
            quantite:           qte,
            emplacement_source: src,
            emplacement_dest:   dest,
            chantier:           chant,
            motif:              fd.get('motif') || '',
            saisi_par:          fd.get('saisi_par') || '',
        });
        if (mvtErr) console.error('[stock] insert mouvement:', mvtErr);

        invalidateCache();
        closeModal('modal-mouvement');
        this.reset();
        await refreshStock();

        // Alerte stock bas
        if (art.seuil_alerte && newQte <= art.seuil_alerte) {
            setTimeout(() => showNotification(
                `⚠️ Alerte : stock de "${art.nom}" est bas (${newQte} ${art.unite})`, 'warning'), 500);
        }
        showNotification(`Mouvement "${type}" enregistré pour ${art.nom} ✓`, 'success');
    });
}

// ══════════════════════════════════════════════════════════════
// FICHE DÉTAIL ARTICLE
// ══════════════════════════════════════════════════════════════

async function openStockDetail(ref) {
    const [{ data: art }, { data: historique }] = await Promise.all([
        db.from('stock_articles').select('*').eq('ref', ref).single(),
        db.from('stock_mouvements').select('*').eq('article_ref', ref).order('date', { ascending: false }),
    ]);
    if (!art) return;

    const statut = getStockStatut(art);
    const valeur = art.quantite * (art.prix_unitaire || 0);
    const hist   = historique || [];
    const totalEntrees = hist.filter(m => m.type === 'Entrée').reduce((s, m) => s + Number(m.quantite), 0);
    const totalSorties = hist.filter(m => m.type === 'Sortie').reduce((s, m) => s + Number(m.quantite), 0);

    const modal = document.createElement('div');
    modal.className = 'modal active detail-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width:820px">
            <div class="modal-header" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:white;border-radius:10px 10px 0 0">
                <div>
                    <h3 style="color:white;margin:0">${art.nom}</h3>
                    <small style="opacity:0.85">${art.ref} — ${art.categorie} — ${emplacementLabel(art.emplacement)}</small>
                </div>
                <button onclick="this.closest('.modal').remove()" style="color:white;background:rgba(255,255,255,0.2);border:none;width:30px;height:30px;border-radius:50%;font-size:1.2rem;cursor:pointer">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h4>📦 Informations</h4>
                    <div class="detail-grid">
                        <div class="detail-field"><label>Référence</label><span>${art.ref}</span></div>
                        <div class="detail-field"><label>Catégorie</label><span>${art.categorie}</span></div>
                        <div class="detail-field"><label>Emplacement</label><span>${emplacementLabel(art.emplacement)}</span></div>
                        <div class="detail-field"><label>Unité</label><span>${art.unite}</span></div>
                        <div class="detail-field"><label>Prix unitaire</label><span>${art.prix_unitaire ? Number(art.prix_unitaire).toLocaleString('fr-FR') + ' Ar' : '—'}</span></div>
                        <div class="detail-field"><label>Seuil alerte</label><span>${art.seuil_alerte || '—'}</span></div>
                        ${art.notes ? `<div class="detail-field" style="grid-column:1/-1"><label>Notes</label><span>${art.notes}</span></div>` : ''}
                    </div>
                </div>
                <div class="detail-section">
                    <h4>📊 Situation actuelle</h4>
                    <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
                        <div style="text-align:center;padding:14px 20px;background:${statut.cls==='success'?'#f0fdf4':statut.cls==='warning'?'#fffbeb':'#fef2f2'};border-radius:10px;border:1px solid ${statut.cls==='success'?'#86efac':statut.cls==='warning'?'#fde68a':'#fca5a5'}">
                            <div style="font-size:1.8rem;font-weight:800;color:${statut.cls==='success'?'#15803d':statut.cls==='warning'?'#d97706':'#dc2626'}">${Number(art.quantite).toLocaleString('fr-FR')}</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:2px">${art.unite} en stock</div>
                            <span class="status ${statut.cls}" style="margin-top:6px;display:inline-block">${statut.label}</span>
                        </div>
                        <div style="text-align:center;padding:14px 20px;background:#f0f9ff;border-radius:10px;border:1px solid #bae6fd">
                            <div style="font-size:1.8rem;font-weight:800;color:#0369a1">${totalEntrees.toLocaleString('fr-FR')}</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:2px">${art.unite} entrées</div>
                        </div>
                        <div style="text-align:center;padding:14px 20px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa">
                            <div style="font-size:1.8rem;font-weight:800;color:#c2410c">${totalSorties.toLocaleString('fr-FR')}</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:2px">${art.unite} sorties</div>
                        </div>
                        <div style="text-align:center;padding:14px 20px;background:#f5f3ff;border-radius:10px;border:1px solid #ddd6fe">
                            <div style="font-size:1.1rem;font-weight:800;color:#6d28d9">${valeur.toLocaleString('fr-FR')} Ar</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:2px">Valeur actuelle</div>
                        </div>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>📋 Historique des mouvements</h4>
                    ${hist.length ? `
                    <table class="detail-subtable">
                        <thead><tr><th>Date</th><th>Type</th><th>Quantité</th><th>Source</th><th>Destination</th><th>Chantier</th><th>Motif</th></tr></thead>
                        <tbody>
                            ${hist.map(m => {
                                const ic  = m.type==='Entrée'?'📥':m.type==='Sortie'?'📤':'🔄';
                                const cls = m.type==='Entrée'?'success':m.type==='Sortie'?'error':'active';
                                return `<tr>
                                    <td>${fmtDate(m.date)}</td>
                                    <td><span class="status ${cls}" style="font-size:0.72rem">${ic} ${m.type}</span></td>
                                    <td><strong>${Number(m.quantite).toLocaleString('fr-FR')} ${art.unite}</strong></td>
                                    <td style="font-size:0.8rem">${m.emplacement_source ? emplacementLabel(m.emplacement_source) : '—'}</td>
                                    <td style="font-size:0.8rem">${m.emplacement_dest   ? emplacementLabel(m.emplacement_dest)   : '—'}</td>
                                    <td style="font-size:0.8rem">${m.chantier           ? emplacementLabel(m.chantier)           : '—'}</td>
                                    <td style="font-size:0.8rem;max-width:160px;white-space:normal">${m.motif || '—'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>` : `<p class="detail-empty">Aucun mouvement enregistré</p>`}
                    <div style="display:flex;gap:8px;margin-top:10px">
                        <button class="detail-link-btn" onclick="this.closest('.modal').remove(); quickMouvement('${ref}','Entrée')"><i class="fas fa-arrow-down" style="color:#10b981"></i> Entrée</button>
                        <button class="detail-link-btn" onclick="this.closest('.modal').remove(); quickMouvement('${ref}','Sortie')"><i class="fas fa-arrow-up" style="color:#ef4444"></i> Sortie</button>
                        <button class="detail-link-btn" onclick="this.closest('.modal').remove(); quickMouvement('${ref}','Transfert')"><i class="fas fa-exchange-alt"></i> Transfert</button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                <button class="btn btn-primary" onclick="this.closest('.modal').remove(); editArticle('${ref}')"><i class="fas fa-edit"></i> Modifier</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ══════════════════════════════════════════════════════════════
// MOUVEMENTS — helpers UI
// ══════════════════════════════════════════════════════════════

function mouvementTypeChange(type) {
    const srcGrp  = document.getElementById('mouvement-source-group');
    const destGrp = document.getElementById('mouvement-dest-group');
    const chanGrp = document.getElementById('mouvement-chantier-group');
    if (!srcGrp) return;
    srcGrp.style.display  = type === 'Entrée'    ? 'none'  : 'block';
    destGrp.style.display = type === 'Sortie'    ? 'none'  : 'block';
    chanGrp.style.display = type === 'Transfert' ? 'none'  : 'block';
}

function quickMouvement(ref, type) {
    openModal('modal-mouvement');
    setTimeout(() => {
        const typeEl = document.getElementById('mouvement-type-select');
        const artEl  = document.getElementById('mouvement-article-select');
        if (typeEl) { typeEl.value = type; mouvementTypeChange(type); }
        if (artEl)  artEl.value = ref;
        const dateEl = document.querySelector('#form-mouvement [name="date"]');
        if (dateEl) dateEl.value = today();
    }, 50);
}

// ══════════════════════════════════════════════════════════════
// ALERTES
// ══════════════════════════════════════════════════════════════

async function checkStockAlertes() {
    const articles = await getArticles();
    const bas      = articles.filter(a => a.seuil_alerte && a.quantite <= a.seuil_alerte && a.quantite > 0).length;
    const epuises  = articles.filter(a => a.quantite <= 0).length;
    const badge    = document.querySelector('.notifications .badge');
    if (badge && (bas || epuises)) badge.textContent = bas + epuises;
}

// ══════════════════════════════════════════════════════════════
// AFFECTATIONS FUTURES
// ══════════════════════════════════════════════════════════════

function openAffectationModal(artRef) {
    const buildModal = (articles) => {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'modal-affectation-future';
        modal.innerHTML = `
            <div class="modal-content" style="max-width:560px">
                <div class="modal-header" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;border-radius:10px 10px 0 0">
                    <div>
                        <h3 style="color:white;margin:0">📅 Planifier une affectation future</h3>
                        <small style="opacity:0.85">Réserver un matériel pour un chantier à venir</small>
                    </div>
                    <button onclick="this.closest('.modal').remove()" style="color:white;background:rgba(255,255,255,0.2);border:none;width:30px;height:30px;border-radius:50%;font-size:1.2rem;cursor:pointer">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Matériel *</label>
                        <select id="aff-article" required style="width:100%">
                            <option value="">— Choisir un article —</option>
                            ${articles.map(a => `<option value="${a.ref}" data-unite="${a.unite}" data-qte="${a.quantite}" ${a.ref===artRef?'selected':''}>${a.nom} (stock : ${Number(a.quantite).toLocaleString('fr-FR')} ${a.unite})</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-row">
                        <div class="form-group"><label>Quantité prévue *</label><input type="number" id="aff-qte" min="0" step="any" placeholder="0" style="width:100%"></div>
                        <div class="form-group"><label>Date prévue *</label><input type="date" id="aff-date" value="${today()}" style="width:100%"></div>
                    </div>
                    <div class="form-group"><label>Chantier de destination *</label><input type="text" id="aff-chantier" placeholder="Nom du chantier" style="width:100%"></div>
                    <div class="form-group"><label>Responsable</label><input type="text" id="aff-responsable" placeholder="Nom du responsable" style="width:100%"></div>
                    <div class="form-group"><label>Remarques</label><textarea id="aff-notes" rows="2" placeholder="Détails, urgence…" style="width:100%"></textarea></div>
                    <div id="aff-stock-warning" style="display:none;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;margin-top:8px;color:#92400e;font-size:0.85rem">
                        ⚠️ <span id="aff-stock-warning-text"></span>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                    <button class="btn btn-primary" onclick="saveAffectation()" style="background:linear-gradient(135deg,#7c3aed,#a855f7)">
                        <i class="fas fa-calendar-check"></i> Planifier
                    </button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        document.getElementById('aff-qte').addEventListener('input', checkStockDisponible);
        document.getElementById('aff-article').addEventListener('change', checkStockDisponible);
    };

    if (_articles) { buildModal(_articles); }
    else { getArticles().then(buildModal); }
}

async function checkStockDisponible() {
    const ref  = document.getElementById('aff-article')?.value;
    const qte  = parseFloat(document.getElementById('aff-qte')?.value) || 0;
    const warn = document.getElementById('aff-stock-warning');
    if (!ref || !warn) return;

    const articles = await getArticles();
    const art = articles.find(a => a.ref === ref);
    if (!art) return;

    const affectations = await getAffectations();
    const deja = affectations
        .filter(a => a.article_ref === ref && a.statut === 'Planifié')
        .reduce((s, a) => s + Number(a.quantite), 0);

    const dispo = art.quantite - deja;
    if (qte > dispo) {
        warn.style.display = 'block';
        document.getElementById('aff-stock-warning-text').textContent =
            `Stock disponible : ${dispo} ${art.unite} (${art.quantite} en stock − ${deja} réservés). Votre demande de ${qte} dépasse le disponible.`;
    } else {
        warn.style.display = 'none';
    }
}

async function saveAffectation() {
    const ref      = document.getElementById('aff-article')?.value;
    const qte      = parseFloat(document.getElementById('aff-qte')?.value) || 0;
    const date     = document.getElementById('aff-date')?.value;
    const chantier = document.getElementById('aff-chantier')?.value?.trim();
    const resp     = document.getElementById('aff-responsable')?.value?.trim();
    const notes    = document.getElementById('aff-notes')?.value?.trim();

    if (!ref || !qte || !date || !chantier) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    const articles = await getArticles();
    const art = articles.find(a => a.ref === ref);
    if (!art) return;

    const { error } = await db.from('stock_affectations').insert({
        article_ref:   ref,
        nom_article:   art.nom,
        unite:         art.unite,
        quantite:      qte,
        date_prevue:   date,
        chantier,
        responsable:   resp || '',
        notes:         notes || '',
        statut:        'Planifié',
        date_creation: today(),
    });
    if (error) { showNotification('Erreur planification : ' + error.message, 'error'); return; }

    invalidateCache();
    document.getElementById('modal-affectation-future')?.remove();
    await renderAffectationsFutures();
    showNotification(`Affectation planifiée : ${qte} ${art.unite} de "${art.nom}" → ${chantier} ✓`, 'success');
}

async function updateStatutAffectation(id, newStatut) {
    if (newStatut === 'Réalisé') {
        const affectations = await getAffectations();
        const aff = affectations.find(a => a.id == id);
        if (!aff) return;

        const { data: art } = await db.from('stock_articles').select('*').eq('ref', aff.article_ref).single();
        if (!art) { showNotification('Article introuvable', 'error'); return; }
        if (aff.quantite > art.quantite) {
            showNotification(`Stock insuffisant pour réaliser (${art.quantite} ${aff.unite} dispo)`, 'error');
            return;
        }

        // Déduire du stock
        await db.from('stock_articles')
            .update({ quantite: art.quantite - aff.quantite, updated_at: new Date().toISOString() })
            .eq('ref', aff.article_ref);

        // Créer le mouvement de sortie
        await db.from('stock_mouvements').insert({
            date:               today(),
            type:               'Sortie',
            article_ref:        aff.article_ref,
            nom_article:        aff.nom_article,
            quantite:           aff.quantite,
            emplacement_source: art.emplacement || '',
            emplacement_dest:   aff.chantier,
            chantier:           aff.chantier,
            motif:              `Affectation planifiée #${aff.id}`,
            saisi_par:          aff.responsable || '',
        });
        showNotification('Mouvement de sortie créé automatiquement ✓', 'success');
    }

    const { error } = await db.from('stock_affectations').update({
        statut:     newStatut,
        updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) { showNotification('Erreur mise à jour statut : ' + error.message, 'error'); return; }

    invalidateCache();
    await refreshStock();
    await renderAffectationsFutures();
}

async function supprimerAffectation(id) {
    if (!confirm('Supprimer cette affectation planifiée ?')) return;
    const { error } = await db.from('stock_affectations').delete().eq('id', id);
    if (error) { showNotification('Erreur suppression : ' + error.message, 'error'); return; }
    invalidateCache();
    await renderAffectationsFutures();
    showNotification('Affectation supprimée', 'info');
}

async function renderAffectationsFutures() {
    const container = document.getElementById('affectations-futures-body');
    if (!container) return;

    const affectations = await getAffectations();
    const todayStr = today();

    if (!affectations.length) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;font-style:italic;padding:20px">Aucune affectation planifiée</p>';
        return;
    }

    const statutCls = { 'Planifié':'active', 'Réalisé':'success', 'Annulé':'error' };
    const statutIco = { 'Planifié':'📅', 'Réalisé':'✅', 'Annulé':'❌' };

    container.innerHTML = `
        <table class="table">
            <thead><tr>
                <th>Date prévue</th><th>Matériel</th><th>Quantité</th><th>Chantier</th>
                <th>Responsable</th><th>Remarques</th><th>Statut</th><th>Actions</th>
            </tr></thead>
            <tbody>
                ${affectations.map(a => {
                    const enRetard = a.statut === 'Planifié' && a.date_prevue < todayStr;
                    return `<tr style="${enRetard ? 'background:#fff7ed' : ''}">
                        <td>${fmtDate(a.date_prevue)}${enRetard ? '<br><span style="color:#ef4444;font-size:0.75rem;font-weight:600">⚠️ En retard</span>' : ''}</td>
                        <td><strong>${a.nom_article}</strong></td>
                        <td>${Number(a.quantite).toLocaleString('fr-FR')} ${a.unite}</td>
                        <td>🏗️ ${a.chantier}</td>
                        <td>${a.responsable || '—'}</td>
                        <td style="font-size:0.8rem;max-width:140px;white-space:normal">${a.notes || '—'}</td>
                        <td><span class="status ${statutCls[a.statut]||'active'}" style="font-size:0.75rem">${statutIco[a.statut]} ${a.statut}</span></td>
                        <td>
                            <div style="display:flex;gap:4px;flex-wrap:wrap">
                                ${a.statut === 'Planifié' ? `
                                    <button class="btn-icon" title="Marquer réalisé" onclick="updateStatutAffectation(${a.id},'Réalisé')" style="color:#10b981"><i class="fas fa-check"></i></button>
                                    <button class="btn-icon" title="Annuler" onclick="updateStatutAffectation(${a.id},'Annulé')" style="color:#f59e0b"><i class="fas fa-ban"></i></button>
                                ` : ''}
                                <button class="btn-icon" title="Supprimer" onclick="supprimerAffectation(${a.id})" style="color:#ef4444"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
        <div style="margin-top:10px;font-size:0.82rem;color:#64748b;display:flex;gap:16px;flex-wrap:wrap">
            <span>📅 Planifié : réservé, stock non encore prélevé</span>
            <span>✅ Réalisé : mouvement de sortie créé automatiquement</span>
            <span>❌ Annulé : annulé sans mouvement</span>
        </div>`;

    const badge    = document.getElementById('aff-futures-count');
    const planifies = affectations.filter(a => a.statut === 'Planifié').length;
    if (badge) badge.textContent = planifies ? `${planifies} en attente` : '';
}

// ══════════════════════════════════════════════════════════════
// EXPORT EXCEL
// ══════════════════════════════════════════════════════════════

async function exportAffectations() {
    const aff = await getAffectations();
    if (!aff.length) { showNotification('Aucune affectation à exporter', 'warning'); return; }
    const rows = [['Date prévue','Matériel','Quantité','Unité','Chantier','Responsable','Statut','Remarques']];
    aff.forEach(a => rows.push([a.date_prevue, a.nom_article, a.quantite, a.unite, a.chantier, a.responsable, a.statut, a.notes]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Affectations');
    XLSX.writeFile(wb, `affectations_futures_nysoa_${today()}.xlsx`);
}

// ══════════════════════════════════════════════════════════════
// INJECTION UI affectations futures (dans section logistique)
// ══════════════════════════════════════════════════════════════

function injectAffectationsFuturesUI() {
    const logSection = document.getElementById('logistique');
    if (!logSection) return;
    if (document.getElementById('affectations-futures-card')) return;

    const headerActions = logSection.querySelector('.header-actions');
    if (headerActions) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.cssText = 'background:linear-gradient(135deg,#7c3aed,#a855f7);color:white;border:none';
        btn.innerHTML = '<i class="fas fa-calendar-plus"></i> Planifier une affectation';
        btn.onclick = () => openAffectationModal(null);
        headerActions.insertBefore(btn, headerActions.firstChild);
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'affectations-futures-card';
    card.style.marginTop = '20px';
    card.innerHTML = `
        <div class="card-header" style="background:linear-gradient(135deg,#7c3aed20,#a855f720);border-bottom:1px solid #ddd6fe">
            <h3 style="color:#6d28d9">📅 Affectations futures planifiées <span id="aff-futures-count" style="font-size:0.78rem;color:#7c3aed;font-weight:500;margin-left:8px"></span></h3>
            <div class="card-actions">
                <button class="btn-small" onclick="openAffectationModal(null)" style="background:#7c3aed;color:white;border:none"><i class="fas fa-plus"></i> Nouvelle</button>
                <button class="btn-small" onclick="exportAffectations()"><i class="fas fa-file-excel"></i> Excel</button>
            </div>
        </div>
        <div class="card-body" id="affectations-futures-body">
            <p style="text-align:center;color:#94a3b8;font-style:italic;padding:20px">Chargement…</p>
        </div>`;

    const last = logSection.querySelector('.card:last-of-type');
    if (last) logSection.insertBefore(card, last);
    else logSection.appendChild(card);

    renderAffectationsFutures();
}

// ── Appelé par import-excel.js ─────────────────────────────────
function loadLogistiqueTable() { refreshStock(); }

// ══════════════════════════════════════════════════════════════
// REFRESH GLOBAL
// ══════════════════════════════════════════════════════════════

async function refreshStock() {
    invalidateCache();
    await Promise.all([
        populateStockSelects(),
        loadStockTable(),
        loadMouvementsTable(),
        updateStockStats(),
        renderStockParChantier(),
        checkStockAlertes(),
    ]);
    await renderAffectationsFutures();
}

// ══════════════════════════════════════════════════════════════
// INITIALISATION
// ══════════════════════════════════════════════════════════════

async function initStockModule() {
    await stockInitData();    // seed si tables vides
    await populateStockSelects();
    await loadStockTable();
    await loadMouvementsTable();
    await updateStockStats();
    await renderStockParChantier();
    initStockForm();
    initMouvementForm();
    await checkStockAlertes();
    injectAffectationsFuturesUI();

    document.querySelectorAll('.nav-item[data-section="logistique"]').forEach(item => {
        item.addEventListener('click', () => setTimeout(() => refreshStock(), 100));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStockModule);
} else {
    initStockModule();
}

console.log('[NYSOA BTP] stock.js (Supabase) chargé ✓');
