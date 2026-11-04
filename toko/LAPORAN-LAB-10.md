# Laporan Praktikum Lab 10: Komunikasi Antar Service via Message Queue
**Studi Kasus:** Sistem Asinkron Toko Komik & Notifikasi Transaksi (RabbitMQ)

---

## 1. Diagram Arsitektur Lab 10 yang Diperbarui

```mermaid
flowchart TD
    Client["👤 Klien (Postman / Browser)"]

    subgraph GATEWAY["🚪 API Gateway (:8080)"]
        ProxyRouter["Path Routing Proxy"]
    end

    subgraph SERVICES["📦 Microservices Ecosystem"]
        subgraph PRODUCT_SVC["Product Service (:3000)"]
            PData[("Memori Katalog Komik & Stok")]
            PEndpoints["GET /products<br>POST /products/:id/reserve"]
        end

        subgraph ORDER_SVC["Order Service (:3001) - Producer"]
            OData[("Memori Riwayat Pesanan")]
            OEndpoints["POST /orders<br>GET /orders"]
        end

        subgraph NOTIF_SVC["Notification Service - Consumer"]
            NEndpoints["consume('notification-queue')<br>Simulasi Kirim Email & ACK"]
        end
    end

    subgraph BROKER["🐰 Message Broker (RabbitMQ)"]
        Exchange{{"Exchange: orders (fanout)"}}
        Queue[("Queue: notification-queue (durable)")]
        Exchange -->|broadcast| Queue
    end

    Client -->|1. Request Order| ProxyRouter
    ProxyRouter -->|Forward /order-service| OEndpoints
    
    OEndpoints -->|2. Sinkron HTTP (Cek & Kurangi Stok)| PEndpoints
    PEndpoints -->|Stok OK 200| OEndpoints

    OEndpoints -.->|3. Asinkron Publish 'order.created'| Exchange
    OEndpoints -->|4. Respon Segera 201 Created| Client

    Queue -.->|5. Consume Pesan| NEndpoints
```

---

## 2. Penerapan ke Proyek Kelompok (Comic Library System)

* **Nama Event:** `komik.reviewed` (atau `order.created`)
* **Isi Pesan (Payload JSON):**
  ```json
  {
    "eventType": "komik.reviewed",
    "reviewId": 101,
    "komikId": 1,
    "judulKomik": "Omniscient Reader Viewpoint",
    "reviewer": "Azzahra",
    "rating": 9.8,
    "comment": "Alur cerita dan karakter Dokja sangat menarik!",
    "timestamp": "2026-11-04T12:00:00.000Z"
  }
  ```
* **Producer:** `Review Service` (atau `Order Service` untuk transaksi fisik komik).
* **Consumer:** `Notification Service` (mengirim notifikasi ulasan baru ke komunitas/penulis) dan `Analytics Service` (menghitung rata-rata skor rating komik secara berkala).
* **Alasan Cocok Dibuat Asinkron:**
  Pengguna yang memberikan review komik tidak perlu menunggu sistem selesai menghitung ulang statistik seluruh database atau mengirimkan email notifikasi ke semua pembaca. Proses tersebut dapat dikerjakan di latar belakang (*background job*) tanpa menghambat responsivitas antarmuka aplikasi.

---

## 3. Jawaban Refleksi (Lab 10)

1. **(a) Di `publishOrderCreated`, apa yang terjadi bila RabbitMQ sedang mati saat order dibuat, dan dampaknya pada konsistensi data:**
   Jika RabbitMQ mati saat order dibuat, fungsi `publishOrderCreated` akan gagal mengirim event karena channel AMQP tidak tersedia (`null`). Dampaknya terjadi inkonsistensi data antar-service: pesanan komik berhasil tercatat dan stok sudah terpotong di database, tetapi event notifikasi hilang sehingga email bukti transaksi tidak pernah terkirim ke pembeli. Untuk mengatasi masalah ini, dibutuhkan pola *Transactional Outbox* di mana event disimpan dulu ke tabel database bersamaan dengan pesanan, lalu dikirim ulang saat broker pulih.

2. **(b) Bagaimana membuat consumer menjadi idempotent secara benar:**
   Consumer dibuat *idempotent* secara benar dengan memeriksa pengenal unik pesan (`messageId` atau `orderId`) terhadap tabel penyimpanan yang persisten (seperti database PostgreSQL/Redis dengan constraint `UNIQUE`), bukan sekadar variabel memori (`Set`). Sebelum memproses event, consumer mengecek apakah ID tersebut sudah pernah berstatus *processed*; jika sudah, consumer langsung mengirimkan `ack` tanpa mengulangi aksi (seperti pengiriman email ganda atau pemotongan saldo ulang).

3. **(c) Kapan panggilan sinkron seperti di Lab 09 tetap lebih tepat daripada event:**
   Panggilan sinkron (HTTP/gRPC) tetap lebih tepat ketika suatu proses membutuhkan jawaban atau konfirmasi seketika (*immediate feedback*) yang menjadi prasyarat mutlak bagi langkah berikutnya. Contohnya adalah pengecekan dan pemotongan kuantitas stok komik saat pesanan dibuat: `order-service` harus mengetahui secara pasti apakah stok tersedia atau habis sebelum memutuskan untuk menyetujui transaksi pembeli.

