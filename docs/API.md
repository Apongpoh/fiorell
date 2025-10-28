# API Reference Documentation

## 📋 Overview

Complete API reference for Fiorell's dating platform, including authentication, user management, matching, messaging, subscriptions, and admin endpoints.

## � Payment Reference System

Fiorell uses a conditional payment reference generation system that creates new payment references only when appropriate:

### Payment Reference Logic
- **New Payments**: Always generate fresh payment reference (PAY_ABC123_XYZ789)
- **Retry Payments**: Generate new payment reference linked to original failed/expired payment
- **Renewal Payments**: Generate new payment reference for subscription extension
- **Upgrade Payments**: Generate new payment reference for plan changes
- **Status Checks**: Use existing payment reference (no new reference created)

### Payment Types
- `new`: First-time subscription payment
- `retry`: Retry of failed/expired payment (creates new reference)
- `renewal`: Subscription renewal (creates new reference)  
- `upgrade`: Plan upgrade (creates new reference)

## �🔐 Authentication

### Base URL
```
Production: https://api.fiorell.com
Development: http://localhost:3000/api
```

### Authentication Headers
```typescript
// Required for all authenticated endpoints
headers: {
  'Authorization': 'Bearer {jwt_token}',
  'Content-Type': 'application/json'
}
```

### Authentication Endpoints

#### POST /api/auth/signup
**Register a new user account**

```typescript
// Request
interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date
  acceptTerms: boolean;
}

// Response
interface SignupResponse {
  success: boolean;
  message: string;
  user: {
    id: string;
    email: string;
    isVerified: boolean;
  };
  token?: string; // Only if email verification not required
}

// Example
POST /api/auth/signup
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1995-06-15",
  "acceptTerms": true
}
```

#### POST /api/auth/login
**Authenticate user and get access token**

```typescript
// Request
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Response
interface LoginResponse {
  success: boolean;
  user: UserProfile;
  token: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

// Example
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "rememberMe": true
}
```

#### POST /api/auth/verify-email
**Verify user email address**

```typescript
// Request
interface VerifyEmailRequest {
  token: string;
}

// Response
interface VerifyEmailResponse {
  success: boolean;
  message: string;
  token?: string; // JWT token for immediate login
}
```

#### POST /api/auth/forgot-password
**Initiate password reset process**

```typescript
// Request
interface ForgotPasswordRequest {
  email: string;
}

// Response
interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}
```

#### POST /api/auth/reset-password
**Reset password with token**

```typescript
// Request
interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Response
interface ResetPasswordResponse {
  success: boolean;
  message: string;
}
```

## 👤 User Management

### User Profile Endpoints

#### GET /api/user/profile
**Get current user's profile**

```typescript
// Response
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  bio: string;
  photos: Photo[];
  interests: string[];
  lifestyle: LifestylePreferences;
  location: LocationData;
  preferences: MatchingPreferences;
  subscription: SubscriptionInfo;
  stats: UserStats;
  verification: VerificationStatus;
  privacy: PrivacySettings;
}

// Example Response
{
  "id": "user123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "age": 28,
  "bio": "Love hiking and great coffee ☕",
  "photos": [
    {
      "id": "photo1",
      "url": "https://cdn.fiorell.com/photos/photo1.jpg",
      "isPrimary": true,
      "order": 0
    }
  ],
  "interests": ["hiking", "coffee", "photography"],
  "location": {
    "city": "San Francisco",
    "state": "CA",
    "coordinates": [-122.4194, 37.7749]
  }
}
```

#### PUT /api/user/profile
**Update user profile information**

```typescript
// Request
interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;
  occupation?: string;
  education?: string;
  height?: number;
  interests?: string[];
  lifestyle?: Partial<LifestylePreferences>;
}

// Response
interface UpdateProfileResponse {
  success: boolean;
  user: UserProfile;
}
```

#### GET /api/profile/:id
**View another user's profile**

```typescript
// Response - Same as UserProfile but with privacy filters applied
interface PublicProfile {
  id: string;
  firstName: string;
  age: number;
  bio: string;
  photos: Photo[];
  interests: string[];
  lifestyle: Partial<LifestylePreferences>;
  distance?: number; // Only if location sharing enabled
  verificationStatus: boolean;
  isOnline?: boolean;
}
```

### Photo Management

#### POST /api/user/photos
**Upload profile photos**

```typescript
// Request - Multipart form data
FormData: {
  photos: File[]; // Max 9 photos, 10MB each
  order?: number[]; // Photo order positions
}

// Response
interface PhotoUploadResponse {
  success: boolean;
  photos: Photo[];
  message: string;
}

// Photo Object
interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  order: number;
  isPrimary: boolean;
  isVerified: boolean;
  uploadedAt: string;
}
```

