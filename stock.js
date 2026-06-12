/**
 * NySoa BTP — stock.js
 * Gestion complète des stocks :
 *  - Inventaire avec emplacement/chantier
 *  - Historique des mouvements (entrée, sortie, transfert)
 *  - Vue par chantier
 *  - Alertes stock bas
 *  - Filtres multiples
 */

// ── Clés localStorage ──────────────────────────────────
const STOCK_KEY      = 'nysoa_stock_articles';
const MOUVEMENT_KEY  = 'nysoa_stock_mouvements';

// ── Helpers localStorage ───────────────────────────────
function stockLoad(key, defaultVal) {
    try {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : defaultVal;
    } catch(e) { return defaultVal; }
}
function stockSave(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}
function getArticles()    { return stockLoad(STOCK_KEY,     []); }
function getMouvements()  { return stockLoad(MOUVEMENT_KEY, []); }

// ── Sync localStorage → Supabase (materiels) ──────────
async function stockSyncToSupabase() {
    const articles = getArticles();
    for (const art of articles) {
        try {
        // BUG-03 FIX: inclure l'id Supabase si disponible, sinon conflit sur libelle
        const payload = {
            libelle: art.nom,
            quantite: art.quantite,
            etat: art.categorie,
            chantier_actuel: art.emplacement || null,
            prix_unitaire: art.prix_unitaire || 0,
            fournisseur: '',
            seuil_alerte: art.seuil_alerte || 0
        };
        if (art.id) payload.id = art.id;
        const conflictCol = art.id ? 'id' : 'libelle';
        await db.from('materiels').upsert(payload, { onConflict: conflictCol });
        } catch(e) { console.warn('[Stock] Sync error:', e); }
    }
}

async function stockLoadFromSupabase() {
    try {
        const { data } = await db.from('materiels').select('*').limit(500);
        if (data && data.length) {
            const mapped = data.map(m => ({
                ref: 'STK-SB-' + m.id,
                nom: m.libelle || '',
                categorie: m.etat || '',
                emplacement: m.chantier_actuel || '',
                quantite: m.quantite || 0,
                unite: 'Unité',
                prix_unitaire: m.prix_unitaire || 0,
                seuil_alerte: m.seuil_alerte || 0,
                notes: ''
            }));
            stockSave(STOCK_KEY, mapped);
        }
    } catch(e) { console.warn('[Stock] Load from Supabase error:', e); }
}

// ── Init données ───────────────────────────────────────
function stockInitData() {
    // Ne jamais injecter les données par défaut — partir vide, charger depuis Supabase
    if (!localStorage.getItem(STOCK_KEY))     stockSave(STOCK_KEY,     []);
    if (!localStorage.getItem(MOUVEMENT_KEY)) stockSave(MOUVEMENT_KEY, []);
}

// ── Statut selon quantité vs seuil ─────────────────────
function getStockStatut(art) {
    if (art.quantite <= 0)                         return { label:'Épuisé',   cls:'error' };
    if (art.seuil_alerte && art.quantite <= art.seuil_alerte) return { label:'Stock bas', cls:'warning' };
    return { label:'OK', cls:'success' };
}

// ── Nom emplacement lisible ────────────────────────────
function emplacementLabel(val) {
    if (!val) return '—';
    if (val.startsWith('PRJ-')) {
        const projets = [];
        const p = projets.find(x => x.reference === val);
        return p ? `🏗️ ${p.nom}` : `🏗️ ${val}`;
    }
    return `🏠 ${val}`;
}

// ── Rendu ligne article ────────────────────────────────
function renderArticleRow(art) {
    const statut = getStockStatut(art);
    const valeur = art.quantite * (art.prix_unitaire || 0);
    const alerteIcon = statut.cls !== 'success' ? `<i class="fas fa-exclamation-triangle" style="color:#f59e0b;margin-right:4px" title="${statut.label}"></i>` : '';
    return `
        <tr data-ref="${art.ref}" data-emplacement="${art.emplacement}" data-categorie="${art.categorie}"
            style="cursor:pointer" onclick="openStockDetail('${art.ref}')">
            <td><strong>${art.ref}</strong></td>
            <td>${alerteIcon}${art.nom}</td>
            <td><span style="font-size:0.78rem;background:#f1f5f9;padding:2px 8px;border-radius:12px">${art.categorie}</span></td>
            <td>${emplacementLabel(art.emplacement)}</td>
            <td style="font-weight:${statut.cls !== 'success' ? '700' : '400'};color:${statut.cls === 'error' ? '#ef4444' : statut.cls === 'warning' ? '#d97706' : 'inherit'}">${art.quantite.toLocaleString('fr-FR')}</td>
            <td>${art.unite}</td>
            <td>${art.prix_unitaire ? art.prix_unitaire.toLocaleString('fr-FR') + ' Ar' : '—'}</td>
            <td style="font-weight:600">${valeur > 0 ? valeur.toLocaleString('fr-FR') + ' Ar' : '—'}</td>
            <td>${art.seuil_alerte || '—'}</td>
            <td><span class="status ${statut.cls}">${statut.label}</span></td>
            <td onclick="event.stopPropagation()">
                <button class="btn-icon" title="Voir détail + historique" onclick="openStockDetail('${art.ref}')"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Entrée stock" onclick="quickMouvement('${art.ref}','Entrée')"><i class="fas fa-arrow-down" style="color:#10b981"></i></button>
                <button class="btn-icon" title="Sortie stock" onclick="quickMouvement('${art.ref}','Sortie')"><i class="fas fa-arrow-up" style="color:#ef4444"></i></button>
                <button class="btn-icon" title="Planifier affectation future" onclick="openAffectationModal('${art.ref}')" style="color:#7c3aed"><i class="fas fa-calendar-plus"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editArticle('${art.ref}')"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteArticle('${art.ref}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>`;
}

