# LAPORAN RESMI PRAKTIKUM WEB SERVICE (LAB 11)
**Topik:** Dokumentasi API Otomatis (OpenAPI / Swagger UI) dengan Pendekatan Code-First  
**Domain Sistem:** Sistem Toko & Perpustakaan Komik (Comic Store Microservices)  
**Anggota Kelompok:** Tim Proyek Web Service Toko Komik  

---

## 1. Ringkasan Eksekutif Praktikum Lab 11
Pada Lab 11 ini, sistem microservices Toko Komik yang telah dibangun pada Lab 09 dan Lab 10 ditingkatkan dengan dokumentasi interaktif terstandarisasi OpenAPI 3.0 menggunakan pendekatan **Code-First**:
1. **Product Service (:3000):** Menghasilkan spesifikasi OpenAPI otomatis menggunakan `swagger-jsdoc` dari anotasi JSDoc (`@openapi`) pada route `/products`, `/products/{id}`, dan `/products/{id}/reserve`, serta menyajikan `/docs` dan `/openapi.json`.
2. **Order Service (:3001):** Menghasilkan spesifikasi OpenAPI otomatis dari anotasi `@openapi` pada route `/orders` (GET & POST) dan `/orders/{id}`, serta menyajikan `/docs` dan `/openapi.json`.
3. **API Gateway (:8080):** Bertindak sebagai aggregator dokumentasi dinamis dengan mengambil `/openapi.json` dari kedua service, membubuhkan *prefix path* (`/product-service` dan `/order-service`), lalu menyajikan **Swagger UI Gabungan** di `http://localhost:8080/docs`.
4. **Pengujian Interaktif (*Try it out*):** Memverifikasi integritas API dan kesesuaian dokumentasi terhadap kode respons nyata (201 Created, 200 OK, dan 409 Conflict).
5. **Simulasi Dokumentasi Drift:** Membuktikan kelemahan pendekatan *code-first* saat terjadi ketidaksinkronan antara perubahan kode dan anotasi dokumentasi, serta mendemonstrasikan langkah perbaikannya.
6. **Ekspor & Portabilitas:** Menghasilkan file `openapi.json` siap pakai untuk divalidasi pada Swagger Editor dan diimpor ke Postman.

---

## 2. Bukti Screenshot Praktikum (Tugas Kelompok)

### Bukti 1: Swagger UI Gabungan di API Gateway (`:8080/docs`)
- **URL Akses:** `http://localhost:8080/docs/`
- **Keterangan:** Menampilkan seluruh dokumentasi microservices Toko Komik di bawah satu antarmuka, dengan 2 kelompok endpoint lengkap:
  - Kelompok **Products** (`GET /product-service/products`, `GET /product-service/products/{id}`, `POST /product-service/products/{id}/reserve`).
  - Kelompok **Orders** (`GET /order-service/orders`, `POST /order-service/orders`, `GET /order-service/orders/{id}`).

### Bukti 2: Respons HTTP 409 Conflict dari Fitur *Try it out*
- **Endpoint Diuji:** `POST /order-service/orders`
- **Request Body:** `{"productId": 1, "qty": 1000}`
- **Hasil Respons:** HTTP Status `409 Conflict`
- **Response Body JSON:**
  ```json
  {
    "error": "Conflict",
    "message": "Stok komik tidak mencukupi untuk memenuhi pesanan.",
    "sisaStok": 13,
    "diminta": 1000
  }
  ```
- **Keterangan:** Sesuai dengan skema error 409 yang terdokumentasikan pada Swagger UI.

### Bukti 3: Simulasi Drift (Sebelum dan Sesudah Diperbaiki)
- **Langkah Sebelum Diperbaiki:** Field baru `category: 'Manhwa Korea'` ditambahkan pada data produk di `product-service.js`, namun skema `@openapi` belum diubah. Saat dipanggil via *Try it out*, respon JSON memuat `"category"`, namun skema `Product` di Swagger UI belum menampilkannya (terjadi *drift*).
- **Langkah Sesudah Diperbaiki:** Menambahkan properti `category: { type: string, example: 'Manhwa Korea' }` pada anotasi skema `Product` di `product-service.js`. Setelah server direstart dan halaman direfresh, skema `Product` pada bagian *Schemas* di Swagger UI resmi memuat definisi atribut `category` secara sinkron.

