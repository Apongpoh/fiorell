import nodemailer from "nodemailer";

// Check if email credentials are configured
const isEmailConfigured = () => {
  return process.env.SMTP_USER && process.env.SMTP_PASS;
};

const transporter = isEmailConfigured()
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })
  : null;

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
) {
  const resetUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/reset-password?token=${resetToken}`;

  // If email is not configured, silently skip sending email
  if (!isEmailConfigured() || !transporter) {
    return; // Don't throw error in development
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Fiorell" <noreply@fiorell.com>',
    to: email,
    subject: "Reset Your Fiorell Password",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Fiorell</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            
            <p>Hi there,</p>
            
            <p>We received a request to reset your password for your Fiorell account. If you didn't make this request, you can safely ignore this email.</p>
            
            <p>To reset your password, click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${resetUrl}" style="color: #ec4899; word-break: break-all;">${resetUrl}</a>
            </p>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This link will expire in 1 hour for security reasons.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent by Fiorell. If you have any questions, please contact our support team.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Reset Your Fiorell Password
      
      Hi there,
      
      We received a request to reset your password for your Fiorell account. If you didn't make this request, you can safely ignore this email.
      
      To reset your password, visit this link:
      ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      If you have any questions, please contact our support team.
      
      Best regards,
      The Fiorell Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch {
    // Only throw in production if you want strict email requirements
    if (process.env.NODE_ENV === "production") {
      throw new Error("Failed to send password reset email");
    }
  }
}
