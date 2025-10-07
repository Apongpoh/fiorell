# Subscription System Documentation

## 📋 Overview

Fiorell's subscription system provides a comprehensive premium experience with multiple tiers, flexible billing options, and seamless payment processing through Lemon Squeezy integration.

## 💎 Subscription Tiers

### Free Tier
**Core dating experience with essential features**

**Daily Limits:**
- **100 likes** per day
- **1 super like** per day
- **Basic discovery** filters only
- **Standard support** response times

**Features Included:**
- ✅ Profile creation and management
- ✅ Basic swipe and match functionality
- ✅ Text messaging with matches
- ✅ Basic filters (age, distance, gender)
- ✅ Photo uploads (up to 6 photos)
- ✅ Community guidelines support

### Premium Tier - $9.99/month
**Enhanced dating experience with advanced features**

**Daily Limits:**
- ✅ **Unlimited likes**
- ✅ **5 super likes** per day
- ✅ **1 profile boost** per week
- ✅ **Priority support** (24-hour response)

**Premium Features:**
- ✅ **See who liked you** - Grid view of all likes received
- ✅ **Advanced filters** - Height, education, lifestyle preferences
- ✅ **Read receipts** - See when messages are read
- ✅ **Rewind feature** - Undo accidental swipes (5 per day)
- ✅ **Ad-free experience** - No advertisements
- ✅ **Extended profile** - Up to 9 photos
- ✅ **Message before matching** - Send intro messages

### Premium Plus Tier - $19.99/month
**Ultimate dating experience with exclusive features**

**Daily Limits:**
- ✅ **Unlimited everything** - No daily restrictions
- ✅ **Unlimited super likes**
- ✅ **3 profile boosts** per week
- ✅ **VIP support** (4-hour response priority)

**Premium Plus Exclusive Features:**
- ✅ **Incognito mode** - Browse profiles privately
- ✅ **Travel mode** - Swipe in other cities before visiting
- ✅ **Super boost** - 100x visibility for 3 hours
- ✅ **Message priority** - Messages appear at top of recipient's list
- ✅ **Voice & video calling** - In-app calling features
- ✅ **Advanced analytics** - Detailed profile performance insights
- ✅ **Exclusive events** - Access to premium member events

### Annual Plans (17% Savings)
- **Premium Annual**: $99.99/year (saves $19.89)
- **Premium Plus Annual**: $199.99/year (saves $39.89)

## 🔄 Subscription Management

### Subscription Lifecycle
```typescript
interface SubscriptionStates {
  'active': 'Currently active subscription';
  'cancelled': 'Cancelled but still active until period end';
  'expired': 'Subscription has ended';
  'on_trial': 'Free trial period';
  'paused': 'Temporarily paused subscription';
  'past_due': 'Payment failed, grace period active';
}
```

### Billing Management
- **Automatic Renewal**: Subscriptions renew automatically
- **Grace Period**: 7-day grace period for failed payments
- **Proration**: Prorated billing for plan changes
- **Refund Policy**: 7-day full refund, then prorated refunds
- **Currency Support**: USD, EUR, GBP, CAD, AUD

### Plan Changes
- **Upgrade**: Immediate access to new features, prorated billing
- **Downgrade**: Features available until next billing cycle
- **Cancellation**: Access maintained until subscription period ends
- **Reactivation**: Easy reactivation with previous plan preferences

## 💳 Payment Integration

### Lemon Squeezy Integration
- **Secure Processing**: PCI-compliant payment processing
- **Multiple Payment Methods**: Credit cards, PayPal, Apple Pay, Google Pay
- **Global Coverage**: Support for 100+ countries
- **Tax Handling**: Automatic tax calculation and compliance
- **Fraud Protection**: Advanced fraud detection and prevention

### Checkout Experience
```typescript
interface CheckoutFlow {
  planSelection: 'User selects desired plan';
  priceDisplay: 'Clear pricing with taxes included';
  paymentMethod: 'Secure payment method selection';
  billingInfo: 'Billing address collection';
  confirmation: 'Order review and confirmation';
  processing: 'Secure payment processing';
  activation: 'Immediate feature activation';
}
```

