import { createFileRoute } from '@tanstack/react-router';
import { LoginForm } from '../../features/auth/components/LoginForm';
import { useAuth } from '../../features/auth/hooks/useAuth';

export const Route = createFileRoute('/login')({
  component: () => {
    const { login } = useAuth();

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-muted-foreground">Sign in to access your analytics dashboard</p>
          </div>
          <LoginForm onSubmit={login} />
        </div>
      </div>
    );
  },
});
