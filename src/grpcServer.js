import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ReflectionService } from '@grpc/reflection';
import { pool, testDatabaseConnection } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.join(__dirname, '../komik.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const komikProto = grpc.loadPackageDefinition(packageDefinition).komiklib;

function mapKomikToProto(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    judul: row.judul || '',
    kategori_id: row.kategori_id ? Number(row.kategori_id) : 0,
    genre_id: row.genre_id ? Number(row.genre_id) : 0,
    reading_status: row.reading_status || '',
    komik_status: row.komik_status || '',
    rating: row.rating != null ? Number(row.rating) : 0.0,
    created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
    updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : ''
  };
}

export async function startGrpcServer(port = 50051) {
  const server = new grpc.Server();

  const reflection = new ReflectionService(packageDefinition);
  reflection.addToServer(server);

  server.addService(komikProto.KomikService.service, {
    GetKomikById: async (call, callback) => {
      try {
        const id = Number(call.request.id);
        console.log(`[gRPC] GetKomikById ID: ${id}`);
        const result = await pool.query('SELECT * FROM komik WHERE id = $1', [id]);
        if (result.rows.length === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: `Komik dengan ID ${id} tidak ditemukan.`
          });
        }
        callback(null, { komik: mapKomikToProto(result.rows[0]) });
      } catch (error) {
        console.error('[gRPC Error] GetKomikById:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
      }
    },

    GetAllKomik: async (_call, callback) => {
      try {
        console.log('[gRPC] GetAllKomik');
        const result = await pool.query('SELECT * FROM komik ORDER BY id');
        callback(null, { komiks: result.rows.map(mapKomikToProto) });
      } catch (error) {
        console.error('[gRPC Error] GetAllKomik:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
      }
    },

    CreateKomik: async (call, callback) => {
      try {
        const { judul, kategori_id, genre_id, reading_status, komik_status, rating } = call.request;
        console.log(`[gRPC] CreateKomik: ${judul}`);
        const result = await pool.query(
          `INSERT INTO komik (judul, kategori_id, genre_id, reading_status, komik_status, rating)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            judul ? judul.trim() : 'Komik Baru',
            kategori_id || null,
            genre_id || null,
            reading_status || 'Reading',
            komik_status || 'On Going',
            rating || 0
          ]
        );
        callback(null, { komik: mapKomikToProto(result.rows[0]) });
      } catch (error) {
        console.error('[gRPC Error] CreateKomik:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
      }
    },

    UpdateKomik: async (call, callback) => {
      try {
        const { id, judul, kategori_id, genre_id, reading_status, komik_status, rating } = call.request;
        const komikId = Number(id);
        console.log(`[gRPC] UpdateKomik ID: ${komikId}`);
        const existing = await pool.query('SELECT * FROM komik WHERE id = $1', [komikId]);
        if (existing.rows.length === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: `Komik dengan ID ${komikId} tidak ditemukan.`
          });
        }
        const row = existing.rows[0];
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
            judul ? judul.trim() : row.judul,
            kategori_id || row.kategori_id,
            genre_id || row.genre_id,
            reading_status || row.reading_status,
            komik_status || row.komik_status,
            rating != null ? rating : row.rating,
            komikId
          ]
        );
        callback(null, { komik: mapKomikToProto(result.rows[0]) });
      } catch (error) {
        console.error('[gRPC Error] UpdateKomik:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
      }
    },

    DeleteKomik: async (call, callback) => {
      try {
        const id = Number(call.request.id);
        console.log(`[gRPC] DeleteKomik ID: ${id}`);
        const result = await pool.query('DELETE FROM komik WHERE id = $1 RETURNING id', [id]);
        if (result.rowCount === 0) {
          return callback({
            code: grpc.status.NOT_FOUND,
            details: `Komik dengan ID ${id} tidak ditemukan.`
          });
        }
        callback(null, { success: true });
      } catch (error) {
        console.error('[gRPC Error] DeleteKomik:', error);
        callback({ code: grpc.status.INTERNAL, details: error.message });
      }
    }
  });

  const host = '127.0.0.1';

  await testDatabaseConnection();

  await new Promise((resolve, reject) => {
    server.bindAsync(
      `${host}:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (error, boundPort) => {
        if (error) {
          console.error('❌ Gagal menjalankan gRPC Server:', error);
          return reject(error);
        }
        console.log(`🚀 gRPC Server ready at 127.0.0.1:${boundPort}`);
        resolve(boundPort);
      }
    );
  });

  return server;
}

if (process.argv[1] && process.argv[1].endsWith('grpcServer.js')) {
  await startGrpcServer(Number(process.env.GRPC_PORT) || 50051);
}