### Payment Methods
- **Credit/Debit Cards**: Visa, Mastercard, American Express, Discover
- **Digital Wallets**: PayPal, Apple Pay, Google Pay
- **Bank Transfers**: Direct bank transfers in supported regions
- **Local Methods**: Regional payment methods (iDEAL, SEPA, etc.)
- **Cryptocurrency**: Bitcoin and major altcoins (planned)

## 🎯 Feature Gating System

### Access Control
```typescript
interface FeatureAccess {
  canSeeWhoLikedYou: boolean;
  canUseAdvancedFilters: boolean;
  canUseIncognitoMode: boolean;
  canMessageBeforeMatching: boolean;
  canUseTravelMode: boolean;
  canUseVoiceCalling: boolean;
  canUseVideoChat: boolean;
  dailyLikes: number;
  dailySuperLikes: number;
  weeklyBoosts: number;
}
```

### Grace Period System
**New User Benefits (First 7 Days):**
- ✅ **Enhanced limits**: 200 likes per day (vs standard 100)
- ✅ **Extended reach**: 2x profile visibility
- ✅ **Premium preview**: Limited access to premium filters
- ✅ **Super like bonus**: 3 super likes (vs standard 1)
- ✅ **Priority support**: Faster response times

### Feature Restrictions
- **Soft Restrictions**: Gentle prompts to upgrade with feature preview
- **Hard Restrictions**: Complete feature blocking with upgrade prompts
- **Usage Limits**: Daily/weekly limits with reset timers
- **Quality Gates**: Minimum profile completion for certain features

## 📊 Subscription Analytics

### User Metrics
- **Conversion Rates**: Free to premium conversion tracking
- **Churn Analysis**: Subscription cancellation patterns
- **Engagement Correlation**: Feature usage vs retention
- **Lifetime Value**: Customer lifetime value calculations
- **Satisfaction Scores**: Premium feature satisfaction ratings

### Business Metrics
- **Monthly Recurring Revenue (MRR)**: Subscription revenue tracking
- **Annual Recurring Revenue (ARR)**: Yearly revenue projections
- **Customer Acquisition Cost (CAC)**: Cost to acquire premium users
- **ARPU**: Average revenue per user
- **Cohort Analysis**: User behavior over time

### Premium Feature Usage
```typescript
interface FeatureUsageMetrics {
  seeWhoLikedYou: { dailyUsers: number; avgSessions: number };
  advancedFilters: { usageRate: number; filterPreferences: string[] };
  incognitoMode: { activeUsers: number; avgDuration: number };
  travelMode: { destinationsUsed: string[]; bookingRate: number };
  voiceCalling: { callMinutes: number; callSuccess: number };
}
```

## 🛠️ Technical Implementation

### Subscription Data Model
```typescript
interface Subscription {
  userId: string;
  planId: 'premium' | 'premium_plus' | 'premium_annual' | 'premium_plus_annual';
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  
  // Lemon Squeezy Integration
  lemonsqueezySubscriptionId: string;
  lemonsqueezyCustomerId: string;
  lemonsqueezyVariantId: string;
  
  // Billing Information
  billingCycle: 'monthly' | 'annual';
  priceAtPurchase: number;
  currency: string;
  
  // Usage Tracking
  features: string[];
  lastBillingDate: Date;
  nextBillingDate: Date;
  trialEnd?: Date;
}
```

### Webhook Handling
```typescript
// Lemon Squeezy webhook events
const webhookEvents = [
  'subscription_created',
  'subscription_updated', 
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_expired',
  'subscription_paused',
  'subscription_unpaused',
  'subscription_payment_success',
  'subscription_payment_failed',
  'order_created',
  'order_refunded'
];
```

### Payment Processing
1. **Checkout Initiation**: User selects plan and clicks subscribe
2. **Lemon Squeezy Redirect**: Secure redirect to payment processor
3. **Payment Processing**: User completes payment on Lemon Squeezy
4. **Webhook Notification**: Lemon Squeezy notifies our webhook endpoint
5. **Subscription Creation**: Create subscription record in database
6. **Feature Activation**: Immediately activate premium features
7. **Confirmation Email**: Send confirmation and receipt to user

## 🎯 User Experience

### Subscription Flow
1. **Feature Discovery**: Users encounter premium features naturally
2. **Value Demonstration**: Clear explanation of premium benefits
3. **Plan Comparison**: Side-by-side plan comparison
4. **Transparent Pricing**: All costs clearly displayed with taxes
5. **Secure Checkout**: Trusted payment processing
6. **Immediate Access**: Instant premium feature activation
7. **Welcome Experience**: Guided tour of new premium features