---

## 3. Penerapan ke Proyek Kelompok (Comic Library & Store System)
Sesuai instruksi penugasan, berikut dokumentasi rinci minimal **tiga endpoint** dari service tanggung jawab kelompok lengkap dengan skema permintaan (*request*), skema respons (*response*), dan kode error:

### Endpoint 1: `GET /product-service/products` (Katalog Komik)
- **Fungsi:** Mengambil seluruh daftar komik dan manga yang tersedia beserta stok dan harga.
- **Metode HTTP:** `GET`
- **Path:** `/product-service/products`
- **Skema Permintaan (Request):** Tidak memerlukan parameter query wajib.
- **Skema Respons Berhasil (HTTP 200 OK):**
  ```json
  {
    "service": "product-service (Toko Komik)",
    "port": 3000,
    "total": 3,
    "data": [
      {
        "id": 1,
        "name": "Omniscient Reader Viewpoint (Edisi Fisik Vol. 1)",
        "price": 125000,
        "stock": 15,
        "category": "Manhwa Korea"
      }
    ]
  }
  ```
- **Kode Error:**
  - `500 Internal Server Error`: Terjadi kegagalan koneksi ke basis data memori atau server internal.

---

### Endpoint 2: `GET /product-service/products/{id}` (Detail Komik Spesifik)
- **Fungsi:** Menampilkan informasi detail satu judul komik berdasarkan identifier uniknya.
- **Metode HTTP:** `GET`
- **Path:** `/product-service/products/{id}`
- **Parameter Path:**
  - `id` (integer, wajib, contoh: `1`): ID unik komik.
- **Skema Respons Berhasil (HTTP 200 OK):**
  ```json
  {
    "service": "product-service",
    "data": {
      "id": 1,
      "name": "Omniscient Reader Viewpoint (Edisi Fisik Vol. 1)",
      "price": 125000,
      "stock": 15,
      "category": "Manhwa Korea"
    }
  }
  ```
- **Kode Error:**
  - `404 Not Found`:
    ```json
    {
      "error": "Not Found",
      "message": "Komik dengan ID 99 tidak ditemukan."
    }
    ```

---

### Endpoint 3: `POST /order-service/orders` (Transaksi Pemesanan Komik)
- **Fungsi:** Memesan komik, mengurangi stok secara sinkron via `product-service`, menyimpan nota pesanan, dan menerbitkan event ke RabbitMQ.
- **Metode HTTP:** `POST`
- **Path:** `/order-service/orders`
- **Skema Permintaan (Request Body - `application/json`):**
  ```json
  {
    "productId": 1,
    "qty": 2
  }
  ```
- **Skema Respons Berhasil (HTTP 201 Created):**
  ```json
  {
    "message": "Pesanan komik berhasil dibuat!",
    "order": {
      "orderId": 1,
      "productId": 1,
      "productName": "Omniscient Reader Viewpoint (Edisi Fisik Vol. 1)",
      "qty": 2,
      "pricePerUnit": 125000,
      "totalPrice": 250000,
      "orderDate": "2026-11-11T12:00:00.000Z"
    }
  }
  ```
- **Kode Error & Penanganannya:**
  - `400 Bad Request`: Parameter `productId` atau `qty` tidak ada, bernilai 0, atau bukan bilangan bulat.
  - `404 Not Found`: Komik yang dipesan tidak ada di katalog `product-service`.
  - `409 Conflict`: Stok komik tidak mencukupi untuk memenuhi jumlah pesanan.
  - `503 Service Unavailable`: `product-service` mati atau mengalami *timeout* (lebih dari 2 detik).

---

## 4. Jawaban Refleksi (Lab 11)

