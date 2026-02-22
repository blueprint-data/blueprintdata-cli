import { createFileRoute } from '@tanstack/react-router';
import { ChatContainer } from '../../features/chat/components/ChatContainer';

export const Route = createFileRoute('/')({
  component: () => <ChatContainer />,
});
