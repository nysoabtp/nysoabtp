// Générateur d'icônes PWA pour NYSOA BTP
// Exécutez avec: node create-icons.js (nécessite npm install canvas)

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const sizes = [72, 96, 128, 192, 512];
const outputDir = 'icons';

// Créer le dossier de sortie
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Couleurs
const bgColor = '#1C2B3A';
const textColor = '#E8631A';
const whiteColor = '#FFFFFF';

function createIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Fond
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    
    // Échelle
    const scale = size / 512;
    
    // Lettre N
    ctx.fillStyle = textColor;
    ctx.font = `bold ${130 * scale}px Georgia`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', size / 2, 200 * scale);
    
    // Texte BTP
    ctx.fillStyle = whiteColor;
    ctx.font = `${80 * scale}px Georgia`;
    ctx.fillText('BTP', size / 2, 340 * scale);
    
    // Ligne orange
    ctx.fillStyle = textColor;
    const lineY = 360 * scale;
    const lineHeight = Math.max(2, 6 * scale);
    const lineXStart = 100 * scale;
    const lineWidth = 312 * scale;
    ctx.fillRect(lineXStart, lineY, lineWidth, lineHeight);
    
    // Sauvegarder
    const buffer = canvas.toBuffer('image/png');
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    fs.writeFileSync(outputPath, buffer);
    console.log(`✓ Créé: ${outputPath}`);
}

// Générer toutes les icônes
console.log('Génération des icônes PWA...');
sizes.forEach(size => createIcon(size));
console.log(`\n✓ ${sizes.length} icônes générées avec succès dans le dossier '${outputDir}/'`);
