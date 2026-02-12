# Script per iniciar el servidor
# Executa aquest fitxer per posar en marxa l'aplicació

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  BOMBERS TEST - Servidor Actiu  " -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Obrint servidor a http://localhost:5000" -ForegroundColor Green
Write-Host "Prem CTRL+C per aturar el servidor" -ForegroundColor Gray
Write-Host ""

python server.py
