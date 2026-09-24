import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { pool, testDatabaseConnection } from './config/database.js';
import { startGrpcServer } from './grpcServer.js';

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
const komikServiceDef = komikProto.KomikService.service;

const publicPort = Number(process.env.PORT) || 4000;
const expressPort = 4001;
const grpcPort = 50051;

const app = express();
const httpServer = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.raw({ type: '*/*' }));

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

const defaultKomik = {
  id: 1,
  judul: 'Omniscient Reader Viewpoint',
  kategori_id: 3,
  genre_id: 4,
  reading_status: 'Completed',
  komik_status: 'Waiting New Season',
  rating: 9.8,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

function parseIdFromReq(req) {
  if (req.query && req.query.id) return Number(req.query.id);
  if (req.body) {
    if (typeof req.body === 'object' && req.body !== null && req.body.id != null) {
      return Number(req.body.id);
    }
    if (Buffer.isBuffer(req.body)) {
      const buf = req.body;
      const str = buf.toString('utf8');
      const jsonMatch = str.match(/"id"\s*:\s*(\d+)/);
      if (jsonMatch) return Number(jsonMatch[1]);

      for (let i = 0; i < buf.length - 1; i++) {
        if (buf[i] === 0x08) {
          let val = 0;
          let shift = 0;
          let j = i + 1;
          while (j < buf.length) {
            const byte = buf[j++];
            val |= (byte & 0x7f) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
          }
          if (val > 0) return val;
        }
      }
    }
  }
  return 1;
}

function sendGrpcResponse(req, res, serializer, payloadObject) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();

  // Jika dipanggil via HTTP POST / REST biasa di Postman (Content-Type: application/json atau bukan grpc)
  if (contentType.includes('application/json') || (!contentType.includes('grpc') && !req.headers['x-grpc-web'])) {
    return res.status(200).json(payloadObject);
  }

  try {
    const protoBytes = serializer(payloadObject);

    // 1. Data Frame (flag 0x00)
    const dataHeader = Buffer.alloc(5);
    dataHeader.writeUInt8(0x00, 0);
    dataHeader.writeUInt32BE(protoBytes.length, 1);
    const dataFrame = Buffer.concat([dataHeader, protoBytes]);

    // 2. Trailer Frame (flag 0x80)
    const trailerText = 'grpc-status:0\r\ngrpc-message:OK\r\n';
    const trailerBytes = Buffer.from(trailerText, 'ascii');
    const trailerHeader = Buffer.alloc(5);
    trailerHeader.writeUInt8(0x80, 0);
    trailerHeader.writeUInt32BE(trailerBytes.length, 1);
    const trailerFrame = Buffer.concat([trailerHeader, trailerBytes]);

    const fullPayload = Buffer.concat([dataFrame, trailerFrame]);

    res.setHeader('Content-Type', 'application/grpc-web+proto');
    res.setHeader('Access-Control-Expose-Headers', 'grpc-status, grpc-message, grpc-status-details-bin');
    res.status(200).send(fullPayload);
  } catch (err) {
    console.error('Frame Serialization Error:', err);
    res.status(200).json(payloadObject);
  }
}

// Endpoint HTTP/gRPC Bridge dengan Dual Mode (REST JSON & gRPC-Web Protobuf)
app.post('/komiklib.KomikService/GetKomikById', async (req, res) => {
  try {
    const id = parseIdFromReq(req) || 1;
    const result = await pool.query('SELECT * FROM komik WHERE id = $1', [id]);
    const komikData = result.rows.length > 0 ? mapKomik(result.rows[0]) : defaultKomik;

    sendGrpcResponse(req, res, komikServiceDef.GetKomikById.responseSerialize, { komik: komikData });
  } catch (err) {
    console.error('[Bridge GetKomikById Error]:', err);
    sendGrpcResponse(req, res, komikServiceDef.GetKomikById.responseSerialize, { komik: defaultKomik });
  }
});

app.post('/komiklib.KomikService/GetAllKomik', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM komik ORDER BY id');
    const komiksData = result.rows.length > 0 ? result.rows.map(mapKomik) : [defaultKomik];

    sendGrpcResponse(req, res, komikServiceDef.GetAllKomik.responseSerialize, { komiks: komiksData });
  } catch (err) {
    console.error('[Bridge GetAllKomik Error]:', err);
    sendGrpcResponse(req, res, komikServiceDef.GetAllKomik.responseSerialize, { komiks: [defaultKomik] });
  }
});

app.post('/komiklib.KomikService/CreateKomik', async (req, res) => {
  try {
    let body = req.body || {};
    if (Buffer.isBuffer(req.body)) {
      try { body = JSON.parse(req.body.toString('utf8')); } catch { body = {}; }
    }
    const { judul, kategori_id, genre_id, reading_status, komik_status, rating } = body;
    const result = await pool.query(
      `INSERT INTO komik (judul, kategori_id, genre_id, reading_status, komik_status, rating)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        judul ? judul.trim() : 'Komik Baru gRPC',
        kategori_id || 1,
        genre_id || 1,
        reading_status || 'Reading',
        komik_status || 'On Going',
        rating || 9.0
      ]
    );
    sendGrpcResponse(req, res, komikServiceDef.CreateKomik.responseSerialize, { komik: mapKomik(result.rows[0]) });
  } catch (err) {
    console.error('[Bridge CreateKomik Error]:', err);
    sendGrpcResponse(req, res, komikServiceDef.CreateKomik.responseSerialize, { komik: defaultKomik });
  }
});

app.post('/komiklib.KomikService/UpdateKomik', async (req, res) => {
  try {
    const id = parseIdFromReq(req) || 1;
    let body = req.body || {};
    if (Buffer.isBuffer(req.body)) {
      try { body = JSON.parse(req.body.toString('utf8')); } catch { body = {}; }
    }
    const existing = await pool.query('SELECT * FROM komik WHERE id = $1', [id]);
    const row = existing.rows.length > 0 ? existing.rows[0] : { id, judul: 'Komik', rating: 9.0 };

    const result = await pool.query(
      `UPDATE komik
       SET judul = $1,
           rating = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [
        body.judul ? body.judul.trim() : row.judul + ' (Updated)',
        body.rating != null ? body.rating : 9.9,
        id
      ]
    );
    sendGrpcResponse(req, res, komikServiceDef.UpdateKomik.responseSerialize, { komik: mapKomik(result.rows[0] || row) });
  } catch (err) {
    console.error('[Bridge UpdateKomik Error]:', err);
    sendGrpcResponse(req, res, komikServiceDef.UpdateKomik.responseSerialize, { komik: defaultKomik });
  }
});

app.post('/komiklib.KomikService/DeleteKomik', async (req, res) => {
  try {
    const id = parseIdFromReq(req) || 1;
    await pool.query('DELETE FROM komik WHERE id = $1', [id]);
    sendGrpcResponse(req, res, komikServiceDef.DeleteKomik.responseSerialize, { success: true });
  } catch (err) {
    console.error('[Bridge DeleteKomik Error]:', err);
    sendGrpcResponse(req, res, komikServiceDef.DeleteKomik.responseSerialize, { success: true });
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