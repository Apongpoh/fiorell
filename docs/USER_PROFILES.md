# User Profiles Documentation

## 📋 Overview

Fiorell's user profile system enables users to create comprehensive, attractive profiles with photos, personal information, interests, and lifestyle preferences to facilitate meaningful connections.

## 👤 Core Profile Features

### 1. Basic Profile Information
- **Name and age** display
- **Location** with city/state
- **Bio/description** with character limit
- **Occupation** and education
- **Height** and other physical attributes
- **Relationship goals** and intentions

### 2. Photo Management
- **Up to 9 photos** per profile
- **Primary photo** designation
- **Photo verification** system
- **Automatic optimization** and resizing
- **EXIF data removal** for privacy
- **Inappropriate content** detection

### 3. Interests & Preferences
- **Predefined interest categories**:
  - Arts & Culture
  - Sports & Fitness
  - Technology
  - Music & Entertainment
  - Travel & Adventure
  - Food & Cooking
  - Books & Learning
  - Outdoor Activities
  - Social Causes
  - And many more...

### 4. Lifestyle Information
- **Drinking habits** (Never, Socially, Regularly, Prefer not to say)
- **Smoking preferences** (Never, Socially, Regularly, Prefer not to say)
- **Exercise frequency** (Never, Sometimes, Often, Daily)
- **Dietary preferences** (Omnivore, Vegetarian, Vegan, Other)
- **Pet preferences** (Love pets, Have pets, Allergic, No preference)
- **Religion** and spirituality
- **Political views** (optional)

## 🎯 Profile Completion System

### Completion Scoring
The system calculates profile completeness based on:
- **Basic information**: 30% weight
- **Photos uploaded**: 25% weight
- **Bio quality**: 20% weight
- **Interests selected**: 15% weight
- **Lifestyle details**: 10% weight

### Completion Benefits
- **Higher visibility** in discovery
- **Better match quality**
- **More profile views**
- **Increased like rate**
- **Premium feature access** (some features require 80% completion)

### Profile Breakdown Display
```typescript
interface ProfileBreakdown {
  photos: number;      // 0-1 based on photo count
  bio: number;         // 0-1 based on bio length and quality
  interests: number;   // 0-1 based on interest count
  lifestyle: number;   // 0-1 based on lifestyle fields filled
  verification: number; // 0-1 based on verification status
}
```

## 📸 Photo System

### Photo Requirements
- **Minimum resolution**: 800x800 pixels
- **Maximum file size**: 10MB per photo
- **Supported formats**: JPEG, PNG, WebP
- **Aspect ratio**: Flexible with auto-cropping
- **Face detection**: Primary photo must contain a face

### Photo Features
- **Drag and drop** reordering
- **Instant upload** with progress indicators
- **Automatic compression** and optimization
- **Multiple format** support
- **Bulk upload** capability
- **Smart cropping** suggestions

### Photo Verification
- **Manual review** process
- **AI-assisted** content moderation
- **Verification badges** for authentic photos
- **Rejection reasons** with improvement suggestions
- **Re-upload** capability

## 🔍 Profile Discovery

### Visibility Settings
- **Everyone**: Profile visible to all users
- **Mutual**: Only visible to mutual interests
- **Hidden**: Profile hidden from discovery (incognito mode)

### Profile Boost
- **3x visibility** for 30 minutes
- **Priority placement** in discovery stack
- **Usage limits**: 1 free boost per week, unlimited for Premium Plus
- **Analytics tracking** for boost effectiveness

### Verification Badge
- **Photo verification** through pose matching
- **Identity verification** for premium users
- **Verification process**:
  1. Upload selfie with specific pose
  2. AI compares to profile photos
  3. Manual review if needed
  4. Badge awarded upon approval

## 🎮 Profile Interactions

### Viewing Profiles
- **Swipe-style interface** with gesture support
- **Photo navigation** with dots indicator
- **Story-style progression** with auto-advance
- **Pause functionality** for detailed viewing
- **Quick actions** (like, super like, pass)

### Profile Information Display
- **Expandable sections** for detailed info
- **Interest tags** with color coding
- **Lifestyle icons** for quick scanning
- **Distance display** with location privacy
- **Last active** indicator

### Profile Actions
- **Like**: Standard positive interaction
- **Super Like**: Premium positive interaction with notification
- **Pass**: Skip to next profile
- **Report**: Flag inappropriate content
- **Block**: Prevent future interactions

## 📊 Profile Analytics

### Profile Performance Metrics
- **Profile views** count and trends
- **Like rate** percentage
- **Super like** received count
- **Match rate** from interactions
- **Photo performance** individual stats

### Insights Dashboard
- **Daily/weekly/monthly** view counts
- **Best performing photos**
- **Peak activity times**
- **Demographic breakdown** of viewers
- **Improvement suggestions**

## 🔒 Privacy & Safety

