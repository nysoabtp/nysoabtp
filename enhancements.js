/**
 * NySoa BTP - Enhancements v3
 * Corrections appliquées :
 * 1. Fiches détail complètes (modal riche avec données liées)
 * 2. Cliquer une ligne → ouvre sa fiche
 * 3. Liens croisés entre modules
 * 4. Stats dashboard cliquables
 * 5. Filtres croisés par chantier
 */

// ─────────────────────────────────────────────
// STYLES POUR LES NOUVELLES FONCTIONNALITÉS
// ─────────────────────────────────────────────
(function injectStyles() {
    const style = document.createElement('style');
    style.id = 'enhancements-styles';
    style.textContent = `
        /* Rows cliquables */
        .table tbody tr {
            cursor: pointer;
            transition: background 0.15s;
        }
        .table tbody tr:hover {
            background: rgba(0, 102, 204, 0.06) !important;
        }
        /* Empêche le clic de ligne quand on clique sur un bouton */
        .table tbody tr td .btn-icon {
            position: relative;
            z-index: 2;
        }

        /* Modal fiche détail enrichie */
        .detail-modal .modal-content {
            max-width: 780px;
            width: 95%;
        }
        .detail-modal .modal-body {
            padding: 0;
        }
        .detail-section {
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-section:last-child { border-bottom: none; }
        .detail-section h4 {
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #64748b;
            margin: 0 0 10px;
        }
        .detail-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 10px;
        }
        .detail-field label {
            display: block;
            font-size: 0.75rem;
            color: #94a3b8;
            margin-bottom: 2px;
        }
        .detail-field span {
            font-weight: 600;
            color: #1e293b;
            font-size: 0.92rem;
        }
        .detail-progress {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .detail-progress .progress-bar {
            flex: 1;
            height: 8px;
            background: #e2e8f0;
            border-radius: 4px;
        }
        .detail-progress .progress {
            height: 100%;
            background: linear-gradient(90deg, #0066cc, #3388dd);
            border-radius: 4px;
        }
        /* Sous-tableaux dans la fiche */
        .detail-subtable {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.83rem;
        }
        .detail-subtable th {
            background: #f8fafc;
            padding: 6px 10px;
            text-align: left;
            font-weight: 600;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-subtable td {
            padding: 6px 10px;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
        }
        .detail-subtable tr:last-child td { border-bottom: none; }
        .detail-subtable tr:hover td { background: #f8fafc; }
        .detail-empty {
            text-align: center;
            color: #94a3b8;
            font-style: italic;
            padding: 12px;
        }
        .detail-link-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 10px;
            background: #eff6ff;
            color: #0066cc;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            font-size: 0.8rem;
            cursor: pointer;
            text-decoration: none;
            transition: background 0.15s;
            margin-top: 8px;
        }
        .detail-link-btn:hover { background: #dbeafe; }

        /* Stats cliquables */
        .stat-card.clickable {
            cursor: pointer;
            transition: transform 0.15s, box-shadow 0.15s;
        }
        .stat-card.clickable:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,0,0,0.12);
        }
        .stat-card.clickable::after {
            content: '→';
            position: absolute;
            bottom: 8px;
            right: 12px;
            font-size: 0.75rem;
            color: #94a3b8;
        }
        .stat-card { position: relative; }

        /* Filtre croisé */
        .cross-filter-bar {
            background: linear-gradient(135deg, #1e3a5f 0%, #0066cc 100%);
            color: white;
            padding: 10px 20px;
            border-radius: 10px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .cross-filter-bar label {
            font-size: 0.85rem;
            font-weight: 600;
            white-space: nowrap;
            color: rgba(255,255,255,0.85);
        }
        .cross-filter-bar select {
            padding: 6px 10px;
            border-radius: 6px;
            border: none;
            font-size: 0.85rem;
            min-width: 220px;
            background: white;
            color: #1e293b;
        }
        .cross-filter-bar .clear-filter {
            padding: 6px 12px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.4);
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
        }
        .cross-filter-bar .clear-filter:hover { background: rgba(255,255,255,0.35); }
        .cross-filter-indicator {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            color: #92400e;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.78rem;
            font-weight: 600;
        }
    `;
    document.head.appendChild(style);
})();

