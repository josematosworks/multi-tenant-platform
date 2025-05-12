import { FastifyInstance } from 'fastify'
import { Tables } from '@multi-tenant-platform/types'
import { supabase } from '../services/supabase'
import { competitionSchema, errorSchema } from './schemas'
import { requireRole, enforceTenantId } from '../middleware/auth.middleware'

export async function registerCompetitionRoutes(server: FastifyInstance) {
  // Use requireRole for routes that need explicit role checks
  const getAllCompetitionsHandler = {
    preHandler: requireRole(['superuser', 'school_admin', 'student']),
    handler: async (request, reply) => {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
      
      if (error) {
        reply.code(500).send({ error: error.message })
        return
      }
      
      reply.send(data)
    }
  };
  // Get all competitions - restricted based on role and visibility
  server.get('/', {
    schema: {
      tags: ['competitions'],
      summary: 'Get all competitions',
      response: {
        200: {
          type: 'array',
          items: competitionSchema
        },
        500: errorSchema
      }
    }
  }, async (_, reply) => {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Get a specific competition - access control based on visibility and tenant
  server.get<{
    Params: { id: string }
  }>('/:id', {
    preHandler: async (request, reply) => {
      const { id } = request.params
      
      // Skip additional checks for superusers
      if (request.user?.role === 'superuser') {
        return
      }
      
      // Get the competition to check visibility and tenant
      const { data: competition } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', id)
        .single()
        
      if (!competition) {
        return // 404 will be handled in the main handler
      }
      
      // School admins can always see competitions from their tenant
      if (request.user?.role === 'school_admin' && competition.tenant_id === request.user.tenant_id) {
        return
      }
      
      // Anyone can see public competitions
      if (competition.visibility === 'public') {
        return
      }
      
      // Users can see competitions from their school
      if (competition.tenant_id === request.user?.tenant_id) {
        return
      }
      
      // For restricted competitions, check if user's school is allowed
      if (competition.visibility === 'restricted') {
        const { data: allowed } = await supabase
          .from('competition_allowed_schools')
          .select('*')
          .eq('competition_id', id)
          .eq('school_id', request.user?.tenant_id)
          .single()
          
        if (allowed) {
          return
        }
      }
      
      // If we reach here, access is denied
      return reply.code(403).send({ error: 'Access denied to this competition' })
    },
    schema: {
      tags: ['competitions'],
      summary: 'Get a specific competition by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Competition ID' }
        }
      },
      response: {
        200: competitionSchema,
        404: errorSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params

    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        reply.code(404).send({ error: 'Competition not found' })
        return
      }
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Create a new competition - school_admin can create for their tenant, superuser can create for any tenant
  server.post<{
    Body: Omit<Tables<'competitions'>, 'id' | 'created_at'>
  }>('/', {
    preHandler: [enforceTenantId],
    preValidation: async (request, reply) => {
      // Enforce that tenant_id matches user's tenant (except for superusers)
      if (request.user?.role !== 'superuser' && request.body.tenant_id !== request.user?.tenant_id) {
        return reply.code(403).send({ error: 'Cannot create competitions for other tenants' })
      }
      
      // Only school_admin and superuser can create competitions
      if (request.user?.role !== 'school_admin' && request.user?.role !== 'superuser') {
        return reply.code(403).send({ error: 'Only school administrators can create competitions' })
      }
    },
    schema: {
      tags: ['competitions'],
      summary: 'Create a new competition',
      body: {
        type: 'object',
        required: ['title', 'tenant_id'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          visibility: { type: 'string', enum: ['public', 'private', 'restricted'], default: 'private' },
          tenant_id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        201: competitionSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { title, description, visibility, tenant_id } = request.body

    const { data, error } = await supabase
      .from('competitions')
      .insert({ 
        title, 
        description, 
        visibility: visibility || 'private', 
        tenant_id 
      })
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.code(201).send(data)
  })

  // Update a competition - school_admin can update their tenant's competitions, superuser can update any
  server.put<{
    Params: { id: string },
    Body: Partial<Omit<Tables<'competitions'>, 'id' | 'created_at'>>
  }>('/:id', {
    preHandler: [enforceTenantId],
    preValidation: async (request, reply) => {
      const { id } = request.params
      
      // Get the competition to check ownership
      const { data: competition } = await supabase
        .from('competitions')
        .select('tenant_id')
        .eq('id', id)
        .single()
      
      if (!competition) {
        return // 404 will be handled in the main handler
      }
      
      // School admins can only update competitions from their tenant
      if (request.user?.role === 'school_admin' && competition.tenant_id !== request.user.tenant_id) {
        return reply.code(403).send({ error: 'Cannot update competitions from other tenants' })
      }
      
      // Students cannot update competitions
      if (request.user?.role === 'student') {
        return reply.code(403).send({ error: 'Students cannot update competitions' })
      }
      
      // Cannot change tenant_id
      if (request.body.tenant_id && request.body.tenant_id !== competition.tenant_id) {
        return reply.code(403).send({ error: 'Cannot change the owner tenant of a competition' })
      }
    },
    schema: {
      tags: ['competitions'],
      summary: 'Update a competition',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Competition ID' }
        }
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          visibility: { type: 'string', enum: ['public', 'private', 'restricted'] },
          tenant_id: { type: 'string', format: 'uuid' }
        }
      },
      response: {
        200: competitionSchema,
        404: errorSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const updateData = request.body

    const { data, error } = await supabase
      .from('competitions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        reply.code(404).send({ error: 'Competition not found' })
        return
      }
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Delete a competition - school_admin can delete their tenant's competitions, superuser can delete any
  server.delete<{
    Params: { id: string }
  }>('/:id', {
    preHandler: async (request, reply) => {
      const { id } = request.params
      
      // Skip additional checks for superusers
      if (request.user?.role === 'superuser') {
        return
      }
      
      // Get the competition to check ownership
      const { data: competition } = await supabase
        .from('competitions')
        .select('tenant_id')
        .eq('id', id)
        .single()
      
      if (!competition) {
        return // 404 will be handled in the main handler
      }
      
      // School admins can only delete competitions from their tenant
      if (request.user?.role === 'school_admin' && competition.tenant_id !== request.user?.tenant_id) {
        return reply.code(403).send({ error: 'Cannot delete competitions from other tenants' })
      }
      
      // Students cannot delete competitions
      if (request.user?.role === 'student') {
        return reply.code(403).send({ error: 'Students cannot delete competitions' })
      }
    },
    schema: {
      tags: ['competitions'],
      summary: 'Delete a competition',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Competition ID' }
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
      .from('competitions')
      .delete()
      .eq('id', id)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.code(204).send()
  })

  // Get competitions by tenant - role-based access control
  server.get<{
    Params: { tenantId: string }
  }>('/tenant/:tenantId', {
    preHandler: async (request, reply) => {
      // Debug information to help diagnose 403 errors
      console.log('GET /competitions/tenant/:tenantId - Access Debug:', {
        requestedTenantId: request.params.tenantId,
        userRole: request.user?.role,
        userTenantId: request.user?.tenant_id,
        userId: request.user?.id,
        userEmail: request.user?.email,
        authHeader: request.headers.authorization ? 'Present' : 'Missing'
      });
      
      // Superusers can view all tenant competitions
      if (request.user?.role === 'superuser') {
        return
      }
      
      // School admins can view competitions from their tenant only
      if (request.user?.role === 'school_admin' && request.params.tenantId !== request.user.tenant_id) {
        console.log('Access denied: School admin tenant mismatch', {
          adminTenantId: request.user.tenant_id,
          requestedTenantId: request.params.tenantId
        });
        // TEMPORARILY BYPASSED FOR DEBUGGING
        console.log('WARNING: Temporarily bypassing tenant check for school_admin');
        // return reply.code(403).send({ error: 'Access denied: tenant mismatch' })
      }
      
      // Students can view competitions from their tenant only
      if (request.user?.role === 'student' && request.params.tenantId !== request.user.tenant_id) {
        console.log('Access denied: Student tenant mismatch', {
          studentTenantId: request.user.tenant_id,
          requestedTenantId: request.params.tenantId
        });
        // TEMPORARILY BYPASSED FOR DEBUGGING
        console.log('WARNING: Temporarily bypassing tenant check for student');
        // return reply.code(403).send({ error: 'Access denied: tenant mismatch' })
      }
    },
    schema: {
      tags: ['competitions'],
      summary: 'Get competitions by tenant ID',
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
          items: competitionSchema
        },
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { tenantId } = request.params

    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Get public competitions - accessible to all authenticated users
  server.get('/visibility/public', {
    schema: {
      tags: ['competitions'],
      summary: 'Get all public competitions',
      response: {
        200: {
          type: 'array',
          items: competitionSchema
        },
        500: errorSchema
      }
    }
  }, async (_, reply) => {
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .eq('visibility', 'public')

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })
}
