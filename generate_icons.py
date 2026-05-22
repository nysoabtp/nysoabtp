#!/usr/bin/env python3
"""
Générateur d'icônes PWA à partir du fichier SVG
Crée des icônes PNG aux tailles: 72, 96, 128, 192, 512
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Configuration
sizes = [72, 96, 128, 192, 512]
svg_file = "icon.svg"
output_dir = "icons"

# Créer le dossier de sortie s'il n'existe pas
os.makedirs(output_dir, exist_ok=True)

# Couleurs
bg_color = (28, 43, 58)  # #1C2B3A
text_color = (232, 99, 26)  # #E8631A
white_color = (255, 255, 255)

def create_icon(size):
    """Crée une icône PNG de la taille donnée"""
    # Créer une image avec fond arrondi
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Dessiner le rectangle arrondi
    corner_radius = size // 6
    draw.rounded_rectangle(
        [(0, 0), (size, size)],
        radius=corner_radius,
        fill=bg_color
    )
    
    # Calculer les positions et tailles du texte
    scale = size / 512
    
    # Lettre N
    font_size_n = int(130 * scale)
    try:
        font_n = ImageFont.truetype("georgia.ttf", font_size_n)
    except:
        font_n = ImageFont.load_default()
    
    text_n = "N"
    bbox_n = draw.textbbox((0, 0), text_n, font=font_n)
    text_width_n = bbox_n[2] - bbox_n[0]
    text_height_n = bbox_n[3] - bbox_n[1]
    x_n = (size - text_width_n) // 2
    y_n = int(200 * scale) - text_height_n // 2
    
    draw.text((x_n, y_n), text_n, fill=text_color, font=font_n)
    
    # Texte BTP
    font_size_btp = int(80 * scale)
    try:
        font_btp = ImageFont.truetype("georgia.ttf", font_size_btp)
    except:
        font_btp = ImageFont.load_default()
    
    text_btp = "BTP"
    bbox_btp = draw.textbbox((0, 0), text_btp, font=font_btp)
    text_width_btp = bbox_btp[2] - bbox_btp[0]
    text_height_btp = bbox_btp[3] - bbox_btp[1]
    x_btp = (size - text_width_btp) // 2
    y_btp = int(340 * scale) - text_height_btp // 2
    
    draw.text((x_btp, y_btp), text_btp, fill=white_color, font=font_btp)
    
    # Ligne orange
    line_y = int(360 * scale)
    line_height = max(2, int(6 * scale))
    line_x_start = int(100 * scale)
    line_width = int(312 * scale)
    draw.rectangle(
        [line_x_start, line_y, line_x_start + line_width, line_y + line_height],
        fill=text_color
    )
    
    # Sauvegarder l'image
    output_path = os.path.join(output_dir, f"icon-{size}.png")
    img.save(output_path, "PNG")
    print(f"✓ Créé: {output_path}")

# Générer toutes les icônes
print("Génération des icônes PWA...")
for size in sizes:
    create_icon(size)

print(f"\n✓ {len(sizes)} icônes générées avec succès dans le dossier '{output_dir}/'")
