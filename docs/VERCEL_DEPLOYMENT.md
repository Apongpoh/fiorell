# Vercel Deployment

Fiorell runs on Vercel as a Next.js App Router project while keeping AWS S3
for uploaded profile photos and message media.

## Build

Use the existing Vercel project settings:

```bash
npm install
npm run build
```

The automatic `next-sitemap` postbuild hook is disabled to avoid rewriting
checked-in sitemap files during every deployment. To regenerate sitemaps
manually, run:

```bash
npx next-sitemap
```

## Required Environment Variables

Set these in Vercel for Production and Preview before deploying:

```env
DATABASE_URL=mongodb+srv://...
JWT_SECRET=...
NEXT_PUBLIC_APP_URL=https://fiorell.com

AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=fiorellawsbuckets

CRON_SECRET=...
MESSAGE_ENCRYPTION_KEY=...
```

`MONGODB_URI` is accepted as a fallback for `DATABASE_URL`, but
`DATABASE_URL` is the preferred production name.

## Optional Environment Variables

Configure these when the related feature is live:

```env
EMAIL_PROVIDER=smtp
EMAIL_FROM="Fiorell <noreply@fiorell.com>"
SMTP_HOST=...
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=...
SMTP_PASS=...

LEMONSQUEEZY_API_KEY=...
LEMONSQUEEZY_STORE_ID=...
LEMONSQUEEZY_WEBHOOK_SECRET=...
LEMONSQUEEZY_PREMIUM_VARIANT_ID=...
LEMONSQUEEZY_PREMIUM_PLUS_VARIANT_ID=...
LEMONSQUEEZY_PREMIUM_ANNUAL_VARIANT_ID=...
LEMONSQUEEZY_PREMIUM_PLUS_ANNUAL_VARIANT_ID=...

NEXT_PUBLIC_RECAPTCHA_SITE_KEY=...
RECAPTCHA_SECRET=...

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:support@fiorell.com

CRYPTO_NETWORK=mainnet
CRYPTO_WEBHOOK_SECRET=...
CAKE_WALLET_BTC_ADDRESS=...
CAKE_WALLET_XMR_ADDRESS=...
BITCOIN_RPC_URL=...
BITCOIN_RPC_USER=...
BITCOIN_RPC_PASSWORD=...
MONERO_RPC_URL=...
MONERO_RPC_USER=...
MONERO_RPC_PASSWORD=...
MONERO_WALLET_RPC_URL=...
```

## AWS S3

S3 remains the source of truth for media storage. The app uploads profile
photos and message media through the server API and generates signed URLs for
private message media.

The Next.js image config derives the allowed S3 hostname from:

```env
AWS_S3_BUCKET_NAME
AWS_REGION
```

If the bucket changes, update those Vercel env vars before deploying.

## Crypto Cron

`/api/crypto/cron` now supports Vercel's GET-based cron invocation and still
supports POST for manual secured runs. Both require:

```http
Authorization: Bearer $CRON_SECRET
```

Vercel Hobby cron scheduling is limited to once per day. For frequent crypto
payment monitoring, use Vercel Pro or an external scheduler. A typical Pro
schedule is:

```json
{
  "crons": [
    {
      "path": "/api/crypto/cron",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

## Verification

Before promoting a deployment:

```bash
npm run lint
npm run build
```

Then smoke test:

- Sign up, verify email, log in, and log out.
- Upload and delete a profile photo from S3.
- Send text and media messages.
- Open a chat in two browsers and confirm polling updates the other side.
- Hit `/api/crypto/cron?health=true` with the cron authorization header.
- Confirm Lemon Squeezy and crypto webhook URLs use the production domain.
