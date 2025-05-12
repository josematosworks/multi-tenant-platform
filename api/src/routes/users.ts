import { FastifyInstance } from 'fastify'
import { Tables } from '@multi-tenant-platform/types'
import { supabase } from '../services/supabase'
import { userSchema, errorSchema } from './schemas'
import { enforceTenantId, requireRole } from '../middleware/auth.middleware'

export async function registerUserRoutes(server: FastifyInstance) {
  // Apply enforceTenantId middleware to all relevant routes
  server.addHook('onRequest', enforceTenantId);
  
  // Debug endpoint to check and fix the current user's tenant ID
  server.get('/me/debug', {
    schema: {
      tags: ['users'],
      summary: 'Debug endpoint to check the current user details and fix tenant issues',
      response: {
        200: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            token_metadata: { type: 'object' },
            fixed: { type: 'boolean' }
          }
        },
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }
    
    let fixed = false;
    const userId = request.user.id;
    
    try {
      // Get user from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (userError) {
        return reply.code(500).send({ error: userError.message });
      }
      
      // Check if tenant_id needs to be updated in token metadata
      if (userData && userData.tenant_id && (!request.user.tenant_id || request.user.tenant_id !== userData.tenant_id)) {
        // Update user metadata in Supabase Auth
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { 
            tenant_id: userData.tenant_id,
            role: userData.role || 'student'
          }
        });
        
        if (updateError) {
          console.error('Failed to update user metadata:', updateError);
        } else {
          fixed = true;
          console.log(`Updated user ${userId} metadata with tenant_id ${userData.tenant_id}`);
        }
      }
      
      // Get current session to check token metadata
      const { data: sessionData } = await supabase.auth.admin.getUserById(userId);
      
      return reply.send({
        user: request.user,
        database_user: userData,
        token_metadata: sessionData?.user?.user_metadata || {},
        fixed
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      return reply.code(500).send({ error: 'Failed to debug user data' });
    }
  });
  // Get all users - restricted to superusers (view_all_users permission)
  server.get('/', {
    preHandler: [requireRole(['superuser'])],
    schema: {
      tags: ['users'],
      summary: 'Get all users',
      response: {
        200: {
          type: 'array',
          items: userSchema
        },
        500: errorSchema
      }
    }
  }, async (_, reply) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Get a specific user - can only view own profile or users in same tenant (for school_admin)
  server.get<{
    Params: { id: string }
  }>('/:id', {
    preHandler: async (request, reply) => {
      // Allow users to view their own profile
      if (request.params.id === request.user?.id) {
        return;
      }
      
      // School admins can view users in their tenant
      if (request.user?.role === 'school_admin') {
        const { data } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('id', request.params.id)
          .single();
        
        if (data?.tenant_id === request.user.tenant_id) {
          return;
        }
      }
      
      // Superusers can view all users
      if (request.user?.role === 'superuser') {
        return;
      }
      
      return reply.code(403).send({ error: 'Insufficient permissions' });
    },
    schema: {
      tags: ['users'],
      summary: 'Get a specific user by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'User ID' }
        }
      },
      response: {
        200: userSchema,
        404: errorSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        reply.code(404).send({ error: 'User not found' })
        return
      }
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Create a new user - school_admins can invite users to their tenant, superusers can create any user
  server.post<{
    Body: Omit<Tables<'users'>, 'id'>
  }>('/', {
    preHandler: async (request, reply) => {
      // School admins can only create users in their own tenant and not superusers
      if (request.user?.role === 'school_admin') {
        if (request.body.tenant_id !== request.user.tenant_id) {
          return reply.code(403).send({ error: 'Cannot create users for other tenants' });
        }
        
        if (request.body.role === 'superuser') {
          return reply.code(403).send({ error: 'Cannot create superuser accounts' });
        }
      }
      
      // Only superusers can create other superusers
      if (request.body.role === 'superuser' && request.user?.role !== 'superuser') {
        return reply.code(403).send({ error: 'Only superusers can create superuser accounts' });
      }
    },
    schema: {
      tags: ['users'],
      summary: 'Create a new user',
      body: {
        type: 'object',
        required: ['email', 'tenant_id', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          tenant_id: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['school_admin', 'student'] }
        }
      },
      response: {
        201: userSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { email, tenant_id, role } = request.body

    const { data, error } = await supabase
      .from('users')
      .insert({ email, tenant_id, role })
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.code(201).send(data)
  })

  // Update a user - users can update own profile, school_admins can update users in their tenant, superusers can update any user
  server.put<{
    Params: { id: string },
    Body: Partial<Omit<Tables<'users'>, 'id'>>
  }>('/:id', {
    preHandler: async (request, reply) => {
      // Users can update their own profile
      if (request.params.id === request.user?.id) {
        // But cannot change their own role or tenant
        if (request.body.role || request.body.tenant_id) {
          return reply.code(403).send({ error: 'Cannot change your own role or tenant' });
        }
        return;
      }
      
      // School admins can update users in their tenant but not change to superuser
      if (request.user?.role === 'school_admin') {
        const { data } = await supabase
          .from('users')
          .select('tenant_id, role')
          .eq('id', request.params.id)
          .single();
        
        if (!data || data.tenant_id !== request.user.tenant_id) {
          return reply.code(403).send({ error: 'Cannot update users from other tenants' });
        }
        
        if (data.role === 'superuser' || request.body.role === 'superuser') {
          return reply.code(403).send({ error: 'Cannot update superuser accounts' });
        }
        
        // Ensure tenant_id doesn't change
        if (request.body.tenant_id && request.body.tenant_id !== request.user.tenant_id) {
          return reply.code(403).send({ error: 'Cannot change tenant_id to another tenant' });
        }
      }
      
      // Superusers can update any user
      if (request.user?.role !== 'superuser') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }
    },
    schema: {
      tags: ['users'],
      summary: 'Update a user',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'User ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          tenant_id: { type: 'string', format: 'uuid' },
          role: { type: 'string', enum: ['school_admin', 'student'] }
        }
      },
      response: {
        200: userSchema,
        404: errorSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const updateData = request.body

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        reply.code(404).send({ error: 'User not found' })
        return
      }
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Delete a user - school_admins can delete users in their tenant, superusers can delete any user
  server.delete<{
    Params: { id: string }
  }>('/:id', {
    preHandler: async (request, reply) => {
      // Prevent users from deleting themselves
      if (request.params.id === request.user?.id) {
        return reply.code(403).send({ error: 'Cannot delete your own account' });
      }
      
      // School admins can delete users in their tenant but not superusers
      if (request.user?.role === 'school_admin') {
        const { data } = await supabase
          .from('users')
          .select('tenant_id, role')
          .eq('id', request.params.id)
          .single();
        
        if (!data || data.tenant_id !== request.user.tenant_id) {
          return reply.code(403).send({ error: 'Cannot delete users from other tenants' });
        }
        
        if (data.role === 'superuser') {
          return reply.code(403).send({ error: 'Cannot delete superuser accounts' });
        }
      } else if (request.user?.role !== 'superuser') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }
    },
    schema: {
      tags: ['users'],
      summary: 'Delete a user',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'User ID' }
        }
      },
      response: {
        204: {
          type: 'null',
          description: 'No content'
        },
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.code(204).send()
  })

  // Get users by tenant - school_admins can view users in their tenant, superusers can view all
  server.get<{
    Params: { tenantId: string }
  }>('/tenant/:tenantId', {
    preHandler: async (request, reply) => {
      // School admins can only view users in their own tenant
      if (request.user?.role === 'school_admin' && request.params.tenantId !== request.user.tenant_id) {
        return reply.code(403).send({ error: 'Access denied: tenant mismatch' });
      }
      
      // Students cannot view tenant user lists
      if (request.user?.role === 'student') {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }
    },
    schema: {
      tags: ['users'],
      summary: 'Get users by tenant ID',
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string', format: 'uuid', description: 'Tenant ID' }
        }
      },
      response: {
        200: {
          type: 'array',
          items: userSchema
        },
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { tenantId } = request.params

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })
}
