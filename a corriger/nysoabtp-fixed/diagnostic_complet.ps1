Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DIAGNOSTIC COMPLET - ERP NySoa BTP" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$root = "D:\Mandimby\nysoabtp-github"
$passed = 0; $failed = 0; $warnings = 0

function Test-Check {
    param($Name, $Condition, $FailMsg)
    if (& $Condition) { $script:passed++; Write-Host "  [PASS] $Name" -ForegroundColor Green }
    else { $script:failed++; Write-Host "  [FAIL] $Name — $FailMsg" -ForegroundColor Red }
}
function Test-Warn {
    param($Name, $Condition, $WarnMsg)
    if (& $Condition) { $script:passed++; Write-Host "  [PASS] $Name" -ForegroundColor Green }
    else { $script:warnings++; Write-Host "  [WARN] $Name — $WarnMsg" -ForegroundColor Yellow }
}

# ===== 1. PAGE EXISTENCE =====
Write-Host "--- 1. PAGES EXISTENTES ---" -ForegroundColor Magenta
$pages = @('index.html','daf.html','rh.html','technicien.html','chef-chantier.html','controleur.html','pointage.html','login.html','admin.html','suivi-chantier.html','stock.html','materiel.html')
foreach ($p in $pages) {
    Test-Check "  $p" { Test-Path "$root\$p" } "Fichier manquant"
}

# ===== 2. AUTH GUARDS =====
Write-Host "--- 2. GARDES AUTH ---" -ForegroundColor Magenta
foreach ($p in $pages | Where-Object {$_ -ne 'login.html'}) {
    $content = Get-Content "$root\$p" -Raw
    Test-Check "  Auth guard $p" { $content -match 'nysoa_current_user|authGuard|redirect.*login' } "Aucune protection auth"
}

# ===== 3. SUPABASE CONFIG =====
Write-Host "--- 3. SUPABASE CONFIG ---" -ForegroundColor Magenta
$supaContent = Get-Content "$root\supabase.js" -Raw -ErrorAction SilentlyContinue
Test-Check "  supabase.js exists" { $null -ne $supaContent } "supabase.js manquant"
if ($supaContent) {
    Test-Check "  Supabase URL configurée" { $supaContent -match 'supabase\.co|supabase\.io' } "URL manquante"
    Test-Check "  Anon key configurée" { $supaContent -match 'eyJ' } "Clé anon manquante"
}

# ===== 4. STAT IDs (dashboard) =====
Write-Host "--- 4. STAT CARDS IDs (index.html) ---" -ForegroundColor Magenta
$indexContent = Get-Content "$root\index.html" -Raw
$statIds = @('dashboard-stat-chantiers','dashboard-stat-revenus','dashboard-stat-employes','dashboard-stat-stock',
             'achat-stat-commandes','achat-stat-depenses','achat-stat-attente',
             'personnel-stat-total','personnel-stat-ouvriers','personnel-stat-cadres',
             'proformat-stat-mois','proformat-stat-convertis','proformat-stat-attente')
