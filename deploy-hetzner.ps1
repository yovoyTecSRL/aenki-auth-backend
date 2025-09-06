# AeNKI Auth - Hetzner Deployment Script
# PowerShell script for uploading and deploying to production server

param(
    [string]$ServerIP = "YOUR_HETZNER_SERVER_IP",
    [string]$Username = "root",
    [string]$Domain = "aenki.idotec.online"
)

Write-Host "🚀 AeNKI Auth - Hetzner Production Deployment" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue

# Check if server IP is provided
if ($ServerIP -eq "YOUR_HETZNER_SERVER_IP") {
    Write-Host "❌ Please update the ServerIP parameter with your actual Hetzner server IP" -ForegroundColor Red
    Write-Host "Usage: .\deploy-hetzner.ps1 -ServerIP '1.2.3.4'" -ForegroundColor Yellow
    exit 1
}

# Prepare files for upload
Write-Host "📦 Preparing files for upload..." -ForegroundColor Cyan

# Create deployment package (exclude unnecessary files)
$excludeList = @(
    "node_modules",
    ".git",
    "*.log",
    ".env",
    "deploy-hetzner.ps1"
)

# Copy production environment file
Copy-Item ".env.production" ".env" -Force
Write-Host "✅ Production environment configured" -ForegroundColor Green

# Create tar archive for upload
Write-Host "📋 Creating deployment package..." -ForegroundColor Cyan
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packageName = "aenki-auth-$timestamp.tar.gz"

# Using WSL or Git Bash if available for tar
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    wsl tar --exclude=node_modules --exclude=.git --exclude="*.log" -czf $packageName *
} elseif (Get-Command bash -ErrorAction SilentlyContinue) {
    bash -c "tar --exclude=node_modules --exclude=.git --exclude='*.log' -czf $packageName *"
} else {
    Write-Host "⚠️ tar not available. Files will be uploaded individually." -ForegroundColor Yellow
}

# Upload files to server
Write-Host "🌐 Uploading to server: $ServerIP" -ForegroundColor Cyan

$uploadCommands = @"
# Upload and extract files
scp $packageName ${Username}@${ServerIP}:/tmp/
ssh ${Username}@${ServerIP} "
    # Create application directory
    mkdir -p /opt/aenki-auth-node
    
    # Extract files
    cd /opt/aenki-auth-node
    tar -xzf /tmp/$packageName
    
    # Install Node.js if not present
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        apt-get install -y nodejs
    fi
    
    # Install PM2 globally
    npm install -g pm2
    
    # Install application dependencies
    npm install --production
    
    # Install NGINX if not present
    if ! command -v nginx &> /dev/null; then
        apt update
        apt install -y nginx
        systemctl enable nginx
        systemctl start nginx
    fi
    
    # Install Certbot for SSL
    apt install -y certbot python3-certbot-nginx
    
    # Configure PM2
    pm2 stop aenki-auth 2>/dev/null || true
    pm2 delete aenki-auth 2>/dev/null || true
    pm2 start server.js --name aenki-auth
    pm2 save
    pm2 startup
    
    # Configure NGINX
    cat > /etc/nginx/sites-available/$Domain << 'EOF'
server {
    listen 80;
    server_name $Domain;

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header Referrer-Policy \"no-referrer-when-downgrade\" always;
    add_header Content-Security-Policy \"default-src 'self' http: https: data: blob: 'unsafe-inline'\" always;

    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://127.0.0.1:8005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://127.0.0.1:8005;
        access_log off;
    }
}
EOF

    # Enable NGINX site
    ln -sf /etc/nginx/sites-available/$Domain /etc/nginx/sites-enabled/
    nginx -t
    systemctl reload nginx
    
    # Setup SSL
    certbot --nginx -d $Domain --non-interactive --agree-tos --email info@sistemasorbix.com
    
    # Verify deployment
    sleep 5
    curl -s https://$Domain/api/health
    
    echo '🎉 AeNKI Auth deployed successfully!'
    echo '🌐 URL: https://$Domain'
    echo '🔗 Health: https://$Domain/api/health'
    echo '💬 Chat: https://$Domain/api/chat'
    echo '🗣️ TTS: https://$Domain/api/tts'
"
"@

Write-Host "📝 Deployment commands prepared. Execute the following:" -ForegroundColor Yellow
Write-Host $uploadCommands -ForegroundColor White

# Option to execute automatically
$execute = Read-Host "Do you want to execute the deployment now? (y/N)"
if ($execute -eq "y" -or $execute -eq "Y") {
    Write-Host "🚀 Executing deployment..." -ForegroundColor Green
    Invoke-Expression $uploadCommands
} else {
    Write-Host "📋 Commands prepared. Run them manually when ready." -ForegroundColor Cyan
}

# Clean up
if (Test-Path $packageName) {
    Remove-Item $packageName
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Blue
Write-Host "✅ Deployment script completed!" -ForegroundColor Green
Write-Host "🔗 Test URL: https://$Domain/api/health" -ForegroundColor Cyan
