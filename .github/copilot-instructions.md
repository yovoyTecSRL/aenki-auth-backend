# AeNKI Auth - Node.js JWT Authentication Service

## Project Overview
AeNKI Auth es un servicio de autenticación JWT con Express.js para despliegue en producción en aenki.idotec.online.

## Configuration
- **Domain**: aenki.idotec.online
- **Server**: Root access SSH
- **App Port**: 8005 (backend Node)
- **Web Root**: /var/www/aenki
- **Contact Email**: info@sistemasorbix.com

## Development Guidelines
- Use Node.js with Express and JWT
- Implement CORS and security headers
- Include health check endpoints
- Support x-aenki-key and x-admin-token headers
- Deploy with PM2 and NGINX reverse proxy

## Checklist Progress
- [x] ✅ Project structure created
- [x] ✅ Environment configuration setup
- [ ] Backend server implementation
- [ ] Frontend integration
- [ ] Deployment automation
- [ ] SSL configuration
- [ ] Testing and validation

## Security Notes
- Never expose admin tokens in frontend
- Use environment variables for secrets
- Implement rate limiting
- Secure CORS configuration
