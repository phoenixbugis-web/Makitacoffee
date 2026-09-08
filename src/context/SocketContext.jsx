import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useBranding } from './BrandingContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Set());
  const { updateBranding } = useBranding();

  useEffect(() => {
    let reconnectTimeout = null;

    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      // When developing with Vite proxy, use /ws or port 3001 directly
      const wsUrl = `${protocol}//${host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setLastMessage(data);

            // Global handling for branding changes
            if (data.type === 'BRANDING_UPDATED') {
              updateBranding(data.payload);
            }

            // Notify all subscribed listeners
            listenersRef.current.forEach(listener => {
              try {
                listener(data);
              } catch (err) {
                console.error('Socket listener error:', err);
              }
            });
          } catch (e) {}
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          setConnected(false);
          ws.close();
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        reconnectTimeout = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const addListener = (callback) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  };

  return (
    <SocketContext.Provider value={{ connected, lastMessage, addListener }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
