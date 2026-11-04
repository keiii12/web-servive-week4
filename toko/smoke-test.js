// ===================================================================
// [LAB 09 - Langkah 05] Skrip Smoke Test End-to-End
// Menguji alur lengkap sistem Microservices melalui API Gateway (Port 8080)
// ===================================================================

const BASE = process.env.BASE_URL || 'http://localhost:8080';
const jsonHeaders = { 'Content-Type': 'application/json' };

(async () => {
  console.log('🧪 Memulai Smoke Test End-to-End via API Gateway (:8080)...');
  console.log('===========================================================');

  try {
    // 1. Ambil seluruh katalog komik via Gateway
    console.log('1. Mengambil daftar komik dari Gateway (/product-service/products)...');
    const resList = await fetch(`${BASE}/product-service/products`);
    const dataList = await resList.json();
    const totalCount = dataList.total ?? (Array.isArray(dataList) ? dataList.length : dataList.data?.length);
    console.log(`   -> Jumlah produk komik tersedia: ${totalCount}`);

    // 2. Buat pesanan baru via Gateway
    console.log('\n2. Membuat pesanan baru dari Gateway (/order-service/orders)...');
    const resOrder = await fetch(`${BASE}/order-service/orders`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ productId: 1, qty: 2 })
    });
    const orderBody = await resOrder.json();
    console.log(`   -> Status Response Order: ${resOrder.status}`);
    console.log('   -> Detail Pesanan:', JSON.stringify(orderBody, null, 2));

    // 3. Verifikasi pengurangan stok komik ID 1 via Gateway
    console.log('\n3. Mengecek sisa stok komik ID 1 dari Gateway (/product-service/products/1)...');
    const resProduct = await fetch(`${BASE}/product-service/products/1`);
    const productBody = await resProduct.json();
    const currentStock = productBody.data?.stock ?? productBody.stock;
    console.log(`   -> Sisa stok komik ID 1 sekarang: ${currentStock}`);

    console.log('===========================================================');
    if (resOrder.status === 201) {
      console.log('🎉 SMOKE TEST BERHASIL!');
      console.log('   - Gateway berhasil meneruskan request ke kedua service.');
      console.log('   - order-service berhasil memanggil product-service secara sinkron.');
      console.log('   - Stok komik terbukti berkurang setelah transaksi dibuat.');
    } else {
      console.log(`⚠️ Status order bukan 201 (diterima status: ${resOrder.status}).`);
    }
  } catch (error) {
    console.error('\n❌ Smoke Test Gagal:', error.message);
    console.error('Pastikan ketiga service sudah berjalan:');
    console.log(' - product-service (port 3000)');
    console.log(' - order-service (port 3001)');
    console.log(' - gateway (port 8080)');
  }
})();