foreach ($id in $statIds) {
    Test-Check "  id=$id" { $indexContent -match "id=`"$id`"" } "ID manquant dans index.html"
}

# ===== 5. STAT IDs RH =====
Write-Host "--- 5. STAT CARDS IDs (rh.html) ---" -ForegroundColor Magenta
$rhContent = Get-Content "$root\rh.html" -Raw
$rhIds = @('stat-total-employes','stat-nouvelles-embauches','stat-conges-cours','stat-formations',
           'recrut-stat-offres','recrut-stat-candidatures','recrut-stat-entretiens',
           'paie-stat-masse','paie-stat-fiches')
foreach ($id in $rhIds) {
    Test-Check "  id=$id" { $rhContent -match "id=`"$id`"" } "ID manquant dans rh.html"
}

# ===== 6. KEY FUNCTIONS IN script.js =====
Write-Host "--- 6. FONCTIONS CLES (script.js) ---" -ForegroundColor Magenta
$scriptContent = Get-Content "$root\script.js" -Raw
$funcs = @('async function updateDashboardStats','exportChart','viewRow','printRow','editRow','saveRow',
           'convertToProformat','convertToFacture','openModal','closeModal','showNotification',
           'importExcelFile','exportTableToExcel','loadRevenueChart','loadProjectChart')
foreach ($f in $funcs) {
    Test-Check "  $f" { $scriptContent -match [regex]::Escape($f) } "Fonction manquante"
}

# ===== 7. KEY FUNCTIONS IN modules_new.js =====
Write-Host "--- 7. FONCTIONS CLES (modules_new.js) ---" -ForegroundColor Magenta
$modulesContent = Get-Content "$root\modules_new.js" -Raw -ErrorAction SilentlyContinue
if ($modulesContent) {
    $mfuncs = @('loginWithSupabase','logout','authGuard','loadUtilisateurs')
    foreach ($f in $mfuncs) {
        Test-Check "  $f" { $modulesContent -match [regex]::Escape($f) } "Fonction manquante"
    }
}

# ===== 8. TABLEAUX STATS (index.html) =====
Write-Host "--- 8. TABLEAUX PRESENTS (index.html) ---" -ForegroundColor Magenta
$tables = @('chantiers-table','devis-table','factures-table','journal-table','personnel-table',
            'achats-table','caisse-table')
foreach ($t in $tables) {
    Test-Check "  id=$t" { $indexContent -match "id=`"$t`"" } "Table manquant"
}

# ===== 9. MODALS =====
Write-Host "--- 9. MODALES ---" -ForegroundColor Magenta
$modalsSearch = @('modal-employe','modal-proformat','modal-facture','modal-journal','modal-commande')
foreach ($m in $modalsSearch) {
    Test-Check "  $m dans index.html" { $indexContent -match "id=`"$m`"" } "Modale manquante"
}
# RH modals
$rhModals = @('modal-recrutement','modal-conge','modal-formation')
foreach ($m in $rhModals) {
    Test-Check "  $m dans rh.html" { $rhContent -match "id=`"$m`"" } "Modale manquante"
}

# ===== 10. CDN SCRIPTS =====
Write-Host "--- 10. CDN SCRIPTS ---" -ForegroundColor Magenta
$cdns = @('supabase','chart\.js','xlsx','jspdf','fontawesome','html5-qrcode')
foreach ($cdn in $cdns) {
    $found = 0
    foreach ($p in $pages) {
        $c = Get-Content "$root\$p" -Raw
        if ($c -match $cdn) { $found++ }
    }
    Test-Warn "  $cdn (sur $found/$($pages.count) pages)" { $found -ge 8 } "Trouvé sur seulement $found pages"
}

# ===== 11. EXPORTS =====
Write-Host "--- 11. EXPORTS ---" -ForegroundColor Magenta
$exportFuncs = @('exportTableToPDF','exportTableToExcel','exportChart')
foreach ($f in $exportFuncs) {
    Test-Check "  $f" { $scriptContent -match [regex]::Escape($f) } "Fonction export manquante"
}
Test-Check "  exportRapportsPDF" { $scriptContent -match 'exportRapportsPDF' } "Fonction manquante"
Test-Check "  exportRapportsExcel" { $scriptContent -match 'exportRapportsExcel' } "Fonction manquante"
Test-Check "  exportGanttPDF" { $scriptContent -match 'exportGanttPDF' } "Fonction manquante"

# ===== 12. FAVICON =====
Write-Host "--- 12. FAVICON ---" -ForegroundColor Magenta
Test-Check "  icon.svg" { Test-Path "$root\icon.svg" } "Fichier manquant"
$faviconPages = 0
foreach ($p in $pages) {
    $c = Get-Content "$root\$p" -Raw
    if ($c -match 'icon\.svg') { $faviconPages++ }
}
Test-Warn "  Favicon sur $faviconPages/$($pages.count) pages" { $faviconPages -eq $pages.count } "Manquant sur certaines pages"

# ===== 13. SERVICE WORKER =====
Write-Host "--- 13. SERVICE WORKER ---" -ForegroundColor Magenta
Test-Check "  sw.js" { Test-Path "$root\sw.js" } "Fichier manquant"
if (Test-Path "$root\sw.js") {
    $sw = Get-Content "$root\sw.js" -Raw
    Test-Warn "  SW v3+ detected" { $sw -match 'v3|version.*3' } "Version non précisée"
}

# ===== 14. HTML STRUCTURE INTEGRITY =====
Write-Host "--- 14. STRUCTURE HTML ---" -ForegroundColor Magenta
foreach ($p in $pages) {
    $c = Get-Content "$root\$p" -Raw
    Test-Check "  <!DOCTYPE> $p" { $c -match '<!DOCTYPE html>' } "DOCTYPE manquant"
    Test-Check "  </html> $p" { $c -match '</html>' } "Fermeture html manquante"
}

# ===== 15. GALERIE PHOTOS (Storage) =====
Write-Host "--- 15. GALERIE PHOTOS ---" -ForegroundColor Magenta
$chefContent = Get-Content "$root\chef-chantier.html" -Raw
Test-Check "  uploadGalleryPhoto" { $chefContent -match 'uploadGalleryPhoto|uploadPhoto' } "Fonction upload manquante"
Test-Check "  supabase.storage" { $chefContent -match 'supabase\.storage\.from' } "Storage non configuré"

# ===== 16. POINTAGE =====
Write-Host "--- 16. POINTAGE ---" -ForegroundColor Magenta
$pointageContent = Get-Content "$root\pointage.html" -Raw
Test-Check "  QR scan" { $pointageContent -match 'html5-qrcode|QrScanner' } "Scan QR manquant"
Test-Check "  pointage table" { $pointageContent -match 'pointage_attendance' } "Table pointage non configurée"

# ===== 17. CONTROLEUR =====
Write-Host "--- 17. CONTROLEUR ---" -ForegroundColor Magenta
$ctrlContent = Get-Content "$root\controleur.html" -Raw
Test-Check "  loadControleurData" { $ctrlContent -match 'loadControleurData' } "Fonction manquante"
Test-Check "  try catch form" { $ctrlContent -match 'try\s*\{' } "try/catch manquant"

# ===== 18. BASE DE DONNEES (Supabase REST) =====
Write-Host "--- 18. BASE DE DONNEES (Supabase) ---" -ForegroundColor Magenta
try {
    $supabaseUrl = "https://djncsybvloyyesllfxhq.supabase.co"
    $anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqbmNzeWJ2bG95eWVzbGxmeGhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NDI1OTksImV4cCI6MjA5MzMxODU5OX0.P5h_JJtpmVqj4ODQVpQIT-RTQXzId1CKLByN4VAB8DA"

    $tables = @('chantiers','personnel','devis','pointage_attendance','journal_comptable','conges','salaires','contrats','mouvements_stock','commandes')
    foreach ($table in $tables) {
        try {
            $resp = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$table?select=count&limit=0" -Headers @{
                "apikey" = $anonKey
                "Authorization" = "Bearer $anonKey"
                "Accept" = "application/json"
                "Prefer" = "count=exact"
            } -Method Get -ContentType "application/json" -ErrorAction Stop
            # Check if response has content (status 200)
            Test-Check "  Table $table accessible" { $true } "Erreur d'accès"
        } catch {
            # Try with just a count
            try {
                $resp2 = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/$table?select=count" -Headers @{
                    "apikey" = $anonKey
                    "Authorization" = "Bearer $anonKey"
                } -Method Get -ErrorAction Stop
                Test-Check "  Table $table accessible" { $true } "OK"
            } catch {
                Test-Check "  Table $table accessible" { $false } "Erreur: $_"
            }
        }
    }
} catch {
    Write-Host "  [SKIP] DB tests — Supabase non joignable: $_" -ForegroundColor Yellow
    $warnings++
}

# ===== SUMMARY =====
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESULTATS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  PASS: $passed" -ForegroundColor Green
Write-Host "  FAIL: $failed" -ForegroundColor Red
Write-Host "  WARN: $warnings" -ForegroundColor Yellow
$total = $passed + $failed
if ($total -gt 0) {
    $pct = [Math]::Round($passed / $total * 100, 1)
    Write-Host "  SCORE: $pct%" -ForegroundColor $(if ($pct -ge 90) {"Green"} elseif ($pct -ge 70) {"Yellow"} else {"Red"})
}
Write-Host "========================================" -ForegroundColor Cyan

if ($failed -gt 0) {
    exit 1
}
