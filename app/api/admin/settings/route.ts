import { NextRequest, NextResponse } from "next/server";
import connectToMongoDB from "@/lib/mongodb";
import jwt from "jsonwebtoken";
import User from "@/models/User";

// Admin verification function
async function verifyAdmin(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    await connectToMongoDB();
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isAdmin) return null;
    
    return user;
  } catch {
    return null;
  }
}

// System settings model (simplified - in production use a proper schema)
interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
  };
  security: {
    passwordMinLength: number;
    requireStrongPasswords: boolean;
    maxLoginAttempts: number;
    sessionTimeout: number;
    twoFactorRequired: boolean;
  };
  payments: {
    stripeEnabled: boolean;
    cryptoEnabled: boolean;
    supportedCryptos: string[];
    minimumPaymentAmount: number;
    paymentTimeout: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
  };
  moderation: {
    autoModerationEnabled: boolean;
    reportThreshold: number;
    autoSuspendEnabled: boolean;
    contentScanningEnabled: boolean;
  };
  api: {
    rateLimitEnabled: boolean;
    maxRequestsPerHour: number;
    apiKeyRequired: boolean;
    corsEnabled: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToMongoDB();

    // In production, these would be stored in a database
    // For now, return default settings
    const settings: SystemSettings = {
      general: {
        siteName: process.env.SITE_NAME || "Fiorell Dating",
        siteDescription: process.env.SITE_DESCRIPTION || "Find your perfect match with privacy-focused dating",
        maintenanceMode: process.env.MAINTENANCE_MODE === "true",
        registrationEnabled: process.env.REGISTRATION_ENABLED !== "false",
        emailVerificationRequired: process.env.EMAIL_VERIFICATION_REQUIRED !== "false",
      },
      security: {
        passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || "8"),
        requireStrongPasswords: process.env.REQUIRE_STRONG_PASSWORDS !== "false",
        maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || "5"),
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_HOURS || "24"),
        twoFactorRequired: process.env.TWO_FACTOR_REQUIRED === "true",
      },
      payments: {
        stripeEnabled: !!process.env.STRIPE_PUBLISHABLE_KEY,
        cryptoEnabled: process.env.CRYPTO_PAYMENTS_ENABLED !== "false",
        supportedCryptos: (process.env.SUPPORTED_CRYPTOS || "bitcoin,monero").split(","),
        minimumPaymentAmount: parseFloat(process.env.MINIMUM_PAYMENT_AMOUNT || "5.00"),
        paymentTimeout: parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || "15"),
      },
      notifications: {
        emailNotifications: process.env.EMAIL_NOTIFICATIONS_ENABLED !== "false",
        pushNotifications: process.env.PUSH_NOTIFICATIONS_ENABLED !== "false",
        smsNotifications: process.env.SMS_NOTIFICATIONS_ENABLED === "true",
        marketingEmails: process.env.MARKETING_EMAILS_ENABLED !== "false",
      },
      moderation: {
        autoModerationEnabled: process.env.AUTO_MODERATION_ENABLED !== "false",
        reportThreshold: parseInt(process.env.REPORT_THRESHOLD || "3"),
        autoSuspendEnabled: process.env.AUTO_SUSPEND_ENABLED === "true",
        contentScanningEnabled: process.env.CONTENT_SCANNING_ENABLED !== "false",
      },
      api: {
        rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== "false",
        maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR || "1000"),
        apiKeyRequired: process.env.API_KEY_REQUIRED !== "false",
        corsEnabled: process.env.CORS_ENABLED !== "false",
      },
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings: SystemSettings = await request.json();

    // Validate settings
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: "Invalid settings data" }, { status: 400 });
    }

    // Validate required fields
    if (!settings.general?.siteName) {
      return NextResponse.json({ error: "Site name is required" }, { status: 400 });
    }

    if (settings.security?.passwordMinLength < 6) {
      return NextResponse.json({ error: "Password minimum length must be at least 6" }, { status: 400 });
    }

    if (settings.payments?.minimumPaymentAmount < 0.01) {
      return NextResponse.json({ error: "Minimum payment amount must be at least $0.01" }, { status: 400 });
    }

    await connectToMongoDB();

    // In production, you would save these to a database
    // For demonstration, we'll simulate saving to environment variables
    // Note: In reality, you'd want to store these in a database and cache them

    const envUpdates = {
      SITE_NAME: settings.general.siteName,
      SITE_DESCRIPTION: settings.general.siteDescription,
      MAINTENANCE_MODE: settings.general.maintenanceMode.toString(),
      REGISTRATION_ENABLED: settings.general.registrationEnabled.toString(),
      EMAIL_VERIFICATION_REQUIRED: settings.general.emailVerificationRequired.toString(),
      
      PASSWORD_MIN_LENGTH: settings.security.passwordMinLength.toString(),
      REQUIRE_STRONG_PASSWORDS: settings.security.requireStrongPasswords.toString(),
      MAX_LOGIN_ATTEMPTS: settings.security.maxLoginAttempts.toString(),
      SESSION_TIMEOUT_HOURS: settings.security.sessionTimeout.toString(),
      TWO_FACTOR_REQUIRED: settings.security.twoFactorRequired.toString(),
      
      CRYPTO_PAYMENTS_ENABLED: settings.payments.cryptoEnabled.toString(),
      SUPPORTED_CRYPTOS: settings.payments.supportedCryptos.join(","),
      MINIMUM_PAYMENT_AMOUNT: settings.payments.minimumPaymentAmount.toString(),
      PAYMENT_TIMEOUT_MINUTES: settings.payments.paymentTimeout.toString(),
      
      EMAIL_NOTIFICATIONS_ENABLED: settings.notifications.emailNotifications.toString(),
      PUSH_NOTIFICATIONS_ENABLED: settings.notifications.pushNotifications.toString(),
      SMS_NOTIFICATIONS_ENABLED: settings.notifications.smsNotifications.toString(),
      MARKETING_EMAILS_ENABLED: settings.notifications.marketingEmails.toString(),
      
      AUTO_MODERATION_ENABLED: settings.moderation.autoModerationEnabled.toString(),
      REPORT_THRESHOLD: settings.moderation.reportThreshold.toString(),
      AUTO_SUSPEND_ENABLED: settings.moderation.autoSuspendEnabled.toString(),
      CONTENT_SCANNING_ENABLED: settings.moderation.contentScanningEnabled.toString(),
      
      RATE_LIMIT_ENABLED: settings.api.rateLimitEnabled.toString(),
      MAX_REQUESTS_PER_HOUR: settings.api.maxRequestsPerHour.toString(),
      API_KEY_REQUIRED: settings.api.apiKeyRequired.toString(),
      CORS_ENABLED: settings.api.corsEnabled.toString(),
    };

    // Log the settings update (in production, save to database)
    console.log("Settings updated by admin:", admin.email, {
      timestamp: new Date().toISOString(),
      changes: Object.keys(envUpdates),
    });

    // In a real application, you would:
    // 1. Save settings to a database table
    // 2. Invalidate relevant caches
    // 3. Potentially restart certain services if needed
    // 4. Log the change for audit purposes

    return NextResponse.json({ 
      success: true, 
      message: "Settings updated successfully",
      updatedFields: Object.keys(envUpdates).length
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}