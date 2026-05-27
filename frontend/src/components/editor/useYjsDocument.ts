import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:1234';
const TOKEN_PROTOCOL_PREFIX = 'tracr.token.';

export interface RemoteUser {
  clientId: number;
  userId: number;
  pseudo: string;
  color: string;
}

interface YjsConnection {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
}

interface UseYjsDocumentOptions {
  documentId: number;
  initialContent: string;
  onInitialSync: () => void;
}

// WebSocket avec token auth dans sous-protocole
const buildAuthWebSocketClass = (token: string): typeof WebSocket => {
  class AuthWebSocket extends WebSocket {
    constructor(url: string | URL) {
      super(url, [`${TOKEN_PROTOCOL_PREFIX}${token}`]);
    }
  }
  return AuthWebSocket as unknown as typeof WebSocket;
};

const createConnection = (documentId: number): YjsConnection => {
  const ydoc = new Y.Doc();
  const token = localStorage.getItem('token') ?? '';
  const provider = new WebsocketProvider(
    WS_URL,
    `document_${documentId}`,
    ydoc,
    { WebSocketPolyfill: buildAuthWebSocketClass(token) },
  );
  return { ydoc, provider };
};

export const useYjsDocument = ({
  documentId,
  initialContent,
  onInitialSync,
}: UseYjsDocumentOptions): YjsConnection | null => {
  const [conn, setConn] = useState<YjsConnection | null>(null);

  useEffect(() => {
    const connection = createConnection(documentId);
    const { ydoc, provider } = connection;

    const handleSync = (synced: boolean) => {
      if (!synced) return;
      const fragment = ydoc.getXmlFragment('default');
      const isEmpty = fragment.length === 0;

      if (isEmpty && initialContent) {
        onInitialSync();
      }

    };

    provider.on('sync', handleSync);
    setConn(connection);

    return () => {
      provider.off('sync', handleSync);
      provider.destroy();
      ydoc.destroy();
    };
  }, [documentId]);

  return conn;
};

export const useRemoteUsers = (
  provider: WebsocketProvider | undefined,
  onChange: ((users: RemoteUser[]) => void) | undefined,
): void => {
  useEffect(() => {
    if (!provider) {
      return;
    }
    
    if (!onChange) {
      return;
    }

    const { awareness } = provider;
    const localClientId = awareness.clientID;

    const isRemoteClient = (clientId: number): boolean => {
      return clientId !== localClientId;
    };

    const hasValidUserState = (
      userState: { userId?: number; name?: string; color?: string } | undefined,
    ): boolean => {
      if (!userState) {
        return false;
      }
      return typeof userState.userId === 'number';
    };

    const computeRemoteUsers = (): RemoteUser[] => {
      const users: RemoteUser[] = [];
      const seenUserIds = new Set<number>();

      awareness.getStates().forEach((state, clientId) => {
        if (!isRemoteClient(clientId)) {
          return;
        }

        const userState = state?.user;
        if (!hasValidUserState(userState)) {
          return;
        }

        const userId = userState.userId as number;
        if (seenUserIds.has(userId)) {
          return;
        }
        seenUserIds.add(userId);

        users.push({
          clientId,
          userId,
          pseudo: userState.name ?? '?',
          color: userState.color ?? '#888',
        });
      });

      return users;
    };

    const handleChange = () => {
      const users = computeRemoteUsers();
      onChange(users);
    };

    handleChange();
    awareness.on('change', handleChange);

    return () => {
      awareness.off('change', handleChange);
      onChange([]);
    };
  }, [provider, onChange]);
};
