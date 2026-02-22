import { useState, useEffect, useRef, useCallback } from 'react';
import type { WSMessage } from '@blueprintdata/gateway';

interface UseWebSocketOptions<TMessage> {
  url: string;
  token?: string | null;
  onMessage?: (message: TMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn<TMessage> {
  sendMessage: (message: TMessage) => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWebSocket<TMessage = WSMessage>({
  url,
  token,
  onMessage,
  onOpen,
  onClose,
  onError,
}: UseWebSocketOptions<TMessage>): UseWebSocketReturn<TMessage> {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!url || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    const wsUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as TMessage;
        onMessage?.(message);
      } catch {
        console.error('Failed to parse WebSocket message:', event.data);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsConnecting(false);
      onClose?.();

      // Attempt to reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (event) => {
      setError('WebSocket error occurred');
      setIsConnecting(false);
      onError?.(event);
    };

    wsRef.current = ws;
  }, [url, token, onMessage, onOpen, onClose, onError]);

  const sendMessage = useCallback((message: TMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    sendMessage,
    isConnected,
    isConnecting,
    error,
  };
}
