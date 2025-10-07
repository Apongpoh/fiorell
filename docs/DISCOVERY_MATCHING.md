# Discovery & Matching System Documentation

## 📋 Overview

Fiorell's discovery and matching system uses advanced algorithms to help users find compatible matches through intelligent card-based swiping, sophisticated filtering, and compatibility scoring.

## 🎯 Core Discovery Features

### 1. Swipe Mechanics
- **Like** (right swipe): Express interest in a profile
- **Pass** (left swipe): Skip to the next profile without interest
- **Super Like** (up swipe): Premium interaction with notification to recipient
- **Gesture Recognition**: Touch, mouse, and keyboard support
- **Visual Feedback**: Real-time swipe direction indicators
- **Undo Functionality**: Premium feature to reverse last action

### 2. Match Creation
- **Mutual Like Detection**: Automatic match when both users like each other
- **Super Like Matches**: Instant notification when someone super likes you
- **Match Notifications**: Real-time alerts for new matches
- **Match Expiration**: Matches expire after 30 days of inactivity (Premium: no expiration)
- **Match Revival**: Premium feature to reconnect expired matches

### 3. Discovery Stack
- **Smart Ordering**: Profiles prioritized by compatibility score
- **Fresh Content**: New users shown first to encourage engagement
- **Distance Filtering**: Location-based profile ordering
- **Activity Recency**: Recently active users prioritized
- **Boost Integration**: Boosted profiles appear at top of stack

## 🧠 Matching Algorithm

### Compatibility Scoring
The algorithm calculates compatibility based on multiple factors:

#### Interest Overlap (30% weight)
```typescript
const interestScore = (commonInterests.length / totalUniqueInterests.length) * 100;
```

#### Lifestyle Compatibility (25% weight)
- **Drinking/Smoking habits** alignment
- **Exercise frequency** compatibility
- **Dietary preferences** matching
- **Pet preferences** alignment
- **Religious compatibility** (if specified)

#### Geographic Proximity (20% weight)
```typescript
const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
```

#### Age Preference Alignment (15% weight)
- **User's age** within potential match's preferred range
- **Potential match's age** within user's preferred range
- **Age gap tolerance** consideration

#### Activity Level Similarity (10% weight)
- **App usage patterns** alignment
- **Response time** compatibility
- **Online activity** synchronization

### Advanced Filtering

#### Basic Filters (Free)
- **Age range**: 18-100 years
- **Distance**: 1-100 miles
- **Gender preference**: Men, Women, Everyone

#### Premium Filters
- **Height range**: Specific height preferences
- **Education level**: High school, College, Graduate degree
- **Exercise frequency**: Never to Daily
- **Drinking habits**: Detailed preferences
- **Smoking habits**: Specific tolerance levels
- **Have/want children**: Family planning alignment
- **Religion**: Specific religious preferences
- **Political views**: Political alignment filtering

#### Premium Plus Filters
- **Income range**: Economic compatibility
- **Relationship type**: Casual, Serious, Marriage
- **Languages spoken**: Multilingual preferences
- **Zodiac sign**: Astrological compatibility
- **Personality type**: MBTI-based matching
- **Industry/Career**: Professional alignment

## 🌍 Location Features

### Geospatial Discovery
- **GPS Integration**: Real-time location updates
- **Distance Calculation**: Accurate distance measurements
- **Location Privacy**: Hide exact location, show only city
- **Location History**: Track movement patterns for better matching

### Travel Mode (Premium Plus)
- **Destination Swiping**: Swipe in other cities before traveling
- **Travel Notifications**: Alert matches when visiting their city
- **Global Discovery**: Remove distance restrictions temporarily
- **Travel Timeline**: Plan and announce upcoming trips

### Location Settings
- **Auto-Update**: GPS-based location updates
- **Manual Override**: Set specific city/location
- **Hide Distance**: Privacy option to hide exact distance
- **Location Sharing**: Share real-time location with matches (optional)

## 🎮 User Interaction Features

### Swipe Interface
- **Card Stack**: Tinder-style card interface
- **Photo Navigation**: Tap left/right to view different photos
- **Story Mode**: Auto-advancing photo slideshow
- **Pause Functionality**: Tap and hold to pause auto-advance
- **Quick Actions**: Floating action buttons for like/pass/super like

### Gesture Controls
- **Touch Swipes**: Mobile gesture recognition
- **Mouse Dragging**: Desktop drag-and-drop
- **Keyboard Shortcuts**: Arrow keys and space bar
- **Haptic Feedback**: Mobile vibration on interactions
- **Visual Feedback**: Real-time swipe direction indicators

### Discovery Preferences
```typescript
interface DiscoveryPreferences {
  ageRange: { min: number; max: number };
  maxDistance: number;
  genderPreference: 'men' | 'women' | 'everyone';
  showMe: 'everyone' | 'recently_active' | 'new_users';
  dealBreakers: string[]; // Automatic filters
}
```

## 📊 Discovery Analytics

### User Statistics
- **Daily swipes**: Track user engagement
- **Like ratio**: Percentage of right swipes
- **Match rate**: Matches per 100 swipes
- **Super like usage**: Premium feature utilization
- **Discovery sessions**: Daily/weekly activity patterns

### Profile Performance
- **Views received**: How often your profile is shown
- **Like rate**: Percentage of viewers who like you
- **Super likes received**: Premium interactions received
- **Match conversion**: Matches from total interactions
- **Peak times**: When you receive most likes

### Algorithm Optimization
- **Engagement tracking**: User interaction patterns
- **Success metrics**: Match quality and longevity
- **Feedback integration**: User satisfaction with matches
- **A/B testing**: Algorithm improvements
- **Machine learning**: Continuous algorithm refinement

