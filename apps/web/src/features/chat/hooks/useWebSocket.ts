import { useState, useEffect, useRef, useCallback } from 'react';
import type { WSMessage } from '@blueprintdata/gateway';

interface UseWebSocketOptions {
  url: string;
  token: string | null;
  onMessage?: (message: WSMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  sendMessage: (message: WSMessage) => void;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWebSocket({
  url,
  token,
  onMessage,
  onOpen,
  onClose,
  onError,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!token || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    const wsUrl = `${url}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
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

  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    if (token) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, connect]);

  return {
    sendMessage,
    isConnected,
    isConnecting,
    error,
  };
}
