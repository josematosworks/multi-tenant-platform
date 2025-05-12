import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tables } from '@multi-tenant-platform/types';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

type TenantContextType = {
  currentTenant: Tables<'tenants'> | null;
  setCurrentTenant: (tenant: Tables<'tenants'> | null) => void;
  tenants: Tables<'tenants'>[];
  loading: boolean;
  error: string | null;
  refreshTenants: () => Promise<void>;
  canChangeTenant: boolean;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tables<'tenants'> | null>(null);
  const [tenants, setTenants] = useState<Tables<'tenants'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isSuperuser } = useAuth();
  
  // Only superusers can change tenants
  const canChangeTenant = isSuperuser();

  // Load tenants only when user is authenticated
  useEffect(() => {
    // Only fetch tenants when user is authenticated
    if (user) {
      refreshTenants();
    } else {
      // Reset tenant state when user is not authenticated
      setTenants([]);
      setCurrentTenant(null);
      setLoading(false);
    }
  }, [user]);
  
  // Automatically set tenant for non-superusers based on their user data
  useEffect(() => {
    const autoSetTenantForNonSuperusers = async () => {
      // If no user or already loading, do nothing
      if (!user || loading) return;

      // If not a superuser, get user details to find their tenant
      if (!isSuperuser() && tenants.length > 0) {
        try {
          // Get the user's details directly from Supabase
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) {
            throw error;
          }

          if (data && data.tenant_id) {
            // Find the tenant in our list
            const userTenant = tenants.find(t => t.id === data.tenant_id);
            if (userTenant) {
              // Set this as the current tenant
              setCurrentTenant(userTenant);
            }
          }
        } catch (err) {
          console.error('Failed to auto-set tenant:', err);
        }
      }
    };

    autoSetTenantForNonSuperusers();
  }, [user, tenants, isSuperuser, loading]);

  // Load previously selected tenant from localStorage if available - only for superusers
  useEffect(() => {
    // Only load tenant selection from localStorage for superusers
    if (isSuperuser() && tenants.length > 0) {
      const savedTenantId = localStorage.getItem('currentTenantId');
      if (savedTenantId) {
        const savedTenant = tenants.find(t => t.id === savedTenantId);
        if (savedTenant) {
          setCurrentTenant(savedTenant);
        }
      }
    }
  }, [tenants, isSuperuser]);

  // Save selected tenant to localStorage when it changes - only for superusers
  useEffect(() => {
    // Only save tenant selection for superusers
    if (isSuperuser()) {
      if (currentTenant) {
        localStorage.setItem('currentTenantId', currentTenant.id);
      } else {
        localStorage.removeItem('currentTenantId');
      }
    }
  }, [currentTenant, isSuperuser]);

  const refreshTenants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tenants')
        .select('*');
      
      if (error) throw error;
      
      setTenants(data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load tenants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        setCurrentTenant,
        tenants,
        loading,
        error,
        refreshTenants,
        canChangeTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
