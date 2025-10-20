import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Interaction from "@/models/Interaction";
import Match from "@/models/Match";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";

// Admin verification function
async function verifyAdmin(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    await connectToDatabase();
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isAdmin) return null;
    
    return user;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // Find all matched interactions that don't have corresponding Match records
    const matchedInteractions = await Interaction.find({ isMatch: true });
    
    let migratedCount = 0;
    let skippedCount = 0;

    for (const interaction of matchedInteractions) {
      // Check if a Match record already exists
      const existingMatch = await Match.findOne({
        $or: [
          { user1: interaction.userId, user2: interaction.targetUserId },
          { user1: interaction.targetUserId, user2: interaction.userId },
        ],
        status: "matched",
        isActive: true,
      });

      if (!existingMatch) {
        // Find the reciprocal interaction to determine match date
        const reciprocalInteraction = await Interaction.findOne({
          userId: interaction.targetUserId,
          targetUserId: interaction.userId,
          isMatch: true,
        });

        // Use the later date as the match date (when the second person liked)
        const matchDate = reciprocalInteraction && reciprocalInteraction.createdAt > interaction.createdAt
          ? reciprocalInteraction.createdAt
          : interaction.createdAt;

        // Create a new Match record
        const newMatch = new Match({
          user1: new ObjectId(interaction.userId),
          user2: new ObjectId(interaction.targetUserId),
          status: "matched",
          initiatedBy: new ObjectId(interaction.userId),
          matchedAt: matchDate,
          isActive: true,
        });

        await newMatch.save();
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Migration completed: ${migratedCount} matches created, ${skippedCount} already existed`,
      migratedCount,
      skippedCount,
    });
  } catch (error) {
    console.error("Error migrating matches:", error);
    return NextResponse.json(
      { error: "Failed to migrate matches" },
      { status: 500 }
    );
  }
}