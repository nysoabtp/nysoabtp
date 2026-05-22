# Générateur d'icônes PWA pour NYSOA BTP
# Crée des icônes PNG aux tailles: 72, 96, 128, 192, 512

Add-Type -AssemblyName System.Drawing

$sizes = @(72, 96, 128, 192, 512)
$outputDir = "icons"

# Créer le dossier de sortie s'il n'existe pas
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# Couleurs
$bgColor = [System.Drawing.Color]::FromArgb(28, 43, 58)
$textColor = [System.Drawing.Color]::FromArgb(232, 99, 26)
$whiteColor = [System.Drawing.Color]::FromArgb(255, 255, 255)

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
    
    $brush = New-Object System.Drawing.SolidBrush($bgColor)
    $graphics.FillRectangle($brush, 0, 0, $size, $size)
    
    $scale = $size / 512.0
    
    $fontSizeN = [int](130 * $scale)
    $fontN = New-Object System.Drawing.Font("Georgia", $fontSizeN, [System.Drawing.FontStyle]::Bold)
    $textN = "N"
    $stringSizeN = $graphics.MeasureString($textN, $fontN)
    $xN = [int](($size - $stringSizeN.Width) / 2)
    $yN = [int](200 * $scale - $stringSizeN.Height / 2)
    
    $textBrushN = New-Object System.Drawing.SolidBrush($textColor)
    $graphics.DrawString($textN, $fontN, $textBrushN, $xN, $yN)
    
    $fontSizeBTP = [int](80 * $scale)
    $fontBTP = New-Object System.Drawing.Font("Georgia", $fontSizeBTP)
    $textBTP = "BTP"
    $stringSizeBTP = $graphics.MeasureString($textBTP, $fontBTP)
    $xBTP = [int](($size - $stringSizeBTP.Width) / 2)
    $yBTP = [int](340 * $scale - $stringSizeBTP.Height / 2)
    
    $textBrushBTP = New-Object System.Drawing.SolidBrush($whiteColor)
    $graphics.DrawString($textBTP, $fontBTP, $textBrushBTP, $xBTP, $yBTP)
    
    $lineY = [int](360 * $scale)
    $lineHeight = [Math]::Max(2, [int](6 * $scale))
    $lineXStart = [int](100 * $scale)
    $lineWidth = [int](312 * $scale)
    $lineBrush = New-Object System.Drawing.SolidBrush($textColor)
    $graphics.FillRectangle($lineBrush, $lineXStart, $lineY, $lineWidth, $lineHeight)
    
    $outputPath = Join-Path $outputDir "icon-$size.png"
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    $fontN.Dispose()
    $fontBTP.Dispose()
    $brush.Dispose()
    $textBrushN.Dispose()
    $textBrushBTP.Dispose()
    $lineBrush.Dispose()
    
    Write-Host "✓ Créé: $outputPath"
}

Write-Host "`n✓ $($sizes.Count) icônes générées avec succès dans le dossier '$outputDir/'"
