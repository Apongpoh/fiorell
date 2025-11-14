interface ChatMessage {
  id: string;
  content: string;
  type: string;
  media?: {
    url?: string;
    key?: string;
    mimeType?: string;
    size?: number;
  };
  sender: {
    id: string;
    firstName: string;
    isCurrentUser: boolean;
  };
  readStatus?: {
    isRead: boolean;
    readAt?: string;
  };
  createdAt: string;
  disappearingDuration?: number;
  disappearsAt?: string;
}

type MessageListener = (msg: ChatMessage) => void;
const matchListeners: Record<string, Set<MessageListener>> = {};

export function publishMessage(matchId: string, message: ChatMessage) {
  const listeners = matchListeners[matchId];
  if (listeners) {
    for (const listener of listeners) {
      try {
        listener(message);
      } catch {}
    }
  }
}

export function addListener(matchId: string, listener: MessageListener) {
  if (!matchListeners[matchId]) matchListeners[matchId] = new Set();
  matchListeners[matchId].add(listener);
}

export function removeListener(matchId: string, listener: MessageListener) {
  matchListeners[matchId]?.delete(listener);
  if (matchListeners[matchId]?.size === 0) delete matchListeners[matchId];
}
