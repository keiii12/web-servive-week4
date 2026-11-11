// ===================================================================
// [LAB 09, LAB 10 & LAB 11] Order Service (Microservice Port 3001)
// - Lab 09: Panggilan HTTP sinkron ke product-service (:3000) untuk reservasi stok.
// - Lab 10: Bertindak sebagai Publisher/Producer yang menerbitkan event 'order.created'
//           ke RabbitMQ exchange 'orders' secara asinkron.
// - Lab 11: Dokumentasi otomatis OpenAPI/Swagger via JSDoc (@openapi)
// ===================================================================

import 'dotenv/config';
import express from 'express';
import amqp from 'amqplib';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);

const app = express();
const PORT = process.env.PORT || 3001;

// URL dari product-service (port 3000)
// Menggunakan 127.0.0.1 untuk kompatibilitas stabil di Windows
const PRODUCT_URL = process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3000';
const AMQP_URL = process.env.AMQP_URL || 'amqp://localhost';

app.use(express.json());

// ===================================================================
// [LAB 11 - Langkah 02] Konfigurasi Swagger JSDoc & Swagger UI
// ===================================================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Comic Order Service API',
      version: '1.0.0',
      description: 'Dokumentasi otomatis API pembuatan dan riwayat pesanan komik (Lab 11)'
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Server Order Service Lokal'
      }
    ]
  },
  apis: ['./order-service.js', __filename.replace(/\\/g, '/')]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.get('/openapi.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ===================================================================
// [LAB 11 - Langkah 02] Skema Komponen OpenAPI (@openapi)
// ===================================================================
/**
 * @openapi
 * components:
 *   schemas:
 *     OrderRequest:
 *       type: object
 *       required:
 *         - productId
 *         - qty
 *       properties:
 *         productId:
 *           type: integer
 *           example: 1
 *         qty:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *     Order:
 *       type: object
 *       properties:
 *         orderId:
 *           type: integer
 *           example: 1
 *         productId:
 *           type: integer
 *           example: 1
 *         productName:
 *           type: string
 *           example: Omniscient Reader Viewpoint (Edisi Fisik Vol. 1)
 *         qty:
 *           type: integer
 *           example: 2
 *         pricePerUnit:
 *           type: integer
 *           example: 125000
 *         totalPrice:
 *           type: integer
 *           example: 250000
 *         orderDate:
 *           type: string
 *           format: date-time
 *           example: 2026-11-11T12:00:00.000Z
 *     OrderError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Bad Request
 *         message:
 *           type: string
 *           example: Parameter productId dan qty wajib diisi.
 */

// 1. Data Riwayat Pesanan (Disimpan mandiri di order-service)
const orders = [];

// ===================================================================
// [LAB 10 - Langkah 03] Konfigurasi Koneksi RabbitMQ Publisher
// Menghubungkan order-service ke RabbitMQ dan mendeklarasikan exchange 'orders'
// ===================================================================
let rabbitChannel = null;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(AMQP_URL);
    connection.on('error', (err) => {
      console.warn('⚠️ [RabbitMQ Connection Warning]:', err.message);
    });
    connection.on('close', () => {
      console.warn('⚠️ [RabbitMQ Terputus] Mencoba menghubungkan kembali dalam 3 detik...');
      rabbitChannel = null;
      setTimeout(connectRabbitMQ, 3000);
    });

    rabbitChannel = await connection.createChannel();
    await rabbitChannel.assertExchange('orders', 'fanout', { durable: true });
    console.log(`🐰 [order-service] Berhasil terhubung ke RabbitMQ di ${AMQP_URL}`);
  } catch (error) {
    console.error('❌ RabbitMQ belum tersedia, mencoba lagi dalam 3 detik...');
    setTimeout(connectRabbitMQ, 3000);
  }
}

// Fungsi untuk menerbitkan event 'order.created' ke Exchange RabbitMQ
function publishOrderCreatedEvent(order) {
  if (!rabbitChannel) {
    console.warn('⚠️ [RabbitMQ Warning] Channel belum tersedia, pesan notifikasi gagal diterbitkan.');
    return;
  }

  const eventPayload = {
    eventType: 'order.created',
    orderId: order.orderId,
    productId: order.productId,
    productName: order.productName,
    qty: order.qty,
    pricePerUnit: order.pricePerUnit,
    totalPrice: order.totalPrice,
    orderDate: order.orderDate
  };

  const messageBuffer = Buffer.from(JSON.stringify(eventPayload));
  const messageId = `order-${order.orderId}-${Date.now()}`;

  // Terbitkan pesan ke exchange 'orders' (tipe fanout)
  rabbitChannel.publish('orders', '', messageBuffer, {
    persistent: true,
    contentType: 'application/json',
    messageId
  });

  console.log(`📢 [Event Diterbitkan] Event 'order.created' untuk Pesanan #${order.orderId} terkirim ke RabbitMQ (Message ID: ${messageId})`);
}

// Endpoint: Menampilkan seluruh pesanan
/**
 * @openapi
 * /orders:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Menampilkan seluruh daftar riwayat pesanan
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar riwayat pesanan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                   example: order-service (Toko Komik)
 *                 port:
 *                   type: integer
 *                   example: 3001
 *                 totalOrders:
 *                   type: integer
 *                   example: 1
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 */
app.get('/orders', (_req, res) => {
  res.json({
    service: 'order-service (Toko Komik)',
    port: PORT,
    totalOrders: orders.length,
    data: orders
  });
});