### Premium Prompts
```typescript
interface PremiumPrompt {
  trigger: 'feature_limit' | 'feature_access' | 'upgrade_suggestion';
  title: string;
  description: string;
  benefits: string[];
  ctaText: string;
  dismissible: boolean;
  frequency: 'once' | 'daily' | 'weekly' | 'always';
}
```

### Subscription Management UI
- **Current Plan Display**: Clear current subscription status
- **Usage Statistics**: Current period usage and limits
- **Billing History**: Complete payment and billing history
- **Plan Comparison**: Easy upgrade/downgrade options
- **Cancellation Flow**: Clear cancellation process with retention offers

## 🔧 API Endpoints

### Subscription Management
```
GET    /api/subscription          - Get user's subscription details
POST   /api/subscription/checkout - Create checkout session
POST   /api/subscription/cancel   - Cancel subscription
POST   /api/subscription/resume   - Resume cancelled subscription
GET    /api/subscription/plans    - Get available plans
```

### Feature Access
```
GET    /api/subscription/features - Get user's feature access
POST   /api/subscription/usage    - Track feature usage
GET    /api/subscription/limits   - Get current usage limits
POST   /api/subscription/check    - Check specific feature access
```

### Billing & Payments
```
GET    /api/subscription/billing  - Get billing information
POST   /api/subscription/update   - Update billing details
GET    /api/subscription/invoices - Get invoice history
POST   /api/subscription/webhook  - Handle payment webhooks
```

## 📱 Mobile Considerations

### App Store Integration
- **In-App Purchases**: iOS App Store subscription handling
- **Google Play Billing**: Android Play Store integration
- **Cross-Platform**: Consistent pricing across platforms
- **Platform Fees**: Account for platform commission rates
- **Subscription Transfer**: Move between web and mobile billing

### Mobile-Specific Features
- **Touch ID/Face ID**: Biometric authentication for payments
- **Apple Pay/Google Pay**: One-touch payment methods
- **Push Notifications**: Billing reminders and confirmations
- **Offline Access**: Cached premium features for offline use
- **Data Sync**: Subscription status sync across devices

## 🛡️ Security & Compliance

### Payment Security
- **PCI Compliance**: Full PCI DSS compliance through Lemon Squeezy
- **Encryption**: End-to-end encryption for payment data
- **Tokenization**: Credit card tokenization for security
- **Fraud Detection**: Real-time fraud monitoring
- **3D Secure**: Enhanced authentication for card payments

### Privacy Protection
- **GDPR Compliance**: Full European data protection compliance
- **CCPA Compliance**: California privacy law compliance
- **Data Minimization**: Collect only necessary billing information
- **Right to Deletion**: Complete data deletion on account closure
- **Audit Logs**: Complete subscription and billing audit trails

### Subscription Security
- **Account Verification**: Verify account ownership for plan changes
- **Billing Address Verification**: AVS checking for fraud prevention
- **Suspicious Activity**: Monitor for unusual subscription patterns
- **Refund Protection**: Prevent subscription abuse and chargebacks
- **Access Control**: Secure admin access to subscription management

## 📈 Growth Strategies

### Conversion Optimization
- **Free Trial**: 7-day free trial for Premium Plus
- **Limited Time Offers**: Seasonal discounts and promotions
- **Referral Program**: Discount for referring premium users
- **Win-back Campaigns**: Re-engage cancelled subscribers
- **Upgrade Incentives**: Targeted upgrade offers based on usage

### Retention Strategies
- **Engagement Monitoring**: Track feature usage and engagement
- **Proactive Support**: Reach out to at-risk subscribers
- **Feature Education**: Help users discover unused premium features
- **Satisfaction Surveys**: Regular feedback collection
- **Loyalty Rewards**: Long-term subscriber benefits

### Pricing Strategy
- **Value-Based Pricing**: Price based on perceived user value
- **Competitive Analysis**: Regular competitor pricing research
- **A/B Testing**: Test different pricing points and structures
- **Regional Pricing**: Adjust pricing for different markets
- **Student Discounts**: Special pricing for verified students

---

The subscription system is designed to provide clear value to users while generating sustainable revenue through a fair and transparent pricing model that scales with user engagement and success.