## 🚀 Performance Features

### Smart Loading
- **Preloading**: Next 10 profiles loaded in advance
- **Progressive Images**: Photos load progressively
- **Lazy Loading**: Background content loaded as needed
- **Caching Strategy**: Frequent profiles cached locally
- **Offline Mode**: Continue swiping with cached profiles

### Rate Limiting & Fair Usage
```typescript
interface DailyLimits {
  likes: number;        // Free: 100, Premium: unlimited
  superLikes: number;   // Free: 1, Premium: 5, Premium Plus: unlimited
  swipes: number;       // Free: 100, Premium: unlimited
  boosts: number;       // Free: 0, Premium: 1/week, Premium Plus: 3/week
}
```

### Discovery Queue Management
- **Queue Size**: Maintain 50+ profiles in queue
- **Refresh Logic**: Add new profiles when queue drops below 20
- **Quality Control**: Remove inactive users from queue
- **Diversity Ensuring**: Prevent same profiles from repeating
- **Geographic Expansion**: Expand radius when local profiles exhausted

## 🎯 Premium Discovery Features

### Enhanced Visibility
- **Profile Boost**: 3x visibility for 30 minutes
- **Super Boost**: 100x visibility for 3 hours (Premium Plus)
- **Priority Placement**: Appear at top of discovery stacks
- **Extended Reach**: Show profile beyond normal distance limits

### Advanced Matching
- **Compatibility Scores**: See percentage match with profiles
- **Mutual Friends**: See shared connections (if enabled)
- **Common Interests**: Highlighted shared interests
- **Lifestyle Alignment**: Visual compatibility indicators

### Exclusive Features
- **See Who Liked You**: Grid view of all likes received
- **Likes Grid**: Organized view of potential matches
- **Top Picks**: Daily curated high-compatibility matches
- **Recently Active**: See who's been active recently

## 🔄 Rewind & Second Chances

### Rewind Feature (Premium)
- **Undo Last Swipe**: Reverse accidental passes
- **Multiple Rewinds**: Up to 5 rewinds per day
- **Smart Suggestions**: Algorithm suggests potential rewinds
- **Rewind History**: Track reversed decisions

### Second Chance Matching
- **Profile Re-Showing**: Profiles reappear after 30 days
- **Updated Profiles**: Profiles with significant changes shown again
- **Location Changes**: Profiles shown again in new locations
- **Interest Updates**: Re-matching after preference changes

## 🛠️ API Endpoints

### Discovery
```
GET    /api/discovery/matches     - Get discovery stack
POST   /api/interactions          - Record swipe interactions
GET    /api/discovery/preferences - Get user discovery preferences
PUT    /api/discovery/preferences - Update discovery preferences
```

### Interactions
```
POST   /api/interactions/like      - Like a profile
POST   /api/interactions/pass      - Pass on a profile
POST   /api/interactions/superlike - Super like a profile
POST   /api/interactions/undo      - Undo last interaction (Premium)
```

### Matches
```
GET    /api/matches               - Get user's matches
GET    /api/matches/new           - Get new matches
POST   /api/matches/unmatch       - Unmatch with user
GET    /api/discovery/likes       - See who liked you (Premium)
```

## 🎨 UI/UX Design

### Card Interface
- **Material Design**: Smooth shadows and animations
- **Photo Quality**: High-resolution images with fallbacks
- **Information Overlay**: Gradient overlay for text readability
- **Action Buttons**: Clear iconography for all actions
- **Loading States**: Skeleton screens and progress indicators

### Animation System
- **Framer Motion**: Smooth, physics-based animations
- **Swipe Transitions**: Realistic card physics
- **Micro-interactions**: Subtle feedback animations
- **Loading Animations**: Engaging loading experiences
- **Success Celebrations**: Match celebration animations

### Responsive Design
- **Mobile First**: Optimized for touch interactions
- **Desktop Support**: Mouse and keyboard navigation
- **Tablet Optimization**: Adaptive layouts for larger screens
- **Cross-browser**: Consistent experience across browsers
- **Accessibility**: Screen reader and keyboard navigation support

## 🔍 Algorithm Transparency

### Factors Affecting Visibility
1. **Profile Completeness**: Complete profiles shown more often
2. **Recent Activity**: Active users prioritized
3. **Response Rate**: Users who respond to matches boosted
4. **Photo Quality**: High-quality photos increase visibility
5. **Premium Status**: Premium users get enhanced visibility

### Improving Match Quality
- **Detailed Preferences**: More specific preferences = better matches
- **Active Engagement**: Regular app usage improves algorithm accuracy
- **Profile Updates**: Keep information current for relevance
- **Feedback Usage**: Use super likes to signal strong preferences
- **Geographic Accuracy**: Accurate location for local matches

## 📱 Mobile Optimizations

### Touch Interactions
- **Gesture Recognition**: Natural swipe gestures
- **Haptic Feedback**: Tactile response to interactions
- **Touch Targets**: Appropriately sized buttons
- **Gesture Conflicts**: Prevent accidental system gestures
- **Multi-touch**: Support for zoom and pan on photos

### Performance
- **Image Optimization**: WebP format with fallbacks
- **Memory Management**: Efficient photo caching
- **Battery Optimization**: Minimal background processing
- **Network Efficiency**: Compressed data transfers
- **Offline Capability**: Continue using cached content

---

The discovery and matching system is continuously optimized based on user behavior and feedback to create the best possible matching experience while maintaining user engagement and satisfaction.