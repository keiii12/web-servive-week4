// ===================================================================
// [LAB 09 - Langkah 01] Aplikasi Monolit (Toko Komik & Merchandise)
// Satu proses tunggal, data produk & pesanan tersimpan di memori yang sama.
// ===================================================================

import express from 'express';

const app = express();
const PORT = 3000;

// Middleware parsing JSON
app.use(express.json());

// 1. Data Produk (Koleksi Komik & Merchandise Toko Komik) - Disimpan di memori
const products = [
  { id: 1, name: 'Omniscient Reader Viewpoint (Edisi Fisik Vol. 1)', price: 125000, stock: 15 },
  { id: 2, name: 'Tower of God (Edisi Kolektor Vol. 1)', price: 280000, stock: 10 },
  { id: 3, name: "I'm the Max-Level Newbie (Edisi Spesial Vol. 1)", price: 110000, stock: 8 }
];

// 2. Data Riwayat Pesanan - Disimpan di memori yang sama
const orders = [];

// Endpoint: Menampilkan seluruh katalog komik
app.get('/products', (_req, res) => {
  res.json({
    message: 'Katalog komik monolit',
    total: products.length,
    data: products
  });
});

// Endpoint: Menampilkan detail 1 komik berdasarkan ID
app.get('/products/:id', (req, res) => {
  const targetId = Number(req.params.id);
  const foundProduct = products.find((item) => item.id === targetId);

  if (!foundProduct) {
    return res.status(404).json({ error: 'Komik tidak ditemukan.' });
  }

  res.json({
    message: 'Detail komik',
    data: foundProduct
  });
});

// Endpoint: Membuat pesanan baru (Order)
// PERHATIKAN: Di monolit, pesanan langsung memotong stok komik secara lokal!
app.post('/orders', (req, res) => {
  const { productId, qty } = req.body || {};

  // Validasi input
  if (!productId || !qty) {
    return res.status(400).json({ error: 'productId dan qty wajib diisi.' });
  }

  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Jumlah pesanan (qty) harus berupa bilangan bulat positif.' });
  }

  const product = products.find((item) => item.id === Number(productId));
  if (!product) {
    return res.status(404).json({ error: 'Komik yang ingin dipesan tidak ditemukan.' });
  }

  // Cek ketersediaan stok
  if (product.stock < qty) {
    return res.status(409).json({
      error: 'Stok tidak mencukupi.',
      sisaStok: product.stock,
      diminta: qty
    });
  }

  // TITIK IKATAN MONOLIT: Mengubah stok produk secara langsung
  product.stock -= qty;

  const newOrder = {
    orderId: orders.length + 1,
    productId: product.id,
    productName: product.name,
    qty,
    pricePerUnit: product.price,
    totalPrice: product.price * qty,
    createdAt: new Date().toISOString()
  };

  orders.push(newOrder);

  res.status(201).json({
    message: 'Pesanan berhasil dibuat!',
    order: newOrder
  });
});

// Endpoint: Menampilkan seluruh daftar pesanan
app.get('/orders', (_req, res) => {
  res.json({
    totalOrders: orders.length,
    orders
  });
});

// Menjalankan server monolit di port 3000
app.listen(PORT, () => {
  console.log(`🏛️ [Monolith] Comic Store berjalan di http://localhost:${PORT}`);
});

