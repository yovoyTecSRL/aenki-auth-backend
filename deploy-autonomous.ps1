# 🚀 AeNKI Avatar Deployment Script
# Autonomous deployment system for public web interface

param(
    [string]$Domain = "aenki.sistemasorbix.com",
    [string]$DeployPath = "/var/www/sistemasorbix.com/aenki",
    [int]$BackendPort = 8000,
    [string]$PM2AppName = "aenki-backend",
    [switch]$DryRun,
    [switch]$SkipSSL,
    [switch]$SkipHealthCheck
)

$ErrorActionPreference = "Stop"

# Color output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "ℹ️ $Message" -ForegroundColor Cyan }
function Write-Step { param($Message) Write-Host "🔄 $Message" -ForegroundColor Blue }

Write-Host @"
🚀 AeNKI Avatar Autonomous Deployment
=====================================
Domain: $Domain
Deploy Path: $DeployPath  
Backend Port: $BackendPort
PM2 App: $PM2AppName
$(if ($DryRun) { "Mode: DRY RUN (no changes will be made)" })
"@ -ForegroundColor Magenta

# Validate prerequisites
Write-Step "Checking prerequisites..."

$requiredFiles = @(
    "aenki-conectado.html",
    "server.js", 
    "package.json",
    "aenki.sistemasorbix.com.conf"
)

foreach ($file in $requiredFiles) {
    if (!(Test-Path $file)) {
        Write-Error "Required file not found: $file"
        exit 1
    }
}

Write-Success "All required files found"

# Check if running on Windows (local) vs Linux (server)
$isWindows = $PSVersionTable.Platform -eq "Win32NT" -or $env:OS -eq "Windows_NT"

