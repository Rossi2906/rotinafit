@echo off
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel%==0 (
  node servidor.js
  goto :fim
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "RotinaFit" cmd /c py -3 -m http.server 8080 --bind 0.0.0.0
  timeout /t 2 >nul
  start "" http://localhost:8080
  echo Servidor iniciado. No celular, use o IP do computador na porta 8080.
  ipconfig | findstr /R "IPv4"
  timeout /t 8 >nul
  goto :fim
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "RotinaFit" cmd /c python -m http.server 8080 --bind 0.0.0.0
  timeout /t 2 >nul
  start "" http://localhost:8080
  echo Servidor iniciado. No celular, use o IP do computador na porta 8080.
  ipconfig | findstr /R "IPv4"
  timeout /t 8 >nul
  goto :fim
)

echo Nao foi possivel iniciar o servidor local.
echo Instale Node.js ou Python. Alternativamente, abra index.html
echo e use o botao "Abrir no YouTube" em cada exercicio.
pause

:fim
