import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { rateLimit } from 'express-rate-limit';

const app = express();
app.set('trust proxy', 1); // Diperlukan saat di balik proxy / platform hosting (misal: Render)

// 1. Rate Limiting: Maksimal 20 request per 10 detik per alamat IP
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

// PENTING: Sesuai modul Lab 08, JANGAN memasang app.use(express.json()) sebelum middleware proxy!

// 2. Info Route pada root Gateway
app.get('/', (_req, res) => {
  res.json({
    gateway: 'API Gateway Sederhana (Lab 08)',
    status: 'running',
    port: process.env.PORT || 8080,
    rateLimit: 'Maks. 20 request / 10 detik',
    services: {
      'service-a': {
        name: 'Service A - Comic Catalog (PostgreSQL Neon)',
        target: process.env.SERVICE_A_URL || 'http://localhost:4000',
        availableEndpoints: [
          '/service-a/',
          '/service-a/health',
          '/service-a/komik'
        ]
      },
      'service-b': {
        name: 'Service B - Review & Rating',
        target: process.env.SERVICE_B_URL || 'http://localhost:5000',
        availableEndpoints: [
          '/service-b/',
          '/service-b/reviews'
        ]
      }
    }
  });
});

// 3. Routing: /service-a/* diteruskan ke Service A (Port 4000)
app.use(
  createProxyMiddleware({
    pathFilter: '/service-a',
    target: process.env.SERVICE_A_URL || 'http://localhost:4000',
    changeOrigin: true,
    pathRewrite: { '^/service-a': '' }
  })
);

// 4. Routing: /service-b/* diteruskan ke Service B (Port 5000)
app.use(
  createProxyMiddleware({
    pathFilter: '/service-b',
    target: process.env.SERVICE_B_URL || 'http://localhost:5000',
    changeOrigin: true,
    pathRewrite: { '^/service-b': '' }
  })
);

// Fallback jika path tidak dikenal
app.use((_req, res) => {
  res.status(404).json({ error: 'Route tidak ditemukan di API Gateway' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 [API Gateway] berjalan di http://localhost:${PORT}`);
  console.log(`   - Forwarding /service-a -> ${process.env.SERVICE_A_URL || 'http://localhost:4000'}`);
  console.log(`   - Forwarding /service-b -> ${process.env.SERVICE_B_URL || 'http://localhost:5000'}`);
});
