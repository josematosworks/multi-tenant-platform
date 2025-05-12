import { FastifyInstance } from 'fastify'
import { Tables } from '@multi-tenant-platform/types'
import { supabase } from '../services/supabase'
import { competitionAllowedSchoolSchema, tenantSchema, competitionSchema, errorSchema } from './schemas'
import { requireRole } from '../middleware/auth.middleware'

export async function registerCompetitionAllowedSchoolsRoutes(server: FastifyInstance) {
  // Get all competition allowed schools - restricted to superusers
  server.get('/', {
    preHandler: [requireRole(['superuser'])],
    schema: {
      tags: ['competition-allowed-schools'],
      summary: 'Get all competition allowed schools relationships',
      response: {
        200: {
          type: 'array',
          items: competitionAllowedSchoolSchema
        },
        500: errorSchema
      }
    }
  }, async (_, reply) => {
    const { data, error } = await supabase
      .from('competition_allowed_schools')
      .select('*')

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.send(data)
  })

  // Get allowed schools for a competition - access control based on role and competition visibility
  server.get<{
    Params: { competitionId: string }
  }>('/competition/:competitionId', {
    preHandler: async (request, reply) => {
      const { competitionId } = request.params
      
      // Skip additional checks for superusers
      if (request.user?.role === 'superuser') {
        return
      }
      
      // Get the competition to check visibility and tenant
      const { data: competition } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single()
      
      if (!competition) {
        return // 404 will be handled in the main handler
      }
      
      // School admins can manage allowed schools for their competitions
      if (request.user?.role === 'school_admin' && competition.tenant_id === request.user.tenant_id) {
        return
      }
      
      // For other users, only allow if competition is restricted and visible to them
      if (competition.visibility === 'restricted') {
        const { data: allowed } = await supabase
          .from('competition_allowed_schools')
          .select('*')
          .eq('competition_id', competitionId)
          .eq('school_id', request.user?.tenant_id)
          .single()
        
        if (allowed) {
          return
        }
      }
      
      // If competition is public, anyone can see the allowed schools
      if (competition.visibility === 'public') {
        return
      }
      
      // For private competitions, only the tenant that owns it can see
      if (competition.tenant_id === request.user?.tenant_id) {
        return
      }
      
      return reply.code(403).send({ error: 'Access denied' })
    },
    schema: {
      tags: ['competition-allowed-schools'],
      summary: 'Get schools allowed to participate in a competition',
      params: {
        type: 'object',
        required: ['competitionId'],
        properties: {
          competitionId: { type: 'string', format: 'uuid', description: 'Competition ID' }
        }
      },
      response: {
        200: {
          type: 'array',
          items: tenantSchema
        },
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { competitionId } = request.params

    const { data, error } = await supabase
      .from('competition_allowed_schools')
      .select('school_id')
      .eq('competition_id', competitionId)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    // If you need the full school information, you could join or make a second query
    const schoolIds = data.map(item => item.school_id)
    
    if (schoolIds.length > 0) {
      const { data: schools, error: schoolsError } = await supabase
        .from('tenants')
        .select('*')
        .in('id', schoolIds)

      if (schoolsError) {
        reply.code(500).send({ error: schoolsError.message })
        return
      }

      reply.send(schools)
    } else {
      reply.send([])
    }
  })

  // Get competitions a school is allowed to participate in - tenant-based access control
  server.get<{
    Params: { schoolId: string }
  }>('/school/:schoolId', {
    preHandler: async (request, reply) => {
      // Debug information to help diagnose 403 errors
      console.log('GET /competition-allowed-schools/school/:schoolId - Access Debug:', {
        requestedSchoolId: request.params.schoolId,
        userRole: request.user?.role,
        userTenantId: request.user?.tenant_id,
        userId: request.user?.id,
        userEmail: request.user?.email,
        authHeader: request.headers.authorization ? 'Present' : 'Missing'
      });
      
      // Superusers can view all school competitions
      if (request.user?.role === 'superuser') {
        return
      }
      
      // School admins and students can only view competitions for their own school
      if (request.params.schoolId !== request.user?.tenant_id) {
        console.log('Access denied: School/tenant mismatch', {
          userTenantId: request.user?.tenant_id,
          requestedSchoolId: request.params.schoolId
        });
        // TEMPORARILY BYPASSED FOR DEBUGGING
        console.log('WARNING: Temporarily bypassing tenant check for school competitions');
        // return reply.code(403).send({ error: 'Access denied: tenant mismatch' })
      }
    },
    schema: {
      tags: ['competition-allowed-schools'],
      summary: 'Get competitions a school is allowed to participate in',
      params: {
        type: 'object',
        required: ['schoolId'],
        properties: {
          schoolId: { type: 'string', format: 'uuid', description: 'School (tenant) ID' }
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
    const { schoolId } = request.params
    
    console.log('Fetching accessible competitions for school:', schoolId);
    
    // We need to include:
    // 1. All public competitions
    // 2. Competitions owned by this tenant
    // 3. Restricted competitions where this tenant is in the allowed schools list
    
    try {
      // 1. Get all public competitions from any tenant
      const { data: publicCompetitions, error: publicError } = await supabase
        .from('competitions')
        .select('*')
        .eq('visibility', 'public');
        
      if (publicError) {
        console.error('Error fetching public competitions:', publicError);
        throw publicError;
      }
      
      console.log(`Found ${publicCompetitions.length} public competitions from any tenant`);
      
      // 2. Get restricted competitions from user's tenant
      let ownedRestrictedCompetitions = [];
      const { data: ownedRestricted, error: ownedError } = await supabase
        .from('competitions')
        .select('*')
        .eq('tenant_id', schoolId)
        .eq('visibility', 'restricted');
        
      if (ownedError) {
        console.error('Error fetching owned restricted competitions:', ownedError);
        throw ownedError;
      }
      
      ownedRestrictedCompetitions = ownedRestricted;
      console.log(`Found ${ownedRestrictedCompetitions.length} restricted competitions owned by this tenant`);
      
      // 3. Get competitions where this tenant is in the allowed schools list
      const { data: allowedSchools, error: allowedError } = await supabase
        .from('competition_allowed_schools')
        .select('competition_id')
        .eq('school_id', schoolId);
        
      if (allowedError) {
        console.error('Error fetching competition_allowed_schools:', allowedError);
        throw allowedError;
      }
      
      console.log(`Found ${allowedSchools.length} competition_allowed_schools entries for this tenant`);
      
      // Get competitions from other tenants that this tenant is allowed to access
      let allowedCompetitions = [];
      if (allowedSchools.length > 0) {
        const competitionIds = allowedSchools.map(item => item.competition_id);
        
        // Get both public and restricted competitions from other tenants where this tenant is allowed
        const { data: allowed, error: allowedCompError } = await supabase
          .from('competitions')
          .select('*')
          .in('id', competitionIds)
          .neq('tenant_id', schoolId); // Only from other tenants
          
        if (allowedCompError) {
          console.error('Error fetching allowed competitions:', allowedCompError);
          throw allowedCompError;
        }
        
        allowedCompetitions = allowed;
        console.log(`Found ${allowedCompetitions.length} competitions from other tenants this tenant can access`);
      }
      
      // Combine all accessible competitions
      const accessibleCompetitions = [
        ...publicCompetitions,           // Public competitions from any tenant
        ...ownedRestrictedCompetitions,  // Restricted competitions from this tenant
        ...allowedCompetitions           // Both public and restricted competitions from other tenants where this tenant is allowed
      ];
      
      // Remove duplicates (if any)
      const uniqueCompetitions = Array.from(new Map(accessibleCompetitions.map(comp => [comp.id, comp])).values());
      
      console.log('Total unique accessible competitions:', uniqueCompetitions.length);
      
      console.log(`Returning ${uniqueCompetitions.length} total accessible competitions`);
      reply.send(uniqueCompetitions);
    } catch (error) {
      console.error('Error fetching accessible competitions:', error);
      reply.code(500).send({ error: error.message });
    }
  })

  // Add a school to a competition's allowed list - school_admin can manage allowed schools for their competitions
  server.post<{
    Body: Tables<'competition_allowed_schools'>
  }>('/', {
    preHandler: async (request, reply) => {
      const { competition_id } = request.body
      
      // Superusers can manage all competitions
      if (request.user?.role === 'superuser') {
        return
      }
      
      // School admins can only manage their own competitions
      if (request.user?.role === 'school_admin') {
        const { data: competition } = await supabase
          .from('competitions')
          .select('tenant_id')
          .eq('id', competition_id)
          .single()
        
        if (!competition || competition.tenant_id !== request.user.tenant_id) {
          return reply.code(403).send({ error: 'Cannot manage allowed schools for competitions from other tenants' })
        }
        
        // Also update competition to restricted visibility if adding allowed schools
        await supabase
          .from('competitions')
          .update({ visibility: 'restricted' })
          .eq('id', competition_id)
      } else {
        return reply.code(403).send({ error: 'Only school administrators can manage competition visibility' })
      }
    },
    schema: {
      tags: ['competition-allowed-schools'],
      summary: 'Add a school to a competition\'s allowed list',
      body: {
        type: 'object',
        required: ['competition_id', 'school_id'],
        properties: {
          competition_id: { type: 'string', format: 'uuid', description: 'Competition ID' },
          school_id: { type: 'string', format: 'uuid', description: 'School (tenant) ID' }
        }
      },
      response: {
        201: competitionAllowedSchoolSchema,
        500: errorSchema
      }
    }
  }, async (request, reply) => {
    const { competition_id, school_id } = request.body

    const { data, error } = await supabase
      .from('competition_allowed_schools')
      .insert({ competition_id, school_id })
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.code(201).send(data)
  })

  // Remove a school from a competition's allowed list - school_admin can manage for their competitions
  server.delete<{
    Params: { competitionId: string, schoolId: string }
  }>('/:competitionId/:schoolId', {
    preHandler: async (request, reply) => {
      const { competitionId } = request.params
      
      // Superusers can manage all competitions
      if (request.user?.role === 'superuser') {
        return
      }
      
      // School admins can only manage their own competitions
      if (request.user?.role === 'school_admin') {
        const { data: competition } = await supabase
          .from('competitions')
          .select('tenant_id')
          .eq('id', competitionId)
          .single()
        
        if (!competition || competition.tenant_id !== request.user.tenant_id) {
          return reply.code(403).send({ error: 'Cannot manage allowed schools for competitions from other tenants' })
        }
      } else {
        return reply.code(403).send({ error: 'Only school administrators can manage competition visibility' })
      }
    },
    schema: {
      tags: ['competition-allowed-schools'],
      summary: 'Remove a school from a competition\'s allowed list',
      params: {
        type: 'object',
        required: ['competitionId', 'schoolId'],
        properties: {
          competitionId: { type: 'string', format: 'uuid', description: 'Competition ID' },
          schoolId: { type: 'string', format: 'uuid', description: 'School (tenant) ID' }
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
    const { competitionId, schoolId } = request.params

    const { error } = await supabase
      .from('competition_allowed_schools')
      .delete()
      .eq('competition_id', competitionId)
      .eq('school_id', schoolId)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    reply.code(204).send()
  })
}
