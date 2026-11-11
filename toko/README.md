# Toko Komik Microservices Ecosystem (Lab 09, Lab 10 & Lab 11)
**Studi Kasus:** Sistem Katalog, Pemesanan, Notifikasi Asinkron, dan Dokumentasi Terpadu (OpenAPI 3.0 / Swagger UI) untuk Toko Komik.

---

## 1. Deskripsi Singkat Sistem
Sistem ini merupakan arsitektur *microservices* terdistribusi yang memisahkan tanggung jawab pengelolaan data komik, transaksi pemesanan, pengiriman notifikasi, dan dokumentasi API terpusat:
- **Product Service (`:3000`):** Mengelola katalog komik, harga, status ketersediaan, reservasi stok komik, dan menyajikan spesifikasi OpenAPI mandiri.
- **Order Service (`:3001`):** Menangani pembuatan pesanan baru melalui panggilan HTTP sinkron ke `product-service` dengan batas waktu (*timeout*) 2 detik, menyimpan riwayat pesanan, serta menerbitkan (*publish*) event `order.created` ke RabbitMQ exchange secara asinkron.
- **Notification Service:** Konsumen (*consumer*) RabbitMQ yang mendengarkan antrean `notification-queue` secara independen dan mengirim simulasi email nota pembelian ke pembeli komik.
- **API Gateway (`:8080`):** Titik masuk tunggal (*Single Entry Point*) bagi klien yang dilengkapi *rate limiting* (maksimal 20 request per 10 detik), reverse proxy routing, dan agregasi dinamis spesifikasi OpenAPI dari seluruh service menjadi satu portal **Swagger UI Interaktif**.

---

## 2. Alamat Dokumentasi & Spesifikasi API
- **Swagger UI Interaktif Gabungan (API Gateway):**  
  👉 **`http://localhost:8080/docs/`**
- **File Spesifikasi OpenAPI Gabungan (JSON):**  
  👉 **`http://localhost:8080/openapi.json`** atau tersimpan lokal di file `openapi.json` / `toko/openapi.json`.
- **Swagger UI Mandiri:**
  - Product Service: `http://localhost:3000/docs/`
  - Order Service: `http://localhost:3001/docs/`

---

## 3. Variabel Environment yang Digunakan
Sistem mendukung konfigurasi melalui *environment variables* (atau `.env`):

| Variabel | Default Value | Deskripsi / Penggunaan |
| :--- | :--- | :--- |
| `PORT` | `3000` (product), `3001` (order), `8080` (gateway) | Port server HTTP masing-masing service |
| `PRODUCT_SERVICE_URL` | `http://127.0.0.1:3000` | Alamat target endpoint Product Service yang dihubungi oleh Order Service dan Gateway |
| `ORDER_SERVICE_URL` | `http://127.0.0.1:3001` | Alamat target endpoint Order Service yang dihubungi oleh Gateway |
| `AMQP_URL` | `amqp://localhost` | URL koneksi ke broker pesan RabbitMQ |
| `PRODUCT_DOC_URL` | `http://127.0.0.1:3000/openapi.json` | URL sumber OpenAPI spec dari Product Service untuk diagregasi Gateway |
| `ORDER_DOC_URL` | `http://127.0.0.1:3001/openapi.json` | URL sumber OpenAPI spec dari Order Service untuk diagregasi Gateway |

---

## 4. Cara Menjalankan Sistem (Urutan dan Port)

Jalankan tiap service pada terminal terpisah:

### Langkah 1: Jalankan Product Service (Port 3000)
```powershell
cd toko/product-service
npm install
node product-service.js
```
*Output: `📦 [product-service] Toko Komik berjalan di port 3000`*

### Langkah 2: Jalankan Order Service (Port 3001)
```powershell
cd toko/order-service
npm install
node order-service.js
```
*Output: `🛒 [order-service] Toko Komik berjalan di port 3001`*

### Langkah 3: (Opsional) Jalankan Notification Service (Consumer RabbitMQ)
```powershell
cd toko/notification-service
npm install
node notification-service.js
```
*Output: `📬 [notification-queue] Siap mendengarkan event pesanan baru dari RabbitMQ...`*

### Langkah 4: Jalankan API Gateway (Port 8080)
```powershell
cd toko/gateway
npm install
node gateway.js
```
*Output: `🌐 [API Gateway Lab 09] berjalan di http://localhost:8080`*

---

## 5. Struktur Direktori Proyek
```text
toko/
├── gateway/
│   ├── package.json
│   └── gateway.js             # API Gateway port 8080 (Proxy, Rate Limit, & Merged Swagger UI)
├── product-service/
│   ├── package.json
│   └── product-service.js     # Service katalog komik & stok (port 3000, OpenAPI @openapi)
├── order-service/
│   ├── package.json
│   └── order-service.js       # Service pesanan (port 3001, OpenAPI @openapi, RabbitMQ Publisher)
├── notification-service/
│   ├── package.json
│   └── notification-service.js # Consumer RabbitMQ (Email notifier & simulasi crash/ack)
├── monolith/
│   ├── package.json
│   └── monolith.js            # Versi monolit awal sebelum dipecah (Lab 09)
├── openapi.json               # Spesifikasi OpenAPI gabungan hasil generate Gateway (Lab 11)
├── LAPORAN-LAB-10.md          # Laporan penugasan Lab 10 (Komunikasi Asinkron)
├── LAPORAN-LAB-11.md          # Laporan penugasan Lab 11 (Dokumentasi Otomatis & Refleksi)
├── smoke-test.js              # Skrip pengujian end-to-end otomatis
├── start-toko.bat             # Launcher otomatis seluruh service
└── README.md
```