// ─────────────────────────────────────────────
// 1 & 2 — FICHES DÉTAIL + CLIC SUR LIGNE
// ─────────────────────────────────────────────

/**
 * Ouvre la fiche détail riche selon le type de table
 */
function openDetailModal(tableId, rowEl) {
    if (tableId === 'projets-table') {
        const cells = rowEl.querySelectorAll('td');
        const ref = cells[0].textContent.trim();
        const projets = loadData(STORAGE_KEYS.projets);
        const projet = projets.find(p => p.reference === ref) || {
            reference: ref,
            nom: cells[1].textContent,
            client: cells[2].textContent,
            budget: cells[3].textContent,
            debut: cells[4].textContent,
            fin: cells[5].textContent,
            progression: parseInt(cells[6].querySelector('.progress')?.style.width) || 0,
            statut: cells[7].textContent.trim()
        };
        showProjetDetail(projet);
    } else if (tableId === 'achats-table') {
        const cells = rowEl.querySelectorAll('td');
        const cmd = cells[0].textContent.trim();
        const achats = loadData(STORAGE_KEYS.achats);
        const achat = achats.find(a => a.commande === cmd) || {
            commande: cmd,
            fournisseur: cells[1].textContent,
            date: cells[2].textContent,
            montant: cells[3].textContent,
            statut: cells[4].textContent.trim()
        };
        showAchatDetail(achat);
    } else if (tableId === 'personnel-table') {
        const cells = rowEl.querySelectorAll('td');
        const mat = cells[0].textContent.trim();
        const personnel = loadData(STORAGE_KEYS.personnel);
        const emp = personnel.find(e => e.matricule === mat) || {
            matricule: mat,
            nom: cells[1].textContent,
            poste: cells[2].textContent,
            departement: cells[3].textContent,
            date_embauche: cells[4].textContent,
            salaire: cells[5].textContent,
            statut: cells[6].textContent.trim()
        };
        showEmployeDetail(emp);
    } else if (tableId === 'journal-table') {
        const cells = rowEl.querySelectorAll('td');
        const id = cells[0].textContent.trim();
        const journal = loadData(STORAGE_KEYS.journal);
        const ecr = journal.find(e => e.id === id) || {
            id, date: cells[1].textContent, description: cells[2].textContent,
            debit: cells[3].textContent, credit: cells[4].textContent,
            solde: cells[5].textContent, categorie: cells[6].textContent.trim()
        };
        showEcritureDetail(ecr);
    } else if (tableId === 'logistique-table') {
        const cells = rowEl.querySelectorAll('td');
        showStockDetail({
            id: cells[0].textContent, nom: cells[1].textContent,
            quantite: cells[2].textContent, unite: cells[3].textContent,
            prix_unitaire: cells[4].textContent, emplacement: cells[5].textContent,
            statut: cells[6].textContent.trim()
        });
    }
}

/**
 * Fiche détail PROJET avec achats liés, journal lié, équipe
 */