#### PUT /api/user/photos
**Reorder or update photos**

```typescript
// Request
interface UpdatePhotosRequest {
  photos: {
    id: string;
    order: number;
    isPrimary?: boolean;
  }[];
}

// Response
interface UpdatePhotosResponse {
  success: boolean;
  photos: Photo[];
}
```

#### DELETE /api/user/photos/:photoId
**Delete a specific photo**

```typescript
// Response
interface DeletePhotoResponse {
  success: boolean;
  message: string;
}
```

## 🎯 Discovery & Matching

### Discovery Endpoints

#### GET /api/discovery/matches
**Get discovery stack of potential matches**

```typescript
// Query Parameters
interface DiscoveryQuery {
  limit?: number; // Default: 20, Max: 50
  ageMin?: number;
  ageMax?: number;
  maxDistance?: number;
  gender?: 'men' | 'women' | 'everyone';
  interests?: string[]; // Filter by interests (Premium)
  lifestyle?: Partial<LifestylePreferences>; // Lifestyle filters (Premium)
}

// Response
interface DiscoveryResponse {
  profiles: PublicProfile[];
  hasMore: boolean;
  totalCount: number;
}

// Example
GET /api/discovery/matches?limit=10&ageMin=25&ageMax=35&maxDistance=50
```

#### PUT /api/discovery/preferences
**Update discovery preferences**

```typescript
// Request
interface DiscoveryPreferences {
  ageRange: { min: number; max: number };
  maxDistance: number;
  genderPreference: 'men' | 'women' | 'everyone';
  showMe: 'everyone' | 'recently_active' | 'new_users';
  dealBreakers?: string[]; // Premium feature
}

// Response
interface UpdatePreferencesResponse {
  success: boolean;
  preferences: DiscoveryPreferences;
}
```

### Interaction Endpoints

#### POST /api/interactions
**Record swipe interactions (like, pass, super like)**

```typescript
// Request
interface InteractionRequest {
  targetUserId: string;
  action: 'like' | 'pass' | 'super_like';
  sourceLocation?: 'discovery' | 'likes_grid' | 'top_picks';
}

// Response
interface InteractionResponse {
  success: boolean;
  isMatch: boolean;
  match?: MatchData; // Included if isMatch is true
  limitReached?: boolean;
  remainingLikes?: number;
}

// Match Data
interface MatchData {
  id: string;
  users: [string, string]; // User IDs
  createdAt: string;
  lastActivity: string;
  messageCount: number;
}
```

#### POST /api/interactions/undo
**Undo last interaction (Premium feature)**

```typescript
// Response
interface UndoResponse {
  success: boolean;
  undoneAction: {
    targetUserId: string;
    action: string;
    timestamp: string;
  };
  remainingUndos: number;
}
```

## 💬 Messaging

### Message Endpoints

#### GET /api/messages
**Get conversation messages**

```typescript
// Query Parameters
interface MessagesQuery {
  matchId: string;
  limit?: number; // Default: 50
  before?: string; // Message ID for pagination
  after?: string; // Message ID for pagination
}

// Response
interface MessagesResponse {
  messages: Message[];
  match: MatchData;
  hasMore: boolean;
}

// Message Object
interface Message {
  id: string;
  sender: string;
  recipient: string;
  match: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'location';
  media?: MediaAttachment;
  createdAt: string;
  readStatus: {
    isRead: boolean;
    readAt?: string;
  };
  disappearsAt?: string;
  isDeleted: boolean;
}
```

#### POST /api/messages
**Send a new message**

```typescript
// Request
interface SendMessageRequest {
  matchId: string;
  content: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'location';
  disappearingDuration?: number; // Seconds until auto-delete
  replyTo?: string; // Message ID for threading (Premium)
}

// Response
interface SendMessageResponse {
  success: boolean;
  message: Message;
}
```

#### POST /api/messages/media
**Send media message**

```typescript
// Request - Multipart form data
FormData: {
  file: File; // Image, video, or audio file
  matchId: string;
  disappearingDuration?: number;
}

// Response
interface MediaMessageResponse {
  success: boolean;
  message: Message;
}
```

#### POST /api/messages/read
**Mark messages as read**

```typescript
// Request
interface MarkReadRequest {
  matchId: string;
  messageIds?: string[]; // Specific messages, or all if omitted
}

// Response
interface MarkReadResponse {
  success: boolean;
  readCount: number;
}
```