// ── Rendu ligne mouvement ──────────────────────────────
function renderMouvementRow(m) {
    const icon = m.type === 'Entrée' ? '📥' : m.type === 'Sortie' ? '📤' : '🔄';
    const cls  = m.type === 'Entrée' ? 'success' : m.type === 'Sortie' ? 'error' : 'active';
    const chantierLabel = m.chantier ? emplacementLabel(m.chantier) : '—';
    return `
        <tr>
            <td>${m.date}</td>
            <td><span class="status ${cls}">${icon} ${m.type}</span></td>
            <td>${m.nom_article}<br><small style="color:#94a3b8">${m.article_ref}</small></td>
            <td><strong>${Number(m.quantite).toLocaleString('fr-FR')}</strong></td>
            <td>${m.emplacement_source ? emplacementLabel(m.emplacement_source) : '—'}</td>
            <td>${m.emplacement_dest  ? emplacementLabel(m.emplacement_dest)   : '—'}</td>
            <td>${chantierLabel}</td>
            <td style="max-width:180px;white-space:normal;font-size:0.82rem">${m.motif || '—'}</td>
            <td style="font-size:0.82rem;color:#64748b">${m.saisi_par || '—'}</td>
        </tr>`;
}

// ── Chargement tableau inventaire ──────────────────────
let _stockFilter = { emplacement: '', categorie: '', search: '' };

