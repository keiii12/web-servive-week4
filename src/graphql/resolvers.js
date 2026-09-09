import { pool } from '../config/database.js';

const readingStatusToDb = {
  PLANNING_READ: 'Planning read',
  READING: 'Reading',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed'
};

const readingStatusToGraphQL = {
  'Planning read': 'PLANNING_READ',
  Reading: 'READING',
  'On Hold': 'ON_HOLD',
  Completed: 'COMPLETED'
};

const komikStatusToDb = {
  ON_GOING: 'On Going',
  COMPLETED: 'Completed',
  WAITING_NEW_SEASON: 'Waiting New Season',
  GATAU_BACA_DIMANA: 'Gatau baca dimana'
};

const komikStatusToGraphQL = {
  'On Going': 'ON_GOING',
  Completed: 'COMPLETED',
  'Waiting New Season': 'WAITING_NEW_SEASON',
  'Gatau baca dimana': 'GATAU_BACA_DIMANA'
};

function mapKomik(row) {
  if (!row) return null;

  return {
    ...row,
    id: String(row.id),
    kategori_id: row.kategori_id == null ? null : String(row.kategori_id),
    genre_id: row.genre_id == null ? null : String(row.genre_id),
    reading_status: readingStatusToGraphQL[row.reading_status],
    komik_status: komikStatusToGraphQL[row.komik_status],
    rating: row.rating == null ? null : Number(row.rating),
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString()
  };
}

function mapKategori(row) {
  if (!row) return null;
  return {
    ...row,
    id: String(row.id)
  };
}

function mapGenre(row) {
  if (!row) return null;
  return {
    ...row,
    id: String(row.id)
  };
}

