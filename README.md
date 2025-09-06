# 🤖 AeNKI - Avatar de Longevidad Backend

Backend Node.js para el sistema de avatar de longevidad AeNKI con soporte para chat, TTS y entrenamiento.

## 🚀 Cómo Correr en Dev (Windows)

### Instalación y Ejecución
```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# El servidor estará disponible en http://127.0.0.1:8000
```

### Variables de Entorno Relevantes

```bash
# Server Configuration
PORT=8000
HOST=127.0.0.1
NODE_ENV=development
CORS_ORIGIN=http://127.0.0.1:8000,file://

# OpenAI (para chat inteligente)
OPENAI_API_KEY=tu-openai-key
OPENAI_MODEL=gpt-4o-mini

# Google TTS (para voz del avatar)
GOOGLE_API_KEY=tu-google-key

# Auth (opcional en desarrollo)
AENKI_AUTH_INTROSPECT_URL=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📡 Endpoints y Ejemplos Curl

### Health Check (Sin Auth)
```bash
curl http://127.0.0.1:8000/api/health
```

### Chat con Avatar (Con Auth)
```bash
curl -X POST http://127.0.0.1:8000/api/chat \
  -H "Content-Type: application/json" \
  -H "x-aenki-key: dev" \
  -d '{"text": "¿Cómo puedo vivir más años?", "history": [], "avatarId": "default"}'
```

### Text-to-Speech (Con Auth)
```bash
curl -X POST http://127.0.0.1:8000/api/tts \
  -H "Content-Type: application/json" \
  -H "x-aenki-key: dev" \
  -d '{"text": "Hola, soy AeNKI", "voice": "es-ES-Standard-A", "lang": "es-ES"}'
```

### Estadísticas (Con Auth)
```bash
curl http://127.0.0.1:8000/api/stats \
  -H "x-aenki-key: dev"
```

## 🎯 Funcionalidades

- **Chat Inteligente**: Respuestas especializadas en longevidad y bienestar
- **Text-to-Speech**: Simulación de voz para el avatar
- **Autenticación**: Headers `x-aenki-key` (opcional en desarrollo)
- **CORS**: Configurado para `file://` y desarrollo local
- **Rate Limiting**: 100 requests por 15 minutos
- **Health Monitoring**: Endpoints de salud y estadísticas

## 🌐 Interfaz Web

- **aenki.html**: Interfaz principal del avatar con TalkingHead
- **avatar-test.html**: Interfaz de prueba del avatar
- Ambas accesibles en http://127.0.0.1:8000/

## 🔐 Autenticación

En **desarrollo**:
- Header `x-aenki-key` es opcional
- Se muestra warning si falta el header
- Usar `x-aenki-key: dev` para testing

En **producción**:
- Header `x-aenki-key` es obligatorio
- Validación contra `AENKI_AUTH_INTROSPECT_URL` si está configurado
- Error 401 si falta o es inválido

## 🧪 Testing

```bash
# Test health endpoint
npm run test:health

# Probar endpoints con archivo test.http
# (usar extensión REST Client en VS Code)
```

## 📁 Estructura del Proyecto

```
/
├── server.js           # Servidor principal
├── aenki.html         # Interfaz avatar principal
├── avatar-test.html   # Interfaz de prueba
├── test.http          # Tests de API
├── .env               # Variables de entorno
├── package.json       # Dependencias
├── routes/            # Rutas modulares (futuro)
├── services/          # Servicios (OpenAI, Google TTS)
└── public/            # Archivos estáticos
```

## 🔧 Dependencias Clave

- **express**: Servidor web
- **cors**: Control de acceso entre orígenes
- **express-rate-limit**: Limitación de requests
- **node-fetch**: Cliente HTTP
- **multer**: Subida de archivos
- **morgan**: Logging de requests

## 🎯 Criterios de Aceptación ✅

- ✅ `npm run dev` levanta `http://127.0.0.1:8000`
- ✅ `GET /api/health` → `200 {"ok":true,...}`
- ✅ Desde `aenki.html`: botones **Health/Chat/TTS** NO muestran "Failed to fetch"
- ✅ Todas las llamadas `/api/*` envían header `x-aenki-key`
- ✅ CORS configurado para `file://`, `http://127.0.0.1:8000`
- ✅ Pruebas disponibles en `test.http`