#### DELETE /api/messages/:messageId
**Delete a message**

```typescript
// Request body
interface DeleteMessageRequest {
  deleteFor: 'me' | 'everyone';
}

// Response
interface DeleteMessageResponse {
  success: boolean;
  message: string;
}
```

### Real-time Messaging

#### GET /api/messages/subscribe
**Subscribe to real-time messages (Server-Sent Events)**

```typescript
// Query Parameters
interface SubscribeQuery {
  matchId: string;
  token: string; // JWT token for authentication
}

// Event Stream Response
interface MessageEvent {
  type: 'message' | 'read_receipt' | 'typing' | 'online_status';
  data: Message | ReadReceipt | TypingIndicator | OnlineStatus;
}

// JavaScript Example
const eventSource = new EventSource(
  `/api/messages/subscribe?matchId=${matchId}&token=${token}`
);

eventSource.onmessage = (event) => {
  const messageData = JSON.parse(event.data);
  // Handle new message
};
```

## 💎 Subscription & Premium

### Subscription Endpoints

#### GET /api/subscription
**Get user's subscription details**

```typescript
// Response
interface SubscriptionDetails {
  subscription: {
    hasPremium: boolean;
    hasPremiumPlus: boolean;
    isActive: boolean;
    planId?: string;
    expiresAt?: string;
    features: string[];
  };
  limits: {
    dailyLikes: number;
    dailySuperLikes: number;
    weeklyBoosts: number;
    canSeeWhoLikedYou: boolean;
    canUseAdvancedFilters: boolean;
    canUseIncognitoMode: boolean;
  };
  usage: {
    likesToday: number;
    superLikesToday: number;
    boostsThisWeek: number;
  };
}
```

#### POST /api/subscription/checkout
**Create subscription checkout session**

```typescript
// Request
interface CheckoutRequest {
  planId: 'premium' | 'premium_plus' | 'premium_annual' | 'premium_plus_annual';
  successUrl?: string;
  cancelUrl?: string;
}

// Response
interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}
```

#### GET /api/subscription/plans
**Get available subscription plans**

```typescript
// Response
interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  savings?: {
    amount: number;
    percentage: number;
  };
}

interface PlansResponse {
  plans: SubscriptionPlan[];
}
```

### Premium Feature Endpoints

#### GET /api/discovery/likes
**See who liked you (Premium feature)**

```typescript
// Response
interface LikesResponse {
  likes: {
    user: PublicProfile;
    likedAt: string;
    type: 'like' | 'super_like';
  }[];
  totalCount: number;
  hasMore: boolean;
}
```

#### POST /api/user/boost
**Activate profile boost (Premium feature)**

```typescript
// Request
interface BoostRequest {
  type: 'standard' | 'super'; // super for Premium Plus
  duration?: number; // Minutes, default based on type
}

// Response
interface BoostResponse {
  success: boolean;
  boost: {
    id: string;
    type: string;
    startsAt: string;
    expiresAt: string;
    multiplier: number;
  };
  remainingBoosts: number;
}
```

#### POST /api/user/incognito
**Toggle incognito mode (Premium Plus feature)**

```typescript
// Request
interface IncognitoRequest {
  enabled: boolean;
}

// Response
interface IncognitoResponse {
  success: boolean;
  incognitoMode: boolean;
  expiresAt?: string; // If temporary activation
}
```

## 📊 Analytics & Stats

### User Statistics

#### GET /api/stats
**Get user's statistics and insights**

```typescript
// Response
interface UserStats {
  today: {
    likes: number;
    views: number;
    matches: number;
  };
  totals: {
    receivedLikes: number;
    receivedSuperLikes: number;
    matches: number;
    profileViews: number;
  };
  active: {
    matches: number;
    unreadMessages: number;
  };
  insights?: { // Premium Plus feature
    bestPhotoIndex: number;
    peakActivityHours: number[];
    likeToMatchRate: number;
    averageConversationLength: number;
  };
}
```

## 🛠️ Admin API

### User Management (Admin Only)

#### GET /api/admin/users
**List and search users**

```typescript
// Query Parameters
interface AdminUsersQuery {
  search?: string; // Search by name, email, or ID
  status?: 'active' | 'banned' | 'suspended';
  subscription?: 'free' | 'premium' | 'premium_plus';
  verified?: boolean;
  page?: number;
  limit?: number;
}

// Response
interface AdminUsersResponse {
  users: AdminUserData[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AdminUserData {
  id: string;
  email: string;
  name: string;
  status: string;
  subscription: string;
  joinDate: string;
  lastActive: string;
  reportCount: number;
  isVerified: boolean;
}
```