function loadStockTable() {
    const articles = getArticles();
    const tbody = document.getElementById('stock-table-body');
    if (!tbody) return;

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

// ── Chargement tableau mouvements ──────────────────────
let _mvtFilter = { article: '', type: '' };

function loadMouvementsTable() {
    const mouvements = getMouvements();
    const tbody = document.getElementById('mouvement-table-body');
    if (!tbody) return;

    const sorted = [...mouvements].sort((a, b) => {
        const da = a.date.split('/').reverse().join('');
        const db = b.date.split('/').reverse().join('');
        return db.localeCompare(da);
    });

    const visible = sorted.filter(m => {
        if (_mvtFilter.article && m.article_ref !== _mvtFilter.article) return false;
        if (_mvtFilter.type    && m.type         !== _mvtFilter.type)    return false;
        return true;
    });

    tbody.innerHTML = visible.length
        ? visible.map(renderMouvementRow).join('')
        : `<tr><td colspan="9" style="text-align:center;color:#94a3b8;font-style:italic;padding:20px">Aucun mouvement enregistré</td></tr>`;
}

function filterMouvements() {
    _mvtFilter.article = document.getElementById('mouvement-filter-article')?.value || '';
    _mvtFilter.type    = document.getElementById('mouvement-filter-type')?.value    || '';
    loadMouvementsTable();
}

// ── Stats ──────────────────────────────────────────────
function updateStockStats() {
    const articles   = getArticles();
    const mouvements = getMouvements();

    const total     = articles.length;
    const bas       = articles.filter(a => a.seuil_alerte && a.quantite <= a.seuil_alerte).length;
    const valeur    = articles.reduce((s, a) => s + a.quantite * (a.prix_unitaire || 0), 0);
    const now       = new Date();
    const thisMois  = mouvements.filter(m => {
        const parts = m.date.split('/');
        if (parts.length < 3) return false;
        return parseInt(parts[1]) === now.getMonth() + 1 && parseInt(parts[2]) === now.getFullYear();
    }).length;

    const el = id => document.getElementById(id);
    if (el('stat-total-articles'))  el('stat-total-articles').textContent  = total;
    if (el('stat-stocks-bas'))      el('stat-stocks-bas').textContent      = bas;
    if (el('stat-valeur-stock'))    el('stat-valeur-stock').textContent    = valeur.toLocaleString('fr-FR') + ' Ar';
    if (el('stat-mouvements-mois')) el('stat-mouvements-mois').textContent = thisMois;
}

// ── Vue stock par chantier ─────────────────────────────
function renderStockParChantier() {
    const container = document.getElementById('stock-par-chantier-body');
    if (!container) return;

    const articles = getArticles();
    const projets  = [];

    // Grouper par emplacement
    const groupes = {};
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
        const projet = projets.find(p => p.reference === emplacement);
        const titre  = projet ? `🏗️ ${projet.nom} <small style="color:#94a3b8">(${emplacement})</small>` : `🏠 ${emplacement}`;
        const valTot = arts.reduce((s, a) => s + a.quantite * (a.prix_unitaire || 0), 0);
        const hasBas = arts.some(a => a.seuil_alerte && a.quantite <= a.seuil_alerte);

        html += `
            <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
                <div style="background:${projet ? 'linear-gradient(135deg,#0066cc,#3388dd)' : '#f8fafc'};padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
                    <span style="font-weight:700;color:${projet ? 'white' : '#1e293b'};font-size:0.9rem">${titre}</span>
                    ${hasBas ? `<span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;font-size:0.75rem;font-weight:600"><i class="fas fa-exclamation-triangle"></i> Alerte</span>` : ''}
                </div>
                <div style="padding:12px 16px">
                    <div style="display:flex;gap:16px;margin-bottom:10px;font-size:0.82rem;color:#64748b">
                        <span><strong style="color:#1e293b">${arts.length}</strong> article(s)</span>
                        <span>Valeur : <strong style="color:#0066cc">${valTot.toLocaleString('fr-FR')} Ar</strong></span>
                    </div>
                    <table style="width:100%;font-size:0.8rem;border-collapse:collapse">
                        <thead>
                            <tr style="background:#f8fafc">
                                <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600">Article</th>
                                <th style="padding:5px 8px;text-align:right;color:#64748b;font-weight:600">Qté</th>
                                <th style="padding:5px 8px;text-align:left;color:#64748b;font-weight:600">Statut</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${arts.map(a => {
                                const st = getStockStatut(a);
                                return `<tr style="border-top:1px solid #f1f5f9">
                                    <td style="padding:5px 8px">${a.nom}</td>
                                    <td style="padding:5px 8px;text-align:right;font-weight:600">${a.quantite.toLocaleString('fr-FR')} ${a.unite}</td>
                                    <td style="padding:5px 8px"><span class="status ${st.cls}" style="font-size:0.72rem">${st.label}</span></td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    ${projet ? `<button class="detail-link-btn" style="margin-top:8px" onclick="openDetailModal('projets-table', document.querySelector('#projets-table tbody tr'))">
                        <i class="fas fa-arrow-right"></i> Fiche projet
                    </button>` : ''}
                </div>
            </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
}

// ── Peuplement des selects dans les modals ─────────────
function populateStockSelects() {
    const articles  = getArticles();
    const projets   = [];

    const emplacements = ['Entrepôt central', 'Entrepôt A', 'Entrepôt B',
        ...projets.map(p => p.reference)];
    const uniq = [...new Set([...emplacements, ...articles.map(a => a.emplacement)])].filter(Boolean);

    // Filtre emplacement principal
    const emplacFilter = document.getElementById('stock-emplacement-filter');
    if (emplacFilter) {
        const cur = emplacFilter.value;
        emplacFilter.innerHTML = `<option value="">— Tous les emplacements —</option>` +
            uniq.map(e => `<option value="${e}" ${e===cur?'selected':''}>${emplacementLabel(e)}</option>`).join('');
    }

    // Form nouvel article - emplacement
    const formEmpl = document.getElementById('stock-form-emplacement');
    if (formEmpl) {
        formEmpl.innerHTML = uniq.map(e => `<option value="${e}">${emplacementLabel(e)}</option>`).join('');
    }

    // Modal mouvement - article select
    const artSelect = document.getElementById('mouvement-article-select');
    if (artSelect) {
        artSelect.innerHTML = `<option value="">Sélectionner un article…</option>` +
            articles.map(a => `<option value="${a.ref}">${a.nom} (${a.ref}) — ${a.quantite} ${a.unite}</option>`).join('');
    }

    // Modal mouvement - source et dest
    ['mouvement-source-select','mouvement-dest-select'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) sel.innerHTML = `<option value="">—</option>` +
            uniq.map(e => `<option value="${e}">${emplacementLabel(e)}</option>`).join('');
    });

    // Modal mouvement - chantier
    const chanSelect = document.getElementById('mouvement-chantier-select');
    if (chanSelect) {
        chanSelect.innerHTML = `<option value="">— Aucun —</option>` +
            projets.map(p => `<option value="${p.reference}">${p.nom} (${p.reference})</option>`).join('');
    }

    // Filtre mouvement - article
    const mvtArtFilter = document.getElementById('mouvement-filter-article');
    if (mvtArtFilter) {
        mvtArtFilter.innerHTML = `<option value="">Tous les articles</option>` +
            articles.map(a => `<option value="${a.ref}">${a.nom}</option>`).join('');
    }
}

// ── Type mouvement → afficher/masquer champs ───────────
function mouvementTypeChange(type) {
    const srcGrp  = document.getElementById('mouvement-source-group');
    const destGrp = document.getElementById('mouvement-dest-group');
    const chanGrp = document.getElementById('mouvement-chantier-group');
    if (!srcGrp) return;

    srcGrp.style.display  = type === 'Entrée'    ? 'none'  : 'block';
    destGrp.style.display = type === 'Sortie'    ? 'none'  : 'block';
    chanGrp.style.display = type === 'Transfert' ? 'none'  : 'block';

    // Pour Entrée : source = rien ; dest = obligatoire
    // Pour Sortie : source = obligatoire ; dest = rien
    // Pour Transfert : source + dest obligatoires, chantier non obligatoire
}

// ── Ouverture rapide mouvement pré-rempli ──────────────
function quickMouvement(ref, type) {
    openModal('modal-mouvement');
    setTimeout(() => {
        const typeEl = document.getElementById('mouvement-type-select');
        const artEl  = document.getElementById('mouvement-article-select');
        if (typeEl) { typeEl.value = type; mouvementTypeChange(type); }
        if (artEl)  artEl.value = ref;
        const dateEl = document.querySelector('#form-mouvement [name="date"]');
        if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
    }, 50);
}

// ── Fiche détail article ───────────────────────────────
function openStockDetail(ref) {
    const articles   = getArticles();
    const mouvements = getMouvements();
    const art = articles.find(a => a.ref === ref);
    if (!art) return;

    const statut = getStockStatut(art);
    const valeur = art.quantite * (art.prix_unitaire || 0);
    const historique = [...mouvements].filter(m => m.article_ref === ref)
        .sort((a, b) => b.date.split('/').reverse().join('').localeCompare(a.date.split('/').reverse().join('')));

    // Calculer les totaux entrées / sorties
    const totalEntrees = historique.filter(m => m.type === 'Entrée').reduce((s,m) => s + Number(m.quantite), 0);
    const totalSorties = historique.filter(m => m.type === 'Sortie').reduce((s,m) => s + Number(m.quantite), 0);

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
                <!-- Infos générales -->
                <div class="detail-section">
                    <h4>📦 Informations de l'article</h4>
                    <div class="detail-grid">
                        <div class="detail-field"><label>Référence</label><span>${art.ref}</span></div>
                        <div class="detail-field"><label>Catégorie</label><span>${art.categorie}</span></div>
                        <div class="detail-field"><label>Emplacement</label><span>${emplacementLabel(art.emplacement)}</span></div>
                        <div class="detail-field"><label>Unité</label><span>${art.unite}</span></div>
                        <div class="detail-field"><label>Prix unitaire</label><span>${art.prix_unitaire ? art.prix_unitaire.toLocaleString('fr-FR') + ' Ar' : '—'}</span></div>
                        <div class="detail-field"><label>Seuil alerte</label><span>${art.seuil_alerte || '—'}</span></div>
                        ${art.notes ? `<div class="detail-field" style="grid-column:1/-1"><label>Notes</label><span>${art.notes}</span></div>` : ''}
                    </div>
                </div>

                <!-- Situation stock -->
                <div class="detail-section">
                    <h4>📊 Situation actuelle</h4>
                    <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
                        <div style="text-align:center;padding:14px 20px;background:${statut.cls === 'success' ? '#f0fdf4' : statut.cls === 'warning' ? '#fffbeb' : '#fef2f2'};border-radius:10px;border:1px solid ${statut.cls === 'success' ? '#86efac' : statut.cls === 'warning' ? '#fde68a' : '#fca5a5'}">
                            <div style="font-size:1.8rem;font-weight:800;color:${statut.cls === 'success' ? '#15803d' : statut.cls === 'warning' ? '#d97706' : '#dc2626'}">${art.quantite.toLocaleString('fr-FR')}</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:2px">${art.unite} en stock</div>
                            <span class="status ${statut.cls}" style="margin-top:6px;display:inline-block">${statut.label}</span>
                        </div>
                        <div style="text-align:center;padding:14px 20px;background:#f0f9ff;border-radius:10px;border:1px solid #bae6fd">
                            <div style="font-size:1.8rem;font-weight:800;color:#0369a1">${totalEntrees.toLocaleString('fr-FR')}</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:2px">${art.unite} entrées total</div>
                        </div>
                        <div style="text-align:center;padding:14px 20px;background:#fff7ed;border-radius:10px;border:1px solid #fed7aa">
                            <div style="font-size:1.8rem;font-weight:800;color:#c2410c">${totalSorties.toLocaleString('fr-FR')}</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:2px">${art.unite} sorties total</div>
                        </div>
                        <div style="text-align:center;padding:14px 20px;background:#f5f3ff;border-radius:10px;border:1px solid #ddd6fe">
                            <div style="font-size:1.1rem;font-weight:800;color:#6d28d9">${valeur.toLocaleString('fr-FR')} Ar</div>
                            <div style="font-size:0.8rem;color:#64748b;margin-top:2px">Valeur actuelle</div>
                        </div>
                    </div>
                </div>

                <!-- Historique mouvements -->
                <div class="detail-section">
                    <h4>📋 Historique des mouvements</h4>
                    ${historique.length ? `
                    <table class="detail-subtable">
                        <thead>
                            <tr>
                                <th>Date</th><th>Type</th><th>Quantité</th>
                                <th>Source</th><th>Destination</th><th>Chantier</th><th>Motif</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historique.map(m => {
                                const ic  = m.type === 'Entrée' ? '📥' : m.type === 'Sortie' ? '📤' : '🔄';
                                const cls = m.type === 'Entrée' ? 'success' : m.type === 'Sortie' ? 'error' : 'active';
                                return `<tr>
                                    <td>${m.date}</td>
                                    <td><span class="status ${cls}" style="font-size:0.72rem">${ic} ${m.type}</span></td>
                                    <td><strong>${Number(m.quantite).toLocaleString('fr-FR')} ${art.unite}</strong></td>
                                    <td style="font-size:0.8rem">${m.emplacement_source ? emplacementLabel(m.emplacement_source) : '—'}</td>
                                    <td style="font-size:0.8rem">${m.emplacement_dest   ? emplacementLabel(m.emplacement_dest)   : '—'}</td>
                                    <td style="font-size:0.8rem">${m.chantier           ? emplacementLabel(m.chantier)           : '—'}</td>
                                    <td style="font-size:0.8rem;max-width:160px;white-space:normal">${m.motif || '—'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>` : `<p class="detail-empty">Aucun mouvement enregistré pour cet article</p>`}
                    <div style="display:flex;gap:8px;margin-top:10px">
                        <button class="detail-link-btn" onclick="this.closest('.modal').remove(); quickMouvement('${ref}','Entrée')">
                            <i class="fas fa-arrow-down" style="color:#10b981"></i> Entrée
                        </button>
                        <button class="detail-link-btn" onclick="this.closest('.modal').remove(); quickMouvement('${ref}','Sortie')">
                            <i class="fas fa-arrow-up" style="color:#ef4444"></i> Sortie
                        </button>
                        <button class="detail-link-btn" onclick="this.closest('.modal').remove(); quickMouvement('${ref}','Transfert')">
                            <i class="fas fa-exchange-alt"></i> Transfert
                        </button>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                <button class="btn btn-primary" onclick="this.closest('.modal').remove(); editArticle('${ref}')"><i class="fas fa-edit"></i> Modifier</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// ── Filtres inventaire ─────────────────────────────────
function stockFilterByEmplacement(val) { _stockFilter.emplacement = val; loadStockTable(); }
function stockFilterByCategorie(val)   { _stockFilter.categorie   = val; loadStockTable(); }
function stockSearch(val)              { _stockFilter.search      = val; loadStockTable(); }
function stockResetFilters() {
    _stockFilter = { emplacement:'', categorie:'', search:'' };
    const ids = ['stock-emplacement-filter','stock-categorie-filter','stock-search'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    loadStockTable();
}

// ── Suppression article ───────────────────────────────
function deleteArticle(ref) {
    if (!confirm('Supprimer cet article du stock ?')) return;
    const articles = getArticles();
    const art = articles.find(a => a.ref === ref);
    const remaining = articles.filter(a => a.ref !== ref);
    stockSave(STOCK_KEY, remaining);
    // Sync suppression vers Supabase
    if (typeof db !== 'undefined' && art?.id) {
        db.from('materiels').delete().eq('id', art.id)
          .then(({ error }) => { if (error) console.warn('[Stock] sync delete error:', error.message); });
    } else if (typeof db !== 'undefined' && art?.nom) {
        db.from('materiels').delete().eq('libelle', art.nom)
          .then(({ error }) => { if (error) console.warn('[Stock] sync delete error:', error.message); });
    }
    refreshStock();
    showNotification('Article supprimé', 'info');
}

// ── Édition article (simple) ───────────────────────────
function editArticle(ref) {
    const articles = getArticles();
    const art = articles.find(a => a.ref === ref);
    if (!art) return;

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
}

function saveEditArticle(ref) {
    const articles = getArticles();
    const i = articles.findIndex(a => a.ref === ref);
    if (i < 0) return;
    articles[i].nom          = document.getElementById('ea-nom').value;
    articles[i].categorie    = document.getElementById('ea-cat').value;
    articles[i].quantite     = parseFloat(document.getElementById('ea-qte').value) || 0;
    articles[i].unite        = document.getElementById('ea-unite').value;
    articles[i].prix_unitaire= parseFloat(document.getElementById('ea-prix').value) || 0;
    articles[i].seuil_alerte = parseFloat(document.getElementById('ea-seuil').value) || 0;
    articles[i].notes        = document.getElementById('ea-notes').value;
    stockSave(STOCK_KEY, articles);
    // Sync immédiat vers Supabase
    if (typeof db !== 'undefined') {
        const art = articles[i];
        const payload = {
            libelle: art.nom, quantite: art.quantite, etat: art.categorie,
            chantier_actuel: art.emplacement || null,
            prix_unitaire: art.prix_unitaire || 0, seuil_alerte: art.seuil_alerte || 0
        };
        if (art.id) payload.id = art.id;
        db.from('materiels').upsert(payload, { onConflict: art.id ? 'id' : 'libelle' })
          .then(({ error }) => { if (error) console.warn('[Stock] sync edit error:', error.message); });
    }
    document.querySelector('.modal.active')?.remove();
    refreshStock();
    showNotification('Article mis à jour', 'success');
}

// ── Soumettre formulaire nouvel article ────────────────
function initStockForm() {
    const form = document.getElementById('form-stock');
    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(this);
        const articles = getArticles();
        const newRef = 'STK-' + String(articles.length + 1).padStart(3, '0');
        const art = {
            ref:          newRef,
            nom:          fd.get('nom'),
            categorie:    fd.get('categorie'),
            emplacement:  fd.get('emplacement'),
            quantite:     parseFloat(fd.get('quantite')) || 0,
            unite:        fd.get('unite'),
            prix_unitaire:parseFloat(fd.get('prix_unitaire')) || 0,
            seuil_alerte: parseFloat(fd.get('seuil_alerte')) || 0,
            notes:        fd.get('notes') || ''
        };

        // Enregistrer aussi un mouvement d'entrée initial
        if (art.quantite > 0) {
            const mvts = getMouvements();
            mvts.push({
                id: 'MVT-' + String(mvts.length + 1).padStart(3,'0'),
                date: new Date().toLocaleDateString('fr-FR'),
                type: 'Entrée',
                article_ref: newRef,
                nom_article: art.nom,
                quantite: art.quantite,
                emplacement_source: '',
                emplacement_dest: art.emplacement,
                chantier: '',
                motif: 'Stock initial',
                saisi_par: ''
            });
            stockSave(MOUVEMENT_KEY, mvts);
        }

        articles.push(art);
        stockSave(STOCK_KEY, articles);
        // Sync immédiat vers Supabase — stocker l'id retourné pour les futurs upserts
        if (typeof db !== 'undefined') {
            const payload = {
                libelle: art.nom, quantite: art.quantite, etat: art.categorie,
                chantier_actuel: art.emplacement || null,
                prix_unitaire: art.prix_unitaire || 0,
                fournisseur: '',
                seuil_alerte: art.seuil_alerte || 0
            };
            db.from('materiels').upsert(payload, { onConflict: 'libelle' }).select('id').single()
              .then(({ data: row, error }) => {
                  if (error) { console.warn('[Stock] sync insert error:', error.message); return; }
                  if (row?.id) {
                      const all = getArticles();
                      const idx = all.findIndex(a => a.ref === art.ref);
                      if (idx >= 0) { all[idx].id = row.id; stockSave(STOCK_KEY, all); }
                  }
              });
        }
        closeModal('modal-stock');
        this.reset();
        refreshStock();
        showNotification(`Article ${art.nom} créé !`, 'success');
    });
}

// ── Soumettre formulaire mouvement ─────────────────────
function initMouvementForm() {
    const form = document.getElementById('form-mouvement');
    if (!form) return;
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const fd = new FormData(this);
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

        const articles = getArticles();
        const artIdx   = articles.findIndex(a => a.ref === artRef);
        if (artIdx < 0) { showNotification('Article introuvable', 'error'); return; }

        const art = articles[artIdx];

        // Vérifier stock suffisant pour sortie
        if (type === 'Sortie' || type === 'Transfert') {
            if (qte > art.quantite) {
                showNotification(`Stock insuffisant : seulement ${art.quantite} ${art.unite} disponibles`, 'error');
                return;
            }
        }

        // Mettre à jour quantité
        if (type === 'Entrée')    articles[artIdx].quantite += qte;
        if (type === 'Sortie')    articles[artIdx].quantite -= qte;
        if (type === 'Transfert') articles[artIdx].quantite -= qte; // dans la même fiche (emplacement source)

        // Si transfert : mettre à jour ou créer l'article à destination
        if (type === 'Transfert' && dest) {
            const destArt = articles.find(a => a.ref === artRef && a.emplacement === dest);
            if (destArt) {
                destArt.quantite += qte;
            } else {
                articles.push({ ...art, emplacement: dest, quantite: qte, ref: artRef + '-' + dest });
            }
        }

        stockSave(STOCK_KEY, articles);

        // Enregistrer mouvement
        const mvts = getMouvements();
        const dateVal = fd.get('date');
        const dateStr = dateVal
            ? new Date(dateVal).toLocaleDateString('fr-FR')
            : new Date().toLocaleDateString('fr-FR');

        mvts.push({
            id: 'MVT-' + String(mvts.length + 1).padStart(3,'0'),
            date: dateStr,
            type,
            article_ref: artRef,
            nom_article: art.nom,
            quantite: qte,
            emplacement_source: src,
            emplacement_dest: dest,
            chantier: chant,
            motif: fd.get('motif') || '',
            saisi_par: fd.get('saisi_par') || ''
        });
        stockSave(MOUVEMENT_KEY, mvts);

        closeModal('modal-mouvement');
        this.reset();
        refreshStock();

        // Alerte stock bas après mouvement
        const updated = articles[artIdx];
        if (updated.seuil_alerte && updated.quantite <= updated.seuil_alerte) {
            setTimeout(() => showNotification(`⚠️ Alerte : stock de "${updated.nom}" est bas (${updated.quantite} ${updated.unite})`, 'error'), 500);
        }
        showNotification(`Mouvement "${type}" enregistré pour ${art.nom}`, 'success');
    });
}

// ── Alertes stock bas ──────────────────────────────────
function checkStockAlertes() {
    const articles = getArticles();
    const bas = articles.filter(a => a.seuil_alerte && a.quantite <= a.seuil_alerte && a.quantite > 0);
    const epuises = articles.filter(a => a.quantite <= 0);

    if (bas.length || epuises.length) {
        // Mettre à jour le badge notifications dans le header si possible
        const badge = document.querySelector('.notifications .badge');
        if (badge) badge.textContent = bas.length + epuises.length;
    }
}

// ── Refresh global ─────────────────────────────────────
function refreshStock() {
    populateStockSelects();
    loadStockTable();
    loadMouvementsTable();
    updateStockStats();
    renderStockParChantier();
    checkStockAlertes();
    renderAffectationsFutures();
}

// ── Init au chargement ─────────────────────────────────
async function initStockModule() {
    stockInitData();
    if (typeof db !== 'undefined') {
        await stockLoadFromSupabase();
    }
    populateStockSelects();
    loadStockTable();
    loadMouvementsTable();
    updateStockStats();
    renderStockParChantier();
    initStockForm();
    initMouvementForm();
    checkStockAlertes();
    injectAffectationsFuturesUI();

    // Ré-init quand on navigue vers logistique
    document.querySelectorAll('.nav-item[data-section="logistique"]').forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(() => {
                refreshStock();
                stockSyncToSupabase();
                renderAffectationsFutures();
            }, 100);
        });
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStockModule);
} else {
    initStockModule();
}

