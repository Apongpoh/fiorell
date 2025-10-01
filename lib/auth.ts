import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface TokenPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Generate JWT token
export const generateToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
};

// Verify JWT token
export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    throw new Error('Invalid or expired token');
  }
};

// Extract token from request headers
export const extractTokenFromRequest = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
};

// Middleware to verify authentication
export const verifyAuth = (request: NextRequest): TokenPayload => {
  const token = extractTokenFromRequest(request);
  
  if (!token) {
    throw new Error('Authentication token is required');
  }

  return verifyToken(token);
};

// Generate refresh token
export const generateRefreshToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d', // Refresh token expires in 30 days
  });
};

// Decode token without verification (for expired tokens)
export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
};