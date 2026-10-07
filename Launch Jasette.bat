@echo off
cd /d "%~dp0"
rem Jasette — opens the app in your browser. Close this window to stop it.
start "" http://localhost:8899/
node build\serve.mjs
