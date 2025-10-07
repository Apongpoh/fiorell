# Database Schema Documentation

## 📋 Overview

Fiorell uses MongoDB as its primary database with a well-structured schema designed for scalability, performance, and data integrity. This document covers all database models, relationships, and indexing strategies.

## 🗄️ Database Architecture

### Database Design Principles
- **Document-based**: Leveraging MongoDB's flexible document structure
- **Denormalization**: Strategic denormalization for read performance
- **Indexing**: Comprehensive indexing for query optimization
- **Relationships**: Mix of embedded documents and references
- **Versioning**: Schema versioning for backward compatibility

### Connection Configuration
```typescript
// MongoDB connection setup
const mongoConfig = {
  uri: process.env.MONGODB_URI,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};
```

## 👤 User Model

### User Schema
```typescript
interface IUser extends Document {
  // Basic Information
  email: string;
  password: string; // bcrypt hashed
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'non-binary' | 'other';
  
  // Profile Information
  bio: string;
  occupation: string;
  education: string;
  height: number; // in centimeters
  
  // Location
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
    city: string;
    state: string;
    country: string;
    lastUpdated: Date;
  };
  
  // Photos
  photos: Array<{
    id: string;
    url: string;
    thumbnailUrl: string;
    key: string; // S3 key
    order: number;
    isPrimary: boolean;
    isVerified: boolean;
    uploadedAt: Date;
  }>;
  
  // Interests (predefined categories)
  interests: string[];
  
  // Lifestyle Preferences
  lifestyle: {
    drinking: 'never' | 'socially' | 'regularly' | 'prefer_not_to_say';
    smoking: 'never' | 'socially' | 'regularly' | 'prefer_not_to_say';
    exercise: 'never' | 'sometimes' | 'often' | 'daily';
    diet: 'omnivore' | 'vegetarian' | 'vegan' | 'other';
    pets: 'love' | 'have' | 'allergic' | 'no_preference';
    religion: string;
    politics: 'liberal' | 'moderate' | 'conservative' | 'other' | 'prefer_not_to_say';
  };
  
  // Matching Preferences
  preferences: {
    ageRange: { min: number; max: number };
    maxDistance: number; // in kilometers
    genderPreference: 'men' | 'women' | 'everyone';
    dealBreakers: string[]; // Lifestyle preferences that are deal breakers
  };
  
  // Privacy Settings
  privacy: {
    showDistance: boolean;
    showLastActive: boolean;
    onlineStatus: 'everyone' | 'mutual' | 'hidden';
    incognitoMode: boolean;
    incognitoModeUpdatedAt: Date;
    blockUnmatchedMessages: boolean;
  };
  
  // Subscription Information
  subscription: {
    type: 'free' | 'premium' | 'premium_plus';
    expiresAt: Date;
    features: string[];
  };
  
  // Statistics
  stats: {
    totalLikesReceived: number;
    totalSuperLikesReceived: number;
    totalMatches: number;
    profileViews: number;
    lastStatsUpdate: Date;
  };
  
  // Account Status
  isActive: boolean;
  lastSeen: Date;
  isAdmin: boolean;
  
  // Two-Factor Authentication
  twoFA: {
    enabled: boolean;
    secret: string;
    tempSecret: string;
    verified: boolean;
    recoveryCodes: string[];
    enabledAt: Date;
    disabledAt: Date;
  };
  
  // Verification
  verification: {
    isVerified: boolean;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    isIdentityVerified: boolean;
    verifiedAt: Date;
    verificationMethod: string;
  };
  
  // Password Reset
  resetPasswordToken: string;
  resetPasswordExpires: Date;
  
  // Email Verification
  emailVerificationToken: string;
  emailVerificationExpires: Date;
  
  // Notification Settings
  notificationSettings: {
    matches: { push: boolean; email: boolean; sound: boolean };
    messages: { push: boolean; email: boolean; sound: boolean };
    likes: { push: boolean; email: boolean; sound: boolean };
    views: { push: boolean; email: boolean; sound: boolean };
    quietHours: {
      enabled: boolean;
      startTime: string; // HH:mm format
      endTime: string;
    };
  };
  
  // Push Subscriptions
  pushSubscriptions: Array<{
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
    userAgent: string;
    createdAt: Date;
  }>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### User Indexes
```typescript
// Compound indexes for efficient queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ 'location.coordinates': '2dsphere' }); // Geospatial queries
userSchema.index({ isActive: 1, lastSeen: -1 }); // Active user queries
userSchema.index({ 'subscription.type': 1, 'subscription.expiresAt': 1 });
userSchema.index({ interests: 1 }); // Interest-based matching
userSchema.index({ createdAt: -1 }); // New user discovery
userSchema.index({ 'verification.isVerified': 1 }); // Verified users
```

## 💕 Interaction Model

### Interaction Schema
```typescript
interface IInteraction extends Document {
  userId: Types.ObjectId; // User who performed the action
  targetUserId: Types.ObjectId; // User who received the action
  action: 'like' | 'pass' | 'super_like' | 'block' | 'report';
  
