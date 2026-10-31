@echo off
setlocal
title SkillCheck.ai Launcher

where node.exe >nul 2>&1
if errorlevel 1 (
    echo Node.js was not found. Install Node.js, then try again.
    pause
    exit /b 1
)

where npm.cmd >nul 2>&1
if errorlevel 1 (
    echo npm was not found. Check your Node.js installation.
    pause
    exit /b 1
)

if not exist "%~dp0Backend\node_modules\" goto missing_dependencies
if not exist "%~dp0Frontend\node_modules\" goto missing_dependencies
if not exist "%~dp0Backend\.env" (
    echo Backend\.env is missing. Configure MongoDB and JWT_SECRET first.
    pause
    exit /b 1
)

echo Starting SkillCheck.ai in two terminal windows...
echo The frontend will open in your browser at http://localhost:5173
echo Wait for the backend to report that it is running before signing in.
echo To stop the servers, press Ctrl+C in each server window.
echo If the servers are already running, use their existing windows.

start "SkillCheck.ai - Backend" /D "%~dp0Backend" cmd.exe /k "npm run dev"
start "SkillCheck.ai - Frontend" /D "%~dp0Frontend" cmd.exe /k "npm run dev -- --port 5173 --strictPort --open"
exit /b 0

:missing_dependencies
echo Dependencies are missing. Run npm install in Backend and Frontend once.
pause
exit /b 1
