@echo off
title CIRCUIT BREAKER - EDITOR
echo Iniciando Servidor e Abrindo Editor...
start /b node editor_server.js
timeout /t 2 > nul
start editor.html
echo.
echo Servidor rodando em segundo plano nesta janela.
echo Mantenha esta janela aberta enquanto edita.
pause
