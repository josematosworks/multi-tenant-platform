import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { useAuth } from '../../context/AuthContext';
import { Tables } from '@multi-tenant-platform/types';

export function Header() {
  const { currentTenant, setCurrentTenant, tenants, canChangeTenant } = useTenant();
  const { signOut, user, isSuperuser } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Close dropdown when clicking outside
  useEffect(() => {
    const closeDropdown = () => setDropdownOpen(false);
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, []);

  // Handle tenant selection
  const handleTenantSelect = (tenant: Tables<'tenants'>) => {
    setCurrentTenant(tenant);
    setDropdownOpen(false);
  };

  return (
    <header className="bg-white shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              {currentTenant
                ? `${currentTenant.name}`
                : isSuperuser() ? 'Select a Tenant' : 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Tenant dropdown - only shown to superusers */}
            {isSuperuser() && (
              <div className="relative">
                <div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDropdown();
                    }}
                    type="button"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-xs text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {currentTenant ? currentTenant.name : 'Select tenant'}
                    <svg
                      className="ml-2 -mr-0.5 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                {dropdownOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 divide-y divide-gray-100 focus:outline-hidden"
                    role="menu"
                  >
                    <div className="py-1" role="none">
                      {tenants.map((tenant) => (
                        <button
                          key={tenant.id}
                          onClick={() => handleTenantSelect(tenant)}
                          className={`${
                            currentTenant?.id === tenant.id
                              ? 'bg-gray-100 text-gray-900'
                              : 'text-gray-700'
                          } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100`}
                          role="menuitem"
                        >
                          {tenant.name}
                        </button>
                      ))}
                    </div>
                    <div className="py-1">
                      <Link
                        to="/tenants"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 font-semibold"
                      >
                        Manage Tenants
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* User info and logout button */}
            <div className="ml-3 relative">
              <div className="flex items-center space-x-2">
                {user && (
                  <span className="text-sm text-gray-700">{user.email}</span>
                )}

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
