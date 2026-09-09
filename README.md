# Comic Library GraphQL API

GraphQL API sederhana untuk mengelola koleksi komik menggunakan Node.js, Apollo Server 4, GraphQL, PostgreSQL/Neon, dan Render.

## Teknologi

- Node.js
- JavaScript ES Modules
- Apollo Server 4
- GraphQL
- PostgreSQL
- `pg`
- dotenv
- Neon Database
- Render
- Apollo Sandbox

## Struktur

```text
comic-library-graphql/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── graphql/
│   │   ├── typeDefs.js
│   │   └── resolvers.js
│   └── server.js
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 1. Persiapan

Pastikan Node.js sudah terinstall.

Buka terminal di folder project:

```bash
npm install
```

## 2. Konfigurasi Neon

Buka file `.env` dan isi:

```env
DATABASE_URL=CONNECTION_STRING_NEON_KAMU
PORT=4000
```

Jangan upload `.env` ke GitHub.

Database harus memiliki tabel:

- `kategori`
- `genre`
- `komik`

Relationship:

```text
kategori 1 ───── N komik N ───── 1 genre
```

## 3. Menjalankan server

Development:

```bash
npm run dev
```

Production/local:

```bash
npm start
```

GraphQL endpoint:

```text
http://localhost:4000/graphql
```

Health check:

```text
http://localhost:4000/health
```

## 4. Nested Query

Query untuk mengambil komik sekaligus kategori dan genre:

```graphql
query {
  komiks {
    id
    judul
    rating
    reading_status
    komik_status
    kategori {
      id
      nama_kategori
    }
    genre {
      id
      nama_genre
    }
  }
}
```

Query dari kategori ke komik:

```graphql
query {
  kategori {
    id
    nama_kategori
    komiks {
      id
      judul
      rating
    }
  }
}
```

Query dari genre ke komik:

```graphql
query {
  genre {
    id
    nama_genre
    komiks {
      id
      judul
      rating
    }
  }
}
```

## 5. Mutation

### Create kategori

```graphql
mutation {
  createKategori(
    input: {
      id: 4
      nama_kategori: "Webtoon"
    }
  ) {
    id
    nama_kategori
  }
}
```

### Create genre

```graphql
mutation {
  createGenre(
    input: {
      id: 9
      nama_genre: "Romance"
    }
  ) {
    id
    nama_genre
  }
}
```

### Create komik

```graphql
mutation {
  createKomik(
    input: {
      judul: "Contoh Komik"
      kategori_id: 3
      genre_id: 1
      reading_status: READING
      komik_status: ON_GOING
      rating: 8.5
    }
  ) {
    id
    judul
    rating
    reading_status
    komik_status
    kategori {
      nama_kategori
    }
    genre {
      nama_genre
    }
  }
}
```

### Update komik

Semua field update bersifat opsional.

```graphql
mutation {
  updateKomik(
    id: 1
    input: {
      rating: 9.0
      reading_status: COMPLETED
    }
  ) {
    id
    judul
    rating
    reading_status
  }
}
```

### Delete komik

```graphql
mutation {
  deleteKomik(id: 1)
}
```

## 6. Apollo Sandbox

Setelah server berjalan, buka:

```text
http://localhost:4000/graphql
```

Gunakan Apollo Sandbox/GraphQL client untuk menjalankan query.

Untuk deployment Render, gunakan endpoint:

```text
https://NAMA-SERVICE.onrender.com/graphql
```

## 7. Deploy ke Render

Push project ke GitHub terlebih dahulu.

Di Render buat **Web Service**.

Build Command:

```text
npm install
```

Start Command:

```text
npm start
```

Environment Variables:

```text
DATABASE_URL = connection string Neon
```

Render menyediakan `PORT`; aplikasi sudah menggunakan:

```javascript
process.env.PORT
```

Server juga listen pada:

```text
0.0.0.0
```

Setelah deploy, cek:

```text
https://NAMA-SERVICE.onrender.com/health
```

Kemudian GraphQL:

```text
https://NAMA-SERVICE.onrender.com/graphql
```

## 8. Catatan Enum

PostgreSQL menggunakan string:

```text
Planning read
Reading
On Hold
Completed
```

GraphQL menggunakan:

```text
PLANNING_READ
READING
ON_HOLD
COMPLETED
```

Untuk `komik_status`:

```text
On Going
Completed
Waiting New Season
Gatau baca dimana
```

GraphQL:

```text
ON_GOING
COMPLETED
WAITING_NEW_SEASON
GATAU_BACA_DIMANA
```

Mapping dilakukan di `resolvers.js`.

## 9. Keamanan

- Connection string disimpan di `.env`.
- `.env` masuk `.gitignore`.
- Query PostgreSQL menggunakan parameterized query.
- Jangan memasukkan credential Neon ke source code atau README.
