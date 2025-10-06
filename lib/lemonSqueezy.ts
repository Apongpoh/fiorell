import { lemonSqueezySetup } from '@lemonsqueezy/lemonsqueezy.js';

// Initialize Lemon Squeezy
const apiKey = process.env.LEMONSQUEEZY_API_KEY;
if (apiKey) {
  lemonSqueezySetup({ apiKey });
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  lemonsqueezyVariantId: string;
}

export interface Customer {
  id: string;
  email: string;
  name: string;
  lemonsqueezyCustomerId?: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'on_trial' | 'paused';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  lemonsqueezySubscriptionId: string;
  lemonsqueezyOrderId?: string;
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'premium',
    name: 'Premium',
    description: 'Enhanced dating experience with unlimited likes and super boosts',
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    lemonsqueezyVariantId: process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID || '',
    features: [
      'Unlimited likes',
      'See who liked you',
      '5 Super Boosts per month',
      'Read receipts',
      'Priority customer support',
      'Advanced filters',
    ],
  },
  {
    id: 'premium_plus',
    name: 'Premium Plus',
    description: 'Ultimate dating experience with all premium features and more',
    price: 19.99,
    currency: 'USD',
    interval: 'month',
    lemonsqueezyVariantId: process.env.LEMONSQUEEZY_PREMIUM_PLUS_VARIANT_ID || '',
    popular: true,
    features: [
      'Everything in Premium',
      'Unlimited Super Boosts',
      'Incognito mode',
      'Message before matching',
      'Travel mode',
      'Profile boost 3x per week',
      'VIP customer support',
    ],
  },
  {
    id: 'premium_annual',
    name: 'Premium Annual',
    description: 'Save 30% with annual Premium subscription',
    price: 83.99,
    currency: 'USD',
    interval: 'year',
    lemonsqueezyVariantId: process.env.LEMONSQUEEZY_PREMIUM_ANNUAL_VARIANT_ID || '',
    features: [
      'All Premium features',
      'Save 30% vs monthly',
      'Exclusive annual subscriber benefits',
      'Priority feature access',
    ],
  },
  {
    id: 'premium_plus_annual',
    name: 'Premium Plus Annual',
    description: 'Save 35% with annual Premium Plus subscription',
    price: 155.99,
    currency: 'USD',
    interval: 'year',
    lemonsqueezyVariantId: process.env.LEMONSQUEEZY_PREMIUM_PLUS_ANNUAL_VARIANT_ID || '',
    features: [
      'All Premium Plus features',
      'Save 35% vs monthly',
      'Exclusive annual subscriber benefits',
      'Beta feature access',
    ],
  },
];

class LemonSqueezyService {
  private storeId: string;

  constructor() {
    this.storeId = process.env.LEMONSQUEEZY_STORE_ID || '';
    
    if (!apiKey || !this.storeId) {
      console.warn('Lemon Squeezy not configured. Set LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID');
    }
  }

  /**
   * Create a checkout URL for a subscription
   */
  async createCheckout(params: {
    variantId: string;
    customEmail?: string;
    customName?: string;
    redirectUrl?: string;
    customData?: Record<string, unknown>;
  }) {
    try {
      const { createCheckout } = await import('@lemonsqueezy/lemonsqueezy.js');
      
      const checkout = await createCheckout(this.storeId, parseInt(params.variantId), {
        checkoutOptions: {
          embed: false,
          media: true,
          logo: true,
        },
        checkoutData: {
          email: params.customEmail,
          name: params.customName,
          custom: params.customData,
        },
        productOptions: {
          enabledVariants: [parseInt(params.variantId)],
          redirectUrl: params.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
        },
      });

      return {
        success: true,
        checkoutUrl: (checkout as { data?: { attributes?: { url?: string } } }).data?.attributes?.url,
        checkoutId: (checkout as { data?: { id?: string } }).data?.id,
      };
    } catch (error) {
      console.error('Lemon Squeezy checkout creation error:', error);
      return {
        success: false,
        error: 'Failed to create checkout session',
      };
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string) {
    try {
      const { getSubscription } = await import('@lemonsqueezy/lemonsqueezy.js');
      
      const subscription = await getSubscription(subscriptionId);
      return {
        success: true,
        subscription: subscription.data,
      };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return {
        success: false,
        error: 'Failed to fetch subscription',
      };
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const { cancelSubscription } = await import('@lemonsqueezy/lemonsqueezy.js');
      
      const result = await cancelSubscription(subscriptionId);
      return {
        success: true,
        subscription: result.data,
      };
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return {
        success: false,
        error: 'Failed to cancel subscription',
      };
    }
  }

  /**
   * Resume a cancelled subscription
   */
  async resumeSubscription(subscriptionId: string) {
    try {
      const { updateSubscription } = await import('@lemonsqueezy/lemonsqueezy.js');
      
      const result = await updateSubscription(subscriptionId, {
        cancelled: false,
      });
      
      return {
        success: true,
        subscription: result.data,
      };
    } catch (error) {
      console.error('Error resuming subscription:', error);
      return {
        success: false,
        error: 'Failed to resume subscription',
      };
    }
  }

  /**
   * Get customer portal URL
   */
  async getCustomerPortalUrl() {
    try {
      // Lemon Squeezy provides customer portal URLs in subscription data
      // This would typically be called when user wants to manage their subscription
      return {
        success: true,
        portalUrl: `https://app.lemonsqueezy.com/my-orders`,
      };
    } catch (error) {
      console.error('Error getting customer portal:', error);
      return {
        success: false,
        error: 'Failed to get customer portal URL',
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const crypto = require('crypto');
      const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '';
      
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(payload);
      const computedSignature = hmac.digest('hex');
      
      return signature === computedSignature;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Get plan by ID
   */
  getPlan(planId: string): SubscriptionPlan | undefined {
    return SUBSCRIPTION_PLANS.find(plan => plan.id === planId);
  }

  /**
   * Get all plans
   */
  getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Format price for display
   */
  formatPrice(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Calculate savings for annual plans
   */
  calculateAnnualSavings(monthlyPrice: number, annualPrice: number): {
    savingsAmount: number;
    savingsPercentage: number;
  } {
    const yearlyEquivalent = monthlyPrice * 12;
    const savingsAmount = yearlyEquivalent - annualPrice;
    const savingsPercentage = Math.round((savingsAmount / yearlyEquivalent) * 100);
    
    return {
      savingsAmount,
      savingsPercentage,
    };
  }
}

const lemonSqueezyService = new LemonSqueezyService();
export default lemonSqueezyService;