### Health & Status
- `GET /health` - Service health check
- `GET /` - Service information

### Authentication (Admin Required)
- `POST /auth/issue` - Issue new API key (JWT)
- `POST /auth/introspect` - Validate/inspect API key

### Secure Endpoints (API Key Required)
- `GET /secure/echo` - Echo test with authentication
- `POST /auth/proxy` - Authenticated proxy endpoint

## 🔑 API Usage Examples

### 1. Issue API Key (Admin)
```bash
curl -X POST http://localhost:8005/auth/issue \
  -H "x-admin-token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"web-app","scopes":["read","write"]}'
```

**Response:**
```json
{
  "success": true,
  "api_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "client_id": "web-app",
  "scopes": ["read","write"],
  "expires_in": 7200,
  "issued_at": "2025-09-04T10:30:00.000Z"
}
```

### 2. Use API Key
```bash
curl -X GET "http://localhost:8005/secure/echo?msg=hello" \
  -H "x-aenki-key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response:**
```json
{
  "message": "hello",
  "who": "client:web-app",
  "valid": true,
  "timestamp": "2025-09-04T10:31:00.000Z",
  "client_info": {
    "client_id": "web-app",
    "scopes": ["read","write"],
    "issued_at": "2025-09-04T10:30:00.000Z"
  }
}
```

### 3. Introspect API Key (Admin)
```bash
curl -X POST http://localhost:8005/auth/introspect \
  -H "x-admin-token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"api_key":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}'
```

## 🏗️ Production Deployment

### Server Requirements
- Node.js 18+
- PM2 process manager
- NGINX reverse proxy
- SSL certificate (Let's Encrypt)

### Deployment Steps

1. **Server Setup**
```bash
# Install dependencies
apt update && apt install -y nginx certbot python3-certbot-nginx nodejs npm
npm install -g pm2

# Create directories
mkdir -p /var/www/aenki /opt/aenki-auth-node
```

2. **Deploy Code**
```bash
# Copy project files to /opt/aenki-auth-node
# Install dependencies
cd /opt/aenki-auth-node
npm install --production
```

3. **Environment Configuration**
```bash
# Create production .env
cp .env.example .env
# Edit with production values
```

4. **PM2 Service**
```bash
cd /opt/aenki-auth-node
pm2 start server.js --name aenki-auth --update-env
pm2 save
pm2 startup
```

5. **NGINX Configuration**
```nginx
server {
    listen 80;
    server_name aenki.idotec.online;
    root /var/www/aenki;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8005/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

6. **SSL Certificate**
```bash
certbot --nginx -d aenki.idotec.online -m info@sistemasorbix.com --agree-tos -n
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protection against abuse
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers
- **Admin Token**: Server-side only admin authentication
- **Input Validation**: Request validation and sanitization

## 🛠️ Operations & Maintenance

### Key Rotation
```bash
# Update JWT secret in .env
# Restart service
pm2 restart aenki-auth
```

### Monitoring
```bash
# Service status
pm2 status aenki-auth
pm2 logs aenki-auth

# System logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Rollback
```bash
# Disable site
unlink /etc/nginx/sites-enabled/aenki.idotec.online
systemctl reload nginx

# Stop service
pm2 stop aenki-auth
```

## 🧪 Testing

### Local Testing
```bash
npm test
```

### Production Testing
```bash
# Health check
curl -s https://aenki.idotec.online/api/health

# Issue test API key
curl -X POST https://aenki.idotec.online/api/auth/issue \
  -H "x-admin-token: your-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test"}'

# Test authenticated endpoint
curl -s "https://aenki.idotec.online/api/secure/echo?msg=production-test" \
  -H "x-aenki-key: your-test-key"
```

## 📞 Support

- **Email**: info@sistemasorbix.com
- **Domain**: aenki.idotec.online
- **Repository**: https://github.com/yovoyTecSRL/aenki-auth-node

---

**Version**: 1.0.0  
**Last Updated**: September 4, 2025  
**Status**: Production Ready