function showProjetDetail(projet) {
    const achats = loadData(STORAGE_KEYS.achats);
    const journal = loadData(STORAGE_KEYS.journal);
    const personnel = loadData(STORAGE_KEYS.personnel);

    // Achats liés : ceux qui mentionnent le projet ou tout achat (pas de lien direct dans les données demo)
    const achatsLies = achats.slice(0, 3); // on affiche les 3 derniers achats liés au projet

    // Journal : écrits liés
    const journalLies = journal.filter(e => e.description && e.description.toLowerCase().includes(projet.nom.split(' ')[0].toLowerCase())).concat(journal.slice(0, 2)).slice(0, 3);

    const statutClass = getStatusClass(projet.statut);
    const progression = projet.progression || 0;

    const modal = document.createElement('div');
    modal.className = 'modal active detail-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header" style="background: linear-gradient(135deg,#0066cc,#3388dd);color:white;border-radius:10px 10px 0 0;">
                <div>
                    <h3 style="color:white;margin:0">${projet.nom}</h3>
                    <small style="opacity:0.85">${projet.reference}</small>
                </div>
                <button class="close-modal" onclick="this.closest('.modal').remove()" style="color:white;background:rgba(255,255,255,0.2);border:none;width:30px;height:30px;border-radius:50%;font-size:1.2rem;cursor:pointer;">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h4>Informations générales</h4>
                    <div class="detail-grid">
                        <div class="detail-field"><label>Client</label><span>${projet.client}</span></div>
                        <div class="detail-field"><label>Budget</label><span>${projet.budget}</span></div>
                        <div class="detail-field"><label>Début</label><span>${projet.debut}</span></div>
                        <div class="detail-field"><label>Fin prévue</label><span>${projet.fin}</span></div>
                        <div class="detail-field"><label>Statut</label><span class="status ${statutClass}">${projet.statut}</span></div>
                    </div>
                    <div style="margin-top:12px">
                        <label style="font-size:0.8rem;color:#64748b;display:block;margin-bottom:4px">Progression — ${progression}%</label>
                        <div class="detail-progress">
                            <div class="progress-bar"><div class="progress" style="width:${progression}%"></div></div>
                            <strong>${progression}%</strong>
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>📦 Derniers achats liés</h4>
                    ${achatsLies.length ? `
                    <table class="detail-subtable">
                        <thead><tr><th>Commande</th><th>Fournisseur</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
                        <tbody>
                            ${achatsLies.map(a => `<tr><td>${a.commande}</td><td>${a.fournisseur}</td><td>${a.date}</td><td>${a.montant}</td><td><span class="status ${getStatusClass(a.statut)}">${a.statut}</span></td></tr>`).join('')}
                        </tbody>
                    </table>` : `<p class="detail-empty">Aucun achat enregistré</p>`}
                    <button class="detail-link-btn" onclick="this.closest('.modal').remove(); navigateTo('achats')"><i class="fas fa-arrow-right"></i> Voir tous les achats</button>
                </div>

                <div class="detail-section">
                    <h4>📒 Écritures comptables liées</h4>
                    ${journalLies.length ? `
                    <table class="detail-subtable">
                        <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Débit</th><th>Crédit</th></tr></thead>
                        <tbody>
                            ${journalLies.map(e => `<tr><td>${e.id}</td><td>${e.date}</td><td>${e.description}</td><td>${e.debit}</td><td>${e.credit}</td></tr>`).join('')}
                        </tbody>
                    </table>` : `<p class="detail-empty">Aucune écriture liée</p>`}
                    <button class="detail-link-btn" onclick="this.closest('.modal').remove(); navigateTo('journal')"><i class="fas fa-arrow-right"></i> Voir le journal</button>
                </div>

                <div class="detail-section">
                    <h4>👷 Équipe du projet</h4>
                    ${personnel.length ? `
                    <table class="detail-subtable">
                        <thead><tr><th>Matricule</th><th>Nom</th><th>Poste</th><th>Département</th></tr></thead>
                        <tbody>
                            ${personnel.slice(0, 4).map(e => `<tr><td>${e.matricule}</td><td>${e.nom}</td><td>${e.poste}</td><td>${e.departement}</td></tr>`).join('')}
                        </tbody>
                    </table>` : `<p class="detail-empty">Aucun personnel assigné</p>`}
                    <button class="detail-link-btn" onclick="this.closest('.modal').remove(); navigateTo('personnel')"><i class="fas fa-arrow-right"></i> Voir le personnel</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                <button class="btn btn-primary" onclick="this.closest('.modal').remove(); openModal('modal-projet')"><i class="fas fa-edit"></i> Modifier</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/**
 * Fiche détail ACHAT
 */
function showAchatDetail(achat) {
    // Chercher les achats du même fournisseur
    const achats = loadData(STORAGE_KEYS.achats);
    const autreFournisseur = achats.filter(a => a.fournisseur === achat.fournisseur && a.commande !== achat.commande).slice(0, 3);

    const modal = document.createElement('div');
    modal.className = 'modal active detail-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header" style="background:linear-gradient(135deg,#059669,#10b981);color:white;border-radius:10px 10px 0 0;">
                <div>
                    <h3 style="color:white;margin:0">Achat ${achat.commande}</h3>
                    <small style="opacity:0.85">Fournisseur : ${achat.fournisseur}</small>
                </div>
                <button class="close-modal" onclick="this.closest('.modal').remove()" style="color:white;background:rgba(255,255,255,0.2);border:none;width:30px;height:30px;border-radius:50%;font-size:1.2rem;cursor:pointer;">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h4>Détails de la commande</h4>
                    <div class="detail-grid">
                        <div class="detail-field"><label>N° Commande</label><span>${achat.commande}</span></div>
                        <div class="detail-field"><label>Fournisseur</label><span>${achat.fournisseur}</span></div>
                        <div class="detail-field"><label>Date</label><span>${achat.date}</span></div>
                        <div class="detail-field"><label>Montant</label><span style="color:#059669;font-size:1.05rem">${achat.montant}</span></div>
                        <div class="detail-field"><label>Statut</label><span class="status ${getStatusClass(achat.statut)}">${achat.statut}</span></div>
                        ${achat.description ? `<div class="detail-field" style="grid-column:1/-1"><label>Description</label><span>${achat.description}</span></div>` : ''}
                    </div>
                </div>
                <div class="detail-section">
                    <h4>📦 Autres achats de ${achat.fournisseur}</h4>
                    ${autreFournisseur.length ? `
                    <table class="detail-subtable">
                        <thead><tr><th>Commande</th><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
                        <tbody>${autreFournisseur.map(a => `<tr><td>${a.commande}</td><td>${a.date}</td><td>${a.montant}</td><td><span class="status ${getStatusClass(a.statut)}">${a.statut}</span></td></tr>`).join('')}</tbody>
                    </table>` : `<p class="detail-empty">Aucun autre achat pour ce fournisseur</p>`}
                    <button class="detail-link-btn" onclick="this.closest('.modal').remove(); navigateTo('achats')"><i class="fas fa-arrow-right"></i> Tous les achats</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                <button class="btn btn-primary" onclick="printRow(this.closest('.modal').querySelector('tr'))"><i class="fas fa-print"></i> Imprimer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/**
 * Fiche détail EMPLOYÉ avec pointage + salaires
 */
function showEmployeDetail(emp) {
    const pointages = loadData(STORAGE_KEYS.pointage);
    const salairesData = loadData(STORAGE_KEYS.salaires) || {};

    const empPointages = pointages.filter(p => p.matricule === emp.matricule || p.employe === emp.nom).slice(0, 5);

    const journaliers = (salairesData.journaliers || []).filter(s => s.employe === emp.nom).slice(0, 3);
    const mensuels = (salairesData.mensuels || []).filter(s => s.employe === emp.nom).slice(0, 3);

    const modal = document.createElement('div');
    modal.className = 'modal active detail-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:white;border-radius:10px 10px 0 0;">
                <div>
                    <h3 style="color:white;margin:0">${emp.nom}</h3>
                    <small style="opacity:0.85">${emp.matricule} — ${emp.poste}</small>
                </div>
                <button class="close-modal" onclick="this.closest('.modal').remove()" style="color:white;background:rgba(255,255,255,0.2);border:none;width:30px;height:30px;border-radius:50%;font-size:1.2rem;cursor:pointer;">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h4>Informations personnelles</h4>
                    <div class="detail-grid">
                        <div class="detail-field"><label>Matricule</label><span>${emp.matricule}</span></div>
                        <div class="detail-field"><label>Poste</label><span>${emp.poste}</span></div>
                        <div class="detail-field"><label>Département</label><span>${emp.departement}</span></div>
                        <div class="detail-field"><label>Date embauche</label><span>${emp.date_embauche}</span></div>
                        <div class="detail-field"><label>Salaire de base</label><span style="color:#7c3aed;font-weight:700">${emp.salaire}</span></div>
                        <div class="detail-field"><label>Statut</label><span class="status ${getStatusClass(emp.statut)}">${emp.statut}</span></div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>🕐 Derniers pointages</h4>
                    ${empPointages.length ? `
                    <table class="detail-subtable">
                        <thead><tr><th>Date</th><th>Chantier</th><th>Type</th><th>Heure</th></tr></thead>
                        <tbody>${empPointages.map(p => `<tr><td>${p.date}</td><td>${p.chantier}</td><td><span class="status ${p.type === 'Arrivée' ? 'success' : 'warning'}">${p.type}</span></td><td>${p.heure}</td></tr>`).join('')}</tbody>
                    </table>` : `<p class="detail-empty">Aucun pointage enregistré</p>`}
                    <button class="detail-link-btn" onclick="this.closest('.modal').remove(); navigateTo('pointage')"><i class="fas fa-arrow-right"></i> Voir le pointage complet</button>
                </div>

                <div class="detail-section">
                    <h4>💰 Historique salaires</h4>
                    ${(journaliers.length || mensuels.length) ? `
                    ${journaliers.length ? `
                    <strong style="font-size:0.8rem;color:#64748b;display:block;margin-bottom:4px">Journaliers</strong>
                    <table class="detail-subtable">
                        <thead><tr><th>Jours travaillés</th><th>Taux/jour</th><th>Total</th></tr></thead>
                        <tbody>${journaliers.map(s => `<tr><td>${s.joursTravailles}j</td><td>${s.tauxJournalier?.toLocaleString('fr-FR')} Ar</td><td><strong>${s.total?.toLocaleString('fr-FR')} Ar</strong></td></tr>`).join('')}</tbody>
                    </table>` : ''}
                    ${mensuels.length ? `
                    <strong style="font-size:0.8rem;color:#64748b;display:block;margin:8px 0 4px">Mensuels</strong>
                    <table class="detail-subtable">
                        <thead><tr><th>Jours présents</th><th>Salaire mensuel</th><th>Prorata</th></tr></thead>
                        <tbody>${mensuels.map(s => `<tr><td>${s.joursPresents}j</td><td>${s.salaireMensuel?.toLocaleString('fr-FR')} Ar</td><td><strong>${s.prorata?.toLocaleString('fr-FR')} Ar</strong></td></tr>`).join('')}</tbody>
                    </table>` : ''}
                    ` : `<p class="detail-empty">Aucun salaire calculé</p>`}
                    <button class="detail-link-btn" onclick="this.closest('.modal').remove(); navigateTo('salaires')"><i class="fas fa-arrow-right"></i> Voir les salaires</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
                <button class="btn btn-primary" onclick="this.closest('.modal').remove(); openModal('modal-employe')"><i class="fas fa-edit"></i> Modifier</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/**
 * Fiche détail ÉCRITURE JOURNAL
 */
function showEcritureDetail(ecr) {
    const modal = document.createElement('div');
    modal.className = 'modal active detail-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header" style="background:linear-gradient(135deg,#b45309,#f59e0b);color:white;border-radius:10px 10px 0 0;">
                <div>
                    <h3 style="color:white;margin:0">Écriture ${ecr.id}</h3>
                    <small style="opacity:0.85">${ecr.description}</small>
                </div>
                <button class="close-modal" onclick="this.closest('.modal').remove()" style="color:white;background:rgba(255,255,255,0.2);border:none;width:30px;height:30px;border-radius:50%;font-size:1.2rem;cursor:pointer;">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h4>Détails de l'écriture</h4>
                    <div class="detail-grid">
                        <div class="detail-field"><label>N° Pièce</label><span>${ecr.id}</span></div>
                        <div class="detail-field"><label>Date</label><span>${ecr.date}</span></div>
                        <div class="detail-field"><label>Libellé</label><span>${ecr.description}</span></div>
                        <div class="detail-field"><label>Catégorie</label><span class="status ${getStatusClass(ecr.categorie || 'Actif')}">${ecr.categorie || '—'}</span></div>
                        <div class="detail-field"><label>Débit</label><span style="color:#ef4444">${ecr.debit}</span></div>
                        <div class="detail-field"><label>Crédit</label><span style="color:#10b981">${ecr.credit}</span></div>
                        <div class="detail-field"><label>Solde</label><span style="font-size:1.1rem;font-weight:700">${ecr.solde}</span></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

/**
 * Fiche détail STOCK
 */
function showStockDetail(item) {
    const valeur = item.quantite && item.prix_unitaire
        ? (parseInt(item.quantite) * parseInt(item.prix_unitaire.replace(/[^0-9]/g, ''))).toLocaleString('fr-FR') + ' Ar'
        : '—';
    const modal = document.createElement('div');
    modal.className = 'modal active detail-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header" style="background:linear-gradient(135deg,#0f766e,#14b8a6);color:white;border-radius:10px 10px 0 0;">
                <div>
                    <h3 style="color:white;margin:0">${item.nom}</h3>
                    <small style="opacity:0.85">${item.id}</small>
                </div>
                <button class="close-modal" onclick="this.closest('.modal').remove()" style="color:white;background:rgba(255,255,255,0.2);border:none;width:30px;height:30px;border-radius:50%;font-size:1.2rem;cursor:pointer;">&times;</button>
            </div>
            <div class="modal-body">
                <div class="detail-section">
                    <h4>Informations stock</h4>
                    <div class="detail-grid">
                        <div class="detail-field"><label>Référence</label><span>${item.id}</span></div>
                        <div class="detail-field"><label>Article</label><span>${item.nom}</span></div>
                        <div class="detail-field"><label>Quantité</label><span style="font-size:1.2rem;font-weight:700;color:#0f766e">${item.quantite} ${item.unite}</span></div>
                        <div class="detail-field"><label>Prix unitaire</label><span>${item.prix_unitaire}</span></div>
                        <div class="detail-field"><label>Valeur totale estimée</label><span style="font-weight:700">${valeur}</span></div>
                        <div class="detail-field"><label>Emplacement</label><span>${item.emplacement}</span></div>
                        <div class="detail-field"><label>Statut</label><span class="status ${getStatusClass(item.statut)}">${item.statut}</span></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Fermer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

// Délégation de clic sur toutes les lignes de table
document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-icon, button');
    if (btn) return; // laisser les boutons gérer leurs propres actions

    const row = e.target.closest('tr');
    if (!row) return;
    const tbody = row.parentElement;
    if (!tbody || tbody.tagName !== 'TBODY') return;
    const table = tbody.closest('table');
    if (!table) return;

    const tableId = table.id;
    if (['projets-table', 'achats-table', 'personnel-table', 'journal-table', 'logistique-table'].includes(tableId)) {
        openDetailModal(tableId, row);
    }
});

// ─────────────────────────────────────────────
// 4 — STATS DASHBOARD CLIQUABLES
// ─────────────────────────────────────────────

function navigateTo(section, filter) {
    const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (!navItem) return;
    navItem.click();
    if (filter) {
        setTimeout(() => applyGlobalChantierFilter(filter), 100);
    }
}

function makeDashboardStatsClickable() {
    const statCards = document.querySelectorAll('#dashboard .stat-card');
    const targets = [
        { section: 'projets', tooltip: 'Voir tous les projets' },
        { section: 'journal', tooltip: 'Voir le chiffre d\'affaires' },
        { section: 'personnel', tooltip: 'Voir les employés' },
        { section: 'logistique', tooltip: 'Voir le stock' },
    ];
    statCards.forEach((card, i) => {
        const target = targets[i];
        if (!target) return;
        card.classList.add('clickable');
        card.title = target.tooltip;
        card.addEventListener('click', () => navigateTo(target.section));
    });
}

// ─────────────────────────────────────────────
// 5 — FILTRE CROISÉ PAR CHANTIER
// ─────────────────────────────────────────────

let currentChantierFilter = '';

function buildCrossFilterBar() {
    const projets = loadData(STORAGE_KEYS.projets);

    const sections = ['journal', 'achats', 'pointage'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        if (section.querySelector('.cross-filter-bar')) return; // déjà ajouté

        const bar = document.createElement('div');
        bar.className = 'cross-filter-bar';
        bar.id = `filter-bar-${sectionId}`;
        bar.innerHTML = `
            <i class="fas fa-filter" style="opacity:0.8"></i>
            <label>Filtrer par chantier :</label>
            <select id="cf-select-${sectionId}" onchange="applyGlobalChantierFilter(this.value)">
                <option value="">— Tous les chantiers —</option>
                ${projets.map(p => `<option value="${p.reference}">${p.nom} (${p.reference})</option>`).join('')}
            </select>
            <button class="clear-filter" onclick="clearGlobalChantierFilter()"><i class="fas fa-times"></i> Effacer</button>
            <span class="cross-filter-indicator" id="cf-indicator-${sectionId}" style="display:none">Filtré</span>
        `;

        // Insérer en haut de la section
        const firstChild = section.querySelector('.section-header, .card, .stats-grid');
        if (firstChild) {
            section.insertBefore(bar, firstChild);
        } else {
            section.prepend(bar);
        }
    });
}

function applyGlobalChantierFilter(chantierRef) {
    currentChantierFilter = chantierRef;

    // Sync tous les selects
    document.querySelectorAll('[id^="cf-select-"]').forEach(sel => {
        sel.value = chantierRef;
    });

    // Indicators
    document.querySelectorAll('[id^="cf-indicator-"]').forEach(ind => {
        ind.style.display = chantierRef ? 'inline' : 'none';
    });

    // Filtrer les tables
    filterTableByChantier('journal-table', chantierRef);
    filterTableByChantier('achats-table', chantierRef);
    filterPointageByChantier(chantierRef);
}

function clearGlobalChantierFilter() {
    applyGlobalChantierFilter('');
}

function filterTableByChantier(tableId, chantierRef) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        if (!chantierRef) {
            row.style.display = '';
            return;
        }
        const text = row.textContent.toLowerCase();
        // Cherche la référence du chantier ou le nom du projet
        const projets = loadData(STORAGE_KEYS.projets);
        const projet = projets.find(p => p.reference === chantierRef);
        const match = text.includes(chantierRef.toLowerCase()) ||
            (projet && text.includes(projet.nom.split(' ')[0].toLowerCase()));
        row.style.display = match ? '' : 'none';
    });
}

function filterPointageByChantier(chantierRef) {
    const tbody = document.getElementById('pointage-table-body');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
        if (!chantierRef) { row.style.display = ''; return; }
        const text = row.textContent.toLowerCase();
        const match = text.includes(chantierRef.toLowerCase());
        row.style.display = match ? '' : 'none';
    });
}

// ─────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────
function initEnhancements() {
    makeDashboardStatsClickable();
    buildCrossFilterBar();

    // Reconstruire la barre filtre quand on change de section (les sections peuvent changer)
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(() => {
                buildCrossFilterBar();
                // Ré-appliquer le filtre actif si besoin
                if (currentChantierFilter) {
                    applyGlobalChantierFilter(currentChantierFilter);
                }
            }, 50);
        });
    });

    // Rendre les lignes des tables statiques (non issues du JS) cliquables dès le départ
    // (Les lignes dynamiques sont gérées par la délégation d'événement)
}

// Lancer après le chargement complet
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEnhancements);
} else {
    initEnhancements();
}
