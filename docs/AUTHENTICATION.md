# Authentication System Documentation

## 📋 Overview

Fiorell's authentication system provides secure user registration, login, and account management with advanced security features including two-factor authentication (2FA) and email verification.

## 🔐 Core Authentication Features

### 1. User Registration
- **Email-based signup** with validation
- **Password strength requirements**
- **Automatic email verification**
- **Profile setup wizard**
- **Terms and privacy acceptance**

#### Registration Flow
```
1. User provides email/password
2. System validates input
3. Creates user account (inactive)
4. Sends verification email
5. User clicks verification link
6. Account activated
7. Redirected to profile setup
```

### 2. User Login
- **Email and password authentication**
- **JWT token generation**
- **Refresh token system**
- **Remember me functionality**
- **Login attempt tracking**

#### Login Process
```
1. User enters credentials
2. System validates against database
3. Generates JWT access token
4. Sets refresh token cookie
5. Returns user data and permissions
6. Redirects to dashboard
```

### 3. Two-Factor Authentication (2FA)
- **TOTP-based authentication**
- **QR code setup**
- **Recovery codes generation**
- **Backup verification methods**
- **2FA requirement for sensitive actions**

#### 2FA Setup Flow
```
1. User navigates to security settings
2. System generates secret key
3. Displays QR code for authenticator app
4. User scans QR code
5. Enters verification code
6. System validates and enables 2FA
7. Recovery codes generated and displayed
```

## 🛡️ Security Features

### Password Security
- **Bcrypt hashing** with salt rounds
- **Minimum 8 characters** requirement
- **Complexity validation** (uppercase, lowercase, numbers)
- **Password history prevention**
- **Secure password reset**

### Token Management
- **JWT access tokens** (15-minute expiry)
- **Refresh tokens** (7-day expiry)
- **Token blacklisting** on logout
- **Automatic token refresh**
- **Device tracking and management**

### Account Protection
- **Login attempt rate limiting**
- **Account lockout after failed attempts**
- **Email notifications for suspicious activity**
- **IP-based security monitoring**
- **Device verification**

## 📧 Email Verification System

### Verification Features
- **Email confirmation required** for new accounts
- **Resend verification** capability
- **Verification link expiry** (24 hours)
- **Custom email templates**
- **Delivery status tracking**

### Email Templates
- **Welcome email** with verification link
- **Password reset** instructions
- **Security alerts** for account changes
- **2FA setup** confirmation
- **Login notifications**

## 🔧 API Endpoints

### Authentication Routes
```
POST /api/auth/signup          - User registration
POST /api/auth/login           - User login
POST /api/auth/logout          - User logout
POST /api/auth/refresh         - Token refresh
POST /api/auth/verify-email    - Email verification
POST /api/auth/resend-verification - Resend verification email
```

### Password Management
```
POST /api/auth/forgot-password - Initiate password reset
POST /api/auth/reset-password  - Complete password reset
POST /api/auth/change-password - Change current password
```

### Two-Factor Authentication
```
POST /api/user/2fa/setup       - Begin 2FA setup
POST /api/user/2fa/verify      - Complete 2FA setup
POST /api/user/2fa/disable     - Disable 2FA
GET  /api/user/2fa/status      - Check 2FA status
```

## 🎯 User Experience Features

### Signup Process
1. **Email validation** in real-time
2. **Password strength indicator**
3. **Terms acceptance checkbox**
4. **Loading states** during submission
5. **Error handling** with clear messages
6. **Success confirmation** with next steps

### Login Experience
1. **Auto-focus** on email field
2. **Show/hide password** toggle
3. **Remember me** checkbox
4. **Forgot password** link
5. **2FA prompt** when enabled
6. **Loading indicators**

### Security Dashboard
- **Active sessions** management
- **Login history** with locations
- **2FA status** and management
- **Recovery codes** download
- **Security alerts** timeline
- **Password change** interface

## 🔒 Advanced Security Features

### Rate Limiting
```typescript
// Login attempts: 5 per 15 minutes
// Password reset: 3 per hour
// Email verification: 5 per hour
// 2FA attempts: 3 per 5 minutes
```

### Account Verification
- **Email verification** badge
- **Phone verification** (optional)
- **Identity verification** for premium features
- **Profile verification** with photo validation
- **Trust score** calculation

### Session Management
- **Multi-device support**
- **Session invalidation** on password change
- **Automatic logout** on inactivity
- **Concurrent session limits**
- **Device fingerprinting**

## 📱 Mobile & PWA Features

### Mobile Authentication
- **Touch ID/Face ID** support (planned)
- **Biometric authentication** integration
- **App-specific passwords**
- **Push notification** verification
- **Offline authentication** caching

### Progressive Web App
- **Service worker** for offline functionality
- **App install** prompts
- **Background sync** for auth state
- **Push notifications** for security alerts
- **Offline mode** handling

## 🛠️ Implementation Details

### JWT Token Structure
```json
{
  "userId": "user_id_here",
  "email": "user@example.com",
  "isVerified": true,
  "has2FA": false,
  "isAdmin": false,
  "iat": 1633024800,
  "exp": 1633025700
}
```

### Database Schema
```typescript
interface User {
  email: string;
  password: string; // bcrypt hashed
  isVerified: boolean;
  verificationToken?: string;
  verificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  twoFA?: {
    enabled: boolean;
    secret?: string;
    recoveryCodes?: string[];
  };
  loginAttempts: number;
  lockUntil?: Date;
  lastLogin: Date;
}
```

## 🔍 Monitoring & Analytics

### Security Metrics
- **Login success/failure rates**
- **2FA adoption rates**
- **Password reset frequency**
- **Account verification rates**
- **Security incident tracking**

### User Analytics
- **Registration conversion rates**
- **Email verification rates**
- **Login frequency patterns**
- **Device usage statistics**
- **Geographic login distribution**

## 🚨 Security Incident Response

### Breach Detection
- **Unusual login patterns** detection
- **Multiple failed login** alerts
- **Geolocation anomalies** monitoring
- **Account takeover** prevention
- **Automated security responses**

### Incident Handling
1. **Immediate account lockdown**
2. **User notification** via secure channels
3. **Password reset** requirement
4. **2FA enforcement**
5. **Security team** escalation
6. **Incident documentation**

## 📖 User Guides

### Setting Up 2FA
1. Go to Profile Settings → Security
2. Click "Enable Two-Factor Authentication"
3. Download an authenticator app (Google Authenticator, Authy)
4. Scan the QR code with your app
5. Enter the 6-digit verification code
6. Save your recovery codes securely
7. Click "Enable 2FA"

### Password Reset Process
1. Click "Forgot Password" on login page
2. Enter your email address
3. Check your email for reset link
4. Click the link (valid for 1 hour)
5. Enter your new password
6. Confirm the password
7. Log in with your new password

## 🔧 Configuration

### Environment Variables
```env
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
EMAIL_SERVICE_API_KEY=your_email_api_key
VERIFICATION_EMAIL_FROM=noreply@yourapp.com
FRONTEND_URL=https://yourapp.com
```

### Security Settings
```typescript
const authConfig = {
  passwordMinLength: 8,
  loginAttemptLimit: 5,
  lockoutDuration: 15, // minutes
  tokenExpiry: 15, // minutes
  refreshTokenExpiry: 7, // days
  verificationTokenExpiry: 24, // hours
  resetTokenExpiry: 1, // hour
};
```

---

This authentication system provides enterprise-grade security while maintaining an excellent user experience. All features are production-ready and thoroughly tested.