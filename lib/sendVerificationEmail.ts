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

export async function sendVerificationEmail(
  email: string,
  verificationCode: string
) {
  const verificationUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/verify-email?code=${verificationCode}&email=${encodeURIComponent(email)}`;

  // If email is not configured, log the verification info for development
  if (!isEmailConfigured() || !transporter) {
    console.log("\n=== EMAIL VERIFICATION (Development Mode) ===");
    console.log(`To: ${email}`);
    console.log(`Verification URL: ${verificationUrl}`);
    console.log(`Verification Code: ${verificationCode}`);
    console.log("=== Copy the verification URL above to verify email ===\n");
    return; // Don't throw error in development
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Fiorell" <noreply@fiorell.com>',
    to: email,
    subject: "Verify Your Fiorell Account",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Fiorell</h1>
            <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Welcome to Fiorell!</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            
            <p>Hi there!</p>
            
            <p>Thank you for joining Fiorell! To complete your registration and start connecting with amazing people, please verify your email address.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Verify Email Address</a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${verificationUrl}" style="color: #ec4899; word-break: break-all;">${verificationUrl}</a>
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Your verification code:</strong> <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${verificationCode}</code>
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              This verification link will expire in 24 hours for security reasons.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              If you didn't create a Fiorell account, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to Fiorell!
      
      Thank you for joining Fiorell! To complete your registration, please verify your email address.
      
      Verification Code: ${verificationCode}
      
      To verify your email, visit this link:
      ${verificationUrl}
      
      This verification link will expire in 24 hours for security reasons.
      
      If you didn't create a Fiorell account, you can safely ignore this email.
      
      Best regards,
      The Fiorell Team
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send verification email:", error);

    // In development, log the verification URL as fallback
    if (process.env.NODE_ENV !== "production") {
      console.log("\n=== EMAIL SEND FAILED - VERIFICATION INFO ===");
      console.log(`Verification URL: ${verificationUrl}`);
      console.log(`Verification Code: ${verificationCode}`);
      console.log("=== Use the URL above to verify email ===\n");
    }

    // Only throw in production if you want strict email requirements
    if (process.env.NODE_ENV === "production") {
      throw new Error("Failed to send verification email");
    }
  }
}
