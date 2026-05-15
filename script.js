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
    'rapports': 'Rapports et Statistiques'
};

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
    const projet = {
        reference: 'PRJ-' + String(document.querySelectorAll('#projets-table tr').length + 1).padStart(3, '0'),
        nom: formData.get('nom'),
        client: formData.get('client'),
        budget: parseFloat(formData.get('budget')).toLocaleString('fr-FR') + ' Ar',
        debut: new Date(formData.get('debut')).toLocaleDateString('fr-FR'),
        fin: new Date(formData.get('fin')).toLocaleDateString('fr-FR'),
        progression: 0,
        statut: 'En cours'
    };
    
    addProjetToTable(projet);
    closeModal('modal-projet');
    this.reset();
    showNotification('Projet créé avec succès!', 'success');
});

document.getElementById('form-achat').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const achat = {
        commande: 'CMD-' + String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0'),
        fournisseur: formData.get('fournisseur'),
        date: new Date(formData.get('date')).toLocaleDateString('fr-FR'),
        montant: parseFloat(formData.get('montant')).toLocaleString('fr-FR') + ' Ar',
        statut: 'En attente'
    };
    
    addAchatToTable(achat);
    closeModal('modal-achat');
    this.reset();
    showNotification('Achat enregistré avec succès!', 'success');
});

document.getElementById('form-employe').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const employe = {
        matricule: 'EMP-' + String(Math.floor(Math.random() * 1000) + 1).padStart(3, '0'),
        nom: formData.get('nom') + ' ' + formData.get('prenom'),
        poste: formData.get('poste'),
        departement: formData.get('departement'),
        date_embauche: new Date(formData.get('date_embauche')).toLocaleDateString('fr-FR'),
        salaire: parseFloat(formData.get('salaire')).toLocaleString('fr-FR') + ' Ar',
        statut: 'Actif'
    };
    
    addEmployeToTable(employe);
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

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
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

// Initialize Charts
function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart');
    if (revenueCtx) {
        new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Chiffre d\'affaires (MAr)',
                    data: [8, 9, 10, 11, 12.5, 14],
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
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
        new Chart(projectCtx, {
            type: 'doughnut',
            data: {
                labels: ['Résidentiel', 'Commercial', 'Industriel', 'Public'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: [
                        '#0066cc',
                        '#ff6b35',
                        '#10b981',
                        '#636e72'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true,
                        position: 'right'
                    }
                }
            }
        });
    }
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
        XLSX.writeFile(wb, `graphique-${chartId}.xlsx`);
        showNotification('Export Excel réussi!', 'success');
    }
}

// Export Table to Excel
function exportTableToExcel(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) {
        showNotification('Tableau non trouvé', 'error');
        return;
    }

    const wb = XLSX.utils.table_to_book(table, { sheet: 'Données' });
    XLSX.writeFile(wb, `${filename}.xlsx`);
    showNotification('Export Excel réussi!', 'success');
}

// Export Table to PDF
function exportTableToPDF(tableId, filename) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();
    const table = document.getElementById(tableId);
    
    if (!table) {
        showNotification('Tableau non trouvé', 'error');
        return;
    }

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
    pdf.text(filename, 10, y);
    y += 15;

    const rows = table.querySelectorAll('tr');
    rows.forEach((row, rowIndex) => {
        const cells = row.querySelectorAll('td, th');
        let x = 10;
        cells.forEach((cell, cellIndex) => {
            pdf.setFontSize(rowIndex === 0 ? 12 : 10);
            pdf.setFont(rowIndex === 0 ? 'bold' : 'normal');
            pdf.setTextColor(0, 0, 0);
            pdf.text(cell.textContent, x, y);
            x += 40;
        });
        y += 10;
    });

    pdf.save('devis mr Herman Ambohimanabe.pdf');
    showNotification('Export PDF réussi!', 'success');
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
