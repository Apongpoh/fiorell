import connectToDatabase from "@/lib/mongodb";
import CryptoSubscription from "@/models/CryptoSubscription";
import CryptoPayment from "@/models/CryptoPayment";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { getCryptoService } from "@/lib/cryptoService";

interface BillingProcessResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export class CryptoSubscriptionManager {
  private isProcessing = false;
  
  /**
   * Process all pending subscription renewals
   */
  async processPendingRenewals(): Promise<BillingProcessResult> {
    if (this.isProcessing) {
      console.log("Subscription processing already in progress");
      return { processed: 0, successful: 0, failed: 0, errors: [] };
    }
    
    this.isProcessing = true;
    const result: BillingProcessResult = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    };
    
    try {
      await connectToDatabase();
      
      const now = new Date();
      
      // Find subscriptions that need renewal
      const subscriptionsToRenew = await CryptoSubscription.find({
        status: "active",
        autoRenew: true,
        cancelAtPeriodEnd: { $ne: true },
        nextBillingDate: { $lte: now },
      });
      
      console.log(`Found ${subscriptionsToRenew.length} subscriptions to renew`);
      
      for (const subscription of subscriptionsToRenew) {
        try {
          result.processed++;
          await this.processSubscriptionRenewal(subscription);
          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Subscription ${subscription._id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          console.error(`Failed to renew subscription ${subscription._id}:`, error);
        }
      }
      
      // Process subscriptions marked for cancellation
      await this.processCancellations();
      
      // Update subscription health scores
      await this.updateSubscriptionHealth();
      
    } catch (error) {
      console.error("Error processing subscription renewals:", error);
      result.errors.push(`Global error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isProcessing = false;
    }
    
    return result;
  }
  
  /**
   * Process a single subscription renewal
   */
  private async processSubscriptionRenewal(subscription: any): Promise<void> {
    const cryptoService = getCryptoService();
    
    // Get current pricing
    const planPricing: Record<string, Record<string, number>> = {
      premium: {
        monthly: 9.99,
        annual: 99.99,
      },
      premium_plus: {
        monthly: 19.99,
        annual: 199.99,
      },
    };
    
    const amountUSD = planPricing[subscription.planType]?.[subscription.billingCycle] || 9.99;
    const amountCrypto = await cryptoService.convertUSDToCrypto(amountUSD, subscription.cryptocurrency);
    
    // Generate new payment address for renewal
    const paymentAddress = await cryptoService.generateAddress(subscription.cryptocurrency);
    
    // Create renewal payment
    const renewalPayment = new CryptoPayment({
      paymentId: `renewal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: subscription.userId,
      cryptocurrency: subscription.cryptocurrency,
      network: subscription.network,
      amount: amountCrypto,
      amountUSD: amountUSD,
      paymentAddress: paymentAddress,
      planType: subscription.planType,
      planDuration: subscription.billingCycle,
      isSubscription: true,
      subscriptionId: subscription._id,
      type: "subscription_renewal",
      status: "pending",
      requiredConfirmations: subscription.cryptocurrency === "bitcoin" ? 1 : 10,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours to pay
    });
    
    await renewalPayment.save();
    
    // Update subscription
    subscription.totalPayments += 1;
    subscription.paymentAddress = paymentAddress; // Update to new address
    subscription.lastRenewalAttempt = new Date();
    
    // Calculate next billing date (grace period)
    const gracePeriod = new Date();
    gracePeriod.setDate(gracePeriod.getDate() + 3); // 3 days grace period
    
    subscription.nextBillingDate = gracePeriod;
    subscription.status = "pending_renewal";
    
    await subscription.save();
    
    // Send renewal notification to user
    await this.sendRenewalNotification(subscription, renewalPayment);
    
    console.log(`Created renewal payment ${renewalPayment.paymentId} for subscription ${subscription._id}`);
  }
  
  /**
   * Process subscription cancellations
   */
  private async processCancellations(): Promise<void> {
    const now = new Date();
    
    // Find subscriptions to cancel at period end
    const subscriptionsToCancel = await CryptoSubscription.find({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { $lte: now },
      status: { $in: ["active", "pending_renewal"] },
    });
    
    for (const subscription of subscriptionsToCancel) {
      subscription.status = "cancelled";
      subscription.cancelledAt = new Date();
      await subscription.save();
      
      // Also cancel the regular subscription
      await Subscription.updateOne(
        { userId: subscription.userId },
        {
          status: "cancelled",
          cancelledAt: new Date(),
        }
      );
      
      // Update user subscription status
      await User.updateOne(
        { _id: subscription.userId },
        {
          subscriptionStatus: "cancelled",
          subscriptionType: null,
        }
      );
      
      console.log(`Cancelled subscription ${subscription._id} at period end`);
    }
  }
  
