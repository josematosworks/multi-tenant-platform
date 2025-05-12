import { useState, useEffect } from 'react';
import { Tables } from '@multi-tenant-platform/types';
import { api } from '../../services/api';
import { supabase } from '../../services/supabase';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { MainLayout } from '../../components/layout/MainLayout';
import { UsersIcon, BuildingOfficeIcon, TrophyIcon } from '@heroicons/react/24/outline';

export function DashboardPage() {
  const { currentTenant, tenants } = useTenant();
  const { isSchoolAdmin, isSuperuser } = useAuth();
  const [tenantCompetitions, setTenantCompetitions] = useState<Tables<'competitions'>[]>([]);
  const [accessibleCompetitions, setAccessibleCompetitions] = useState<Tables<'competitions'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Superuser data
  const [allCompetitions, setAllCompetitions] = useState<Tables<'competitions'>[]>([]);
  const [allUsers, setAllUsers] = useState<Tables<'users'>[]>([]);
  const [loadingSuperUserData, setLoadingSuperUserData] = useState(false);

  // Form state for creating competitions
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'restricted'>('private');

  // Edit competition state
  const [editCompetition, setEditCompetition] = useState<Tables<'competitions'> | null>(null);

  useEffect(() => {
    loadCompetitionsData();

    // Load superuser data if the user is a superuser
    if (isSuperuser()) {
      loadSuperuserData();
    }
  }, [currentTenant, isSuperuser]);

  async function loadCompetitionsData() {
    if (!currentTenant) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Load competitions created by this tenant (these go in the "Your Tenant's Competitions" section)
      const tenantComps = await api.getTenantCompetitions(currentTenant.id);
      setTenantCompetitions(tenantComps);

      // 2. Load all accessible competitions (public, owned, and allowed restricted)
      try {
        const allAccessibleComps = await api.getSchoolCompetitions(currentTenant.id);

        // Show ALL accessible competitions without filtering
        // This includes:
        // - Public competitions from any tenant
        // - All competitions owned by this tenant
        // - Restricted competitions from other tenants where this tenant is allowed
        setAccessibleCompetitions(allAccessibleComps);
      } catch (accessError) {
        console.warn('Could not load accessible competitions:', accessError);
        // Don't set the main error - we still have tenant competitions to show
        setAccessibleCompetitions([]);
      }
    } catch (err) {
      setError('Failed to load competitions data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSuperuserData() {
    setLoadingSuperUserData(true);
    try {
      // Load data directly from Supabase for more reliable access
      // Get competitions directly from Supabase
      const { data: compsData, error: compsError } = await supabase
        .from('competitions')
        .select('*');

      if (compsError) {
        console.error('Supabase competitions error:', compsError);
      } else {
        setAllCompetitions(compsData);
      }

      // Get users directly from Supabase
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.error('Supabase users error:', usersError);
      } else {
        setAllUsers(usersData);
      }
    } catch (err) {
      console.error('Failed to load superuser data:', err);
    } finally {
      setLoadingSuperUserData(false);
    }
  }

  async function handleCreateCompetition(e: React.FormEvent) {
    e.preventDefault();
    if (!currentTenant) {
      setError('Please select a tenant first');
      return;
    }

    try {
      setLoading(true);
      await api.createCompetition({
        title,
        description: description || undefined,
        visibility,
        tenant_id: currentTenant.id
      });

      // Reset form
      setTitle('');
      setDescription('');
      setVisibility('private');
      setFormOpen(false);

      // Reload competitions
      await loadCompetitionsData();
    } catch (err) {
      setError('Failed to create competition');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateCompetition(e: React.FormEvent) {
    e.preventDefault();
    if (!editCompetition) return;

    try {
      setLoading(true);
      await api.updateCompetition(editCompetition.id, {
        title,
        description: description || undefined,
        visibility
      });

      // Reset form
      setEditCompetition(null);
      setTitle('');
      setDescription('');
      setVisibility('private');

      // Reload competitions
      await loadCompetitionsData();
    } catch (err) {
      setError('Failed to update competition');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCompetition(id: string) {
    if (!window.confirm('Are you sure you want to delete this competition?')) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteCompetition(id);
      await loadCompetitionsData();
    } catch (err) {
      setError('Failed to delete competition');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleEditCompetition(competition: Tables<'competitions'>) {
    setEditCompetition(competition);
    setTitle(competition.title);
    setDescription(competition.description || '');
    setVisibility(competition.visibility as 'public' | 'private' | 'restricted');
  }

  return (
    <MainLayout>
      <div className="dashboard">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            {currentTenant
              ? `${currentTenant.name} Dashboard`
              : 'Platform Dashboard'}
          </h1>
          {currentTenant && isSchoolAdmin() && (
            <button
              onClick={() => setFormOpen(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add Competition
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {loading && tenantCompetitions.length === 0 && accessibleCompetitions.length === 0 ? (
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            <p className="mt-2 text-gray-600">Loading competitions data...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-4 rounded-md">
                  <span className="text-indigo-600 text-2xl font-bold">
                    {tenantCompetitions.length}
                  </span>
                  <p className="text-gray-600">Competitions Created</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-md">
                  <span className="text-blue-600 text-2xl font-bold">
                    {accessibleCompetitions.length}
                  </span>
                  <p className="text-gray-600">Accessible Competitions</p>
                </div>
              </div>
            </div>

            {/* Tenant's Competitions */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">
                Competitions Created by {currentTenant?.name}
              </h2>
              {tenantCompetitions.length === 0 ? (
                <p className="text-gray-500">No competitions created by this tenant.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                        {isSchoolAdmin() && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {tenantCompetitions.map((competition) => (
                        <tr key={competition.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{competition.title}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{competition.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${competition.visibility === 'public' ? 'bg-green-100 text-green-800' : competition.visibility === 'private' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {competition.visibility}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{currentTenant?.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{new Date(competition.created_at).toLocaleDateString()}</div>
                          </td>
                          {isSchoolAdmin() && (
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEditCompetition(competition)}
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCompetition(competition.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Delete
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Accessible Competitions */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold mb-4">
                Competitions You Have Access To
              </h2>
              {accessibleCompetitions.length === 0 ? (
                <p className="text-gray-500">No accessible competitions found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {accessibleCompetitions.map((competition) => {
                        // Find the tenant that created this competition
                        const tenant = tenants.find(t => t.id === competition.tenant_id);
                        return (
                          <tr key={competition.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{competition.title}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-500">{competition.description || '-'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${competition.visibility === 'public' ? 'bg-green-100 text-green-800' : competition.visibility === 'private' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {competition.visibility}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{tenant?.name || 'Unknown'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{new Date(competition.created_at).toLocaleDateString()}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Superuser Sections */}
            {isSuperuser() && (
              <div className="space-y-8">
                <div className="bg-gray-50 p-6 rounded-lg border-2 border-indigo-100">
                  <h2 className="text-xl font-bold mb-6 text-indigo-800 flex items-center">
                    <BuildingOfficeIcon className="h-6 w-6 mr-2" />
                    All Tenants
                  </h2>

                  {loadingSuperUserData ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {tenants.map((tenant) => (
                            <tr key={tenant.id}>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-xs text-gray-500">{tenant.id}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{new Date(tenant.created_at).toLocaleDateString()}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border-2 border-indigo-100">
                  <h2 className="text-xl font-bold mb-6 text-indigo-800 flex items-center">
                    <UsersIcon className="h-6 w-6 mr-2" />
                    All Users
                  </h2>

                  {loadingSuperUserData ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allUsers.map((user) => {
                            const userTenant = tenants.find(t => t.id === user.tenant_id);
                            return (
                              <tr key={user.id}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{user.email}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${user.role === 'superuser' ? 'bg-purple-100 text-purple-800' : user.role === 'school_admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {user.role?.replace('_', ' ') || 'Unknown'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{userTenant?.name || 'None'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 p-6 rounded-lg border-2 border-indigo-100">
                  <h2 className="text-xl font-bold mb-6 text-indigo-800 flex items-center">
                    <TrophyIcon className="h-6 w-6 mr-2" />
                    All Competitions
                  </h2>

                  {loadingSuperUserData ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent"></div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {allCompetitions.map((competition) => {
                            const compTenant = tenants.find(t => t.id === competition.tenant_id);
                            return (
                              <tr key={competition.id}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900">{competition.title}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${competition.visibility === 'public' ? 'bg-green-100 text-green-800' : competition.visibility === 'private' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {competition.visibility}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{compTenant?.name || 'Unknown'}</div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-500">{new Date(competition.created_at).toLocaleDateString()}</div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Create Competition Form */}
        {formOpen && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Create New Competition</h2>
              <form onSubmit={handleCreateCompetition}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'public' | 'private' | 'restricted')}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Competition Form */}
        {editCompetition && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">Edit Competition</h2>
              <form onSubmit={handleUpdateCompetition}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as 'public' | 'private' | 'restricted')}
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                    <option value="restricted">Restricted</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditCompetition(null)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !title.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
