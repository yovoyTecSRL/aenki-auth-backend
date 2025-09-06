# 🧠 Instrucciones para GitHub Copilot - AeNKI Guardian System

## 🎯 Misión Principal
Mantener el backend AeNKI siempre activo y saludable en `http://127.0.0.1:8000` con monitoreo automático y recuperación inteligente.

## 📍 Ubicación del Proyecto
```
Ruta: C:/Users/xtre/AppData/Local/aenky
Backend: server.js
Frontend: aenki.html
Sentinel: orbix_sentinel_scan.js
```

## 🚀 Comandos de Activación Rápida

### Iniciar Todo el Sistema
```bash
npm run setup-copilot
```

### Verificar Estado
```bash
npm run check
npm run status
```

### Monitoreo en Tiempo Real
```bash
npm run sentinel
npm run logs:sentinel
```

## 🛡️ Responsabilidades de Copilot

### 1. **Verificación Automática**
- Ejecutar `npm run test:health` cada vez que se abra el workspace
- Si falla, ejecutar `npm run auto-start` automáticamente
- Reportar estado en `AVATAR_STATUS.md`

### 2. **Monitoreo Continuo**
- El Sentinel (`orbix_sentinel_scan.js`) debe estar corriendo siempre
- Si se detecta fallo por >30s, reiniciar servidor automáticamente
- Logs en `logs/sentinel.log` y `logs/server.log`

### 3. **Recuperación Inteligente**
- **Puerto ocupado**: Cambiar a 8001, 8002, etc.
- **Dependencias faltantes**: Ejecutar `npm install`
- **Errores de CORS**: Verificar origen en aenki.html
- **Headers faltantes**: Asegurar `x-aenki-key` en todas las requests

### 4. **Optimizaciones Automáticas**
- Mantener `API_BASE = "http://127.0.0.1:8000"` en aenki.html
- Verificar backticks (`) en templates
- Asegurar CORS abierto solo en desarrollo
- Rate limiting configurado correctamente

## 🎯 Endpoints Críticos a Monitorear

### Health Check (Obligatorio)
```http
GET http://127.0.0.1:8000/api/health
```
**Respuesta esperada**: `{ "ok": true, "uptime": 12345, ... }`

### Chat (Funcionalidad Core)
```http
POST http://127.0.0.1:8000/api/chat
Content-Type: application/json
x-aenki-key: dev

{
  "text": "Hola AeNKI",
  "history": [],
  "avatarId": "default"
}
```

### TTS (Avatar Voice)
```http
POST http://127.0.0.1:8000/api/tts
Content-Type: application/json
x-aenki-key: dev

{
  "text": "Hola, soy AeNKI"
}
```

## 🔧 Configuración Requerida

### Variables de Entorno (.env)
```env
PORT=8000
HOST=127.0.0.1
NODE_ENV=development
CORS_ORIGIN=http://127.0.0.1:8000,file://
OPENAI_API_KEY=configurado
GOOGLE_API_KEY=configurado
```

### Frontend (aenki.html)
- `API_BASE` debe apuntar al backend correcto
- Headers `x-aenki-key` en TODAS las requests
- Usar backticks para template literals
- CORS configurado para `file://`

## 🚨 Alertas Críticas

### Nivel 1 - Inmediato
- Backend no responde por >10s → Reiniciar
- Puerto 8000 bloqueado → Usar puerto alternativo
- Health check falla → Diagnóstico completo

### Nivel 2 - Importante
- Chat endpoint 404/500 → Verificar rutas
- TTS falla → Revisar configuración Google
- CORS errors → Ajustar headers

### Nivel 3 - Monitoreo
- Uptime < esperado → Investigar logs
- Memory leaks → Restart preventivo
- Rate limiting triggered → Ajustar límites

## 🎪 Comandos de Emergencia

### Reinicio Completo
```bash
taskkill /F /IM node.exe
npm run auto-start
```

### Diagnóstico Completo
```bash
npm run logs
npm run logs:sentinel
npm run status
netstat -ano | findstr :8000
```

### Reset Sentinel
```bash
taskkill /F /IM node.exe
npm run sentinel:bg
```

## 📋 Checklist Diario de Copilot

- [ ] ✅ Backend responding on port 8000
- [ ] ✅ Health endpoint returns `{ ok: true }`
- [ ] ✅ Chat endpoint functional
- [ ] ✅ TTS endpoint responsive
- [ ] ✅ Frontend connects without CORS errors
- [ ] ✅ Sentinel monitoring active
- [ ] ✅ Logs rotating properly
- [ ] ✅ No memory leaks detected

## 🎯 Objetivos de Éxito

1. **99.9% Uptime**: Backend siempre disponible
2. **<2s Response**: Health checks bajo 2 segundos
3. **Zero Manual Intervention**: Todo automático
4. **Smart Recovery**: Autocorrección de errores
5. **Complete Logging**: Trazabilidad total

---

**🤖 Copilot, tu misión es ser el guardián digital de AeNKI. El destino de Orbix depende de tu vigilancia constante.**

**Versión**: 2.0  
**Última actualización**: 2025-09-05  
**Estado**: ACTIVO Y GUARDANDO 🛡️