### (a) Apa kelebihan dan kekurangan code-first dibanding contract-first di Lab 03?
> **Jawaban:**  
> Pendekatan *code-first* memiliki keunggulan utama pada kecepatan iterasi awal (*speed of development*) karena pengembang dapat langsung berfokus mengimplementasikan kode program dan logika bisnis, di mana dokumen spesifikasi OpenAPI secara otomatis diekstrak dari anotasi komentar di samping implementasi tanpa perlu menyusun ribuan baris YAML secara manual sejak hari pertama. Namun, kelemahan mendasarnya adalah kerentanan terhadap terjadinya *drift* (dokumentasi tertinggal saat kode diperbarui tetapi anotasi terlupakan), serta menghalangi tim frontend dan mitra integrasi untuk mulai bekerja secara paralel karena kontrak API baru terbentuk setelah kode backend benar-benar selesai ditulis, berbeda dengan *contract-first* pada Lab 03 yang sejak awal menyediakan *single source of truth* dan mock server bagi seluruh tim.

### (b) Bagaimana mencegah drift dalam tim yang terus mengubah kode?
> **Jawaban:**  
> Cara paling efektif untuk mencegah *drift* dalam tim yang aktif mengubah kode adalah dengan menerapkan *automated schema validation* dan *contract testing* (menggunakan perkakas seperti Dredd, Prism, atau OpenAPI Schema Validator) yang diintegrasikan langsung ke dalam pipeline *Continuous Integration* (CI/CD). Setiap kali ada *pull request* atau perubahan kode baru, pipeline otomatis menguji apakah respon HTTP aktual dari endpoint benar-benar cocok dengan skema OpenAPI yang terdokumentasi; jika terdeteksi perbedaan (*drift*), proses *build* akan otomatis digagalkan (*fail the build*) sehingga pengembang wajib menyinkronkan dokumentasinya sebelum kode disatukan ke cabang utama. Selain itu, penggunaan bahasa bertipe kuat seperti TypeScript bersama library pembangun skema otomatis (misalnya Zod, TypeBox, atau NestJS/tsoa) menjamin bahwa skema OpenAPI diturunkan langsung dari tipe data yang dieksekusi secara runtime tanpa mengandalkan komentar manual.

### (c) Event `order.created` dari Lab 10 tidak muncul di OpenAPI; bagaimana cara mendokumentasikannya?
> **Jawaban:**  
> Event `order.created` tidak dapat didokumentasikan di OpenAPI karena standar OpenAPI secara fundamental hanya dirancang untuk arsitektur sinkron berbasis siklus *HTTP Request-Response*, bukan untuk sistem komunikasi asinkron berbasis pesan/event (*Event-Driven Architecture*) seperti RabbitMQ atau Apache Kafka. Untuk mendokumentasikan pola komunikasi berbasis event secara terstandarisasi, standar industri resmi yang digunakan adalah **AsyncAPI Specification** (asyncapi.com), yang merupakan padanan OpenAPI khusus arsitektur asinkron. Melalui dokumen AsyncAPI (dalam format YAML/JSON), kita dapat mendokumentasikan broker URL, nama *exchange/channel* (`orders`), pola operasi (*publish/subscribe*), skema payload pesan JSON (`orderId`, `productId`, `qty`, `totalPrice`), hingga atribut metadata (*messageId* dan *headers*), sehingga tim pengembang *consumer* (seperti `notification-service`) memiliki acuan kontrak data yang jelas dan presisi.

---

## 5. Panduan Menjalankan Sistem
1. Jalankan **Product Service**:
   ```powershell
   cd "toko/product-service"
   node product-service.js
   ```
2. Jalankan **Order Service**:
   ```powershell
   cd "toko/order-service"
   node order-service.js
   ```
3. *(Opsional)* Jalankan **Notification Service**:
   ```powershell
   cd "toko/notification-service"
   node notification-service.js
   ```
4. Jalankan **API Gateway**:
   ```powershell
   cd "toko/gateway"
   node gateway.js
   ```
5. Akses Swagger UI Dokumentasi Terpusat:
   👉 **`http://localhost:8080/docs/`**
6. File Spesifikasi OpenAPI Gabungan:
   👉 **`toko/openapi.json`** atau URL: **`http://localhost:8080/openapi.json`**

