# Messaging System Documentation

## 📋 Overview

Fiorell's messaging system provides real-time communication between matched users with rich media support, read receipts, disappearing messages, and advanced privacy features.

## 💬 Core Messaging Features

### 1. Real-Time Messaging
- **Server-Sent Events (SSE)**: Live message delivery without polling
- **Instant Delivery**: Messages appear immediately in both conversations
- **Typing Indicators**: Show when someone is composing a message
- **Online Status**: Real-time online/offline indicators
- **Message Status**: Sent, delivered, and read confirmations

### 2. Message Types
- **Text Messages**: Standard text communication with emoji support
- **Media Messages**: Images, videos, and audio files
- **Location Sharing**: Share current location with matches
- **Voice Messages**: Audio recordings for personal touch
- **GIF Support**: Animated GIF integration (planned)

### 3. Rich Text Features
- **Emoji Support**: Full Unicode emoji support with picker
- **URL Preview**: Automatic link preview generation
- **Mention System**: @mention functionality for group chats (planned)
- **Message Formatting**: Bold, italic, and other text formatting
- **Character Counter**: Real-time character count display

## 🔒 Privacy & Security Features

### Message Encryption
- **Data Protection**: All messages encrypted at rest and in transit
- **Secure Storage**: Encrypted database storage
- **Key Management**: Secure encryption key handling
- **Forward Secrecy**: Messages deleted from servers after delivery (optional)

### Disappearing Messages
- **Auto-Delete**: Messages automatically delete after set time
- **Custom Timers**: 1 minute to 7 days deletion options
- **Visual Indicators**: Clear indication of disappearing messages
- **Both Sides Deletion**: Messages disappear from both devices
- **Screenshot Notifications**: Alert when recipient takes screenshot (mobile)

### Message Control
- **Message Deletion**: Delete messages for yourself or everyone
- **Edit Messages**: Edit sent messages within 15 minutes
- **Bulk Operations**: Select and delete multiple messages
- **Clear Chat**: Remove entire conversation history
- **Archive Conversations**: Hide conversations without deleting

## 📱 User Experience Features

### Chat Interface
- **Bubble Design**: Modern message bubble interface
- **Read Receipts**: Blue checkmarks for read messages
- **Timestamp Display**: Smart timestamp formatting
- **Message Grouping**: Group consecutive messages from same sender
- **Scroll Position**: Remember scroll position when returning to chat

### Message Input
- **Smart Compose**: Auto-suggestions and spell check
- **Voice Input**: Speech-to-text functionality
- **Media Picker**: Easy access to camera and photo library
- **Draft Messages**: Save unsent messages as drafts
- **Send on Enter**: Configurable send behavior

### Conversation Management
- **Chat List**: All conversations in chronological order
- **Unread Counts**: Badge showing unread message count
- **Search Functionality**: Search messages within conversations
- **Conversation Search**: Find specific conversations quickly
- **Pin Conversations**: Pin important chats to top

## 🎯 Premium Messaging Features

### Enhanced Communication
- **Read Receipts**: See when messages are read (Premium)
- **Typing Indicators**: Advanced typing status (Premium)
- **Message Priority**: Mark important messages (Premium Plus)
- **Voice Messages**: Extended voice message length (Premium Plus)
- **Message Scheduling**: Schedule messages for later (Premium Plus)

### Pre-Match Messaging (Premium Plus)
- **First Message**: Send message before matching
- **Introduction System**: Structured introduction messages
- **Response Rate**: Track response rates to pre-match messages
- **Message Templates**: Pre-written introduction templates
- **Smart Suggestions**: AI-powered conversation starters

### Advanced Features
- **Message Reactions**: React to messages with emojis (Premium)
- **Message Threading**: Reply to specific messages (Premium Plus)
- **Voice Calling**: In-app voice calls (Premium Plus)
- **Video Calling**: Face-to-face video chat (Premium Plus)
- **Screen Sharing**: Share screen during video calls (Premium Plus)

## 📊 Message Analytics

### Conversation Metrics
- **Response Rate**: Percentage of messages that get responses
- **Response Time**: Average time to respond to messages
- **Conversation Length**: Average messages per conversation
- **Engagement Score**: Overall conversation quality metric
- **Best Conversation Times**: Optimal times for messaging

### Personal Insights
- **Most Active Conversations**: Your most engaging chats
- **Response Patterns**: Your typical response behavior
- **Popular Topics**: Most discussed conversation topics
- **Emoji Usage**: Your most used emojis and reactions
- **Media Sharing**: Types of media most shared

## 🛠️ Technical Implementation

### Real-Time Architecture
```typescript
// Server-Sent Events for real-time messaging
const eventSource = new EventSource(`/api/messages/subscribe?matchId=${matchId}&token=${token}`);

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);
  addMessageToChat(message);
};
```

### Message Data Model
```typescript
interface Message {
  id: string;
  sender: string;
  recipient: string;
  match: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'location';
  media?: MediaAttachment;
  createdAt: Date;
  readStatus: {
    isRead: boolean;
    readAt?: Date;
  };
  isDeleted: boolean;
  disappearsAt?: Date;
  disappearingDuration?: number;
  editedAt?: Date;
  editHistory?: string[];
}
```

### Media Handling
```typescript
interface MediaAttachment {
  url: string;
  key: string;
  mimeType: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // for audio/video
  thumbnail?: string; // for videos
}
```

## 🚀 Performance Optimizations

