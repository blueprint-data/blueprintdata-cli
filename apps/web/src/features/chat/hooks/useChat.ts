import { useState, useCallback } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useWebSocket } from './useWebSocket';
import type { WSMessage } from '@blueprintdata/gateway';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: {
    toolCall?: {
      name: string;
      arguments: Record<string, unknown>;
    };
    toolResult?: unknown;
    chartConfig?: Record<string, unknown>;
  };
}

export function useChat(sessionId?: string) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleMessage = useCallback((message: WSMessage) => {
    if (message.type === 'chat') {
      const payload = message.payload as { sessionId?: string; content?: string; role?: string };
      setMessages((prev) => [
        ...prev,
        {
          id: message.id,
          role: (payload.role as Message['role']) || 'assistant',
          content: payload.content || '',
        },
      ]);
      setIsLoading(false);
    } else if (message.type === 'error') {
      setMessages((prev) => [
        ...prev,
        {
          id: message.id,
          role: 'system',
          content: 'An error occurred. Please try again.',
        },
      ]);
      setIsLoading(false);
    }
  }, []);

  const gatewayUrl = process.env.VITE_GATEWAY_URL || 'ws://localhost:3001';

  const { sendMessage: sendWsMessage, isConnected } = useWebSocket({
    url: gatewayUrl,
    token,
    onMessage: handleMessage,
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (!isConnected) {
        console.error('WebSocket not connected');
        return;
      }

      // Add user message to local state
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      // Send message to server
      sendWsMessage({
        type: 'chat',
        id: Date.now().toString(),
        payload: {
          sessionId: sessionId || 'default',
          content,
        },
        timestamp: new Date().toISOString(),
      });
    },
    [isConnected, sendWsMessage, sessionId]
  );

  return {
    messages,
    isLoading,
    sendMessage,
    isConnected,
  };
}