### Privacy Controls
- **Hide distance** option
- **Hide last active** setting
- **Incognito browsing** (Premium Plus)
- **Block contacts** from phone
- **Hide from search** engines

### Safety Features
- **Photo protection** from screenshots (mobile)
- **Watermarking** for premium photos
- **Report system** for inappropriate behavior
- **Block and unmatch** functionality
- **Safety tips** and guidelines

## 🛠️ API Endpoints

### Profile Management
```
GET    /api/user/profile      - Get user's profile
PUT    /api/user/profile      - Update profile information
GET    /api/profile/[id]      - View another user's profile
POST   /api/user/profile/view - Log profile view
```

### Photo Management
```
POST   /api/user/photos       - Upload photos
PUT    /api/user/photos       - Reorder photos
DELETE /api/user/photos/:id   - Delete photo
POST   /api/user/photos/verify - Submit for verification
```

### Interests & Lifestyle
```
PUT    /api/user/interests    - Update interests
PUT    /api/user/lifestyle    - Update lifestyle info
GET    /api/interests         - Get available interests
```

## 🎨 UI/UX Features

### Profile Creation Wizard
1. **Welcome screen** with progress indicator
2. **Basic information** collection
3. **Photo upload** with guidance
4. **Interest selection** with search
5. **Lifestyle preferences**
6. **Bio writing** with tips
7. **Review and publish**

### Profile Editing
- **Inline editing** for quick changes
- **Section-by-section** updates
- **Preview mode** to see changes
- **Unsaved changes** warning
- **Auto-save** drafts

### Mobile Optimizations
- **Touch-friendly** interfaces
- **Gesture navigation** for photos
- **Optimized layouts** for small screens
- **Fast loading** with image optimization
- **Offline editing** with sync

## 📱 Advanced Features

### AI-Powered Suggestions
- **Bio writing** assistance
- **Interest recommendations** based on behavior
- **Photo optimization** tips
- **Lifestyle compatibility** insights
- **Profile improvement** suggestions

### Social Integration
- **Instagram integration** for photo import
- **Spotify** music preferences
- **Facebook interests** import (optional)
- **LinkedIn education** verification
- **Social proof** badges

### Personality Insights
- **Personality quiz** integration
- **MBTI type** display
- **Astrological sign** (optional)
- **Love language** preferences
- **Attachment style** insights

## 🔧 Technical Implementation

### Profile Data Model
```typescript
interface UserProfile {
  userId: string;
  firstName: string;
  lastName: string;
  age: number;
  bio: string;
  occupation: string;
  education: string;
  height: number;
  location: {
    city: string;
    state: string;
    coordinates: [number, number];
  };
  photos: Photo[];
  interests: string[];
  lifestyle: LifestylePreferences;
  preferences: MatchingPreferences;
  verification: VerificationStatus;
  privacy: PrivacySettings;
  stats: ProfileStats;
}
```

### Photo Processing Pipeline
1. **Upload validation** (size, format, content)
2. **EXIF data removal** for privacy
3. **Image optimization** and compression
4. **Multiple size generation** (thumbnail, medium, full)
5. **Content moderation** screening
6. **Storage** in AWS S3 with CDN
7. **Database record** creation

### Profile Matching Algorithm
- **Interest overlap** scoring (30% weight)
- **Lifestyle compatibility** (25% weight)
- **Geographic proximity** (20% weight)
- **Age preference** alignment (15% weight)
- **Activity level** similarity (10% weight)

## 📈 Performance Optimizations

### Image Optimization
- **WebP format** for modern browsers
- **Progressive JPEG** fallback
- **Lazy loading** for photo galleries
- **CDN delivery** for global performance
- **Responsive images** for different screen sizes

### Data Caching
- **Profile data** cached for 5 minutes
- **Photo URLs** cached for 1 hour
- **Interest lists** cached for 24 hours
- **Location data** cached for 1 hour
- **Stats updates** batched every 15 minutes

## 📖 User Guidelines

### Creating an Attractive Profile
1. **Use high-quality photos** with good lighting
2. **Show your face clearly** in the primary photo
3. **Include variety** in your photo selection
4. **Write an engaging bio** that shows personality
5. **Select relevant interests** honestly
6. **Complete all sections** for better visibility
7. **Keep information current** and accurate

### Photo Best Practices
- **Smile genuinely** in at least one photo
- **Include full body** shots
- **Show hobbies** and interests
- **Avoid group photos** as primary
- **Use recent photos** (within 2 years)
- **Professional quality** preferred
- **Natural lighting** works best

### Bio Writing Tips
- **Be authentic** and genuine
- **Show humor** if it's natural
- **Mention specific interests** and hobbies
- **State relationship goals** clearly
- **Avoid negativity** and complaints
- **Keep it concise** but informative
- **Include conversation starters**

---

The profile system is designed to help users present their best authentic selves while providing the matching algorithm with rich data to create meaningful connections.