import { createClient } from '@supabase/supabase-js'
import { Database } from '@multi-tenant-platform/types'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_ANON_KEY || ''

// Create a single supabase client for the API server
export const supabase = createClient<Database>(supabaseUrl, supabaseKey)

// Helper function to get a service role client (for admin operations)
export const getServiceRoleClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey)
}