// ══════════════════════════════════════════════════════════════
// AFFECTATIONS FUTURES — planifier l'usage d'un matériel
// ══════════════════════════════════════════════════════════════

const AFFECTATION_KEY = 'nysoa_affectations_futures';

function getAffectations() {
    try {
        const v = localStorage.getItem(AFFECTATION_KEY);
        return v ? JSON.parse(v) : [];
    } catch(e) { return []; }
}
function saveAffectations(data) {
    localStorage.setItem(AFFECTATION_KEY, JSON.stringify(data));
}

// ── Ouvrir modal affectation future ───────────────────────────
function openAffectationModal(artRef) {
    const articles = getArticles();
    const art = artRef ? articles.find(a => a.ref === artRef) : null;

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
                        ${articles.map(a => `<option value="${a.ref}" ${a.ref===artRef?'selected':''}>${a.nom} (stock : ${a.quantite} ${a.unite})</option>`).join('')}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Quantité prévue *</label>
                        <input type="number" id="aff-qte" min="0" step="any" placeholder="0" style="width:100%">
                    </div>
                    <div class="form-group">
                        <label>Date prévue *</label>
                        <input type="date" id="aff-date" value="${new Date().toISOString().split('T')[0]}" style="width:100%">
                    </div>
                </div>
                <div class="form-group">
                    <label>Chantier de destination *</label>
                    <input type="text" id="aff-chantier" placeholder="Nom du chantier" style="width:100%">
                </div>
                <div class="form-group">
                    <label>Responsable</label>
                    <input type="text" id="aff-responsable" placeholder="Nom du responsable" style="width:100%">
                </div>
                <div class="form-group">
                    <label>Remarques</label>
                    <textarea id="aff-notes" rows="2" placeholder="Détails, conditions, urgence…" style="width:100%"></textarea>
                </div>
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

    // Vérification stock disponible à la saisie
    document.getElementById('aff-qte').addEventListener('input', checkStockDisponible);
    document.getElementById('aff-article').addEventListener('change', checkStockDisponible);
}

