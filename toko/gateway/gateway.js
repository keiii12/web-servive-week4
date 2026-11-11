// ===================================================================
// [LAB 09 & LAB 11] API Gateway untuk Sistem Microservices Toko Komik
// - Lab 09: Menyatukan product-service (:3000) dan order-service (:3001)
// - Lab 11: Menggabungkan dokumentasi OpenAPI kedua service di /docs (:8080/docs)
// ===================================================================

import 'dotenv/config';
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

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

// ===================================================================
// [LAB 11 - Langkah 03] Gabungkan Dokumentasi OpenAPI di Gateway
// Mengambil spesifikasi dari product-service & order-service secara dinamis,
// lalu menambahkan prefix /product-service dan /order-service pada paths.
// ===================================================================
const DOC_SOURCES = [
  {
    prefix: '/product-service',
    url: process.env.PRODUCT_DOC_URL || 'http://127.0.0.1:3000/openapi.json'
  },
  {
    prefix: '/order-service',
    url: process.env.ORDER_DOC_URL || 'http://127.0.0.1:3001/openapi.json'
  }
];

async function buildMergedSpec() {
  const merged = {
    openapi: '3.0.3',
    info: {
      title: 'Comic Store API (via Gateway)',
      version: '1.0.0',
      description: 'Dokumentasi gabungan seluruh microservice Toko Komik di balik satu pintu API Gateway (Lab 11)'
    },
    servers: [{ url: '/' }], // "Try it out" langsung memanggil gateway
    paths: {},
    components: { schemas: {} }
  };

  for (const source of DOC_SOURCES) {
    try {
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) {
        const spec = await response.json();
        for (const [apiPath, operations] of Object.entries(spec.paths || {})) {
          merged.paths[source.prefix + apiPath] = operations;
        }
        Object.assign(merged.components.schemas, (spec.components || {}).schemas);
      }
    } catch (err) {
      console.warn(`⚠️ [Gateway Docs] Gagal mengambil dokumentasi dari ${source.url}: ${err.message}`);
    }
  }

  return merged;
}

// Endpoint JSON OpenAPI Gabungan
app.get('/openapi.json', async (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(await buildMergedSpec());
});

// Endpoint Swagger UI Gabungan pada API Gateway
app.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: { url: '/openapi.json' }
  })
);

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

