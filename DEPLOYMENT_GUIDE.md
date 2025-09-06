# 🚀 AeNKI Auth - Production Deployment Guide

## 📋 System Requirements
- Ubuntu/Debian server with root access
- Node.js 18+ (LTS recommended)
- NGINX web server
- PM2 process manager
- SSL certificate (Let's Encrypt)

## 🔧 Server Setup Commands

### 1. Initial Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (20.x LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install NGINX
sudo apt install nginx -y

# Install SSL tools
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Project Deployment
```bash
# Create application directories
sudo mkdir -p /opt/aenki-back
sudo mkdir -p /opt/aenki-auth
sudo mkdir -p /var/www/aenki

# Set permissions
sudo chown -R $USER:$USER /opt/aenki-back
sudo chown -R $USER:$USER /opt/aenki-auth
sudo chown -R www-data:www-data /var/www/aenki

# Upload project files (use WinSCP/Bitvise from Windows)
# Copy all files from local project to /opt/aenki-back/
# Copy auth-server.js to /opt/aenki-auth/server.js
```

### 3. Backend Installation
```bash
cd /opt/aenki-back

# Install dependencies
npm install --production

# Create uploads and data directories
mkdir -p uploads data public

# Set environment permissions
chmod 600 .env

# Copy auth server
cp auth-server.js /opt/aenki-auth/server.js
cp package.json /opt/aenki-auth/
cp .env /opt/aenki-auth/

cd /opt/aenki-auth
npm install --production
```

### 4. Environment Configuration
```bash
# Main backend .env (in /opt/aenki-back)
NODE_ENV=production
PORT=8000
AENKI_INTROSPECTION_URL=https://accounts.aenki.app/auth/realms/aenki/protocol/openid_connect/token/introspect
AENKI_CLIENT_ID=aenki-back
AENKI_CLIENT_SECRET=your_client_secret_here
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_CLOUD_KEY_FILE=/opt/aenki-back/google-credentials.json
ADMIN_TOKEN=your_secure_admin_token_here

# Auth service .env (in /opt/aenki-auth)
NODE_ENV=production
PORT=8005
JWT_SECRET=your_very_secure_jwt_secret_here
ADMIN_TOKEN=your_secure_admin_token_here
```

### 5. PM2 Process Management
```bash
cd /opt/aenki-back

# Start services with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
# Follow the command provided by PM2

# Monitor services
pm2 status
pm2 logs aenki-back
pm2 logs aenki-auth
```

### 6. NGINX Configuration
```bash
# Copy NGINX configuration
sudo cp nginx-aenki.conf /etc/nginx/sites-available/aenki.idotec.online

# Enable site
sudo ln -sf /etc/nginx/sites-available/aenki.idotec.online /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx
```

### 7. SSL Certificate Setup
```bash
# Install SSL certificate
sudo certbot --nginx -d aenki.idotec.online

# Test automatic renewal
sudo certbot renew --dry-run
```

## 🧪 Testing Endpoints

### Health Check
```bash
# Backend health
curl -s https://aenki.idotec.online/api/health | jq

# Auth health
curl -s https://aenki.idotec.online/auth/health | jq
```

### Authentication Test
```bash
# Get JWT token
curl -X POST https://aenki.idotec.online/auth/token \
  -H "Content-Type: application/json" \
  -H "x-admin-token: your_admin_token_here" \
  -d '{"userId": "test@example.com", "permissions": ["read", "write"]}'

# Test protected endpoint
curl -X GET https://aenki.idotec.online/api/stats \
  -H "x-aenki-key: your_aenki_key_here"
```

## 📊 Monitoring Commands

### Service Status
```bash
# PM2 status
pm2 status
pm2 monit

# NGINX status
sudo systemctl status nginx

# View logs
pm2 logs aenki-back --lines 50
pm2 logs aenki-auth --lines 50
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Resource Monitoring
```bash
# System resources
htop
df -h
free -h

# Network connections
sudo netstat -tlnp | grep :8000
sudo netstat -tlnp | grep :8005
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

## 🔧 Maintenance Tasks

### Update Application
```bash
cd /opt/aenki-back
git pull origin main  # if using git
npm install --production
pm2 restart aenki-back

cd /opt/aenki-auth
# Copy updated auth-server.js if needed
pm2 restart aenki-auth
```

### Backup Data
```bash
# Backup uploaded files
tar -czf /backup/aenki-uploads-$(date +%Y%m%d).tar.gz /opt/aenki-back/uploads/

# Backup configuration
tar -czf /backup/aenki-config-$(date +%Y%m%d).tar.gz /opt/aenki-back/.env /opt/aenki-auth/.env
```

### Log Rotation
```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

## 🚨 Troubleshooting

### Common Issues
1. **Port conflicts**: Check if ports 8000/8005 are available
2. **Permission errors**: Ensure correct file ownership
3. **NGINX errors**: Check configuration syntax with `nginx -t`
4. **SSL issues**: Verify domain DNS resolution
5. **Node.js errors**: Check PM2 logs for detailed error messages

### Emergency Commands
```bash
# Restart all services
pm2 restart all
sudo systemctl restart nginx

# Check system logs
journalctl -u nginx -f
journalctl -u pm2* -f

# Reset PM2 processes
pm2 delete all
pm2 start ecosystem.config.js
```

## 📞 Support Information
- **Domain**: aenki.idotec.online
- **Ports**: 8000 (backend), 8005 (auth), 80/443 (web)
- **Contact**: info@sistemasorbix.com
- **Documentation**: This deployment guide

---
*Last updated: $(date)*
*Deployment ready: ✅ All systems configured*
