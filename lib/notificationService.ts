import { apiRequest } from "./api";
import { logger } from "@/lib/logger";

interface NotificationData {
  senderName?: string;
  messagePreview?: string;
  matchUserName?: string;
  likerName?: string;
  viewerName?: string;
  chatId?: string;
  userId?: string;
}

export class NotificationService {
  // Send a match notification
  static async sendMatchNotification(
    recipientId: string,
    matchUserName: string
  ): Promise<boolean> {
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      if (!token) return false;

      await apiRequest("/push/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          type: "match",
          data: { matchUserName },
        }),
      });

      return true;
    } catch (error) {
      logger.error("Failed to send match notification", {
        action: "match_notification_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  // Send a message notification
  static async sendMessageNotification(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    chatId: string
  ): Promise<boolean> {
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      if (!token) return false;

      await apiRequest("/push/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          type: "message",
          data: { senderName, messagePreview, chatId },
        }),
      });

      return true;
    } catch (error) {
      logger.error("Failed to send message notification", {
        action: "message_notification_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  // Send a like notification
  static async sendLikeNotification(
    recipientId: string,
    likerName: string,
    likerId: string
  ): Promise<boolean> {
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      if (!token) return false;

      await apiRequest("/push/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          type: "like",
          data: { likerName, userId: likerId },
        }),
      });

      return true;
    } catch (error) {
      logger.error("Failed to send like notification", {
        action: "like_notification_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  // Send a profile view notification
  static async sendProfileViewNotification(
    recipientId: string,
    viewerName: string,
    viewerId: string
  ): Promise<boolean> {
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      if (!token) return false;

      await apiRequest("/push/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          type: "profile_view",
          data: { viewerName, userId: viewerId },
        }),
      });

      return true;
    } catch (error) {
      logger.error("Failed to send profile view notification", {
        action: "profile_view_notification_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }

  // Generic notification sender
  static async sendNotification(
    recipientId: string,
    type: "match" | "message" | "like" | "profile_view",
    data: NotificationData
  ): Promise<boolean> {
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      if (!token) return false;

      await apiRequest("/push/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipientId,
          type,
          data,
        }),
      });

      return true;
    } catch (error) {
      logger.error("Failed to send notification", {
        action: "notification_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return false;
    }
  }
}
