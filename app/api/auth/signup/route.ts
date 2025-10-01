import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();
    console.log('Signup request received:', body);

    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      dateOfBirth,
      gender,
      location
    } = body;

    // Basic validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // Check if user already exists (case-insensitive)
    const existingUser = await User.findOne({ email: { $regex: `^${email}$`, $options: 'i' } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists. Please log in or use a different email.' },
        { 
          status: 409,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    // Create new user
    const newUser = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      location: {
        type: 'Point',
        coordinates: [0, 0], // Default coordinates [longitude, latitude]
        city: location || 'Unknown'
      },
      bio: '',
      interests: [],
      photos: [],
      preferences: {
        ageRange: { min: 18, max: 35 },
        maxDistance: 25,
        interests: []
      },
      verification: {
        isVerified: false,
        verificationMethod: null
      },
      isActive: true,
      lastSeen: new Date()
    });

    const savedUser = await newUser.save();
    console.log('User created successfully:', savedUser._id);

    // Generate JWT token
    const token = generateToken({ userId: savedUser._id.toString(), email: savedUser.email });
    
    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: savedUser._id,
          firstName: savedUser.firstName,
          lastName: savedUser.lastName,
          email: savedUser.email,
          age: savedUser.dateOfBirth ? new Date().getFullYear() - savedUser.dateOfBirth.getFullYear() : null,
          gender: savedUser.gender,
          location: savedUser.location,
          bio: savedUser.bio,
          interests: savedUser.interests,
          photos: savedUser.photos,
          isActive: savedUser.isActive,
          createdAt: savedUser.createdAt
        },
        token
      },
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.stack || error.message : String(error) },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}