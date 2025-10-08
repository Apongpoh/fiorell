# Fiorell - Private Dating App with Crypto Payments

A modern dating application built with Next.js, MongoDB, and enhanced with cryptocurrency payment capabilities for maximum privacy.

## 🌟 Features

### Core Features
- 🔐 User Authentication (Signup/Login)
- 👤 User Profiles with Photo Management
- 🔍 Smart Discovery Algorithm
- 💝 Like/Pass System with Match Detection
- 💬 Real-time Messaging
- 📍 Location-based Matching
- ⚙️ Privacy & Notification Settings
- 📱 Responsive Mobile-first Design

### 💳 Payment System
- 🪙 **Cryptocurrency Payments (Default)** - Bitcoin & Monero support
- 💳 Traditional Payment Methods - Credit cards, PayPal via Lemon Squeezy
- 🔒 Enhanced Privacy - Crypto payments for anonymous transactions
- ⚡ Instant Confirmation - Real-time blockchain monitoring
- 🔄 Automated Subscriptions - Recurring crypto payments
- 🛡️ Security - Multi-layer payment verification

### 🎯 Premium Features
- ✨ Unlimited likes and super boosts
- 👁️ See who liked you
- 🔍 Advanced filters and preferences
- 🎭 Incognito mode and enhanced privacy
- 🌍 Travel mode and global matching
- 🎟️ Exclusive events and early access

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Hook Form** - Form management
- **Zod** - Form validation

### Backend
- **MongoDB** - Database with geospatial indexing
- **Mongoose** - ODM with subscription models
- **AWS S3** - File storage
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Payment Infrastructure
- **Bitcoin/Monero Integration** - Blockchain payment processing
- **Lemon Squeezy** - Traditional payment processor
- **Webhook System** - Real-time payment confirmations
- **QR Code Generation** - Mobile wallet integration
- **Price API Integration** - Live cryptocurrency pricing

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MongoDB (local or MongoDB Atlas)
- AWS Account (for S3 storage)
- Bitcoin/Monero Node Access (optional - testnet supported)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fiorell
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/fiorell
   # or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fiorell

   # JWT Secret
   JWT_SECRET=your-super-secret-jwt-key-here

   # AWS S3
   AWS_ACCESS_KEY_ID=your-aws-access-key
   AWS_SECRET_ACCESS_KEY=your-aws-secret-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=your-bucket-name

   # Cryptocurrency Payment System (Default)
   CRYPTO_NETWORK=testnet  # or mainnet for production
   CRYPTO_WEBHOOK_SECRET=your_webhook_secret_here
   CRON_SECRET=your_cron_secret_here
   
   # Optional: Bitcoin Node (for advanced features)
   BITCOIN_RPC_URL=http://localhost:8332
   BITCOIN_RPC_USER=your_rpc_user
   BITCOIN_RPC_PASSWORD=your_rpc_password
   
   # Optional: Monero Node (for advanced features)
   MONERO_RPC_URL=http://localhost:18081
   MONERO_WALLET_RPC_URL=http://localhost:18083

   # Traditional Payment System (Backup)
   LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key
   LEMONSQUEEZY_STORE_ID=your_store_id
   LEMONSQUEEZY_WEBHOOK_SECRET=your_lemonsqueezy_webhook_secret

   # Application Settings
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Start MongoDB** (if running locally)
   ```bash
   mongod
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## API Testing

We've included a simple API test script to verify all endpoints:

```bash
# Make sure your development server is running first
npm run dev

# In another terminal, run the tests
node test-api.js
```

This will test:
- User registration and authentication
- Profile management
- Discovery and matching
- User interactions
- Messaging system

## Project Structure

```
fiorell/
├── app/                    # Next.js App Router pages
│   ├── api/               # API endpoints
│   ├── auth/              # Authentication pages
│   ├── chat/              # Chat pages
│   ├── dashboard/         # Main app dashboard
│   ├── help/              # Help pages
│   ├── matches/           # Matches page
│   ├── profile/           # Profile pages
│   ├── settings/          # Settings pages
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
├── lib/                   # Utility functions
├── models/                # Database models
├── docs/                  # Documentation
├── public/                # Static assets
└── test-api.js           # API test script
```

## API Documentation

Detailed API documentation is available in [`docs/API.md`](./docs/API.md).

### Key Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `POST /api/user/photos` - Upload photos
- `GET /api/discovery/matches` - Get potential matches
- `POST /api/interactions/likes` - Like/pass users
- `GET /api/matches` - Get user matches
- `POST /api/messages` - Send messages
- `GET /api/messages` - Get conversation

## Database Models

### User
- Profile information (name, bio, interests)
- Photos and media
- Location and preferences
- Privacy settings
- Subscription status

### Match
- Two-way relationships between users
- Match timestamps and status

### Message
- Text and media messages
- Conversation threading
- Read receipts and timestamps

### Like
- User interactions (like/super_like/pass)
- Preference tracking

## Deployment

### Environment Setup

For production deployment, ensure you have:

1. **MongoDB Atlas** (recommended for production)
2. **AWS S3 Bucket** with proper permissions
3. **Environment variables** configured on your hosting platform

### Recommended Platforms

- **Vercel** (recommended for Next.js)
- **Netlify**
- **AWS Amplify**
- **Railway**
- **Render**

### Build Commands

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Security Features

- 🔒 JWT-based authentication
- 🔐 Password hashing with bcryptjs
- 🛡️ Input validation with Zod
- 🚫 Protected API routes
- 📝 Request sanitization
- � Error handling without information leakage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support and questions:

- 📧 Email: support@fiorell.com
-  Documentation: [docs/API.md](./docs/API.md)

---

Made with ❤️ by the Fiorell team
