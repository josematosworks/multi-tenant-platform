import { FastifyInstance } from 'fastify';
import { registerTenantRoutes } from './tenants';
import { registerCompetitionRoutes } from './competitions';
import { registerCompetitionAllowedSchoolsRoutes } from './competition-allowed-schools';
import { registerUserRoutes } from './users';

export async function registerAllRoutes(server: FastifyInstance) {
  // Register all routes with their own prefix
  server.register(registerTenantRoutes, { prefix: '/tenants' });
  server.register(registerCompetitionRoutes, { prefix: '/competitions' });
  server.register(registerCompetitionAllowedSchoolsRoutes, {
    prefix: '/competition-allowed-schools',
  });
  server.register(registerUserRoutes, { prefix: '/users' });
}