function checkStockDisponible() {
    const ref = document.getElementById('aff-article')?.value;
    const qte = parseFloat(document.getElementById('aff-qte')?.value) || 0;
    const warn = document.getElementById('aff-stock-warning');
    const warnText = document.getElementById('aff-stock-warning-text');
    if (!ref || !warn) return;

    const art = getArticles().find(a => a.ref === ref);
    if (!art) return;

    // Stock déjà réservé par d'autres affectations futures non réalisées
    const deja = getAffectations()
        .filter(a => a.article_ref === ref && a.statut === 'Planifié')
        .reduce((s, a) => s + Number(a.quantite), 0);

    const dispo = art.quantite - deja;

    if (qte > dispo) {
        warn.style.display = 'block';
        warnText.textContent = `Stock disponible : ${dispo} ${art.unite} (${art.quantite} en stock − ${deja} déjà réservés). Votre demande de ${qte} dépasse le disponible.`;
    } else {
        warn.style.display = 'none';
    }
}

function saveAffectation() {
    const ref       = document.getElementById('aff-article')?.value;
    const qte       = parseFloat(document.getElementById('aff-qte')?.value) || 0;
    const date      = document.getElementById('aff-date')?.value;
    const chantier  = document.getElementById('aff-chantier')?.value?.trim();
    const resp      = document.getElementById('aff-responsable')?.value?.trim();
    const notes     = document.getElementById('aff-notes')?.value?.trim();

    if (!ref || !qte || !date || !chantier) {
        showNotification('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }

    const art = getArticles().find(a => a.ref === ref);
    if (!art) return;

    const affectations = getAffectations();
    affectations.push({
        id:           'AFF-' + Date.now(),
        article_ref:  ref,
        nom_article:  art.nom,
        unite:        art.unite,
        quantite:     qte,
        date_prevue:  date,
        chantier,
        responsable:  resp || '',
        notes:        notes || '',
        statut:       'Planifié',   // Planifié | Réalisé | Annulé
        date_creation: new Date().toISOString().split('T')[0],
    });
    saveAffectations(affectations);

    document.getElementById('modal-affectation-future')?.remove();
    renderAffectationsFutures();
    showNotification(`Affectation planifiée : ${qte} ${art.unite} de "${art.nom}" → ${chantier}`, 'success');
}

// ── Changer statut affectation ────────────────────────────────
function updateStatutAffectation(id, newStatut) {
    const affectations = getAffectations();
    const i = affectations.findIndex(a => a.id === id);
    if (i < 0) return;

    if (newStatut === 'Réalisé') {
        // Créer automatiquement un mouvement de sortie
        const aff = affectations[i];
        const articles = getArticles();
        const artIdx = articles.findIndex(a => a.ref === aff.article_ref);
        if (artIdx >= 0) {
            if (aff.quantite > articles[artIdx].quantite) {
                showNotification(`Stock insuffisant pour réaliser (${articles[artIdx].quantite} ${aff.unite} dispo)`, 'error');
                return;
            }
            articles[artIdx].quantite -= aff.quantite;
            stockSave(STOCK_KEY, articles);

            const mvts = getMouvements();
            mvts.push({
                id: 'MVT-' + String(mvts.length + 1).padStart(3,'0'),
                date: new Date().toLocaleDateString('fr-FR'),
                type: 'Sortie',
                article_ref: aff.article_ref,
                nom_article: aff.nom_article,
                quantite: aff.quantite,
                emplacement_source: articles[artIdx]?.emplacement || '',
                emplacement_dest: aff.chantier,
                chantier: aff.chantier,
                motif: `Affectation planifiée ${aff.id}`,
                saisi_par: aff.responsable || '',
            });
            stockSave(MOUVEMENT_KEY, mvts);
            showNotification(`Mouvement de sortie créé automatiquement`, 'success');
        }
    }

    affectations[i].statut = newStatut;
    saveAffectations(affectations);
    refreshStock();
    renderAffectationsFutures();
}

function supprimerAffectation(id) {
    if (!confirm('Supprimer cette affectation planifiée ?')) return;
    saveAffectations(getAffectations().filter(a => a.id !== id));
    renderAffectationsFutures();
    showNotification('Affectation supprimée', 'info');
}

// ── Rendu du tableau affectations futures ─────────────────────
function renderAffectationsFutures() {
    const container = document.getElementById('affectations-futures-body');
    if (!container) return;

    const affectations = getAffectations()
        .sort((a, b) => a.date_prevue.localeCompare(b.date_prevue));

    const today = new Date().toISOString().split('T')[0];

    if (!affectations.length) {
        container.innerHTML = '<p style="text-align:center;color:#94a3b8;font-style:italic;padding:20px">Aucune affectation planifiée</p>';
        return;
    }

    const statutCls = { 'Planifié': 'active', 'Réalisé': 'success', 'Annulé': 'error' };
    const statutIco = { 'Planifié': '📅', 'Réalisé': '✅', 'Annulé': '❌' };

    container.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Date prévue</th>
                    <th>Matériel</th>
                    <th>Quantité</th>
                    <th>Chantier</th>
                    <th>Responsable</th>
                    <th>Remarques</th>
                    <th>Statut</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${affectations.map(a => {
                    const enRetard = a.statut === 'Planifié' && a.date_prevue < today;
                    return `<tr style="${enRetard ? 'background:#fff7ed' : ''}">
                        <td>
                            ${a.date_prevue}
                            ${enRetard ? '<br><span style="color:#ef4444;font-size:0.75rem;font-weight:600">⚠️ En retard</span>' : ''}
                        </td>
                        <td><strong>${a.nom_article}</strong></td>
                        <td>${Number(a.quantite).toLocaleString('fr-FR')} ${a.unite}</td>
                        <td>🏗️ ${a.chantier}</td>
                        <td>${a.responsable || '—'}</td>
                        <td style="font-size:0.8rem;max-width:140px;white-space:normal">${a.notes || '—'}</td>
                        <td><span class="status ${statutCls[a.statut] || 'active'}" style="font-size:0.75rem">${statutIco[a.statut]} ${a.statut}</span></td>
                        <td>
                            <div style="display:flex;gap:4px;flex-wrap:wrap">
                                ${a.statut === 'Planifié' ? `
                                    <button class="btn-icon" title="Marquer réalisé" onclick="updateStatutAffectation('${a.id}','Réalisé')" style="color:#10b981"><i class="fas fa-check"></i></button>
                                    <button class="btn-icon" title="Annuler" onclick="updateStatutAffectation('${a.id}','Annulé')" style="color:#f59e0b"><i class="fas fa-ban"></i></button>
                                ` : ''}
                                <button class="btn-icon" title="Supprimer" onclick="supprimerAffectation('${a.id}')" style="color:#ef4444"><i class="fas fa-trash"></i></button>
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

    // Mettre à jour le compteur dans le header de la carte
    const badge = document.getElementById('aff-futures-count');
    const planifies = affectations.filter(a => a.statut === 'Planifié').length;
    if (badge) badge.textContent = planifies ? `${planifies} en attente` : '';
}

// ── Connecter import Excel → rafraîchir l'affichage local ─────
// Remplacer loadLogistiqueTable (appelé par import-excel.js)
function loadLogistiqueTable() {
    refreshStock();
    renderAffectationsFutures();
}

// ── Ajouter le bloc affectations futures dans la section logistique
function injectAffectationsFuturesUI() {
    const logSection = document.getElementById('logistique');
    if (!logSection) return;
    if (document.getElementById('affectations-futures-card')) return; // déjà injecté

    // Bouton dans l'en-tête de section
    const headerActions = logSection.querySelector('.header-actions');
    if (headerActions) {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary';
        btn.style.background = 'linear-gradient(135deg,#7c3aed,#a855f7)';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.innerHTML = '<i class="fas fa-calendar-plus"></i> Planifier une affectation';
        btn.onclick = () => openAffectationModal(null);
        headerActions.insertBefore(btn, headerActions.firstChild);
    }

    // Carte affectations futures
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'affectations-futures-card';
    card.style.marginTop = '20px';
    card.innerHTML = `
        <div class="card-header" style="background:linear-gradient(135deg,#7c3aed20,#a855f720);border-bottom:1px solid #ddd6fe">
            <h3 style="color:#6d28d9">📅 Affectations futures planifiées <span id="aff-futures-count" style="font-size:0.78rem;color:#7c3aed;font-weight:500;margin-left:8px"></span></h3>
            <div class="card-actions">
                <button class="btn-small" onclick="openAffectationModal(null)" style="background:#7c3aed;color:white;border:none">
                    <i class="fas fa-plus"></i> Nouvelle
                </button>
                <button class="btn-small" onclick="exportAffectations()">
                    <i class="fas fa-file-excel"></i> Excel
                </button>
            </div>
        </div>
        <div class="card-body" id="affectations-futures-body">
            <p style="text-align:center;color:#94a3b8;font-style:italic;padding:20px">Chargement…</p>
        </div>`;

    // Insérer avant "Stock par chantier"
    const stockParChantier = logSection.querySelector('.card:last-of-type');
    if (stockParChantier) {
        logSection.insertBefore(card, stockParChantier);
    } else {
        logSection.appendChild(card);
    }

    // Bouton "Planifier" dans chaque ligne d'article
    renderAffectationsFutures();
}

// ── Export affectations Excel ─────────────────────────────────
function exportAffectations() {
    const aff = getAffectations();
    if (!aff.length) { showNotification('Aucune affectation à exporter', 'warning'); return; }
    const rows = [['Date prévue','Matériel','Quantité','Unité','Chantier','Responsable','Statut','Remarques']];
    aff.forEach(a => rows.push([a.date_prevue, a.nom_article, a.quantite, a.unite, a.chantier, a.responsable, a.statut, a.notes]));
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Affectations');
    XLSX.writeFile(wb, 'affectations_futures_nysoa.xlsx');
}

// ── Bouton "Planifier" dans la fiche article ──────────────────
// Patch renderArticleRow pour ajouter le bouton
const _origRenderArticleRow = renderArticleRow;

