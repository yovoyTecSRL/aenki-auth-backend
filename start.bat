@echo off
echo 🚀 AeNKI Backend Startup Script
echo ================================

cd /d "C:\Users\xtre\AppData\Local\aenky"

echo 📍 Current directory: %CD%
echo 🔍 Checking if port 8000 is available...

netstat -ano | findstr :8000 >nul
if %errorlevel% == 0 (
    echo ⚠️  Port 8000 is already in use. Checking if it's our server...
    timeout /t 2 >nul
    powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 5; if ($response.ok) { Write-Host '✅ AeNKI server is already running and healthy'; exit 0 } else { Write-Host '❌ Port 8000 occupied by different service' } } catch { Write-Host '❌ Port 8000 occupied but not responding to health check' }"
    if %errorlevel% == 0 (
        echo 🎉 Server already running - opening browser...
        start http://127.0.0.1:8000/aenki.html
        pause
        exit /b 0
    )
    echo 🔧 Attempting to find alternative port...
    set PORT=8001
) else (
    set PORT=8000
)

echo 🔧 Starting AeNKI server on port %PORT%...
echo 📦 Installing dependencies if needed...
npm install --silent

echo 🚀 Starting server...
set NODE_ENV=development
set PORT=%PORT%
start "AeNKI Backend" cmd /k "node server.js"

echo ⏳ Waiting for server to start...
timeout /t 3 >nul

echo 🧪 Testing health endpoint...
powershell -Command "try { $response = Invoke-RestMethod -Uri 'http://127.0.0.1:%PORT%/api/health'; Write-Host '✅ Server started successfully!'; Write-Host ('Health check: ' + $response.ok); } catch { Write-Host '❌ Server failed to start or health check failed' }"

echo 🌐 Opening AeNKI Avatar Interface...
start http://127.0.0.1:%PORT%/aenki.html

echo 📊 Server should be running at: http://127.0.0.1:%PORT%
echo 🎯 Avatar interface: http://127.0.0.1:%PORT%/aenki.html
echo 💊 Health check: http://127.0.0.1:%PORT%/api/health

pause