function parseId(id, fieldName = 'ID') {
  const parsed = Number(id);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} harus berupa angka.`);
  }
  return parsed;
}

function validateRating(rating) {
  if (rating == null) return;
  if (typeof rating !== 'number' || rating < 0 || rating > 10) {
    throw new Error('Rating harus berada di antara 0 sampai 10.');
  }
}

async function getKomikByIdInternal(id) {
  const result = await pool.query(
    'SELECT * FROM komik WHERE id = $1',
    [id]
  );
  return mapKomik(result.rows[0]);
}

export const resolvers = {
  Query: {
    kategori: async () => {
      const result = await pool.query(
        'SELECT * FROM kategori ORDER BY id'
      );
      return result.rows.map(mapKategori);
    },

    kategoriById: async (_, { id }) => {
      const result = await pool.query(
        'SELECT * FROM kategori WHERE id = $1',
        [parseId(id)]
      );
      return mapKategori(result.rows[0]);
    },

    genre: async () => {
      const result = await pool.query(
        'SELECT * FROM genre ORDER BY id'
      );
      return result.rows.map(mapGenre);
    },

    genreById: async (_, { id }) => {
      const result = await pool.query(
        'SELECT * FROM genre WHERE id = $1',
        [parseId(id)]
      );
      return mapGenre(result.rows[0]);
    },

    komiks: async () => {
      const result = await pool.query(
        'SELECT * FROM komik ORDER BY id'
      );
      return result.rows.map(mapKomik);
    },

    komikById: async (_, { id }) => {
      return getKomikByIdInternal(parseId(id));
    }
  },

  Mutation: {
    createKategori: async (_, { input }) => {
      const id = parseId(input.id);
      const nama = input.nama_kategori.trim();

      if (!nama) {
        throw new Error('nama_kategori tidak boleh kosong.');
      }

      try {
        const result = await pool.query(
          `INSERT INTO kategori (id, nama_kategori)
           VALUES ($1, $2)
           RETURNING *`,
          [id, nama]
        );
        return mapKategori(result.rows[0]);
      } catch (error) {
        if (error.code === '23505') {
          throw new Error('ID atau nama kategori sudah digunakan.');
        }
        throw error;
      }
    },

    deleteKategori: async (_, { id }) => {
      const result = await pool.query(
        'DELETE FROM kategori WHERE id = $1 RETURNING id',
        [parseId(id)]
      );

      if (result.rowCount === 0) {
        throw new Error('Kategori tidak ditemukan.');
      }

      return true;
    },

    createGenre: async (_, { input }) => {
      const id = parseId(input.id);
      const nama = input.nama_genre.trim();

      if (!nama) {
        throw new Error('nama_genre tidak boleh kosong.');
      }

      try {
        const result = await pool.query(
          `INSERT INTO genre (id, nama_genre)
           VALUES ($1, $2)
           RETURNING *`,
          [id, nama]
        );
        return mapGenre(result.rows[0]);
      } catch (error) {
        if (error.code === '23505') {
          throw new Error('ID atau nama genre sudah digunakan.');
        }
        throw error;
      }
    },

    deleteGenre: async (_, { id }) => {
      const result = await pool.query(
        'DELETE FROM genre WHERE id = $1 RETURNING id',
        [parseId(id)]
      );

      if (result.rowCount === 0) {
        throw new Error('Genre tidak ditemukan.');
      }

      return true;
    },

    createKomik: async (_, { input }) => {
      validateRating(input.rating);

      const kategoriId = input.kategori_id == null
        ? null
        : parseId(input.kategori_id, 'kategori_id');

      const genreId = input.genre_id == null
        ? null
        : parseId(input.genre_id, 'genre_id');

      try {
        const result = await pool.query(
          `INSERT INTO komik
            (judul, kategori_id, genre_id, reading_status, komik_status, rating)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            input.judul.trim(),
            kategoriId,
            genreId,
            readingStatusToDb[input.reading_status],
            komikStatusToDb[input.komik_status],
            input.rating ?? null
          ]
        );

        return mapKomik(result.rows[0]);
      } catch (error) {
        if (error.code === '23503') {
          throw new Error('kategori_id atau genre_id tidak ditemukan.');
        }
        throw error;
      }
    },

    updateKomik: async (_, { id, input }) => {
      const komikId = parseId(id);
      validateRating(input.rating);

      const existing = await getKomikByIdInternal(komikId);

      if (!existing) {
        throw new Error('Komik tidak ditemukan.');
      }

      const judul = input.judul ?? existing.judul;
      const kategoriId = input.kategori_id === undefined
        ? existing.kategori_id
        : input.kategori_id === null
          ? null
          : parseId(input.kategori_id, 'kategori_id');

      const genreId = input.genre_id === undefined
        ? existing.genre_id
        : input.genre_id === null
          ? null
          : parseId(input.genre_id, 'genre_id');

      const readingStatus = input.reading_status === undefined
        ? readingStatusToDb[existing.reading_status]
        : readingStatusToDb[input.reading_status];

      const komikStatus = input.komik_status === undefined
        ? komikStatusToDb[existing.komik_status]
        : komikStatusToDb[input.komik_status];

      const rating = input.rating === undefined
        ? existing.rating
        : input.rating;

      try {
        const result = await pool.query(
          `UPDATE komik
           SET judul = $1,
               kategori_id = $2,
               genre_id = $3,
               reading_status = $4,
               komik_status = $5,
               rating = $6,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $7
           RETURNING *`,
          [
            judul.trim(),
            kategoriId,
            genreId,
            readingStatus,
            komikStatus,
            rating,
            komikId
          ]
        );

        return mapKomik(result.rows[0]);
      } catch (error) {
        if (error.code === '23503') {
          throw new Error('kategori_id atau genre_id tidak ditemukan.');
        }
        throw error;
      }
    },

    deleteKomik: async (_, { id }) => {
      const result = await pool.query(
        'DELETE FROM komik WHERE id = $1 RETURNING id',
        [parseId(id)]
      );

      if (result.rowCount === 0) {
        throw new Error('Komik tidak ditemukan.');
      }

      return true;
    }
  },

  Komik: {
    kategori: async (parent) => {
      if (parent.kategori_id == null) return null;

      const result = await pool.query(
        'SELECT * FROM kategori WHERE id = $1',
        [Number(parent.kategori_id)]
      );

      return mapKategori(result.rows[0]);
    },

    genre: async (parent) => {
      if (parent.genre_id == null) return null;

      const result = await pool.query(
        'SELECT * FROM genre WHERE id = $1',
        [Number(parent.genre_id)]
      );

      return mapGenre(result.rows[0]);
    }
  },

  Kategori: {
    komiks: async (parent) => {
      const result = await pool.query(
        'SELECT * FROM komik WHERE kategori_id = $1 ORDER BY id',
        [Number(parent.id)]
      );

      return result.rows.map(mapKomik);
    }
  },

  Genre: {
    komiks: async (parent) => {
      const result = await pool.query(
        'SELECT * FROM komik WHERE genre_id = $1 ORDER BY id',
        [Number(parent.id)]
      );

      return result.rows.map(mapKomik);
    }
  }
};