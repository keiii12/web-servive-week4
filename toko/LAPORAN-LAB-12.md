# LAPORAN RESMI PRAKTIKUM WEB SERVICE (LAB 12)
**Topik:** Automated Testing & Monitoring API (Observability & CI/CD)  
**Domain Sistem:** Sistem Toko & Perpustakaan Komik (Comic Store Microservices)  
**Repository:** [https://github.com/keiii12/web-servive-week4](https://github.com/keiii12/web-servive-week4)  
**Anggota Kelompok:** Tim Proyek Web Service Toko Komik  

[![CI](https://github.com/keiii12/web-servive-week4/actions/workflows/ci.yml/badge.svg)](https://github.com/keiii12/web-servive-week4/actions/workflows/ci.yml)

---

## 1. Ringkasan Eksekutif Praktikum Lab 12
Pada Lab 12 ini, sistem microservices Toko Komik dilengkapi dengan sistem otomasi pengujian, penelusuran terdistribusi (*distributed tracing*), observabilitas (*health check* & *metrics*), skrip pemantau ketersediaan (*monitoring*), dan integrasi berkelanjutan (*CI/CD*) berbasis GitHub Actions:
1. **Automated Testing (`tests/api.test.js`):** Menggunakan *test runner* bawaan Node.js (`node --test`) untuk menguji 10 skenario pengujian fungsional endpoint katalog, pemesanan, pengecekan ketersediaan stok, kode error (400, 404, 409), serta keberadaan header pelacakan.
2. **Uji Regresi (Langkah 03):** Membuktikan keandalan tes otomatis dengan menyimulasikan bug perubahan status stok dari 409 menjadi 400, di mana tes segera mendeteksi kegagalan secara presisi (`AssertionError: 400 !== 409`), lalu kembali lulus setelah kode diperbaiki.
3. **Observabilitas & Tracing (`observability.js`):** Menambahkan middleware pelacak `X-Request-Id`, endpoint `/health`, `/metrics`, dan log berformat JSON terstruktur di `product-service` (:3000), `order-service` (:3001), dan API Gateway (:8080).
4. **Skrip Monitoring Otomatis (`monitor.js`):** Memantau status ketersediaan (*uptime* & *latency*) ketiga komponen secara berkala dan membunyikan `ALERT` saat service tumbang serta `RECOVERED` saat service pulih.
5. **CI/CD Pipeline (`.github/workflows/ci.yml`):** Menjalankan seluruh microservice dan rangkaian tes otomatis secara bersih di runner Ubuntu GitHub Actions pada setiap proses *push* dan *pull request*.

---

## 2. Bukti Screenshot Praktikum (Tugas Kelompok)

### Bukti 1: `npm test` yang Lulus (10/10 Pass)
- **Perintah:** `npm test` (di folder `toko`)
- **Hasil:** Seluruh 10 tes fungsional dan observabilitas lulus (centang hijau `✔`) dengan durasi eksekusi ~275ms tanpa kegagalan (`pass 10, fail 0`).

### Bukti 2: Uji Regresi (Test Gagal dan Hasil Setelah Diperbaiki)
- **Sebelum Diperbaiki (Test Gagal):** Endpoint reservasi stok komik diubah sementara status kodenya dari 409 menjadi 400. Saat `npm test` dijalankan, pengujian `POST /orders dengan qty melebihi stok mengembalikan 409` langsung gagal dengan galat:  
  `AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 400 !== 409 (actual: 400, expected: 409)`.
- **Setelah Diperbaiki:** Status kode dikembalikan ke 409 dan pengujian kembali lulus 100%.

### Bukti 3: Distributed Tracing (Potongan Log Kedua Service dengan ID Sama)
- **Alur Transaksi:** Klien mengirimkan request pembuatan pesanan komik ke Gateway (`POST /order-service/orders`), yang kemudian diteruskan oleh `order-service` ke `product-service` (`POST /products/2/reserve`).
- **Bukti Log JSON di `order-service`:**
  ```json
  {"time":"2026-11-18T09:20:04.767Z","service":"order-service","id":"5423a69c-853f-489a-8266-6830b0800242","method":"POST","path":"/orders","status":201,"ms":60}
  ```
- **Bukti Log JSON di `product-service`:**
  ```json
  {"time":"2026-11-18T09:20:04.757Z","service":"product-service","id":"5423a69c-853f-489a-8266-6830b0800242","method":"POST","path":"/products/2/reserve","status":200,"ms":1}
  ```
- **Keterangan:** Nilai atribut `"id": "5423a69c-853f-489a-8266-6830b0800242"` identik pada kedua service, membuktikan bahwa identitas request berhasil diteruskan dan dilacak lintas batas service.

### Bukti 4: Pemantau Ketersediaan (`monitor.js`) dengan ALERT dan RECOVERED
- **Simulasi Down (`ALERT`):** Saat `product-service` dimatikan menggunakan `Ctrl+C`, skrip monitor langsung mendeteksi status `product-service=DOWN` dan mencetak:  
  `🚨 ALERT: product-service DOWN!`
- **Simulasi Up (`RECOVERED`):** Saat `product-service` dinyalakan kembali, skrip monitor mendeteksi status `product-service=UP` dan mencetak:  
  `✅ RECOVERED: product-service UP!`

---

## 3. Penerapan ke Proyek Kelompok (Comic Library & Store System)
Sesuai instruksi tugas kelompok, berikut penyesuaian rancangan pengujian dan observabilitas pada sistem kelompok:

1. **Endpoint Health Check:**  
   Menyediakan endpoint `GET /health` di setiap service yang mengembalikan status operasional, nama service, dan uptime proses:
   ```json
   { "status": "ok", "service": "catalog-service", "uptimeSec": 450 }
   ```
2. **Minimal Tiga Test Otomatis per Anggota / Service:**
   - **Jalur Sukses (Happy Path):** `GET /products` mengembalikan HTTP status 200 dengan payload daftar komik valid bertipe array.
   - **Jalur Error (Negative Path):** `POST /orders` dengan ID komik yang tidak terdaftar (misal ID 9999) mengembalikan HTTP status 404 Not Found beserta objek error.
   - **Efek Samping (Side Effect):** `POST /orders` berhasil membuat pesanan (201 Created) dan memicu pengurangan stok komik secara atomik pada `product-service` (stok akhir = stok awal - qty pemesanan).
3. **Komponen Target pada `monitor.js`:**
   ```javascript
   const TARGETS = [
     { name: 'gateway', url: 'http://localhost:8080' },
     { name: 'product-service', url: 'http://localhost:3000' },
     { name: 'order-service', url: 'http://localhost:3001' }
   ];
   ```

---

## 4. Jawaban Refleksi (Lab 12)

### (a) Apa yang tidak akan pernah ditangkap oleh test Anda?
> **Jawaban:**  
> Pengujian fungsional otomatis berbasis *black-box* (seperti `api.test.js`) hanya mengevaluasi kebenaran respon dan status HTTP pada skenario sekuensial yang terisolasi, sehingga tidak akan pernah mampu mendeteksi masalah konkurensi tingkat tinggi (*race condition* dan *double booking*) ketika puluhan transaksi memesan sisa stok komik terakhir secara bersamaan dalam milidetik yang identik. Selain itu, pengujian ini tidak memantau metrik stabilitas jangka panjang sistem seperti kebocoran memori (*memory leaks*), akumulasi beban CPU, degradasi latensi akibat penumpukan data di database, maupun kegagalan pengiriman pesan di sisi konsumen asinkron (*consumer crash* di RabbitMQ) setelah balasan 201 Created dikirim ke klien. Pengujian ini juga mengasumsikan kondisi jaringan lokal yang sempurna (*zero-latency network*) tanpa menyimulasikan kegagalan jaringan nyata seperti putusnya koneksi antar-service (*network partition*) atau sertifikat SSL yang kedaluwarsa.

### (b) Mengapa ID permintaan penting pada microservices dan apa keterbatasan log yang hanya tampil di terminal?
> **Jawaban:**  
> ID permintaan (`X-Request-Id`) sangat penting dalam arsitektur microservices untuk menyediakan kemampuan *distributed tracing*, yaitu mengaitkan dan merekonstruksi alur perjalanan satu permintaan pengguna yang berpindah-pindah melintasi API Gateway dan beberapa service internal independen. Tanpa adanya ID pelacak ini, tim pengembang akan kesulitan mencari korelasi antar-log ketika sistem menangani ribuan permintaan konkuren secara bersamaan di lingkungan produksi, terutama saat terjadi galat parsial di service hulu atau hilir. Keterbatasan utama dari log yang hanya dicetak di terminal adalah sifatnya yang *ephemeral* (mudah hilang dan terhapus saat jendela terminal ditutup atau kontainer direstart), tidak dapat diindeks untuk pencarian teks secara cepat, serta tidak dapat diintegrasikan dengan sistem alarm otomatis (*alerting*) tanpa bantuan infrastruktur sentralisasi log seperti ELK Stack, Grafana Loki, atau Datadog.

### (c) Apa risikonya bila `/health` selalu menjawab "ok" tanpa memeriksa dependensi seperti database atau service lain, dan satu hal yang bisa lulus di laptop tetapi gagal di CI beserta penyebabnya?
> **Jawaban:**  
> Risiko fatal apabila endpoint `/health` selalu membalas "ok" secara statis (*shallow health check*) adalah orkestrator kontainer (seperti Kubernetes atau Load Balancer) akan keliru menganggap service tersebut berfungsi normal dan tetap membanjirinya dengan lalu lintas pengguna, padahal basis data atau dependensi pentingnya sedang mati sehingga seluruh permintaan nyata pengguna berujung pada kegagalan HTTP 500 (*silent outage*). Sementara itu, salah satu hal umum yang bisa lulus di laptop pengembang namun gagal di CI (GitHub Actions) adalah perbedaan sensitivitas huruf besar-kecil pada nama file (*case sensitivity*), di mana sistem operasi Windows bersifat *case-insensitive* sehingga pemanggilan modul seperti `require('./observability')` tetap berhasil meskipun berkas aslinya bernama `Observability.js`, sedangkan lingkungan Linux di GitHub Actions bersifat *case-sensitive* sehingga modul tersebut langsung gagal ditemukan (`MODULE_NOT_FOUND`). Penyebab lain yang kerap memicu kegagalan di CI adalah ketergantungan pada variabel lokal mesin pengembang, port yang bentrok, atau waktu inisialisasi server yang lebih lambat di runner cloud sehingga tes dijalankan sebelum service siap menerima koneksi (*race condition*).

