import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import lemonSqueezyService from "@/lib/lemonSqueezy";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import Payment from "@/models/Payment";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.text();
    const signature = request.headers.get("x-signature") || "";

    // Verify webhook signature
    if (!lemonSqueezyService.verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const event = JSON.parse(body) as any;
    const eventName = event.meta.event_name;

    console.log(`Processing webhook event: ${eventName}`);

    // Handle different event types
    switch (eventName) {
      case "order_created":
        await handleOrderCreated(event);
        break;
      case "subscription_created":
        await handleSubscriptionCreated(event);
        break;
      case "subscription_updated":
        await handleSubscriptionUpdated(event);
        break;
      case "subscription_cancelled":
        await handleSubscriptionCancelled(event);
        break;
      case "subscription_resumed":
        await handleSubscriptionResumed(event);
        break;
      case "subscription_expired":
        await handleSubscriptionExpired(event);
        break;
      case "subscription_paused":
        await handleSubscriptionPaused(event);
        break;
      case "subscription_unpaused":
        await handleSubscriptionUnpaused(event);
        break;
      case "subscription_payment_success":
        await handleSubscriptionPaymentSuccess(event);
        break;
      case "subscription_payment_failed":
        await handleSubscriptionPaymentFailed(event);
        break;
      default:
        console.log(`Unhandled event type: ${eventName}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleOrderCreated(event: any) {
  try {
    const order = event.data;
    const attributes = order.attributes;
    const customData = attributes.first_order_item?.product_options?.custom_data;
    
    if (!customData?.userId) {
      console.error("No userId in order custom data");
      return;
    }

    // Create payment record
    const payment = new Payment({
      userId: customData.userId,
      lemonsqueezyOrderId: order.id,
      lemonsqueezyVariantId: attributes.first_order_item?.variant_id,
      lemonsqueezyCustomerId: attributes.customer_id,
      amount: parseFloat(attributes.total.toString()) / 100,
      currency: attributes.currency,
      status: attributes.status === "paid" ? "paid" : "pending",
      createdAt: new Date(attributes.created_at),
    });

    await payment.save();
    console.log(`Payment record created for user ${customData.userId}`);
  } catch (error) {
    console.error("Error handling order_created:", error);
  }
}

async function handleSubscriptionCreated(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;
    const customData = event.meta.custom_data;
    
    if (!customData?.userId) {
      console.error("No userId in subscription custom data");
      return;
    }

    // Create subscription record
    const newSubscription = new Subscription({
      userId: customData.userId,
      lemonsqueezySubscriptionId: subscription.id,
      lemonsqueezyVariantId: attributes.variant_id,
      lemonsqueezyProductId: attributes.product_id,
      lemonsqueezyCustomerId: attributes.user_email,
      status: attributes.status,
      planId: attributes.variant_id,
      planName: customData.planName || "Premium",
      currentPeriodStart: new Date(attributes.created_at),
      currentPeriodEnd: new Date(attributes.renews_at),
      cancelAtPeriodEnd: attributes.cancelled,
      trialEnd: attributes.trial_ends_at ? new Date(attributes.trial_ends_at) : null,
      createdAt: new Date(attributes.created_at),
      updatedAt: new Date(attributes.updated_at),
    });

    await newSubscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(customData.userId, {
      "subscription.type": "premium",
      "subscription.expiresAt": new Date(attributes.renews_at),
      "subscription.isActive": true,
    });

    console.log(`Subscription created for user ${customData.userId}`);
  } catch (error) {
    console.error("Error handling subscription_created:", error);
  }
}

async function handleSubscriptionUpdated(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;

    await Subscription.findOneAndUpdate(
      { lemonsqueezySubscriptionId: subscription.id },
      {
        status: attributes.status,
        currentPeriodStart: new Date(attributes.created_at),
        currentPeriodEnd: new Date(attributes.renews_at),
        cancelAtPeriodEnd: attributes.cancelled,
        updatedAt: new Date(attributes.updated_at),
      }
    );

    // Update user subscription status
    const subscriptionDoc = await Subscription.findOne({
      lemonsqueezySubscriptionId: subscription.id,
    });

    if (subscriptionDoc) {
      await User.findByIdAndUpdate(subscriptionDoc.userId, {
        "subscription.type": attributes.status === "active" ? "premium" : "free",
        "subscription.expiresAt": new Date(attributes.renews_at),
        "subscription.isActive": attributes.status === "active",
      });
    }

    console.log(`Subscription updated: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription_updated:", error);
  }
}

async function handleSubscriptionCancelled(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;

    await Subscription.findOneAndUpdate(
      { lemonsqueezySubscriptionId: subscription.id },
      {
        status: "cancelled",
        cancelAtPeriodEnd: true,
        updatedAt: new Date(attributes.updated_at),
      }
    );

    console.log(`Subscription cancelled: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription_cancelled:", error);
  }
}

async function handleSubscriptionResumed(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;

    await Subscription.findOneAndUpdate(
      { lemonsqueezySubscriptionId: subscription.id },
      {
        status: "active",
        cancelAtPeriodEnd: false,
        updatedAt: new Date(attributes.updated_at),
      }
    );

    // Update user subscription status
    const subscriptionDoc = await Subscription.findOne({
      lemonsqueezySubscriptionId: subscription.id,
    });

    if (subscriptionDoc) {
      await User.findByIdAndUpdate(subscriptionDoc.userId, {
        "subscription.type": "premium",
        "subscription.isActive": true,
      });
    }

    console.log(`Subscription resumed: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription_resumed:", error);
  }
}

async function handleSubscriptionExpired(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;

    await Subscription.findOneAndUpdate(
      { lemonsqueezySubscriptionId: subscription.id },
      {
        status: "expired",
        updatedAt: new Date(attributes.updated_at),
      }
    );

    // Update user subscription status
    const subscriptionDoc = await Subscription.findOne({
      lemonsqueezySubscriptionId: subscription.id,
    });

    if (subscriptionDoc) {
      await User.findByIdAndUpdate(subscriptionDoc.userId, {
        "subscription.type": "free",
        "subscription.isActive": false,
      });
    }

    console.log(`Subscription expired: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription_expired:", error);
  }
}

async function handleSubscriptionPaused(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;

    await Subscription.findOneAndUpdate(
      { lemonsqueezySubscriptionId: subscription.id },
      {
        status: "paused",
        pausedAt: new Date(),
        resumesAt: attributes.pause?.resumes_at ? new Date(attributes.pause.resumes_at) : null,
        updatedAt: new Date(attributes.updated_at),
      }
    );

    console.log(`Subscription paused: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription_paused:", error);
  }
}

async function handleSubscriptionUnpaused(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;

    await Subscription.findOneAndUpdate(
      { lemonsqueezySubscriptionId: subscription.id },
      {
        status: "active",
        pausedAt: null,
        resumesAt: null,
        updatedAt: new Date(attributes.updated_at),
      }
    );

    console.log(`Subscription unpaused: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription_unpaused:", error);
  }
}

async function handleSubscriptionPaymentSuccess(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;

    // Update subscription with new billing period
    await Subscription.findOneAndUpdate(
      { lemonsqueezySubscriptionId: subscription.id },
      {
        currentPeriodStart: new Date(attributes.created_at),
        currentPeriodEnd: new Date(attributes.renews_at),
        updatedAt: new Date(attributes.updated_at),
      }
    );

    console.log(`Subscription payment successful: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription_payment_success:", error);
  }
}

async function handleSubscriptionPaymentFailed(event: any) {
  try {
    const subscription = event.data;
    const attributes = subscription.attributes;

    await Subscription.findOneAndUpdate(
      { lemonsqueezySubscriptionId: subscription.id },
      {
        status: "past_due",
        updatedAt: new Date(attributes.updated_at),
      }
    );

    console.log(`Subscription payment failed: ${subscription.id}`);
  } catch (error) {
    console.error("Error handling subscription_payment_failed:", error);
  }
}