import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Interaction from '@/models/Interaction';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    let match: any = null;

    // Validate required fields
    if (!body.userId || !body.targetUserId || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, targetUserId, action' },
        { status: 400 }
      );
    }

    // Validate action type
    if (!['like', 'pass', 'super_like'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be like, pass, or super_like' },
        { status: 400 }
      );
    }

            // Connect to database and start a MongoDB session for transaction
    await connectToDatabase();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check for existing interaction
      const existingInteraction = await Interaction.findOne({
        userId: body.userId,
        targetUserId: body.targetUserId,
        action: body.action
      }).session(session);

      if (existingInteraction) {
        await session.abortTransaction();
        return NextResponse.json(
          { error: 'You have already performed this action with this user' },
          { status: 409 }
        );
      }

      // Store the interaction
      const interaction = await Interaction.create([{
        userId: body.userId,
        targetUserId: body.targetUserId,
        action: body.action,
      }], { session });

      // Update target user's received likes/super likes count
      if (body.action === 'like' || body.action === 'super_like') {
        const updateField = body.action === 'like' 
          ? 'stats.totalLikesReceived' 
          : 'stats.totalSuperLikesReceived';
        
        await User.findByIdAndUpdate(
          body.targetUserId,
          { $inc: { [updateField]: 1 } },
          { session }
        );
      }

      // Check for a match
      let match = null;
      if (body.action === 'like' || body.action === 'super_like') {
        const reciprocal = await Interaction.findOne({
          userId: body.targetUserId,
          targetUserId: body.userId,
          action: { $in: ['like', 'super_like'] }
        }).session(session);

        if (reciprocal) {
          // Update both interactions to mark them as matches
          await Interaction.updateMany(
            {
              $or: [
                { userId: body.userId, targetUserId: body.targetUserId },
                { userId: body.targetUserId, targetUserId: body.userId }
              ]
            },
            { isMatch: true },
            { session }
          );

          // Increment match count for both users
          await User.updateMany(
            {
              _id: { $in: [body.userId, body.targetUserId] }
            },
            { $inc: { 'stats.totalMatches': 1 } },
            { session }
          );

          match = {
            id: `match-${Date.now()}`,
            userId: body.userId,
            matchedUserId: body.targetUserId,
            timestamp: new Date().toISOString()
          };
        }
      }

      // Commit the transaction
      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        match
      });
    } catch (error) {
      // If anything fails, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      await session.endSession();
    }
      
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}