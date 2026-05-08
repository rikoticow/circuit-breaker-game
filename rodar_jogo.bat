@echo off
title CIRCUIT BREAKER - JOGO
echo Iniciando Servidor de Voz...
start /b node server.js
timeout /t 2 > nul
echo Abrindo Jogo...
start http://localhost:3001
pause
