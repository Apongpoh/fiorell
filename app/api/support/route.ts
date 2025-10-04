import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import SupportTicket from "@/models/SupportTicket";
// import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
// const ses = new SESClient({ region: process.env.AWS_REGION });

// Create a support ticket and send an email notification (placeholder)
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const body = await req.json();
    const { subject, message } = body || {};

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    const ticket = await SupportTicket.create({
      userId,
      subject: String(subject),
      message: String(message),
    });

    // Email notification (commented out until email is configured):
    // const toAddress = process.env.SUPPORT_EMAIL_TO; // e.g., support@yourdomain.com
    // const fromAddress = process.env.SUPPORT_EMAIL_FROM; // verified SES sender
    // if (toAddress && fromAddress) {
    //   const emailParams = new SendEmailCommand({
    //     Destination: { ToAddresses: [toAddress] },
    //     Message: {
    //       Body: {
    //         Text: {
    //           Data: `New support ticket\n\nUser: ${userId}\nTicket ID: ${ticket._id}\nSubject: ${subject}\n\n${message}`,
    //         },
    //       },
    //       Subject: { Data: `Support Ticket: ${subject}` },
    //     },
    //     Source: fromAddress,
    //   });
    //   try {
    //     await ses.send(emailParams);
    //   } catch (e) {
    //     console.warn("Support email send failed (SES)", e);
    //   }
    // }

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      ((error as { message: string }).message ===
        "Authentication token is required" ||
        (error as { message: string }).message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get current user's tickets
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const tickets = await SupportTicket.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ tickets }, { status: 200 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      ((error as { message: string }).message ===
        "Authentication token is required" ||
        (error as { message: string }).message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
