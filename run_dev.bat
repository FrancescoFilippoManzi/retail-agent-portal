@echo off
echo Starting Grocery Category Simulation...
echo.
echo Backend  → http://localhost:3001
echo Frontend → http://localhost:5174
echo.

start "Circe Backend" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 /nobreak > nul
start "Circe Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Both servers starting. Open http://localhost:5174
