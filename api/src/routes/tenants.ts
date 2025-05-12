import { FastifyInstance } from 'fastify'
import { Tables } from '@multi-tenant-platform/types'
import { supabase } from '../services/supabase'
import { tenantSchema, errorSchema } from './schemas'
import { requireRole } from '../middleware/auth.middleware'

export async function registerTenantRoutes(server: FastifyInstance) {
  // Get all tenants - restricted to superusers (view_all_tenants permission)
  server.get('/', {
    preHandler: [requireRole(['superuser'])],
    schema: {
      tags: ['tenants'],
      summary: 'Get all tenants',
      response: {
        200: {
          type: 'array',
          items: tenantSchema
        }
      }
    }
  }, async (_, reply) => {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Get a specific tenant - users can view their own tenant, superusers can view any
  server.get<{
    Params: { id: string }
  }>('/:id', {
    preHandler: async (request, reply) => {
      // Superusers can view all tenants
      if (request.user?.role === 'superuser') {
        return
      }
      
      // Users can view their own tenant
      if (request.params.id === request.user?.tenant_id) {
        return
      }
      
      return reply.code(403).send({ error: 'Access denied: Cannot view other tenants' })
    },
    schema: {
      tags: ['tenants'],
      summary: 'Get a specific tenant by ID',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Tenant ID' }
        }
      },
      response: {
        200: tenantSchema,
        404: errorSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params

    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        reply.code(404).send({ error: 'Tenant not found' })
        return
      }
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Create a new tenant - restricted to superusers (manage_tenants permission)
  server.post<{
    Body: Omit<Tables<'tenants'>, 'id' | 'created_at'>
  }>('/', {
    preHandler: [requireRole(['superuser'])],
    schema: {
      tags: ['tenants'],
      summary: 'Create a new tenant',
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', description: 'Tenant name' }
        }
      },
      response: {
        201: tenantSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { name } = request.body

    const { data, error } = await supabase
      .from('tenants')
      .insert({ name })
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.code(201).send(data)
  })

  // Update a tenant - restricted to superusers (manage_tenants permission)
  server.put<{
    Params: { id: string },
    Body: Omit<Tables<'tenants'>, 'id' | 'created_at'>
  }>('/:id', {
    preHandler: [requireRole(['superuser'])],
    schema: {
      tags: ['tenants'],
      summary: 'Update a tenant',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Tenant ID' }
        }
      },
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', description: 'Tenant name' }
        }
      },
      response: {
        200: tenantSchema,
        404: errorSchema
      }
    }
  }, async (request, reply) => {
    const { id } = request.params
    const { name } = request.body

    const { data, error } = await supabase
      .from('tenants')
      .update({ name })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        reply.code(404).send({ error: 'Tenant not found' })
        return
      }
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Delete a tenant - restricted to superusers (manage_tenants permission)
  server.delete<{
    Params: { id: string }
  }>('/:id', {
    preHandler: [requireRole(['superuser'])],
    schema: {
      tags: ['tenants'],
      summary: 'Delete a tenant',
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Tenant ID' }
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
      .from('tenants')
      .delete()
      .eq('id', id)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.code(204).send()
  })
}
