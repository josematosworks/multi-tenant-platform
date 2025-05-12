// Common schema definitions for Swagger documentation

// Tenant schema
export const tenantSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    created_at: { type: 'string', format: 'date-time' }
  }
}

// User schema
export const userSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    email: { type: 'string', format: 'email' },
    tenant_id: { type: 'string', format: 'uuid' },
    role: { type: 'string', enum: ['school_admin', 'student', 'superuser'] }
  }
}

// Competition schema
export const competitionSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    title: { type: 'string' },
    description: { type: 'string', nullable: true },
    visibility: { type: 'string', enum: ['public', 'private', 'restricted'] },
    tenant_id: { type: 'string', format: 'uuid' },
    created_at: { type: 'string', format: 'date-time' }
  }
}

// Competition allowed schools schema
export const competitionAllowedSchoolSchema = {
  type: 'object',
  properties: {
    competition_id: { type: 'string', format: 'uuid' },
    school_id: { type: 'string', format: 'uuid' }
  }
}

// Error schema
export const errorSchema = {
  type: 'object',
  properties: {
    error: { type: 'string' }
  }
}
