import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';

export function Sidebar() {
  const location = useLocation();
  const { role, isSuperuser } = useAuth();
  const { currentTenant } = useTenant();

  // Filter navigation items based on user role
  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
  ];

  // Filter navigation based on user role
  const navigation = navigationItems.filter(item => {
    // If the item has no required role, show it to everyone
    if (!item.requiredRole) return true;
    // If the item requires superuser, only show it to superusers
    if (item.requiredRole === 'superuser') return isSuperuser();
    return false;
  });

  return (
    <div className="flex flex-col h-full bg-indigo-800 text-white w-64 py-6 px-4">
      <div className="flex items-center mb-10 px-2">
        <h1 className="text-xl font-bold">Multi-Tenant Platform</h1>
      </div>

      <nav className="space-y-1 flex-1">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-4 py-3 text-sm rounded-md
                ${isActive
                  ? 'bg-indigo-900 text-white'
                  : 'text-indigo-100 hover:bg-indigo-700'
                }
              `}
            >
              <item.icon className="h-5 w-5 mr-3" aria-hidden="true" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-indigo-700">
        <div className="flex items-center px-4 py-2">
          <div className="shrink-0">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-sm font-medium">R</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Role</p>
            <p className="text-xs text-indigo-300">{role ? role.replace('_', ' ') : 'User'}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-indigo-700">
        <div className="flex items-center px-4 py-2">
          <div className="shrink-0">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-sm font-medium">T</span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Tenant</p>
            <p className="text-xs text-indigo-300">{currentTenant ? currentTenant.name : 'No tenant'}</p>
          </div>
        </div>
      </div>

    </div>
  );
}
