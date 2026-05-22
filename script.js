// Navigation
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const pageTitle = document.getElementById('page-title');

const sectionTitles = {
    'dashboard': 'Tableau de bord',
    'projets': 'Gestion des Projets/Chantiers',
    'achats': 'Gestion des Achats',
    'journal': 'Journal / Comptabilité',
    'logistique': 'Logistique / Gestion des Stocks',
    'personnel': 'Gestion du Personnel',
    'devis': 'Gestion des Devis',
    'proformat': 'Gestion des Proformats',
    'rapports': 'Rapports et Statistiques',
    'pointage': 'Pointage QR Code',
    'salaires': 'Calcul des Salaires'
};

// Data Storage with localStorage
const STORAGE_KEYS = {
    projets: 'erp_projets',
    achats: 'erp_achats',
    journal: 'erp_journal',
    logistique: 'erp_logistique',
    personnel: 'erp_personnel',
    devis: 'erp_devis',
    proformat: 'erp_proformat',
    pointage: 'erp_pointage',
    salaires: 'erp_salaires'
};

// Load data from localStorage
function loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Save data to localStorage
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Initialize data with default values if empty
function initializeData() {
    if (!localStorage.getItem(STORAGE_KEYS.projets)) {
        const defaultProjets = [
            { reference: 'PRJ-001', nom: 'Résidence Les Palmiers', client: 'SCI Immobilier', budget: '850 000 Ar', debut: '15/01/2026', fin: '30/06/2026', progression: 75, statut: 'En cours' },
            { reference: 'PRJ-002', nom: 'Centre Commercial', client: 'Groupe Alpha', budget: '1 200 000 Ar', debut: '01/02/2026', fin: '31/12/2026', progression: 45, statut: 'En cours' },
            { reference: 'PRJ-003', nom: 'Bureau Ecobank', client: 'Ecobank', budget: '450 000 Ar', debut: '10/10/2025', fin: '15/05/2026', progression: 90, statut: 'Bientôt terminé' }
        ];
        saveData(STORAGE_KEYS.projets, defaultProjets);
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.achats)) {
        const defaultAchats = [
            { commande: 'CMD-001', fournisseur: 'Bati Madagascar', date: '12/05/2026', montant: '15 500 Ar', statut: 'Livré' },
            { commande: 'CMD-002', fournisseur: 'Ciments de Madagascar', date: '10/05/2026', montant: '8 200 Ar', statut: 'En transit' },
            { commande: 'CMD-003', fournisseur: 'Matériaux Plus', date: '08/05/2026', montant: '12 800 Ar', statut: 'En attente' }
        ];
        saveData(STORAGE_KEYS.achats, defaultAchats);
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.personnel)) {
        const defaultPersonnel = [
            { matricule: 'EMP-001', nom: 'Jean Razafy', poste: 'Chef de chantier', departement: 'Chantier', date_embauche: '15/01/2024', salaire: '450 000 Ar', statut: 'Actif' },
            { matricule: 'EMP-002', nom: 'Marie Lemaire', poste: 'Comptable', departement: 'Administration', date_embauche: '01/02/2024', salaire: '380 000 Ar', statut: 'Actif' },
            { matricule: 'EMP-003', nom: 'Paul Rasoanaivo', poste: 'Technicien', departement: 'Technique', date_embauche: '10/03/2024', salaire: '320 000 Ar', statut: 'Actif' }
        ];
        saveData(STORAGE_KEYS.personnel, defaultPersonnel);
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.journal)) {
        const defaultJournal = [
            { id: 'ECR-001', date: '15/05/2026', description: 'Achat ciments', debit: '0 Ar', credit: '8 200 Ar', solde: '8 200 Ar', categorie: 'Achats' },
            { id: 'ECR-002', date: '14/05/2026', description: 'Paiement client', debit: '25 000 Ar', credit: '0 Ar', solde: '16 800 Ar', categorie: 'Ventes' },
            { id: 'ECR-003', date: '13/05/2026', description: 'Salaire personnel', debit: '0 Ar', credit: '12 000 Ar', solde: '4 800 Ar', categorie: 'Personnel' }
        ];
        saveData(STORAGE_KEYS.journal, defaultJournal);
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.logistique)) {
        const defaultLogistique = [
            { id: 'STK-001', nom: 'Ciments Portland', quantite: 50, unite: 'sacs', prix_unitaire: '8 500 Ar', emplacement: 'Entrepôt A', statut: 'En stock' },
            { id: 'STK-002', nom: 'Acier 12mm', quantite: 200, unite: 'barres', prix_unitaire: '15 000 Ar', emplacement: 'Entrepôt B', statut: 'En stock' },
            { id: 'STK-003', nom: 'Sable de rivière', quantite: 10, unite: 'm³', prix_unitaire: '45 000 Ar', emplacement: 'Extérieur', statut: 'Stock faible' }
        ];
        saveData(STORAGE_KEYS.logistique, defaultLogistique);
    }
}

// Initialize data on load (seulement si pas de Supabase)
if (typeof initSupabase !== "function") {
    initializeData();
}

// Load data into tables on page load
function loadAllData() {
    loadProjetsTable();
    loadAchatsTable();
    loadPersonnelTable();
    loadJournalTable();
    loadLogistiqueTable();
    updateDashboardStats();
}

