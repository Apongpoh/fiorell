import connectToDatabase from "@/lib/mongodb";
import CryptoSubscription from "@/models/CryptoSubscription";
import CryptoPayment from "@/models/CryptoPayment";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { getCryptoService } from "@/lib/cryptoService";
import emailService from "@/lib/emailService";
import { sendPushNotificationToUser, PushNotificationPayload } from "@/lib/pushNotifications";

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
    payment: any
  ): Promise<void> {
    try {
      // Get user details
      const user = await User.findById(subscription.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Generate payment URL for Cake Wallet
      const cryptoService = getCryptoService();
      const paymentUrl = cryptoService.createPaymentURL(
        payment.toAddress,
        payment.amount,
        subscription.cryptocurrency
      );

      // Calculate days until expiry
      const expiryDate = new Date(payment.expiresAt);
      const now = new Date();
      const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Send email notification
      await this.sendRenewalEmail(user, subscription, payment, paymentUrl, daysLeft);
      
      // Send push notification
      await this.sendRenewalPushNotification(user, subscription, payment, daysLeft);
      
      console.log(`✅ Renewal notifications sent for subscription ${subscription._id}`);
      
    } catch (error) {
      console.error(`❌ Failed to send renewal notification for subscription ${subscription._id}:`, error);
    }
  }

  /**
   * Send renewal email notification
   */
  private async sendRenewalEmail(
    user: any,
    subscription: any,
    payment: any,
    paymentUrl: string,
    daysLeft: number
  ): Promise<void> {
    try {
      const planName = subscription.planType.replace('_', ' ').toUpperCase();
      
      const emailSubject = `🔔 Your Fiorell ${planName} subscription renewal is due`;
      const emailHtml = this.generateRenewalEmailTemplate(user, subscription, payment, paymentUrl, daysLeft);
      
      await emailService.sendEmail({
        to: user.email,
        subject: emailSubject,
        html: emailHtml
      });
      
      console.log(`📧 Renewal email sent to ${user.email}`);
      
    } catch (error) {
      console.error('Failed to send renewal email:', error);
    }
  }

  /**
   * Send renewal push notification
   */
  private async sendRenewalPushNotification(
    user: any,
    subscription: any,
    payment: any,
    daysLeft: number
  ): Promise<void> {
    try {
      const planName = subscription.planType.replace('_', ' ').toUpperCase();
      const cryptoSymbol = subscription.cryptocurrency.toUpperCase();
      const amount = payment.amount.toFixed(8);
      
      const notificationPayload: PushNotificationPayload = {
        title: `🔔 ${planName} Renewal Due`,
        body: `Pay ${amount} ${cryptoSymbol} to renew your subscription. ${daysLeft} days left.`,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: 'subscription-renewal',
        data: {
          type: 'subscription_renewal',
          subscriptionId: subscription._id.toString(),
          paymentId: payment.paymentId,
          amount: payment.amount,
          cryptocurrency: subscription.cryptocurrency,
          paymentAddress: payment.toAddress,
          url: `/subscription/renew/${payment.paymentId}`
        },
        actions: [
          {
            action: 'pay_now',
            title: '💰 Pay Now'
          },
          {
            action: 'view_details',
            title: '👁️ View Details'
          }
        ],
        requireInteraction: true
      };

      await sendPushNotificationToUser(user._id.toString(), notificationPayload);
      console.log(`🔔 Push notification sent to user ${user._id}`);
      
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }

  /**
   * Generate renewal email template
   */
  private generateRenewalEmailTemplate(
    user: any,
    subscription: any,
    payment: any,
    paymentUrl: string,
    daysLeft: number
  ): string {
    const planName = subscription.planType.replace('_', ' ').toUpperCase();
    const cryptoSymbol = subscription.cryptocurrency.toUpperCase();
    const amount = payment.amount.toFixed(8);
    const amountUSD = payment.amountUSD.toFixed(2);
    const userName = user.firstName || user.email.split('@')[0];
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fiorell Subscription Renewal</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f8fafc; }
        .email-container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 40px 20px; text-align: center; color: white; }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { font-size: 18px; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .greeting { font-size: 20px; color: #1f2937; margin-bottom: 20px; }
        .payment-box { background: linear-gradient(135deg, #f8fafc, #e2e8f0); border: 2px solid #e2e8f0; border-radius: 16px; padding: 30px; margin: 30px 0; text-align: center; }
        .payment-title { font-size: 24px; color: #1f2937; margin-bottom: 20px; font-weight: 600; }
        .crypto-amount { font-size: 32px; font-weight: bold; color: #059669; margin: 15px 0; }
        .usd-amount { font-size: 18px; color: #6b7280; margin-bottom: 25px; }
        .payment-button { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .address-box { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 15px; margin: 20px 0; word-break: break-all; font-family: 'Courier New', monospace; font-size: 14px; }
        .warning { background: #fef3cd; border-left: 4px solid #f59e0b; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .warning-title { font-weight: 600; color: #92400e; margin-bottom: 8px; }
        .steps { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 25px; margin: 25px 0; }
        .steps h3 { color: #0c4a6e; margin-bottom: 15px; }
        .steps ol { padding-left: 20px; }
        .steps li { margin-bottom: 10px; color: #1e40af; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; color: #6b7280; border-top: 1px solid #e2e8f0; }
        .footer a { color: #3b82f6; text-decoration: none; }
        .countdown { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0; text-align: center; }
        .countdown-days { font-size: 24px; font-weight: bold; color: #dc2626; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>🔔 Subscription Renewal</h1>
            <p>Your ${planName} subscription needs renewal</p>
        </div>
        
        <div class="content">
            <div class="greeting">Hi ${userName}! 👋</div>
            
            <p>Your <strong>${planName}</strong> subscription is due for renewal. Continue enjoying premium features by completing your crypto payment below.</p>
            
            <div class="countdown">
                <div>⏰ Time Remaining</div>
                <div class="countdown-days">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</div>
            </div>
            
            <div class="payment-box">
                <div class="payment-title">💰 Payment Required</div>
                <div class="crypto-amount">${amount} ${cryptoSymbol}</div>
                <div class="usd-amount">≈ $${amountUSD} USD</div>
                
                <a href="${paymentUrl}" class="payment-button">
                    🚀 Pay with Cake Wallet
                </a>
                
                <p style="margin: 20px 0; color: #6b7280;">
                    <strong>Payment Address:</strong>
                </p>
                <div class="address-box">${payment.toAddress}</div>
            </div>
            
            <div class="warning">
                <div class="warning-title">⚠️ Important Notice</div>
                <p>You have <strong>${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong> to complete this payment. After this period, your subscription will be suspended and you'll lose access to premium features.</p>
            </div>
            
            <div class="steps">
                <h3>🎯 Quick Payment Steps:</h3>
                <ol>
                    <li><strong>Click "Pay with Cake Wallet"</strong> or copy the address above</li>
                    <li><strong>Confirm the exact amount:</strong> ${amount} ${cryptoSymbol}</li>
                    <li><strong>Send payment</strong> from your Cake Wallet</li>
                    <li><strong>Done!</strong> Your subscription renews automatically once confirmed</li>
                </ol>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <p style="color: #6b7280; margin-bottom: 15px;">Need help with your payment?</p>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/support" style="color: #3b82f6; text-decoration: none; font-weight: 500;">📞 Contact Support</a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/subscription/manage" style="color: #3b82f6; text-decoration: none; font-weight: 500;">⚙️ Manage Subscription</a>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Fiorell Premium</strong> - Your trusted dating platform</p>
            <p style="margin-top: 10px;">This is an automated renewal notice. Please do not reply to this email.</p>
            <p style="margin-top: 15px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}">Visit Fiorell</a> | 
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/help">Help Center</a> | 
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/privacy-policy">Privacy Policy</a>
            </p>
        </div>
    </div>
</body>
</html>
    `;
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