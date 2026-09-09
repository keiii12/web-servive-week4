export const typeDefs = `#graphql
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

  type Kategori {
    id: ID!
    nama_kategori: String!
    komiks: [Komik!]!
  }

  type Genre {
    id: ID!
    nama_genre: String!
    komiks: [Komik!]!
  }

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

  input CreateKategoriInput {
    id: ID!
    nama_kategori: String!
  }

  input CreateGenreInput {
    id: ID!
    nama_genre: String!
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

  type Query {
    kategori: [Kategori!]!
    kategoriById(id: ID!): Kategori

    genre: [Genre!]!
    genreById(id: ID!): Genre

    komiks: [Komik!]!
    komikById(id: ID!): Komik
  }

  type Mutation {
    createKategori(input: CreateKategoriInput!): Kategori!
    deleteKategori(id: ID!): Boolean!

    createGenre(input: CreateGenreInput!): Genre!
    deleteGenre(id: ID!): Boolean!

    createKomik(input: CreateKomikInput!): Komik!
    updateKomik(id: ID!, input: UpdateKomikInput!): Komik!
    deleteKomik(id: ID!): Boolean!
  }
`;