// Load journal table from localStorage
function loadJournalTable() {
    const journal = loadData(STORAGE_KEYS.journal);
    const tbody = document.querySelector('#journal-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    journal.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.id}</td>
            <td>${entry.date}</td>
            <td>${entry.description}</td>
            <td>${entry.debit}</td>
            <td>${entry.credit}</td>
            <td>${entry.solde}</td>
            <td><span class="status ${getStatusClass(entry.statut || 'Actif')}">${entry.categorie}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load logistique table from localStorage
function loadLogistiqueTable() {
    const logistique = loadData(STORAGE_KEYS.logistique);
    const tbody = document.querySelector('#logistique-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    logistique.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.nom}</td>
            <td>${item.quantite}</td>
            <td>${item.unite}</td>
            <td>${item.prix_unitaire}</td>
            <td>${item.emplacement}</td>
            <td><span class="status ${getStatusClass(item.statut)}">${item.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load projets table from localStorage
function loadProjetsTable() {
    const projets = loadData(STORAGE_KEYS.projets);
    const tbody = document.querySelector('#projets-table tbody');
    tbody.innerHTML = '';
    
    projets.forEach(projet => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${projet.reference}</td>
            <td>${projet.nom}</td>
            <td>${projet.client}</td>
            <td>${projet.budget}</td>
            <td>${projet.debut}</td>
            <td>${projet.fin}</td>
            <td><div class="progress-bar"><div class="progress" style="width: ${projet.progression}%"></div></div></td>
            <td><span class="status ${getStatusClass(projet.statut)}">${projet.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load achats table from localStorage
function loadAchatsTable() {
    const achats = loadData(STORAGE_KEYS.achats);
    const tbody = document.querySelector('#achats-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    achats.forEach(achat => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${achat.commande}</td>
            <td>${achat.fournisseur}</td>
            <td>${achat.date}</td>
            <td>${achat.montant}</td>
            <td><span class="status ${getStatusClass(achat.statut)}">${achat.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
                <button class="btn-icon" title="Imprimer" onclick="printRow(this)"><i class="fas fa-print"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Load personnel table from localStorage
function loadPersonnelTable() {
    const personnel = loadData(STORAGE_KEYS.personnel);
    const tbody = document.querySelector('#personnel-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    personnel.forEach(emp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${emp.matricule}</td>
            <td>${emp.nom}</td>
            <td>${emp.poste}</td>
            <td>${emp.departement}</td>
            <td>${emp.date_embauche}</td>
            <td>${emp.salaire}</td>
            <td><span class="status ${getStatusClass(emp.statut)}">${emp.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get status class based on status text
function getStatusClass(status) {
    const statusMap = {
        'En cours': 'active',
        'Actif': 'active',
        'Livré': 'success',
        'Terminé': 'success',
        'En attente': 'warning',
        'En transit': 'active',
        'Bientôt terminé': 'warning',
        'Urgent': 'error'
    };
    return statusMap[status] || 'active';
}

// Update dashboard statistics
function updateDashboardStats() {
    const projets = loadData(STORAGE_KEYS.projets);
    const achats = loadData(STORAGE_KEYS.achats);
    const personnel = loadData(STORAGE_KEYS.personnel);
    
    // Update stats cards
    const projetsEnCours = projets.filter(p => p.statut === 'En cours').length;
    const totalProjets = projets.length;
    
    const personnelActif = personnel.filter(p => p.statut === 'Actif').length;
    
    // Calculate total budget
    let totalBudget = 0;
    projets.forEach(p => {
        const budget = parseFloat(p.budget.replace(/[^0-9]/g, ''));
        totalBudget += budget;
    });
    
    // Update DOM elements
    const statCards = document.querySelectorAll('.stat-card');
    if (statCards.length >= 4) {
        statCards[0].querySelector('h3').textContent = totalProjets;
        statCards[2].querySelector('h3').textContent = personnelActif;
    }
}

// Search functionality
function addSearchFunctionality(tableId, dataKey) {
    const searchInput = document.querySelector(`#${tableId}`).closest('.card-body').querySelector('input[type="text"]');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const data = loadData(dataKey);
        const tbody = document.querySelector(`#${tableId} tbody`);
        tbody.innerHTML = '';
        
        const filteredData = data.filter(item => {
            return Object.values(item).some(value => 
                String(value).toLowerCase().includes(searchTerm)
            );
        });
        
        filteredData.forEach(item => {
            const row = createTableRow(item, tableId);
            tbody.appendChild(row);
        });
    });
}

// Create table row based on table type
function createTableRow(item, tableId) {
    const row = document.createElement('tr');
    
    if (tableId === 'projets-table') {
        row.innerHTML = `
            <td>${item.reference}</td>
            <td>${item.nom}</td>
            <td>${item.client}</td>
            <td>${item.budget}</td>
            <td>${item.debut}</td>
            <td>${item.fin}</td>
            <td><div class="progress-bar"><div class="progress" style="width: ${item.progression}%"></div></div></td>
            <td><span class="status ${getStatusClass(item.statut)}">${item.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
    } else if (tableId === 'achats-table') {
        row.innerHTML = `
            <td>${item.commande}</td>
            <td>${item.fournisseur}</td>
            <td>${item.date}</td>
            <td>${item.montant}</td>
            <td><span class="status ${getStatusClass(item.statut)}">${item.statut}</span></td>
            <td>
                <button class="btn-icon" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" onclick="printRow(this)"><i class="fas fa-print"></i></button>
            </td>
        `;
    } else if (tableId === 'personnel-table') {
        row.innerHTML = `
            <td>${item.matricule}</td>
            <td>${item.nom}</td>
            <td>${item.poste}</td>
            <td>${item.departement}</td>
            <td>${item.date_embauche}</td>
            <td>${item.salaire}</td>
            <td><span class="status ${getStatusClass(item.statut)}">${item.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
    } else if (tableId === 'journal-table') {
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.date}</td>
            <td>${item.description}</td>
            <td>${item.debit}</td>
            <td>${item.credit}</td>
            <td>${item.solde}</td>
            <td><span class="status ${getStatusClass(item.statut || 'Actif')}">${item.categorie}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
    } else if (tableId === 'logistique-table') {
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.nom}</td>
            <td>${item.quantite}</td>
            <td>${item.unite}</td>
            <td>${item.prix_unitaire}</td>
            <td>${item.emplacement}</td>
            <td><span class="status ${getStatusClass(item.statut)}">${item.statut}</span></td>
            <td>
                <button class="btn-icon" title="Voir" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
                <button class="btn-icon" title="Modifier" onclick="editRow(this)"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
            </td>
        `;
    }
    
    return row;
}

// Initialize search functionality
function initializeSearch() {
    addSearchFunctionality('projets-table', STORAGE_KEYS.projets);
    addSearchFunctionality('achats-table', STORAGE_KEYS.achats);
    addSearchFunctionality('personnel-table', STORAGE_KEYS.personnel);
    addSearchFunctionality('journal-table', STORAGE_KEYS.journal);
    addSearchFunctionality('logistique-table', STORAGE_KEYS.logistique);
}

// Delete row function
function deleteRow(button) {
    const row = button.closest('tr');
    const table = row.closest('table');
    const tableId = table.id;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
        return;
    }
    
    let dataKey;
    if (tableId === 'projets-table') {
        dataKey = STORAGE_KEYS.projets;
    } else if (tableId === 'achats-table') {
        dataKey = STORAGE_KEYS.achats;
    } else if (tableId === 'personnel-table') {
        dataKey = STORAGE_KEYS.personnel;
    } else if (tableId === 'journal-table') {
        dataKey = STORAGE_KEYS.journal;
    } else if (tableId === 'logistique-table') {
        dataKey = STORAGE_KEYS.logistique;
    } else {
        return;
    }
    
    const data = loadData(dataKey);
    const rowIndex = Array.from(row.parentNode.children).indexOf(row);
    data.splice(rowIndex, 1);
    saveData(dataKey, data);
    
    // Reload table
    if (tableId === 'projets-table') {
        loadProjetsTable();
    } else if (tableId === 'achats-table') {
        loadAchatsTable();
    } else if (tableId === 'personnel-table') {
        loadPersonnelTable();
    } else if (tableId === 'journal-table') {
        loadJournalTable();
    } else if (tableId === 'logistique-table') {
        loadLogistiqueTable();
    }
    
    updateDashboardStats();
    showNotification('Élément supprimé avec succès!', 'success');
}

// View row function
function viewRow(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    let info = '';
    
    cells.forEach((cell, index) => {
        if (index < cells.length - 1) { // Exclude actions column
            info += `${cell.textContent}\n`;
        }
    });
    
    alert('Détails:\n\n' + info);
}

// Edit row function
function editRow(button) {
    const row = button.closest('tr');
    const table = row.closest('table');
    const tableId = table.id;
    
    if (tableId === 'projets-table') {
        openModal('modal-projet');
        // Pre-fill form with row data
        const cells = row.querySelectorAll('td');
        const form = document.getElementById('form-projet');
        form.querySelector('[name="nom"]').value = cells[1].textContent;
        form.querySelector('[name="client"]').value = cells[2].textContent;
        form.querySelector('[name="budget"]').value = cells[3].textContent.replace(/[^0-9]/g, '');
        // Note: Dates would need proper parsing
    } else if (tableId === 'personnel-table') {
        openModal('modal-employe');
        const cells = row.querySelectorAll('td');
        const form = document.getElementById('form-employe');
        const names = cells[1].textContent.split(' ');
        form.querySelector('[name="nom"]').value = names[0] || '';
        form.querySelector('[name="prenom"]').value = names[1] || '';
        form.querySelector('[name="poste"]').value = cells[2].textContent;
        form.querySelector('[name="departement"]').value = cells[3].textContent;
        form.querySelector('[name="salaire"]').value = cells[5].textContent.replace(/[^0-9]/g, '');
    }
    
    showNotification('Mode édition activé', 'info');
}

// Print row function
function printRow(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    let content = '<table border="1" style="border-collapse: collapse; width: 100%;">';
    
    cells.forEach((cell, index) => {
        if (index < cells.length - 1) {
            content += `<tr><td style="padding: 10px; border: 1px solid #ddd;">${cell.textContent}</td></tr>`;
        }
    });
    
    content += '</table>';
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Impression</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 10px; border: 1px solid #ddd; }
            </style>
        </head>
        <body>
            <h2>Détails de l'enregistrement</h2>
            ${content}
            <script>window.print();</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Export table to Excel
function exportTableToExcel(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.table_to_sheet(table);
    XLSX.utils.book_append_sheet(wb, ws, 'Données');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    showNotification('Export Excel réussi!', 'success');
}

// Export table to PDF
function exportTableToPDF(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text(filename, 14, 20);
    
    // Get table data
    const rows = table.querySelectorAll('tr');
    let yPosition = 30;
    
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('th, td');
        let xPosition = 14;
        
        cells.forEach((cell, cellIndex) => {
            const text = cell.textContent;
            doc.setFontSize(rowIndex === 0 ? 12 : 10);
            doc.setFont(rowIndex === 0 ? 'bold' : 'normal');
            doc.text(text, xPosition, yPosition);
            xPosition += 40;
        });
        
        yPosition += 10;
        
        // Add new page if needed
        if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
        }
    });
    
    doc.save(`${filename}.pdf`);
    showNotification('Export PDF réussi!', 'success');
}

// Export chart to PDF
function exportChart(canvasId, format) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 10, 10, 190, 100);
        doc.save(`${canvasId}.pdf`);
        showNotification('Graphique exporté en PDF!', 'success');
    } else if (format === 'excel') {
        // For charts, we export as image in Excel
        const imgData = canvas.toDataURL('image/png');
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([['Graphique'], ['Image exportée']]);
        XLSX.utils.book_append_sheet(wb, ws, 'Graphique');
        XLSX.writeFile(wb, `${canvasId}.xlsx`);
        showNotification('Graphique exporté en Excel!', 'success');
    }
}

// Import Excel file
function importExcelFile(input, sectionKey) {
    const file = input.files[0];
    if (!file) return;
    
    // Map section key to storage key
    const keyMap = {
        'achats': STORAGE_KEYS.achats,
        'journal': STORAGE_KEYS.journal,
        'logistique': STORAGE_KEYS.logistique,
        'personnel': STORAGE_KEYS.personnel,
        'projets': STORAGE_KEYS.projets
    };
    
    const storageKey = keyMap[sectionKey];
    if (!storageKey) {
        showNotification('Clé de section non reconnue', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            
            if (jsonData.length > 0) {
                const existingData = loadData(storageKey);
                const newData = [...existingData, ...jsonData];
                saveData(storageKey, newData);
                
                // Reload table
                if (sectionKey === 'projets') {
                    loadProjetsTable();
                } else if (sectionKey === 'achats') {
                    loadAchatsTable();
                } else if (sectionKey === 'personnel') {
                    loadPersonnelTable();
                } else if (sectionKey === 'journal') {
                    // Add journal table loading if needed
                } else if (sectionKey === 'logistique') {
                    // Add logistique table loading if needed
                }
                
                updateDashboardStats();
                showNotification(`${jsonData.length} enregistrements importés!`, 'success');
            } else {
                showNotification('Aucune donnée trouvée dans le fichier', 'warning');
            }
        } catch (error) {
            console.error('Erreur d\'import:', error);
            showNotification('Erreur lors de l\'import du fichier', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
    input.value = ''; // Reset input
}

// Initialize charts
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        const projets = loadData(STORAGE_KEYS.projets);
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'];
        const revenueData = [12.5, 15.2, 18.7, 22.1, 25.8, 28.5]; // Sample data
        
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [{
                    label: 'Chiffre d\'affaires (MAr)',
                    data: revenueData,
                    borderColor: '#E8631A',
                    backgroundColor: 'rgba(232, 99, 26, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Project Chart
    const projectCtx = document.getElementById('projectChart');
    if (projectCtx) {
        const projets = loadData(STORAGE_KEYS.projets);
        const statusCounts = {
            'En cours': projets.filter(p => p.statut === 'En cours').length,
            'Terminé': projets.filter(p => p.statut === 'Terminé').length,
            'En attente': projets.filter(p => p.statut === 'En attente').length,
            'Bientôt terminé': projets.filter(p => p.statut === 'Bientôt terminé').length
        };
        
        new Chart(projectCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: [
                        '#0066cc',
                        '#28a745',
                        '#ffc107',
                        '#E8631A'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Reset all data to default values
function resetAllData() {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser toutes les données ? Cette action est irréversible.')) {
        return;
    }
    
    // Clear all localStorage data
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Reinitialize with default data
    initializeData();
    
    // Reload all tables
    loadAllData();
    
    // Reinitialize charts
    initializeCharts();
    
    showNotification('Données réinitialisées avec succès!', 'success');
}

// QR Code Generation for Employees
function generateAllQRCodes() {
    const personnel = loadData(STORAGE_KEYS.personnel);
    const container = document.getElementById('qr-codes-container');
    container.innerHTML = '';
    
    personnel.forEach(emp => {
        const qrContainer = document.createElement('div');
        qrContainer.style.textAlign = 'center';
        qrContainer.style.padding = '10px';
        qrContainer.style.border = '1px solid #ddd';
        qrContainer.style.borderRadius = '5px';
        
        const qrCanvas = document.createElement('canvas');
        qrCanvas.id = `qr-${emp.matricule}`;
        qrContainer.appendChild(qrCanvas);
        
        const nameLabel = document.createElement('p');
        nameLabel.textContent = emp.nom;
        nameLabel.style.fontSize = '12px';
        nameLabel.style.marginTop = '5px';
        nameLabel.style.fontWeight = 'bold';
        qrContainer.appendChild(nameLabel);
        
        const matriculeLabel = document.createElement('p');
        matriculeLabel.textContent = emp.matricule;
        matriculeLabel.style.fontSize = '10px';
        matriculeLabel.style.color = '#666';
        qrContainer.appendChild(matriculeLabel);
        
        container.appendChild(qrContainer);
        
        // Generate QR code
        const qrData = JSON.stringify({
            matricule: emp.matricule,
            nom: emp.nom,
            poste: emp.poste
        });
        
        QRCode.toCanvas(qrCanvas, qrData, {
            width: 120,
            margin: 2,
            color: {
                dark: '#0066cc',
                light: '#ffffff'
            }
        });
    });
    
    showNotification('QR Codes générés avec succès!', 'success');
}

// Initialize QR Scanner
let html5QrCode;
let scannedEmployee = null;

function initializeQRScanner() {
    const qrReader = document.getElementById('qr-reader');
    if (!qrReader) return;
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            handleQRScan(decodedText);
        },
        (errorMessage) => {
            // Ignore scan errors
        }
    ).catch(err => {
        console.error('Erreur initialisation scanner:', err);
    });
}

function handleQRScan(decodedText) {
    try {
        const employeeData = JSON.parse(decodedText);
        scannedEmployee = employeeData;
        
        document.getElementById('qr-result').style.display = 'block';
        document.getElementById('qr-result-text').textContent = `Employé: ${employeeData.nom} (${employeeData.matricule})`;
        document.getElementById('pointage-form').style.display = 'block';
        
        // Load chantiers
        loadChantiers();
        
        showNotification('QR Code scanné avec succès!', 'success');
        
        // Stop scanner temporarily
        if (html5QrCode) {
            html5QrCode.stop();
        }
    } catch (error) {
        showNotification('QR Code invalide', 'error');
    }
}

function loadChantiers() {
    const projets = loadData(STORAGE_KEYS.projets);
    const select = document.getElementById('chantier-select');
    select.innerHTML = '<option value="">Sélectionner un chantier</option>';
    
    projets.forEach(projet => {
        const option = document.createElement('option');
        option.value = projet.reference;
        option.textContent = `${projet.nom} (${projet.reference})`;
        select.appendChild(option);
    });
}

function enregistrerPointage() {
    if (!scannedEmployee) {
        showNotification('Veuillez scanner un QR code d\'abord', 'error');
        return;
    }
    
    const chantier = document.getElementById('chantier-select').value;
    const typePointage = document.getElementById('type-pointage').value;
    
    if (!chantier) {
        showNotification('Veuillez sélectionner un chantier', 'error');
        return;
    }
    
    const pointage = {
        id: 'PTR-' + String(Date.now()),
        date: new Date().toLocaleDateString('fr-FR'),
        heure: new Date().toLocaleTimeString('fr-FR'),
        employe: scannedEmployee.nom,
        matricule: scannedEmployee.matricule,
        chantier: chantier,
        type: typePointage === 'arrivee' ? 'Arrivée' : 'Départ',
        statut: 'Validé',
        timestamp: Date.now()
    };
    
    const pointages = loadData(STORAGE_KEYS.pointage);
    pointages.push(pointage);
    saveData(STORAGE_KEYS.pointage, pointages);
    
    // Reset form
    document.getElementById('qr-result').style.display = 'none';
    document.getElementById('pointage-form').style.display = 'none';
    scannedEmployee = null;
    
    // Reload pointage table
    loadPointageTable();
    
    // Restart scanner
    if (html5QrCode) {
        initializeQRScanner();
    }
    
    showNotification('Pointage enregistré avec succès!', 'success');
}

function loadPointageTable() {
    const pointages = loadData(STORAGE_KEYS.pointage);
    const tbody = document.getElementById('pointage-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    // Sort by timestamp descending
    pointages.sort((a, b) => b.timestamp - a.timestamp);
    
    pointages.forEach((ptr, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-index', index);
        row.innerHTML = `
            <td>${ptr.date}</td>
            <td>${ptr.employe}</td>
            <td>${ptr.chantier}</td>
            <td><span class="status ${ptr.type === 'Arrivée' ? 'success' : 'warning'}">${ptr.type}</span></td>
            <td>${ptr.heure}</td>
            <td><span class="status success">${ptr.statut}</span></td>
            <td>
                <button class="btn-icon" onclick="editPointage(${index})" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="deletePointage(${index})" title="Supprimer"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editPointage(index) {
    const pointages = loadData(STORAGE_KEYS.pointage);
    const ptr = pointages[index];
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Modifier le Pointage</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="edit-pointage-date" value="${ptr.date}">
                </div>
                <div class="form-group">
                    <label>Employé</label>
                    <input type="text" id="edit-pointage-employe" value="${ptr.employe}">
                </div>
                <div class="form-group">
                    <label>Chantier</label>
                    <input type="text" id="edit-pointage-chantier" value="${ptr.chantier}">
                </div>
                <div class="form-group">
                    <label>Type</label>
                    <select id="edit-pointage-type">
                        <option value="Arrivée" ${ptr.type === 'Arrivée' ? 'selected' : ''}>Arrivée</option>
                        <option value="Départ" ${ptr.type === 'Départ' ? 'selected' : ''}>Départ</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Heure</label>
                    <input type="time" id="edit-pointage-heure" value="${ptr.heure}">
                </div>
                <div class="form-group">
                    <label>Statut</label>
                    <select id="edit-pointage-statut">
                        <option value="Présent" ${ptr.statut === 'Présent' ? 'selected' : ''}>Présent</option>
                        <option value="Absent" ${ptr.statut === 'Absent' ? 'selected' : ''}>Absent</option>
                        <option value="Retard" ${ptr.statut === 'Retard' ? 'selected' : ''}>Retard</option>
                    </select>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                <button class="btn btn-primary" onclick="savePointageEdit(${index})">Enregistrer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function savePointageEdit(index) {
    const pointages = loadData(STORAGE_KEYS.pointage);
    
    pointages[index] = {
        ...pointages[index],
        date: document.getElementById('edit-pointage-date').value,
        employe: document.getElementById('edit-pointage-employe').value,
        chantier: document.getElementById('edit-pointage-chantier').value,
        type: document.getElementById('edit-pointage-type').value,
        heure: document.getElementById('edit-pointage-heure').value,
        statut: document.getElementById('edit-pointage-statut').value,
        timestamp: new Date().getTime()
    };
    
    saveData(STORAGE_KEYS.pointage, pointages);
    loadPointageTable();
    document.querySelector('.modal.active').remove();
    showNotification('Pointage modifié avec succès!', 'success');
}

function deletePointage(index) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce pointage ?')) {
        return;
    }
    
    const pointages = loadData(STORAGE_KEYS.pointage);
    pointages.splice(index, 1);
    saveData(STORAGE_KEYS.pointage, pointages);
    loadPointageTable();
    showNotification('Pointage supprimé avec succès!', 'success');
}

function exportPointage() {
    const pointages = loadData(STORAGE_KEYS.pointage);
    if (pointages.length === 0) {
        showNotification('Aucun pointage à exporter', 'warning');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(pointages);
    XLSX.utils.book_append_sheet(wb, ws, 'Pointages');
    XLSX.writeFile(wb, `pointages_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export réussi!', 'success');
}

// Salary Calculation Functions
function calculateSalaries() {
    const pointages = loadData(STORAGE_KEYS.pointage);
    const personnel = loadData(STORAGE_KEYS.personnel);
    
    if (pointages.length === 0) {
        showNotification('Aucun pointage disponible pour le calcul', 'warning');
        return;
    }
    
    const salaires = [];
    const journaliers = [];
    const mensuels = [];
    
    // Group pointages by employee
    const pointagesByEmployee = {};
    pointages.forEach(ptr => {
        if (!pointagesByEmployee[ptr.employe]) {
            pointagesByEmployee[ptr.employe] = [];
        }
        pointagesByEmployee[ptr.employe].push(ptr);
    });
    
    // Calculate salaries for each employee
    personnel.forEach(emp => {
        const empPointages = pointagesByEmployee[emp.nom] || [];
        const joursTravailles = new Set(empPointages.map(p => p.date)).size;
        
        // Determine if employee is daily or monthly based on salary
        const salaireNum = parseInt(emp.salaire.replace(/[^0-9]/g, ''));
        const isJournalier = salaireNum < 100000; // Less than 100,000 Ar is considered daily
        
        if (isJournalier) {
            const tauxJournalier = salaireNum;
            const total = tauxJournalier * joursTravailles;
            journaliers.push({
                employe: emp.nom,
                joursTravailles: joursTravailles,
                tauxJournalier: tauxJournalier,
                total: total
            });
        } else {
            const salaireMensuel = salaireNum;
            const joursOuvrables = 22; // Standard working days per month
            const prorata = (joursTravailles / joursOuvrables) * salaireMensuel;
            mensuels.push({
                employe: emp.nom,
                joursPresents: joursTravailles,
                salaireMensuel: salaireMensuel,
                prorata: Math.round(prorata)
            });
        }
    });
    
    // Save calculated salaries
    saveData(STORAGE_KEYS.salaires, { journaliers, mensuels });
    
    // Display in tables
    loadSalairesTable();
    showNotification('Salaires calculés avec succès!', 'success');
}

function loadSalairesTable() {
    const salairesData = loadData(STORAGE_KEYS.salaires);
    if (!salairesData.journaliers && !salairesData.mensuels) {
        return;
    }
    
    const journaliersBody = document.getElementById('salaires-journaliers-body');
    const mensuelsBody = document.getElementById('salaires-mensuels-body');
    
    if (journaliersBody && salairesData.journaliers) {
        journaliersBody.innerHTML = '';
        salairesData.journaliers.forEach((sal, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sal.employe}</td>
                <td>${sal.joursTravailles}</td>
                <td>${sal.tauxJournalier.toLocaleString('fr-FR')} Ar</td>
                <td><strong>${sal.total.toLocaleString('fr-FR')} Ar</strong></td>
                <td>
                    <button class="btn-icon" onclick="editSalaireJournalier(${index})" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="deleteSalaireJournalier(${index})" title="Supprimer"><i class="fas fa-trash"></i></button>
                </td>
            `;
            journaliersBody.appendChild(row);
        });
    }
    
    if (mensuelsBody && salairesData.mensuels) {
        mensuelsBody.innerHTML = '';
        salairesData.mensuels.forEach((sal, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sal.employe}</td>
                <td>${sal.joursPresents}</td>
                <td>${sal.salaireMensuel.toLocaleString('fr-FR')} Ar</td>
                <td><strong>${sal.prorata.toLocaleString('fr-FR')} Ar</strong></td>
                <td>
                    <button class="btn-icon" onclick="editSalaireMensuel(${index})" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="deleteSalaireMensuel(${index})" title="Supprimer"><i class="fas fa-trash"></i></button>
                </td>
            `;
            mensuelsBody.appendChild(row);
        });
    }
}

function editSalaireJournalier(index) {
    const salairesData = loadData(STORAGE_KEYS.salaires);
    const sal = salairesData.journaliers[index];
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Modifier Salaire Journalier</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Employé</label>
                    <input type="text" id="edit-sal-jour-employe" value="${sal.employe}">
                </div>
                <div class="form-group">
                    <label>Jours Travaillés</label>
                    <input type="number" id="edit-sal-jour-jours" value="${sal.joursTravailles}">
                </div>
                <div class="form-group">
                    <label>Taux Journalier (Ar)</label>
                    <input type="number" id="edit-sal-jour-taux" value="${sal.tauxJournalier}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                <button class="btn btn-primary" onclick="saveSalaireJournalierEdit(${index})">Enregistrer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveSalaireJournalierEdit(index) {
    const salairesData = loadData(STORAGE_KEYS.salaires);
    salairesData.journaliers[index] = {
        employe: document.getElementById('edit-sal-jour-employe').value,
        joursTravailles: parseInt(document.getElementById('edit-sal-jour-jours').value),
        tauxJournalier: parseInt(document.getElementById('edit-sal-jour-taux').value),
        total: parseInt(document.getElementById('edit-sal-jour-jours').value) * parseInt(document.getElementById('edit-sal-jour-taux').value)
    };
    saveData(STORAGE_KEYS.salaires, salairesData);
    loadSalairesTable();
    document.querySelector('.modal.active').remove();
    showNotification('Salaire journalier modifié!', 'success');
}

function deleteSalaireJournalier(index) {
    if (!confirm('Supprimer ce salaire journalier?')) return;
    const salairesData = loadData(STORAGE_KEYS.salaires);
    salairesData.journaliers.splice(index, 1);
    saveData(STORAGE_KEYS.salaires, salairesData);
    loadSalairesTable();
    showNotification('Salaire journalier supprimé!', 'success');
}

function editSalaireMensuel(index) {
    const salairesData = loadData(STORAGE_KEYS.salaires);
    const sal = salairesData.mensuels[index];
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Modifier Salaire Mensuel</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Employé</label>
                    <input type="text" id="edit-sal-mens-employe" value="${sal.employe}">
                </div>
                <div class="form-group">
                    <label>Jours Présents</label>
                    <input type="number" id="edit-sal-mens-jours" value="${sal.joursPresents}">
                </div>
                <div class="form-group">
                    <label>Salaire Mensuel (Ar)</label>
                    <input type="number" id="edit-sal-mens-salaire" value="${sal.salaireMensuel}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                <button class="btn btn-primary" onclick="saveSalaireMensuelEdit(${index})">Enregistrer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function saveSalaireMensuelEdit(index) {
    const salairesData = loadData(STORAGE_KEYS.salaires);
    const joursPresents = parseInt(document.getElementById('edit-sal-mens-jours').value);
    const salaireMensuel = parseInt(document.getElementById('edit-sal-mens-salaire').value);
    const joursOuvrables = 22;
    
    salairesData.mensuels[index] = {
        employe: document.getElementById('edit-sal-mens-employe').value,
        joursPresents: joursPresents,
        salaireMensuel: salaireMensuel,
        prorata: Math.round((joursPresents / joursOuvrables) * salaireMensuel)
    };
    saveData(STORAGE_KEYS.salaires, salairesData);
    loadSalairesTable();
    document.querySelector('.modal.active').remove();
    showNotification('Salaire mensuel modifié!', 'success');
}

function deleteSalaireMensuel(index) {
    if (!confirm('Supprimer ce salaire mensuel?')) return;
    const salairesData = loadData(STORAGE_KEYS.salaires);
    salairesData.mensuels.splice(index, 1);
    saveData(STORAGE_KEYS.salaires, salairesData);
    loadSalairesTable();
    showNotification('Salaire mensuel supprimé!', 'success');
}

function exportSalaires() {
    const salairesData = loadData(STORAGE_KEYS.salaires);
    if (!salairesData.journaliers && !salairesData.mensuels) {
        showNotification('Aucun salaire à exporter', 'warning');
        return;
    }
    
    const wb = XLSX.utils.book_new();
    
    if (salairesData.journaliers) {
        const wsJournaliers = XLSX.utils.json_to_sheet(salairesData.journaliers);
        XLSX.utils.book_append_sheet(wb, wsJournaliers, 'Journaliers');
    }
    
    if (salairesData.mensuels) {
        const wsMensuels = XLSX.utils.json_to_sheet(salairesData.mensuels);
        XLSX.utils.book_append_sheet(wb, wsMensuels, 'Mensuels');
    }
    
    XLSX.writeFile(wb, `salaires_${new Date().toISOString().split('T')[0]}.xlsx`);
    showNotification('Export des salaires réussi!', 'success');
}

// Add pointage to section titles
sectionTitles['pointage'] = 'Pointage QR Code';

// Initialize pointage data
if (!localStorage.getItem(STORAGE_KEYS.pointage)) {
    saveData(STORAGE_KEYS.pointage, []);
}

// Load pointage table on page load
document.addEventListener('DOMContentLoaded', () => {
    // Si supabase.js est chargé, il gère l'initialisation — on ne charge pas localStorage
    if (typeof initSupabase === 'function') {
        initializeSearch();
        initializeCharts();
        return;
    }
    loadPointageTable();
    loadAllData();
    initializeSearch();
    initializeCharts();
});

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = item.getAttribute('data-section');
        
        // Update active nav item
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Show corresponding section
        sections.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });
        
        // Update page title
        pageTitle.textContent = sectionTitles[sectionId] || 'Tableau de bord';
        
        // Initialize QR scanner when pointage section is activated
        if (sectionId === 'pointage') {
            setTimeout(() => {
                initializeQRScanner();
            }, 500);
        }
    });
});

// Current Date
function updateDate() {
    const dateElement = document.getElementById('current-date');
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    dateElement.textContent = now.toLocaleDateString('fr-FR', options);
}

updateDate();

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    });
});

// Form Submissions
document.getElementById('form-projet').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const projets = loadData(STORAGE_KEYS.projets);
    const projet = {
        reference: 'PRJ-' + String(projets.length + 1).padStart(3, '0'),
        nom: formData.get('nom'),
        client: formData.get('client'),
        budget: parseFloat(formData.get('budget')).toLocaleString('fr-FR') + ' Ar',
        debut: new Date(formData.get('debut')).toLocaleDateString('fr-FR'),
        fin: new Date(formData.get('fin')).toLocaleDateString('fr-FR'),
        progression: 0,
        statut: 'En cours'
    };
    
    projets.push(projet);
    saveData(STORAGE_KEYS.projets, projets);
    loadProjetsTable();
    updateDashboardStats();
    closeModal('modal-projet');
    this.reset();
    showNotification('Projet créé avec succès!', 'success');
});

document.getElementById('form-achat').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const achats = loadData(STORAGE_KEYS.achats);
    const achat = {
        commande: 'CMD-' + String(achats.length + 1).padStart(3, '0'),
        fournisseur: formData.get('fournisseur'),
        date: new Date(formData.get('date')).toLocaleDateString('fr-FR'),
        montant: parseFloat(formData.get('montant')).toLocaleString('fr-FR') + ' Ar',
        statut: 'En attente'
    };
    
    achats.push(achat);
    saveData(STORAGE_KEYS.achats, achats);
    loadAchatsTable();
    updateDashboardStats();
    closeModal('modal-achat');
    this.reset();
    showNotification('Achat enregistré avec succès!', 'success');
});

document.getElementById('form-employe').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const personnel = loadData(STORAGE_KEYS.personnel);
    const employe = {
        matricule: 'EMP-' + String(personnel.length + 1).padStart(3, '0'),
        nom: formData.get('nom') + ' ' + formData.get('prenom'),
        poste: formData.get('poste'),
        departement: formData.get('departement'),
        date_embauche: new Date(formData.get('date_embauche')).toLocaleDateString('fr-FR'),
        salaire: parseFloat(formData.get('salaire')).toLocaleString('fr-FR') + ' Ar',
        statut: 'Actif'
    };
    
    personnel.push(employe);
    saveData(STORAGE_KEYS.personnel, personnel);
    loadPersonnelTable();
    updateDashboardStats();
    closeModal('modal-employe');
    this.reset();
    showNotification('Employé ajouté avec succès!', 'success');
});

document.getElementById('form-devis').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const devis = {
        numero: 'DEV-' + String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0'),
        client: formData.get('client'),
        projet: formData.get('projet'),
        montant: parseFloat(formData.get('montant')).toLocaleString('fr-FR') + ' Ar',
        date: new Date().toLocaleDateString('fr-FR'),
        validite: formData.get('validite') + ' jours',
        statut: 'En attente'
    };
    addDevisToTable(devis);
    closeModal('modal-devis');
    this.reset();
    showNotification('Devis créé avec succès!', 'success');
});

document.getElementById('form-proformat').addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const proformat = {
        numero: 'PRO-' + String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0'),
        client: formData.get('client'),
        projet: formData.get('projet'),
        montant: parseFloat(formData.get('montant')).toLocaleString('fr-FR') + ' Ar',
        date: new Date(formData.get('date')).toLocaleDateString('fr-FR'),
        statut: 'Envoyé'
    };
    addProformatToTable(proformat);
    closeModal('modal-proformat');
    this.reset();
    showNotification('Proformat créé avec succès!', 'success');
});

// Add to Table Functions
function addProjetToTable(projet) {
    const tbody = document.querySelector('#projets-table');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${projet.reference}</td>
        <td>${projet.nom}</td>
        <td>${projet.client}</td>
        <td>${projet.budget}</td>
        <td>${projet.debut}</td>
        <td>${projet.fin}</td>
        <td><div class="progress-bar"><div class="progress" style="width: ${projet.progression}%"></div></div></td>
        <td><span class="status active">${projet.statut}</span></td>
        <td>
            <button class="btn-icon" title="Voir"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" title="Modifier"><i class="fas fa-edit"></i></button>
            <button class="btn-icon" title="Supprimer" onclick="deleteRow(this)"><i class="fas fa-trash"></i></button>
        </td>
    `;
    tbody.appendChild(row);
}

function addAchatToTable(achat) {
    const tbody = document.querySelector('#achats table tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${achat.commande}</td>
        <td>${achat.fournisseur}</td>
        <td>${achat.date}</td>
        <td>${achat.montant}</td>
        <td><span class="status warning">${achat.statut}</span></td>
        <td>
            <button class="btn-icon"><i class="fas fa-eye"></i></button>
            <button class="btn-icon"><i class="fas fa-print"></i></button>
        </td>
    `;
    tbody.appendChild(row);
}

function addEmployeToTable(employe) {
    const tbody = document.querySelector('#personnel table tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${employe.matricule}</td>
        <td>${employe.nom}</td>
        <td>${employe.poste}</td>
        <td>${employe.departement}</td>
        <td>${employe.date_embauche}</td>
        <td>${employe.salaire}</td>
        <td><span class="status success">${employe.statut}</span></td>
        <td>
            <button class="btn-icon"><i class="fas fa-eye"></i></button>
            <button class="btn-icon"><i class="fas fa-edit"></i></button>
        </td>
    `;
    tbody.appendChild(row);
}

function deleteRow(button) {
    const row = button.closest('tr');
    row.remove();
    showNotification('Élément supprimé', 'info');
}

function addDevisToTable(devis) {
    const tbody = document.querySelector('#devis table tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${devis.numero}</td>
        <td>${devis.client}</td>
        <td>${devis.projet}</td>
        <td>${devis.montant}</td>
        <td>${devis.date}</td>
        <td>${devis.validite}</td>
        <td><span class="status warning">${devis.statut}</span></td>
        <td>
            <button class="btn-icon" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" onclick="printRow(this)"><i class="fas fa-print"></i></button>
            <button class="btn-icon" onclick="convertToProformat(this)"><i class="fas fa-file-contract"></i></button>
        </td>
    `;
    tbody.appendChild(row);
}

function addProformatToTable(proformat) {
    const tbody = document.querySelector('#proformat table tbody');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${proformat.numero}</td>
        <td>${proformat.client}</td>
        <td>${proformat.projet}</td>
        <td>${proformat.montant}</td>
        <td>${proformat.date}</td>
        <td><span class="status success">${proformat.statut}</span></td>
        <td>
            <button class="btn-icon" onclick="viewRow(this)"><i class="fas fa-eye"></i></button>
            <button class="btn-icon" onclick="printRow(this)"><i class="fas fa-print"></i></button>
            <button class="btn-icon" onclick="convertToFacture(this)"><i class="fas fa-file-invoice-dollar"></i></button>
        </td>
    `;
    tbody.appendChild(row);
}

function convertToProformat(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    const devisData = Array.from(cells).map(cell => cell.textContent);
    
    const proformat = {
        numero: 'PRO-' + String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0'),
        client: devisData[1],
        projet: devisData[2],
        montant: devisData[3],
        date: new Date().toLocaleDateString('fr-FR'),
        statut: 'Envoyé'
    };
    
    addProformatToTable(proformat);
    showNotification('Devis converti en proformat!', 'success');
}

function convertToFacture(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    
    // Create a modal for facture conversion
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Convertir en Facture</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Numéro de Facture</label>
                    <input type="text" id="facture-num" placeholder="FAC-2026-001">
                </div>
                <div class="form-group">
                    <label>Date d'émission</label>
                    <input type="date" id="facture-date" value="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="form-group">
                    <label>Échéance</label>
                    <input type="date" id="facture-echeance">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                <button class="btn btn-primary" onclick="confirmFacture(this)">Confirmer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function confirmFacture(button) {
    const modal = button.closest('.modal');
    const factureNum = document.getElementById('facture-num').value;
    
    if (!factureNum) {
        showNotification('Veuillez entrer un numéro de facture', 'error');
        return;
    }
    
    modal.remove();
    showNotification('Facture créée: ' + factureNum, 'success');
}

function logout() {
    localStorage.removeItem('nysoa_current_user');
    window.location.href = 'login.html';
}

// Toggle Sidebar for Mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Show Notification Function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;

    const style = document.createElement('style');
    style.textContent = `
        .notification-toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 3000;
            animation: slideIn 0.3s ease;
        }
        .notification-success {
            border-left: 4px solid #10b981;
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
        }
        .notification-success i {
            color: #10b981;
        }
        .notification-error {
            border-left: 4px solid #ef4444;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.1) 100%);
        }
        .notification-error i {
            color: #ef4444;
        }
        .notification-info {
            border-left: 4px solid #0066cc;
            background: linear-gradient(135deg, rgba(0, 102, 204, 0.1) 0%, rgba(51, 136, 221, 0.1) 100%);
        }
        .notification-info i {
            color: #0066cc;
        }
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Additional Functions for RH and other interfaces
function approveLeave(button) {
    const row = button.closest('tr');
    const statusCell = row.querySelector('.status');
    statusCell.className = 'status success';
    statusCell.textContent = 'Approuvé';
    showNotification('Congé approuvé!', 'success');
}

function rejectLeave(button) {
    const row = button.closest('tr');
    const statusCell = row.querySelector('.status');
    statusCell.className = 'status error';
    statusCell.textContent = 'Refusé';
    showNotification('Congé refusé', 'info');
}

function completeTask(button) {
    const row = button.closest('tr');
    const statusCell = row.querySelector('.status');
    statusCell.className = 'status success';
    statusCell.textContent = 'Terminé';
    showNotification('Tâche terminée!', 'success');
}

// Export Chart to PDF or Excel
function exportChart(chartId, format) {
    const canvas = document.getElementById(chartId);
    if (!canvas) {
        showNotification('Graphique non trouvé', 'error');
        return;
    }

    if (format === 'pdf') {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF();
        
        // Header
        pdf.setFontSize(20);
        pdf.setTextColor(0, 102, 204);
        pdf.text('NySoa Construct', 10, 20);
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Entreprise de Construction Générale', 10, 30);
        pdf.setFontSize(10);
        pdf.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 10, 38);
        
        pdf.setDrawColor(0, 102, 204);
        pdf.line(10, 42, 200, 42);
        
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 10, 50, 190, 100);
        
        pdf.save('devis mr Herman Ambohimanabe.pdf');
        showNotification('Export PDF réussi!', 'success');
    } else if (format === 'excel') {
        const chart = Chart.getChart(chartId);
        if (!chart) {
            showNotification('Graphique non trouvé', 'error');
            return;
        }
        
        const data = chart.data;
        const ws = XLSX.utils.json_to_sheet(data.datasets.map((dataset, i) => ({
            Label: data.labels[i] || dataset.label,
            Value: dataset.data[0] || dataset.data.join(', ')
        })));
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Graphique');
        XLSX.writeFile(wb, `${chartId}.xlsx`);
        showNotification('Export Excel réussi!', 'success');
    }
}

// Import Excel File
function importExcelFile(input, section) {
    const file = input.files[0];
    if (!file) {
        showNotification('Veuillez sélectionner un fichier', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // Store data in localStorage
        localStorage.setItem(`nysoa_${section}_import`, JSON.stringify(jsonData));
        
        showNotification(`Fichier ${file.name} importé avec succès!`, 'success');
        
        // Reload the page to display imported data
        setTimeout(() => {
            location.reload();
        }, 1000);
    };
    
    reader.readAsArrayBuffer(file);
}

// Load imported data
function loadImportedData(section) {
    const importedData = localStorage.getItem(`nysoa_${section}_import`);
    if (importedData) {
        const data = JSON.parse(importedData);
        // Process and display data in the appropriate table
        return data;
    }
    return null;
}

// Initialize on load
window.addEventListener('load', function() {
    initializeCharts();
    updateDate();
});

// View Function
function viewRow(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    let details = '';
    
    cells.forEach((cell, index) => {
        if (index < cells.length - 1) { // Skip actions column
            details += `<p><strong>${cell.previousElementSibling?.textContent || 'Détail'}:</strong> ${cell.textContent}</p>`;
        }
    });
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Détails</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${details}
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Fermer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Edit Function
function editRow(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    
    // Create modal with editable fields
    const modal = document.createElement('div');
    modal.className = 'modal active';
    let formFields = '';
    
    cells.forEach((cell, index) => {
        if (index < cells.length - 1) { // Skip actions column
            const label = cell.previousElementSibling?.textContent || `Champ ${index + 1}`;
            formFields += `
                <div class="form-group">
                    <label>${label}</label>
                    <input type="text" value="${cell.textContent}" class="edit-field" data-index="${index}">
                </div>
            `;
        }
    });
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Modifier</h3>
                <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${formFields}
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Annuler</button>
                <button class="btn btn-primary" onclick="saveEdit(this, ${row.rowIndex})">Enregistrer</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Save Edit
function saveEdit(button, rowIndex) {
    const modal = button.closest('.modal');
    const inputs = modal.querySelectorAll('.edit-field');
    const table = document.querySelector('.table');
    const row = table.rows[rowIndex];
    
    inputs.forEach((input, index) => {
        if (row.cells[index]) {
            row.cells[index].textContent = input.value;
        }
    });
    
    modal.remove();
    showNotification('Modifications enregistrées!', 'success');
}

// Delete Function
function deleteRow(button) {
    const row = button.closest('tr');
    if (confirm('Êtes-vous sûr de vouloir supprimer cette ligne?')) {
        row.remove();
        showNotification('Ligne supprimée!', 'success');
    }
}

// Complete Task Function
function completeTask(button) {
    const row = button.closest('tr');
    const statusCell = row.querySelector('.status');
    if (statusCell) {
        statusCell.className = 'status success';
        statusCell.textContent = 'Terminé';
        showNotification('Tâche terminée!', 'success');
    }
}

// Add Project Function
function addProject() {
    showNotification('Ajout de projet - Fonctionnalité disponible via le modal', 'info');
}

// Add Purchase Function
function addPurchase() {
    showNotification('Ajout d\'achat - Fonctionnalité disponible via le modal', 'info');
}

// Add Journal Entry Function
function addJournalEntry() {
    showNotification('Ajout d\'écriture - Fonctionnalité disponible via le modal', 'info');
}

// Add Stock Function
function addStock() {
    showNotification('Ajout de stock - Fonctionnalité disponible via le modal', 'info');
}

// Add Employee Function
function addEmployee() {
    showNotification('Ajout d\'employé - Fonctionnalité disponible via le modal', 'info');
}

// Add Leave Function
function addLeave() {
    showNotification('Demande de congé - Fonctionnalité disponible via le modal', 'info');
}

// Add Inspection Function
function addInspection() {
    showNotification('Ajout d\'inspection - Fonctionnalité disponible via le modal', 'info');
}

// Print Function
function printRow(button) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    
    // Header
    pdf.setFontSize(20);
    pdf.setTextColor(0, 102, 204);
    pdf.text('NySoa Construct', 10, 20);
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text('Entreprise de Construction Générale', 10, 30);
    pdf.setFontSize(10);
    pdf.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 10, 38);
    
    pdf.setDrawColor(0, 102, 204);
    pdf.line(10, 42, 200, 42);
    
    let y = 55;
    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Détails', 10, y);
    y += 15;
    
    cells.forEach((cell, index) => {
        if (index < cells.length - 1) { // Skip actions column
            pdf.setFontSize(12);
            pdf.setTextColor(0, 0, 0);
            pdf.text(cell.textContent, 10, y);
            y += 10;
        }
    });
    
    pdf.save('devis mr Herman Ambohimanabe.pdf');
    showNotification('Impression réussie!', 'success');
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles if not exists
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 3000;
                animation: slideIn 0.3s ease;
            }
            .notification-success {
                border-left: 4px solid #10b981;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%);
            }
            .notification-success i {
                color: #10b981;
            }
            .notification-error {
                border-left: 4px solid #ef4444;
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(248, 113, 113, 0.1) 100%);
            }
            .notification-error i {
                color: #ef4444;
            }
            .notification-info {
                border-left: 4px solid #0066cc;
                background: linear-gradient(135deg, rgba(0, 102, 204, 0.1) 0%, rgba(51, 136, 221, 0.1) 100%);
            }
            .notification-info i {
                color: #0066cc;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Search Functionality
const searchBox = document.querySelector('.search-box input');
searchBox.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const activeSection = document.querySelector('.section.active');
    
    if (activeSection) {
        const rows = activeSection.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    }
});

// Filter Functionality
document.querySelectorAll('.filter-select').forEach(select => {
    select.addEventListener('change', function(e) {
        const filterValue = e.target.value;
        const table = this.closest('.card').querySelector('table tbody');
        
        if (table) {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                if (!filterValue) {
                    row.style.display = '';
                } else {
                    const statusCell = row.querySelector('.status');
                    if (statusCell) {
                        const statusText = statusCell.textContent.toLowerCase();
                        row.style.display = statusText.includes(filterValue.replace('_', ' ')) ? '' : 'none';
                    }
                }
            });
        }
    });
});

// Update Statistics (Simulated)
function updateStats() {
    // Simulate real-time updates
    const statNumbers = document.querySelectorAll('.stat-info h3');
    statNumbers.forEach(stat => {
        stat.style.transition = 'transform 0.3s ease';
        stat.style.transform = 'scale(1.05)';
        setTimeout(() => {
            stat.style.transform = 'scale(1)';
        }, 300);
    });
}

// Update stats every 30 seconds
setInterval(updateStats, 30000);

// Export to CSV Function
function exportTableToCSV(tableId, filename) {
    const table = document.getElementById(tableId);
    const rows = table.querySelectorAll('tr');
    const csv = [];
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('td, th');
        const rowData = [];
        cols.forEach(col => {
            rowData.push(col.textContent);
        });
        csv.push(rowData.join(','));
    });
    
    const csvFile = new Blob([csv.join('\n')], { type: 'text/csv' });
    const downloadLink = document.createElement('a');
    downloadLink.download = filename;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = 'none';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Print Function
function printSection() {
    window.print();
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(modal => {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        });
    }
    
    // Ctrl/Cmd + P for print
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        printSection();
    }
});

// Initialize tooltips
function initializeTooltips() {
    const tooltipElements = document.querySelectorAll('[title]');
    tooltipElements.forEach(el => {
        el.addEventListener('mouseenter', function(e) {
            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.textContent = this.getAttribute('title');
            tooltip.style.cssText = `
                position: absolute;
                background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 0.85rem;
                z-index: 1000;
                pointer-events: none;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            `;
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            
            this.addEventListener('mouseleave', function() {
                tooltip.remove();
            }, { once: true });
        });
    });
}

initializeTooltips();

// Auto-refresh data simulation
function simulateDataRefresh() {
    // This would be replaced with actual API calls in a real application
    console.log('Data refreshed at:', new Date().toLocaleTimeString());
}

// Refresh data every 5 minutes
setInterval(simulateDataRefresh, 300000);

// Responsive sidebar toggle for mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('mobile-open');
        if (sidebar.classList.contains('mobile-open')) {
            sidebar.style.transform = 'translateX(0)';
        } else {
            sidebar.style.transform = 'translateX(-100%)';
        }
    }
}

// Add mobile menu button if screen is small
function addMobileMenuButton() {
    if (window.innerWidth <= 768 && !document.querySelector('.mobile-menu-btn')) {
        const header = document.querySelector('.header');
        const menuBtn = document.createElement('button');
        menuBtn.className = 'mobile-menu-btn';
        menuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        menuBtn.style.cssText = `
            background: linear-gradient(135deg, #0066cc 0%, #3388dd 100%);
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: white;
            margin-right: 15px;
            padding: 8px 12px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
        `;
        menuBtn.addEventListener('click', toggleSidebar);
        header.querySelector('.header-left').prepend(menuBtn);
    }
}

window.addEventListener('resize', addMobileMenuButton);
addMobileMenuButton();

console.log('NySoa Construct ERP - Initialisé avec succès');
