import { createFileRoute } from '@tanstack/react-router';
import { ChatContainer } from '../../features/chat/components/ChatContainer';

export const Route = createFileRoute('/chat/$sessionId')({
  component: () => {
    const { sessionId } = Route.useParams();
    return <ChatContainer sessionId={sessionId} />;
  },
});