  // Match Information
  isMatch: boolean;
  matchId: Types.ObjectId; // Reference to Match document if applicable
  
  // Metadata
  sourceLocation: 'discovery' | 'likes_grid' | 'top_picks' | 'search';
  deviceInfo: {
    platform: string;
    userAgent: string;
    ipAddress: string;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Interaction Indexes
```typescript
// Indexes for efficient interaction queries
interactionSchema.index({ userId: 1, createdAt: -1 });
interactionSchema.index({ targetUserId: 1, action: 1 });
interactionSchema.index({ userId: 1, targetUserId: 1 }, { unique: true }); // Prevent duplicate interactions
interactionSchema.index({ isMatch: 1, createdAt: -1 }); // Recent matches
interactionSchema.index({ action: 1, createdAt: -1 }); // Action-based queries
```

## 🤝 Match Model

### Match Schema
```typescript
interface IMatch extends Document {
  users: [Types.ObjectId, Types.ObjectId]; // The two matched users
  
  // Match Details
  matchedAt: Date;
  isActive: boolean;
  lastActivity: Date;
  
  // Message Information
  lastMessage: {
    content: string;
    sender: Types.ObjectId;
    sentAt: Date;
  };
  messageCount: number;
  
  // Premium Features
  disappearingMessageDuration: number; // seconds, 0 = disabled
  
  // Status
  unmatchedBy: Types.ObjectId; // User who unmatched, if applicable
  unmatchedAt: Date;
  reason: string; // Unmatch reason
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Match Indexes
```typescript
// Indexes for match queries
matchSchema.index({ users: 1 }); // Find matches for specific users
matchSchema.index({ isActive: 1, lastActivity: -1 }); // Active matches by recent activity
matchSchema.index({ matchedAt: -1 }); // Recent matches
matchSchema.index({ 'users.0': 1, 'users.1': 1 }, { unique: true }); // Prevent duplicate matches
```

## 💬 Message Model

### Message Schema
```typescript
interface IMessage extends Document {
  sender: Types.ObjectId;
  recipient: Types.ObjectId;
  match: Types.ObjectId; // Reference to Match document
  
  // Content
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'location';
  
  // Media Attachment
  media: {
    url: string;
    key: string; // S3 key
    mimeType: string;
    size: number; // File size in bytes
    dimensions: {
      width: number;
      height: number;
    };
    duration: number; // For audio/video in seconds
    thumbnail: string; // Thumbnail URL for videos
  };
  
  // Status
  readStatus: {
    isRead: boolean;
    readAt: Date;
  };
  isDeleted: boolean;
  deletedBy: Types.ObjectId[]; // Users who deleted this message
  
  // Disappearing Messages
  disappearsAt: Date;
  disappearingDuration: number; // seconds
  
  // Editing
  editedAt: Date;
  editHistory: string[]; // Previous versions of the message
  
  // Reactions (Premium feature)
  reactions: Array<{
    userId: Types.ObjectId;
    emoji: string;
    createdAt: Date;
  }>;
  
  // Threading (Premium Plus feature)
  replyTo: Types.ObjectId; // Message ID this is replying to
  threadMessages: Types.ObjectId[]; // Child messages in thread
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Message Indexes
```typescript
// Indexes for message queries
messageSchema.index({ match: 1, createdAt: -1 }); // Messages in a conversation
messageSchema.index({ recipient: 1, 'readStatus.isRead': 1 }); // Unread messages
messageSchema.index({ sender: 1, createdAt: -1 }); // User's sent messages
messageSchema.index({ disappearsAt: 1 }); // TTL index for disappearing messages
messageSchema.index({ isDeleted: 1, createdAt: -1 }); // Filter deleted messages
```

## 💳 Subscription Model

### Subscription Schema
```typescript
interface ISubscription extends Document {
  userId: Types.ObjectId;
  planId: 'premium' | 'premium_plus' | 'premium_annual' | 'premium_plus_annual';
  
  // Status
  status: 'active' | 'cancelled' | 'expired' | 'on_trial' | 'paused' | 'past_due';
  
  // Billing Periods
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  
  // Lemon Squeezy Integration
  lemonsqueezySubscriptionId: string;
  lemonsqueezyCustomerId: string;
  lemonsqueezyVariantId: string;
  lemonsqueezyOrderId: string;
  
  // Pricing
  price: number; // Price at purchase time
  currency: string;
  billingCycle: 'monthly' | 'annual';
  
  // Trial
  trialStart: Date;
  trialEnd: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Subscription Indexes
```typescript
// Indexes for subscription queries
subscriptionSchema.index({ userId: 1 }, { unique: true });
subscriptionSchema.index({ status: 1, currentPeriodEnd: 1 }); // Active subscriptions
subscriptionSchema.index({ lemonsqueezySubscriptionId: 1 }, { unique: true });
subscriptionSchema.index({ currentPeriodEnd: 1 }); // Expiring subscriptions
```

## 💰 Payment Model

### Payment Schema
```typescript
interface IPayment extends Document {
  userId: Types.ObjectId;
  subscriptionId: Types.ObjectId;
  
  // Lemon Squeezy Details
  lemonsqueezyOrderId: string;
  lemonsqueezySubscriptionId: string;
  lemonsqueezyVariantId: string;
  lemonsqueezyCustomerId: string;
  
  // Payment Information
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial_refund';
  paymentMethod: string;
  
  // Product Details
  productName: string;
  planId: string;
  
  // Billing Information
  billingEmail: string;
  billingName: string;
  billingAddress: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  
  // Dates
  paidAt: Date;
  refundedAt: Date;
  
  // Tax Information
  taxAmount: number;
  taxRate: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Payment Indexes
```typescript
// Indexes for payment queries
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ lemonsqueezyOrderId: 1 }, { unique: true });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ subscriptionId: 1 });
```

## 🎫 Support Ticket Model

### Support Ticket Schema
```typescript
interface ISupportTicket extends Document {
  userId: Types.ObjectId;
  
  // Ticket Information
  subject: string;
  type: 'technical' | 'billing' | 'account' | 'safety' | 'feature' | 'other';
  status: 'open' | 'closed' | 'pending' | 'in-progress';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // Content
  description: string;
  category: string;
  tags: string[];
  
  // Assignment
  assignedTo: Types.ObjectId; // Admin user ID
  assignedAt: Date;
  
  // Resolution
  resolution: string;
  resolvedAt: Date;
  resolvedBy: Types.ObjectId;
  
  // User Feedback
  satisfactionRating: number; // 1-5 stars
  feedback: string;
  
  // Internal Notes
  internalNotes: Array<{
    note: string;
    adminId: Types.ObjectId;
    createdAt: Date;
  }>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastResponseAt: Date;
}
```

### Support Message Model
```typescript
interface ISupportMessage extends Document {
  ticketId: Types.ObjectId;
  sender: Types.ObjectId;
  isFromSupport: boolean;
  
  // Content
  content: string;
  type: 'message' | 'note' | 'status_change';
  
  // Status
  readByUser: boolean;
  readBySupport: boolean;
  readAt: Date;
  
  // Auto-Response
  isAutoResponse: boolean;
  autoResponseTrigger: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

## 📊 Analytics Models

### Profile View Model
```typescript
interface IProfileView extends Document {
  viewerId: Types.ObjectId; // User who viewed the profile
  targetUserId: Types.ObjectId; // User whose profile was viewed
  
  // View Context
  source: 'discovery' | 'likes_grid' | 'search' | 'match_profile';
  duration: number; // Time spent viewing in seconds
  
  // Device Information
  deviceInfo: {
    platform: string;
    userAgent: string;
    screenSize: string;
  };
  
  // Location (approximate)
  location: {
    city: string;
    country: string;
  };
  
  // Timestamps
  createdAt: Date;
}
```

### Rate Limit Model
```typescript
interface IRateLimit extends Document {
  userId: Types.ObjectId;
  action: 'like' | 'super_like' | 'message' | 'view_profile' | 'boost';
  
  // Limits
  count: number;
  limit: number;
  windowStart: Date;
  windowEnd: Date;
  
  // Reset Information
  resetsAt: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Boost Model
```typescript
interface IBoost extends Document {
  userId: Types.ObjectId;
  type: 'standard' | 'super';
  
  // Timing
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  
  // Multiplier
  visibilityMultiplier: number; // 3x for standard, 100x for super
  
  // Results
  profileViews: number;
  likesReceived: number;
  superLikesReceived: number;
  matchesCreated: number;
  
  // Status
  isActive: boolean;
  completedAt: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔗 Model Relationships

### Relationship Diagram
```
User (1) ←→ (many) Interaction
User (1) ←→ (many) Match (through users array)
User (1) ←→ (many) Message (as sender/recipient)
User (1) ←→ (1) Subscription
User (1) ←→ (many) Payment
User (1) ←→ (many) SupportTicket
User (1) ←→ (many) ProfileView (as viewer/target)
User (1) ←→ (many) RateLimit
User (1) ←→ (many) Boost

Match (1) ←→ (many) Message
SupportTicket (1) ←→ (many) SupportMessage
```

### Embedded vs Referenced Data

#### Embedded Documents
- **User.photos**: Small, frequently accessed with user profile
- **User.location**: Always needed with user data
- **User.preferences**: Tightly coupled with user
- **Message.media**: Specific to individual messages

#### Referenced Documents
- **Interactions**: Large volume, queried independently
- **Messages**: Large volume, paginated access
- **Subscriptions**: Separate business logic
- **Analytics data**: Historical data, different access patterns

## 🚀 Performance Optimizations

### Database Optimizations

#### Indexing Strategy
```typescript
// Compound indexes for common query patterns
db.users.createIndex({ isActive: 1, 'location.coordinates': '2dsphere', lastSeen: -1 });
db.interactions.createIndex({ userId: 1, action: 1, createdAt: -1 });
db.messages.createIndex({ match: 1, createdAt: -1, isDeleted: 1 });
db.matches.createIndex({ users: 1, isActive: 1, lastActivity: -1 });

// TTL indexes for automatic data cleanup
db.rateLimits.createIndex({ resetsAt: 1 }, { expireAfterSeconds: 0 });
db.boosts.createIndex({ endTime: 1 }, { expireAfterSeconds: 3600 }); // 1 hour after boost ends
db.messages.createIndex({ disappearsAt: 1 }, { expireAfterSeconds: 0 }); // Disappearing messages
```

#### Query Optimization
```typescript
// Use projection to limit returned fields
const user = await User.findById(userId)
  .select('firstName photos interests location')
  .lean(); // Use lean() for read-only queries

// Use aggregation pipelines for complex queries
const nearbyUsers = await User.aggregate([
  {
    $geoNear: {
      near: userLocation,
      distanceField: 'distance',
      maxDistance: maxDistanceMeters,
      spherical: true
    }
  },
  {
    $match: {
      isActive: true,
      _id: { $ne: currentUserId }
    }
  },
  {
    $project: {
      firstName: 1,
      photos: { $slice: ['$photos', 1] }, // Only first photo
      interests: 1,
      distance: 1
    }
  },
  {
    $limit: 20
  }
]);
```

### Data Archiving Strategy
```typescript
// Archive old inactive data
const archiveOldData = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  // Archive old profile views
  await ProfileView.deleteMany({
    createdAt: { $lt: sixMonthsAgo }
  });
  
  // Archive old rate limit records
  await RateLimit.deleteMany({
    resetsAt: { $lt: new Date() }
  });
  
  // Archive completed boosts
  await Boost.deleteMany({
    endTime: { $lt: sixMonthsAgo },
    isActive: false
  });
};
```

## 🔒 Data Security & Privacy

### Data Encryption
```typescript
// Sensitive fields encryption
const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
    // Hashed with bcrypt before saving
  },
  twoFA: {
    secret: {
      type: String,
      // Encrypted before storage
    }
  }
});

// Pre-save middleware for encryption
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});
```

### Data Retention Policies
```typescript
const retentionPolicies = {
  messages: '2 years after match deletion',
  profileViews: '6 months',
  rateLimits: 'Real-time cleanup via TTL',
  boosts: '1 month after completion',
  supportTickets: '3 years for compliance',
  auditLogs: '7 years for security',
  userAccounts: 'Immediate deletion on request (GDPR)',
  paymentRecords: '7 years for tax compliance'
};
```

### GDPR Compliance
```typescript
// User data export function
const exportUserData = async (userId: string) => {
  const userData = {
    profile: await User.findById(userId).lean(),
    interactions: await Interaction.find({ userId }).lean(),
    messages: await Message.find({ 
      $or: [{ sender: userId }, { recipient: userId }] 
    }).lean(),
    payments: await Payment.find({ userId }).lean(),
    supportTickets: await SupportTicket.find({ userId }).lean()
  };
  
  return userData;
};

// User data deletion function
const deleteUserData = async (userId: string) => {
  // Delete or anonymize user data across all collections
  await User.findByIdAndDelete(userId);
  await Interaction.deleteMany({ 
    $or: [{ userId }, { targetUserId: userId }] 
  });
  await Message.updateMany(
    { $or: [{ sender: userId }, { recipient: userId }] },
    { content: '[deleted]', isDeleted: true }
  );
  // Continue for all related collections...
};
```

---

This database schema is designed for scalability, performance, and compliance while maintaining data integrity and supporting all features of the dating platform.