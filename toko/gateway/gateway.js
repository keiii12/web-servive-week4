// ===================================================================
// [LAB 09 - Langkah 05] API Gateway untuk Sistem Microservices Toko Komik
// Menyatukan product-service (:3000) dan order-service (:3001) di balik port 8080.
// Dilengkapi Rate Limiting dan Routing Proxy berbasis Path.
// ===================================================================

import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { rateLimit } from 'express-rate-limit';

const app = express();
app.set('trust proxy', 1);

// 1. Rate Limiting: Maksimal 20 request per 10 detik per alamat IP (Lab 08)
app.use(
  rateLimit({
    windowMs: 10 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 429,
      error: 'Too Many Requests',
      message: 'Batas request terlampaui. Maksimal 20 request per 10 detik.'
    }
  })
);

// PENTING (Lab 08 & 09): JANGAN memasang app.use(express.json()) sebelum middleware proxy!
// Body parsing cukup dilakukan di service masing-masing.

// 2. Info Route pada Root Gateway
app.get('/', (_req, res) => {
  res.json({
    gateway: 'API Gateway Toko Komik (Lab 09)',
    port: process.env.PORT || 8080,
    status: 'running',
    routes: {
      'product-service': {
        prefix: '/product-service/*',
        target: process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3000',
        examples: [
          '/product-service/products',
          '/product-service/products/1'
        ]
      },
      'order-service': {
        prefix: '/order-service/*',
        target: process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:3001',
        examples: [
          '/order-service/orders'
        ]
      }
    }
  });
});

// 3. Routing Proxy: /product-service/* diteruskan ke Product Service (Port 3000)
app.use(
  createProxyMiddleware({
    pathFilter: '/product-service',
    target: process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3000',
    changeOrigin: true,
    pathRewrite: { '^/product-service': '' }
  })
);

// 4. Routing Proxy: /order-service/* diteruskan ke Order Service (Port 3001)
app.use(
  createProxyMiddleware({
    pathFilter: '/order-service',
    target: process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:3001',
    changeOrigin: true,
    pathRewrite: { '^/order-service': '' }
  })
);

// Fallback jika path tidak dikenal
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint tidak ditemukan di API Gateway Toko Komik.' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🌐 [API Gateway Lab 09] berjalan di http://localhost:${PORT}`);
  console.log(`   -> Proxy /product-service -> ${process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3000'}`);
  console.log(`   -> Proxy /order-service   -> ${process.env.ORDER_SERVICE_URL || 'http://127.0.0.1:3001'}`);
});

