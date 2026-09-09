import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';

import { typeDefs } from './graphql/typeDefs.js';
import { resolvers } from './graphql/resolvers.js';
import { pool, testDatabaseConnection } from './config/database.js';

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer })
  ]
});

await server.start();

app.get('/', (_req, res) => {
  res.json({
    message: 'Comic Library GraphQL API is running.',
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
  expressMiddleware(server, {
    context: async () => ({
      pool
    })
  })
);

const port = Number(process.env.PORT) || 4000;
const host = '0.0.0.0';

await new Promise((resolve) => {
  httpServer.listen({ port, host }, resolve);
});

console.log(`🚀 GraphQL API ready at http://localhost:${port}/graphql`);
console.log(`❤️ Health check: http://localhost:${port}/health`);