import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import net from 'net';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { pool, testDatabaseConnection } from './config/database.js';
import { startGrpcServer } from './grpcServer.js';

const publicPort = Number(process.env.PORT) || 4000;
const expressPort = 4001;
const grpcPort = 50051;

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());

function mapKomik(row) {
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

// Endpoint HTTP/gRPC Bridge untuk Render Proxy
app.post('/komiklib.KomikService/GetKomikById', async (req, res) => {
  try {
    const id = Number(req.body.id || req.query.id);
    const result = await pool.query('SELECT * FROM komik WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ details: `Komik dengan ID ${id} tidak ditemukan.` });
    }
    res.json({ komik: mapKomik(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/komiklib.KomikService/GetAllKomik', async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM komik ORDER BY id');
    res.json({ komiks: result.rows.map(mapKomik) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/komiklib.KomikService/CreateKomik', async (req, res) => {
  try {
    const { judul, kategori_id, genre_id, reading_status, komik_status, rating } = req.body;
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
    res.json({ komik: mapKomik(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/komiklib.KomikService/UpdateKomik', async (req, res) => {
  try {
    const { id, judul, kategori_id, genre_id, reading_status, komik_status, rating } = req.body;
    const komikId = Number(id);
    const existing = await pool.query('SELECT * FROM komik WHERE id = $1', [komikId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ details: `Komik dengan ID ${komikId} tidak ditemukan.` });
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
    res.json({ komik: mapKomik(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/komiklib.KomikService/DeleteKomik', async (req, res) => {
  try {
    const id = Number(req.body.id);
    const result = await pool.query('DELETE FROM komik WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ details: `Komik dengan ID ${id} tidak ditemukan.` });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })]
});

await apolloServer.start();

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Comic Library Web Service is running (GraphQL & gRPC supported).',
    graphqlEndpoint: '/graphql'
  });
});

app.get('/health', async (_req, res) => {
  try {
    await testDatabaseConnection();
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

app.use(
  '/graphql',
  expressMiddleware(apolloServer, {
    context: async () => ({ pool })
  })
);

await new Promise((resolve) => {
  httpServer.listen({ port: expressPort, host: '127.0.0.1' }, resolve);
});
console.log(`🚀 Express/GraphQL/gRPC-Bridge ready internally on port ${expressPort}`);

// 2. Jalankan gRPC Server di port internal (50051)
await startGrpcServer(grpcPort);

// 3. Jalankan TCP Multiplexer di PORT utama (Render/Local)
const mainServer = net.createServer((socket) => {
  socket.once('data', (buf) => {
    // Header HTTP/2 gRPC asli diawali kata 'PRI'
    const isNativeGrpc = buf.toString('utf8', 0, 3) === 'PRI';
    const targetPort = isNativeGrpc ? grpcPort : expressPort;

    const proxy = net.connect(targetPort, '127.0.0.1', () => {
      proxy.write(buf);
      socket.pipe(proxy);
      proxy.pipe(socket);
    });

    proxy.on('error', (err) => {
      console.error('[Proxy Error]:', err.message);
      socket.destroy();
    });
  });

  socket.on('error', () => {
    // Abaikan reset socket biasa
  });
});

mainServer.listen(publicPort, '0.0.0.0', () => {
  console.log(`🔥 Unified Web Service running on public port ${publicPort}`);
  console.log(`   -> Browser / Health Check: http://0.0.0.0:${publicPort}/`);
  console.log(`   -> GraphQL: http://0.0.0.0:${publicPort}/graphql`);
  console.log(`   -> gRPC Service: active for Postman & Render Proxy`);
});