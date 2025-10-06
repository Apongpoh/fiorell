import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";
import { canUserPerformAction } from "@/lib/subscription";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      isActive: user.travel?.isActive || false,
      currentLocation: user.travel?.currentLocation,
      originalLocation: user.travel?.originalLocation,
    });
  } catch (error) {
    console.error('Travel status error:', error);
    return NextResponse.json(
      { error: 'Failed to get travel status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Check if user can use travel mode (Premium Plus feature)
    const travelCheck = await canUserPerformAction(userId, 'travel_mode');
    if (!travelCheck.allowed) {
      return NextResponse.json(
        {
          error: travelCheck.reason,
          code: "PREMIUM_FEATURE_REQUIRED",
          upgradeRequired: true,
          feature: "travel_mode"
        },
        { status: 403 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { action, location }: {
      action: string;
      location?: {
        city: string;
        country: string;
        coordinates: [number, number];
      };
    } = await request.json();

    if (action === 'activate') {
      if (!location) {
        return NextResponse.json(
          { error: 'Location is required for activation' },
          { status: 400 }
        );
      }

      // Store original location if not already stored
      if (!user.travel?.originalLocation) {
        user.travel = {
          ...user.travel,
          originalLocation: {
            city: user.location?.city || '',
            country: user.location?.country || '',
            coordinates: user.location?.coordinates || [0, 0],
          },
        };
      }

      // Update current location
      user.travel.isActive = true;
      user.travel.currentLocation = location;
      user.location = {
        ...user.location,
        city: location.city,
        country: location.country,
        coordinates: location.coordinates,
      };
    } else if (action === 'deactivate') {
      if (user.travel?.originalLocation) {
        // Restore original location
        user.location = {
          ...user.location,
          city: user.travel.originalLocation.city,
          country: user.travel.originalLocation.country,
          coordinates: user.travel.originalLocation.coordinates,
        };
      }

      user.travel = {
        ...user.travel,
        isActive: false,
        currentLocation: undefined,
      };
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "activate" or "deactivate"' },
        { status: 400 }
      );
    }

    await user.save();

    return NextResponse.json({
      isActive: user.travel?.isActive || false,
      currentLocation: user.travel?.currentLocation,
      originalLocation: user.travel?.originalLocation,
    });
  } catch (error) {
    console.error('Travel mode error:', error);
    return NextResponse.json(
      { error: 'Failed to update travel mode' },
      { status: 500 }
    );
  }
}