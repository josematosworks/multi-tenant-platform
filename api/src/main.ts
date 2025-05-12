// Load environment variables at the top of the entry point
import 'dotenv/config';

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { registerAllRoutes } from './routes';
import { authPlugin } from './middleware/auth.middleware';

// Create Fastify server instance
const server = Fastify({
  logger: process.env.NODE_ENV !== 'production',
});

// Register CORS plugin
server.register(fastifyCors, {
  origin: true, // Allow all origins in development
});

// Register auth plugin
server.register(authPlugin);

// Register Swagger plugin
server.register(swagger, {
  openapi: {
    info: {
      title: 'Multi-Tenant Platform API',
      description: 'API for managing multi-tenant platform with competitions',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3333',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'tenants', description: 'Tenant management endpoints' },
      { name: 'users', description: 'User management endpoints' },
      { name: 'competitions', description: 'Competition management endpoints' },
      {
        name: 'competition-allowed-schools',
        description: 'Competition access management endpoints',
      },
    ],
    components: {
      securitySchemes: {
        apiKey: {
          type: 'apiKey',
          name: 'x-api-key',
          in: 'header',
        },
      },
    },
  },
});

// Register Swagger UI plugin
server.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
  staticCSP: true,
  transformSpecificationClone: true,
});

// Health check endpoint
server.get('/health', async (_, reply) => {
  reply.send({ status: 'ok' });
});

// Auth debug endpoint
server.get('/api/auth-debug', async (request, reply) => {
  try {
    // Display auth header info
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // Environment variables check
    const envCheck = {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
      SUPABASE_ANON_KEY: Boolean(process.env.SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      SUPABASE_JWT_SECRET: Boolean(process.env.SUPABASE_JWT_SECRET),
    };

    if (!token) {
      return reply.send({
        status: 'error',
        message: 'No authorization token provided',
        envVarsLoaded: envCheck,
      });
    }

    return reply.send({
      status: 'debug',
      message: 'Auth debug info',
      tokenReceived: true,
      tokenFirstChars: token.substring(0, 10) + '...',
      envVarsLoaded: envCheck,
    });
  } catch (err) {
    console.error('Auth debug endpoint error:', err);
    return reply
      .code(500)
      .send({ status: 'error', message: 'Debug endpoint error' });
  }
});

// Register all API routes
server.register(registerAllRoutes, { prefix: '/api' });

// Start the server
server.listen({ port: 3333, host: '0.0.0.0' }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log('API listening on http://localhost:3333');
});
