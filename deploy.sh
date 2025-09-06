#!/bin/bash

# 🚀 AeNKI Auth - Automated Production Deployment Script
# Domain: aenki.idotec.online
# Contact: info@sistemasorbix.com

set -e  # Exit on any error

# Configuration
DOMAIN="aenki.idotec.online"
BACKEND_DIR="/opt/aenki-back"
AUTH_DIR="/opt/aenki-auth"
WEB_DIR="/var/www/aenki"
NGINX_CONF="/etc/nginx/sites-available/aenki.idotec.online"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
    fi
}

# Update system packages
update_system() {
    log "🔄 Updating system packages..."
    apt update && apt upgrade -y
    log "✅ System updated successfully"
}

# Install Node.js
install_nodejs() {
    log "📦 Installing Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log "Node.js already installed: $NODE_VERSION"
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
        log "✅ Node.js installed successfully"
    fi
    
    # Install PM2 globally
    npm install -g pm2
    log "✅ PM2 installed successfully"
}

# Install NGINX
install_nginx() {
    log "🌐 Installing NGINX..."
    
    if command -v nginx &> /dev/null; then
        log "NGINX already installed"
    else
        apt install nginx -y
        systemctl enable nginx
        systemctl start nginx
        log "✅ NGINX installed and started"
    fi
}

# Install SSL tools
install_ssl_tools() {
    log "🔒 Installing SSL tools..."
    apt install certbot python3-certbot-nginx -y
    log "✅ SSL tools installed"
}

# Create application directories
create_directories() {
    log "📁 Creating application directories..."
    
    mkdir -p $BACKEND_DIR
    mkdir -p $AUTH_DIR
    mkdir -p $WEB_DIR
    mkdir -p $BACKEND_DIR/uploads
    mkdir -p $BACKEND_DIR/data
    mkdir -p $BACKEND_DIR/public
    
    # Set permissions
    chown -R www-data:www-data $WEB_DIR
    
    log "✅ Directories created successfully"
}

# Deploy application files
deploy_files() {
    log "📋 Deploying application files..."
    
    if [ ! -f "./package.json" ]; then
        error "package.json not found. Please run this script from the project directory."
    fi
    
    # Copy main application
    cp -r ./* $BACKEND_DIR/
    
    # Copy auth server
    if [ -f "./auth-server.js" ]; then
        cp ./auth-server.js $AUTH_DIR/server.js
        cp ./package.json $AUTH_DIR/
    else
        error "auth-server.js not found"
    fi
    
    log "✅ Files deployed successfully"
}

# Install dependencies
install_dependencies() {
    log "📦 Installing application dependencies..."
    
    # Backend dependencies
    cd $BACKEND_DIR
    npm install --production
    
    # Auth service dependencies
    cd $AUTH_DIR
    npm install --production
    
    log "✅ Dependencies installed successfully"
}

# Configure environment
configure_environment() {
    log "⚙️ Configuring environment..."
    
    # Create backend .env if it doesn't exist
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        cat > $BACKEND_DIR/.env << EOF
NODE_ENV=production
PORT=8000
AENKI_INTROSPECTION_URL=https://accounts.aenki.app/auth/realms/aenki/protocol/openid_connect/token/introspect
AENKI_CLIENT_ID=aenki-back
AENKI_CLIENT_SECRET=your_client_secret_here
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLOUD_KEY_FILE=$BACKEND_DIR/google-credentials.json
ADMIN_TOKEN=your_secure_admin_token_here
EOF
        warn "Backend .env created with default values. Please update with your actual credentials."
    fi
    
    # Create auth .env if it doesn't exist
    if [ ! -f "$AUTH_DIR/.env" ]; then
        cat > $AUTH_DIR/.env << EOF
NODE_ENV=production
PORT=8005
JWT_SECRET=your_very_secure_jwt_secret_here
ADMIN_TOKEN=your_secure_admin_token_here
EOF
        warn "Auth .env created with default values. Please update with your actual credentials."
    fi
    
    # Set secure permissions
    chmod 600 $BACKEND_DIR/.env
    chmod 600 $AUTH_DIR/.env
    
    log "✅ Environment configured"
}

# Configure NGINX
configure_nginx() {
    log "🌐 Configuring NGINX..."
    
    if [ -f "./nginx-aenki.conf" ]; then
        cp ./nginx-aenki.conf $NGINX_CONF
        
        # Enable site
        ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
        
        # Test configuration
        nginx -t
        
        # Reload NGINX
        systemctl reload nginx
        
        log "✅ NGINX configured successfully"
    else
        warn "nginx-aenki.conf not found. Please configure NGINX manually."
    fi
}

# Start PM2 services
start_services() {
    log "🚀 Starting PM2 services..."
    
    cd $BACKEND_DIR
    
    if [ -f "./ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup
        log "✅ PM2 services started successfully"
    else
        # Manual PM2 start if ecosystem.config.js is not available
        pm2 start server.js --name aenki-back --cwd $BACKEND_DIR
        pm2 start server.js --name aenki-auth --cwd $AUTH_DIR
        pm2 save
        pm2 startup
        log "✅ PM2 services started manually"
    fi
}

# Install SSL certificate
install_ssl() {
    log "🔒 Installing SSL certificate..."
    
    # Check if domain resolves
    if dig +short $DOMAIN > /dev/null; then
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email info@sistemasorbix.com
        log "✅ SSL certificate installed successfully"
    else
        warn "Domain $DOMAIN does not resolve. Please configure DNS first."
        warn "SSL installation skipped. Run manually: sudo certbot --nginx -d $DOMAIN"
    fi
}

# Test deployment
test_deployment() {
    log "🧪 Testing deployment..."
    
    # Test backend health
    if curl -s http://localhost:8000/api/health > /dev/null; then
        log "✅ Backend service is healthy"
    else
        warn "Backend service health check failed"
    fi
    
    # Test auth health
    if curl -s http://localhost:8005/auth/health > /dev/null; then
        log "✅ Auth service is healthy"
    else
        warn "Auth service health check failed"
    fi
    
    # Test NGINX
    if curl -s http://localhost > /dev/null; then
        log "✅ NGINX is responding"
    else
        warn "NGINX health check failed"
    fi
}

# Display status
show_status() {
    log "📊 Deployment Status:"
    echo ""
    echo "🌐 Domain: $DOMAIN"
    echo "📁 Backend: $BACKEND_DIR"
    echo "🔐 Auth: $AUTH_DIR"
    echo "🌍 Web: $WEB_DIR"
    echo ""
    echo "🚀 Services:"
    pm2 status
    echo ""
    echo "🌐 NGINX Status:"
    systemctl status nginx --no-pager -l
    echo ""
    echo "🔗 Test URLs:"
    echo "  - Health: https://$DOMAIN/api/health"
    echo "  - Auth: https://$DOMAIN/auth/health"
    echo ""
    echo "📝 Next Steps:"
    echo "  1. Update .env files with your actual credentials"
    echo "  2. Configure DNS A record for $DOMAIN"
    echo "  3. Run SSL setup if skipped: sudo certbot --nginx -d $DOMAIN"
    echo "  4. Test all endpoints"
    echo ""
    log "🎉 Deployment completed successfully!"
}

# Main deployment function
main() {
    log "🚀 Starting AeNKI Auth deployment for $DOMAIN"
    
    check_root
    update_system
    install_nodejs
    install_nginx
    install_ssl_tools
    create_directories
    deploy_files
    install_dependencies
    configure_environment
    configure_nginx
    start_services
    install_ssl
    test_deployment
    show_status
    
    log "✅ Deployment script completed!"
}

# Run main function
main "$@"
