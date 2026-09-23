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

// 1. Jalankan Express + Apollo Server di port internal (4001)
const app = express();
const httpServer = http.createServer(app);

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
  cors({
    origin: [
      'https://studio.apollographql.com',
      'http://localhost:3000',
      'http://localhost:4000'
    ],
    credentials: true
  }),
  express.json(),
  expressMiddleware(apolloServer, {
    context: async () => ({ pool })
  })
);

await new Promise((resolve) => {
  httpServer.listen({ port: expressPort, host: '127.0.0.1' }, resolve);
});
console.log(`🚀 Express/GraphQL ready internally on port ${expressPort}`);

// 2. Jalankan gRPC Server di port internal (50051)
await startGrpcServer(grpcPort);

// 3. Jalankan TCP Multiplexer di PORT utama (Render/Local)
const mainServer = net.createServer((socket) => {
  socket.once('data', (buf) => {
    // Header HTTP/2 gRPC dimulai dengan kata 'PRI'
    const isGrpc = buf.toString('utf8', 0, 3) === 'PRI';
    const targetPort = isGrpc ? grpcPort : expressPort;

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
    // Abaikan reset koneksi biasa
  });
});

mainServer.listen(publicPort, '0.0.0.0', () => {
  console.log(`🔥 Unified Web Service running on public port ${publicPort}`);
  console.log(`   -> Browser / Health Check: http://0.0.0.0:${publicPort}/`);
  console.log(`   -> GraphQL: http://0.0.0.0:${publicPort}/graphql`);
  console.log(`   -> gRPC Service: active for Postman`);
});