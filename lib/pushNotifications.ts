import webpush from "web-push";

// Configure web-push
const vapidKeys = {
  publicKey:
    process.env.VAPID_PUBLIC_KEY ||
    "BNJzMfUKLCF3PNf8ZLqbBx4e_w4kNTkEyIZCYRHfY0FVgF8FwPqzA8pG7tX3NnLJKFvHw3e9qN6FkG8kHdxoMrw",
  privateKey:
    process.env.VAPID_PRIVATE_KEY ||
    "GZR8FTwJvY3zF4Q2XrKPBdV9fA8eT1hQqC5mR7wE3nU",
};

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:support@fiorell.com",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: Record<string, unknown>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Send push notification to a single subscription
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 3600, // Time to live: 1 hour
      urgency: "normal",
    });
    return true;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return false;
  }
}

// Send push notification to multiple subscriptions
export async function sendPushNotificationToUser(
  subscriptions: PushSubscription[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const results = await Promise.allSettled(
    subscriptions.map((subscription) =>
      sendPushNotification(subscription, payload)
    )
  );

  const sent = results.filter(
    (result) => result.status === "fulfilled" && result.value
  ).length;
  const failed = results.length - sent;

  return { sent, failed };
}

// Create notification payloads for different types
export const createNotificationPayload = {
  newMatch: (matchUserName: string): PushNotificationPayload => ({
    title: "🎉 New Match!",
    body: `You matched with ${matchUserName}! Start chatting now.`,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "new-match",
    data: {
      type: "match",
      action: "open_matches",
    },
    actions: [
      {
        action: "view_match",
        title: "View Match",
        icon: "/icons/heart.svg",
      },
      {
        action: "send_message",
        title: "Send Message",
        icon: "/icons/message.svg",
      },
    ],
    requireInteraction: true,
  }),

  newMessage: (
    senderName: string,
    messagePreview: string
  ): PushNotificationPayload => ({
    title: `💬 ${senderName}`,
    body: messagePreview,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "new-message",
    data: {
      type: "message",
      action: "open_chat",
    },
    actions: [
      {
        action: "reply",
        title: "Reply",
        icon: "/icons/reply.svg",
      },
      {
        action: "view_chat",
        title: "View Chat",
        icon: "/icons/eye.svg",
      },
    ],
  }),

  newLike: (likerName: string): PushNotificationPayload => ({
    title: "❤️ Someone likes you!",
    body: `${likerName} liked your profile. Like them back to match!`,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "new-like",
    data: {
      type: "like",
      action: "open_discovery",
    },
    actions: [
      {
        action: "view_profile",
        title: "View Profile",
        icon: "/icons/user.svg",
      },
    ],
  }),

  profileView: (viewerName: string): PushNotificationPayload => ({
    title: "👀 Profile View",
    body: `${viewerName} viewed your profile.`,
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: "profile-view",
    data: {
      type: "profile_view",
      action: "open_profile",
    },
    silent: true,
  }),
};

export { vapidKeys };
