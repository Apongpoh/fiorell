import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // Get email provider from environment or default to smtp if SMTP config exists
      const emailProvider =
        process.env.EMAIL_PROVIDER ||
        (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
          ? "smtp"
          : null);

      // Support multiple email providers
      if (emailProvider === "gmail") {
        this.transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD, // Use App Password, not regular password
          },
        });
      } else if (emailProvider === "sendgrid") {
        this.transporter = nodemailer.createTransport({
          host: "smtp.sendgrid.net",
          port: 587,
          secure: false,
          auth: {
            user: "apikey",
            pass: process.env.SENDGRID_API_KEY,
          },
        });
      } else if (emailProvider === "smtp") {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        logger.warn(
          "Email service not configured. Set EMAIL_PROVIDER environment variable or provide SMTP credentials.",
          { action: "email_service_not_configured" }
        );
      }
    } catch (error) {
      logger.error("Failed to initialize email transporter", {
        action: "email_transporter_init_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return;
    }
  }

  public async sendEmail(emailData: EmailData): Promise<boolean> {
    if (!this.transporter) {
      console.log("Email transporter not configured");
      return false;
    }

    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || "noreply@fiorell.com",
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text || emailData.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
      };

      const result = await this.transporter.sendMail(mailOptions);
      logger.info("Email sent successfully", {
        metadata: { messageId: result.messageId },
      });
      return true;
    } catch (error) {
      logger.error("Failed to send email", {
        action: "email_send_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          to: emailData.to,
          subject: emailData.subject,
        },
      });
      return false;
    }
  }

  public async sendSupportNotification(data: {
    ticketId: string;
    ticketSubject: string;
    userName: string;
    userMessage: string;
    priority: string;
    userEmail?: string;
  }): Promise<boolean> {
    const supportEmails = (
      process.env.SUPPORT_EMAILS ||
      process.env.SUPPORT_EMAIL ||
      ""
    )
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (supportEmails.length === 0) {
      console.log("No support emails configured");
      return false;
    }

    const priorityColors = {
      high: "#dc2626",
      medium: "#d97706",
      low: "#2563eb",
    };

    const priorityColor =
      priorityColors[data.priority as keyof typeof priorityColors] || "#6b7280";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Support Message - ${data.ticketSubject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #ec4899, #be185d);
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 20px;
          }
          .ticket-info {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .info-row:last-child {
            margin-bottom: 0;
          }
          .label {
            font-weight: 600;
            color: #374151;
          }
          .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: white;
            background-color: ${priorityColor};
          }
          .message-box {
            background: white;
            border: 1px solid #e5e7eb;
            border-left: 4px solid #ec4899;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
          }
          .message-content {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.5;
          }
          .action-buttons {
            text-align: center;
            margin-top: 25px;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #ec4899;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 0 10px;
          }
          .btn:hover {
            background: #be185d;
          }
          .footer {
            background: #1f2937;
            color: #9ca3af;
            padding: 15px 20px;
            text-align: center;
            font-size: 12px;
          }
          .footer a {
            color: #ec4899;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🆘 New Support Message</h1>
          </div>
          
          <div class="content">
            <div class="ticket-info">
              <div class="info-row">
                <span class="label">Ticket:</span>
                <span>${data.ticketSubject}</span>
              </div>
              <div class="info-row">
                <span class="label">From:</span>
                <span>${data.userName}</span>
              </div>
              <div class="info-row">
                <span class="label">Priority:</span>
                <span class="priority-badge">${data.priority}</span>
              </div>
              <div class="info-row">
                <span class="label">Ticket ID:</span>
                <span>${data.ticketId}</span>
              </div>
              <div class="info-row">
                <span class="label">Time:</span>
                <span>${new Date().toLocaleString()}</span>
              </div>
            </div>
            
            <h3 style="margin-bottom: 10px; color: #1f2937;">Message:</h3>
            <div class="message-box">
              <div class="message-content">${data.userMessage}</div>
            </div>
            
            <div class="action-buttons">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/support/chat/${
      data.ticketId
    }" class="btn">
                View & Reply
              </a>
              <a href="${
                process.env.NEXT_PUBLIC_APP_URL
              }/admin/support" class="btn" style="background: #6b7280;">
                Dashboard
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>
              Fiorell Support System • 
              <a href="${
                process.env.NEXT_PUBLIC_APP_URL
              }/admin/support">Admin Dashboard</a>
            </p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    let successCount = 0;
    for (const email of supportEmails) {
      const success = await this.sendEmail({
        to: email,
        subject: `[${data.priority.toUpperCase()} PRIORITY] New Message - ${
          data.ticketSubject
        }`,
        html: emailHtml,
      });
      if (success) successCount++;
    }

    return successCount > 0;
  }

  public async sendNewTicketNotification(data: {
    ticketId: string;
    ticketSubject: string;
    userName: string;
    ticketType: string;
    priority: string;
    description: string;
  }): Promise<boolean> {
    const supportEmails = (
      process.env.SUPPORT_EMAILS ||
      process.env.SUPPORT_EMAIL ||
      ""
    )
      .split(",")
      .map((email) => email.trim())
      .filter((email) => email.length > 0);

    if (supportEmails.length === 0) {
      logger.info("No support emails configured", {
        action: "no_support_emails",
      });
      return false;
    }

    const priorityColors = {
      high: "#dc2626",
      medium: "#d97706",
      low: "#2563eb",
    };

    const priorityColor =
      priorityColors[data.priority as keyof typeof priorityColors] || "#6b7280";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Support Ticket - ${data.ticketSubject}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #374151;
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, #10b981, #059669);
            padding: 20px;
            text-align: center;
          }
          .header h1 {
            color: white;
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content {
            padding: 20px;
          }
          .ticket-info {
            background: #f3f4f6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .info-row:last-child {
            margin-bottom: 0;
          }
          .label {
            font-weight: 600;
            color: #374151;
          }
          .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            color: white;
            background-color: ${priorityColor};
          }
          .description-box {
            background: white;
            border: 1px solid #e5e7eb;
            border-left: 4px solid #10b981;
            border-radius: 6px;
            padding: 15px;
            margin: 15px 0;
          }
          .description-content {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 14px;
            line-height: 1.5;
          }
          .action-buttons {
            text-align: center;
            margin-top: 25px;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #10b981;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 0 10px;
          }
          .btn:hover {
            background: #059669;
          }
          .footer {
            background: #1f2937;
            color: #9ca3af;
            padding: 15px 20px;
            text-align: center;
            font-size: 12px;
          }
          .footer a {
            color: #10b981;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 New Support Ticket</h1>
          </div>
          
          <div class="content">
            <div class="ticket-info">
              <div class="info-row">
                <span class="label">Subject:</span>
                <span>${data.ticketSubject}</span>
              </div>
              <div class="info-row">
                <span class="label">From:</span>
                <span>${data.userName}</span>
              </div>
              <div class="info-row">
                <span class="label">Type:</span>
                <span style="text-transform: capitalize;">${
                  data.ticketType
                }</span>
              </div>
              <div class="info-row">
                <span class="label">Priority:</span>
                <span class="priority-badge">${data.priority}</span>
              </div>
              <div class="info-row">
                <span class="label">Ticket ID:</span>
                <span>${data.ticketId}</span>
              </div>
              <div class="info-row">
                <span class="label">Created:</span>
                <span>${new Date().toLocaleString()}</span>
              </div>
            </div>
            
            <h3 style="margin-bottom: 10px; color: #1f2937;">Description:</h3>
            <div class="description-box">
              <div class="description-content">${data.description}</div>
            </div>
            
            <div class="action-buttons">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/support/chat/${
      data.ticketId
    }" class="btn">
                View Ticket
              </a>
              <a href="${
                process.env.NEXT_PUBLIC_APP_URL
              }/admin/support" class="btn" style="background: #6b7280;">
                Dashboard
              </a>
            </div>
          </div>
          
          <div class="footer">
            <p>
              Fiorell Support System • 
              <a href="${
                process.env.NEXT_PUBLIC_APP_URL
              }/admin/support">Admin Dashboard</a>
            </p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    let successCount = 0;
    for (const email of supportEmails) {
      const success = await this.sendEmail({
        to: email,
        subject: `[NEW TICKET] ${
          data.ticketSubject
        } - ${data.priority.toUpperCase()} Priority`,
        html: emailHtml,
      });
      if (success) successCount++;
    }

    return successCount > 0;
  }
}

const emailService = new EmailService();
export default emailService;