#### POST /api/admin/users/:id/action
**Perform admin action on user**

```typescript
// Request
interface AdminActionRequest {
  action: 'ban' | 'suspend' | 'warn' | 'verify' | 'unban';
  reason: string;
  duration?: number; // For suspensions, in days
  notifyUser?: boolean;
}

// Response
interface AdminActionResponse {
  success: boolean;
  action: string;
  user: AdminUserData;
  auditLog: {
    id: string;
    action: string;
    reason: string;
    timestamp: string;
    adminId: string;
  };
}
```

### Content Moderation

#### GET /api/admin/moderation/queue
**Get content moderation queue**

```typescript
// Response
interface ModerationQueue {
  items: ModerationItem[];
  stats: {
    pending: number;
    reviewed: number;
    escalated: number;
  };
}

interface ModerationItem {
  id: string;
  type: 'profile' | 'photo' | 'message' | 'report';
  userId: string;
  content: any;
  reason: string;
  reportedBy?: string;
  createdAt: string;
  priority: 'low' | 'medium' | 'high';
}
```

#### POST /api/admin/moderation/review
**Review moderated content**

```typescript
// Request
interface ModerationReview {
  itemId: string;
  decision: 'approve' | 'reject' | 'escalate';
  reason: string;
  action?: 'remove_content' | 'warn_user' | 'suspend_user';
}

// Response
interface ModerationReviewResponse {
  success: boolean;
  decision: string;
  nextItem?: ModerationItem;
}
```

## 🔧 Error Handling

### Standard Error Response
```typescript
interface ErrorResponse {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}
```

### HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation errors
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

### Common Error Codes
```typescript
const ErrorCodes = {
  // Authentication
  INVALID_CREDENTIALS: 'auth/invalid-credentials',
  EMAIL_NOT_VERIFIED: 'auth/email-not-verified',
  ACCOUNT_SUSPENDED: 'auth/account-suspended',
  
  // Validation
  INVALID_EMAIL: 'validation/invalid-email',
  WEAK_PASSWORD: 'validation/weak-password',
  MISSING_REQUIRED_FIELD: 'validation/missing-field',
  
  // Subscription
  SUBSCRIPTION_REQUIRED: 'subscription/required',
  FEATURE_NOT_AVAILABLE: 'subscription/feature-unavailable',
  PAYMENT_FAILED: 'subscription/payment-failed',
  
  // Rate Limiting
  DAILY_LIMIT_REACHED: 'limits/daily-limit-reached',
  TOO_MANY_REQUESTS: 'limits/rate-limit-exceeded',
  
  // Content
  INAPPROPRIATE_CONTENT: 'content/inappropriate',
  FILE_TOO_LARGE: 'content/file-too-large',
  UNSUPPORTED_FORMAT: 'content/unsupported-format'
};
```

## 📱 Rate Limiting

### Rate Limit Headers
```typescript
// Response headers for rate-limited endpoints
{
  'X-RateLimit-Limit': '100',      // Requests per window
  'X-RateLimit-Remaining': '95',   // Remaining requests
  'X-RateLimit-Reset': '1633024800', // Reset timestamp
  'X-RateLimit-Window': '3600'     // Window duration in seconds
}
```

### Endpoint Rate Limits
```typescript
const RateLimits = {
  // Authentication
  '/api/auth/login': '5 requests per 15 minutes',
  '/api/auth/signup': '3 requests per hour',
  '/api/auth/forgot-password': '3 requests per hour',
  
  // Interactions
  '/api/interactions': '100 requests per day (free), unlimited (premium)',
  '/api/messages': '500 requests per hour',
  
  // Discovery
  '/api/discovery/matches': '50 requests per hour',
  
  // General API
  'default': '1000 requests per hour per authenticated user'
};
```

## 🛡️ Security Considerations

### Authentication Best Practices
- Always include JWT token in Authorization header
- Tokens expire after 15 minutes (access) and 7 days (refresh)
- Implement token refresh logic for long-running applications
- Store tokens securely (httpOnly cookies recommended for web)

### Data Privacy
- Personal information is filtered based on privacy settings
- Location data is approximate unless explicitly shared
- Profile views are logged for analytics (can be disabled in premium)
- Messages are encrypted in transit and at rest

### API Security
- All endpoints use HTTPS in production
- CORS headers properly configured
- Input validation on all endpoints
- SQL injection and XSS protection implemented
- File uploads scanned for malware

---

This API reference covers all major endpoints and features. For additional endpoints or detailed examples, refer to the specific feature documentation or contact the development team.