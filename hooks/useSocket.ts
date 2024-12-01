import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSocketReturn {
  isConnected: boolean;
  sendMessage: (data: Blob) => void;
  error: string | null;
  lastResponse: Blob | null;
  serverEvents: any[];
}

export function useSocket(): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<Blob | null>(null);
  const [serverEvents, setServerEvents] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('🟢 WebSocket connected to:', wsUrl);
      };

      ws.onclose = () => {
        setIsConnected(false);
        setError('Connection closed. Attempting to reconnect...');
        console.log('🔴 WebSocket disconnected, attempting reconnect in 3s');
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (event) => {
        setError('WebSocket error occurred');
        console.error('⚠️ WebSocket error:', event);
      };

      ws.onmessage = (event) => {
        if (event.data instanceof Blob) {
          setLastResponse(event.data);
        } else {
          try {
            const message = JSON.parse(event.data);
            if (message.error) {
              setError(message.error);
            } else if (message.type?.startsWith('server.')) {
              setServerEvents(prev => [...prev, message]);
              
              switch (message.type) {
                case 'server.audio':
                  if (message.audio) {
                    const audioBlob = new Blob([message.audio], { type: 'audio/wav' });
                    setLastResponse(audioBlob);
                  }
                  break;
                case 'server.error':
                  setError(message.error || 'Server error occurred');
                  break;
              }
            }
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        }
      };
    } catch (err) {
      setError('Failed to establish WebSocket connection');
      console.error('Connection error:', err);
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

  const sendMessage = useCallback((audioData: Blob | Uint8Array) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('❌ Cannot send: WebSocket is not connected');
      setError('WebSocket is not connected');
      return;
    }

    try {
      if (audioData instanceof Blob) {
        audioData.arrayBuffer().then(buffer => {
          console.log('📤 Sending audio blob:', {
            size: audioData.size,
            type: audioData.type,
          });
          wsRef.current?.send(buffer);
        });
      } else {
        // Handle Uint8Array (containing Int16Array data) directly
        console.log('📤 Sending audio data:', {
          size: audioData.length,
          type: 'Int16Array',
        });
        wsRef.current?.send(audioData);
      }
    } catch (err) {
      setError('Failed to send audio data');
      console.error('Send error:', err);
    }
  }, []);

  return { isConnected, sendMessage, error, lastResponse, serverEvents };
} 