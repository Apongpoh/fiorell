# Environment Variables Configuration for Lemon Squeezy Integration

## Required Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Lemon Squeezy Configuration
LEMON_SQUEEZY_API_KEY=your_api_key_here
LEMON_SQUEEZY_STORE_ID=your_store_id_here
LEMON_SQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here

# Your app's domain (for webhook callbacks and redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
# For production: NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Getting Your Lemon Squeezy Credentials

### 1. Create a Lemon Squeezy Account
1. Go to [Lemon Squeezy](https://lemonsqueezy.com) and create an account
2. Complete the merchant verification process
3. Set up your store information

### 2. Get Your API Key
1. Go to Settings → API in your Lemon Squeezy dashboard
2. Create a new API key with the following permissions:
   - Read/Write access to Products
   - Read/Write access to Subscriptions
   - Read/Write access to Customers
   - Read access to Orders
3. Copy the API key and add it to `LEMON_SQUEEZY_API_KEY`

### 3. Get Your Store ID
1. In your Lemon Squeezy dashboard, go to Settings → Stores
2. Copy your Store ID and add it to `LEMON_SQUEEZY_STORE_ID`

### 4. Set Up Webhook
1. Go to Settings → Webhooks in your dashboard
2. Create a new webhook with the following settings:
   - **URL**: `https://your-domain.com/api/subscription/webhook` (replace with your domain)
   - **Events**: Select all subscription-related events:
     - `subscription_created`
     - `subscription_updated`
     - `subscription_cancelled`
     - `subscription_resumed`
     - `subscription_expired`
     - `subscription_paused`
     - `subscription_unpaused`
   - **Format**: JSON
3. Copy the webhook secret and add it to `LEMON_SQUEEZY_WEBHOOK_SECRET`

## Setting Up Products and Plans

### 1. Create Products
Create the following products in your Lemon Squeezy dashboard:

#### Premium Monthly
- **Name**: Premium Monthly
- **Type**: Subscription
- **Price**: $9.99
- **Billing Interval**: Monthly
- **Description**: Premium features with monthly billing

#### Premium Annual
- **Name**: Premium Annual
- **Type**: Subscription
- **Price**: $99.99
- **Billing Interval**: Yearly
- **Description**: Premium features with annual billing (save 17%)

#### Premium Plus Monthly
- **Name**: Premium Plus Monthly
- **Type**: Subscription
- **Price**: $19.99
- **Billing Interval**: Monthly
- **Description**: All premium features plus exclusive content

#### Premium Plus Annual
- **Name**: Premium Plus Annual
- **Type**: Subscription
- **Price**: $199.99
- **Billing Interval**: Yearly
- **Description**: All premium features plus exclusive content (save 17%)

### 2. Get Product/Variant IDs
After creating your products, you'll need to update the plan configuration in `lib/lemonSqueezy.ts`:

```typescript
const PLANS = {
  premium_monthly: {
    variantId: "your_premium_monthly_variant_id",
    name: "Premium Monthly",
    price: 9.99,
    interval: "month",
    features: [
      "Unlimited likes",
      "See who liked you",
      "Advanced filters",
      "Priority support",
      "Ad-free experience"
    ]
  },
  premium_annual: {
    variantId: "your_premium_annual_variant_id", 
    name: "Premium Annual",
    price: 99.99,
    interval: "year",
    features: [
      "Unlimited likes",
      "See who liked you", 
      "Advanced filters",
      "Priority support",
      "Ad-free experience",
      "17% savings"
    ]
  },
  premium_plus_monthly: {
    variantId: "your_premium_plus_monthly_variant_id",
    name: "Premium Plus Monthly", 
    price: 19.99,
    interval: "month",
    features: [
      "Everything in Premium",
      "Boost your profile",
      "Super likes",
      "Read receipts",
      "Incognito mode",
      "Exclusive events access"
    ]
  },
  premium_plus_annual: {
    variantId: "your_premium_plus_annual_variant_id",
    name: "Premium Plus Annual",
    price: 199.99,
    interval: "year", 
    features: [
      "Everything in Premium",
      "Boost your profile",
      "Super likes", 
      "Read receipts",
      "Incognito mode",
      "Exclusive events access",
      "17% savings"
    ]
  }
};
```

## Payoneer Integration

### Setting Up Payoneer for International Payments

1. **Create a Payoneer Account**:
   - Go to [Payoneer](https://www.payoneer.com) and sign up for a business account
   - Complete the verification process with your business documents
   - This can take 1-3 business days

2. **Connect Payoneer to Lemon Squeezy**:
   - In your Lemon Squeezy dashboard, go to Settings → Payouts
   - Select Payoneer as your payout method
   - Follow the instructions to connect your Payoneer account
   - Lemon Squeezy will send your earnings to your Payoneer account

3. **Withdraw to Your Local Bank**:
   - In your Payoneer account, you can withdraw funds to:
     - Your local bank account
     - Payoneer Mastercard (if available in your country)
     - Other withdrawal methods available in your region

### Benefits of Lemon Squeezy + Payoneer
- **Global Coverage**: Works in 200+ countries
- **Tax Compliance**: Lemon Squeezy handles EU VAT, US sales tax automatically
- **Multiple Currencies**: Accept payments in 135+ currencies
- **Lower Fees**: Competitive rates compared to other international payment solutions
- **Fast Payouts**: Weekly automatic payouts to your Payoneer account

## Testing Your Integration

### 1. Test Mode
Lemon Squeezy provides a test mode for development:
1. Use test API credentials from your dashboard
2. All transactions will be simulated
3. No real money will be charged

### 2. Test the Flow
1. Visit `/subscription` in your app
2. Click on a plan to start checkout
3. Use Lemon Squeezy's test card numbers
4. Verify webhook events are received
5. Check subscription management features

### 3. Webhook Testing
Use tools like ngrok to test webhooks locally:
```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3000

# Use the ngrok URL for webhook configuration
# Example: https://abc123.ngrok.io/api/subscription/webhook
```

## Production Deployment

1. **Update Environment Variables**:
   - Use production API keys
   - Set `NEXT_PUBLIC_APP_URL` to your production domain
   - Update webhook URL to your production domain

2. **SSL Certificate**:
   - Ensure your domain has a valid SSL certificate
   - Lemon Squeezy requires HTTPS for webhooks

3. **Test in Production**:
   - Make a small test purchase
   - Verify webhooks are working
   - Test subscription management features

## Support

If you encounter issues:
1. Check Lemon Squeezy documentation: https://docs.lemonsqueezy.com
2. Contact Lemon Squeezy support for payment-related issues
3. Contact Payoneer support for payout-related issues

## Security Notes

- Never commit your API keys to version control
- Use environment variables for all sensitive data
- Verify webhook signatures to ensure requests are from Lemon Squeezy
- Monitor your webhook endpoints for suspicious activity