### Message Loading
- **Progressive Loading**: Load recent messages first, older on scroll
- **Virtual Scrolling**: Efficient rendering of long conversations
- **Image Lazy Loading**: Load images as they come into view
- **Caching Strategy**: Cache frequently accessed conversations
- **Compression**: Efficient message data compression

### Media Optimization
- **Auto-Compression**: Compress images before sending
- **Multiple Formats**: WebP for modern browsers, JPEG fallback
- **Progressive JPEG**: Progressive image loading
- **Video Transcoding**: Optimize video files for streaming
- **Thumbnail Generation**: Create thumbnails for video messages

### Network Efficiency
- **Message Batching**: Send multiple messages in single request
- **Delta Sync**: Only sync changed messages
- **Offline Queuing**: Queue messages when offline
- **Retry Logic**: Automatic retry for failed messages
- **Bandwidth Adaptation**: Adjust quality based on connection

## 🛡️ Content Moderation

### Automated Moderation
- **Inappropriate Content**: AI detection of inappropriate text
- **Image Moderation**: Automated inappropriate image detection
- **Spam Detection**: Identify and filter spam messages
- **Link Validation**: Check links for malicious content
- **Language Filter**: Optional profanity filtering

### User Controls
- **Block User**: Prevent messages from specific users
- **Report Messages**: Report inappropriate content
- **Mute Conversations**: Disable notifications for specific chats
- **Filter Requests**: Control who can message you
- **Safe Mode**: Enhanced content filtering

### Admin Tools
- **Message Review**: Admin review of reported messages
- **User Actions**: Warn, suspend, or ban users
- **Content Analysis**: Aggregate content moderation statistics
- **Appeal System**: Users can appeal moderation decisions
- **Audit Logs**: Complete moderation action logging

## 📱 Mobile Features

### Native Integration
- **Push Notifications**: Rich message notifications
- **Quick Reply**: Reply directly from notifications
- **Lock Screen**: Message previews on lock screen (configurable)
- **Share Extension**: Share content to Fiorell from other apps
- **Contact Integration**: Add matches to phone contacts (optional)

### Gesture Support
- **Swipe Actions**: Swipe to reply, delete, or mark as read
- **Pull to Refresh**: Refresh conversation with pull gesture
- **Haptic Feedback**: Tactile feedback for message interactions
- **Force Touch**: Quick actions with 3D Touch/Force Touch
- **Voice Shortcuts**: Siri shortcuts for quick messaging

## 🔧 API Endpoints

### Core Messaging
```
GET    /api/messages              - Get conversation messages
POST   /api/messages              - Send a new message
DELETE /api/messages/:id          - Delete a message
PUT    /api/messages/:id/edit     - Edit a message
POST   /api/messages/read         - Mark messages as read
```

### Media Messages
```
POST   /api/messages/media        - Upload and send media
GET    /api/messages/media/refresh - Refresh expired media URLs
POST   /api/messages/location     - Send location message
POST   /api/messages/voice        - Send voice message
```

### Conversation Management
```
GET    /api/matches               - Get all conversations
POST   /api/messages/clear        - Clear conversation history
POST   /api/messages/archive      - Archive conversation
GET    /api/messages/search       - Search messages
POST   /api/messages/typing       - Send typing indicator
```

### Real-Time Events
```
GET    /api/messages/subscribe    - Subscribe to real-time messages
POST   /api/messages/online       - Update online status
GET    /api/messages/status       - Get message delivery status
```

## 🎨 UI Components

### Message Bubbles
- **Sender Alignment**: Right-aligned for sent, left for received
- **Color Coding**: Different colors for sent/received messages
- **Tail Design**: Message bubble tails for conversation flow
- **Status Icons**: Delivery and read status indicators
- **Timestamp**: Smart timestamp display

### Media Display
- **Image Gallery**: Swipeable image viewer
- **Video Player**: In-line video playback with controls
- **Audio Waveform**: Visual waveform for voice messages
- **Location Maps**: Interactive map for location messages
- **File Preview**: Preview for document attachments

### Input Components
- **Rich Text Editor**: Formatting toolbar for text
- **Emoji Picker**: Full emoji selection with categories
- **Media Selector**: Camera, gallery, and file picker
- **Voice Recorder**: Touch and hold to record
- **Send Button**: Animated send button with progress

## 📖 User Guidelines

### Messaging Best Practices
1. **Be Authentic**: Write genuine, thoughtful messages
2. **Ask Questions**: Keep conversations engaging with questions
3. **Respect Boundaries**: Honor disappearing message settings
4. **Quality Over Quantity**: Send meaningful messages, not spam
5. **Use Media Wisely**: Share photos and videos appropriately
6. **Respond Timely**: Maintain conversation momentum
7. **Be Respectful**: Always communicate respectfully

### Safety Tips
- **Personal Information**: Don't share sensitive personal details
- **Meeting Plans**: Use in-app communication until ready to meet
- **Report Issues**: Report any inappropriate behavior immediately
- **Trust Instincts**: If something feels wrong, end the conversation
- **Screenshots**: Be aware recipients can screenshot messages
- **Location Sharing**: Only share location with trusted matches

### Conversation Starters
- **Shared Interests**: Comment on mutual interests from profiles
- **Ask About Photos**: Ask about interesting photos or activities
- **Current Events**: Discuss relevant topics or trends
- **Open Questions**: Ask questions that require more than yes/no
- **Humor**: Light humor can break the ice effectively
- **Genuine Compliments**: Sincere compliments about profile content

---

The messaging system prioritizes user safety, privacy, and engagement while providing a rich, modern communication experience that facilitates meaningful connections.