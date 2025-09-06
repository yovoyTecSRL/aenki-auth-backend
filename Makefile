# Makefile para AeNKI - Avatar de Longevidad
# Automatización de deployment y gestión del sistema

# Variables
PROJECT_NAME = aenki
DOMAIN = aenki.sistemasorbix.com
BACKEND_PORT = 8000
DEPLOY_PATH = /var/www/sistemasorbix.com/aenki
NGINX_SITES = /etc/nginx/sites-available
NGINX_ENABLED = /etc/nginx/sites-enabled
LOG_PATH = /var/log/nginx
PM2_APP_NAME = aenki-backend

# Colores para output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help install deploy-aenki start stop restart status health test clean logs backup

# Target por defecto
all: help

## Mostrar ayuda
help:
	@echo "$(BLUE)🤖 AeNKI - Avatar de Longevidad - Makefile$(NC)"
	@echo "$(BLUE)===============================================$(NC)"
	@echo ""
	@echo "$(GREEN)Comandos disponibles:$(NC)"
	@echo "  $(YELLOW)make install$(NC)        - Instalar dependencias y configurar sistema"
	@echo "  $(YELLOW)make deploy-aenki$(NC)   - Desplegar página aenki-conectado.html"
	@echo "  $(YELLOW)make start$(NC)          - Iniciar backend con PM2"
	@echo "  $(YELLOW)make stop$(NC)           - Detener backend"
	@echo "  $(YELLOW)make restart$(NC)        - Reiniciar backend"
	@echo "  $(YELLOW)make status$(NC)         - Ver estado del sistema"
	@echo "  $(YELLOW)make health$(NC)         - Verificar salud del sistema"
	@echo "  $(YELLOW)make test$(NC)           - Ejecutar tests de conectividad"
	@echo "  $(YELLOW)make logs$(NC)           - Ver logs del sistema"
	@echo "  $(YELLOW)make backup$(NC)         - Crear backup del sistema"
	@echo "  $(YELLOW)make clean$(NC)          - Limpiar archivos temporales"
	@echo ""

## Instalar dependencias y configurar sistema
install:
	@echo "$(BLUE)📦 Instalando dependencias de AeNKI...$(NC)"
	npm install
	@echo "$(BLUE)📁 Creando directorios necesarios...$(NC)"
	sudo mkdir -p $(DEPLOY_PATH)
	sudo mkdir -p $(LOG_PATH)
	sudo chown -R www-data:www-data $(DEPLOY_PATH)
	@echo "$(GREEN)✅ Instalación completada$(NC)"

