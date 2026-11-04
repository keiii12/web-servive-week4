// ===================================================================
// GraphQL Schema Definitions (typeDefs)
// Menggabungkan tugas Lab 04 (Type & Query berelasi) dan Lab 05 (Input Type, Mutation & Filter)
// ===================================================================

export const typeDefs = `#graphql
  # ==========================================
  # [LAB 04] ENUMS & TYPE DEFINITIONS DASAR
  # ==========================================
  enum ReadingStatus {
    PLANNING_READ
    READING
    ON_HOLD
    COMPLETED
  }

  enum KomikStatus {
    ON_GOING
    COMPLETED
    WAITING_NEW_SEASON
    GATAU_BACA_DIMANA
  }

  # Tabel Kategori (Lab 04: minimal dua tabel saling berelasi)
  type Kategori {
    id: ID!
    nama_kategori: String!
    komiks: [Komik!]!
  }

  # Tabel Genre
  type Genre {
    id: ID!
    nama_genre: String!
    komiks: [Komik!]!
  }

  # Tabel Komik (Lab 04: nested query ke kategori dan genre)
  type Komik {
    id: ID!
    judul: String!
    kategori_id: ID
    genre_id: ID
    reading_status: ReadingStatus!
    komik_status: KomikStatus!
    rating: Float
    created_at: String!
    updated_at: String!
    kategori: Kategori
    genre: Genre
  }

  # ==========================================
  # [LAB 05] INPUT TYPES UNTUK MUTATION
  # Merapikan parameter mutation yang kompleks
  # ==========================================
  input CreateKategoriInput {
    id: ID!
    nama_kategori: String!
  }

  input CreateGenreInput {
    id: ID!
    nama_genre: String!
  }

  input UpdateKategoriInput {
    nama_kategori: String
  }

  input UpdateGenreInput {
    nama_genre: String
  }

  input CreateKomikInput {
    judul: String!
    kategori_id: ID
    genre_id: ID
    reading_status: ReadingStatus!
    komik_status: KomikStatus!
    rating: Float
  }

  input UpdateKomikInput {
    judul: String
    kategori_id: ID
    genre_id: ID
    reading_status: ReadingStatus
    komik_status: KomikStatus
    rating: Float
  }

  # ==========================================
  # [LAB 04 & LAB 05] QUERY TYPE
  # - Lab 04: Query data relasi (kategori, genre, komiks)
  # - Lab 05: Argument filter (kategoriId, genreId)
  # ==========================================
  type Query {
    kategori: [Kategori!]!
    kategoriById(id: ID!): Kategori

    genre: [Genre!]!
    genreById(id: ID!): Genre

    # Lab 05 Langkah 03: Filter pada Query
    komiks(kategoriId: ID, genreId: ID): [Komik!]!
    komikById(id: ID!): Komik
  }

  # ==========================================
  # [LAB 05] MUTATION TYPE
  # Operasi Create, Update, Delete ke Neon
  # ==========================================
  type Mutation {
    createKategori(input: CreateKategoriInput!): Kategori!
    updateKategori(id: ID!, input: UpdateKategoriInput!): Kategori!
    deleteKategori(id: ID!): Boolean!

    createGenre(input: CreateGenreInput!): Genre!
    updateGenre(id: ID!, input: UpdateGenreInput!): Genre!
    deleteGenre(id: ID!): Boolean!

    createKomik(input: CreateKomikInput!): Komik!
    updateKomik(id: ID!, input: UpdateKomikInput!): Komik!
    deleteKomik(id: ID!): Boolean!
  }
`;