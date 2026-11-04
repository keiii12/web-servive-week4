// ===================================================================
// [LAB 09 - Langkah 03] Product Service (Microservice Port 3000)
// Pemilik tunggal data katalog komik dan manajemen kuantitas stok.
// ===================================================================

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. Data Produk (Koleksi Komik & Merchandise Toko Komik)
// Disimpan mandiri dalam lingkup memori product-service (Database per Service)
const products = [
  { id: 1, name: 'Omniscient Reader Viewpoint (Edisi Fisik Vol. 1)', price: 125000, stock: 15 },
  { id: 2, name: 'Tower of God (Edisi Kolektor Vol. 1)', price: 280000, stock: 10 },
  { id: 3, name: "I'm the Max-Level Newbie (Edisi Spesial Vol. 1)", price: 110000, stock: 8 }
];

// Endpoint: Menampilkan seluruh katalog komik
app.get('/products', (_req, res) => {
  res.json({
    service: 'product-service (Toko Komik)',
    port: PORT,
    total: products.length,
    data: products
  });
});

// Endpoint: Menampilkan detail 1 komik berdasarkan ID
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

