import { Tables } from '@multi-tenant-platform/types';
import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL;

// Helper function to get auth headers
async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}

/**
 * API client for the multi-tenant platform
 * Uses the typed responses from our database types
 */
export const api = {
  // === TENANTS ===
  /**
   * Get all tenants
   */
  async getTenants(): Promise<Tables<'tenants'>[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tenants`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch tenants');
    }
    return response.json();
  },

  /**
   * Get a specific tenant by ID
   */
  async getTenant(id: string): Promise<Tables<'tenants'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tenants/${id}`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch tenant');
    }
    return response.json();
  },

  /**
   * Create a new tenant
   */
  async createTenant(name: string): Promise<Tables<'tenants'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tenants`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error('Failed to create tenant');
    }
    return response.json();
  },

  /**
   * Update a tenant
   */
  async updateTenant(id: string, name: string): Promise<Tables<'tenants'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error('Failed to update tenant');
    }
    return response.json();
  },

  /**
   * Delete a tenant
   */
  async deleteTenant(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/tenants/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to delete tenant');
    }
  },

  // === USERS ===
  /**
   * Get all users
   */
  async getUsers(): Promise<Tables<'users'>[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  /**
   * Get a specific user
   */
  async getUser(id: string): Promise<Tables<'users'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/${id}`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    return response.json();
  },

  /**
   * Get user by ID - specifically for authentication purposes
   * This uses both the API and direct Supabase access as a fallback
   */
  async getUserById(id: string): Promise<Tables<'users'>> {
    try {
      // First attempt: Use the API (which is more secure but requires authentication)
      return await this.getUser(id);
    } catch (error) {
      console.log(
        'API user fetch failed, trying direct Supabase access:',
        error
      );

      // Second attempt: Direct Supabase access as fallback
      // This is useful immediately after login when we don't have a valid token yet
      const { data, error: supabaseError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (supabaseError || !data) {
        console.error(
          'Failed to fetch user data from Supabase:',
          supabaseError
        );
        throw new Error('Failed to fetch user data');
      }

      return data as Tables<'users'>;
    }
  },

  /**
   * Get users by tenant
   */
  async getUsersByTenant(tenantId: string): Promise<Tables<'users'>[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/tenant/${tenantId}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to fetch users for tenant');
    }
    return response.json();
  },

  /**
   * Create a new user
   */
  async createUser(user: {
    email: string;
    tenant_id: string;
    role: 'school_admin' | 'student';
  }): Promise<Tables<'users'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify(user),
    });
    if (!response.ok) {
      throw new Error('Failed to create user');
    }
    return response.json();
  },

  /**
   * Update a user
   */
  async updateUser(
    id: string,
    data: Partial<{
      email: string;
      tenant_id: string;
      role: 'school_admin' | 'student';
    }>
  ): Promise<Tables<'users'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update user');
    }
    return response.json();
  },

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to delete user');
    }
  },

  // === COMPETITIONS ===
  /**
   * Get all competitions
   */
  async getCompetitions(): Promise<Tables<'competitions'>[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/competitions`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch competitions');
    }
    return response.json();
  },

  /**
   * Get a specific competition
   */
  async getCompetition(id: string): Promise<Tables<'competitions'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/competitions/${id}`, { headers });
    if (!response.ok) {
      throw new Error('Failed to fetch competition');
    }
    return response.json();
  },

  /**
   * Get competitions for a tenant
   */
  async getTenantCompetitions(
    tenantId: string
  ): Promise<Tables<'competitions'>[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/competitions/tenant/${tenantId}`, {
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to fetch competitions for tenant');
    }
    return response.json();
  },

  /**
   * Get public competitions
   */
  async getPublicCompetitions(): Promise<Tables<'competitions'>[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/competitions/visibility/public`, {
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to fetch public competitions');
    }
    return response.json();
  },

  /**
   * Create a new competition
   */
  async createCompetition(competition: {
    title: string;
    description?: string;
    visibility?: 'public' | 'private' | 'restricted';
    tenant_id: string;
  }): Promise<Tables<'competitions'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/competitions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(competition),
    });
    if (!response.ok) {
      throw new Error('Failed to create competition');
    }
    return response.json();
  },

  /**
   * Update a competition
   */
  async updateCompetition(
    id: string,
    data: Partial<{
      title: string;
      description?: string;
      visibility?: 'public' | 'private' | 'restricted';
      tenant_id: string;
    }>
  ): Promise<Tables<'competitions'>> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/competitions/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update competition');
    }
    return response.json();
  },

  /**
   * Delete a competition
   */
  async deleteCompetition(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/competitions/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      throw new Error('Failed to delete competition');
    }
  },

  // === COMPETITION ACCESS ===
  /**
   * Get schools allowed to participate in a competition
   */
  async getCompetitionSchools(
    competitionId: string
  ): Promise<Tables<'tenants'>[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/competition-allowed-schools/competition/${competitionId}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch allowed schools');
    }
    return response.json();
  },

  /**
   * Get competitions a school is allowed to participate in
   */
  async getSchoolCompetitions(
    schoolId: string
  ): Promise<Tables<'competitions'>[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/competition-allowed-schools/school/${schoolId}`,
      { headers }
    );
    if (!response.ok) {
      throw new Error('Failed to fetch allowed competitions');
    }
    return response.json();
  },

  /**
   * Add a school to a competition's allowed list
   */
  async addSchoolToCompetition(
    competitionId: string,
    schoolId: string
  ): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/competition-allowed-schools`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        competition_id: competitionId,
        school_id: schoolId,
      }),
    });
    if (!response.ok) {
      throw new Error('Failed to add school to competition');
    }
  },

  /**
   * Remove a school from a competition's allowed list
   */
  async removeSchoolFromCompetition(
    competitionId: string,
    schoolId: string
  ): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_URL}/competition-allowed-schools/${competitionId}/${schoolId}`,
      {
        method: 'DELETE',
        headers,
      }
    );
    if (!response.ok) {
      throw new Error('Failed to remove school from competition');
    }
  },
};
