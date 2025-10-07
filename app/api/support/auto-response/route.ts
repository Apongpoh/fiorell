import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportMessage from "@/models/SupportMessage";
import SupportTicket from "@/models/SupportTicket";
import { logger } from "@/lib/logger";

// Auto-response templates
const AUTO_RESPONSES = {
  // Common greeting keywords
  greeting: {
    keywords: [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
    ],
    response:
      "Hello! Thank you for contacting our support team. We're here to help you with any questions or issues you may have. How can we assist you today?",
  },

  // Password reset
  password: {
    keywords: [
      "password",
      "forgot password",
      "reset password",
      "can't login",
      "cannot login",
    ],
    response:
      "I can help you with password issues! To reset your password:\n\n1. Go to the login page\n2. Click 'Forgot Password'\n3. Enter your email address\n4. Check your email for reset instructions\n\nIf you don't receive the email within 5 minutes, please check your spam folder. Let me know if you need further assistance!",
  },

  // Account issues
  account: {
    keywords: [
      "account",
      "profile",
      "verification",
      "verify email",
      "banned",
      "suspended",
    ],
    response:
      "I understand you're having account-related issues. Our support team will review your account and help resolve any problems. Common solutions include:\n\n• Email verification\n• Profile completion\n• Account security checks\n\nA support agent will be with you shortly to provide personalized assistance.",
  },

  // Matching issues
  matching: {
    keywords: [
      "matches",
      "matching",
      "no matches",
      "not matching",
      "swipe",
      "discovery",
    ],
    response:
      "Having trouble with matches? Here are some tips to improve your matching experience:\n\n• Complete your profile with photos and bio\n• Update your preferences in settings\n• Try adjusting your discovery radius\n• Make sure your profile is verified\n\nOur team can also review your account for any technical issues affecting your matching.",
  },

  // Technical issues
  technical: {
    keywords: [
      "bug",
      "error",
      "crash",
      "not working",
      "broken",
      "glitch",
      "loading",
    ],
    response:
      "Sorry to hear you're experiencing technical difficulties! To help us resolve this quickly:\n\n• Try closing and reopening the app\n• Check your internet connection\n• Update to the latest app version\n• Clear your browser cache (if using web)\n\nIf the issue persists, please provide details about what you were doing when the problem occurred. Our technical team will investigate further.",
  },

  // Payment issues
  payment: {
    keywords: [
      "payment",
      "subscription",
      "billing",
      "charge",
      "refund",
      "premium",
    ],
    response:
      "I can help with payment and subscription questions! Common issues include:\n\n• Subscription management\n• Billing inquiries\n• Refund requests\n• Premium feature access\n\nFor security reasons, our billing specialist will need to verify your account details. They'll be with you shortly to assist with your payment-related inquiry.",
  },

  // Safety and harassment
  safety: {
    keywords: [
      "harassment",
      "abuse",
      "report",
      "safety",
      "block",
      "inappropriate",
    ],
    response:
      "Your safety is our top priority. If you're experiencing harassment or inappropriate behavior:\n\n• Use the report feature on the user's profile\n• Block the user immediately\n• Save screenshots if possible\n\nOur safety team takes all reports seriously and will investigate promptly. A specialist will review your case and take appropriate action. Thank you for helping keep our community safe.",
  },

  // Thank you responses
  thanks: {
    keywords: ["thank you", "thanks", "appreciate", "helpful"],
    response:
      "You're very welcome! I'm glad I could help. If you have any other questions or need further assistance, please don't hesitate to reach out. Our support team is always here to help! 😊",
  },
};

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { content, ticketId } = await request.json();

    if (!content || !ticketId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find the ticket
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Analyze the message content
    const autoResponse = analyzeAndGenerateResponse(content.toLowerCase());

    if (autoResponse) {
      // Create auto-response message
      const responseMessage = new SupportMessage({
        ticketId,
        content: autoResponse,
        isFromSupport: true,
        supportAgentName: "Auto-Assistant",
        readByUser: false,
        readBySupport: true,
        isAutoResponse: true,
      });

      await responseMessage.save();

      // Update ticket status if it's newly created
      if (ticket.status === "open") {
        ticket.status = "in-progress";
        await ticket.save();
      }

      return NextResponse.json({
        autoResponse: {
          id: responseMessage._id,
          content: autoResponse,
          isFromSupport: true,
          supportAgentName: "Auto-Assistant",
          timestamp: responseMessage.createdAt,
          isAutoResponse: true,
        },
      });
    }

    return NextResponse.json({ autoResponse: null });
  } catch (error) {
    logger.error("Error generating auto-response:", {
      action: "generate_auto_response_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to generate auto-response" },
      { status: 500 }
    );
  }
}

function analyzeAndGenerateResponse(content: string): string | null {
  // Remove common words and punctuation for better keyword matching
  const cleanContent = content
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Check each category for keyword matches
  for (const config of Object.values(AUTO_RESPONSES)) {
    const hasKeyword = config.keywords.some((keyword) =>
      cleanContent.includes(keyword)
    );

    if (hasKeyword) {
      // Add contextual information for first-time users
      let response = config.response;

      // Add helpful closing
      if (
        !response.includes("support team") &&
        !response.includes("reach out")
      ) {
        response +=
          "\n\nIf you need additional help, our support team is standing by to assist you further!";
      }

      return response;
    }
  }

  // Default response for unmatched queries
  const defaultResponses = [
    "Thank you for contacting support! I've received your message and our team will review it shortly.",
    "Thanks for reaching out! A support agent will be with you soon to help with your inquiry.",
    "Hello! I've logged your request and our support team will respond as quickly as possible.",
  ];

  // Return a random default response
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Get auto-response settings
export async function GET() {
  try {
    return NextResponse.json({
      categories: Object.keys(AUTO_RESPONSES),
      enabled: true,
      settings: {
        responseDelay: 2000, // 2 seconds delay to seem more natural
        triggerOnFirstMessage: true,
        triggerOnKeywords: true,
      },
    });
  } catch (error) {
    logger.error("Error fetching auto-response settings:", {
      action: "get_auto_response_settings_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}
