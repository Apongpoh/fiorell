# Support System Setup Guide

This comprehensive support system includes admin dashboard, real-time notifications, email integration, and auto-responses. Follow this guide to set up all features.

## 🚀 Quick Start

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

### 2. Essential Settings

```bash
# Enable email notifications
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_PROVIDER=gmail  # or sendgrid, smtp

# Gmail setup (easiest for testing)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Support team emails
SUPPORT_EMAIL=support@yourdomain.com
SUPPORT_EMAILS=support@yourdomain.com,admin@yourdomain.com

# Your app URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📧 Email Configuration

### Option 1: Gmail (Recommended for Testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account Settings → Security
   - Under "2-Step Verification" → App passwords
   - Generate password for "Mail"
3. **Add to environment**:
   ```bash
   EMAIL_PROVIDER=gmail
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-16-char-app-password
   ```

### Option 2: SendGrid (Recommended for Production)

1. **Create SendGrid account** at sendgrid.com
2. **Generate API Key**:
   - Dashboard → Settings → API Keys
   - Create API Key with "Mail Send" permissions
3. **Add to environment**:
   ```bash
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=your-sendgrid-api-key
   ```

### Option 3: Custom SMTP

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password
```

## 👨‍💼 Admin Access Setup

### Create Admin User

Add `isAdmin: true` to any user in your MongoDB database:

```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { isAdmin: true } }
)
```

### Admin Routes

- **Dashboard**: `/admin/support`
- **Chat View**: `/admin/support/chat/[ticketId]`
- **API Endpoints**: `/api/admin/support/*`

## 🤖 Auto-Response Configuration

Auto-responses are enabled by default with these categories:

- **Greeting**: hello, hi, hey
- **Password**: password, reset, forgot
- **Account**: verification, banned, suspended
- **Matching**: matches, swipe, discovery
- **Technical**: bug, error, crash, not working
- **Payment**: payment, subscription, billing
- **Safety**: harassment, abuse, report
- **Thanks**: thank you, thanks, appreciate

### Customize Auto-Responses

Edit `/app/api/support/auto-response/route.ts`:

```typescript
const AUTO_RESPONSES = {
  custom_category: {
    keywords: ["custom", "keyword", "list"],
    response: "Your custom response message"
  }
}
```

## 🔔 Real-time Notifications

Current implementation logs to console. To add real-time features:

### Option 1: Socket.io

```bash
npm install socket.io socket.io-client
```

### Option 2: Pusher

```bash
npm install pusher pusher-js
```

### Option 3: Firebase

```bash
npm install firebase-admin
```

## 📊 Features Overview

### ✅ Implemented Features

1. **Admin Dashboard**
   - View all tickets with stats
   - Filter by status/priority
   - Quick reply modal
   - Real-time refresh

2. **Email Notifications**
   - New ticket alerts
   - New message alerts
   - Beautiful HTML templates
   - Multiple provider support

3. **Auto-Responses**
   - Smart keyword detection
   - Contextual responses
   - Immediate user feedback
   - Automatic ticket status updates

4. **Real-time Chat**
   - User-support conversations
   - Message status tracking
   - File attachments ready
   - Admin reply interface

### 🔜 Future Enhancements

1. **WebSocket Integration**
   - Real-time message delivery
   - Typing indicators
   - Online status

2. **Advanced Analytics**
   - Response time tracking
   - Customer satisfaction
   - Agent performance

3. **AI Integration**
   - Smart ticket routing
   - Sentiment analysis
   - Automated resolutions

## 🧪 Testing the System

### 1. Test User Flow

1. **Create Support Ticket**:
   - Go to `/help`
   - Click "Contact Support"
   - Fill form and submit

2. **Chat Interface**:
   - Go to `/support`
   - Click on ticket
   - Send messages
   - See auto-responses

### 2. Test Admin Flow

1. **Admin Dashboard**:
   - Go to `/admin/support`
   - View tickets and stats
   - Use filters

2. **Reply to Tickets**:
   - Click "Reply" or "View Chat"
   - Send responses
   - Update ticket status

### 3. Test Email Notifications

1. **Configure email properly**
2. **Create new ticket**
3. **Send message**
4. **Check support email**

## 🚨 Troubleshooting

### Email Not Sending

1. **Check environment variables**
2. **Verify email credentials**
3. **Check console logs**
4. **Test email configuration**

### Auto-responses Not Working

1. **Check API logs**
2. **Verify keyword matching**
3. **Test `/api/support/auto-response`**

### Admin Access Denied

1. **Verify `isAdmin: true` in database**
2. **Check JWT token**
3. **Confirm user authentication**

## 📈 Production Deployment

### Environment Variables

```bash
# Production settings
ENABLE_EMAIL_NOTIFICATIONS=true
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-production-key
SUPPORT_EMAILS=support@yourdomain.com,alerts@yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Security Considerations

1. **Use strong JWT secrets**
2. **Secure email credentials**
3. **Limit admin access**
4. **Monitor email usage**
5. **Rate limit APIs**

### Performance Optimization

1. **Database indexing**
2. **Email queue system**
3. **Caching strategies**
4. **Real-time connections**

## 🎯 Usage Examples

### Creating Tickets Programmatically

```javascript
const response = await fetch('/api/support', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    subject: 'Test Ticket',
    message: 'This is a test message',
    type: 'chat',
    priority: 'medium'
  })
})
```

### Admin API Usage

```javascript
// Get all tickets
const tickets = await fetch('/api/admin/support/tickets', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
})

// Reply to ticket
const reply = await fetch(`/api/admin/support/${ticketId}/reply`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    content: 'Thank you for contacting us...',
    agentName: 'Support Team',
    updateStatus: 'in-progress'
  })
})
```

## 🎉 You're All Set!

Your comprehensive support system is now ready! Users can create tickets, chat with support, receive auto-responses, and your support team will get email notifications with a powerful admin dashboard.

For questions or issues, check the troubleshooting section or review the API documentation in `/docs/API.md`.