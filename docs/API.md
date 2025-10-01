# Fiorell Backend API Documentation

## Overview

The Fiorell backend provides a comprehensive REST API for the dating app, built with Next.js API routes, MongoDB with Mongoose, and AWS S3 for file storage.

## Base URL
```
http://localhost:3001/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication

#### POST /api/auth/signup
Register a new user account.

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "confirmPassword": "securepassword123",
  "dateOfBirth": "1995-01-15",
  "gender": "male",
  "location": "New York, NY"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "age": 28,
    "gender": "male",
    "location": { "city": "New York, NY" },
    "bio": "",
    "interests": [],
    "photos": [],
    "isActive": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  },
  "token": "jwt_token_here"
}
```

#### POST /api/auth/login
Authenticate user and get access token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { /* user object */ },
  "token": "jwt_token_here"
}
```

### User Profile Management

#### GET /api/user/profile
Get current user's profile information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "age": 28,
    "gender": "male",
    "location": { "city": "New York, NY" },
    "bio": "Adventure seeker and coffee lover",
    "interests": ["Photography", "Travel", "Coffee"],
    "photos": [
      {
        "url": "https://s3.amazonaws.com/...",
        "key": "profile-photos/user_id/...",
        "isMain": true,
        "createdAt": "2025-01-01T00:00:00.000Z"
      }
    ],
    "preferences": {
      "ageRange": { "min": 22, "max": 35 },
      "maxDistance": 50,
      "lookingFor": []
    },
    "verification": { "isVerified": false },
    "privacy": {
      "showAge": true,
      "showLocation": true,
      "onlineStatus": true,
      "readReceipts": true
    },
    "subscription": { "type": "free", "features": [] },
    "stats": { "likes": 0, "matches": 0, "views": 0 },
    "isActive": true,
    "lastSeen": "2025-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/user/profile
Update user profile information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "bio": "Updated bio text",
  "location": "Los Angeles, CA",
  "interests": ["Photography", "Travel", "Cooking"],
  "preferences": {
    "ageRange": { "min": 25, "max": 40 },
    "maxDistance": 75
  },
  "privacy": {
    "showAge": true,
    "showLocation": false,
    "onlineStatus": true,
    "readReceipts": false
  }
}
```

#### DELETE /api/user/profile
Deactivate user account (soft delete).

**Headers:** `Authorization: Bearer <token>`

### Photo Management

#### POST /api/user/photos
Upload a profile photo.

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Request Body:**
- `photo`: Image file (max 10MB, JPEG/PNG/WebP)

**Response:**
```json
{
  "message": "Photo uploaded successfully",
  "photo": {
    "url": "https://s3.amazonaws.com/...",
    "key": "profile-photos/user_id/...",
    "isMain": false,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

#### DELETE /api/user/photos?photoId=<photo_id>
Delete a profile photo.

**Headers:** `Authorization: Bearer <token>`

#### PUT /api/user/photos
Set main profile photo.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "photoId": "photo_id_here"
}
```

### Discovery & Matching

#### GET /api/discovery/matches?limit=10&offset=0
Get potential matches for the user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit`: Number of profiles to return (default: 10)
- `offset`: Number of profiles to skip (default: 0)

**Response:**
```json
{
  "matches": [
    {
      "id": "user_id",
      "firstName": "Emma",
      "age": 26,
      "bio": "Adventure seeker...",
      "location": { "city": "New York, NY" },
      "interests": ["Photography", "Travel"],
      "photos": [
        {
          "url": "https://s3.amazonaws.com/...",
          "isMain": true
        }
      ],
      "verification": { "isVerified": true },
      "lastSeen": "2025-01-01T00:00:00.000Z",
      "compatibilityScore": 85,
      "commonInterests": ["Photography", "Travel"]
    }
  ],
  "hasMore": true,
  "totalShown": 10
}
```

### Interactions

#### POST /api/interactions/likes
Like, super like, or pass on a user.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "targetUserId": "user_id_to_like",
  "action": "like"
}
```

**Actions:** `like`, `super_like`, `pass`

