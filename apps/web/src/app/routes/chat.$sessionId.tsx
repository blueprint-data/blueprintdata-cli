import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '../../features/auth/components/AuthGuard';
import { ChatContainer } from '../../features/chat/components/ChatContainer';

export const Route = createFileRoute('/chat/$sessionId')({
  component: () => {
    const { sessionId } = Route.useParams();
    return (
      <AuthGuard>
        <ChatContainer sessionId={sessionId} />
      </AuthGuard>
    );
  },
});
