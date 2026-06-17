# Nexus Apostas - Iniciar Servidor (Com Node.js Portátil Auto-instalável)

$nodeVersion = "v20.11.1"
$nodeDirName = "node-$nodeVersion-win-x64"
$zipFile = "$PSScriptRoot\node.zip"
$extractDir = "$PSScriptRoot\node-portable"

# Set TLS 1.2/1.3 for download security
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

# 1. Download Node.js if not already present
if (-not (Test-Path "$extractDir\$nodeDirName\node.exe")) {
    Write-Host "====================================================" -ForegroundColor Yellow
    Write-Host "   A descarregar o Node.js portátil ($nodeVersion)..." -ForegroundColor Cyan
    Write-Host "   Isto é feito uma única vez e não instala nada globalmente." -ForegroundColor Gray
    Write-Host "====================================================" -ForegroundColor Yellow
    
    $url = "https://nodejs.org/dist/$nodeVersion/$nodeDirName.zip"
    try {
        Invoke-WebRequest -Uri $url -OutFile $zipFile -UseBasicParsing
    } catch {
        Write-Error "Falha ao descarregar o Node.js: $_"
        exit
    }
    
    Write-Host "A extrair ficheiros do Node.js..." -ForegroundColor Cyan
    try {
        Expand-Archive -Path $zipFile -DestinationPath $extractDir -Force
        Remove-Item $zipFile -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Falha ao extrair o ficheiro zip: $_"
        exit
    }
}

$nodeExe = "$extractDir\$nodeDirName\node.exe"
$npmCmd = "$extractDir\$nodeDirName\npm.cmd"

# Verify download
if (-not (Test-Path $nodeExe)) {
    Write-Error "Não foi possível encontrar o executável do Node.js em $nodeExe."
    exit
}

Write-Host "====================================================" -ForegroundColor Yellow
Write-Host "   Instalar dependências do projeto (Express, etc.)...." -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Yellow
& $npmCmd install

Write-Host "====================================================" -ForegroundColor Yellow
Write-Host "   A INICIAR O SERVIDOR NEXUS APOSTAS..." -ForegroundColor Green
Write-Host "   Acede no teu browser a: http://localhost:3000" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Yellow
& $nodeExe server.js