**Response:**
```json
{
  "message": "Liked successfully",
  "action": "like",
  "isMatch": true,
  "matchId": "match_id",
  "matchedUser": {
    "id": "user_id",
    "firstName": "Emma",
    "age": 26,
    "photos": [...]
  }
}
```

#### GET /api/interactions/likes?type=received
Get likes sent/received or mutual matches.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type`: `sent`, `received`, or `mutual`

**Response:**
```json
{
  "likes": [
    {
      "id": "like_id",
      "type": "like",
      "user": {
        "id": "user_id",
        "firstName": "Emma",
        "age": 26,
        "photos": [...]
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Matches & Messaging

#### GET /api/matches
Get user's matches with conversation info.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "matches": [
    {
      "id": "match_id",
      "user": {
        "id": "user_id",
        "firstName": "Emma",
        "age": 26,
        "photos": [...],
        "isOnline": true,
        "lastSeen": "2025-01-01T00:00:00.000Z",
        "isVerified": true
      },
      "lastMessage": {
        "id": "message_id",
        "content": "Hey! How are you?",
        "type": "text",
        "sender": "user_id",
        "createdAt": "2025-01-01T00:00:00.000Z",
        "isRead": false
      },
      "unreadCount": 2,
      "matchedAt": "2025-01-01T00:00:00.000Z",
      "lastMessageAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### DELETE /api/matches?matchId=<match_id>
Unmatch with a user.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/messages?matchId=<match_id>&limit=50&offset=0
Get messages for a specific match.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "messages": [
    {
      "id": "message_id",
      "content": "Hey! How are you?",
      "type": "text",
      "media": null,
      "sender": {
        "id": "user_id",
        "firstName": "Emma",
        "isCurrentUser": false
      },
      "readStatus": {
        "isRead": true,
        "readAt": "2025-01-01T00:00:00.000Z"
      },
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "match": {
    "id": "match_id",
    "otherUser": {
      "id": "user_id",
      "firstName": "Emma",
      "photos": [...],
      "isOnline": true,
      "lastSeen": "2025-01-01T00:00:00.000Z"
    }
  },
  "hasMore": false
}
```

#### POST /api/messages
Send a message.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "matchId": "match_id",
  "content": "Hello! Nice to meet you.",
  "type": "text"
}
```

**Types:** `text`, `image`, `video`, `audio`, `location`

#### DELETE /api/messages?messageId=<message_id>
Delete a sent message.

**Headers:** `Authorization: Bearer <token>`

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `500`: Internal Server Error

## Database Models

### User Model
- Authentication (email, password)
- Profile information (name, bio, photos, interests)
- Preferences (age range, distance, looking for)
- Privacy settings
- Subscription status
- Statistics (likes, matches, views)

### Match Model
- Two users who have mutually liked each other
- Match status and timestamps
- Last message activity

### Message Model
- Messages between matched users
- Support for text, images, videos, audio
- Read receipts and timestamps

### Like Model
- User interactions (like, super like, pass)
- Prevents duplicate actions
- Used for match detection

## File Upload

### Supported File Types
- **Images**: JPEG, PNG, WebP (max 10MB)
- **Videos**: MP4, MPEG, QuickTime (max 50MB)
- **Audio**: MP3, WAV, OGG (max 50MB)

### AWS S3 Integration
- Automatic file upload to S3
- Unique file naming with user ID and timestamp
- Secure file deletion
- Presigned URLs for private content

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- File type and size validation
- Rate limiting (to be implemented)
- CORS configuration
- SQL injection prevention (NoSQL)

## Environment Variables

```bash
# Database
DATABASE_URL=mongodb://localhost:27017/fiorell

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket-name

# Environment
NODE_ENV=development
```

## Rate Limiting & Quotas

### Free Users
- 100 likes per day
- Standard matching algorithm
- Basic filters

### Premium Users
- Unlimited likes
- Super likes (5 per day)
- Advanced filters
- Read receipts
- Profile boost

---

**Note:** This API is designed for the Fiorell dating app and includes comprehensive features for user management, matching, and messaging.