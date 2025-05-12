import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import fp from 'fastify-plugin';

// Extend Fastify request type to include user information
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      tenant_id: string;
      role: string;
      [key: string]: unknown;
    };
  }
}

/**
 * Plugin to validate JWT tokens from Supabase
 */
export const authPlugin = fp(async (fastify) => {
  fastify.decorateRequest('user', null);

  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Skip auth for public endpoints (if needed)
      const url = request.raw.url as string;
      if (
        url &&
        [
          '/health',
          '/api/login',
          '/api/register',
          '/docs',
          '/documentation',
        ].some((endpoint) => url.includes(endpoint))
      ) {
        return;
      }

      // Get the token from the Authorization header
      const authHeader = request.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return reply.code(401).send({ message: 'No token provided' });
      }

      try {
        // Get JWT secret from environment variables
        const jwtSecret = process.env.SUPABASE_JWT_SECRET;

        if (!jwtSecret) {
          console.error('Missing JWT secret');
          return reply
            .code(500)
            .send({ message: 'Server configuration error' });
        }

        let decoded;
        // Try multiple JWT verification methods to see which one works
        // Method 1: Try with raw JWT secret
        // Try different methods to verify the JWT token
        // First method: Try with raw JWT secret
        try {
          decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
        } catch (err) {
          console.log('Raw secret verification failed, trying decoded string...');

          // Second method: Try with string from base64 decode
          try {
            const base64DecodedString = Buffer.from(jwtSecret, 'base64').toString();
            decoded = jwt.verify(token, base64DecodedString) as jwt.JwtPayload;
          } catch (err) {
            console.log('Decoded string verification failed, trying buffer...');

            // Third method: Try with buffer from base64 decode (most common for Supabase)
            try {
              const base64DecodedBuffer = Buffer.from(jwtSecret, 'base64');
              decoded = jwt.verify(token, base64DecodedBuffer) as jwt.JwtPayload;
            } catch (err) {
              console.log('Decoded buffer verification failed, trying with algorithm...');

              // Fourth method: Try with buffer and explicit algorithm (most secure approach)
              try {
                const base64DecodedBuffer = Buffer.from(jwtSecret, 'base64');
                decoded = jwt.verify(token, base64DecodedBuffer, {
                  algorithms: ['HS256'],
                }) as jwt.JwtPayload;
              } catch (err) {
                // All methods failed
                console.error('JWT verification failed with all methods');
                return reply
                  .code(401)
                  .send({ message: 'Invalid authentication token' });
              }
            }
          }
        }

        // In Supabase, user data is in the 'sub' claim
        if (!decoded.sub) {
          return reply.code(401).send({ message: 'Invalid token' });
        }

        // Extract user metadata from token
        const userMetadata = decoded.user_metadata || {};

        // If tenant_id is missing in token metadata, try to retrieve it from database
        // However, for some routes, we can proceed without a tenant_id
        const isTenantRequired =
          !url.includes('/api/auth-test') &&
          !url.includes('/api/tenants') &&
          !url.includes('/api/users/me');

        if (!userMetadata.tenant_id && isTenantRequired) {
          try {
            // Import needed internally to avoid circular dependency
            const { supabase } = await import('../services/supabase');

            // Try to get tenant_id from users table using user.id (sub claim)
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('tenant_id')
              .eq('id', decoded.sub)
              .single();

            if (userError) {
              console.error(
                'Database error when retrieving tenant_id:',
                userError
              );
            }

            if (userData && userData.tenant_id) {
              // Assign retrieved tenant_id to metadata
              userMetadata.tenant_id = userData.tenant_id;

              // Update user metadata in Supabase
              await supabase.auth.admin.updateUserById(decoded.sub as string, {
                user_metadata: { tenant_id: userData.tenant_id },
              });
            } else {
              console.warn(
                `User ${decoded.sub} does not have a tenant_id in the database`
              );
              // Only block access for routes that truly require a tenant_id
              if (isTenantRequired) {
                return reply
                  .code(403)
                  .send({ message: 'User does not have a tenant assigned' });
              }
            }
          } catch (err) {
            console.error('Error retrieving tenant_id:', err);
            // Only block access for routes that truly require a tenant_id
            if (isTenantRequired) {
              return reply
                .code(403)
                .send({ message: 'Failed to retrieve tenant information' });
            }
          }
        }

        // Attach user info to request
        request.user = {
          id: decoded.sub as string,
          tenant_id: userMetadata.tenant_id,
          role: userMetadata.role || 'student',
          ...userMetadata,
        };
        
        // Debug log for authentication
        if (url && url.includes('/competitions/tenant/')) {
          console.log('Auth Debug - Competition Tenant Request:', {
            path: url,
            userId: request.user.id,
            userRole: request.user.role,
            userTenantId: request.user.tenant_id,
            tokenMetadata: JSON.stringify(userMetadata),
            decodedSub: decoded.sub
          });
        }
      } catch (error) {
        console.error('Token validation error:', error);
        return reply.code(401).send({ message: 'Invalid token' });
      }
    }
  );
});

/**
 * Hook to enforce tenant ID in request parameters
 * This ensures that users can only access data from their own tenant
 */
export const enforceTenantId = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  // Skip for superusers who have elevated permissions
  if (request.user?.role === 'superuser') {
    return;
  }

  // Get tenant_id from request params or query
  interface TenantParams {
    tenantId?: string;
  }
  const requestTenantId =
    (request.params as TenantParams)?.tenantId ||
    (request.query as TenantParams)?.tenantId;

  // If tenant_id is specified in the request, it must match the user's tenant_id
  if (requestTenantId && requestTenantId !== request.user?.tenant_id) {
    return reply.code(403).send({ message: 'Access denied: tenant mismatch' });
  }

  // Enforce tenant_id for any data operations
  // This makes sure all database queries are filtered by tenant_id
  if (request.method !== 'GET') {
    // For data modification, ensure the body contains the correct tenant_id
    if (request.body && typeof request.body === 'object') {
      interface TenantBody {
        tenant_id?: string;
      }
      (request.body as TenantBody).tenant_id = request.user?.tenant_id;
    }
  }
};

/**
 * Hook to require a specific role
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.code(401).send({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(request.user.role)) {
      return reply.code(403).send({ message: 'Insufficient permissions' });
    }
  };
};
