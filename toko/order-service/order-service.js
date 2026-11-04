// ===================================================================
// [LAB 09 - Langkah 04] Order Service (Microservice Port 3001)
// Pemilik tunggal data pesanan.
// TIDAK MEMILIKI data produk; berkomunikasi ke product-service via HTTP
// dengan timeout 2 detik dan penanganan fault tolerance (503 Service Unavailable).
// ===================================================================

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// URL dari product-service (port 3000)
// Menggunakan 127.0.0.1 untuk kompatibilitas stabil di Windows
const PRODUCT_URL = process.env.PRODUCT_SERVICE_URL || 'http://127.0.0.1:3000';

app.use(express.json());

// 1. Data Riwayat Pesanan (Disimpan mandiri di order-service)
const orders = [];

// Endpoint: Menampilkan seluruh pesanan
app.get('/orders', (_req, res) => {
  res.json({
    service: 'order-service (Toko Komik)',
    port: PORT,
    totalOrders: orders.length,
    data: orders
  });
});

// Endpoint: Menampilkan detail 1 pesanan berdasarkan orderId
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
});

