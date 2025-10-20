import { NextResponse } from "next/server";

// Define the subscription plans available for purchase
const SUBSCRIPTION_PLANS = [
  {
    id: "premium_monthly",
    name: "Premium",
    description: "Unlock premium features and find more meaningful connections",
    price: 9.99,
    currency: "USD",
    interval: "month" as const,
    popular: false,
    features: [
      "Unlimited likes",
      "See who liked you",
      "5 Super Likes per day",
      "Advanced filters",
      "Read receipts",
      "Ad-free experience",
      "Priority customer support",
      "Profile boost (3x per week)"
    ]
  },
  {
    id: "premium_annual",
    name: "Premium",
    description: "Best value - Premium features with annual savings",
    price: 99.99,
    currency: "USD",
    interval: "year" as const,
    popular: true,
    savings: {
      savingsAmount: 19.89,
      savingsPercentage: 17
    },
    monthlyEquivalentPrice: 8.33,
    features: [
      "Unlimited likes",
      "See who liked you",
      "5 Super Likes per day",
      "Advanced filters",
      "Read receipts",
      "Ad-free experience",
      "Priority customer support",
      "Profile boost (3x per week)"
    ]
  },
  {
    id: "premium_plus_monthly",
    name: "Premium Plus",
    description: "Ultimate dating experience with exclusive features",
    price: 19.99,
    currency: "USD",
    interval: "month" as const,
    popular: false,
    features: [
      "Everything in Premium",
      "Unlimited Super Likes",
      "Unlimited Boosts",
      "Travel Mode",
      "Incognito Mode",
      "Message before matching",
      "Show passed profiles again",
      "Priority matching algorithm",
      "Exclusive Premium Plus support"
    ]
  },
  {
    id: "premium_plus_annual",
    name: "Premium Plus",
    description: "Ultimate experience with maximum savings",
    price: 199.99,
    currency: "USD",
    interval: "year" as const,
    popular: false,
    savings: {
      savingsAmount: 39.89,
      savingsPercentage: 17
    },
    monthlyEquivalentPrice: 16.67,
    features: [
      "Everything in Premium",
      "Unlimited Super Likes",
      "Unlimited Boosts",
      "Travel Mode",
      "Incognito Mode",
      "Message before matching",
      "Show passed profiles again",
      "Priority matching algorithm",
      "Exclusive Premium Plus support"
    ]
  }
];

export async function GET() {
  try {
    // Return the static plans
    // In a production environment, you might want to:
    // 1. Fetch plans from a database
    // 2. Apply regional pricing
    // 3. Check for promotional offers
    // 4. Customize based on user's current subscription
    
    return NextResponse.json(
      {
        plans: SUBSCRIPTION_PLANS,
        currency: "USD",
        lastUpdated: new Date().toISOString()
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, max-age=300, stale-while-revalidate=60", // Cache for 5 minutes
        }
      }
    );
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription plans" },
      { status: 500 }
    );
  }
}

// Optional: Handle dynamic plan updates (for admin use)
export async function POST() {
  try {
    // This could be used by admins to update plans
    // For now, return method not allowed
    return NextResponse.json(
      { error: "Plan updates not implemented" },
      { status: 405 }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}