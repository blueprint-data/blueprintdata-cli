
import { RootRoute, Outlet } from '@tanstack/react-router';
import { AuthProvider } from '../../features/auth/context/AuthContext';

export const Route = new RootRoute({
  component: () => {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <Outlet />
        </div>
      </AuthProvider>
    );
  },
});
