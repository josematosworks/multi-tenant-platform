import { Navigate, Outlet, RouteObject } from 'react-router-dom';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { LoginPage } from './pages/auth/LoginPage';
import { useAuth } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';

// Root layout with AuthProvider
const RootLayout = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

// Protected route component that redirects to login if not authenticated
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};


// Public route that redirects to dashboard if already authenticated
const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        Loading...
      </div>
    );
  }

  return user ? <Navigate to="/" replace /> : <Outlet />;
};

// Create app routes as a function to be used in app.tsx
export const createAppRoutes = (): RouteObject[] => [
  {
    element: <RootLayout />,
    children: [
      {
        path: '/login',
        element: <PublicRoute />,
        children: [
          {
            path: '',
            element: <LoginPage />,
          },
        ],
      },
      {
        path: '/',
        element: <ProtectedRoute />,
        children: [
          {
            path: '',
            element: <DashboardPage />,
          },

        ],
      },
    ],
  },
];
