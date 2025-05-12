import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { TenantProvider } from '../context/TenantContext';
import { AuthProvider } from '../context/AuthContext';
import { createAppRoutes } from '../routes';

// Create router outside of component render
const router = createBrowserRouter(createAppRoutes());

export function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <RouterProvider router={router} />
      </TenantProvider>
    </AuthProvider>
  );
}

export default App;
