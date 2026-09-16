# LAPORAN LAB 05 — LATIHAN MANDIRI: GRAPHQL MUTATION & QUERY

**Mata Kuliah:** Praktikum Web Service  
**Topik:** GraphQL Query & Mutation Lanjutan (Create, Read, Update, Delete)  
**Studi Kasus:** Project GraphQL Koleksi Komik  
**Endpoint GraphQL Deployment:** `https://URL_DEPLOYMENT_ANDA/graphql` *(Sesuaikan dengan URL publik Render/Vercel)*  
**Link Apollo Sandbox:** `https://studio.apollographql.com/sandbox/explorer?endpoint=https://URL_DEPLOYMENT_ANDA/graphql`

---

## 📌 Latar Belakang & Persiapan

Pada Lab 05 ini, GraphQL API dari Lab 04 yang awalnya hanya dapat membaca data (*Read*) dilengkapi dengan fitur manipulasi data (*Write*) menggunakan **Mutation** (`createKomik`, `updateKomik`, `deleteKomik`) serta dukungan filter pada **Query** (`komiks(kategoriId, genreId)`).

Proses verifikasi keberhasilan dilakukan melalui 6 langkah berurutan di **Apollo Sandbox**.

---

## 🚀 6 Langkah Verifikasi Mutation di Apollo Sandbox

### Langkah 1: Menjalankan Mutation `createKomik` (Create)

Perintah GraphQL Mutation untuk menambahkan data komik baru:

```graphql
mutation CreateKomikUji {
  createKomik(input: {
    judul: "Komik Uji Lab 05",
    kategori_id: "1",
    genre_id: "1",
    reading_status: READING,
    komik_status: ON_GOING,
    rating: 8.5
  }) {
    id
    judul
    reading_status
    komik_status
    rating
    kategori {
      id
      nama_kategori
    }
  }
}
```

* **Hasil Respon**: Komik berhasil dibuat dan menghasilkan **ID baru** (misal ID `56`).
* 📸 *Catatan: Ambil screenshot Apollo Sandbox saat menjalankan langkah ini.*

---

### Langkah 2: Menjalankan Query `komiks` (Verify Create)

Perintah GraphQL Query untuk membuktikan komik baru telah tersimpan di database:

```graphql
query VerifyCreatedKomik {
  komiks {
    id
    judul
    reading_status
    rating
  }
}
```

* **Hasil Respon**: Komik baru `"Komik Uji Lab 05"` dengan ID `56` muncul pada daftar komik.
* 📸 *Catatan: Ambil screenshot Apollo Sandbox yang menampilkan data baru tersebut.*

---

### Langkah 3: Menjalankan Mutation `updateKomik` (Update)

Perintah GraphQL Mutation untuk memperbarui judul, status, dan rating dari komik baru tersebut:

```graphql
mutation UpdateKomikUji {
  updateKomik(
    id: "56",  # Sesuaikan dengan ID dari Langkah 1
    input: {
      judul: "Komik Uji Lab 05 (Updated)",
      rating: 9.8,
      reading_status: COMPLETED
    }
  ) {
    id
    judul
    reading_status
    komik_status
    rating
    updated_at
  }
}
```

* **Hasil Respon**: Respon memperlihatkan data judul telah berubah menjadi `"Komik Uji Lab 05 (Updated)"` dan rating menjadi `9.8`.
* 📸 *Catatan: Ambil screenshot Apollo Sandbox saat pembaruan berhasil.*

---

### Langkah 4: Menjalankan Query Ulang `komiks` (Verify Update)

Perintah GraphQL Query untuk membuktikan perubahan data tersimpan secara permanen:

```graphql
query VerifyUpdatedKomik {
  komiks {
    id
    judul
    reading_status
    rating
  }
}
```

* **Hasil Respon**: Data komik dengan ID `56` pada hasil query terbukti sudah berubah sesuai nilai barunya.
* 📸 *Catatan: Ambil screenshot Apollo Sandbox yang memperlihatkan data ter-update.*

---

### Langkah 5: Menjalankan Mutation `deleteKomik` (Delete)

Perintah GraphQL Mutation untuk menghapus data komik yang telah dibuat:

```graphql
mutation DeleteKomikUji {
  deleteKomik(id: "56")  # Sesuaikan dengan ID dari Langkah 1
}
```

* **Hasil Respon**: Mengembalikan nilai `true`, menandakan proses penghapusan di database PostgreSQL berhasil.
* 📸 *Catatan: Ambil screenshot Apollo Sandbox saat respon `deleteKomik: true` muncul.*

---

### Langkah 6: Menjalankan Query Ulang `komiks` (Verify Delete)

Perintah GraphQL Query untuk membuktikan komik tersebut sudah terhapus:

```graphql
query VerifyDeletedKomik {
  komiks {
    id
    judul
  }
}
```

* **Hasil Respon**: Komik dengan ID `56` sudah **tidak ditemukan lagi** di dalam daftar hasil query.
* 📸 *Catatan: Ambil screenshot Apollo Sandbox yang membuktikan komik sudah hilang.*

---

## 📝 Refleksi Singkat (Jawaban Soal Latihan Mandiri)

> **Soal**: *Refleksi singkat (2-3 kalimat) apa yang lebih rumit ditulis di GraphQL mutation dibanding endpoint REST `POST` / `PUT` / `DELETE` biasa.*

**Jawaban Refleksi**:
> "Di GraphQL Mutation, kita wajib mendefinisikan **Input Type** (`CreateKomikInput` / `UpdateKomikInput`) serta **Selection Set** (field balikan yang ingin diterima di respon) secara eksplisit pada setiap request, tidak seperti REST API biasa yang jenis aksinya ditentukan langsung oleh HTTP Method (`POST`/`PUT`/`DELETE`) dan payload responnya bersifat statis dari controller. Selain itu, penanganan enum, type validation yang ketat di schema, dan penggabungan operasi create/update/delete dalam satu endpoint tunggal (`/graphql`) menuntut penulisan resolver backend yang lebih detail dibandingkan membuat route controller terpisah pada REST API biasa."
