import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'supabaseUrl or supabaseServiceKey is not defined',
    supabaseUrl,
    supabaseServiceKey
  );
  console.error('Missing Supabase credentials API');
}

// Create Supabase client with service role key
// Service role key should only be used on the server
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Retrieve user data from Supabase including tenant_id
 * This is useful for validating JWT tokens and retrieving the latest user data
 */
export const getUserData = async (userId: string) => {
  try {
    // Query the users table (which contains tenant_id)
    const { data, error } = await supabase
      .from('users')
      .select('id, email, tenant_id, role')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error retrieving user data:', error);
    return null;
  }
};

/**
 * Update user metadata with tenant_id
 * This ensures the tenant_id is always included in the JWT token
 */
export const updateUserTenantId = async (userId: string, tenantId: string) => {
  try {
    // Update user metadata to include tenant_id
    const { data, error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { tenant_id: tenantId },
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error updating user tenant ID:', error);
    return null;
  }
};
