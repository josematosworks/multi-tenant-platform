import { useState, useEffect } from 'react';
import { Tables } from '@multi-tenant-platform/types';
import { api } from '../../services/api';

export function TenantsList() {
  const [tenants, setTenants] = useState<Tables<'tenants'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTenantName, setNewTenantName] = useState('');

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      setLoading(true);
      const data = await api.getTenants();
      setTenants(data);
      setError(null);
    } catch (err) {
      setError('Failed to load tenants');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!newTenantName.trim()) return;

    try {
      setLoading(true);
      await api.createTenant(newTenantName);
      setNewTenantName('');
      await fetchTenants();
    } catch (err) {
      setError('Failed to create tenant');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && tenants.length === 0) {
    return <div>Loading tenants...</div>;
  }

  return (
    <div className="tenants-list">
      <h2>Tenants</h2>
      
      {error && <div className="error">{error}</div>}
      
      <form onSubmit={handleCreateTenant} className="add-tenant-form">
        <input
          type="text"
          value={newTenantName}
          onChange={(e) => setNewTenantName(e.target.value)}
          placeholder="New tenant name"
          required
        />
        <button type="submit" disabled={loading}>
          Add Tenant
        </button>
      </form>

      {tenants.length === 0 ? (
        <p>No tenants found.</p>
      ) : (
        <ul className="tenants-grid">
          {tenants.map((tenant) => (
            <li key={tenant.id} className="tenant-card">
              <h3>{tenant.name}</h3>
              <p>ID: {tenant.id}</p>
              <p>Created: {new Date(tenant.created_at).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