if ($isWindows) {
    Write-Info "Running on Windows - preparing files for server deployment"
    
    # Create deployment package
    Write-Step "Creating deployment package..."
    
    $deployDir = "deploy-package"
    if (Test-Path $deployDir) { Remove-Item $deployDir -Recurse -Force }
    New-Item -ItemType Directory -Path $deployDir | Out-Null
    
    # Copy files to deployment package
    Copy-Item "aenki-conectado.html" "$deployDir/"
    Copy-Item "aenki-conectado.html" "$deployDir/index.html"
    Copy-Item "server.js" "$deployDir/"
    Copy-Item "package*.json" "$deployDir/"
    Copy-Item "aenki.sistemasorbix.com.conf" "$deployDir/"
    
    if (Test-Path "debug-aenki.html") { Copy-Item "debug-aenki.html" "$deployDir/" }
    if (Test-Path "test-cors.html") { Copy-Item "test-cors.html" "$deployDir/" }
    
    Write-Success "Deployment package created in: $deployDir"
    
    # Generate server deployment script
    $serverScript = @"
#!/bin/bash
set -e

# AeNKI Server Deployment Script
DOMAIN="$Domain"
DEPLOY_PATH="$DeployPath"
BACKEND_PORT=$BackendPort
PM2_APP_NAME="$PM2AppName"

echo "🚀 Starting AeNKI deployment on server..."

# Create deployment directories
sudo mkdir -p `$DEPLOY_PATH
sudo mkdir -p /opt/aenki-backend

# Deploy frontend files
echo "📁 Deploying frontend files..."
sudo cp aenki-conectado.html `$DEPLOY_PATH/
sudo cp aenki-conectado.html `$DEPLOY_PATH/index.html
if [ -f "debug-aenki.html" ]; then sudo cp debug-aenki.html `$DEPLOY_PATH/; fi
if [ -f "test-cors.html" ]; then sudo cp test-cors.html `$DEPLOY_PATH/; fi

# Set permissions
sudo chown -R www-data:www-data `$DEPLOY_PATH
sudo chmod -R 644 `$DEPLOY_PATH/*.html

# Configure NGINX
echo "🌐 Configuring NGINX..."
if [ ! -f "/etc/nginx/sites-available/`$DOMAIN.conf" ]; then
    sudo cp aenki.sistemasorbix.com.conf /etc/nginx/sites-available/`$DOMAIN.conf
    sudo ln -sf /etc/nginx/sites-available/`$DOMAIN.conf /etc/nginx/sites-enabled/
fi

# Test NGINX configuration
sudo nginx -t

# Deploy backend
echo "🖥️ Deploying backend..."
sudo cp server.js /opt/aenki-backend/
sudo cp package*.json /opt/aenki-backend/

# Install backend dependencies
cd /opt/aenki-backend
sudo npm ci --production

# Restart services
echo "🔄 Restarting services..."
sudo systemctl reload nginx
pm2 restart `$PM2_APP_NAME || pm2 start server.js --name `$PM2_APP_NAME
pm2 save

# Health check
echo "🏥 Running health check..."
sleep 5
if curl -sf http://127.0.0.1:`$BACKEND_PORT/api/health -H "x-aenki-key: aenki-production-2025"; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

echo "🎉 AeNKI deployment completed successfully!"
echo "🌐 Frontend: https://`$DOMAIN"
echo "💬 Chat API: https://`$DOMAIN/api/chat"
"@

    $serverScript | Out-File -FilePath "$deployDir/deploy-server.sh" -Encoding UTF8
    
    Write-Success "Server deployment script created: $deployDir/deploy-server.sh"
    
    # Generate upload instructions
    $instructions = @"
📤 DEPLOYMENT INSTRUCTIONS
==========================

1. Upload the deployment package to your server:
   scp -r $deployDir/* user@your-server:/tmp/aenki-deploy/

2. Connect to your server and run the deployment:
   ssh user@your-server
   cd /tmp/aenki-deploy
   chmod +x deploy-server.sh
   ./deploy-server.sh

3. Setup SSL certificate (if not already done):
   sudo certbot --nginx -d $Domain

4. Verify deployment:
   https://$Domain

🔧 MANUAL DEPLOYMENT COMMANDS
=============================
If you prefer manual deployment, run these commands on your server:

# Frontend deployment
sudo mkdir -p $DeployPath
sudo cp aenki-conectado.html $DeployPath/
sudo cp aenki-conectado.html $DeployPath/index.html
sudo chown -R www-data:www-data $DeployPath
sudo chmod -R 644 $DeployPath/*.html

# NGINX configuration  
sudo cp aenki.sistemasorbix.com.conf /etc/nginx/sites-available/$Domain.conf
sudo ln -sf /etc/nginx/sites-available/$Domain.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Backend deployment
sudo mkdir -p /opt/aenki-backend
sudo cp server.js package*.json /opt/aenki-backend/
cd /opt/aenki-backend
sudo npm ci --production
pm2 restart $PM2AppName || pm2 start server.js --name $PM2AppName
pm2 save

# SSL setup
sudo certbot --nginx -d $Domain

# Health check
curl -s https://$Domain/api/health -H "x-aenki-key: aenki-production-2025"
"@

    $instructions | Out-File -FilePath "$deployDir/DEPLOYMENT_INSTRUCTIONS.txt" -Encoding UTF8
    Write-Success "Deployment instructions created: $deployDir/DEPLOYMENT_INSTRUCTIONS.txt"
    
    Write-Host @"

🎯 NEXT STEPS:
1. Transfer files to server: Upload '$deployDir' contents to your server
2. Run deployment script: Execute deploy-server.sh on the server  
3. Configure SSL: Run certbot for HTTPS
4. Test deployment: Visit https://$Domain

"@ -ForegroundColor Green

} else {
    # Running on Linux server - execute deployment
    Write-Info "Running on Linux server - executing deployment"
    
    if ($DryRun) {
        Write-Warning "DRY RUN MODE - No changes will be made"
        Write-Info "Would deploy to: $DeployPath"
        Write-Info "Would configure NGINX for: $Domain"  
        Write-Info "Would start PM2 app: $PM2AppName"
        exit 0
    }
    
    # Deploy frontend
    Write-Step "Deploying frontend files..."
    sudo mkdir -p $DeployPath
    sudo cp "aenki-conectado.html" "$DeployPath/"
    sudo cp "aenki-conectado.html" "$DeployPath/index.html"
    
    if (Test-Path "debug-aenki.html") { sudo cp "debug-aenki.html" "$DeployPath/" }
    if (Test-Path "test-cors.html") { sudo cp "test-cors.html" "$DeployPath/" }
    
    sudo chown -R www-data:www-data $DeployPath
    sudo chmod -R 644 "$DeployPath/*.html"
    
    Write-Success "Frontend files deployed"
    
    # Configure NGINX
    Write-Step "Configuring NGINX..."
    $nginxConfig = "/etc/nginx/sites-available/$Domain.conf"
    
    if (!(Test-Path $nginxConfig)) {
        sudo cp "aenki.sistemasorbix.com.conf" $nginxConfig
        sudo ln -sf $nginxConfig "/etc/nginx/sites-enabled/"
        Write-Success "NGINX configuration installed"
    } else {
        Write-Info "NGINX configuration already exists"
    }
    
    # Test NGINX
    $nginxTest = sudo nginx -t
    if ($LASTEXITCODE -eq 0) {
        Write-Success "NGINX configuration is valid"
        sudo systemctl reload nginx
        Write-Success "NGINX reloaded"
    } else {
        Write-Error "NGINX configuration test failed"
        exit 1
    }
    
    # Deploy backend
    Write-Step "Deploying backend..."
    sudo mkdir -p "/opt/aenki-backend"
    sudo cp "server.js" "/opt/aenki-backend/"
    sudo cp package*.json "/opt/aenki-backend/"
    
    cd "/opt/aenki-backend"
    sudo npm ci --production
    Write-Success "Backend dependencies installed"
    
    # Restart PM2 app
    Write-Step "Restarting backend service..."
    $pm2Restart = pm2 restart $PM2AppName 2>$null
    if ($LASTEXITCODE -ne 0) {
        pm2 start server.js --name $PM2AppName
        Write-Success "PM2 app started: $PM2AppName"
    } else {
        Write-Success "PM2 app restarted: $PM2AppName"
    }
    
    pm2 save
    
    # Health check
    if (!$SkipHealthCheck) {
        Write-Step "Running health check..."
        Start-Sleep 5
        
        $healthCheck = curl -sf "http://127.0.0.1:$BackendPort/api/health" -H "x-aenki-key: aenki-production-2025"
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Backend health check passed"
        } else {
            Write-Warning "Backend health check failed - service may need time to start"
        }
    }
    
    # SSL setup reminder
    if (!$SkipSSL) {
        Write-Info "To setup SSL certificate, run:"
        Write-Host "sudo certbot --nginx -d $Domain" -ForegroundColor Yellow
    }
    
    Write-Success "🎉 AeNKI deployment completed!"
    Write-Host @"

🌐 Deployment Summary:
- Frontend: https://$Domain  
- Health: https://$Domain/api/health
- Chat API: https://$Domain/api/chat
- TTS API: https://$Domain/api/tts

"@ -ForegroundColor Green
}
