@echo off
title Launcher Lab 09 - Toko Microservices & Gateway
echo ========================================================
echo   Menjalankan Sistem Microservices Toko Komik (Lab 09)
echo ========================================================
echo.
echo [1/3] Menjalankan Product Service (Port 3000)...
start "Product Service (:3000)" cmd /k "cd product-service && node product-service.js"

timeout /t 2 >nul

echo [2/3] Menjalankan Order Service (Port 3001)...
start "Order Service (:3001)" cmd /k "cd order-service && node order-service.js"

timeout /t 2 >nul

echo [3/3] Menjalankan API Gateway (:8080)...
start "API Gateway (:8080)" cmd /k "cd gateway && node gateway.js"

echo.
echo ========================================================
echo Semua service telah berjalan:
echo - API Gateway : http://localhost:8080
echo - Produk via Gateway : http://localhost:8080/product-service/products
echo - Order via Gateway  : http://localhost:8080/order-service/orders
echo ========================================================
echo.
echo Jalankan smoke test dengan:
echo   node smoke-test.js
echo.
pause

