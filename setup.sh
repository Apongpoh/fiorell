#!/bin/bash

# Fiorell Development Setup Script
# This script helps set up the development environment

echo "🚀 Setting up Fiorell Development Environment"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚠️  Environment file not found"
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "✅ .env.local created from template"
    echo "🔧 Please edit .env.local with your actual configuration values"
    echo ""
    echo "Required configurations:"
    echo "  - MONGODB_URI (MongoDB connection string)"
    echo "  - JWT_SECRET (secure random string)"
    echo "  - AWS_* credentials (for file uploads)"
    echo ""
else
    echo "✅ Environment file .env.local already exists"
fi

# Check if MongoDB is running (local installation)
echo ""
echo "🔍 Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --quiet --eval "db.runCommand('ismaster')" localhost:27017/test &> /dev/null; then
        echo "✅ MongoDB is running on localhost:27017"
    else
        echo "⚠️  MongoDB is not running locally"
        echo "   You can either:"
        echo "   1. Start local MongoDB: mongod"
        echo "   2. Use MongoDB Atlas (cloud) - update MONGODB_URI in .env.local"
    fi
elif command -v mongo &> /dev/null; then
    if mongo --quiet --eval "db.runCommand('ismaster')" localhost:27017/test &> /dev/null; then
        echo "✅ MongoDB is running on localhost:27017"
    else
        echo "⚠️  MongoDB is not running locally"
        echo "   You can either:"
        echo "   1. Start local MongoDB: mongod"
        echo "   2. Use MongoDB Atlas (cloud) - update MONGODB_URI in .env.local"
    fi
else
    echo "⚠️  MongoDB CLI not found"
    echo "   Please ensure MongoDB is installed or use MongoDB Atlas"
    echo "   Install MongoDB: https://docs.mongodb.com/manual/installation/"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your configuration"
echo "2. Start the development server: npm run dev"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "Optional:"
echo "- Test the API endpoints: node test-api.js"
echo "- Read the documentation: docs/API.md"
echo ""
echo "Happy coding! ❤️"