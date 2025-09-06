#!/usr/bin/env node
/**
 * 🛡️ Orbix Sentinel Scanner v2.0 - AeNKI Guardian
 * Monitoreo automático y recuperación del backend AeNKI
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class OrbixSentinel {
    constructor() {
        this.config = {
            targetUrl: 'http://127.0.0.1:8000',
            healthEndpoint: '/api/health',
            chatEndpoint: '/api/chat',
            serverScript: 'server.js',
            logFile: 'logs/sentinel.log',
            statusFile: 'AVATAR_STATUS.md',
            checkInterval: 10000, // 10 segundos
            maxRetries: 3,
            restartCooldown: 30000 // 30 segundos entre reinicios
        };
        
        this.state = {
            isHealthy: false,
            lastCheck: null,
            consecutiveFailures: 0,
            lastRestart: null,
            serverProcess: null
        };
        
        this.initializeLogging();
        console.log('🛡️  Orbix Sentinel initialized - Protecting AeNKI Backend');
    }

    initializeLogging() {
        // Crear directorio de logs si no existe
        const logsDir = path.dirname(this.config.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        console.log(logMessage);
        
        try {
            fs.appendFileSync(this.config.logFile, logMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error.message);
        }
    }

    async makeRequest(endpoint, options = {}) {
        return new Promise((resolve, reject) => {
            const url = `${this.config.targetUrl}${endpoint}`;
            const timeout = options.timeout || 5000;
            const method = options.method || 'GET';
            
            const requestOptions = {
                timeout,
                method: method,
                headers: options.headers || {}
            };
            
            const req = http.request(url, requestOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        resolve({
                            statusCode: res.statusCode,
                            data: parsed,
                            headers: res.headers
                        });
                    } catch (error) {
                        resolve({
                            statusCode: res.statusCode,
                            data: data,
                            headers: res.headers
                        });
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            // Send body for POST requests
            if (options.body && method === 'POST') {
                req.write(options.body);
            }
            
            req.end();
        });
    }

    async checkHealth() {
        this.log('🔍 Checking AeNKI backend health...');
        
        try {
            const response = await this.makeRequest(this.config.healthEndpoint);
            
            if (response.statusCode === 200 && response.data && response.data.ok) {
                this.log(`✅ Health check passed - Uptime: ${response.data.uptime}s`);
                this.state.isHealthy = true;
                this.state.consecutiveFailures = 0;
                return true;
            } else {
                throw new Error(`Health check failed: ${response.statusCode}`);
            }
        } catch (error) {
            this.log(`❌ Health check failed: ${error.message}`, 'ERROR');
            this.state.isHealthy = false;
            this.state.consecutiveFailures++;
            return false;
        }
    }

    async checkChatEndpoint() {
        this.log('🧪 Testing chat endpoint...');
        
        try {
            const testPayload = JSON.stringify({
                text: "Sentinel health check",
                history: [],
                avatarId: "sentinel"
            });

            const response = await this.makeRequest(this.config.chatEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-aenki-key': 'sentinel-test'
                },
                body: testPayload
            });

            if (response.statusCode === 200) {
                this.log('✅ Chat endpoint responding correctly');
                return true;
            } else {
                this.log(`⚠️  Chat endpoint returned: ${response.statusCode}`, 'WARN');
                return false;
            }
        } catch (error) {
            this.log(`❌ Chat endpoint test failed: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async restartServer() {
        const now = Date.now();
        
        // Verificar cooldown entre reinicios
        if (this.state.lastRestart && (now - this.state.lastRestart) < this.config.restartCooldown) {
            this.log('⏳ Restart cooldown active, skipping restart', 'WARN');
            return false;
        }

        this.log('🔄 Attempting to restart AeNKI server...', 'WARN');
        
        try {
            // Terminar proceso existente si existe
            if (this.state.serverProcess) {
                this.state.serverProcess.kill('SIGTERM');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Iniciar nuevo proceso
            this.state.serverProcess = spawn('node', [this.config.serverScript], {
                detached: false,
                stdio: ['ignore', 'pipe', 'pipe']
            });

            this.state.serverProcess.stdout.on('data', (data) => {
                this.log(`SERVER: ${data.toString().trim()}`);
            });

            this.state.serverProcess.stderr.on('data', (data) => {
                this.log(`SERVER ERROR: ${data.toString().trim()}`, 'ERROR');
            });

            this.state.lastRestart = now;
            
            // Esperar un momento para que el servidor se inicie
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Verificar si el reinicio fue exitoso
            const isHealthy = await this.checkHealth();
            if (isHealthy) {
                this.log('✅ Server restart successful!');
                return true;
            } else {
                this.log('❌ Server restart failed - health check still failing', 'ERROR');
                return false;
            }
        } catch (error) {
            this.log(`❌ Failed to restart server: ${error.message}`, 'ERROR');
            return false;
        }
    }

    updateStatusFile() {
        const timestamp = new Date().toISOString();
        const status = {
            timestamp,
            isHealthy: this.state.isHealthy,
            consecutiveFailures: this.state.consecutiveFailures,
            lastCheck: this.state.lastCheck,
            lastRestart: this.state.lastRestart ? new Date(this.state.lastRestart).toISOString() : null
        };

        const statusContent = `# 🛡️ AeNKI Sentinel Status

## 📊 Current Status
- **Health**: ${status.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}
- **Last Check**: ${status.timestamp}
- **Consecutive Failures**: ${status.consecutiveFailures}
- **Last Restart**: ${status.lastRestart || 'Never'}

## 🎯 Monitoring Targets
- **Backend URL**: ${this.config.targetUrl}
- **Health Endpoint**: ${this.config.healthEndpoint}
- **Chat Endpoint**: ${this.config.chatEndpoint}

## 📈 System Info
- **Check Interval**: ${this.config.checkInterval / 1000}s
- **Max Retries**: ${this.config.maxRetries}
- **Restart Cooldown**: ${this.config.restartCooldown / 1000}s

---
*Updated by Orbix Sentinel v2.0*
*Last scan: ${timestamp}*
`;

        try {
            fs.writeFileSync(this.config.statusFile, statusContent);
        } catch (error) {
            this.log(`Failed to update status file: ${error.message}`, 'ERROR');
        }
    }

    async performFullScan() {
        this.log('🚨 Starting full AeNKI system scan...');
        this.state.lastCheck = new Date().toISOString();

        const healthOk = await this.checkHealth();
        
        if (healthOk) {
            // Si está saludable, probar endpoints adicionales
            await this.checkChatEndpoint();
        } else {
            // Si no está saludable, intentar reiniciar si hemos fallado demasiadas veces
            if (this.state.consecutiveFailures >= this.config.maxRetries) {
                this.log(`🚨 ${this.state.consecutiveFailures} consecutive failures detected - attempting restart`, 'WARN');
                await this.restartServer();
            }
        }

        this.updateStatusFile();
        this.log(`📋 Scan complete - Status: ${this.state.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
    }

    start() {
        this.log('🚀 Starting Orbix Sentinel monitoring...');
        
        // Realizar escaneo inicial
        this.performFullScan();
        
        // Configurar escaneo periódico
        setInterval(() => {
            this.performFullScan();
        }, this.config.checkInterval);

        // Manejar señales de terminación
        process.on('SIGINT', () => {
            this.log('🛑 Sentinel shutdown requested');
            if (this.state.serverProcess) {
                this.state.serverProcess.kill('SIGTERM');
            }
            process.exit(0);
        });

        this.log(`🎯 Sentinel active - Monitoring every ${this.config.checkInterval / 1000}s`);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    const sentinel = new OrbixSentinel();
    sentinel.start();
}

module.exports = OrbixSentinel;
