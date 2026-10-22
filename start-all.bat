@echo off
title Launcher Lab 08 - API Gateway
echo ========================================================
echo   Menjalankan Sistem API Gateway (Lab 08 Web Service)
echo ========================================================
echo.
echo [1/3] Menjalankan Service A (Comic Catalog - Port 4000)...
start "Service A (Comic Catalog :4000)" cmd /k "npm run dev"

timeout /t 3 >nul

echo [2/3] Menjalankan Service B (Review & Rating - Port 5000)...
start "Service B (Review & Rating :5000)" cmd /k "npm run service-b"

timeout /t 2 >nul

echo [3/3] Menjalankan API Gateway (Port 8080)...
start "API Gateway (:8080)" cmd /k "npm run gateway"

echo.
echo ========================================================
echo Semua service telah diluncurkan di terminal masing-masing!
echo - API Gateway: http://localhost:8080
echo - Service A via Gateway: http://localhost:8080/service-a/komik
echo - Service B via Gateway: http://localhost:8080/service-b/reviews
echo ========================================================
echo.
echo Tekan tombol apa saja untuk menutup jendela peluncur ini.
pause >nul