## Desplegar página aenki-conectado.html
deploy-aenki:
	@echo "$(BLUE)🚀 Desplegando AeNKI Conectado...$(NC)"
	
	# Crear directorio si no existe
	sudo mkdir -p $(DEPLOY_PATH)
	
	# Copiar archivo HTML principal
	sudo cp aenki-conectado.html $(DEPLOY_PATH)/
	sudo cp aenki-conectado.html $(DEPLOY_PATH)/index.html
	
	# Copiar archivos adicionales si existen
	@if [ -f "debug-aenki.html" ]; then sudo cp debug-aenki.html $(DEPLOY_PATH)/; fi
	@if [ -f "test-cors.html" ]; then sudo cp test-cors.html $(DEPLOY_PATH)/; fi
	
	# Establecer permisos correctos
	sudo chown -R www-data:www-data $(DEPLOY_PATH)
	sudo chmod -R 644 $(DEPLOY_PATH)/*.html
	
	# Configurar NGINX si no existe
	@if [ ! -f "$(NGINX_SITES)/$(DOMAIN).conf" ]; then \
		echo "$(YELLOW)📝 Configurando NGINX...$(NC)"; \
		sudo cp aenki.sistemasorbix.com.conf $(NGINX_SITES)/$(DOMAIN).conf; \
		sudo ln -sf $(NGINX_SITES)/$(DOMAIN).conf $(NGINX_ENABLED)/; \
	fi
	
	# Verificar configuración NGINX
	sudo nginx -t
	
	# Recargar NGINX
	sudo systemctl reload nginx
	
	@echo "$(GREEN)✅ AeNKI desplegado en https://$(DOMAIN)$(NC)"
	@echo "$(BLUE)📝 Archivos desplegados:$(NC)"
	@ls -la $(DEPLOY_PATH)/

## Iniciar backend con PM2
start:
	@echo "$(BLUE)🚀 Iniciando backend AeNKI...$(NC)"
	pm2 start server.js --name $(PM2_APP_NAME) --env production
	pm2 save
	@echo "$(GREEN)✅ Backend iniciado$(NC)"

## Detener backend
stop:
	@echo "$(YELLOW)🛑 Deteniendo backend AeNKI...$(NC)"
	pm2 stop $(PM2_APP_NAME)
	@echo "$(GREEN)✅ Backend detenido$(NC)"

## Reiniciar backend
restart:
	@echo "$(BLUE)🔄 Reiniciando backend AeNKI...$(NC)"
	pm2 restart $(PM2_APP_NAME)
	@echo "$(GREEN)✅ Backend reiniciado$(NC)"

## Ver estado del sistema
status:
	@echo "$(BLUE)📊 Estado del Sistema AeNKI$(NC)"
	@echo "$(BLUE)===========================$(NC)"
	@echo ""
	@echo "$(YELLOW)🖥️  Backend PM2:$(NC)"
	pm2 status $(PM2_APP_NAME)
	@echo ""
	@echo "$(YELLOW)🌐 NGINX:$(NC)"
	sudo systemctl status nginx --no-pager -l
	@echo ""
	@echo "$(YELLOW)🔌 Puerto $(BACKEND_PORT):$(NC)"
	@netstat -tlnp | grep :$(BACKEND_PORT) || echo "No hay proceso escuchando en puerto $(BACKEND_PORT)"
	@echo ""
	@echo "$(YELLOW)📁 Archivos desplegados:$(NC)"
	@ls -la $(DEPLOY_PATH)/ 2>/dev/null || echo "Directorio $(DEPLOY_PATH) no existe"

## Verificar salud del sistema
health:
	@echo "$(BLUE)🏥 Verificación de Salud AeNKI$(NC)"
	@echo "$(BLUE)================================$(NC)"
	@echo ""
	@echo "$(YELLOW)🔍 Verificando backend...$(NC)"
	@curl -sf http://127.0.0.1:$(BACKEND_PORT)/api/health \
		-H "x-aenki-key: aenki-production-2025" \
		| jq '.' 2>/dev/null \
		&& echo "$(GREEN)✅ Backend OK$(NC)" \
		|| echo "$(RED)❌ Backend ERROR$(NC)"
	@echo ""
	@echo "$(YELLOW)🌐 Verificando HTTPS...$(NC)"
	@curl -sf https://$(DOMAIN)/health >/dev/null \
		&& echo "$(GREEN)✅ HTTPS OK$(NC)" \
		|| echo "$(RED)❌ HTTPS ERROR$(NC)"
	@echo ""
	@echo "$(YELLOW)📝 SSL Certificate:$(NC)"
	@openssl s_client -connect $(DOMAIN):443 -servername $(DOMAIN) </dev/null 2>/dev/null \
		| openssl x509 -noout -dates 2>/dev/null \
		|| echo "$(RED)❌ SSL Certificate ERROR$(NC)"

## Ejecutar tests de conectividad
test:
	@echo "$(BLUE)🧪 Ejecutando Tests de Conectividad$(NC)"
	@echo "$(BLUE)====================================$(NC)"
	@echo ""
	@echo "$(YELLOW)🔍 Test Health API...$(NC)"
	@curl -sf http://127.0.0.1:$(BACKEND_PORT)/api/health \
		-H "x-aenki-key: aenki-production-2025" \
		-H "Content-Type: application/json" \
		| jq '.ok' | grep -q true \
		&& echo "$(GREEN)✅ Health API OK$(NC)" \
		|| echo "$(RED)❌ Health API FAIL$(NC)"
	
	@echo "$(YELLOW)💬 Test Chat API...$(NC)"
	@curl -sf http://127.0.0.1:$(BACKEND_PORT)/api/chat \
		-X POST \
		-H "x-aenki-key: aenki-production-2025" \
		-H "Content-Type: application/json" \
		-d '{"text":"Test de conectividad","history":[],"avatarId":"test"}' \
		| jq '.reply' | grep -q . \
		&& echo "$(GREEN)✅ Chat API OK$(NC)" \
		|| echo "$(RED)❌ Chat API FAIL$(NC)"
	
	@echo "$(YELLOW)🔊 Test TTS API...$(NC)"
	@curl -sf http://127.0.0.1:$(BACKEND_PORT)/api/tts \
		-X POST \
		-H "x-aenki-key: aenki-production-2025" \
		-H "Content-Type: application/json" \
		-d '{"text":"Test TTS","voice":"es-ES-Standard-A"}' \
		| jq '.success' | grep -q true \
		&& echo "$(GREEN)✅ TTS API OK$(NC)" \
		|| echo "$(RED)❌ TTS API FAIL$(NC)"

## Ver logs del sistema
logs:
	@echo "$(BLUE)📋 Logs del Sistema AeNKI$(NC)"
	@echo "$(BLUE)==========================$(NC)"
	@echo ""
	@echo "$(YELLOW)🖥️  Logs PM2:$(NC)"
	pm2 logs $(PM2_APP_NAME) --lines 20
	@echo ""
	@echo "$(YELLOW)🌐 Logs NGINX Access:$(NC)"
	sudo tail -20 $(LOG_PATH)/$(DOMAIN).access.log 2>/dev/null || echo "No access logs found"
	@echo ""
	@echo "$(YELLOW)🚨 Logs NGINX Error:$(NC)"
	sudo tail -20 $(LOG_PATH)/$(DOMAIN).error.log 2>/dev/null || echo "No error logs found"

## Crear backup del sistema
backup:
	@echo "$(BLUE)💾 Creando Backup de AeNKI...$(NC)"
	@BACKUP_DATE=$$(date +%Y%m%d_%H%M%S); \
	BACKUP_DIR="/tmp/aenki_backup_$$BACKUP_DATE"; \
	mkdir -p "$$BACKUP_DIR"; \
	cp -r . "$$BACKUP_DIR/source"; \
	sudo cp -r $(DEPLOY_PATH) "$$BACKUP_DIR/deployed" 2>/dev/null || true; \
	sudo cp $(NGINX_SITES)/$(DOMAIN).conf "$$BACKUP_DIR/" 2>/dev/null || true; \
	pm2 describe $(PM2_APP_NAME) > "$$BACKUP_DIR/pm2_config.txt" 2>/dev/null || true; \
	tar -czf "/tmp/aenki_backup_$$BACKUP_DATE.tar.gz" -C "/tmp" "aenki_backup_$$BACKUP_DATE"; \
	rm -rf "$$BACKUP_DIR"; \
	echo "$(GREEN)✅ Backup creado: /tmp/aenki_backup_$$BACKUP_DATE.tar.gz$(NC)"

## Limpiar archivos temporales
clean:
	@echo "$(YELLOW)🧹 Limpiando archivos temporales...$(NC)"
	rm -f *.log
	rm -f *.tmp
	rm -rf node_modules/.cache
	pm2 flush $(PM2_APP_NAME) 2>/dev/null || true
	@echo "$(GREEN)✅ Limpieza completada$(NC)"

## Deploy completo (instalar + desplegar + iniciar)
deploy-full: install deploy-aenki start
	@echo "$(GREEN)🎉 Deploy completo de AeNKI completado!$(NC)"
	@echo "$(BLUE)📝 Accede a tu avatar en: https://$(DOMAIN)$(NC)"

## Comandos de mantenimiento rápido
quick-deploy: deploy-aenki restart
	@echo "$(GREEN)⚡ Quick deploy completado!$(NC)"

monitor:
	@echo "$(BLUE)📊 Modo Monitor AeNKI (Ctrl+C para salir)$(NC)"
	@watch -n 5 'make status'

## SSL Certificate setup (requiere certbot)
ssl-setup:
	@echo "$(BLUE)🔒 Configurando SSL para $(DOMAIN)...$(NC)"
	sudo certbot --nginx -d $(DOMAIN) --non-interactive --agree-tos --email info@sistemasorbix.com
	@echo "$(GREEN)✅ SSL configurado$(NC)"

## Información del sistema
info:
	@echo "$(BLUE)ℹ️  Información del Sistema AeNKI$(NC)"
	@echo "$(BLUE)===================================$(NC)"
	@echo "Dominio: $(DOMAIN)"
	@echo "Puerto Backend: $(BACKEND_PORT)"
	@echo "Path Deploy: $(DEPLOY_PATH)"
	@echo "PM2 App: $(PM2_APP_NAME)"
	@echo "NGINX Config: $(NGINX_SITES)/$(DOMAIN).conf"
	@echo ""
	@echo "$(YELLOW)URLs importantes:$(NC)"
	@echo "🌐 Frontend: https://$(DOMAIN)"
	@echo "🔍 Health: https://$(DOMAIN)/health"
	@echo "💬 Chat API: https://$(DOMAIN)/api/chat"
	@echo "🔊 TTS API: https://$(DOMAIN)/api/tts"