// Endpoint: Menampilkan detail 1 pesanan berdasarkan orderId
/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags:
 *       - Orders
 *     summary: Menampilkan detail satu pesanan berdasarkan ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Berhasil mengambil detail pesanan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Pesanan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderError'
 */
app.get('/orders/:id', (req, res) => {
  const targetId = Number(req.params.id);
  const foundOrder = orders.find((o) => o.orderId === targetId);

  if (!foundOrder) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Pesanan dengan ID #${targetId} tidak ditemukan.`
    });
  }

  res.json({
    service: 'order-service',
    data: foundOrder
  });
});

// ===================================================================
// [LOGIKA UTAMA LAB 09]: POST /orders
// Memanggil endpoint reserve di product-service via HTTP fetch
// Dilengkapi AbortSignal.timeout(2000) untuk mencegah request menggantung.
// ===================================================================
/**
 * @openapi
 * /orders:
 *   post:
 *     tags:
 *       - Orders
 *     summary: Membuat pesanan komik baru
 *     description: Memanggil product-service untuk reservasi stok, lalu menyimpan pesanan dan menerbitkan event ke RabbitMQ.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OrderRequest'
 *     responses:
 *       201:
 *         description: Pesanan komik berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Pesanan komik berhasil dibuat!
 *                 order:
 *                   $ref: '#/components/schemas/Order'
 *       400:
 *         description: Parameter productId atau qty tidak valid
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderError'
 *       404:
 *         description: Komik yang ingin dipesan tidak ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderError'
 *       409:
 *         description: Stok komik tidak mencukupi untuk memenuhi pesanan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Conflict
 *                 message:
 *                   type: string
 *                   example: Stok komik tidak mencukupi untuk memenuhi pesanan.
 *                 sisaStok:
 *                   type: integer
 *                   example: 1
 *                 diminta:
 *                   type: integer
 *                   example: 2
 *       503:
 *         description: product-service tidak dapat dihubungi atau timeout 2 detik
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Service Unavailable
 *                 message:
 *                   type: string
 *                   example: product-service tidak dapat dihubungi atau waktu tunggu habis (timeout 2 detik).
 *                 details:
 *                   type: string
 */
app.post('/orders', async (req, res) => {
  const { productId, qty } = req.body || {};

  // 1. Validasi input dasar
  if (!productId || !qty) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Parameter productId dan qty wajib diisi.'
    });
  }

  const parsedProductId = Number(productId);
  const parsedQty = Number(qty);

  if (!Number.isInteger(parsedProductId) || !Number.isInteger(parsedQty) || parsedQty <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'productId dan qty harus berupa bilangan bulat positif.'
    });
  }

  // 2. Hubungi product-service lewat HTTP POST /products/:id/reserve dengan Timeout 2 detik
  let responseFromProductService;
  try {
    console.log(`[Order Service] Menghubungi product-service untuk reservasi komik ID: ${parsedProductId}, Qty: ${parsedQty}...`);

    responseFromProductService = await fetch(`${PRODUCT_URL}/products/${parsedProductId}/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ qty: parsedQty }),
      signal: AbortSignal.timeout(2000) // Timeout 2 detik sesuai spesifikasi Lab 09
    });
  } catch (err) {
    // Penanganan jika product-service mati, crash, atau response lebih dari 2 detik (timeout)
    console.error(`❌ [Order Service Error] Gagal menghubungi product-service:`, err.message);
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'product-service tidak dapat dihubungi atau waktu tunggu habis (timeout 2 detik).',
      details: err.message
    });
  }

  // 3. Baca respon dari product-service
  const resultData = await responseFromProductService.json();

  // Jika product-service membalas dengan status selain 200 (misal 404 produk tidak ada / 409 stok kurang)
  if (!responseFromProductService.ok) {
    return res.status(responseFromProductService.status).json(resultData);
  }

  // 4. Jika reservasi sukses (200), catat pesanan dengan snapshot harga saat transaksi
  const reservedProduct = resultData.product;
  const newOrder = {
    orderId: orders.length + 1,
    productId: reservedProduct.id,
    productName: reservedProduct.name, // Salinan nama komik
    qty: parsedQty,
    pricePerUnit: reservedProduct.price, // Salinan harga saat transaksi (snapshot)
    totalPrice: reservedProduct.price * parsedQty,
    orderDate: new Date().toISOString()
  };

  orders.push(newOrder);
  console.log(`🎉 [Order Berhasil] Pesanan #${newOrder.orderId} dibuat untuk "${newOrder.productName}"`);

  // =================================================================
  // [LAB 10 - Langkah 03] Terbitkan event ke RabbitMQ secara asinkron!
  // Perhatikan: Kita TIDAK menunggu (await) email terkirim,
  // order-service langsung membalas klien dengan status 201 segera.
  // =================================================================
  publishOrderCreatedEvent(newOrder);

  // Kembalikan status 201 Created kepada klien
  res.status(201).json({
    message: 'Pesanan komik berhasil dibuat!',
    order: newOrder
  });
});

// Fallback untuk route yang tidak ditemukan
app.use((_req, res) => {
  res.status(404).json({ error: 'Route tidak ditemukan di order-service.' });
});

app.listen(PORT, () => {
  console.log(`🛒 [order-service] Toko Komik berjalan di port ${PORT}`);
  console.log(`   -> Target Product Service: ${PRODUCT_URL}`);
  
  // Hubungkan ke RabbitMQ saat server order-service dinyalakan
  connectRabbitMQ();
});

