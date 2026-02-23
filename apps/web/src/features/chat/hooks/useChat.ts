import { useState, useCallback, useEffect, useRef } from 'react';
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
    toolResult?: {
      success: boolean;
      result?: unknown;
      error?: string;
      media?: {
        mimeType: string;
        data: string;
        name?: string;
      };
    };
    chartConfig?: Record<string, unknown>;
  };
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  costPer1MInputTokens?: number;
  costPer1MOutputTokens?: number;
  speed?: string;
  capabilities?: string[];
  recommended?: string | null;
}

interface ModelsRequestMessage {
  type: 'models_request';
  id: string;
  payload: { sessionId?: string };
  timestamp: string;
}

interface ModelsResponseMessage {
  type: 'models_response';
  id: string;
  payload: {
    sessionId?: string;
    defaultModelId?: string;
    models?: ModelInfo[];
  };
  timestamp: string;
}

type GatewayMessage = WSMessage | ModelsRequestMessage | ModelsResponseMessage;

const isModelsResponse = (message: GatewayMessage): message is ModelsResponseMessage =>
  (message as { type?: string }).type === 'models_response';

export function useChat(sessionId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [gatewayUrl, setGatewayUrl] = useState<string | null>(null);
  const activeSessionId = sessionId || 'default';
  const storageKey = `blueprintdata.chat.${activeSessionId}`;
  const messagesRef = useRef<Message[]>([]);

  const handleMessage = useCallback(
    (message: GatewayMessage) => {
      const matchesSession = (payload?: { sessionId?: string }) =>
        !payload?.sessionId || payload.sessionId === activeSessionId;

      if (message.type === 'chat') {
        const payload = message.payload as { sessionId?: string; content?: string; role?: string };
        if (!matchesSession(payload)) {
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: message.id,
            role: (payload.role as Message['role']) || 'assistant',
            content: payload.content || '',
          },
        ]);
        setIsLoading(false);
      } else if (message.type === 'tool_call') {
        const payload = message.payload as {
          sessionId?: string;
          tool: string;
          arguments: Record<string, unknown>;
          callId: string;
        };
        if (!matchesSession(payload)) {
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: payload.callId || message.id,
            role: 'tool',
            content: '',
            metadata: {
              toolCall: {
                name: payload.tool,
                arguments: payload.arguments,
              },
            },
          },
        ]);
      } else if (message.type === 'tool_result') {
        const payload = message.payload as {
          sessionId?: string;
          callId: string;
          success: boolean;
          result?: unknown;
          error?: string;
          media?: {
            mimeType: string;
            data: string;
            name?: string;
          };
        };
        if (!matchesSession(payload)) {
          return;
        }
        setMessages((prev) => {
          const toolResult = {
            success: payload.success,
            result: payload.result,
            error: payload.error,
            media: payload.media,
          };
          const updated = prev.map((item) =>
            item.id === payload.callId
              ? {
                  ...item,
                  metadata: {
                    ...item.metadata,
                    toolResult,
                  },
                }
              : item
          );
          if (updated.some((item) => item.id === payload.callId)) {
            return updated;
          }
          return [
            ...prev,
            {
              id: payload.callId || message.id,
              role: 'tool',
              content: '',
              metadata: {
                toolResult,
              },
            },
          ];
        });
      } else if (message.type === 'error') {
        const payload = message.payload as { message?: string; sessionId?: string } | undefined;
        if (!matchesSession(payload)) {
          return;
        }
        console.error('Chat error received from gateway', payload);
        setMessages((prev) => [
          ...prev,
          {
            id: message.id,
            role: 'system',
            content: 'An error occurred. Please try again.',
          },
        ]);
        setIsLoading(false);
      } else if (isModelsResponse(message)) {
        const payload = message.payload;
        if (!matchesSession(payload)) {
          return;
        }
        const incomingModels = Array.isArray(payload.models) ? payload.models : [];
        setModels(incomingModels);
        if (payload.defaultModelId) {
          setDefaultModelId(payload.defaultModelId);
        }
        setSelectedModelId((prev) => prev ?? payload.defaultModelId ?? null);
      }
    },
    [activeSessionId]
  );

  useEffect(() => {
    let isActive = true;
    const fallbackUrl =
      (import.meta.env.VITE_GATEWAY_URL as string | undefined) || 'ws://localhost:8080';

    fetch('/api/config')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isActive) {
          return;
        }

        if (data && typeof data.gatewayUrl === 'string') {
          setGatewayUrl(data.gatewayUrl);
          return;
        }

        setGatewayUrl(fallbackUrl);
      })
      .catch(() => {
        if (isActive) {
          setGatewayUrl(fallbackUrl);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        setMessages([]);
        return;
      }

      const parsed = JSON.parse(stored) as Message[];
      if (Array.isArray(parsed)) {
        setMessages(parsed);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.warn('Failed to load chat history from localStorage', error);
      setMessages([]);
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch (error) {
      console.warn('Failed to persist chat history to localStorage', error);
    }
  }, [messages, storageKey]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const { sendMessage: sendWsMessage, isConnected } = useWebSocket<GatewayMessage>({
    url: gatewayUrl || '',
    token: null,
    onMessage: handleMessage,
  });

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    sendWsMessage({
      type: 'models_request',
      id: Date.now().toString(),
      payload: { sessionId: activeSessionId },
      timestamp: new Date().toISOString(),
    });
  }, [isConnected, sendWsMessage, activeSessionId]);

  const sendMessage = useCallback(
    (content: string) => {
      if (!isConnected) {
        console.error('WebSocket not connected');
        return;
      }

      const history = messagesRef.current
        .filter((message) => message.content && message.content.trim().length > 0)
        .map((message) => ({ role: message.role, content: message.content }))
        .slice(-20);

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
          modelId: selectedModelId || undefined,
          history,
        },
        timestamp: new Date().toISOString(),
      });
    },
    [isConnected, sendWsMessage, sessionId, selectedModelId]
  );

  const resetMessages = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Failed to clear chat history from localStorage', error);
    }
  }, [storageKey]);

  return {
    messages,
    isLoading,
    sendMessage,
    isConnected,
    resetMessages,
    models,
    defaultModelId,
    selectedModelId,
    setSelectedModelId,
  };
}
