// ===================================================================
// [LAB 09 & LAB 11] Product Service (Microservice Port 3000)
// - Lab 09: Katalog komik, manajemen stok, dan endpoint reserve
// - Lab 11: Dokumentasi otomatis OpenAPI/Swagger via JSDoc (@openapi)
// ===================================================================

import express from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ===================================================================
// [LAB 11 - Langkah 01] Konfigurasi Swagger JSDoc & Swagger UI
// Membaca anotasi @openapi langsung dari file ini (pendekatan Code-First)
// ===================================================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Comic Product Service API',
      version: '1.0.0',
      description: 'Dokumentasi otomatis API katalog dan stok komik (Lab 11)'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Server Product Service Lokal'
      }
    ]
  },
  apis: ['./product-service.js', __filename.replace(/\\/g, '/')]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Endpoint JSON mentah spesifikasi OpenAPI
app.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

// Endpoint halaman interaktif Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===================================================================
// [LAB 11 - Langkah 01] Skema Komponen OpenAPI (@openapi)
// ===================================================================
/**
 * @openapi
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Omniscient Reader Viewpoint (Edisi Fisik Vol. 1)
 *         price:
 *           type: integer
 *           example: 125000
 *         stock:
 *           type: integer
 *           example: 15
 *         category:
 *           type: string
 *           example: Manhwa Korea
 *     ReserveRequest:
 *       type: object
 *       required:
 *         - qty
 *       properties:
 *         qty:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Not Found
 *         message:
 *           type: string
 *           example: Komik dengan ID 1 tidak ditemukan.
 *     ConflictResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Conflict
 *         message:
 *           type: string
 *           example: Stok komik tidak mencukupi untuk memenuhi pesanan.
 *         sisaStok:
 *           type: integer
 *           example: 1
 *         diminta:
 *           type: integer
 *           example: 2
 */

// 1. Data Produk (Koleksi Komik & Merchandise Toko Komik)
// Disimpan mandiri dalam lingkup memori product-service (Database per Service)
const products = [
  { id: 1, name: 'Omniscient Reader Viewpoint (Edisi Fisik Vol. 1)', price: 125000, stock: 15, category: 'Manhwa Korea' },
  { id: 2, name: 'Tower of God (Edisi Kolektor Vol. 1)', price: 280000, stock: 10, category: 'Manhwa Korea' },
  { id: 3, name: "I'm the Max-Level Newbie (Edisi Spesial Vol. 1)", price: 110000, stock: 8, category: 'Manhwa Korea' }
];

/**
 * @openapi
 * /products:
 *   get:
 *     tags:
 *       - Products
 *     summary: Menampilkan seluruh katalog komik
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar komik
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                   example: product-service (Toko Komik)
 *                 port:
 *                   type: integer
 *                   example: 3000
 *                 total:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 */
app.get('/products', (_req, res) => {
  res.json({
    service: 'product-service (Toko Komik)',
    port: PORT,
    total: products.length,
    data: products
  });
});

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags:
 *       - Products
 *     summary: Menampilkan detail satu komik berdasarkan ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Berhasil mengambil detail komik
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                   example: product-service
 *                 data:
 *                   $ref: '#/components/schemas/Product'
 *       404:
 *         description: Komik tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/products/:id', (req, res) => {
  const targetId = Number(req.params.id);
  const foundProduct = products.find((item) => item.id === targetId);

  if (!foundProduct) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Komik dengan ID ${targetId} tidak ditemukan.`
    });
  }

  res.json({
    service: 'product-service',
    data: foundProduct
  });
});

// ===================================================================
// [ENDPOINT BARU & KRUSIAL DI LAB 09]: POST /products/:id/reserve
// Dipanggil oleh order-service melalui panggilan HTTP saat ada pembeli.
// Endpoint ini bertugas mengurangi stok secara aman.
// ===================================================================
/**
 * @openapi
 * /products/{id}/reserve:
 *   post:
 *     tags:
 *       - Products
 *     summary: Memesan dan mengurangi stok komik (dipanggil oleh order-service)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReserveRequest'
 *     responses:
 *       200:
 *         description: Reservasi stok komik berhasil
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reservasi stok komik berhasil!
 *                 reservedQty:
 *                   type: integer
 *                   example: 2
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *       400:
 *         description: Parameter jumlah (qty) tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Komik tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Stok komik tidak mencukupi untuk memenuhi pesanan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConflictResponse'
 */
app.post('/products/:id/reserve', (req, res) => {
  const targetId = Number(req.params.id);
  const { qty } = req.body || {};

  const product = products.find((item) => item.id === targetId);

  // 1. Validasi keberadaan produk
  if (!product) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Komik dengan ID ${targetId} tidak ditemukan.`
    });
  }

  // 2. Validasi jumlah pesanan (qty)
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Jumlah reservasi (qty) harus berupa bilangan bulat positif.'
    });
  }

  // 3. Validasi ketersediaan stok
  if (product.stock < qty) {
    console.log(`⚠️ [Reserve Gagal] Stok ${product.name} tidak cukup (Sisa: ${product.stock}, Diminta: ${qty})`);
    return res.status(409).json({
      error: 'Conflict',
      message: 'Stok komik tidak mencukupi untuk memenuhi pesanan.',
      sisaStok: product.stock,
      diminta: qty
    });
  }

  // 4. Kurangi stok produk
  product.stock -= qty;

  console.log(`✅ [Stok Berhasil Direservasi] ${product.name} dipesan ${qty} unit. Sisa stok sekarang: ${product.stock}`);

  // Kembalikan data produk terupdate ke service pemanggil (order-service)
  res.json({
    message: 'Reservasi stok komik berhasil!',
    reservedQty: qty,
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      remainingStock: product.stock
    }
  });
});

// Fallback untuk route yang tidak ditemukan
app.use((_req, res) => {
  res.status(404).json({ error: 'Route tidak ditemukan di product-service.' });
});

app.listen(PORT, () => {
  console.log(`📦 [product-service] Toko Komik berjalan di port ${PORT}`);
});