  /**
   * Update subscription health scores based on payment history
   */
  private async updateSubscriptionHealth(): Promise<void> {
    const subscriptions = await CryptoSubscription.find({
      status: { $in: ["active", "pending_renewal"] },
    });
    
    for (const subscription of subscriptions) {
      let health = "healthy";
      
      // Check payment history
      if (subscription.failedPayments > 2) {
        health = "at_risk";
      } else if (subscription.failedPayments > 4) {
        health = "critical";
      }
      
      // Check if overdue
      const now = new Date();
      const daysSinceLastPayment = subscription.lastPaymentAt
        ? (now.getTime() - subscription.lastPaymentAt.getTime()) / (1000 * 60 * 60 * 24)
        : Infinity;
      
      if (daysSinceLastPayment > 35) { // More than 35 days
        health = "critical";
      } else if (daysSinceLastPayment > 31) { // More than 31 days
        health = "at_risk";
      }
      
      subscription.health = health;
      await subscription.save();
    }
  }
  
  /**
   * Handle failed renewal payments
   */
  async handleFailedRenewal(subscriptionId: string, reason: string): Promise<void> {
    const subscription = await CryptoSubscription.findById(subscriptionId);
    if (!subscription) return;
    
    subscription.failedPayments += 1;
    subscription.lastFailureReason = reason;
    subscription.lastFailureAt = new Date();
    
    // Check if we should suspend the subscription
    if (subscription.failedPayments >= 3) {
      subscription.status = "past_due";
      
      // Suspend regular subscription
      await Subscription.updateOne(
        { userId: subscription.userId },
        { status: "past_due" }
      );
      
      // Update user status
      await User.updateOne(
        { _id: subscription.userId },
        { subscriptionStatus: "past_due" }
      );
    }
    
    await subscription.save();
    console.log(`Handled failed renewal for subscription ${subscriptionId}: ${reason}`);
  }
  
  /**
   * Check for expired pending payments
   */
  async checkExpiredPayments(): Promise<void> {
    const now = new Date();
    
    const expiredPayments = await CryptoPayment.find({
      status: "pending",
      expiresAt: { $lte: now },
    });
    
    for (const payment of expiredPayments) {
      payment.status = "expired";
      payment.expiredAt = new Date();
      await payment.save();
      
      if (payment.isSubscription && payment.subscriptionId) {
        await this.handleFailedRenewal(payment.subscriptionId, "Payment expired");
      }
      
      console.log(`Expired payment ${payment.paymentId}`);
    }
  }
  
  /**
   * Monitor pending transactions for confirmations
   */
  async monitorPendingTransactions(): Promise<void> {
    const cryptoService = getCryptoService();
    
    const pendingPayments = await CryptoPayment.find({
      status: { $in: ["pending", "received"] },
      transactionId: { $exists: true, $ne: null },
    });
    
    for (const payment of pendingPayments) {
      try {
        const status = await cryptoService.checkTransactionStatus(
          payment.cryptocurrency,
          payment.transactionId,
          payment.paymentAddress
        );
        
        if (status.confirmations >= payment.requiredConfirmations) {
          payment.status = "confirmed";
          payment.confirmations = status.confirmations;
          payment.confirmedAt = new Date();
          
          await payment.save();
          
          // Process the successful payment
          if (payment.isSubscription && payment.subscriptionId) {
            await this.processSuccessfulRenewal(payment);
          }
        } else if (status.confirmations > 0) {
          payment.confirmations = status.confirmations;
          await payment.save();
        }
        
      } catch (error) {
        console.error(`Error checking transaction ${payment.transactionId}:`, error);
      }
    }
  }
  
  /**
   * Process a successful subscription renewal
   */
  private async processSuccessfulRenewal(payment: any): Promise<void> {
    const subscription = await CryptoSubscription.findById(payment.subscriptionId);
    if (!subscription) return;
    
    subscription.status = "active";
    subscription.successfulPayments += 1;
    subscription.failedPayments = 0; // Reset failed count
    subscription.lastPaymentAt = new Date();
    subscription.health = "healthy";
    
    // Calculate next billing date
    const nextBilling = new Date();
    if (subscription.billingCycle === "monthly") {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }
    
    subscription.nextBillingDate = nextBilling;
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = new Date(nextBilling);
    
    await subscription.save();
    
    // Update regular subscription
    await Subscription.updateOne(
      { userId: subscription.userId },
      {
        status: "active",
        endDate: nextBilling,
      }
    );
    
    // Update user
    await User.updateOne(
      { _id: subscription.userId },
      {
        subscriptionStatus: "active",
        subscriptionEndDate: nextBilling,
      }
    );
    
    console.log(`Successfully renewed subscription ${subscription._id}`);
  }
  
  /**
   * Send renewal notification to user
   */
  private async sendRenewalNotification(
    subscription: any,
    _payment: any
  ): Promise<void> {
    // This would integrate with your notification system
    console.log(`Sending renewal notification for subscription ${subscription._id}`);
    
    // Example: You could send email, push notification, or in-app notification
    // const user = await User.findById(subscription.userId);
    // await sendEmail(user.email, "Subscription Renewal", renewalEmailTemplate);
  }
  
  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<any> {
    const stats = await CryptoSubscription.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalRevenue: { $sum: "$amountUSD" },
        },
      },
    ]);
    
    const healthStats = await CryptoSubscription.aggregate([
      {
        $group: {
          _id: "$health",
          count: { $sum: 1 },
        },
      },
    ]);
    
    return {
      byStatus: stats,
      byHealth: healthStats,
      timestamp: new Date(),
    };
  }
}

// Export singleton instance
export const cryptoSubscriptionManager = new CryptoSubscriptionManager();