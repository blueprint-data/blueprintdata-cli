import { RootRoute, Outlet } from '@tanstack/react-router';

export const Route = new RootRoute({
  component: () => {
    return (
      <div className="app-shell min-h-screen bg-background text-foreground">
        <Outlet />
      </div>
    );
  },
});
