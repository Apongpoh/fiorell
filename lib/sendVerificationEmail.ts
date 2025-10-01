import nodemailer from 'nodemailer';

export async function sendVerificationEmail(email: string, code: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const verificationUrl = `${process.env.FRONTEND_ORIGIN || 'https://yourfrontend.com'}/verify-email?code=${code}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@fiorell.com',
    to: email,
    subject: 'Verify your email address',
    html: `<p>Welcome to Fiorell!</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`
  });
}
